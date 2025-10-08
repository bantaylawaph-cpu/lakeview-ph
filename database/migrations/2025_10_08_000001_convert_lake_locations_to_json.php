<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Detect driver
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::transaction(function() {
                // Convert scalar text to jsonb arrays if still text columns
                // We will attempt to ALTER TYPE directly; if already jsonb, skip.
                $this->ensureJsonbArray('region');
                $this->ensureJsonbArray('province');
                $this->ensureJsonbArray('municipality');
            });
        } elseif (in_array($driver, ['mysql', 'mariadb'])) {
            // MySQL path: alter to JSON and wrap existing scalars
            Schema::table('lakes', function($table) {
                // Using raw statements to avoid doctrine/dbal dependency
            });
            // Region
            $this->mysqlConvertToJsonArray('region');
            $this->mysqlConvertToJsonArray('province');
            $this->mysqlConvertToJsonArray('municipality');
        } else {
            // Fallback: do nothing but leave columns as-is (will still accept arrays cast by Laravel but stored as text JSON)
        }
    }

    private function ensureJsonbArray(string $col): void
    {
        // Determine current data type
        $type = DB::selectOne("SELECT data_type FROM information_schema.columns WHERE table_name='lakes' AND column_name=?", [$col]);
        if (!$type) return;
        $dt = strtolower($type->data_type ?? '');
        if ($dt !== 'json' && $dt !== 'jsonb') {
            // Wrap scalars then alter
            DB::statement("UPDATE lakes SET {$col} = to_jsonb(ARRAY[{$col}]) WHERE {$col} IS NOT NULL AND position('[' in {$col}) = 0");
            DB::statement("ALTER TABLE lakes ALTER COLUMN {$col} TYPE jsonb USING {$col}::jsonb");
        } else {
            // Already json/jsonb but ensure array form
            DB::statement("UPDATE lakes SET {$col} = to_jsonb(ARRAY[{$col}]) WHERE {$col} IS NOT NULL AND jsonb_typeof({$col}) <> 'array'");
        }
    }

    private function mysqlConvertToJsonArray(string $col): void
    {
        // If column is not JSON yet, alter to JSON storing previous text
        $colInfo = DB::selectOne("SHOW COLUMNS FROM lakes LIKE ?", [$col]);
        if (!$colInfo) return;
        $type = strtolower($colInfo->Type ?? '');
        if ($type !== 'json') {
            // Create a temp column
            $tmp = $col . '_tmp_json';
            DB::statement("ALTER TABLE lakes ADD COLUMN {$tmp} JSON NULL");
            DB::statement("UPDATE lakes SET {$tmp} = CASE WHEN {$col} IS NULL OR {$col} = '' THEN NULL ELSE JSON_ARRAY({$col}) END");
            DB::statement("ALTER TABLE lakes DROP COLUMN {$col}");
            DB::statement("ALTER TABLE lakes CHANGE COLUMN {$tmp} {$col} JSON NULL");
        } else {
            // Ensure values are arrays
            $rows = DB::select("SELECT id, {$col} AS v FROM lakes WHERE {$col} IS NOT NULL");
            foreach ($rows as $r) {
                // If value is a scalar JSON (string) wrap it
                // Can't easily detect inside SQL without additional functions; attempt update
                // We'll re-set any non-array JSON scalar
                try {
                    DB::statement("UPDATE lakes SET {$col} = JSON_ARRAY({$col}) WHERE id = ? AND JSON_TYPE({$col}) <> 'ARRAY'", [$r->id]);
                } catch (\Throwable $e) {
                    // ignore
                }
            }
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            // Revert back to text first element
            foreach (['region','province','municipality'] as $col) {
                DB::statement("ALTER TABLE lakes ALTER COLUMN {$col} TYPE text USING CASE WHEN {$col} IS NULL THEN NULL ELSE ({$col}->>0) END");
            }
        } elseif (in_array($driver, ['mysql','mariadb'])) {
            foreach (['region','province','municipality'] as $col) {
                $tmp = $col . '_tmp_text';
                DB::statement("ALTER TABLE lakes ADD COLUMN {$tmp} VARCHAR(255) NULL");
                DB::statement("UPDATE lakes SET {$tmp} = JSON_UNQUOTE(JSON_EXTRACT({$col}, '$[0]')) WHERE {$col} IS NOT NULL");
                DB::statement("ALTER TABLE lakes DROP COLUMN {$col}");
                DB::statement("ALTER TABLE lakes CHANGE COLUMN {$tmp} {$col} VARCHAR(255) NULL");
            }
        }
    }
};
