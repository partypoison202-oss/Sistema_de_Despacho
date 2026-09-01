<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reportes_combustible')) {
            Schema::create('reportes_combustible', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 20)->unique(); // COMB-001, COMB-002...
                $table->date('fecha_reporte');
                $table->string('generado_por', 150)->nullable(); // nombre del usuario
                $table->json('datos_resumen')->nullable();       // totales del día (JSON)
                $table->json('datos_detalle')->nullable();       // detalle por tipo de unidad (JSON)
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reportes_combustible');
    }
};
