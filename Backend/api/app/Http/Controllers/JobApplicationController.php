<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobPost;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    public function myIndex(Request $request)
    {
        $user = $request->user();

        $applications = JobApplication::query()
            ->where('user_id', $user->id)
            ->with(['jobPost.company'])
            ->latest()
            ->paginate(20);

        return response()->json($applications);
    }

    public function inboxIndex(Request $request)
    {
        $user = $request->user();

        $applicationsQuery = JobApplication::query()
            ->with(['user', 'profile', 'healthProfile', 'jobPost.company'])
            ->latest();

        if (!$user->isAdmin()) {
            $companyIds = Company::query()
                ->where('user_id', $user->id)
                ->pluck('id')
                ->toArray();

            if (!count($companyIds)) {
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'per_page' => 20,
                    'total' => 0,
                ]);
            }

            $applicationsQuery->whereHas('jobPost', function ($q) use ($companyIds) {
                $q->whereIn('company_id', $companyIds);
            });
        }

        return response()->json($applicationsQuery->paginate(20));
    }

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
            ->with(['user', 'profile', 'healthProfile'])
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

        $application->load(['user', 'profile', 'healthProfile']);

        $status = $application->wasRecentlyCreated ? 201 : 200;

        return response()->json($application, $status);
    }

    public function update(Request $request, JobApplication $application)
    {
        $user = $request->user();
        $data = $request->validate([
            'status' => 'required|string',
        ]);

        $status = strtolower($data['status']);

        // Postulante: aceptar o rechazar oferta
        if ($application->user_id === $user->id) {
            if (!in_array($status, ['accepted', 'declined'], true)) {
                return response()->json(['message' => 'Estado no permitido'], 422);
            }
            if (strtolower($application->status) !== 'offered') {
                return response()->json(['message' => 'No hay una oferta para responder'], 422);
            }
            $application->status = $status;
            $application->save();
            $application->load(['user', 'profile', 'healthProfile', 'jobPost.company']);
            return response()->json($application);
        }

        // Dueño del empleo (empresa/particular) o admin: ofrecer o rechazar
        $job = JobPost::find($application->job_post_id);
        if (!$job) {
            return response()->json(['message' => 'Empleo no encontrado'], 404);
        }

        $companyOwnerId = Company::query()
            ->where('id', $job->company_id)
            ->value('user_id');

        if (!$user->isAdmin() && $companyOwnerId !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if (!in_array($status, ['offered', 'rejected'], true)) {
            return response()->json(['message' => 'Estado no permitido'], 422);
        }

        if (strtolower($application->status) !== 'applied') {
            return response()->json(['message' => 'La postulación ya fue respondida'], 422);
        }

        $application->status = $status;
        $application->save();
        $application->load(['user', 'profile', 'healthProfile', 'jobPost.company']);

        return response()->json($application);
    }
}
