<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChatMessageController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\HealthAvailabilityController;
use App\Http\Controllers\HealthBookingController;
use App\Http\Controllers\HealthProfileController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\JobPostController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PostCommentController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\PostLikeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\VerificationController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('products', ProductController::class);

    Route::apiResource('companies', CompanyController::class)->only(['index', 'show', 'store', 'update']);

    Route::apiResource('jobs', JobPostController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    Route::post('jobs/{job}/apply', [JobApplicationController::class, 'store']);
    Route::get('jobs/{job}/applications', [JobApplicationController::class, 'index']);
    Route::get('job-applications', [JobApplicationController::class, 'myIndex']);
    Route::get('job-applications/inbox', [JobApplicationController::class, 'inboxIndex']);
    Route::put('job-applications/{application}', [JobApplicationController::class, 'update']);

    Route::apiResource('health/profiles', HealthProfileController::class)->only(['index', 'show', 'store', 'update']);
    Route::get('health/profiles/{profile}/availability', [HealthAvailabilityController::class, 'index']);
    Route::post('health/profiles/{profile}/availability', [HealthAvailabilityController::class, 'store']);
    Route::apiResource('health/bookings', HealthBookingController::class)->only(['index', 'show', 'store', 'update']);
    Route::post('health/bookings/{booking}/otp', [HealthBookingController::class, 'confirmOtp']);

    Route::apiResource('posts', PostController::class)->only(['index', 'show', 'store', 'destroy']);
    Route::post('posts/{post}/comments', [PostCommentController::class, 'store']);
    Route::post('posts/{post}/likes', [PostLikeController::class, 'store']);
    Route::delete('posts/{post}/likes', [PostLikeController::class, 'destroy']);
    Route::post('reports', [ReportController::class, 'store']);

    Route::apiResource('chats', ChatController::class)->only(['index', 'show', 'store']);
    Route::post('chats/{chat}/messages', [ChatMessageController::class, 'store']);

    Route::post('verifications', [VerificationController::class, 'store']);
    Route::post('payments/authorize', [PaymentController::class, 'authorizePayment']);
    Route::post('payments/{payment}/capture', [PaymentController::class, 'capturePayment']);

    Route::get('profile', [UserProfileController::class, 'show']);
    Route::post('profile', [UserProfileController::class, 'upsert']);
});
