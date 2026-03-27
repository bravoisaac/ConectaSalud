<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobPost extends Model
{
    use HasFactory;

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    protected $fillable = [
        'company_id',
        'title',
        'description',
        'location',
        'modality',
        'salary_min',
        'salary_max',
        'status',
        'published_at',
    ];
}
