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
            $table->json('amonestaciones_detalle')->nullable();
            $table->json('reconocimientos_detalle')->nullable();
            $table->string('condicionamientos_medicos')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            $table->dropColumn([
                'amonestaciones_detalle',
                'reconocimientos_detalle',
                'condicionamientos_medicos'
            ]);
        });
    }
};
