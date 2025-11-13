<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class FeedbackImportImages extends Command
{
    protected $signature = 'feedback:import-images
        {--from= : Source directory to read files from}
        {--disk= : Target filesystem disk (defaults to FEEDBACK_IMAGES_DISK or public)}
        {--prefix=feedback : Target key prefix inside the disk}
        {--recursive : Recurse through subdirectories}
        {--dry-run : Show what would be uploaded without writing}';

    protected $description = 'Import/backfill feedback attachments from a local folder into the configured storage disk.';

    public function handle(): int
    {
        $source = $this->option('from');
        if (!$source) {
            $this->error('--from is required (absolute or relative path)');
            return self::FAILURE;
        }

        $sourcePath = realpath($source);
        if ($sourcePath === false || !is_dir($sourcePath)) {
            $this->error("Source directory not found: {$source}");
            return self::FAILURE;
        }

        $diskName = $this->option('disk') ?: env('FEEDBACK_IMAGES_DISK', 'public');
        $prefix = trim((string)$this->option('prefix')) ?: 'feedback';
        $dry = (bool)$this->option('dry-run');
        $recursive = (bool)$this->option('recursive');

        $disk = Storage::disk($diskName);
        $this->info("Uploading to disk='{$diskName}' under prefix='{$prefix}' from '{$sourcePath}'" . ($dry ? ' [DRY RUN]' : ''));

        $uploaded = 0; $skipped = 0; $failed = 0;

        if ($recursive) {
            $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($sourcePath, \FilesystemIterator::SKIP_DOTS));
            foreach ($it as $file) {
                if (!$file->isFile()) { continue; }
                $relative = ltrim(str_replace($sourcePath, '', $file->getPathname()), DIRECTORY_SEPARATOR);
                $key = trim($prefix . '/' . str_replace('\\', '/', $relative), '/');
                $this->line("-> {$key}");
                if ($dry) { $uploaded++; continue; }
                try {
                    $disk->put($key, file_get_contents($file->getPathname()));
                    $uploaded++;
                } catch (\Throwable $e) {
                    $failed++;
                    $this->warn("Failed: {$key} :: {$e->getMessage()}");
                }
            }
        } else {
            $entries = array_diff(scandir($sourcePath) ?: [], ['.', '..']);
            foreach ($entries as $name) {
                $path = $sourcePath . DIRECTORY_SEPARATOR . $name;
                if (is_dir($path)) { $skipped++; continue; }
                if (!is_file($path)) { $skipped++; continue; }
                $key = trim($prefix . '/' . str_replace('\\', '/', $name), '/');
                $this->line("-> {$key}");
                if ($dry) { $uploaded++; continue; }
                try {
                    $disk->put($key, file_get_contents($path));
                    $uploaded++;
                } catch (\Throwable $e) {
                    $failed++;
                    $this->warn("Failed: {$key} :: {$e->getMessage()}");
                }
            }
        }

        $this->info("Done. uploaded={$uploaded}, skipped={$skipped}, failed={$failed}");
        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
