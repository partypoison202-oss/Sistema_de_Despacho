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
        $tables = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_festivo',
            'programacion_inicial',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (!Schema::hasColumn($tableName, 'hora_encierro')) {
                        $table->string('hora_encierro', 20)->nullable()->after('acople');
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
        $tables = [
            'informacion_operativa',
            'informacion_operativa_manana',
            'informacion_operativa_festivo',
            'programacion_inicial',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (Schema::hasColumn($tableName, 'hora_encierro')) {
                        $table->dropColumn('hora_encierro');
                    }
                });
            }
        }
    }
};
