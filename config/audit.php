<?php
return [
    'enabled' => env('AUDIT_ENABLED', true),
    'capture_ip' => true,
    'capture_user_agent' => false,
    'max_column_length' => 15000,
    // Identity fields: always include these (if present) in before/after snapshots for update events
    // even if they were not part of the dirty attributes, so UI summaries can display meaningful names.
    'identity_fields' => [
        'name','title','label','lake_name','full_name','first_name','last_name','tenant_name','code','slug'
    ],
    'global_exclude' => [
        'password','remember_token','created_at','updated_at','deleted_at'
    ],
    'models' => [
        App\Models\User::class => [
            'exclude' => ['password','remember_token']
        ],
        App\Models\Tenant::class => [
            'identity' => ['name']
        ],
        App\Models\Lake::class => [
            'identity' => ['name','alt_name']
        ],
        App\Models\Layer::class => [],
        App\Models\LakeFlow::class => [
            // include natural identifiers to help UI/entity_name resolution
            'identity' => ['name','alt_name','lake_id']
        ],
        App\Models\Station::class => [],
        App\Models\SamplingEvent::class => [
            // include lake_id in update snapshots so UI/backend can resolve lake name even if lake_id wasn't dirty
            'identity' => ['lake_id']
        ],
        App\Models\SampleResult::class => [],
        App\Models\Parameter::class => [],
        App\Models\ParameterThreshold::class => [],
        App\Models\WqStandard::class => [],
        App\Models\Watershed::class => [],
        App\Models\Feedback::class => [],
    ],
    'prune' => [
        'enabled' => true,
        'days' => env('AUDIT_PRUNE_DAYS', 365),
        'keep_actions' => ['deleted','force_deleted']
    ],
];