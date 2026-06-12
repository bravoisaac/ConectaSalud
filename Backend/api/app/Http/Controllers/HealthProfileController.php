<?php

namespace App\Http\Controllers;

use App\Models\HealthProfile;
use Illuminate\Http\Request;

class HealthProfileController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = HealthProfile::query()
            ->with('user')
            ->latest();

        if (!$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('verification_status', 'approved')
                    ->orWhere('user_id', $user->id);
            });
        }

        return response()->json(
            $query->paginate(20)
        );
    }

    public function show(HealthProfile $profile)
    {
        return response()->json($profile);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->hasRole('health')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }
        if (HealthProfile::query()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Perfil ya existe'], 409);
        }

        $data = $request->validate([
            'specialty' => 'required|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'rate_hour' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
        ]);

        $data['user_id'] = $user->id;
        $data['verification_status'] = 'pending';

        $profile = HealthProfile::create($data);

        return response()->json($profile, 201);
    }

    public function update(Request $request, HealthProfile $profile)
    {
        $user = $request->user();
        if (!$user->isAdmin() && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $rules = [
            'specialty' => 'sometimes|required|string|max:255',
            'experience_years' => 'nullable|integer|min:0',
            'rate_hour' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
        ];

        if ($user->isAdmin()) {
            $rules['verification_status'] = 'nullable|string|in:pending,approved,rejected';
        }

        $data = $request->validate($rules);

        $profile->update($data);

        return response()->json($profile);
    }
}
