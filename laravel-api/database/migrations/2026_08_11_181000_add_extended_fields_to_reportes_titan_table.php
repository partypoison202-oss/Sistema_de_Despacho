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
            if (!Schema::hasColumn($table->getTable(), 'lesionados_cantidad')) {
                $table->integer('lesionados_cantidad')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'nombres_afectados')) {
                $table->text('nombres_afectados')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'asistencia_sitio')) {
                $table->text('asistencia_sitio')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'diagnostico_preliminar')) {
                $table->text('diagnostico_preliminar')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'amerita_traslado')) {
                $table->boolean('amerita_traslado')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'estatus_legal')) {
                $table->string('estatus_legal')->nullable();
            }

            // ── Código Naranja (Acoso) — campos específicos ────────────────────
            if (!Schema::hasColumn($table->getTable(), 'usuario_anonimo')) {
                $table->boolean('usuario_anonimo')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'estacion_hecho')) {
                $table->string('estacion_hecho')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'ruta_hecho')) {
                $table->string('ruta_hecho')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'autoridad_interviniente')) {
                $table->string('autoridad_interviniente')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'puesto_disposicion')) {
                $table->boolean('puesto_disposicion')->nullable();
            }
            if (!Schema::hasColumn($table->getTable(), 'motivo_no_disposicion')) {
                $table->text('motivo_no_disposicion')->nullable();
            }
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
