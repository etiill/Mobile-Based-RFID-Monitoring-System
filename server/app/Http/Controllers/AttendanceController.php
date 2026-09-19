<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Attendance;
use App\Models\CheckoutToken;
use Illuminate\Http\Request;
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
     * Process an RFID tag scan event (Student arrival check-in ONLY).
     * RFID reader ONLY records arrival check-in. Checkouts MUST be completed via Guardian QR code scan.
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

        // Reject checkout via RFID reader per requirement
        if ($request->direction === 'out') {
            return response()->json([
                'message' => "RFID Reader only records student arrival. Checkouts must be completed via Guardian QR Code scan.",
                'student' => $student,
                'attendance' => null,
                'direction' => 'out',
                'ignored' => true,
                'sms_logs' => []
            ], 200);
        }

        // Query existing attendance record for this student on specified date
        $existingAttendance = Attendance::where('student_id', $student->id)
            ->where('date', $date)
            ->first();

        // 1. If student has an active check-in (where time_out IS NULL), ignore repeated scans
        if ($existingAttendance && $existingAttendance->time_out === null) {
            $existingAttendance->load('student.guardians');
            return response()->json([
                'message' => "Ignored scan. Student {$student->name} is already present/checked in. Waiting for Guardian QR pickup for checkout.",
                'student' => $student,
                'attendance' => $existingAttendance,
                'direction' => 'in',
                'ignored' => true,
                'sms_logs' => []
            ], 200);
        }

        $classStartTime = '08:00:00';
        $status = ($time > $classStartTime) ? 'Late' : 'Present';

        // 2. If student was previously checked out today (time_out is NOT null), start new check-in transaction
        if ($existingAttendance && $existingAttendance->time_out !== null) {
            $existingAttendance->update([
                'time_in' => $time,
                'time_out' => null,
                'status' => $status,
                'verified_by' => 'RFID System',
            ]);
            $attendance = $existingAttendance->fresh(['student.guardians']);
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

        $smsLogs = $this->generateSmsLogs($student, 'checked IN', $time, $attendance->status);

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
     * Generate a unique single-use QR checkout token for a present student.
     */
    public function generateCheckoutQr(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'date' => 'nullable|date_format:Y-m-d',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student = Student::with(['guardians', 'section.teacher'])->findOrFail($request->student_id);

        // Find active present attendance record
        $activeAttendance = Attendance::where('student_id', $student->id)
            ->whereNull('time_out')
            ->orderBy('id', 'desc')
            ->first();

        if (!$activeAttendance) {
            return response()->json([
                'message' => "Student {$student->name} is not currently marked as present or checked in."
            ], 400);
        }

        // Invalidate previous unused QR tokens for this student
        CheckoutToken::where('student_id', $student->id)
            ->where('is_used', false)
            ->update(['is_used' => true]);

        // Generate unique token valid for 15 minutes
        $token = Str::random(40);
        $expiresAt = now()->addMinutes(15);

        $checkoutToken = CheckoutToken::create([
            'token' => $token,
            'student_id' => $student->id,
            'attendance_id' => $activeAttendance->id,
            'expires_at' => $expiresAt,
            'is_used' => false,
        ]);

        return response()->json([
            'message' => 'Guardian Checkout QR Code generated successfully.',
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'student' => $student,
            'attendance' => $activeAttendance,
        ], 200);
    }

    /**
     * Public validation endpoint for Guardian QR scanning on mobile.
     */
    public function validateCheckoutQr(Request $request)
    {
        $token = $request->query('token');
        if (!$token) {
            return response()->json([
                'valid' => false,
                'message' => 'Missing checkout token parameter.'
            ], 400);
        }

        $checkoutToken = CheckoutToken::with(['student.guardians', 'student.section.teacher', 'attendance'])
            ->where('token', $token)
            ->first();

        if (!$checkoutToken) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid QR Code token. Please ask the teacher to generate a new QR code.'
            ], 404);
        }

        if ($checkoutToken->is_used) {
            return response()->json([
                'valid' => false,
                'message' => 'This QR Code has already been used and is no longer valid.'
            ], 400);
        }

        if (now()->greaterThan($checkoutToken->expires_at)) {
            return response()->json([
                'valid' => false,
                'message' => 'This QR Code session has expired (15-min limit). Please ask the teacher for a new QR code.'
            ], 400);
        }

        if ($checkoutToken->attendance && $checkoutToken->attendance->time_out) {
            return response()->json([
                'valid' => false,
                'message' => "Student {$checkoutToken->student->name} has already been checked out."
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'token' => $checkoutToken->token,
            'student' => $checkoutToken->student,
            'attendance' => $checkoutToken->attendance,
            'expires_at' => $checkoutToken->expires_at->toIso8601String(),
        ], 200);
    }

    /**
     * Guardian pickup confirmation endpoint on mobile phone.
     */
    public function confirmCheckoutQr(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $checkoutToken = CheckoutToken::with(['student.guardians', 'attendance'])
            ->where('token', $request->token)
            ->first();

        if (!$checkoutToken || $checkoutToken->is_used) {
            return response()->json([
                'message' => 'This QR Code token is invalid or has already been used.'
            ], 400);
        }

        if (now()->greaterThan($checkoutToken->expires_at)) {
            return response()->json([
                'message' => 'This QR Code session has expired. Please ask the teacher for a new QR code.'
            ], 400);
        }

        $attendance = $checkoutToken->attendance;
        if (!$attendance || $attendance->time_out !== null) {
            return response()->json([
                'message' => 'Student has already been checked out.'
            ], 400);
        }

        // Server timestamp for accurate checkout recording
        $serverTime = date('H:i:s');
        $attendance->update([
            'time_out' => $serverTime,
            'status' => 'Checked Out',
            'verified_by' => 'Guardian QR',
        ]);

        // Invalidate the QR token
        $checkoutToken->update([
            'is_used' => true,
            'used_at' => now(),
        ]);

        $student = $checkoutToken->student;
        $smsLogs = $this->generateSmsLogs($student, 'checked OUT', $serverTime, 'Checked Out');

        return response()->json([
            'message' => "Pickup confirmed! Student {$student->name} checked OUT successfully.",
            'student' => $student,
            'attendance' => $attendance->fresh(['student.guardians']),
            'time_out' => date('h:i A', strtotime($serverTime)),
            'sms_logs' => $smsLogs,
        ], 200);
    }

    /**
     * Helper to build SMS notification logs for guardians.
     */
    private function generateSmsLogs($student, $actionWord, $time, $status)
    {
        $smsLogs = [];
        $formattedTime = date('h:i A', strtotime($time));
        foreach ($student->guardians as $guardian) {
            $message = "FCU Attendance Alert: {$student->name} has {$actionWord} at {$formattedTime}. Status: {$status}.";
            $smsLogs[] = [
                'guardian_name' => $guardian->name,
                'phone' => $guardian->phone,
                'relation' => $guardian->relation,
                'message' => $message,
                'sent_at' => date('Y-m-d H:i:s'),
            ];
        }
        return $smsLogs;
    }

    /**
     * Perform a manual override on student attendance.
     */
    public function override(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date_format:Y-m-d',
            'status' => 'required|in:Present,Late,Absent,Checked Out',
            'time_in' => 'nullable|string',
            'time_out' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $timeIn = $request->time_in ? date('H:i:s', strtotime($request->time_in)) : null;
        $timeOut = $request->time_out ? date('H:i:s', strtotime($request->time_out)) : null;

        $attendance = Attendance::updateOrCreate(
            [
                'student_id' => $request->student_id,
                'date' => $request->date,
            ],
            [
                'status' => $request->status,
                'time_in' => $timeIn,
                'time_out' => $timeOut,
                'verified_by' => 'Manual Override',
            ]
        );

        return response()->json([
            'message' => 'Attendance record saved.',
            'attendance' => $attendance->load('student.guardians')
        ], 200);
    }

    /**
     * Clear gate scan logs.
     */
    public function clearGateLogs(Request $request)
    {
        if ($request->has('delete_attendance') && $request->delete_attendance) {
            Attendance::query()->delete();
        }

        return response()->json([
            'message' => 'Gate scan logs cleared successfully.'
        ], 200);
    }
}
