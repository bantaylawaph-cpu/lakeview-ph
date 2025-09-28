<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        // Drop existing check constraint if it exists and recreate with desired allowed values
        // Using plain SQL because Laravel schema builder doesn't manage check constraints directly for PostgreSQL enums
        DB::statement("ALTER TABLE email_otps DROP CONSTRAINT IF EXISTS email_otps_purpose_check");
        // Transitional: Only include the purposes we actually use going forward
        DB::statement("ALTER TABLE email_otps ADD CONSTRAINT email_otps_purpose_check CHECK (purpose IN ('register','reset'))");
    }

    public function down(): void {
        // Revert to previous broader set (verify, sign-in, reset) based on the constraint you reported
        DB::statement("ALTER TABLE email_otps DROP CONSTRAINT IF EXISTS email_otps_purpose_check");
        DB::statement("ALTER TABLE email_otps ADD CONSTRAINT email_otps_purpose_check CHECK (purpose IN ('verify','sign-in','reset'))");
    }
};
