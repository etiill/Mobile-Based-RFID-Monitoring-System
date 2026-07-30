<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Handle authentication login requests.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = Admin::where('email', $request->email)->first();
        $role = null;

        if ($user) {
            $role = $user->role;
        } else {
            $user = Guardian::where('email', $request->email)->first();
            if ($user) {
                $role = 'guardian';
            }
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        // Generate Sanctum plain text token
        $token = $user->createToken('auth-token')->plainTextToken;

        $studentData = null;
        if ($role === 'guardian') {
            $student = Student::with('guardians')->find($user->student_id);
            if ($student) {
                $studentData = [
                    'id' => $student->id,
                    'name' => $student->name,
                    'grade' => $student->grade,
                    'rfid' => $student->rfid,
                ];
            }
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role,
                'student' => $studentData,
            ],
            'token' => $token
        ], 200);
    }

    /**
     * Handle authentication logout requests.
     */
    public function logout(Request $request)
    {
        // Revoke the token that was used to authenticate the request
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful'
        ], 200);
    }
}
