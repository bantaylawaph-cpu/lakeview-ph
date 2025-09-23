<?php

namespace Database\Factories;

use App\Models\Lake;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lake>
 */
class LakeFactory extends Factory
{
    protected $model = Lake::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->words(2, true) . ' Lake';

        return [
            'watershed_id' => null,
            'name' => $name,
            'alt_name' => $this->faker->optional()->words(2, true),
            'region' => $this->faker->randomElement(['Region III', 'Region IV-A', 'Region VI', 'Region X']),
            'province' => $this->faker->state(),
            'municipality' => $this->faker->city(),
            'surface_area_km2' => $this->faker->randomFloat(2, 0.5, 50),
            'elevation_m' => $this->faker->randomFloat(1, 5, 500),
            'mean_depth_m' => $this->faker->randomFloat(1, 2, 30),
            'class_code' => $this->faker->randomElement(['AA', 'A', 'B', 'C']),
        ];
    }
}
