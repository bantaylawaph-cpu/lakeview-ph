<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lake_flows', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('lake_id')->constrained('lakes')->onDelete('cascade');
            $table->string('flow_type', 16); // 'inflow' | 'outflow'
            $table->string('name', 255)->nullable();
            $table->string('alt_name', 255)->nullable();
            $table->string('source', 255)->nullable(); // river/stream name or external id
            $table->boolean('is_primary')->default(false);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Geometry + denormalized lat/lon for quick display
            // PostGIS point geometry (SRID 4326)
            // Placeholder; we'll alter to proper POINT SRID 4326 after create to satisfy some driver limitations
            $table->geometry('coordinates')->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->timestamps();

            $table->index(['lake_id']);
            $table->index(['flow_type']);
            $table->index(['is_primary']);
            $table->index(['created_by']);
        });

        // Enforce allowed values for flow_type (PostgreSQL CHECK)
    DB::statement("ALTER TABLE lake_flows ADD CONSTRAINT lake_flows_flow_type_check CHECK (flow_type IN ('inflow','outflow'))");
    // Convert geometry column to POINT with SRID 4326
    try { DB::statement('ALTER TABLE lake_flows ALTER COLUMN coordinates TYPE geometry(Point,4326) USING ST_SetSRID(coordinates::geometry,4326)'); } catch (Throwable $e) { /* ignore */ }
    try { DB::statement('CREATE INDEX lake_flows_coordinates_gist ON lake_flows USING GIST (coordinates)'); } catch (Throwable $e) { /* ignore */ }
    }

    public function down(): void
    {
        Schema::dropIfExists('lake_flows');
    }
};
