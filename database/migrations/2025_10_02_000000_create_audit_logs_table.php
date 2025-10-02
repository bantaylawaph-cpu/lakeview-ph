<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->timestamp('event_at')->useCurrent();
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
                $table->string('model_type');
                $table->string('model_id');
                $table->string('action', 40); // created|updated|deleted|restored|force_deleted|role_tenant_changed|...
                $table->uuid('request_id')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent', 255)->nullable();
                $table->json('before')->nullable();
                $table->json('after')->nullable();
                $table->json('diff_keys')->nullable();
                $table->json('meta')->nullable();
                $table->char('hash', 64)->nullable();

                $table->index(['tenant_id', 'event_at']);
                $table->index(['model_type', 'model_id']);
                $table->index(['actor_id', 'event_at']);
                $table->index(['action', 'event_at']);
                $table->index(['hash']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('audit_logs')) {
            Schema::drop('audit_logs');
        }
    }
};
