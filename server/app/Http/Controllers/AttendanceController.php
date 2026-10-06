<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Attendance;
use App\Services\SmsService;
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
            $smsLogs = SmsService::sendAttendanceAlert($student, 'checked OUT', $time, 'Checked Out');

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
}

