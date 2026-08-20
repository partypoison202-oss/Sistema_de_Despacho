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
            if (!Schema::hasColumn($table->getTable(), 'tarjeton_maniobrista')) {
                $table->string('tarjeton_maniobrista', 50)->nullable()->after('nombre_conductor');
            }
            if (!Schema::hasColumn($table->getTable(), 'nombre_maniobrista')) {
                $table->string('nombre_maniobrista', 200)->nullable()->after('tarjeton_maniobrista');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn(['tarjeton_maniobrista', 'nombre_maniobrista']);
        });
    }
};
