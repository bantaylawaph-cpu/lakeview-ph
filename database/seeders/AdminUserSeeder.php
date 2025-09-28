<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure roles exist (in case RolesSeeder not yet run in this environment)
        $roles = [
            ['name' => 'public', 'scope' => 'system'],
            ['name' => 'contributor', 'scope' => 'tenant'],
            ['name' => 'org_admin', 'scope' => 'tenant'],
            ['name' => 'superadmin', 'scope' => 'system'],
        ];
        foreach ($roles as $r) {
            Role::query()->updateOrCreate(['name' => $r['name']], ['scope' => $r['scope']]);
        }

        $superId = Role::where('name', 'superadmin')->value('id');

        User::query()->firstOrCreate(
            ['email' => 'admin@lakeview.ph'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('ChangeMe123!'),
                'role_id' => $superId,
                'tenant_id' => null,
                'is_active' => true,
            ]
        );
    }
}
