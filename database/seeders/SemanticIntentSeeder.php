<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Services\Semantic\EmbeddingClient;
use App\Services\Semantic\IntentCatalog;

class SemanticIntentSeeder extends Seeder
{
    public function run(): void
    {
        $embed = app(EmbeddingClient::class);
        $catalog = app(IntentCatalog::class);

        $intents = [
            [
                'code' => 'LAKE_LARGEST_BY_AREA',
                'description' => 'List lakes sorted by surface area descending',
                'examples' => [
                    'What is the largest lake?',
                    'Show biggest lakes by area',
                    'Which lake has the biggest surface area?',
                ],
            ],
            [
                'code' => 'LAKE_BY_CLASS',
                'description' => 'Filter lakes by water quality class code',
                'examples' => [
                    'Which lakes are Class C?',
                    'Show Class A lakes',
                    'Find lakes with class B',
                ],
            ],
            [
                'code' => 'LAKE_IN_REGION',
                'description' => 'Find lakes located within a named region/province/area',
                'examples' => [
                    'Show lakes located in Mindanao',
                    'Lakes in Region X',
                    'Lakes within Davao Region',
                ],
            ],
            [
                'code' => 'LAKE_NAME_MATCH',
                'description' => 'Match lakes by name or alternate name',
                'examples' => [
                    'Lake Lanao',
                    'Find Laguna de Bay',
                    'Search for Taal',
                ],
            ],
        ];

        foreach ($intents as $i) {
            $text = $i['description'] . "\n" . implode("\n", $i['examples']);
            $vec = $embed->embed($text);
            $catalog->upsertIntent($i['code'], $i['description'], $i['examples'], $vec);
        }
    }
}
