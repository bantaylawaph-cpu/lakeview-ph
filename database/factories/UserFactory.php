<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            // role_id & tenant_id assigned via states so seeding/tests control scope explicitly
            'role_id' => null,
            'tenant_id' => null,
            'is_active' => true,
        ];
    }

    public function withRole(string $roleName): static
    {
        return $this->afterMaking(function ($user) use ($roleName) {
            $roleId = \App\Models\Role::where('name', $roleName)->value('id');
            $user->role_id = $roleId;
        })->afterCreating(function ($user) use ($roleName) {
            if (!$user->role_id) {
                $roleId = \App\Models\Role::where('name', $roleName)->value('id');
                $user->forceFill(['role_id' => $roleId])->save();
            }
        });
    }

    public function forTenant(\App\Models\Tenant $tenant): static
    {
        return $this->state(fn() => ['tenant_id' => $tenant->id]);
    }

    public function inactive(): static
    {
        return $this->state(fn() => ['is_active' => false]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
