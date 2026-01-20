<?php

namespace App\Http\Controllers;

use App\Models\HealthAvailability;
use App\Models\HealthProfile;
use Illuminate\Http\Request;

class HealthAvailabilityController extends Controller
{
    public function index(HealthProfile $profile)
    {
        $items = HealthAvailability::query()
            ->where('health_profile_id', $profile->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return response()->json($items);
    }

    public function store(Request $request, HealthProfile $profile)
    {
        $user = $request->user();
        if (!$user->isAdmin() && $profile->user_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'timezone' => 'nullable|string|max:100',
        ]);

        $availability = HealthAvailability::create([
            'health_profile_id' => $profile->id,
            'day_of_week' => $data['day_of_week'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'timezone' => $data['timezone'] ?? 'America/Santiago',
        ]);

        return response()->json($availability, 201);
    }
}
