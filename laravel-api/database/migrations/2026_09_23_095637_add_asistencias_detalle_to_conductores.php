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
            $table->text('descansos_detalle')->nullable()->after('faltas_detalle');
            $table->text('vacaciones_detalle')->nullable()->after('descansos_detalle');
            $table->text('incapacidades_detalle')->nullable()->after('vacaciones_detalle');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conductores', function (Blueprint $table) {
            $table->dropColumn(['descansos_detalle', 'vacaciones_detalle', 'incapacidades_detalle']);
        });
    }
};
