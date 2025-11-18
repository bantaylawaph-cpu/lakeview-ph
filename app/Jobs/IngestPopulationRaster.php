<?php

namespace App\Jobs;

use App\Models\PopulationRaster;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;
use Symfony\Component\Process\Process;

class IngestPopulationRaster implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1800;
    public $tries = 1;

    public function __construct(public int $rasterId, public bool $makeDefault = false) {}

    public function handle(): void
    {
    /** @var PopulationRaster|null $r */
        $r = PopulationRaster::find($this->rasterId);
        if (!$r) {
            Log::warning('IngestPopulationRaster: raster not found', ['id' => $this->rasterId]);
            return;
        }
        if (!in_array($r->status, ['uploaded','error'], true)) {
            Log::info('IngestPopulationRaster: skipping due to status', ['id' => $r->id, 'status' => $r->status]);
            return;
        }
        $r->status = 'ingesting';
        $r->ingestion_step = 'starting';
        $r->ingestion_started_at = now();
        $r->error_message = null;
        $r->save();

        $disk = $r->disk ?: 'local';
        // Brief retry loop in case of eventual consistency on remote storage
        $exists = false;
        for ($i = 0; $i < 3; $i++) {
            try {
                if (Storage::disk($disk)->exists($r->path)) { $exists = true; break; }
            } catch (\Throwable $e) {
                // swallow, we'll log details below
            }
            usleep(300000); // 300ms backoff
        }
        if (!$exists) {
            // Diagnostic logging without leaking secrets
            $defaultDisk = config('filesystems.default');
            $s3Info = [
                'bucket' => (string)config('filesystems.disks.s3.bucket'),
                'endpoint' => (string)config('filesystems.disks.s3.endpoint'),
                'region' => (string)config('filesystems.disks.s3.region'),
                'use_path_style' => (bool)config('filesystems.disks.s3.use_path_style_endpoint')
            ];
            $awsEnvOk = [
                'AWS_ACCESS_KEY_ID' => env('AWS_ACCESS_KEY_ID') ? true : false,
                'AWS_SECRET_ACCESS_KEY' => env('AWS_SECRET_ACCESS_KEY') ? true : false,
                'AWS_BUCKET' => env('AWS_BUCKET') ? true : false,
                'AWS_ENDPOINT' => env('AWS_ENDPOINT') ? true : false,
            ];
            \Log::error('IngestPopulationRaster: file missing at ingestion time', [
                'id' => $r->id,
                'disk' => $disk,
                'path' => $r->path,
                'filesystems.default' => $defaultDisk,
                's3_info' => $s3Info,
                'aws_env_present' => $awsEnvOk,
            ]);
            $r->status = 'error';
            $r->error_message = 'File missing at ingestion time';
            $r->ingestion_finished_at = now();
            $r->save();
            return;
        }

        try {
            $r->ingestion_step = 'hashing';
            $r->save();
            $r->file_size_bytes = Storage::disk($disk)->size($r->path);
            // Streamed hashing to avoid loading entire file into memory
            try {
                $localHashPath = Storage::disk($disk)->path($r->path);
                $r->file_sha256 = @hash_file('sha256', $localHashPath) ?: null;
            } catch (\Throwable $e) {
                // Fallback to non-streaming (small files) if path() isn't supported
                try { $r->file_sha256 = hash('sha256', Storage::disk($disk)->get($r->path)); } catch (\Throwable $e2) { $r->file_sha256 = null; }
            }
            $r->save();

            $r->ingestion_step = 'preparing_table';
            $r->save();
            $year = (int)$r->year;
            $tableName = 'pop_counts_' . $year . '_' . $r->id;

            $r->ingestion_step = 'importing';
            $r->save();
            $allowShell = env('POP_IMPORT_ENABLE_SHELL', true);
            $r2p = env('POP_RASTER2PGSQL_PATH', 'raster2pgsql');
            $psql = env('POP_PSQL_PATH', 'psql');
            // Resolve DB connection details for psql. When Laravel uses DB_URL, the
            // parsed values are NOT reflected in config([...]['host']), so we must
            // parse the URL ourselves to avoid defaulting to 127.0.0.1.
            $connection = config('database.connections.' . config('database.default'));
            $database = $connection['database'] ?? null;
            $username = $connection['username'] ?? null;
            $password = $connection['password'] ?? null;
            $host = $connection['host'] ?? null;
            $port = $connection['port'] ?? null;
            $sslmode = $connection['sslmode'] ?? null;
            // Prefer URL from config/env if present
            $dbUrl = $connection['url'] ?? (env('DB_URL') ?: env('DATABASE_URL'));
            if (is_string($dbUrl) && $dbUrl !== '') {
                try {
                    $parts = parse_url($dbUrl);
                    if ($parts !== false) {
                        if (!empty($parts['user'])) { $username = $parts['user']; }
                        if (!empty($parts['pass'])) { $password = $parts['pass']; }
                        if (!empty($parts['host'])) { $host = $parts['host']; }
                        if (!empty($parts['port'])) { $port = (string)$parts['port']; }
                        if (!empty($parts['path'])) { $database = ltrim($parts['path'], '/'); }
                        if (!empty($parts['query'])) {
                            parse_str($parts['query'], $q);
                            if (!empty($q['sslmode'])) { $sslmode = (string)$q['sslmode']; }
                        }
                    }
                } catch (\Throwable $e){ /* ignore parse failures; fall back */ }
            }
            // Final sane defaults
            if (!$port) { $port = '5432'; }

            $fallbackReason = null;
            if ($allowShell && $database && $username) {
                // Resolve a local path for import. If disk is remote (e.g., s3), stream to a temp file.
                $localPath = null;
                $cleanupLocal = false;
                try {
                    $localPath = Storage::disk($disk)->path($r->path);
                } catch (\Throwable $e) {
                    // Not a local disk; download to a temp file
                    $tmpExt = strtolower(pathinfo($r->path, PATHINFO_EXTENSION) ?: 'bin');
                    $tmpFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pop_ingest_file_' . $r->id . '_' . uniqid() . '.' . $tmpExt;
                    $in = Storage::disk($disk)->readStream($r->path);
                    if ($in === false || $in === null) {
                        throw new \RuntimeException('Unable to open read stream for remote file');
                    }
                    $out = fopen($tmpFile, 'w');
                    if ($out === false) {
                        if (is_resource($in)) fclose($in);
                        throw new \RuntimeException('Unable to open temp file for writing');
                    }
                    stream_copy_to_stream($in, $out);
                    if (is_resource($in)) fclose($in);
                    fclose($out);
                    $localPath = $tmpFile;
                    $cleanupLocal = true;
                }
                $importFiles = [$localPath];
                if (strtolower(pathinfo($localPath, PATHINFO_EXTENSION)) === 'zip') {
                    $r->ingestion_step = 'unzipping'; $r->save();
                    $zip = new \ZipArchive();
                    if ($zip->open($localPath) === true) {
                        $extractDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pop_ingest_' . $r->id . '_' . uniqid();
                        mkdir($extractDir, 0775, true);
                        $zip->extractTo($extractDir);
                        $zip->close();
                        $tifs = [];
                        $rii = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($extractDir));
                        foreach ($rii as $file) {
                            if ($file->isDir()) continue;
                            $ext = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
                            if (in_array($ext, ['tif','tiff'])) $tifs[] = $file->getPathname();
                        }
                        if (!empty($tifs)) {
                            $importFiles = $tifs;
                        } else {
                            $fallbackReason = 'zip_no_tifs_found';
                        }
                    }
                }
                // Normalize file paths to absolute local files to satisfy raster2pgsql
                try {
                    $resolved = [];
                    foreach ($importFiles as $f) {
                        // Already absolute and exists
                        if (is_string($f) && strlen($f) > 0 && ($f[0] === '/' || preg_match('~^[A-Za-z]:\\\\~', $f)) && is_file($f)) {
                            $resolved[] = $f;
                            continue;
                        }
                        // If it's a local disk path, try resolving to an absolute path
                        try {
                            $abs = Storage::disk($disk)->path($f);
                            if (is_file($abs)) { $resolved[] = $abs; continue; }
                        } catch (\Throwable $e) { /* not a local path */ }
                        // As a last resort, stream to temp from the disk
                        if (Storage::disk($disk)->exists($f)) {
                            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION) ?: 'bin');
                            $tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pop_ingest_part_' . $r->id . '_' . uniqid() . '.' . $ext;
                            $in = Storage::disk($disk)->readStream($f);
                            if ($in === false || $in === null) throw new \RuntimeException('Unable to open stream for: ' . $f);
                            $out = fopen($tmp, 'w');
                            if ($out === false) { if (is_resource($in)) fclose($in); throw new \RuntimeException('Unable to create temp file for: ' . $f); }
                            stream_copy_to_stream($in, $out);
                            if (is_resource($in)) fclose($in); fclose($out);
                            $resolved[] = $tmp;
                            $cleanupLocal = true; // mark for cleanup later
                            continue;
                        }
                        // Not resolvable; keep original for error reporting
                        $resolved[] = $f;
                    }
                    $importFiles = $resolved;
                } catch (\Throwable $e) {
                    Log::warning('IngestPopulationRaster: file path normalization failed', ['id' => $r->id, 'error' => $e->getMessage(), 'files' => $importFiles]);
                }

                $envVars = [ 'PGPASSWORD' => (string)$password ];
                if ($sslmode) { $envVars['PGSSLMODE'] = (string)$sslmode; }
                $tmpSql = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pop_ingest_' . $r->id . '_' . uniqid() . '.sql';
                $r2pPath = $r2p;
                $psqlPath = $psql;
                if (env('POP_RASTER2PGSQL_PATH')) $r2pPath = env('POP_RASTER2PGSQL_PATH');
                if (env('POP_PSQL_PATH')) $psqlPath = env('POP_PSQL_PATH');

                if ($fallbackReason) {
                    Log::warning('IngestPopulationRaster: falling back due to reason before import', [
                        'id' => $r->id,
                        'reason' => $fallbackReason,
                        'path' => $localPath,
                    ]);
                    $r->error_message = 'fallback_before_import: ' . $fallbackReason;
                    $r->save();
                }

                if (!$fallbackReason) {
                    $cmdR2p = array_merge([
                        $r2pPath, '-I', '-C', '-M', '-t', '256x256', '-s', (string)((int)($r->srid ?: 4326))
                    ], $importFiles, ['public.' . $tableName]);
                    Log::info('IngestPopulationRaster: running raster2pgsql', [
                        'id' => $r->id,
                        'files' => $importFiles,
                        'cmd' => $cmdR2p,
                    ]);
                    $processR2p = new Process($cmdR2p, null, null, null, 1800);
                    // Avoid buffering entire SQL output in memory; stream to file
                    $processR2p->disableOutput();
                    $lines = 0; $hasInsert = false; $hasCopy = false; $errBuf = '';
                    // Ensure tmp file is new/empty
                    @unlink($tmpSql);
                    $processR2p->run(function ($type, $buffer) use ($tmpSql, &$lines, &$hasInsert, &$hasCopy, &$errBuf) {
                        if ($type === Process::OUT) {
                            file_put_contents($tmpSql, $buffer, FILE_APPEND);
                            $lines += substr_count($buffer, "\n");
                            if (!$hasInsert && str_contains($buffer, 'INSERT INTO')) $hasInsert = true;
                            if (!$hasCopy && str_contains($buffer, 'COPY ')) $hasCopy = true;
                        } else {
                            // Keep a small rolling window of stderr for diagnostics
                            if (strlen($errBuf) < 16384) {
                                $errBuf .= $buffer;
                                if (strlen($errBuf) > 16384) $errBuf = substr($errBuf, -16384);
                            }
                        }
                    });
                    if (!$processR2p->isSuccessful()) {
                        throw new \RuntimeException('raster2pgsql failed: ' . $errBuf);
                    }
                    Log::info('IngestPopulationRaster: raster2pgsql output stats', [
                        'id' => $r->id,
                        'lines' => $lines,
                        'has_insert' => $hasInsert,
                        'has_copy' => $hasCopy,
                    ]);
                    if ($lines < 10 || (!$hasInsert && !$hasCopy)) {
                        Log::warning('IngestPopulationRaster: raster2pgsql output suspicious (few lines, no INSERT/COPY)', [
                            'id' => $r->id,
                            // Do not log full SQL; read a tiny preview from file for diagnostics
                            'first_500' => @substr((string)@file_get_contents($tmpSql, false, null, 0, 500), 0, 500),
                        ]);
                    }

                    // Prefer explicit flags to avoid relying on local defaults
                    $cmdPsql = [$psqlPath, '-h', (string)$host, '-p', (string)$port, '-U', (string)$username, '-d', (string)$database, '-v', 'ON_ERROR_STOP=1', '-f', $tmpSql];
                    Log::info('IngestPopulationRaster: running psql import', [
                        'id' => $r->id,
                        'cmd' => $cmdPsql,
                        'tmp_sql_bytes' => filesize($tmpSql) ?: null,
                    ]);
                    $processPsql = new Process($cmdPsql, null, $envVars, null, 1800);
                    $processPsql->run();
                    if (!$processPsql->isSuccessful()) {
                        $err = $processPsql->getErrorOutput() ?: $processPsql->getOutput();
                        @unlink($tmpSql);
                        throw new \RuntimeException('psql import failed: ' . $err);
                    }
                    @unlink($tmpSql);
                    if ($cleanupLocal && is_file($localPath)) { @unlink($localPath); }
                    try {
                        $count = DB::selectOne("SELECT COUNT(*) AS c FROM \"$tableName\"")->c ?? 0;
                        $cols = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = ?", [$tableName]);
                        $colNames = array_map(fn($o) => $o->column_name, $cols);
                        $isStub = in_array('id', $colNames, true) && !in_array('rid', $colNames, true);
                        Log::info('IngestPopulationRaster: post-import table inspection', [
                            'id' => $r->id,
                            'row_count' => $count,
                            'columns' => $colNames,
                            'is_stub_like' => $isStub,
                        ]);
                        if ($count == 0) {
                            Log::error('IngestPopulationRaster: imported table has 0 rows (failing)', ['id' => $r->id, 'table' => $tableName]);
                            throw new \RuntimeException('Empty import: raster2pgsql created table "'.$tableName.'" with zero rows');
                        }
                    } catch (\Throwable $e) {
                        Log::warning('IngestPopulationRaster: count check failed', ['id' => $r->id, 'error' => $e->getMessage()]);
                    }
                }
                if ($cleanupLocal && is_file($localPath)) { @unlink($localPath); }
                if ($fallbackReason) {
                    DB::statement("CREATE TABLE IF NOT EXISTS \"$tableName\" (id serial primary key, rast raster)");
                }
            } else {
                DB::statement("CREATE TABLE IF NOT EXISTS \"$tableName\" (id serial primary key, rast raster)");
                $r->error_message = 'fallback_shell_disabled';
                $r->save();
            }

            $r->ingestion_step = 'registering';
            $r->save();
            DB::transaction(function () use ($tableName, $year, $r) {
                $cat = DB::selectOne("SELECT id FROM pop_dataset_catalog WHERE table_name = ?", [$tableName]);
                $datasetId = $cat?->id;
                if (!$datasetId) {
                    DB::insert("INSERT INTO pop_dataset_catalog (year, table_name, is_enabled, is_default, created_at, updated_at) VALUES (?,?,?::boolean,?::boolean, now(), now())", [
                        $year, $tableName, true, false
                    ]);
                    $datasetId = DB::getPdo()->lastInsertId();
                }
                $default = DB::selectOne("SELECT id FROM pop_dataset_catalog WHERE year = ? AND is_default = TRUE", [$year]);
                if (!$default) {
                    DB::statement('SELECT pop_enable_dataset(?, TRUE)', [$datasetId]);
                } elseif ($this->makeDefault) {
                    DB::statement('SELECT pop_enable_dataset(?, TRUE)', [$datasetId]);
                } else {
                    DB::statement('SELECT pop_enable_dataset(?, FALSE)', [$datasetId]);
                }
                $r->dataset_id = $datasetId;
            });

            try {
                $meta = DB::selectOne("SELECT (ST_MetaData(rast)).scalex AS sx, (ST_MetaData(rast)).scaley AS sy FROM \"$tableName\" WHERE rast IS NOT NULL LIMIT 1");
                if ($meta) {
                    $r->pixel_size_x = $meta->sx ?? null;
                    $r->pixel_size_y = $meta->sy ?? null;
                }
            } catch (Throwable $e) { /* ignore */ }

            $r->status = 'ready';
            $r->ingestion_step = 'done';
            $r->ingestion_finished_at = now();
            $r->save();
        } catch (Throwable $e) {
            Log::error('IngestPopulationRaster failed', ['id' => $r->id, 'error' => $e->getMessage()]);
            $r->status = 'error';
            $r->error_message = $e->getMessage();
            $r->ingestion_step = 'error';
            $r->ingestion_finished_at = now();
            $r->save();
        }
    }
}
