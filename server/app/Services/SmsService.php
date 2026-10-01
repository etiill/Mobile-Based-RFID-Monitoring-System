<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    /**
     * Send attendance alert notifications to all guardians of a student.
     *
     * @param  \App\Models\Student  $student
     * @param  string  $actionWord  e.g. "checked IN" or "checked OUT"
     * @param  string  $time        e.g. "07:45:00"
     * @param  string  $status      e.g. "Present", "Late", "Checked Out"
     * @return array
     */
    public static function sendAttendanceAlert($student, string $actionWord, string $time, string $status): array
    {
        $smsLogs = [];
        $formattedTime = date('h:i A', strtotime($time));

        if (!$student->guardians || $student->guardians->isEmpty()) {
            return [];
        }

        foreach ($student->guardians as $guardian) {
            $message = "FCU Attendance Alert: {$student->name} has {$actionWord} at {$formattedTime}. Status: {$status}.";
            
            $sendResult = self::send($guardian->phone, $message);

            $smsLogs[] = [
                'guardian_name' => $guardian->name,
                'phone'         => $guardian->phone,
                'relation'      => $guardian->relation,
                'message'       => $message,
                'sent_at'       => date('Y-m-d H:i:s'),
                'status'        => $sendResult['status'],       // 'sent' | 'simulated' | 'failed'
                'provider'      => $sendResult['provider'],
                'details'       => $sendResult['details'] ?? null,
                'error'         => $sendResult['error'] ?? null,
            ];
        }

        return $smsLogs;
    }

    /**
     * Dispatch SMS message to the configured gateway provider.
     *
     * @param  string  $phone
     * @param  string  $message
     * @return array
     */
    public static function send(string $phone, string $message): array
    {
        $enabled = config('services.sms.enabled', env('SMS_ENABLED', true));
        $provider = strtolower(config('services.sms.provider', env('SMS_PROVIDER', 'semaphore')));

        $cleanPhone = self::normalizePhilippineNumber($phone);

        if (!$enabled) {
            Log::info("[SMS Disabled] Alert to {$phone}: {$message}");
            return [
                'status'   => 'simulated',
                'provider' => 'disabled',
                'details'  => 'SMS is disabled via SMS_ENABLED=false in .env.'
            ];
        }

        if (empty($cleanPhone)) {
            Log::warning("[SMS Invalid Phone] Could not normalize number: '{$phone}'");
            return [
                'status'   => 'failed',
                'provider' => $provider,
                'error'    => "Invalid phone number format: '{$phone}'."
            ];
        }

        try {
            switch ($provider) {
                case 'semaphore':
                    return self::sendViaSemaphore($cleanPhone, $message);

                case 'android':
                case 'android_gateway':
                    return self::sendViaAndroidGateway($cleanPhone, $message);

                case 'twilio':
                    return self::sendViaTwilio($cleanPhone, $message);

                case 'log':
                case 'mock':
                default:
                    Log::info("[SMS Simulated to {$cleanPhone}]: {$message}");
                    return [
                        'status'   => 'simulated',
                        'provider' => 'log',
                        'details'  => "Simulated in local logs. Phone: {$cleanPhone}"
                    ];
            }
        } catch (\Throwable $e) {
            Log::error("[SMS Gateway Exception] {$e->getMessage()}", [
                'phone'   => $cleanPhone,
                'message' => $message,
            ]);

            return [
                'status'   => 'failed',
                'provider' => $provider,
                'error'    => $e->getMessage()
            ];
        }
    }

    /**
     * Send SMS via Semaphore API (Philippines).
     * Documentation: https://semaphore.co/docs
     */
    protected static function sendViaSemaphore(string $phone, string $message): array
    {
        $apiKey = env('SEMAPHORE_API_KEY');
        $senderName = env('SEMAPHORE_SENDER_NAME');

        if (empty($apiKey) || $apiKey === 'your_semaphore_api_key_here') {
            Log::info("[SMS Semaphore Simulation] Key not configured. Message for {$phone}: {$message}");
            return [
                'status'   => 'simulated',
                'provider' => 'semaphore (demo mode)',
                'details'  => 'Add SEMAPHORE_API_KEY in server/.env to send real SMS to parents.'
            ];
        }

        $payload = [
            'apikey'  => trim($apiKey),
            'number'  => $phone,
            'message' => $message,
        ];

        if (!empty($senderName)) {
            $payload['sendername'] = trim($senderName);
        }

        $response = Http::timeout(10)->asForm()->post('https://api.semaphore.co/api/v4/messages', $payload);

        if ($response->successful()) {
            $data = $response->json();
            Log::info("[SMS Semaphore Success] Dispatched to {$phone}", ['response' => $data]);
            return [
                'status'   => 'sent',
                'provider' => 'semaphore',
                'details'  => $data
            ];
        }

        $errorBody = $response->body();
        Log::warning("[SMS Semaphore Error HTTP {$response->status()}] {$errorBody}");

        return [
            'status'   => 'failed',
            'provider' => 'semaphore',
            'error'    => "Semaphore API error ({$response->status()}): {$errorBody}"
        ];
    }

    /**
     * Send SMS via a local Android Phone SMS Gateway app.
     * Compatible with Android apps that host a local HTTP endpoint (e.g. android-sms-gateway or textbee).
     */
    protected static function sendViaAndroidGateway(string $phone, string $message): array
    {
        $gatewayUrl = env('ANDROID_GATEWAY_URL', 'http://192.168.1.50:8080/message');
        $token = env('ANDROID_GATEWAY_TOKEN');

        if (empty($gatewayUrl) || str_contains($gatewayUrl, '192.168.1.50')) {
            Log::info("[SMS Android Gateway Simulation] URL is default or unset. Phone: {$phone}");
            return [
                'status'   => 'simulated',
                'provider' => 'android_gateway (demo)',
                'details'  => 'Set ANDROID_GATEWAY_URL in server/.env to your Android phone local IP.'
            ];
        }

        // Ensure URL points to /message endpoint
        $gatewayUrl = rtrim($gatewayUrl, '/');
        if (!str_ends_with($gatewayUrl, '/message')) {
            $gatewayUrl .= '/message';
        }

        $client = Http::timeout(10)->acceptJson();

        // Support Basic Auth (username:password) or Bearer/Token
        if (!empty($token)) {
            if (str_contains($token, ':')) {
                [$user, $pass] = explode(':', $token, 2);
                $client = $client->withBasicAuth($user, $pass);
            } else {
                // If single token, try Bearer and fallback header
                $client = $client->withToken($token);
            }
        }

        // Capcom6 Android SMS Gateway JSON payload
        $payload = [
            'message'      => $message,
            'phoneNumbers' => [$phone],
        ];

        $response = $client->post($gatewayUrl, $payload);

        if ($response->successful()) {
            return [
                'status'   => 'sent',
                'provider' => 'android_gateway',
                'details'  => $response->json() ?? 'Dispatched via Android phone SIM'
            ];
        }

        return [
            'status'   => 'failed',
            'provider' => 'android_gateway',
            'error'    => "Android Gateway error ({$response->status()}): {$response->body()}"
        ];
    }


    /**
     * Send SMS via Twilio API.
     */
    protected static function sendViaTwilio(string $phone, string $message): array
    {
        $sid   = env('TWILIO_SID');
        $token = env('TWILIO_AUTH_TOKEN');
        $from  = env('TWILIO_PHONE_NUMBER');

        if (empty($sid) || empty($token) || empty($from)) {
            return [
                'status'   => 'simulated',
                'provider' => 'twilio (demo mode)',
                'details'  => 'Twilio credentials not configured in server/.env.'
            ];
        }

        $e164Phone = self::toE164($phone);

        $response = Http::timeout(10)
            ->withBasicAuth($sid, $token)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                'To'   => $e164Phone,
                'From' => $from,
                'Body' => $message,
            ]);

        if ($response->successful()) {
            return [
                'status'   => 'sent',
                'provider' => 'twilio',
                'details'  => $response->json()
            ];
        }

        return [
            'status'   => 'failed',
            'provider' => 'twilio',
            'error'    => "Twilio error: {$response->body()}"
        ];
    }

    /**
     * Check configuration and live account balance of the active SMS gateway.
     */
    public static function getStatus(): array
    {
        $enabled = config('services.sms.enabled', env('SMS_ENABLED', true));
        $provider = strtolower(config('services.sms.provider', env('SMS_PROVIDER', 'semaphore')));
        $apiKey = env('SEMAPHORE_API_KEY');

        $isConfigured = false;
        $balance = null;
        $accountInfo = null;

        if ($provider === 'semaphore') {
            $isConfigured = !empty($apiKey) && $apiKey !== 'your_semaphore_api_key_here';
            if ($isConfigured) {
                try {
                    $res = Http::timeout(5)->get('https://api.semaphore.co/api/v4/account', [
                        'apikey' => trim($apiKey)
                    ]);
                    if ($res->successful()) {
                        $accountInfo = $res->json();
                        $balance = $accountInfo['credit_balance'] ?? null;
                    }
                } catch (\Throwable $e) {
                    // Ignore network failure during status probe
                }
            }
        } elseif ($provider === 'android' || $provider === 'android_gateway') {
            $url = env('ANDROID_GATEWAY_URL');
            $isConfigured = !empty($url) && !str_contains($url, '192.168.1.50');
        } elseif ($provider === 'twilio') {
            $isConfigured = !empty(env('TWILIO_SID')) && !empty(env('TWILIO_AUTH_TOKEN'));
        }

        return [
            'enabled'       => (bool) $enabled,
            'provider'      => $provider,
            'is_configured' => $isConfigured,
            'credit_balance'=> $balance,
            'account_info'  => $accountInfo,
            'sender_name'   => env('SEMAPHORE_SENDER_NAME') ?: 'SEMAPHORE (Default)',
            'mode'          => $isConfigured ? 'live' : 'simulation',
        ];
    }

    /**
     * Normalize Philippine phone numbers to 09XXXXXXXXX format.
     * Examples:
     * - "0917 123 4567" -> "09171234567"
     * - "+639171234567" -> "09171234567"
     * - "639171234567"  -> "09171234567"
     * - "9171234567"    -> "09171234567"
     */
    public static function normalizePhilippineNumber(string $phone): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phone);

        // International format starting with 63 (e.g. 639171234567)
        if (str_starts_with($cleaned, '63') && strlen($cleaned) === 12) {
            return '0' . substr($cleaned, 2);
        }

        // 10-digit number without leading 0 (e.g. 9171234567)
        if (strlen($cleaned) === 10 && str_starts_with($cleaned, '9')) {
            return '0' . $cleaned;
        }

        return $cleaned;
    }

    /**
     * Convert Philippine number to international E.164 (+639XXXXXXXXX).
     */
    public static function toE164(string $phone): string
    {
        $normalized = self::normalizePhilippineNumber($phone);
        if (str_starts_with($normalized, '09') && strlen($normalized) === 11) {
            return '+63' . substr($normalized, 1);
        }
        return '+' . $normalized;
    }
}
