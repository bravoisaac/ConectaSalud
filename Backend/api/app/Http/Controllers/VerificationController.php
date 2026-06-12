<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\HealthProfile;
use App\Models\VerificationRequest;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $verifications = VerificationRequest::query()
            ->with('user:id,name,email,role')
            ->latest()
            ->paginate(20);

        return response()->json($verifications);
    }

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

    public function approve(Request $request, VerificationRequest $verification)
    {
        return $this->review($request, $verification, 'approved');
    }

    public function reject(Request $request, VerificationRequest $verification)
    {
        return $this->review($request, $verification, 'rejected');
    }

    private function review(Request $request, VerificationRequest $verification, string $status)
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if (!in_array($status, ['approved', 'rejected'], true)) {
            return response()->json(['message' => 'Estado de revision no permitido'], 422);
        }

        $verification->update([
            'status' => $status,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        $this->syncVerifiedResource($verification, $status);

        $verification->load('user:id,name,email,role');

        return response()->json($verification);
    }

    private function syncVerifiedResource(VerificationRequest $verification, string $status): void
    {
        $payload = is_array($verification->payload) ? $verification->payload : [];

        if ($verification->role === 'health') {
            HealthProfile::query()
                ->where('user_id', $verification->user_id)
                ->update(['verification_status' => $status]);
            return;
        }

        if ($verification->role === 'company') {
            $companyId = $payload['company_id'] ?? $payload['companyId'] ?? null;
            $query = Company::query()->where('user_id', $verification->user_id);

            if ($companyId) {
                $query->where('id', $companyId);
            }

            $query->update(['verification_status' => $status]);
        }
    }
}
