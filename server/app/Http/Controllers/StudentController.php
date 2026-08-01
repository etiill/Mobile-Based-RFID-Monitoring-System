<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Guardian;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class StudentController extends Controller
{
    /**
     * Display a listing of the students with their guardians.
     */
    public function index()
    {
        $students = Student::with(['guardians', 'section.teacher'])->get();
        return response()->json($students, 200);
    }

    /**
     * Store a newly created student in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'grade' => 'required|string|max:255',
            'rfid' => 'required|string|unique:students,rfid|max:255',
            'section_id' => 'nullable|exists:sections,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student = Student::create($request->all());
        
        // Eager load relations
        $student->load(['guardians', 'section.teacher']);

        return response()->json($student, 201);
    }

    /**
     * Update the specified student in storage.
     */
    public function update(Request $request, $id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'message' => 'Student not found.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'grade' => 'required|string|max:255',
            'rfid' => 'required|string|unique:students,rfid,' . $id . '|max:255',
            'section_id' => 'nullable|exists:sections,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student->update($request->all());
        
        $student->load(['guardians', 'section.teacher']);

        return response()->json($student, 200);
    }

    /**
     * Remove the specified student from storage.
     */
    public function destroy($id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'message' => 'Student not found.'
            ], 404);
        }

        $student->delete();

        return response()->json([
            'message' => 'Student deleted successfully.'
        ], 200);
    }

    /**
     * Store a newly created guardian for a student.
     */
    public function storeGuardian(Request $request, $studentId)
    {
        $student = Student::find($studentId);

        if (!$student) {
            return response()->json([
                'message' => 'Student not found.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'relation' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'required|string|email|unique:guardians,email|unique:admins,email|max:255',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $guardian = $student->guardians()->create([
            'name' => $request->name,
            'relation' => $request->relation,
            'phone' => $request->phone,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        return response()->json($guardian, 201);
    }

    /**
     * Remove the specified guardian from storage.
     */
    public function destroyGuardian($studentId, $guardianId)
    {
        $student = Student::find($studentId);

        if (!$student) {
            return response()->json([
                'message' => 'Student not found.'
            ], 404);
        }

        $guardian = Guardian::where('id', $guardianId)->where('student_id', $studentId)->first();

        if (!$guardian) {
            return response()->json([
                'message' => 'Guardian not found.'
            ], 404);
        }

        $guardian->delete();

        return response()->json([
            'message' => 'Guardian removed successfully.'
        ], 200);
    }

    /**
     * Display a listing of the teachers.
     */
    public function indexTeachers()
    {
        $teachers = Admin::where('role', 'teacher')->get();
        return response()->json($teachers, 200);
    }

    /**
     * Store a newly created teacher.
     */
    public function storeTeacher(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:admins,email|max:255',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $teacher = Admin::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'teacher',
        ]);

        return response()->json($teacher, 201);
    }

    /**
     * Remove the specified teacher from storage.
     */
    public function destroyTeacher($id)
    {
        $teacher = Admin::where('id', $id)->where('role', 'teacher')->first();

        if (!$teacher) {
            return response()->json([
                'message' => 'Teacher not found.'
            ], 404);
        }

        $teacher->delete();

        return response()->json([
            'message' => 'Teacher deleted successfully.'
        ], 200);
    }

    /**
     * Get the student details associated with the authenticated guardian.
     */
    public function getGuardianChild(Request $request)
    {
        $guardian = $request->user();

        if (!$guardian || !($guardian instanceof Guardian)) {
            return response()->json([
                'message' => 'Unauthorized or not a guardian.'
            ], 401);
        }

        $student = Student::with('guardians')->find($guardian->student_id);

        if (!$student) {
            return response()->json([
                'message' => 'Student record not found.'
            ], 404);
        }

        return response()->json($student, 200);
    }
}
