<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'full_name',
        'email',
        'phone',
        'profession',
        'summary',
        'experience',
        'skills',
        'education',
        'cv_path',
        'cv_filename',
        'cv_mime',
    ];
}
