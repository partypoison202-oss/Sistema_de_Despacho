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
        DB::statement('CREATE INDEX IF NOT EXISTS idx_informacion_operativa_unidad_id ON informacion_operativa(unidad_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_informacion_operativa_estatus ON informacion_operativa(estatus)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_plataforma_movimientos_unidad_created ON plataforma_movimientos(unidad_id, created_at)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_historial_operativo_fecha_momento ON historial_operativo(fecha_historial, momento)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_bitacora_cambios_unidades_fecha ON bitacora_cambios_unidades(fecha)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_informacion_operativa_unidad_id');
        DB::statement('DROP INDEX IF EXISTS idx_informacion_operativa_estatus');
        DB::statement('DROP INDEX IF EXISTS idx_plataforma_movimientos_unidad_created');
        DB::statement('DROP INDEX IF EXISTS idx_historial_operativo_fecha_momento');
        DB::statement('DROP INDEX IF EXISTS idx_bitacora_cambios_unidades_fecha');
    }
};
