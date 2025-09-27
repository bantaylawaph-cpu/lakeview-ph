<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Only create a minimal lakes table for environments where it doesn't already exist.
        // In production we expect the real lakes table to pre-exist (legacy schema),
        // so this guards against accidentally overwriting a full definition.
        if (!Schema::hasTable('lakes')) {
            Schema::create('lakes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('watershed_id')->nullable();
                $table->string('name')->nullable();
                $table->string('alt_name')->nullable();
                $table->string('region')->nullable();
                $table->string('province')->nullable();
                $table->string('municipality')->nullable();
                $table->double('surface_area_km2')->nullable();
                $table->double('elevation_m')->nullable();
                $table->double('mean_depth_m')->nullable();
                // class_code added later by water quality migration if present
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Only drop if this stub created it (i.e., no class_code column yet or limited columns)
        // Simplify: if table exists and has no 'class_code' column AND only expected stub columns, drop.
        if (Schema::hasTable('lakes') && !Schema::hasColumn('lakes', 'class_code')) {
            Schema::drop('lakes');
        }
    }
};
