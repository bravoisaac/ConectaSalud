<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'health_profile_id',
        'user_id',
        'start_at',
        'end_at',
        'status',
        'otp_code',
        'otp_confirmed_at',
        'tolerance_minutes',
        'duration_minutes',
        'cancellation_window_hours',
        'cancellation_fee_percent',
        'penalty_percent',
        'total_amount',
        'currency',
        'service_address',
        'service_region',
        'service_comuna',
        'service_city',
        'service_street',
        'service_number',
        'service_lat',
        'service_lng',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function healthProfile()
    {
        return $this->belongsTo(HealthProfile::class);
    }
}
