<?php

namespace Database\Factories;

use App\Models\Layer;
use App\Models\Lake;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LayerFactory extends Factory
{
    protected $model = Layer::class;

    public function definition(): array
    {
        return [
            'body_type'   => 'lake',
            'body_id'     => Lake::query()->inRandomOrder()->value('id') ?? Lake::factory(),
            'uploaded_by' => User::query()->inRandomOrder()->value('id') ?? User::factory(),
            'name'        => $this->faker->words(3, true),
            'type'        => $this->faker->randomElement(['vector','raster']),
            'category'    => $this->faker->randomElement(['hydrology','imagery','admin']),
            'srid'        => 4326,
            'visibility'  => $this->faker->randomElement([Layer::VIS_PUBLIC, Layer::VIS_ADMIN]),
            'is_active'   => false,
            'status'      => 'ready',
            'version'     => 1,
            'notes'       => null,
            'source_type' => 'upload',
        ];
    }

    public function public(): self
    {
        return $this->state(fn() => ['visibility' => Layer::VIS_PUBLIC]);
    }

    public function admin(): self
    {
        return $this->state(fn() => ['visibility' => Layer::VIS_ADMIN]);
    }

    public function active(): self
    {
        return $this->state(fn() => ['is_active' => true]);
    }
}
