<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\JobPost;
use Illuminate\Http\Request;

class JobPostController extends Controller
{
    public function index(Request $request)
    {
        $query = JobPost::query()->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->paginate(20));
    }

    public function show(JobPost $job)
    {
        return response()->json($job);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'location' => 'nullable|string|max:255',
            'modality' => 'nullable|string|max:100',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        $company = Company::find($data['company_id']);
        if (!$company) {
            return response()->json(['message' => 'Empresa no encontrada'], 404);
        }
        if (!$user->isAdmin() && $company->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $job = JobPost::create($data);

        return response()->json($job, 201);
    }

    public function update(Request $request, JobPost $job)
    {
        $user = $request->user();
        $company = Company::find($job->company_id);
        if (!$company) {
            return response()->json(['message' => 'Empresa no encontrada'], 404);
        }
        if (!$user->isAdmin() && $company->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'location' => 'nullable|string|max:255',
            'modality' => 'nullable|string|max:100',
            'salary_min' => 'nullable|numeric|min:0',
            'salary_max' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        $job->update($data);

        return response()->json($job);
    }

    public function destroy(JobPost $job)
    {
        $user = request()->user();
        $company = Company::find($job->company_id);
        if (!$company) {
            return response()->json(['message' => 'Empresa no encontrada'], 404);
        }
        if (!$user->isAdmin() && $company->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $job->delete();

        return response()->json(['deleted' => true]);
    }
}
