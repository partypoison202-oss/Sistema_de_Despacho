<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas operativas que deben garantizar paridad estructural y timestamps.
     */
    protected $tables = [
        'informacion_operativa',
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
                    if (!Schema::hasColumn($tableName, 'updated_at')) {
                        $table->timestamp('updated_at')->nullable()->useCurrent();
                    }
                    if (!Schema::hasColumn($tableName, 'created_at')) {
                        $table->timestamp('created_at')->nullable()->useCurrent();
                    }
                    if (!Schema::hasColumn($tableName, 'hora_encierro')) {
                        $table->string('hora_encierro', 20)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'hora_real_salida_patio')) {
                        $table->string('hora_real_salida_patio', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'patio_norte')) {
                        $table->boolean('patio_norte')->default(false);
                    }
                    if (!Schema::hasColumn($tableName, 'transporte_patio_norte')) {
                        $table->boolean('transporte_patio_norte')->default(false);
                    }
                    if (!Schema::hasColumn($tableName, 'itinerario')) {
                        $table->boolean('itinerario')->default(false);
                    }
                    if (!Schema::hasColumn($tableName, 'hora_incorporacion')) {
                        $table->string('hora_incorporacion', 50)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'hora_desincorporacion')) {
                        $table->string('hora_desincorporacion', 50)->nullable();
                    }
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
                        $table->string('mantenimiento_conductor', 255)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_tarjeton')) {
                        $table->string('mantenimiento_tarjeton', 100)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_ruta')) {
                        $table->string('mantenimiento_ruta', 100)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_corrida')) {
                        $table->string('mantenimiento_corrida', 100)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'mantenimiento_kilometraje')) {
                        $table->decimal('mantenimiento_kilometraje', 10, 2)->nullable();
                    }
                });
            }
        }

        if (Schema::hasTable('historial_operativo')) {
            Schema::table('historial_operativo', function (Blueprint $table) {
                if (!Schema::hasColumn('historial_operativo', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->useCurrent();
                }
                if (!Schema::hasColumn('historial_operativo', 'created_at')) {
                    $table->timestamp('created_at')->nullable()->useCurrent();
                }
                if (!Schema::hasColumn('historial_operativo', 'hora_encierro')) {
                    $table->string('hora_encierro', 20)->nullable();
                }
                if (!Schema::hasColumn('historial_operativo', 'hora_real_salida_patio')) {
                    $table->string('hora_real_salida_patio', 50)->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Migración aditiva y no destructiva
    }
};
