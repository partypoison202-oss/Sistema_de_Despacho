<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Disable transaction for this migration to avoid DDL/Postgres schema transaction conflicts.
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add hora_salida to informacion_operativa directly
        if (!Schema::hasColumn('informacion_operativa', 'hora_salida')) {
            Schema::table('informacion_operativa', function (Blueprint $table) {
                $table->string('hora_salida', 20)->nullable();
            });
        }

        // 2. Rename role TITAN to DESPACHO in roles
        DB::table('roles')
            ->where('codigo', 'TITAN')
            ->update([
                'codigo' => 'DESPACHO',
                'nombre' => 'Despacho'
            ]);

        // 3. Update seccion_componente table to change tipo_formulario from 'TITAN' to 'DESPACHO'
        if (Schema::hasTable('seccion_componente')) {
            DB::table('seccion_componente')
                ->where('tipo_formulario', 'TITAN')
                ->update(['tipo_formulario' => 'DESPACHO']);

            // 4. Alter table default for tipo_formulario to 'DESPACHO' (solo si es Postgres)
            if (DB::getDriverName() === 'pgsql') {
                DB::statement("ALTER TABLE seccion_componente ALTER COLUMN tipo_formulario SET DEFAULT 'DESPACHO'");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('seccion_componente')) {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement("ALTER TABLE seccion_componente ALTER COLUMN tipo_formulario SET DEFAULT 'TITAN'");
            }

            DB::table('seccion_componente')
                ->where('tipo_formulario', 'DESPACHO')
                ->update(['tipo_formulario' => 'TITAN']);
        }

        DB::table('roles')
            ->where('codigo', 'DESPACHO')
            ->update([
                'codigo' => 'TITAN',
                'nombre' => 'Titan'
            ]);

        Schema::table('informacion_operativa', function (Blueprint $table) {
            $table->dropColumn('hora_salida');
        });
    }
};
