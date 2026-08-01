<?php

namespace App\Http\Controllers;

use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SectionController extends Controller
{
    /**
     * Display a listing of sections with their assigned teachers.
     */
    public function index()
    {
        $sections = Section::with('teacher')->get();
        return response()->json($sections, 200);
    }

    /**
     * Store a newly created section.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'year_level' => 'required|string|max:255',
            'section_name' => 'required|string|max:255',
            'teacher_id' => 'nullable|exists:admins,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $section = Section::create($request->all());
        $section->load('teacher');

        return response()->json($section, 201);
    }

    /**
     * Update the specified section.
     */
    public function update(Request $request, $id)
    {
        $section = Section::find($id);

        if (!$section) {
            return response()->json([
                'message' => 'Section not found.'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'year_level' => 'required|string|max:255',
            'section_name' => 'required|string|max:255',
            'teacher_id' => 'nullable|exists:admins,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $section->update($request->all());
        $section->load('teacher');

        return response()->json($section, 200);
    }

    /**
     * Remove the specified section.
     */
    public function destroy($id)
    {
        $section = Section::find($id);

        if (!$section) {
            return response()->json([
                'message' => 'Section not found.'
            ], 404);
        }

        $section->delete();

        return response()->json([
            'message' => 'Section deleted successfully.'
        ], 200);
    }
}
