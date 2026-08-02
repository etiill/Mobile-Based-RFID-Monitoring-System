<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\DismissalController;

Route::post('/login', [AuthController::class, 'login']);

// Real-time Event Stream (bypasses auth headers due to browser EventSource limitations, validated inside using query token)
Route::get('/v1/dismissal/stream', [DismissalController::class, 'stream']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    // Student & Guardian CRUD Management
    Route::get('/students', [StudentController::class, 'index']);
    Route::post('/students', [StudentController::class, 'store']);
    Route::put('/students/{id}', [StudentController::class, 'update']);
    Route::delete('/students/{id}', [StudentController::class, 'destroy']);
    Route::post('/students/{studentId}/guardians', [StudentController::class, 'storeGuardian']);
    Route::delete('/students/{studentId}/guardians/{guardianId}', [StudentController::class, 'destroyGuardian']);

    // Teacher CRUD Management
    Route::get('/teachers', [StudentController::class, 'indexTeachers']);
    Route::post('/teachers', [StudentController::class, 'storeTeacher']);
    Route::delete('/teachers/{id}', [StudentController::class, 'destroyTeacher']);

    // Section & Year Level CRUD Management
    Route::get('/sections', [SectionController::class, 'index']);
    Route::post('/sections', [SectionController::class, 'store']);
    Route::put('/sections/{id}', [SectionController::class, 'update']);
    Route::delete('/sections/{id}', [SectionController::class, 'destroy']);

    // Guardian Child Information
    Route::get('/guardian/child', [StudentController::class, 'getGuardianChild']);

    // Dismissal Workflow API
    Route::prefix('v1')->group(function () {
        Route::post('/dismissal/generate-token', [DismissalController::class, 'generateToken']);
        Route::post('/dismissal/request-pickup', [DismissalController::class, 'requestPickup']);
        Route::post('/dismissal/verify/{id}', [DismissalController::class, 'verifyPickup']);
        Route::get('/dismissal/pending', [DismissalController::class, 'getPending']);
        Route::get('/dismissal/status/{student_id}', [DismissalController::class, 'getStudentStatus']);
        Route::post('/dismissal/manual', [DismissalController::class, 'manualDismissal']);
        Route::get('/reports/pickups', [DismissalController::class, 'getHandoverHistory']);
    });
});

