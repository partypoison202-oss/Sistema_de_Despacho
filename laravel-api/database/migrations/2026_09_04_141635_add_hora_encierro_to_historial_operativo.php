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
        Schema::table('historial_operativo', function (Blueprint $table) {
            $table->string('hora_encierro', 20)->nullable()->after('hora_salida');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('historial_operativo', function (Blueprint $table) {
            $table->dropColumn('hora_encierro');
        });
    }
};
