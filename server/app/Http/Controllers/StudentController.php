<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Guardian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StudentController extends Controller
{
    /**
     * Display a listing of the students with their guardians.
     */
    public function index()
    {
        $students = Student::with('guardians')->get();
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
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student = Student::create($request->all());
        
        // Eager load guardians (will be empty array initially)
        $student->load('guardians');

        return response()->json($student, 201);
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
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $guardian = $student->guardians()->create($request->all());

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
}
