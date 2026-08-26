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
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->string('folio_mantenimiento', 100)->nullable();
            $table->timestamp('fecha_folio_mantenimiento')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn(['folio_mantenimiento', 'fecha_folio_mantenimiento']);
        });
    }
};
