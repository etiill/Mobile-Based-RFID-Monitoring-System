<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\SectionController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

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
});

