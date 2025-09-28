<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();          // public, contributor, org_admin, superadmin
            $table->string('scope')->nullable();       // 'global'|'tenant'
            $table->timestampsTz();
        });
    }
    public function down(): void {
        Schema::dropIfExists('roles');
    }
};
