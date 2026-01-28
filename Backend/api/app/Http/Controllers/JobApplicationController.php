<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobPost;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    public function index(Request $request, JobPost $job)
    {
        $user = $request->user();
        $companyOwnerId = Company::query()
            ->where('id', $job->company_id)
            ->value('user_id');

        if (!$user->isAdmin() && $companyOwnerId !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $applications = JobApplication::query()
            ->where('job_post_id', $job->id)
            ->latest()
            ->paginate(20);

        return response()->json($applications);
    }

    public function store(Request $request, JobPost $job)
    {
        $user = $request->user();
        if ($job->status !== 'open') {
            return response()->json(['message' => 'Oferta no disponible'], 422);
        }

        $data = $request->validate([
            'cover_letter' => 'nullable|string',
        ]);

        $application = JobApplication::firstOrCreate(
            [
                'job_post_id' => $job->id,
                'user_id' => $user->id,
            ],
            [
                'cover_letter' => $data['cover_letter'] ?? null,
                'status' => 'applied',
            ]
        );

        $status = $application->wasRecentlyCreated ? 201 : 200;

        return response()->json($application, $status);
    }
}
