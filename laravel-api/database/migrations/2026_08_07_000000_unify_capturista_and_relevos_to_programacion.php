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
        // 1. Obtener los IDs de los roles
        $rolCapturista = DB::table('roles')->where('codigo', 'CAPTURISTA')->first();
        $rolRelevos = DB::table('roles')->where('codigo', 'RELEVOS')->first();

        // 2. Si no existe el rol PROGRAMACION, renombramos/actualizamos el de CAPTURISTA a PROGRAMACION
        if ($rolCapturista) {
            DB::table('roles')->where('id', $rolCapturista->id)->update([
                'codigo' => 'PROGRAMACION',
                'nombre' => 'Programación',
                'descripcion' => 'Encargado del registro, control y actualización de la programación operativa y relevos diarios.'
            ]);
            $idProgramacion = $rolCapturista->id;
        } else {
            // Por si acaso, si no existe CAPTURISTA, creamos PROGRAMACION
            $idProgramacion = DB::table('roles')->insertGetId([
                'codigo' => 'PROGRAMACION',
                'nombre' => 'Programación',
                'descripcion' => 'Encargado del registro, control y actualización de la programación operativa y relevos diarios.'
            ]);
        }

        // 3. Reasignar a todos los usuarios del rol RELEVOS al nuevo rol PROGRAMACION
        if ($rolRelevos) {
            DB::table('usuarios')->where('rol_id', $rolRelevos->id)->update([
                'rol_id' => $idProgramacion
            ]);

            // 4. Eliminar el rol RELEVOS
            DB::table('roles')->where('id', $rolRelevos->id)->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir a CAPTURISTA
        $rolProgramacion = DB::table('roles')->where('codigo', 'PROGRAMACION')->first();

        if ($rolProgramacion) {
            DB::table('roles')->where('id', $rolProgramacion->id)->update([
                'codigo' => 'CAPTURISTA',
                'nombre' => 'Capturista',
                'descripcion' => 'Personal encargado de la carga inicial de información del despacho diario.'
            ]);
        }

        // Volver a insertar RELEVOS
        DB::table('roles')->updateOrInsert(
            ['codigo' => 'RELEVOS'],
            [
                'nombre' => 'Relevos',
                'descripcion' => 'Personal de relevo encargado de capturar y modificar únicamente los operadores asignados en la programación diaria.'
            ]
        );
    }
};
