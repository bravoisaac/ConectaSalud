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
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('address_region', 120)->nullable()->after('address');
            $table->string('address_comuna', 120)->nullable()->after('address_region');
            $table->string('address_city', 120)->nullable()->after('address_comuna');
            $table->string('address_street', 180)->nullable()->after('address_city');
            $table->string('address_number', 30)->nullable()->after('address_street');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'address_number',
                'address_street',
                'address_city',
                'address_comuna',
                'address_region',
            ]);
        });
    }
};

