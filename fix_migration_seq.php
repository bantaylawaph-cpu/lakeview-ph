<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class);

use Illuminate\Support\Facades\DB;

try {
    $max = DB::table('migrations')->max('id') ?? 0;
    // Use explicit sequence name to avoid pg_get_serial_sequence quoting issues
    DB::statement("SELECT setval('migrations_id_seq', {$max})");
    echo "[OK] migrations_id_seq set to {$max}\n";
} catch (Throwable $e) {
    echo "[ERR] " . $e->getMessage() . "\n";
    exit(1);
}
