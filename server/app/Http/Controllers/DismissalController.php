<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PickupToken;
use App\Models\DismissalLog;
use App\Models\Student;
use App\Models\Section;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class DismissalController extends Controller
{
    /**
     * Generate a dynamic 5-minute QR token for the teacher.
     */
    public function generateToken(Request $request)
    {
        $user = $request->user();

        // Validate that this is a teacher or admin
        if (!$user || !in_array($user->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Unauthorized. Only teachers can generate station QR codes.'], 403);
        }

        $tokenStr = Str::random(32);
        
        $token = PickupToken::create([
            'token' => $tokenStr,
            'teacher_id' => $user->id,
            'expires_at' => now()->addMinutes(5),
        ]);

        return response()->json([
            'token' => $token->token,
            'expires_at' => $token->expires_at->toIso8601String(),
        ], 201);
    }

    /**
     * Request a student pickup (Guardian scans the QR code).
     */
    public function requestPickup(Request $request)
    {
        $guardian = $request->user();

        // 1. Validate that requester is indeed a guardian
        if (!$guardian || $guardian->relation === null) {
            // Note: The AuthController returns role 'guardian' and sets relation for Guardian models.
            // Let's also check class name or simple relation check.
            if ($guardian->role !== 'guardian' && !($guardian instanceof \App\Models\Guardian)) {
                return response()->json(['message' => 'Unauthorized. Only guardians can request student pickups.'], 403);
            }
        }

        // 2. Validate payload
        $validator = Validator::make($request->all(), [
            'station_token' => 'required|string',
            'guardian_id' => 'required',
            'student_id' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $stationToken = $request->station_token;
        $studentId = $request->student_id;
        $guardianId = $request->guardian_id;

        // 3. Verify the token is valid and active
        $pickupToken = PickupToken::where('token', $stationToken)
            ->where('expires_at', '>', now())
            ->first();

        if (!$pickupToken) {
            return response()->json([
                'message' => 'Invalid or expired station QR code. Please scan a fresh QR code.'
            ], 400);
        }

        // 4. Verify student belongs to this guardian
        if ($guardian->id != $guardianId || $guardian->student_id != $studentId) {
            return response()->json([
                'message' => 'Mismatch in guardian or student mapping.'
            ], 403);
        }

        // 5. Create or update the dismissal log for today
        // If there's already a pending request, we can update it or return it.
        $existingLog = DismissalLog::where('student_id', $studentId)
            ->whereDate('created_at', today())
            ->where('status', 'pending')
            ->first();

        if ($existingLog) {
            return response()->json([
                'message' => 'A pickup request is already pending teacher approval.',
                'log' => $existingLog
            ], 200);
        }

        $log = DismissalLog::create([
            'student_id' => $studentId,
            'guardian_id' => $guardianId,
            'station_token' => $stationToken,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Pickup request submitted. Awaiting teacher approval.',
            'log' => $log
        ], 201);
    }

    /**
     * Verify and finalize student handover (Teacher approves).
     */
    public function verifyPickup(Request $request, $id)
    {
        $teacher = $request->user();

        if (!$teacher || !in_array($teacher->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Unauthorized. Only teachers can verify pickups.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:success,flagged,rejected',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid status option.'], 422);
        }

        $log = DismissalLog::find($id);

        if (!$log) {
            return response()->json(['message' => 'Dismissal request not found.'], 404);
        }

        $log->update([
            'status' => $request->status,
            'teacher_id' => $teacher->id,
            'verified_at' => now(),
        ]);

        return response()->json([
            'message' => $request->status === 'success' 
                ? 'Student handover approved successfully.' 
                : 'Handover verification updated.',
            'log' => $log
        ], 200);
    }

    /**
     * Fetch pending pickup requests for the teacher's classroom/section.
     */
    public function getPending(Request $request)
    {
        $teacher = $request->user();

        if (!$teacher || !in_array($teacher->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $section = Section::where('teacher_id', $teacher->id)->first();

        $query = DismissalLog::with(['student.section', 'guardian'])
            ->where('status', 'pending');

        if ($section) {
            $query->whereHas('student', function ($q) use ($section) {
                $q->where('section_id', $section->id);
            });
        }

        $logs = $query->get()->map(function ($log) {
            return [
                'id' => $log->id,
                'guardianName' => $log->guardian->name,
                'relation' => strtoupper($log->guardian->relation),
                'studentName' => $log->student->name,
                'studentId' => $log->student->id,
                'classLabel' => $log->student->section 
                    ? ($log->student->section->year_level . ' - ' . $log->student->section->section_name) 
                    : $log->student->grade,
            ];
        });

        return response()->json($logs, 200);
    }

    /**
     * Fetch the current pickup status for a student.
     */
    public function getStudentStatus(Request $request, $studentId)
    {
        $user = $request->user();

        // Security check: Only the child's guardian or a teacher can check the status
        if ($user->role === 'guardian' && $user->student_id != $studentId) {
            return response()->json(['message' => 'Unauthorized to access this student status.'], 403);
        }

        $log = DismissalLog::where('student_id', $studentId)
            ->whereDate('created_at', today())
            ->latest()
            ->first();

        $status = 'idle';
        if ($log) {
            if ($log->status === 'pending') {
                $status = 'Request Sent - Awaiting Teacher Approval';
            } elseif ($log->status === 'success') {
                $status = 'Dismissal Approved (SUCCESS)';
            } elseif ($log->status === 'flagged') {
                $status = 'Flagged';
            } elseif ($log->status === 'rejected') {
                $status = 'Rejected';
            }
        }

        return response()->json([
            'status' => $status,
            'log' => $log
        ], 200);
    }

    /**
     * Log a manual dismissal check-in directly (Teacher bypasses QR scan).
     */
    public function manualDismissal(Request $request)
    {
        $teacher = $request->user();
        if (!$teacher || !in_array($teacher->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'student_id' => 'required',
            'guardian_id' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid student or guardian selection.'], 422);
        }

        $log = DismissalLog::create([
            'student_id' => $request->student_id,
            'guardian_id' => $request->guardian_id,
            'teacher_id' => $teacher->id,
            'status' => 'success',
            'verified_at' => now(),
            'station_token' => 'MANUAL_BYPASS',
        ]);

        return response()->json([
            'message' => 'Manual dismissal logged successfully.',
            'log' => $log
        ], 201);
    }

    /**
     * Real-time SSE stream for both Teachers (pending list) and Guardians (status).
     */
    public function stream(Request $request)
    {
        return response()->stream(function () use ($request) {
            $tokenStr = $request->query('token');
            $user = null;

            if ($tokenStr) {
                // Sanctum tokens are stored hashed in database, findToken checks this properly
                $tokenModel = \Laravel\Sanctum\PersonalAccessToken::findToken($tokenStr);
                if ($tokenModel && $tokenModel->tokenable) {
                    $user = $tokenModel->tokenable;
                }
            }

            // Fallback to Sanctum session if available
            if (!$user) {
                $user = $request->user();
            }

            if (!$user) {
                echo "data: " . json_encode(['error' => 'Unauthorized']) . "\n\n";
                ob_flush();
                flush();
                return;
            }

            // Force close session to allow concurrent requests in PHP
            if (session_id()) {
                session_write_close();
            }

            // Disable compression and buffering
            if (function_exists('apache_setenv')) {
                apache_setenv('no-gzip', '1');
            }
            ini_set('zlib.output_compression', '0');

            $lastPayload = '';

            // Run for 40 seconds max, client will auto-reconnect
            for ($i = 0; $i < 20; $i++) {
                if (connection_aborted()) {
                    break;
                }

                $data = [];

                if ($user->role === 'teacher' || $user->role === 'admin') {
                    $section = Section::where('teacher_id', $user->id)->first();
                    $query = DismissalLog::with(['student.section', 'guardian'])
                        ->where('status', 'pending');

                    if ($section) {
                        $query->whereHas('student', function ($q) use ($section) {
                            $q->where('section_id', $section->id);
                        });
                    }

                    $data = $query->get()->map(function ($log) {
                        return [
                            'id' => $log->id,
                            'guardianName' => $log->guardian->name,
                            'relation' => strtoupper($log->guardian->relation),
                            'studentName' => $log->student->name,
                            'studentId' => $log->student->id,
                            'classLabel' => $log->student->section 
                                ? ($log->student->section->year_level . ' - ' . $log->student->section->section_name) 
                                : $log->student->grade,
                        ];
                    })->toArray();
                } elseif ($user->role === 'guardian') {
                    $studentId = $user->student_id;
                    $log = DismissalLog::where('student_id', $studentId)
                        ->whereDate('created_at', today())
                        ->latest()
                        ->first();

                    $status = 'idle';
                    if ($log) {
                        if ($log->status === 'pending') {
                            $status = 'Request Sent - Awaiting Teacher Approval';
                        } elseif ($log->status === 'success') {
                            $status = 'Dismissal Approved (SUCCESS)';
                        } elseif ($log->status === 'flagged') {
                            $status = 'Flagged';
                        } elseif ($log->status === 'rejected') {
                            $status = 'Rejected';
                        }
                    }

                    $data = [
                        'status' => $status,
                        'log' => $log ? [
                            'id' => $log->id,
                            'status' => $log->status,
                            'verified_at' => $log->verified_at ? $log->verified_at->toIso8601String() : null,
                        ] : null
                    ];
                }

                $payload = json_encode($data);

                if ($payload !== $lastPayload) {
                    echo "data: {$payload}\n\n";
                    ob_flush();
                    flush();
                    $lastPayload = $payload;
                }

                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Fetch completed dismissal handover logs history.
     */
    public function getHandoverHistory(Request $request)
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, ['teacher', 'admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = DismissalLog::with(['student.section', 'guardian', 'teacher'])
            ->whereIn('status', ['success', 'rejected', 'completed']);

        // If user is teacher, filter by their assigned section
        if ($user->role === 'teacher') {
            $section = Section::where('teacher_id', $user->id)->first();
            if ($section) {
                $query->whereHas('student', function ($q) use ($section) {
                    $q->where('section_id', $section->id);
                });
            } else {
                return response()->json([], 200);
            }
        }

        $logs = $query->orderBy('updated_at', 'desc')->get()->map(function ($log) {
            $isManual = is_null($log->token_id) || empty($log->token_id);
            
            return [
                'id' => $log->id,
                'studentName' => $log->student->name,
                'studentId' => $log->student->id,
                'classLabel' => $log->student->section 
                    ? ($log->student->section->year_level . ' - ' . $log->student->section->section_name) 
                    : $log->student->grade,
                'guardianName' => $log->guardian ? $log->guardian->name : 'N/A',
                'relation' => $log->guardian ? strtoupper($log->guardian->relation) : 'N/A',
                'verifiedBy' => $log->teacher ? $log->teacher->name : 'System Node',
                'checkoutTime' => $log->updated_at ? $log->updated_at->setTimezone('Asia/Manila')->format('Y-m-d h:i A') : 'N/A',
                'status' => $log->status === 'success' ? 'Completed' : ucfirst($log->status),
                'method' => $isManual ? 'Manual Verification' : 'RFID Scanner',
            ];
        });

        return response()->json($logs, 200);
    }
}
