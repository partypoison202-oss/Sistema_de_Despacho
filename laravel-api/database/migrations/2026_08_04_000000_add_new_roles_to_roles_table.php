<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('roles')->updateOrInsert(
            ['codigo' => 'GESTOR_OPERADORES'],
            [
                'nombre' => 'Gestor de Operadores',
                'descripcion' => 'Encargado de gestionar y administrar el catálogo de operadores del sistema.'
            ]
        );

        DB::table('roles')->updateOrInsert(
            ['codigo' => 'RELEVOS'],
            [
                'nombre' => 'Relevos',
                'descripcion' => 'Personal de relevo encargado de capturar y modificar únicamente los operadores asignados en la programación diaria.'
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')->whereIn('codigo', ['GESTOR_OPERADORES', 'RELEVOS'])->delete();
    }
};
