<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\AttendanceController;

Route::post('/login', [AuthController::class, 'login']);

// Public Guardian QR Checkout Validation & Pickup Confirmation (Scanned from Guardian Phone Camera)
Route::get('/attendance/checkout-qr/validate', [AttendanceController::class, 'validateCheckoutQr']);
Route::post('/attendance/checkout-qr/confirm', [AttendanceController::class, 'confirmCheckoutQr']);

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
    Route::put('/students/{studentId}/guardians/{guardianId}', [StudentController::class, 'updateGuardian']);
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

    // Attendance Management & Single-Use Guardian QR Generation
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance/scan', [AttendanceController::class, 'scan']);
    Route::post('/attendance/override', [AttendanceController::class, 'override']);
    Route::post('/attendance/clear-gate-logs', [AttendanceController::class, 'clearGateLogs']);
    Route::post('/attendance/checkout-qr/generate', [AttendanceController::class, 'generateCheckoutQr']);
});
