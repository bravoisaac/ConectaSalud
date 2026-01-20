<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\HealthProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;

class HealthBookingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $query = Booking::query();
        } elseif ($user->hasRole('health')) {
            $profileIds = HealthProfile::query()
                ->where('user_id', $user->id)
                ->pluck('id');

            $query = Booking::query()->whereIn('health_profile_id', $profileIds);
        } else {
            $query = Booking::query()->where('user_id', $user->id);
        }

        $bookings = $query->latest()->paginate(20);
        $bookings->getCollection()->transform(function ($booking) use ($user) {
            if (!$this->canSeeOtp($user, $booking)) {
                $booking->otp_code = null;
            }
            return $booking;
        });

        return response()->json($bookings);
    }

    public function show(Request $request, Booking $booking)
    {
        $user = $request->user();
        if (!$this->canAccessBooking($user, $booking)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if (!$this->canSeeOtp($user, $booking)) {
            $booking->otp_code = null;
        }

        return response()->json($booking);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->hasRole('user')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'health_profile_id' => 'required|exists:health_profiles,id',
            'start_at' => 'required|date',
            'end_at' => 'nullable|date|after:start_at',
            'total_amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
        ]);

        $profile = HealthProfile::find($data['health_profile_id']);
        if (!$profile) {
            return response()->json(['message' => 'Perfil no encontrado'], 404);
        }
        if ($profile->user_id === $user->id) {
            return response()->json(['message' => 'No puede reservarse a si mismo'], 422);
        }

        $startAt = Carbon::parse($data['start_at']);
        $endAt = isset($data['end_at'])
            ? Carbon::parse($data['end_at'])
            : (clone $startAt)->addMinutes(60);

        $booking = Booking::create([
            'health_profile_id' => $data['health_profile_id'],
            'user_id' => $user->id,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'status' => 'requested',
            'otp_code' => str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT),
            'total_amount' => $data['total_amount'] ?? 0,
            'currency' => $data['currency'] ?? 'CLP',
        ]);

        return response()->json($booking, 201);
    }

    public function update(Request $request, Booking $booking)
    {
        $user = $request->user();
        if (!$this->canAccessBooking($user, $booking)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'status' => 'nullable|string',
        ]);

        $booking->update($data);

        return response()->json($booking);
    }

    public function confirmOtp(Request $request, Booking $booking)
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$this->isProvider($user, $booking)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'otp_code' => 'required|string|max:10',
        ]);

        if ($booking->otp_code !== $data['otp_code']) {
            return response()->json(['message' => 'OTP invalido'], 422);
        }

        $booking->update([
            'status' => 'in_service',
            'otp_confirmed_at' => now(),
        ]);

        return response()->json($booking);
    }

    private function canAccessBooking($user, Booking $booking): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($booking->user_id === $user->id) {
            return true;
        }

        return $this->isProvider($user, $booking);
    }

    private function canSeeOtp($user, Booking $booking): bool
    {
        return $user->isAdmin() || $booking->user_id === $user->id;
    }

    private function isProvider($user, Booking $booking): bool
    {
        if (!$user->hasRole('health')) {
            return false;
        }

        return HealthProfile::query()
            ->where('id', $booking->health_profile_id)
            ->where('user_id', $user->id)
            ->exists();
    }
}
