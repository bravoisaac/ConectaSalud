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
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('service_region', 120)->nullable()->after('service_address');
            $table->string('service_comuna', 120)->nullable()->after('service_region');
            $table->string('service_city', 120)->nullable()->after('service_comuna');
            $table->string('service_street', 180)->nullable()->after('service_city');
            $table->string('service_number', 30)->nullable()->after('service_street');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'service_number',
                'service_street',
                'service_city',
                'service_comuna',
                'service_region',
            ]);
        });
    }
};

