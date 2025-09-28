<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable('email_otps')) {
            Schema::create('email_otps', function (Blueprint $t) {
                $t->id();
                $t->string('email')->index();
                $t->enum('purpose', ['register','reset'])->index();
                $t->string('code_hash', 64); // sha256 hex
                $t->timestamp('expires_at');
                $t->timestamp('last_sent_at');
                $t->unsignedTinyInteger('attempts')->default(0);
                $t->timestamp('consumed_at')->nullable();
                $t->json('payload')->nullable(); // for pending registration fields, if any
                $t->timestamps();
                $t->index(['email','purpose','expires_at']);
            });
        }
    }
    public function down(): void {
        Schema::dropIfExists('email_otps');
    }
};
