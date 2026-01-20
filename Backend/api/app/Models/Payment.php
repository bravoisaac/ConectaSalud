<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'payer_id',
        'provider_id',
        'amount',
        'currency',
        'status',
        'platform_fee_percent',
        'provider_payout_amount',
        'payment_provider',
        'provider_reference',
    ];
}
