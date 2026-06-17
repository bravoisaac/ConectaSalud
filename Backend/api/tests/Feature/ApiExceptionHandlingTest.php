<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiExceptionHandlingTest extends TestCase
{
    public function test_protected_api_routes_return_json_when_unauthenticated(): void
    {
        $response = $this->get('/api/me');

        $response
            ->assertStatus(401)
            ->assertJson([
                'message' => 'No autenticado.',
            ]);
    }

    public function test_api_validation_errors_keep_errors_bag(): void
    {
        $response = $this->post('/api/register');

        $response
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Los datos enviados no son validos.',
            ])
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_missing_api_routes_return_json_not_found(): void
    {
        $response = $this->get('/api/no-existe');

        $response
            ->assertStatus(404)
            ->assertJson([
                'message' => 'Recurso no encontrado.',
            ]);
    }

    public function test_wrong_api_method_returns_json_method_not_allowed(): void
    {
        $response = $this->get('/api/login');

        $response
            ->assertStatus(405)
            ->assertJson([
                'message' => 'Metodo no permitido.',
            ]);
    }
}
