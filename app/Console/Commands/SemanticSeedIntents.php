<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\SemanticIntentSeeder;

class SemanticSeedIntents extends Command
{
    protected $signature = 'semantic:seed-intents';
    protected $description = 'Upsert canonical semantic intents with embeddings';

    public function handle(): int
    {
        $this->call(SemanticIntentSeeder::class);
        $this->info('Semantic intents seeded.');
        return self::SUCCESS;
    }
}
