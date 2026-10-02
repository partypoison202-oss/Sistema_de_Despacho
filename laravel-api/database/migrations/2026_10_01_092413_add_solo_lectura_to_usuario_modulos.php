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
        Schema::table('usuario_modulos', function (Blueprint $table) {
            $table->boolean('solo_lectura')->default(false)->after('modulo_codigo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuario_modulos', function (Blueprint $table) {
            $table->dropColumn('solo_lectura');
        });
    }
};
