<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed roles & admin first to guarantee role_id availability
        $this->call([
            RolesSeeder::class,
            AdminUserSeeder::class,
            ParameterSeeder::class,
            SampleLogSeeder::class,
        ]);

        if (!User::where('email', 'test@example.com')->exists()) {
            $publicId = \App\Models\Role::where('name','public')->value('id');
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'role_id' => $publicId,
            ]);
        }
    }
}
