<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32', 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'role' => ['required', 'in:producer,expert,institution'],
            'profile' => ['nullable', 'string', 'max:80'],
            'plan' => ['nullable', 'in:free,pro,institution'],
        ]);

        $role = $validated['role'];
        $plan = $role === 'institution' ? 'institution' : ($validated['plan'] ?? 'free');

        $user = User::create([
            ...$validated,
            'role' => $role,
            'plan' => $plan,
            'password' => $validated['password'],
        ]);

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
                'token' => $user->createToken('web')->plainTextToken,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:190'],
            'method' => ['nullable', 'in:email,phone'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->when(($validated['method'] ?? 'email') === 'phone', fn ($query) => $query->where('phone', $validated['identifier']))
            ->when(($validated['method'] ?? 'email') !== 'phone', fn ($query) => $query->where('email', $validated['identifier']))
            ->first();
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
                'token' => $user->createToken('web')->plainTextToken,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => ['user' => $this->userPayload($request->user())]]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Session fermée.']);
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        return $user->only(['id', 'name', 'email', 'phone', 'role', 'profile', 'plan', 'email_verified_at']);
    }
}
