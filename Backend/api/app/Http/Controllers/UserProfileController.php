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
            'email' => 'nullable|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'address_region' => 'nullable|string|max:120',
            'address_comuna' => 'nullable|string|max:120',
            'address_city' => 'nullable|string|max:120',
            'address_street' => 'nullable|string|max:180',
            'address_number' => 'nullable|string|max:30',
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
            'address' => $data['address'] ?? $profile->address,
            'address_region' => $data['address_region'] ?? $profile->address_region,
            'address_comuna' => $data['address_comuna'] ?? $profile->address_comuna,
            'address_city' => $data['address_city'] ?? $profile->address_city,
            'address_street' => $data['address_street'] ?? $profile->address_street,
            'address_number' => $data['address_number'] ?? $profile->address_number,
            'profession' => $data['profession'] ?? $profile->profession,
            'summary' => $data['summary'] ?? $profile->summary,
            'experience' => $data['experience'] ?? $profile->experience,
            'skills' => $data['skills'] ?? $profile->skills,
            'education' => $data['education'] ?? $profile->education,
        ]);

        // Si vienen los campos de dirección estructurada, construir un address legible.
        if (
            array_key_exists('address_region', $data)
            || array_key_exists('address_comuna', $data)
            || array_key_exists('address_city', $data)
            || array_key_exists('address_street', $data)
            || array_key_exists('address_number', $data)
        ) {
            $parts = [
                trim((string) ($data['address_region'] ?? $profile->address_region ?? '')),
                trim((string) ($data['address_city'] ?? $profile->address_city ?? '')),
                trim((string) ($data['address_comuna'] ?? $profile->address_comuna ?? '')),
            ];
            $street = trim((string) ($data['address_street'] ?? $profile->address_street ?? ''));
            $number = trim((string) ($data['address_number'] ?? $profile->address_number ?? ''));
            $streetLine = trim($street . ' ' . $number);
            if ($streetLine) {
                $parts[] = $streetLine;
            }
            $address = implode(', ', array_values(array_filter($parts)));
            $profile->address = $address ?: ($profile->address ?? null);
        }

        if ($request->hasFile('cv_file')) {
            $file = $request->file('cv_file');
            $path = $file->store('cvs', 'public');
            $profile->cv_path = $path;
            $profile->cv_filename = $file->getClientOriginalName();
            $profile->cv_mime = $file->getClientMimeType();
        }

        $profile->save();

        // Mantener sincronizados los datos personales básicos con el usuario autenticado,
        // para que se reflejen en módulos que leen desde la tabla users (reservas, etc.).
        if (array_key_exists('full_name', $data) && $data['full_name'] !== null) {
            $user->name = $data['full_name'];
        }
        if (array_key_exists('email', $data) && $data['email'] !== null) {
            $user->email = $data['email'];
        }
        if (array_key_exists('phone', $data) && $data['phone'] !== null) {
            $user->phone = $data['phone'];
        }
        if ($user->isDirty()) {
            $user->save();
        }

        return response()->json($this->withCvUrl($profile));
    }

    private function withCvUrl(UserProfile $profile): array
    {
        $data = $profile->toArray();
        $data['cv_url'] = $profile->cv_path ? Storage::disk('public')->url($profile->cv_path) : null;

        return $data;
    }
}
