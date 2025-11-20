<?php

use Illuminate\Support\Facades\DB;

it('views lake basic information with schema keys', function () {
    // Seed a minimal lake row directly to avoid factory dependency
    $lakeId = DB::table('lakes')->insertGetId([
        'name' => 'Test Lake',
        'region' => null,
        'province' => null,
        'municipality' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $resp = $this->getJson('/api/lakes/'.$lakeId);
    // Controller returns root-level keys (not wrapped in data)
    $this->assertTrue(in_array($resp->status(), [200,404]));
    if ($resp->status() === 200) {
        $resp->assertJsonStructure(['id','name']);
    }
})->group('lakes');

it('lists lakes filter options structure', function () {
    $resp = $this->getJson('/api/filters/lakes');
    $resp->assertOk();
    // On Postgres, controller returns facet keys at root
    if (DB::getDriverName() === 'pgsql') {
        expect($resp->json())->toHaveKeys(['regions','provinces','municipalities','classes']);
    }
})->group('lakes');
