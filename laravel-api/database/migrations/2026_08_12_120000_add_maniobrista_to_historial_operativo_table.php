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
                if (!Schema::hasColumn('historial_operativo', 'tarjeton_maniobrista')) {
                    $table->string('tarjeton_maniobrista', 50)->nullable()->after('nombre_conductor');
                }
                if (!Schema::hasColumn('historial_operativo', 'nombre_maniobrista')) {
                    $table->string('nombre_maniobrista', 200)->nullable()->after('tarjeton_maniobrista');
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
                $table->dropColumn(['tarjeton_maniobrista', 'nombre_maniobrista']);
            });
        }
    }
};
