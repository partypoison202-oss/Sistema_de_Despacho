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
        Schema::table('reportes_titan', function (Blueprint $table) {
            $table->string('ubicacion_evento')->nullable()->after('ubicacion_gps');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            $table->dropColumn('ubicacion_evento');
        });
    }
};