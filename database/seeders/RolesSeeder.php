<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $rows = [
            ['name' => 'public', 'scope' => 'system'],
            ['name' => 'contributor', 'scope' => 'tenant'],
            ['name' => 'org_admin', 'scope' => 'tenant'],
            ['name' => 'superadmin', 'scope' => 'system'],
        ];
        foreach ($rows as $r) {
            DB::table('roles')->updateOrInsert(['name' => $r['name']], [
                'scope' => $r['scope'],
                'updated_at' => $now,
                'created_at' => $now,
            ]);
        }
    }
}
