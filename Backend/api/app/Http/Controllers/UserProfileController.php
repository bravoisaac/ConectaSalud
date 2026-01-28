<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = UserProfile::query()
            ->where('user_id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(null);
        }

        return response()->json($this->withCvUrl($profile));
    }

    public function upsert(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'full_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:30',
            'profession' => 'nullable|string|max:255',
            'summary' => 'nullable|string',
            'experience' => 'nullable|string',
            'skills' => 'nullable|string',
            'education' => 'nullable|string',
            'cv_file' => 'nullable|file|mimes:pdf|max:5120',
        ]);

        $profile = UserProfile::query()
            ->where('user_id', $user->id)
            ->first();

        if (!$profile) {
            $profile = new UserProfile();
            $profile->user_id = $user->id;
        }

        $profile->fill([
            'full_name' => $data['full_name'] ?? $profile->full_name,
            'email' => $data['email'] ?? $profile->email,
            'phone' => $data['phone'] ?? $profile->phone,
            'profession' => $data['profession'] ?? $profile->profession,
            'summary' => $data['summary'] ?? $profile->summary,
            'experience' => $data['experience'] ?? $profile->experience,
            'skills' => $data['skills'] ?? $profile->skills,
            'education' => $data['education'] ?? $profile->education,
        ]);

        if ($request->hasFile('cv_file')) {
            $file = $request->file('cv_file');
            $path = $file->store('cvs', 'public');
            $profile->cv_path = $path;
            $profile->cv_filename = $file->getClientOriginalName();
            $profile->cv_mime = $file->getClientMimeType();
        }

        $profile->save();

        return response()->json($this->withCvUrl($profile));
    }

    private function withCvUrl(UserProfile $profile): array
    {
        $data = $profile->toArray();
        $data['cv_url'] = $profile->cv_path ? Storage::disk('public')->url($profile->cv_path) : null;

        return $data;
    }
}
