<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Attendance;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendance logs, filterable by date and section.
     */
    public function index(Request $request)
    {
        $query = Attendance::with(['student.guardians', 'student.section.teacher']);

        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        if ($request->has('section_id')) {
            $sectionId = $request->section_id;
            $query->whereHas('student', function ($q) use ($sectionId) {
                $q->where('section_id', $sectionId);
            });
        }

        $attendances = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json($attendances, 200);
    }

    /**
     * Process an RFID tag scan event for student arrival or departure.
     */
    public function scan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'rfid' => 'required|string',
            'direction' => 'nullable|string|in:in,out',
            'time' => 'nullable|string',
            'date' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // 1. Find student
        $student = Student::with(['guardians', 'section.teacher'])->where('rfid', $request->rfid)->first();
        if (!$student) {
            return response()->json([
                'message' => 'Invalid RFID tag. No student registered with tag ' . $request->rfid
            ], 404);
        }

        $date = $request->date ?: date('Y-m-d');
        
        if ($request->time) {
            $time = date('H:i:s', strtotime($request->time));
        } else {
            $time = date('H:i:s');
        }

        // Process checkout / departure via RFID reader
        if ($request->direction === 'out') {
            $existingAttendance = Attendance::where('student_id', $student->id)
                ->where('date', $date)
                ->whereNull('time_out')
                ->orderBy('id', 'desc')
                ->first();

            if (!$existingAttendance) {
                return response()->json([
                    'message' => "Student {$student->name} is not currently checked in or has already been checked out.",
                    'student' => $student,
                    'attendance' => null,
                    'direction' => 'out',
                    'ignored' => true,
                    'sms_logs' => []
                ], 200);
            }

            $existingAttendance->update([
                'time_out' => $time,
                'status' => 'Checked Out',
                'verified_by' => 'RFID Exit Gate',
            ]);

            $attendance = $existingAttendance->fresh(['student.guardians']);
            $smsLogs = SmsService::sendAttendanceAlert($student, 'checked OUT', $time, 'Checked Out', 'RFID Exit Gate');

            return response()->json([
                'message' => "Student {$student->name} checked OUT successfully.",
                'student' => $student,
                'attendance' => $attendance,
                'direction' => 'out',
                'ignored' => false,
                'sms_logs' => $smsLogs
            ], 200);
        }

        // Query existing attendance record for this student on specified date
        $existingAttendance = Attendance::where('student_id', $student->id)
            ->where('date', $date)
            ->first();

        // 1. If student has an active check-in (where time_out IS NULL), ignore repeated arrival scans
        if ($existingAttendance && $existingAttendance->time_out === null) {
            $existingAttendance->load('student.guardians');
            return response()->json([
                'message' => "Ignored scan. Student {$student->name} is already present/checked in.",
                'student' => $student,
                'attendance' => $existingAttendance,
                'direction' => 'in',
                'ignored' => true,
                'sms_logs' => []
            ], 200);
        }

        $classStartTime = '08:00:00';
        $status = ($time > $classStartTime) ? 'Late' : 'Present';

        // 2. If student was previously checked out today (time_out is NOT null), ignore duplicate gate scans so checkout is preserved
        if ($existingAttendance && $existingAttendance->time_out !== null) {
            $existingAttendance->load('student.guardians');
            return response()->json([
                'message' => "Ignored scan. Student {$student->name} has already checked out for today.",
                'student' => $student,
                'attendance' => $existingAttendance,
                'direction' => 'out',
                'ignored' => true,
                'sms_logs' => []
            ], 200);
        } else {
            // 3. First scan of the day: Create new attendance record
            $attendance = Attendance::create([
                'student_id' => $student->id,
                'date' => $date,
                'time_in' => $time,
                'time_out' => null,
                'status' => $status,
                'verified_by' => 'RFID System',
            ]);
            $attendance->load('student.guardians');
        }

        $smsLogs = SmsService::sendAttendanceAlert($student, 'checked IN', $time, $attendance->status);

        return response()->json([
            'message' => "Student {$student->name} checked IN successfully.",
            'student' => $student,
            'attendance' => $attendance,
            'direction' => 'in',
            'ignored' => false,
            'sms_logs' => $smsLogs
        ], 200);
    }

    /**
     * Helper to build SMS notification logs for guardians.
     */
    private function generateSmsLogs($student, $actionWord, $time, $status)
    {
        return SmsService::sendAttendanceAlert($student, $actionWord, $time, $status);
    }

    /**
     * Perform a manual override or NFC-verified pickup on student attendance.
     */
    public function override(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date_format:Y-m-d',
            'status' => 'required|in:Present,Late,Absent,Checked Out',
            'time_in' => 'nullable|string',
            'time_out' => 'nullable|string',
            'verified_by' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $timeIn = $request->time_in ? date('H:i:s', strtotime($request->time_in)) : null;
        $timeOut = $request->time_out ? date('H:i:s', strtotime($request->time_out)) : null;
        $verifiedBy = $request->filled('verified_by') ? $request->verified_by : 'Manual Override';

        $attendance = Attendance::updateOrCreate(
            [
                'student_id' => $request->student_id,
                'date' => $request->date,
            ],
            [
                'status' => $request->status,
                'time_in' => $timeIn,
                'time_out' => $timeOut,
                'verified_by' => $verifiedBy,
            ]
        );

        $attendance->load('student.guardians');

        $smsLogs = [];
        if ($request->status === 'Checked Out' && $attendance->student) {
            $smsLogs = SmsService::sendAttendanceAlert(
                $attendance->student,
                'checked OUT',
                $timeOut ?: date('H:i:s'),
                'Checked Out',
                $verifiedBy
            );
        }

        return response()->json([
            'message' => 'Attendance record saved.',
            'attendance' => $attendance,
            'sms_logs' => $smsLogs,
        ], 200);
    }

    /**
     * Clear gate scan logs.
     */
    public function clearGateLogs(Request $request)
    {
        if (!$request->has('delete_attendance') || $request->boolean('delete_attendance')) {
            Attendance::query()->delete();
        }

        return response()->json([
            'message' => 'Gate scan logs cleared successfully.'
        ], 200);
    }

    /**
     * Check current SMS Gateway configuration and live credit balance.
     */
    public function smsGatewayStatus()
    {
        return response()->json(SmsService::getStatus(), 200);
    }

    /**
     * Send a single manual test SMS to verify gateway connectivity.
     */
    public function sendTestSms(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone'   => 'required|string|max:50',
            'message' => 'nullable|string|max:300',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors'  => $validator->errors()
            ], 422);
        }

        $testMessage = $request->message ?: "FCU Attendance Alert: SMS Gateway test successful! System is ready to notify guardians upon student arrival.";
        $result = SmsService::send($request->phone, $testMessage);

        return response()->json([
            'message' => $result['status'] === 'sent' 
                ? 'Test SMS sent successfully!' 
                : ($result['status'] === 'simulated' ? 'Test SMS simulated (demo mode).' : 'Failed to send test SMS.'),
            'result'  => $result
        ], 200);
    }

    /**
     * Load saved NFC Card -> Student/Guardian profile mappings from storage.
     */
    private function loadNfcCardMappings(): array
    {
        $path = storage_path('app/nfc_cards.json');
        if (file_exists($path)) {
            $data = json_decode(file_get_contents($path), true);
            if (is_array($data)) {
                return $data;
            }
        }
        return [];
    }

    /**
     * Save NFC Card -> Student/Guardian profile mappings to storage.
     */
    private function saveNfcCardMappings(array $mappings): void
    {
        $path = storage_path('app/nfc_cards.json');
        file_put_contents($path, json_encode($mappings, JSON_PRETTY_PRINT));
    }

    /**
     * Return all assigned NFC card profiles.
     */
    public function getNfcCards()
    {
        return response()->json([
            'cards' => $this->loadNfcCardMappings(),
        ], 200);
    }

    /**
     * Assign a physical NFC card UID to a specific student & guardian profile.
     */
    public function assignNfcCard(Request $request)
    {
        $uid = strtoupper(trim($request->input('uid', '')));
        $studentId = $request->input('student_id');
        $guardianName = $request->input('guardian_name', '');

        if (!$uid || !$studentId) {
            return response()->json(['message' => 'Card UID and student_id are required.'], 422);
        }

        $student = Student::with(['guardians', 'section'])->find($studentId);
        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $mappings = $this->loadNfcCardMappings();
        $mappings[$uid] = [
            'uid' => $uid,
            'student_id' => $student->id,
            'student_name' => $student->name,
            'guardian_name' => $guardianName ?: ($student->guardians[0]->name ?? 'Authorized Guardian'),
            'assigned_at' => now()->toDateTimeString(),
        ];
        $this->saveNfcCardMappings($mappings);

        return response()->json([
            'message' => "NFC Card ($uid) assigned to {$student->name} ({$mappings[$uid]['guardian_name']})!",
            'profile' => $mappings[$uid],
            'cards' => $mappings,
        ], 200);
    }

    /**
     * Remove an assigned NFC card profile mapping (or clear all mappings).
     */
    public function unassignNfcCard(Request $request)
    {
        if ($request->boolean('clear_all')) {
            $this->saveNfcCardMappings([]);
            return response()->json([
                'message' => 'All assigned NFC card profiles have been removed.',
                'cards' => [],
            ], 200);
        }

        $uid = strtoupper(trim($request->input('uid', '')));
        if (!$uid) {
            return response()->json(['message' => 'Card UID is required.'], 422);
        }

        $mappings = $this->loadNfcCardMappings();
        if (isset($mappings[$uid])) {
            unset($mappings[$uid]);
            $this->saveNfcCardMappings($mappings);
        }

        return response()->json([
            'message' => "Removed profile assignment for NFC Card ($uid).",
            'cards' => $mappings,
        ], 200);
    }

    /**
     * Receive an NFC card tap from a mobile phone reader (Web NFC, NFC Tools, or iOS/Android Shortcut)
     * and broadcast it to the Teacher Pick Up Logs screen.
     */
    public function nfcTap(Request $request)
    {
        $uid = strtoupper(trim($request->input('uid', $request->query('uid', ''))));
        if (!$uid) {
            return response()->json(['message' => 'No NFC card UID provided.'], 422);
        }

        $mappings = $this->loadNfcCardMappings();
        $mappedProfile = $mappings[$uid] ?? null;

        $studentId = $request->input('student_id', $request->query('student_id', $mappedProfile['student_id'] ?? null));
        $guardianName = $request->input('guardian_name', $request->query('guardian_name', $mappedProfile['guardian_name'] ?? null));

        $payload = [
            'uid' => $uid,
            'student_id' => $studentId,
            'guardian_name' => $guardianName,
            'timestamp' => now()->timestamp,
            'id' => Str::uuid()->toString(),
        ];

        Cache::put('latest_phone_nfc_tap', $payload, now()->addSeconds(10));

        if (!$request->expectsJson() && $request->isMethod('get')) {
            return response(
                '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' .
                '<title>FCU NFC Reader</title><style>body{font-family:system-ui,sans-serif;background:#0F172A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0;padding:20px;text-align:center}' .
                '.card{background:#1E293B;border:2px solid #10B981;border-radius:24px;padding:32px 24px;max-width:360px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,.4)}' .
                '.badge{display:inline-block;background:#10B981;color:#fff;font-weight:800;padding:6px 16px;border-radius:99px;font-size:13px;letter-spacing:1px;margin-bottom:16px}' .
                '.uid{font-family:monospace;font-size:22px;font-weight:900;color:#FACC15;margin:12px 0}</style></head>' .
                '<body><div class="card"><div class="badge">✓ NFC CARD SCANNED</div>' .
                '<h2 style="margin:0 0 8px 0">Sent to Teacher Screen</h2>' .
                '<div class="uid">' . e($uid) . '</div>' .
                '<p style="color:#94A3B8;font-size:14px;margin:0">Check your laptop Pick Up Logs window to confirm student dismissal.</p></div></body></html>',
                200
            )->header('Content-Type', 'text/html');
        }

        return response()->json([
            'message' => "Phone NFC tap ($uid) sent to Teacher Pick Up Logs!",
            'tap' => $payload,
        ], 200);
    }

    /**
     * Poll for the latest phone NFC card tap (consumes it once so it never repeats).
     */
    public function nfcPoll()
    {
        $tap = Cache::pull('latest_phone_nfc_tap');
        if ($tap && isset($tap['timestamp']) && (now()->timestamp - $tap['timestamp']) > 8) {
            $tap = null;
        }

        return response()->json([
            'tap' => $tap,
        ], 200);
    }
}

