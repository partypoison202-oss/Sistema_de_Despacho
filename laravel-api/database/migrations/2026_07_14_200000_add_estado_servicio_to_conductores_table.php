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
        Schema::table('conductores', function (Blueprint $table) {
            if (!Schema::hasColumn('conductores', 'estado_servicio')) {
                $table->string('estado_servicio', 20)->default('disponible');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            if (Schema::hasColumn('conductores', 'estado_servicio')) {
                $table->dropColumn('estado_servicio');
            }
        });
    }
};
