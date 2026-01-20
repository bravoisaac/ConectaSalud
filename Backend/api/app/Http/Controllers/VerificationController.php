<?php

namespace App\Http\Controllers;

use App\Models\VerificationRequest;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'role' => 'required|in:health,company',
            'payload' => 'required|array',
        ]);

        $user = $request->user();
        if (!$user->isAdmin() && $user->role !== $data['role']) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $verification = VerificationRequest::create([
            'user_id' => $user->id,
            'role' => $data['role'],
            'status' => 'pending',
            'payload' => $data['payload'],
        ]);

        return response()->json($verification, 201);
    }
}
