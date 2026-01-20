<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('currency', 10)->default('CLP');
            $table->string('status')->default('authorized');
            $table->unsignedSmallInteger('platform_fee_percent')->default(10);
            $table->decimal('provider_payout_amount', 12, 2)->nullable();
            $table->string('payment_provider')->nullable();
            $table->string('provider_reference')->nullable();
            $table->timestamps();
        });

        Schema::create('penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('provider_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('percent')->default(20);
            $table->string('status')->default('pending');
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('penalties');
        Schema::dropIfExists('payments');
    }
};
