<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => $this->passwordRules(),
            'role' => 'nullable|in:user,health,company',
            'locale' => 'nullable|string|in:es,en',
            'phone' => 'nullable|string|max:30',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'] ?? 'user',
            'locale' => $data['locale'] ?? 'es',
            'phone' => $data['phone'] ?? null,
            'status' => 'active',
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado',
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no son validas.'],
            ]);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login correcto',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
        ]);

        $status = Password::sendResetLink([
            'email' => $data['email'],
        ]);

        if ($status === Password::RESET_THROTTLED) {
            throw ValidationException::withMessages([
                'email' => ['Espera antes de solicitar otro enlace de recuperacion.'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Si el correo existe, enviaremos instrucciones para recuperar la cuenta.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $passwordRules = $this->passwordRules();
        $passwordRules[] = 'confirmed';

        $data = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => $passwordRules,
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();

            $user->tokens()->delete();

            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['El enlace de recuperacion no es valido o expiro.'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Contrasena actualizada. Inicia sesion nuevamente.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout',
        ]);
    }

    private function passwordRules(): array
    {
        return [
            'required',
            'string',
            PasswordRule::min(8)->letters()->numbers(),
        ];
    }
}
