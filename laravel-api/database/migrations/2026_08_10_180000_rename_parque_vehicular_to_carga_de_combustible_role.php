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
        DB::table('roles')
            ->where('codigo', 'PARQUE_VEHICULAR')
            ->update([
                'codigo' => 'CARGA_DE_COMBUSTIBLE',
                'nombre' => 'Carga de Combustible',
                'descripcion' => 'Rol encargado de la gestión de carga de combustible, adblue, kilometraje y cinchos.'
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')
            ->where('codigo', 'CARGA_DE_COMBUSTIBLE')
            ->update([
                'codigo' => 'PARQUE_VEHICULAR',
                'nombre' => 'Parque Vehicular',
                'descripcion' => 'Rol encargado de la gestión del parque vehicular, incluyendo mantenimiento, encierro e inspección de unidades.'
            ]);
    }
};
