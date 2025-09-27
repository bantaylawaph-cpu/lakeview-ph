<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // If layers table already exists (e.g., in production schema), do nothing.
        if (Schema::hasTable('layers')) {
            return;
        }

        Schema::create('layers', function (Blueprint $table) {
            $table->id();
            // Core descriptive fields
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('type')->nullable(); // e.g., raster, vector
            $table->string('source_type')->nullable(); // e.g., upload, external

            // Legacy / polymorphic-ish association used by tests/factories (body_type/body_id)
            $table->string('body_type')->default('lake');
            $table->unsignedBigInteger('body_id')->nullable();

            // Original references seen in existing migrations/factories
            $table->unsignedBigInteger('lake_id')->nullable(); // kept for compatibility
            $table->unsignedBigInteger('uploaded_by')->nullable(); // legacy column name used in tests
            $table->unsignedBigInteger('uploaded_by_user_id')->nullable(); // newer naming variant

            // Visibility & status lifecycle columns referenced in tests
            $table->string('visibility')->default('private'); // private|public|tenant etc.
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(false); // redundancy but present in code paths
            $table->string('status')->default('ready');
            $table->unsignedInteger('version')->default(1);

            // Spatial reference id (srid) expected in factories
            $table->unsignedInteger('srid')->default(4326);

            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            // Indexes & FKs (kept simple for sqlite compatibility; no cascade complexity)
            $table->index(['body_type', 'body_id']);
            $table->index(['lake_id']);
            $table->index(['uploaded_by']);
            $table->index(['uploaded_by_user_id']);
            $table->index(['visibility']);
            $table->index(['is_public']);

            $table->foreign('lake_id')->references('id')->on('lakes')->nullOnDelete();
            $table->foreign('uploaded_by_user_id')->references('id')->on('users')->nullOnDelete();
            // Skip FK for uploaded_by (legacy) to avoid duplicate constraint concerns.
        });
    }

    public function down(): void
    {
        // Only drop if we created it (heuristic: just drop if exists; safe in testing)
        Schema::dropIfExists('layers');
    }
};
