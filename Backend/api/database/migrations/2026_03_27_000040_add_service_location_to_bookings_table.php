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
            $table->text('service_address')->nullable()->after('currency');
            $table->decimal('service_lat', 10, 7)->nullable()->after('service_address');
            $table->decimal('service_lng', 10, 7)->nullable()->after('service_lat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['service_lng', 'service_lat', 'service_address']);
        });
    }
};

