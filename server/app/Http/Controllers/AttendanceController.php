<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
     * Process an RFID tag scan event (from a range sensor / gate node).
     */
    public function scan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'rfid' => 'required|string',
            'direction' => 'nullable|string|in:in,out',
            'time' => 'nullable|string', // Expected format e.g., '08:05 AM' or ISO format
            'date' => 'nullable|string', // Expected format 'YYYY-MM-DD'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find the student registered under the given RFID tag
        $student = Student::with(['guardians', 'section.teacher'])->where('rfid', $request->rfid)->first();
        if (!$student) {
            return response()->json([
                'message' => 'Invalid RFID tag. No student registered with tag ' . $request->rfid
            ], 404);
        }

        $date = $request->date ?: date('Y-m-d');
        
        // Parse time
        if ($request->time) {
            $time = date('H:i:s', strtotime($request->time));
        } else {
            $time = date('H:i:s');
        }

        $attendance = Attendance::where('student_id', $student->id)->where('date', $date)->first();

        // If direction is not specified, toggle between In and Out based on pre-existing record
        $direction = $request->direction;
        if (!$direction) {
            if (!$attendance) {
                $direction = 'in';
            } elseif (is_null($attendance->time_out)) {
                $direction = 'out';
            } else {
                // If already checked in and out, re-toggle in? Or just keep it as 'out'. Let's default to toggle in.
                $direction = 'in';
            }
        }

        $classStartTime = '08:00:00';

        if ($direction === 'in') {
            $status = ($time > $classStartTime) ? 'Late' : 'Present';
            if (!$attendance) {
                $attendance = Attendance::create([
                    'student_id' => $student->id,
                    'date' => $date,
                    'time_in' => $time,
                    'status' => $status,
                    'verified_by' => 'RFID System',
                ]);
            } else {
                $attendance->update([
                    'time_in' => $time,
                    'status' => $status,
                    'verified_by' => 'RFID System',
                ]);
            }
        } else {
            // Check out direction
            if (!$attendance) {
                // Checkout without checkin - create entry with null time_in
                $attendance = Attendance::create([
                    'student_id' => $student->id,
                    'date' => $date,
                    'time_out' => $time,
                    'status' => 'Present',
                    'verified_by' => 'RFID System',
                ]);
            } else {
                $attendance->update([
                    'time_out' => $time,
                ]);
            }
        }

        // Reload relationships
        $attendance->load('student.guardians');

        // Simulate SMS dispatches to student's guardians
        $smsLogs = [];
        $formattedTime = date('h:i A', strtotime($time));
        $actionWord = ($direction === 'in') ? 'checked IN' : 'checked OUT';

        foreach ($student->guardians as $guardian) {
            $message = "FCU Attendance Alert: {$student->name} has {$actionWord} at {$formattedTime}. Status: {$attendance->status}.";
            $smsLogs[] = [
                'guardian_name' => $guardian->name,
                'phone' => $guardian->phone,
                'relation' => $guardian->relation,
                'message' => $message,
                'sent_at' => date('Y-m-d H:i:s'),
            ];
        }

        return response()->json([
            'message' => 'RFID tag read successfully.',
            'student' => $student,
            'attendance' => $attendance,
            'direction' => $direction,
            'sms_logs' => $smsLogs
        ], 200);
    }

    /**
     * Perform a manual override on student attendance.
     */
    public function override(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date_format:Y-m-d',
            'status' => 'required|in:Present,Late,Absent',
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
}
