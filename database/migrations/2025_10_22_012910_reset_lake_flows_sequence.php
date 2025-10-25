<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
                // Safely reset sequence so nextval yields MAX(id)+1 when rows exist, or 1 when table is empty
                DB::statement(<<<SQL
                        DO $$
                        DECLARE v_max bigint;
                        BEGIN
                            SELECT MAX(id) INTO v_max FROM lake_flows;
                            IF v_max IS NULL THEN
                                PERFORM setval('lake_flows_id_seq', 1, false); -- next nextval() returns 1
                            ELSE
                                PERFORM setval('lake_flows_id_seq', v_max, true); -- next nextval() returns v_max+1
                            END IF;
                        END $$;
                SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed
    }
};
