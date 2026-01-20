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
        Schema::create('health_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('specialty');
            $table->unsignedInteger('experience_years')->nullable();
            $table->decimal('rate_hour', 12, 2)->default(0);
            $table->text('bio')->nullable();
            $table->string('verification_status')->default('pending');
            $table->timestamps();
            $table->unique('user_id');
        });

        Schema::create('health_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('health_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('timezone')->default('America/Santiago');
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('health_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('start_at');
            $table->timestamp('end_at');
            $table->string('status')->default('requested');
            $table->string('otp_code', 10)->nullable();
            $table->timestamp('otp_confirmed_at')->nullable();
            $table->unsignedSmallInteger('tolerance_minutes')->default(45);
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->unsignedSmallInteger('cancellation_window_hours')->default(12);
            $table->unsignedSmallInteger('cancellation_fee_percent')->default(30);
            $table->unsignedSmallInteger('penalty_percent')->default(20);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('currency', 10)->default('CLP');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('health_availabilities');
        Schema::dropIfExists('health_profiles');
    }
};
