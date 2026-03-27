<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class UserProfile extends Model
{
    use HasFactory;

    protected $appends = ['cv_url'];

    protected $fillable = [
        'user_id',
        'full_name',
        'email',
        'phone',
        'address',
        'address_region',
        'address_comuna',
        'address_city',
        'address_street',
        'address_number',
        'profession',
        'summary',
        'experience',
        'skills',
        'education',
        'cv_path',
        'cv_filename',
        'cv_mime',
    ];

    public function getCvUrlAttribute(): ?string
    {
        if (!$this->cv_path) {
            return null;
        }
        return Storage::disk('public')->url($this->cv_path);
    }
}
