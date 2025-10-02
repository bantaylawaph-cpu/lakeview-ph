<?php
return [
    'enabled' => env('AUDIT_ENABLED', true),
    'capture_ip' => true,
    'capture_user_agent' => false,
    'max_column_length' => 15000,
    'global_exclude' => [
        'password','remember_token','created_at','updated_at','deleted_at'
    ],
    'models' => [
        App\Models\User::class => [
            'exclude' => ['password','remember_token']
        ],
        App\Models\Tenant::class => [],
        App\Models\Lake::class => [],
        App\Models\Layer::class => [],
        App\Models\Station::class => [],
        App\Models\SamplingEvent::class => [],
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