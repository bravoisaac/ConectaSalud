<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\HealthAvailability;
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

        $bookings = $query
            ->with([
                'user:id,name,email,phone',
                'healthProfile:id,user_id,specialty,location',
                'healthProfile.user:id,name,email,phone',
            ])
            ->latest()
            ->paginate(20);
        $bookings->getCollection()->transform(function ($booking) use ($user) {
            if (!$this->canSeeOtp($user, $booking)) {
                $booking->otp_code = null;
            }
            if ($this->isProvider($user, $booking) && !in_array($booking->status, ['accepted', 'in_service', 'completed'], true)) {
                $booking->service_address = null;
                $booking->service_region = null;
                $booking->service_comuna = null;
                $booking->service_city = null;
                $booking->service_street = null;
                $booking->service_number = null;
                $booking->service_lat = null;
                $booking->service_lng = null;
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

        $booking->loadMissing([
            'user:id,name,email,phone',
            'healthProfile:id,user_id,specialty,location',
            'healthProfile.user:id,name,email,phone',
        ]);
        if ($this->isProvider($user, $booking) && !in_array($booking->status, ['accepted', 'in_service', 'completed'], true)) {
            $booking->service_address = null;
            $booking->service_region = null;
            $booking->service_comuna = null;
            $booking->service_city = null;
            $booking->service_street = null;
            $booking->service_number = null;
            $booking->service_lat = null;
            $booking->service_lng = null;
        }

        return response()->json($booking);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'health_profile_id' => 'required|exists:health_profiles,id',
            'start_at' => 'required|date',
            'end_at' => 'nullable|date|after:start_at',
            'total_amount' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'service_address' => 'nullable|string|max:500',
            'service_region' => 'nullable|string|max:120',
            'service_comuna' => 'nullable|string|max:120',
            'service_city' => 'nullable|string|max:120',
            'service_street' => 'nullable|string|max:180',
            'service_number' => 'nullable|string|max:30',
            'service_lat' => 'nullable|numeric|between:-90,90',
            'service_lng' => 'nullable|numeric|between:-180,180',
        ]);

        $serviceAddress = trim((string) ($data['service_address'] ?? ''));
        $serviceRegion = trim((string) ($data['service_region'] ?? ''));
        $serviceComuna = trim((string) ($data['service_comuna'] ?? ''));
        $serviceCity = trim((string) ($data['service_city'] ?? ''));
        $serviceStreet = trim((string) ($data['service_street'] ?? ''));
        $serviceNumber = trim((string) ($data['service_number'] ?? ''));

        if (!$serviceAddress) {
            $missing = [];
            if (!$serviceRegion) $missing[] = 'region';
            if (!$serviceComuna) $missing[] = 'comuna';
            if (!$serviceCity) $missing[] = 'ciudad';
            if (!$serviceStreet) $missing[] = 'calle';
            if (!$serviceNumber) $missing[] = 'numero';
            if (count($missing)) {
                return response()->json(['message' => 'Falta dirección: ' . implode(', ', $missing)], 422);
            }
            $serviceAddress = implode(', ', [
                $serviceRegion,
                $serviceCity,
                $serviceComuna,
                trim($serviceStreet . ' ' . $serviceNumber),
            ]);
        }

        $profile = HealthProfile::find($data['health_profile_id']);
        if (!$profile) {
            return response()->json(['message' => 'Perfil no encontrado'], 404);
        }
        if ($profile->user_id === $user->id) {
            return response()->json(['message' => 'No puede reservarse a si mismo'], 422);
        }
        if (!$user->isAdmin() && strtolower((string) $profile->verification_status) !== 'approved') {
            return response()->json(['message' => 'El profesional aun no esta verificado'], 422);
        }

        $startAt = Carbon::parse($data['start_at']);
        $endAt = isset($data['end_at'])
            ? Carbon::parse($data['end_at'])
            : (clone $startAt)->addMinutes(60);
        if ($endAt->lessThanOrEqualTo($startAt)) {
            return response()->json(['message' => 'La hora de fin debe ser mayor'], 422);
        }
        if (!$startAt->isSameDay($endAt)) {
            return response()->json(['message' => 'La reserva debe ser el mismo dia'], 422);
        }

        $availabilityError = $this->validateAvailability($profile->id, $startAt, $endAt);
        if ($availabilityError) {
            return response()->json(['message' => $availabilityError], 422);
        }

        $booking = Booking::create([
            'health_profile_id' => $data['health_profile_id'],
            'user_id' => $user->id,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'status' => 'requested',
            'otp_code' => str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT),
            'total_amount' => $data['total_amount'] ?? 0,
            'currency' => $data['currency'] ?? 'CLP',
            'service_address' => $serviceAddress ?: null,
            'service_region' => $serviceRegion ?: null,
            'service_comuna' => $serviceComuna ?: null,
            'service_city' => $serviceCity ?: null,
            'service_street' => $serviceStreet ?: null,
            'service_number' => $serviceNumber ?: null,
            'service_lat' => $data['service_lat'] ?? null,
            'service_lng' => $data['service_lng'] ?? null,
        ]);

        $booking->loadMissing([
            'user:id,name,email,phone',
            'healthProfile:id,user_id,specialty,location',
            'healthProfile.user:id,name,email,phone',
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
            'status' => 'nullable|string|in:requested,accepted,in_service,completed,cancelled',
        ]);

        if (isset($data['status'])) {
            $transitionError = $this->validateStatusTransition($user, $booking, $data['status']);
            if ($transitionError) {
                return response()->json(['message' => $transitionError], 422);
            }
        }

        $booking->update($data);

        if (($data['status'] ?? null) === 'accepted') {
            $this->ensureBookingChat($booking);
        }

        $booking->loadMissing([
            'user:id,name,email,phone',
            'healthProfile:id,user_id,specialty,location',
            'healthProfile.user:id,name,email,phone',
        ]);

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
        if ($booking->status !== 'accepted') {
            return response()->json(['message' => 'La reserva debe estar aceptada para iniciar el servicio'], 422);
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

    private function validateStatusTransition($user, Booking $booking, string $nextStatus): ?string
    {
        $currentStatus = strtolower((string) $booking->status);
        $nextStatus = strtolower($nextStatus);

        if ($currentStatus === $nextStatus) {
            return null;
        }

        if ($user->isAdmin()) {
            return null;
        }

        if ($booking->user_id === $user->id) {
            if ($currentStatus === 'requested' && $nextStatus === 'cancelled') {
                return null;
            }

            return 'El cliente solo puede cancelar reservas en espera';
        }

        if ($this->isProvider($user, $booking)) {
            if ($currentStatus === 'requested' && in_array($nextStatus, ['accepted', 'cancelled'], true)) {
                return null;
            }
            if ($currentStatus === 'in_service' && $nextStatus === 'completed') {
                return null;
            }

            return 'Transicion de reserva no permitida para el profesional';
        }

        return 'No autorizado';
    }

    private function validateAvailability(int $profileId, Carbon $startAt, Carbon $endAt): ?string
    {
        $dayOfWeek = $startAt->dayOfWeek;
        $startMinutes = $this->timeToMinutes($startAt->format('H:i'));
        $endMinutes = $this->timeToMinutes($endAt->format('H:i'));

        $fitsAvailability = HealthAvailability::query()
            ->where('health_profile_id', $profileId)
            ->where('day_of_week', $dayOfWeek)
            ->get()
            ->contains(function (HealthAvailability $availability) use ($startMinutes, $endMinutes) {
                $slotStart = $this->timeToMinutes((string) $availability->start_time);
                $slotEnd = $this->timeToMinutes((string) $availability->end_time);

                return $startMinutes >= $slotStart && $endMinutes <= $slotEnd;
            });

        if (!$fitsAvailability) {
            return 'No hay disponibilidad para ese horario';
        }

        $hasOverlap = Booking::query()
            ->where('health_profile_id', $profileId)
            ->whereIn('status', ['requested', 'accepted', 'in_service'])
            ->where('start_at', '<', $endAt)
            ->where('end_at', '>', $startAt)
            ->exists();

        if ($hasOverlap) {
            return 'El profesional ya tiene una reserva en ese horario';
        }

        return null;
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        $hours = (int) ($parts[0] ?? 0);
        $minutes = (int) ($parts[1] ?? 0);

        return ($hours * 60) + $minutes;
    }

    private function ensureBookingChat(Booking $booking): ?Chat
    {
        $providerId = HealthProfile::query()
            ->where('id', $booking->health_profile_id)
            ->value('user_id');

        if (!$providerId || (int) $providerId === (int) $booking->user_id) {
            return null;
        }

        $participantIds = [(int) $booking->user_id, (int) $providerId];
        sort($participantIds);

        $candidateChatIds = ChatParticipant::query()
            ->whereIn('user_id', $participantIds)
            ->select('chat_id')
            ->groupBy('chat_id')
            ->havingRaw('COUNT(DISTINCT user_id) = ?', [2])
            ->pluck('chat_id');

        foreach ($candidateChatIds as $candidateChatId) {
            $count = ChatParticipant::query()
                ->where('chat_id', $candidateChatId)
                ->count();

            if ($count === 2) {
                return Chat::find($candidateChatId);
            }
        }

        $chat = Chat::create();

        foreach ($participantIds as $participantId) {
            ChatParticipant::create([
                'chat_id' => $chat->id,
                'user_id' => $participantId,
            ]);
        }

        return $chat;
    }
}
