<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega los campos extendidos para Código Ámbar/Rojo y Código Naranja (Acoso)
     * al módulo Titanes. Todos los campos son nullable para compatibilidad con
     * registros existentes.
     */
    public function up(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            // ── Código Ámbar / Rojo — campos médicos/legales extendidos ──────────
            $table->integer('lesionados_cantidad')->nullable();
            $table->text('nombres_afectados')->nullable();    // texto libre o JSON
            $table->text('asistencia_sitio')->nullable();     // JSON: ["AMBULANCIA","POLICIA",...]
            $table->text('diagnostico_preliminar')->nullable();
            $table->boolean('amerita_traslado')->nullable();
            $table->string('estatus_legal')->nullable();      // CHOQUE | CORRALO_PENDIENTE | LIBERADO | EN_PROCESO

            // ── Código Naranja (Acoso) — campos específicos ────────────────────
            $table->boolean('usuario_anonimo')->nullable();   // víctima no identificada
            $table->string('estacion_hecho')->nullable();
            $table->string('ruta_hecho')->nullable();
            $table->string('autoridad_interviniente')->nullable();
            $table->boolean('puesto_disposicion')->nullable();
            $table->text('motivo_no_disposicion')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reportes_titan', function (Blueprint $table) {
            $table->dropColumn([
                'lesionados_cantidad',
                'nombres_afectados',
                'asistencia_sitio',
                'diagnostico_preliminar',
                'amerita_traslado',
                'estatus_legal',
                'usuario_anonimo',
                'estacion_hecho',
                'ruta_hecho',
                'autoridad_interviniente',
                'puesto_disposicion',
                'motivo_no_disposicion',
            ]);
        });
    }
};
