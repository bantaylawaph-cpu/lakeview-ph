<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('type')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->boolean('active')->default(true);
            $table->timestampsTz();
            $table->string('slug')->nullable()->unique();
            $table->string('domain')->nullable()->unique();
            $table->string('contact_email')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('deleted_at')->nullable(); // soft deletes
        });
    }
    public function down(): void {
        Schema::dropIfExists('tenants');
    }
};
