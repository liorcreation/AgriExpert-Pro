<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_is_public(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_user_can_register_and_create_a_question(): void
    {
        $register = $this->postJson('/api/v1/auth/register', [
            'name' => 'Awa Kaboré',
            'email' => 'awa@example.test',
            'password' => 'AgriTest1234',
            'password_confirmation' => 'AgriTest1234',
            'role' => 'producer',
            'profile' => 'farmer',
            'plan' => 'free',
        ])->assertCreated();

        $register->assertJsonPath('data.user.role', 'producer');
        $this->assertNotEmpty($register->json('data.token'));

        $user = User::where('email', 'awa@example.test')->firstOrFail();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/questions', [
            'category' => 'agriculture',
            'title' => 'Mes feuilles jaunissent',
            'body' => 'Les feuilles du bas jaunissent après la pluie.',
            'language' => 'fr',
        ])->assertCreated()->assertJsonPath('data.title', 'Mes feuilles jaunissent');

        $this->getJson('/api/v1/questions')
            ->assertOk()
            ->assertJsonPath('total', 1);
    }

    public function test_invalid_login_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'unknown@example.test',
            'method' => 'email',
            'password' => 'WrongPassword123',
        ])->assertStatus(422);
    }
}
