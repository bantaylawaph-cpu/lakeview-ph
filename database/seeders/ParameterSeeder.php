<?php

namespace Database\Seeders;

use App\Models\Parameter;
use App\Models\ParameterAlias;
use App\Models\ParameterThreshold;
use App\Models\WqStandard;
use App\Models\WaterQualityClass;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class ParameterSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $this->seedClasses();
            $standard = $this->seedStandard();
            $parameters = $this->seedParameters();
            $this->seedThresholds($parameters, $standard);
        });
    }

    protected function seedClasses(): void
    {
        $classes = [
            ['code' => 'AA', 'name' => 'Public Water Supply Class I'],
            ['code' => 'A',  'name' => 'Public Water Supply Class II'],
            ['code' => 'B',  'name' => 'Recreational Water Class I'],
            ['code' => 'C',  'name' => 'Recreational Water Class II'],
            ['code' => 'D',  'name' => 'Fishery Water Supply Class I'],
            ['code' => 'E',  'name' => 'Fishery Water Supply Class II'],
            ['code' => 'SA', 'name' => 'Protected Waters – SA'],
            ['code' => 'SB', 'name' => 'Protected Waters – SB'],
            ['code' => 'SC', 'name' => 'Protected Waters – SC'],
            ['code' => 'SD', 'name' => 'Protected Waters – SD'],
        ];

        foreach ($classes as $class) {
            WaterQualityClass::updateOrCreate(
                ['code' => $class['code']],
                ['name' => $class['name']]
            );
        }
    }

    protected function seedStandard(): WqStandard
    {
        return WqStandard::updateOrCreate(
            ['code' => 'DAO-2016-08'],
            [
                'name' => 'Water Quality Guidelines and General Effluent Standards of 2016',
                'is_current' => true,
                'priority' => 100,
                'notes' => 'Baseline standard seeded for development environments.',
            ]
        );
    }

    protected function seedParameters(): array
    {
        $definitions = [
            'DO' => [
                'name' => 'Dissolved Oxygen',
                'unit' => 'mg/L',
                'category' => 'physico_chemical',
                'group' => 'primary',
                'data_type' => 'numeric',
                'evaluation_type' => 'min',
                'aliases' => ['D.O.', 'Dissolved O2'],
            ],
            'BOD' => [
                'name' => 'Biochemical Oxygen Demand (5-day, 20°C)',
                'unit' => 'mg/L',
                'category' => 'organic',
                'group' => 'primary',
                'data_type' => 'numeric',
                'evaluation_type' => 'max',
                'aliases' => ['BOD5'],
            ],
            'pH' => [
                'name' => 'pH',
                'unit' => 'pH units',
                'category' => 'physico_chemical',
                'group' => 'primary',
                'data_type' => 'numeric',
                'evaluation_type' => 'range',
                'aliases' => [],
            ],
            'NO3-N' => [
                'name' => 'Nitrate as N',
                'unit' => 'mg/L',
                'category' => 'nutrient',
                'group' => 'secondary_inorganics',
                'data_type' => 'numeric',
                'evaluation_type' => 'max',
                'aliases' => ['Nitrate-N'],
            ],
        ];

        $records = [];

        foreach ($definitions as $code => $def) {
            $parameter = Parameter::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $def['name'],
                    'unit' => $def['unit'],
                    'category' => $def['category'],
                    'group' => $def['group'],
                    'data_type' => $def['data_type'],
                    'evaluation_type' => $def['evaluation_type'],
                    'is_active' => true,
                ]
            );

            $aliases = collect($def['aliases'])
                ->filter(fn ($alias) => is_string($alias) && trim($alias) !== '')
                ->map(fn ($alias) => trim($alias))
                ->unique();

            if ($aliases->isEmpty()) {
                $parameter->aliases()->delete();
            } else {
                $parameter->aliases()->whereNotIn('alias', $aliases)->delete();
                foreach ($aliases as $alias) {
                    ParameterAlias::firstOrCreate([
                        'parameter_id' => $parameter->id,
                        'alias' => $alias,
                    ]);
                }
            }

            $records[$code] = $parameter;
        }

        return $records;
    }

    protected function seedThresholds(array $parameters, WqStandard $standard): void
    {
        $thresholds = [
            ['code' => 'DO',    'class' => 'C', 'min' => 5.0,  'max' => null, 'unit' => 'mg/L'],
            ['code' => 'BOD',   'class' => 'C', 'min' => null, 'max' => 7.0,  'unit' => 'mg/L'],
            ['code' => 'pH',    'class' => 'C', 'min' => 6.5, 'max' => 8.5, 'unit' => 'pH units'],
            ['code' => 'NO3-N', 'class' => 'C', 'min' => null, 'max' => 10.0, 'unit' => 'mg/L'],
        ];

        foreach ($thresholds as $rule) {
            $parameter = Arr::get($parameters, $rule['code']);
            if (!$parameter) {
                continue;
            }

            ParameterThreshold::updateOrCreate(
                [
                    'parameter_id' => $parameter->id,
                    'class_code' => $rule['class'],
                    'standard_id' => $standard->id,
                ],
                [
                    'unit' => $rule['unit'],
                    'min_value' => $rule['min'],
                    'max_value' => $rule['max'],
                ]
            );
        }
    }
}
