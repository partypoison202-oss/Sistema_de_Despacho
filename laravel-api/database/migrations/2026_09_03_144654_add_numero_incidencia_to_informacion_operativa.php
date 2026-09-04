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
        if (!Schema::hasColumn('informacion_operativa', 'numero_incidencia')) {
            Schema::table('informacion_operativa', function (Blueprint $table) {
                $table->string('numero_incidencia', 50)->nullable()->after('folio_mantenimiento');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('informacion_operativa', 'numero_incidencia')) {
            Schema::table('informacion_operativa', function (Blueprint $table) {
                $table->dropColumn('numero_incidencia');
            });
        }
    }
};
