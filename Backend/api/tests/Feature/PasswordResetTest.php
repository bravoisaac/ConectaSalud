<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_returns_generic_message_and_sends_notification(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'persona@example.com',
        ]);

        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Si el correo existe, enviaremos instrucciones para recuperar la cuenta.',
            ]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_forgot_password_does_not_reveal_unknown_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'no-existe@example.com',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Si el correo existe, enviaremos instrucciones para recuperar la cuenta.',
            ]);

        Notification::assertNothingSent();
    }

    public function test_reset_password_updates_password_and_revokes_existing_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => 'OldPass123',
        ]);
        $user->createToken('mobile');
        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Contrasena actualizada. Inicia sesion nuevamente.',
            ]);

        $user->refresh();

        $this->assertTrue(Hash::check('NewPass123', $user->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'invalid-token@example.com',
        ]);

        $response = $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => 'token-invalido',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
