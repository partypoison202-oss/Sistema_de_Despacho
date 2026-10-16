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
        if (Schema::hasTable('historial_operativo')) {
            Schema::table('historial_operativo', function (Blueprint $table) {
                if (!Schema::hasColumn('historial_operativo', 'hora_real_salida_patio')) {
                    $table->string('hora_real_salida_patio', 20)->nullable()->after('hora_salida');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('historial_operativo')) {
            Schema::table('historial_operativo', function (Blueprint $table) {
                if (Schema::hasColumn('historial_operativo', 'hora_real_salida_patio')) {
                    $table->dropColumn('hora_real_salida_patio');
                }
            });
        }
    }
};
