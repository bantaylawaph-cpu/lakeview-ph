<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class AuditPrune extends Command
{
    protected $signature = 'audit:prune {--days=} {--dry : Dry run only} {--force : Bypass confirmation}';
    protected $description = 'Prune old audit_logs rows beyond retention while keeping protected actions.';

    public function handle(): int
    {
        if (!Schema::hasTable('audit_logs')) {
            $this->warn('audit_logs table not found.');
            return self::SUCCESS;
        }

        $conf = Config::get('audit.prune');
        if (!$conf['enabled']) {
            $this->warn('Prune disabled in config.');
            return self::SUCCESS;
        }

        $days = (int)($this->option('days') ?? $conf['days'] ?? 365);
        if ($days <= 0) { $this->error('Invalid days value.'); return self::FAILURE; }

        $keepActions = $conf['keep_actions'] ?? [];
        $cutoff = Carbon::now()->subDays($days);

        // Count candidates
        $query = DB::table('audit_logs')
            ->where('event_at', '<', $cutoff)
            ->when(!empty($keepActions), function($q) use ($keepActions) {
                $q->whereNotIn('action', $keepActions);
            });

        $count = (clone $query)->count();
        $this->info("Prune candidates older than {$cutoff->toDateString()}: {$count}");

        if ($count === 0) { return self::SUCCESS; }
        if ($this->option('dry')) { return self::SUCCESS; }
        if (!$this->option('force') && !$this->confirm('Delete these rows?')) {
            $this->warn('Aborted.');
            return self::SUCCESS; }

        $batchSize = 5000; $deletedTotal = 0;
        do {
            $ids = (clone $query)->select('id')->limit($batchSize)->pluck('id');
            if ($ids->isEmpty()) { break; }
            DB::table('audit_logs')->whereIn('id', $ids)->delete();
            $deletedTotal += $ids->count();
            $this->line("Deleted batch: {$ids->count()} (total {$deletedTotal})");
        } while (true);

        $this->info("Prune complete. Deleted {$deletedTotal} rows.");
        return self::SUCCESS;
    }
}
