<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('feedback', function (Blueprint $table) {
            $table->id();
            // nullable user (guest submissions allowed)
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();

            // guest meta
            $table->boolean('is_guest')->default(false);
            $table->string('guest_name', 120)->nullable();
            $table->string('guest_email', 160)->nullable();

            $table->string('title', 160);
            $table->text('message');
            $table->string('category', 60)->nullable();
            $table->string('status', 24)->default('open');
            $table->json('metadata')->nullable();
            $table->text('admin_response')->nullable();
            $table->unsignedTinyInteger('spam_score')->default(0);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            // indexes
            $table->index('status');
            $table->index('created_at');
            $table->index('is_guest');
            $table->index(['is_guest','status','created_at']);
            $table->index('guest_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback');
    }
};
