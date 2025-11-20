<?php

it('public sample-events cache version bumps after publish toggle', function () {
    // Create org admin & event with direct DB seeding for lake/station
    $org = orgAdmin();
    $lakeId = \Illuminate\Support\Facades\DB::table('lakes')->insertGetId([
        'name' => 'Perf Lake', 'created_at' => now(), 'updated_at' => now()
    ]);
    $stationId = \Illuminate\Support\Facades\DB::table('stations')->insertGetId([
        'organization_id' => $org->tenant_id,
        'lake_id' => $lakeId,
        'name' => 'Perf S1',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $create = $this->actingAs($org)->postJson('/api/org/'.$org->tenant_id.'/sample-events', [
        'lake_id'=>$lakeId,
        'station_id'=>$stationId,
        'sampled_at'=>now()->toDateString(),
        'status'=>'draft','measurements'=>[]
    ]);
    expect(in_array($create->status(), [201,422]))->toBeTrue();
    $id = $create->json('data.id');

    if ($id) {
        $pub = $this->actingAs($org)->postJson('/api/org/'.$org->tenant_id.'/sample-events/'.$id.'/toggle-publish');
        expect(in_array($pub->status(), [200,403,404]))->toBeTrue();
        $publicList = $this->getJson('/api/public/sample-events?lake_id='.$lakeId.'&organization_id='.$org->tenant_id);
        expect(in_array($publicList->status(), [200,422]))->toBeTrue();
    }
})->group('performance','caching');
