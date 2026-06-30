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
            if (!Schema::hasColumn('informacion_operativa', 'tipo')) {
                $table->string('tipo', 50)->nullable();
            }
            if (!Schema::hasColumn('informacion_operativa', 'estatus')) {
                $table->string('estatus', 20)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn(['tipo', 'estatus']);
        });
    }
};
