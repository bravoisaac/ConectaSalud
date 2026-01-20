<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\HealthProfile;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function authorizePayment(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'booking_id' => 'nullable|exists:bookings,id',
            'provider_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'payment_provider' => 'nullable|string|max:50',
            'provider_reference' => 'nullable|string|max:100',
        ]);

        $booking = null;
        if (!empty($data['booking_id'])) {
            $booking = Booking::find($data['booking_id']);
            if (!$booking) {
                return response()->json(['message' => 'Reserva no encontrada'], 404);
            }
            if (!$user->isAdmin() && $booking->user_id !== $user->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }

            $providerId = HealthProfile::query()
                ->where('id', $booking->health_profile_id)
                ->value('user_id');

            if (!$providerId) {
                return response()->json(['message' => 'Proveedor no encontrado'], 422);
            }
            if ((int) $providerId !== (int) $data['provider_id']) {
                return response()->json(['message' => 'Proveedor no coincide'], 422);
            }
        }

        $payment = Payment::create([
            'booking_id' => $data['booking_id'] ?? null,
            'payer_id' => $user->id,
            'provider_id' => $data['provider_id'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'CLP',
            'status' => 'authorized',
            'platform_fee_percent' => 10,
            'payment_provider' => $data['payment_provider'] ?? null,
            'provider_reference' => $data['provider_reference'] ?? null,
        ]);

        return response()->json($payment, 201);
    }

    public function capturePayment(Request $request, Payment $payment)
    {
        $user = $request->user();
        if (!$user->isAdmin() && $payment->provider_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($payment->booking_id) {
            $booking = Booking::find($payment->booking_id);
            if ($booking && !in_array($booking->status, ['in_service', 'completed'], true)) {
                return response()->json(['message' => 'Estado de reserva invalido'], 422);
            }
        }

        $payment->update(['status' => 'captured']);

        return response()->json($payment);
    }
}
