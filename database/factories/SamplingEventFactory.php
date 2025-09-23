<?php

namespace Database\Factories;

use App\Models\SamplingEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SamplingEvent>
 */
class SamplingEventFactory extends Factory
{
    protected $model = SamplingEvent::class;

    public function definition(): array
    {
        return [
            'geom_point' => null,
            'sampled_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'sampler_name' => $this->faker->name(),
            'method' => $this->faker->randomElement(['Grab sample', 'Integrated sample', 'Composite sample']),
            'weather' => $this->faker->randomElement(['Clear', 'Overcast', 'Rain showers', 'Windy']),
            'notes' => $this->faker->optional()->sentence(12),
            'status' => $this->faker->randomElement(['draft', 'submitted', 'verified']),
            'created_by_user_id' => null,
            'updated_by_user_id' => null,
        ];
    }
}
