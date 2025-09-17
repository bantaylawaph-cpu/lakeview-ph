<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('water_quality_classes', function (Blueprint $table) {
            $table->string('code')->primary();
            $table->string('name')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('parameters', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('code')->unique();
            $table->string('name');
            $table->string('unit')->nullable();
            $table->string('category')->nullable();
            $table->string('group')->nullable();
            $table->string('data_type')->nullable();
            $table->string('evaluation_type')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('parameter_aliases', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('parameter_id');
            $table->string('alias');
            $table->timestamps();

            $table->foreign('parameter_id')->references('id')->on('parameters')->onDelete('cascade');
            $table->unique(['parameter_id', 'alias']);
        });

        Schema::create('wq_standards', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('code')->unique();
            $table->string('name')->nullable();
            $table->boolean('is_current')->default(false);
            $table->integer('priority')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('parameter_thresholds', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('parameter_id');
            $table->string('class_code');
            $table->unsignedBigInteger('standard_id')->nullable();
            $table->string('unit')->nullable();
            $table->double('min_value')->nullable();
            $table->double('max_value')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('parameter_id')->references('id')->on('parameters')->onDelete('cascade');
            $table->foreign('class_code')->references('code')->on('water_quality_classes')->onDelete('restrict');
            $table->foreign('standard_id')->references('id')->on('wq_standards')->onDelete('restrict');
        });

        Schema::create('stations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('lake_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lake_id')->references('id')->on('lakes')->onDelete('cascade');
            $table->unique(['organization_id', 'lake_id', 'name']);
        });

        DB::statement('ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS geom_point geometry(Point, 4326)');

        Schema::create('sampling_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('lake_id');
            $table->unsignedBigInteger('station_id')->nullable();
            $table->unsignedBigInteger('applied_standard_id')->nullable();
            $table->timestampTz('sampled_at');
            $table->string('sampler_name')->nullable();
            $table->string('method')->nullable();
            $table->string('weather')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draft');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lake_id')->references('id')->on('lakes')->onDelete('cascade');
            $table->foreign('station_id')->references('id')->on('stations')->onDelete('set null');
            $table->foreign('applied_standard_id')->references('id')->on('wq_standards')->onDelete('set null');
        });

        DB::statement('ALTER TABLE public.sampling_events ADD COLUMN IF NOT EXISTS geom_point geometry(Point, 4326)');

        Schema::create('sample_results', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('sampling_event_id');
            $table->unsignedBigInteger('parameter_id');
            $table->double('value')->nullable();
            $table->string('unit')->nullable();
            $table->double('depth_m')->nullable();
            $table->string('evaluated_class_code')->nullable();
            $table->unsignedBigInteger('threshold_id')->nullable();
            $table->string('pass_fail')->nullable();
            $table->timestampTz('evaluated_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('sampling_event_id')->references('id')->on('sampling_events')->onDelete('cascade');
            $table->foreign('parameter_id')->references('id')->on('parameters')->onDelete('restrict');
            $table->foreign('evaluated_class_code')->references('code')->on('water_quality_classes')->onDelete('set null');
            $table->foreign('threshold_id')->references('id')->on('parameter_thresholds')->onDelete('set null');
        });

        Schema::table('lakes', function (Blueprint $table) {
            if (!Schema::hasColumn('lakes', 'class_code')) {
                $table->string('class_code')->nullable()->after('mean_depth_m');
            }
        });

        DB::statement('ALTER TABLE public.lakes DROP CONSTRAINT IF EXISTS fk_lakes_class_code');
        Schema::table('lakes', function (Blueprint $table) {
            $table->foreign('class_code', 'fk_lakes_class_code')
                ->references('code')->on('water_quality_classes')
                ->onUpdate('cascade')
                ->onDelete('set null');
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_stations_lake ON public.stations (lake_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_stations_org_lake ON public.stations (organization_id, lake_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_stations_geom ON public.stations USING GIST (geom_point)');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_se_lake_status_date ON public.sampling_events (lake_id, status, sampled_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_se_station_date ON public.sampling_events (station_id, sampled_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_se_org_date ON public.sampling_events (organization_id, sampled_at DESC)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_se_geom ON public.sampling_events USING GIST (geom_point)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_se_applied_standard ON public.sampling_events (applied_standard_id)');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_sr_event ON public.sample_results (sampling_event_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_sr_param_event ON public.sample_results (parameter_id, sampling_event_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_sr_eval_class ON public.sample_results (evaluated_class_code)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_sr_param_pass ON public.sample_results (parameter_id, pass_fail)');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_parameters_group ON public.parameters ("group")');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_parameters_category ON public.parameters (category)');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_pt_param_class ON public.parameter_thresholds (parameter_id, class_code)');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS uq_pt_param_class_std ON public.parameter_thresholds (parameter_id, class_code, standard_id) WHERE standard_id IS NOT NULL');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_lakes_class ON public.lakes (class_code)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_wqs_is_current ON public.wq_standards (is_current, priority DESC)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_wqs_is_current');
        DB::statement('DROP INDEX IF EXISTS idx_lakes_class');
        DB::statement('DROP INDEX IF EXISTS uq_pt_param_class_std');
        DB::statement('DROP INDEX IF EXISTS idx_pt_param_class');
        DB::statement('DROP INDEX IF EXISTS idx_parameters_category');
        DB::statement('DROP INDEX IF EXISTS idx_parameters_group');
        DB::statement('DROP INDEX IF EXISTS idx_sr_param_pass');
        DB::statement('DROP INDEX IF EXISTS idx_sr_eval_class');
        DB::statement('DROP INDEX IF EXISTS idx_sr_param_event');
        DB::statement('DROP INDEX IF EXISTS idx_sr_event');
        DB::statement('DROP INDEX IF EXISTS idx_se_applied_standard');
        DB::statement('DROP INDEX IF EXISTS idx_se_geom');
        DB::statement('DROP INDEX IF EXISTS idx_se_org_date');
        DB::statement('DROP INDEX IF EXISTS idx_se_station_date');
        DB::statement('DROP INDEX IF EXISTS idx_se_lake_status_date');
        DB::statement('DROP INDEX IF EXISTS idx_stations_geom');
        DB::statement('DROP INDEX IF EXISTS idx_stations_org_lake');
        DB::statement('DROP INDEX IF EXISTS idx_stations_lake');

        Schema::table('sample_results', function (Blueprint $table) {
            $table->dropForeign(['sampling_event_id']);
            $table->dropForeign(['parameter_id']);
            $table->dropForeign(['evaluated_class_code']);
            $table->dropForeign(['threshold_id']);
        });

        Schema::table('sampling_events', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['lake_id']);
            $table->dropForeign(['station_id']);
            $table->dropForeign(['applied_standard_id']);
        });

        Schema::table('stations', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropForeign(['lake_id']);
        });

        Schema::table('parameter_thresholds', function (Blueprint $table) {
            $table->dropForeign(['parameter_id']);
            $table->dropForeign(['class_code']);
            $table->dropForeign(['standard_id']);
        });

        Schema::table('lakes', function (Blueprint $table) {
            $table->dropForeign('fk_lakes_class_code');
            if (Schema::hasColumn('lakes', 'class_code')) {
                $table->dropColumn('class_code');
            }
        });

        DB::statement('ALTER TABLE public.sampling_events DROP COLUMN IF EXISTS geom_point');
        DB::statement('ALTER TABLE public.stations DROP COLUMN IF EXISTS geom_point');

        Schema::dropIfExists('sample_results');
        Schema::dropIfExists('sampling_events');
        Schema::dropIfExists('stations');
        Schema::dropIfExists('parameter_thresholds');
        Schema::dropIfExists('wq_standards');
        Schema::dropIfExists('parameter_aliases');
        Schema::dropIfExists('parameters');
        Schema::dropIfExists('water_quality_classes');
    }
};
