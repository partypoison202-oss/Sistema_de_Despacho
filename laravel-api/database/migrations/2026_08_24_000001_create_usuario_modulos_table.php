<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Agregar rol LECTURA si no existe
        if (\Illuminate\Support\Facades\DB::table('roles')->where('codigo', 'LECTURA')->doesntExist()) {
            \Illuminate\Support\Facades\DB::table('roles')->insert([
                'nombre' => 'Lectura',
                'codigo' => 'LECTURA',
            ]);
        }

        // Tabla de módulos por usuario (aditiva, no toca nada existente)
        Schema::create('usuario_modulos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id');
            $table->string('modulo_codigo', 60);
            $table->timestamps();

            $table->foreign('usuario_id')
                  ->references('id')
                  ->on('usuarios')
                  ->onDelete('cascade');

            $table->unique(['usuario_id', 'modulo_codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario_modulos');
        \Illuminate\Support\Facades\DB::table('roles')->where('codigo', 'LECTURA')->delete();
    }
};
