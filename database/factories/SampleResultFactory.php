<?php

namespace Database\Factories;

use App\Models\SampleResult;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SampleResult>
 */
class SampleResultFactory extends Factory
{
    protected $model = SampleResult::class;

    public function definition(): array
    {
        return [
            'value' => $this->faker->randomFloat(2, 0.1, 20),
            'unit' => null,
            'depth_m' => $this->faker->optional()->randomFloat(1, 0, 15),
            'evaluated_class_code' => null,
            'threshold_id' => null,
            'pass_fail' => $this->faker->randomElement(['pass', 'fail']),
            'evaluated_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'remarks' => $this->faker->optional()->sentence(),
        ];
    }
}
