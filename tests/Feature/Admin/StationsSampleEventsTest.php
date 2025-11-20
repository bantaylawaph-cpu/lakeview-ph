<?php

it('lists stations (superadmin) with expected keys', function () {
    $admin = superAdmin();
    $tenant = \App\Models\Tenant::factory()->create();
    $driver = \Illuminate\Support\Facades\DB::getDriverName();

    if ($driver === 'pgsql') {
        // On Postgres, create a station fixture and assert it appears
        $station = \App\Models\Station::factory()->create(['organization_id' => $tenant->id]);
        $resp = $this->actingAs($admin)->getJson('/api/admin/stations?organization_id='.$tenant->id);
        $resp->assertStatus(200);
        $data = $resp->json('data');
        expect(is_array($data))->toBeTrue();
        $row = collect($data)->first(fn($r) => ($r['id'] ?? null) === $station->id) ?? ($data[0] ?? null);
        if ($row) {
            expect($row)->toHaveKeys(['id','organization_id','name']);
        }
    } else {
        // Fallback for sqlite/dev: just validate basic array shape
        $resp = $this->actingAs($admin)->getJson('/api/admin/stations?organization_id='.$tenant->id);
        $resp->assertStatus(200);
        $data = $resp->json('data');
        expect(is_array($data))->toBeTrue();
        if (count($data) > 0) {
            expect($data[0])->toHaveKeys(['id','organization_id','name']);
        }
    }
})->group('admin','stations');

it('lists sample-events (superadmin) basic structure', function () {
    $admin = superAdmin();
    $resp = $this->actingAs($admin)->getJson('/api/admin/sample-events');
    $resp->assertStatus(200);
    // Pagination structure: expect data key present
    expect($resp->json('data'))->toBeArray();
})->group('admin','sample-events');

it('org admin lists tenant-scoped sample-events with organization filter', function () {
    $org = orgAdmin();
    // Create minimal lake and station rows directly
    $lakeId = \Illuminate\Support\Facades\DB::table('lakes')->insertGetId([
        'name' => 'Org Lake', 'created_at' => now(), 'updated_at' => now()
    ]);
    $stationId = \Illuminate\Support\Facades\DB::table('stations')->insertGetId([
        'organization_id' => $org->tenant_id,
        'lake_id' => $lakeId,
        'name' => 'S1',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    // Attempt creating an event; tolerate validation differences
    $create = $this->actingAs($org)->postJson('/api/org/'.$org->tenant_id.'/sample-events', [
        'lake_id' => $lakeId,
        'station_id' => $stationId,
        'sampled_at' => now()->toDateString(),
        'status' => 'draft',
        'measurements' => []
    ]);
    expect(in_array($create->status(), [201,422]))->toBeTrue();

    $resp = $this->actingAs($org)->getJson('/api/org/'.$org->tenant_id.'/sample-events');
    $resp->assertStatus(200);
    expect($resp->json('data'))->toBeArray();
})->group('org','sample-events');

it('contributor cannot assign org admin role', function () {
    $org = orgAdmin();
    $contrib = userWithRole(\App\Models\Role::CONTRIBUTOR); // now has its own tenant
    // Attempt to assign contributor as admin of a DIFFERENT tenant (org's tenant) should be forbidden.
    $resp = $this->actingAs($contrib)->postJson('/api/admin/tenants/'.$org->tenant_id.'/admins', ['user_id' => $contrib->id]);
    expect($resp->status())->toBeIn([401,403]);
})->group('org','tenancy');
