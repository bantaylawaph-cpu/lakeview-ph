<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = $this->faker->company() . ' Cooperative';
        $slug = str($name)->slug('-');
        return [
            'name' => $name,
            'type' => $this->faker->randomElement(['Government', 'Academic', 'Private', 'LGU']),
            'contact_email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'address' => $this->faker->address(),
            'slug' => $slug,
        ];
    }
}
