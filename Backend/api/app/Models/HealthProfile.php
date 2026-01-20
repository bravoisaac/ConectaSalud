<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'specialty',
        'experience_years',
        'rate_hour',
        'bio',
        'verification_status',
    ];
}
