<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FixMigrationSequence extends Command
{
    protected $signature = 'maintenance:fix-migration-seq {--sequence=migrations_id_seq : Sequence name}';
    protected $description = 'Align the migrations.id sequence with the current MAX(id) to fix duplicate key errors.';

    public function handle(): int
    {
        if (DB::getDriverName() !== 'pgsql') {
            $this->warn('Not a PostgreSQL connection; nothing to do.');
            return self::SUCCESS;
        }
        if (!Schema::hasTable('migrations')) {
            $this->error('migrations table not found.');
            return self::FAILURE;
        }
        $seq = $this->option('sequence');
        $max = (int) DB::table('migrations')->max('id');
        // Set sequence to max so next value is max+1
        DB::statement("SELECT setval('$seq', $max)");
        $this->info("Sequence '$seq' set to $max (next insert will use " . ($max+1) . ' ).');
        return self::SUCCESS;
    }
}
