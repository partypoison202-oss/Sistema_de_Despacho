<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas operativas a las que se les agregarán las columnas itinerario y hora_desincorporacion.
     */
    protected $tables = [
        'informacion_operativa',
        'informacion_operativa_manana',
        'informacion_operativa_sabado',
        'informacion_operativa_domingo',
        'informacion_operativa_lunes',
        'informacion_operativa_festivo',
        'programacion_inicial',
        'historial_operativo',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (!Schema::hasColumn($tableName, 'itinerario')) {
                        $table->boolean('itinerario')->default(false);
                    }
                    if (!Schema::hasColumn($tableName, 'hora_incorporacion')) {
                        $table->string('hora_incorporacion', 20)->nullable();
                    }
                    if (!Schema::hasColumn($tableName, 'hora_desincorporacion')) {
                        $table->string('hora_desincorporacion', 20)->nullable();
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
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (Schema::hasColumn($tableName, 'itinerario')) {
                        $table->dropColumn('itinerario');
                    }
                    if (Schema::hasColumn($tableName, 'hora_incorporacion')) {
                        $table->dropColumn('hora_incorporacion');
                    }
                    if (Schema::hasColumn($tableName, 'hora_desincorporacion')) {
                        $table->dropColumn('hora_desincorporacion');
                    }
                });
            }
        }
    }
};
