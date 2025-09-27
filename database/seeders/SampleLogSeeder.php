<?php

namespace Database\Seeders;

use App\Models\Lake;
use App\Models\Parameter;
use App\Models\ParameterThreshold;
use App\Models\SampleResult;
use App\Models\SamplingEvent;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\WqStandard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SampleLogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Tenants table has no 'email' column; use slug as stable unique key
            $tenant = Tenant::firstOrCreate(
                ['slug' => 'lakeview-qa'],
                [
                    'name' => 'LakeView QA Cooperative',
                    'type' => 'Government',
                    'phone' => '555-0100',
                    'address' => '123 QA Avenue, Makati City',
                    'active' => true,
                    'contact_email' => 'qa@lakeview.local',
                ]
            );

            $standard = WqStandard::query()
                ->orderByDesc('is_current')
                ->orderByDesc('priority')
                ->first();

            $parameters = Parameter::query()
                ->whereIn('code', ['DO', 'BOD', 'pH', 'NO3-N'])
                ->get()
                ->keyBy('code');

            if ($parameters->isEmpty()) {
                return;
            }

            $lakeTemplates = [
                [
                    'name' => 'Lake Mahusay',
                    'alt_name' => 'Mahusay Reservoir',
                    'region' => 'Region IV-A',
                    'province' => 'Laguna',
                    'municipality' => 'Bay',
                    'surface_area_km2' => 4.2,
                    'elevation_m' => 110,
                    'mean_depth_m' => 6.5,
                    'class_code' => 'C',
                    'stations' => [
                        [
                            'name' => 'Lake Mahusay - North Inlet',
                            'description' => 'Near barangay access road',
                            'events' => [
                                [
                                    'sampled_at' => '2025-02-10 07:30:00',
                                    'status' => 'verified',
                                    'sampler_name' => 'DENR Field Team',
                                    'method' => 'Grab sample',
                                    'weather' => 'Clear',
                                    'notes' => 'Calm surface after overnight rain.',
                                    'measurements' => [
                                        'DO' => 6.1,
                                        'BOD' => 5.4,
                                        'pH' => 7.4,
                                        'NO3-N' => 8.2,
                                    ],
                                ],
                                [
                                    'sampled_at' => '2025-03-24 09:00:00',
                                    'status' => 'submitted',
                                    'sampler_name' => 'DENR Field Team',
                                    'method' => 'Integrated sample',
                                    'weather' => 'Overcast',
                                    'notes' => 'Light breeze from the south.',
                                    'measurements' => [
                                        'DO' => 4.6,
                                        'BOD' => 8.5,
                                        'pH' => 7.1,
                                        'NO3-N' => 11.3,
                                    ],
                                ],
                            ],
                        ],
                        [
                            'name' => 'Lake Mahusay - Midlake',
                            'description' => 'Deep basin transect',
                            'events' => [
                                [
                                    'sampled_at' => '2025-04-12 06:45:00',
                                    'status' => 'verified',
                                    'sampler_name' => 'LakeView QA Crew',
                                    'method' => 'Grab sample',
                                    'weather' => 'Windy',
                                    'notes' => 'Slight chop, anchored vessel.',
                                    'measurements' => [
                                        'DO' => 5.4,
                                        'BOD' => 6.2,
                                        'pH' => 7.6,
                                        'NO3-N' => 9.4,
                                    ],
                                ],
                                [
                                    'sampled_at' => '2025-05-18 08:20:00',
                                    'status' => 'draft',
                                    'sampler_name' => 'LakeView QA Crew',
                                    'method' => 'Composite sample',
                                    'weather' => 'Clear',
                                    'notes' => 'Early morning composite.',
                                    'measurements' => [
                                        'DO' => 5.9,
                                        'BOD' => 6.8,
                                        'pH' => 7.8,
                                        'NO3-N' => 8.9,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'name' => 'Lake Bantay Tubig',
                    'alt_name' => 'Bantay Basin',
                    'region' => 'Region III',
                    'province' => 'Bulacan',
                    'municipality' => 'San Rafael',
                    'surface_area_km2' => 1.8,
                    'elevation_m' => 72,
                    'mean_depth_m' => 4.9,
                    'class_code' => 'C',
                    'stations' => [
                        [
                            'name' => 'Bantay Tubig - Spillway',
                            'description' => 'Close to spillway control gate',
                            'events' => [
                                [
                                    'sampled_at' => '2025-01-28 07:10:00',
                                    'status' => 'verified',
                                    'sampler_name' => 'Provincial QA Team',
                                    'method' => 'Grab sample',
                                    'weather' => 'Foggy',
                                    'notes' => 'Low visibility, calm water.',
                                    'measurements' => [
                                        'DO' => 6.7,
                                        'BOD' => 5.1,
                                        'pH' => 7.2,
                                        'NO3-N' => 8.0,
                                    ],
                                ],
                                [
                                    'sampled_at' => '2025-03-03 10:05:00',
                                    'status' => 'submitted',
                                    'sampler_name' => 'Provincial QA Team',
                                    'method' => 'Grab sample',
                                    'weather' => 'Sunny',
                                    'notes' => 'Water level slightly lower than usual.',
                                    'measurements' => [
                                        'DO' => 4.9,
                                        'BOD' => 7.8,
                                        'pH' => 7.0,
                                        'NO3-N' => 10.8,
                                    ],
                                ],
                            ],
                        ],
                        [
                            'name' => 'Bantay Tubig - Recreation Cove',
                            'description' => 'Popular swimming area',
                            'events' => [
                                [
                                    'sampled_at' => '2025-04-05 09:45:00',
                                    'status' => 'submitted',
                                    'sampler_name' => 'Community Monitors',
                                    'method' => 'Grab sample',
                                    'weather' => 'Cloudy',
                                    'notes' => 'Weekend recreational activity observed.',
                                    'measurements' => [
                                        'DO' => 5.6,
                                        'BOD' => 6.0,
                                        'pH' => 7.5,
                                        'NO3-N' => 9.7,
                                    ],
                                ],
                                [
                                    'sampled_at' => '2025-05-16 07:55:00',
                                    'status' => 'draft',
                                    'sampler_name' => 'Community Monitors',
                                    'method' => 'Integrated sample',
                                    'weather' => 'Rain showers',
                                    'notes' => 'Collected during light rain.',
                                    'measurements' => [
                                        'DO' => 5.2,
                                        'BOD' => 7.4,
                                        'pH' => 7.9,
                                        'NO3-N' => 9.3,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ];

            foreach ($lakeTemplates as $lakeData) {
                $lake = Lake::updateOrCreate(
                    ['name' => $lakeData['name']],
                    Arr::only($lakeData, [
                        'alt_name',
                        'region',
                        'province',
                        'municipality',
                        'surface_area_km2',
                        'elevation_m',
                        'mean_depth_m',
                        'class_code',
                    ])
                );

                foreach ($lakeData['stations'] as $stationData) {
                    $stationAttributes = Station::factory()
                        ->for($tenant, 'organization')
                        ->for($lake)
                        ->state([
                            'organization_id' => $tenant->id,
                            'lake_id' => $lake->id,
                            'name' => $stationData['name'],
                            'description' => $stationData['description'] ?? null,
                            'is_active' => true,
                        ])
                        ->raw();
                    $station = Station::updateOrCreate(
                        [
                            'organization_id' => $tenant->id,
                            'lake_id' => $lake->id,
                            'name' => $stationData['name'],
                        ],
                    $stationAttributes
                    );

                    foreach ($stationData['events'] as $eventData) {
                        $sampledAt = Carbon::parse($eventData['sampled_at'], 'UTC');

                        $eventAttributes = SamplingEvent::factory()
                            ->for($tenant, 'organization')
                            ->for($lake)
                            ->for($station)
                            ->state([
                                'sampled_at' => $sampledAt,
                                'status' => $eventData['status'],
                                'sampler_name' => $eventData['sampler_name'],
                                'method' => $eventData['method'],
                                'weather' => $eventData['weather'],
                                'notes' => $eventData['notes'] ?? null,
                                'applied_standard_id' => $standard?->id,
                            ])
                            ->raw();

                        $event = SamplingEvent::updateOrCreate(
                            [
                                'organization_id' => $tenant->id,
                                'lake_id' => $lake->id,
                                'station_id' => $station->id,
                                'sampled_at' => $sampledAt,
                            ],
                            $eventAttributes
                        );

                        foreach ($eventData['measurements'] as $code => $value) {
                            $parameter = $parameters->get($code);
                            if (!$parameter) {
                                continue;
                            }

                            $threshold = ParameterThreshold::query()
                                ->where('parameter_id', $parameter->id)
                                ->where('class_code', $lake->class_code)
                                ->when($standard, fn ($query) => $query->where('standard_id', $standard->id))
                                ->first();

                            if (!$threshold && $standard) {
                                $threshold = ParameterThreshold::query()
                                    ->where('parameter_id', $parameter->id)
                                    ->where('class_code', $lake->class_code)
                                    ->whereNull('standard_id')
                                    ->first();
                            }

                            $evaluation = $this->evaluateMeasurement($parameter->evaluation_type, $threshold, (float) $value);

                            $resultAttributes = SampleResult::factory()
                                ->for($event)
                                ->for($parameter)
                                ->state([
                                    'value' => $value,
                                    'unit' => $threshold->unit ?? $parameter->unit,
                                    'depth_m' => 2.0,
                                    'evaluated_class_code' => $evaluation['evaluated_class_code'],
                                    'threshold_id' => $evaluation['threshold_id'],
                                    'pass_fail' => $evaluation['pass_fail'],
                                    'evaluated_at' => $sampledAt->copy()->addHours(2),
                                    'remarks' => $this->remarksFor($evaluation['pass_fail'], $threshold, $standard),
                                ])
                                ->raw();

                            SampleResult::updateOrCreate(
                                [
                                    'sampling_event_id' => $event->id,
                                    'parameter_id' => $parameter->id,
                                ],
                                $resultAttributes
                            );
                        }
                    }
                }
            }
        });
    }

    protected function evaluateMeasurement(?string $evaluationType, ?ParameterThreshold $threshold, float $value): array
    {
        if (!$threshold) {
            return [
                'pass_fail' => null,
                'threshold_id' => null,
                'evaluated_class_code' => null,
            ];
        }

        $type = strtolower((string) $evaluationType);
        $pass = true;

        if ($type === 'min') {
            $min = $threshold->min_value;
            if ($min !== null && $value < $min) {
                $pass = false;
            }
        } elseif ($type === 'max') {
            $max = $threshold->max_value;
            if ($max !== null && $value > $max) {
                $pass = false;
            }
        } elseif ($type === 'range') {
            $min = $threshold->min_value;
            $max = $threshold->max_value;
            if (($min !== null && $value < $min) || ($max !== null && $value > $max)) {
                $pass = false;
            }
        }

        return [
            'pass_fail' => $pass ? 'pass' : 'fail',
            'threshold_id' => $threshold->id,
            'evaluated_class_code' => $threshold->class_code,
        ];
    }

    protected function remarksFor(?string $passFail, ?ParameterThreshold $threshold, ?WqStandard $standard): ?string
    {
        if (!$threshold) {
            return $standard
                ? 'No specific threshold recorded for ' . $standard->code . '.'
                : null;
        }

        if ($passFail === 'fail') {
            return 'Exceeds ' . ($standard->code ?? 'current') . ' limit for class ' . $threshold->class_code . '.';
        }

        if ($passFail === 'pass') {
            return 'Complies with ' . ($standard->code ?? 'current') . ' limit for class ' . $threshold->class_code . '.';
        }

        return null;
    }
}








