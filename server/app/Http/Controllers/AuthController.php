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
                'phone' => $user->phone ?? null,
                'gender' => $user->gender ?? null,
                'birth_date' => $user->birth_date ?? null,
                'faculty_classification' => $user->faculty_classification ?? null,
                'location' => $user->location ?? null,
                'title' => $user->title ?? null,
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

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $isTeacherOrAdmin = ($user->role === 'teacher' || $user->role === 'admin');
        $table = $isTeacherOrAdmin ? 'admins' : 'guardians';

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:' . $table . ',email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|string|max:50',
            'birth_date' => 'nullable|string|max:50',
            'faculty_classification' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($request->only([
            'name', 'email', 'phone', 'gender', 'birth_date', 'faculty_classification', 'location', 'title'
        ]));

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'admin',
                'phone' => $user->phone,
                'gender' => $user->gender,
                'birth_date' => $user->birth_date,
                'faculty_classification' => $user->faculty_classification,
                'location' => $user->location,
                'title' => $user->title,
            ]
        ], 200);
    }

    /**
     * Update the authenticated user's password.
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.'
            ], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully.'
        ], 200);
    }
}
