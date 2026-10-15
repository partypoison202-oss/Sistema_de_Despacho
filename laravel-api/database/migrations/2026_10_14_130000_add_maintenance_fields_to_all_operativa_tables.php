<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas operativas que deben mantener sincronizada la estructura de mantenimiento.
     */
    protected $tables = [
        'informacion_operativa_manana',
        'informacion_operativa_sabado',
        'informacion_operativa_domingo',
        'informacion_operativa_lunes',
        'informacion_operativa_festivo',
        'programacion_inicial',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (!Schema::hasColumn($tableName, 'folio_mantenimiento')) {
                        $table->string('folio_mantenimiento', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'fecha_folio_mantenimiento')) {
                        $table->date('fecha_folio_mantenimiento')->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'numero_incidencia')) {
                        $table->string('numero_incidencia', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_conductor')) {
                        $table->string('mantenimiento_conductor', 200)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_tarjeton')) {
                        $table->string('mantenimiento_tarjeton', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_ruta')) {
                        $table->string('mantenimiento_ruta', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_corrida')) {
                        $table->string('mantenimiento_corrida', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_kilometraje')) {
                        $table->string('mantenimiento_kilometraje', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'falla_reportada')) {
                        $table->text('falla_reportada')->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'diagnostico')) {
                        $table->text('diagnostico')->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'firma_base64')) {
                        $table->text('firma_base64')->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'id_firma')) {
                        $table->string('id_firma', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'fecha_firma')) {
                        $table->timestamp('fecha_firma')->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'km_ultima_lectura')) {
                        $table->string('km_ultima_lectura', 50)->nullable();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $cols = [
            'numero_incidencia',
            'mantenimiento_conductor',
            'mantenimiento_tarjeton',
            'mantenimiento_ruta',
            'mantenimiento_corrida',
            'mantenimiento_kilometraje',
        ];

        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName, $cols) {
                    foreach ($cols as $col) {
                        if (Schema::hasColumn($tableName, $col)) {
                            $table->dropColumn($col);
                        }
                    }
                });
            }
        }
    }
};
