<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthAvailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'health_profile_id',
        'day_of_week',
        'start_time',
        'end_time',
        'timezone',
    ];
}
