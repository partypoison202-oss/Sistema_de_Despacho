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
        // Limpiar tarjetones asignados si es que estaban en info_operativa (por si acaso)
        $bajas = DB::table('conductores')->where('estatus', 'baja')->pluck('tarjeton');
        if ($bajas->isNotEmpty()) {
            DB::table('informacion_operativa')
                ->whereIn('numero_tarjeton', $bajas)
                ->update(['numero_tarjeton' => null, 'nombre_conductor' => null]);
            DB::table('informacion_operativa')
                ->whereIn('relevo_tarjeton', $bajas)
                ->update(['relevo_tarjeton' => null, 'relevo_conductor' => null]);
        }

        // Eliminar permanentemente los registros
        DB::table('conductores')->where('estatus', 'baja')->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No hay retorno para una eliminación de registros en este caso
    }
};
