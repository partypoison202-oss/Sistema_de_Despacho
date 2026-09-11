<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Migración de corrección masiva para el estado de producción:
 * 1. Elimina duplicados (misma persona, uno con acento y uno sin)
 * 2. Corrige usernames según regla Nombre_Apellido
 * 3. Corrige username de Tania que recibió un username incorrecto
 *
 * Se opera por nombre_completo (NO por ID) para evitar el bug anterior
 * donde los IDs locales no coincidían con los IDs de producción.
 */
return new class extends Migration
{
    public function up()
    {
        $now = Carbon::now();

        // =====================================================================
        // PASO 1: ELIMINAR DUPLICADOS (versiones sin acento, mantener con acento)
        // =====================================================================
        $duplicadosAEliminar = [
            // [nombre_completo del que SÍ se borra, nombre_completo del que se MANTIENE]
            'Cesar Arturo Badillo Martinez'     => 'César Arturo Badillo Martinez',
            'Edgar Gomez Garcia'                => 'Edgar Gomez García',
            'Karen Guadalupe Rodriguez Blanco'  => 'Karen Guadalupe Rodríguez Blanco',
            'Ramon Bautista Rodriguez'          => 'Ramón Bautista Rodríguez',
            'Raquel Aguilar Rodriguez'          => 'Raquel Aguilar Rodríguez', // también rol incorrecto
            'Adrian Isidro Lopez'               => 'Adrián Isidro Lopéz',
        ];

        foreach ($duplicadosAEliminar as $nombreMalo => $nombreBueno) {
            // Solo borrar si existe el bueno (para que la migración sea segura)
            $bueno = DB::table('usuarios')->where('nombre_completo', $nombreBueno)->first();
            if ($bueno) {
                $malos = DB::table('usuarios')
                    ->where('nombre_completo', $nombreMalo)
                    ->get();
                foreach ($malos as $malo) {
                    DB::table('usuario_modulos')->where('usuario_id', $malo->id)->delete();
                    DB::table('usuarios')->where('id', $malo->id)->delete();
                }
            }
        }

        // =====================================================================
        // PASO 2: CORREGIR USERNAMES (por nombre_completo, no por ID)
        // =====================================================================
        $correccionesUsername = [
            // [nombre_completo => username_correcto]
            'Tania Iran Canales Hernandez'      => 'Tania_Canales',
            'Adrián Isidro Lopéz'               => 'Adrian_Isidro',
            'Karen Guadalupe Rodríguez Blanco'  => 'Karen_Rodriguez',
            'César Arturo Badillo Martinez'     => 'Cesar_Badillo',
            'Ramón Bautista Rodríguez'          => 'Ramon_Bautista',
            'Edgar Gomez García'                => 'Edgar_Gomez',
            'Raquel Aguilar Rodríguez'          => 'Raquel_Aguilar',
            'Jorge Nava Vinte'                  => 'Jorge_Nava',
            'Gabriel García Vázquez'            => 'Gabriel_Garcia',
            'Gabriel Garcia Vazques'            => 'Gabriel_Garcia', // por si acaso quedó alguno
        ];

        foreach ($correccionesUsername as $nombreCompleto => $nuevoUsername) {
            $user = DB::table('usuarios')
                ->where('nombre_completo', $nombreCompleto)
                ->first();

            if (!$user) continue;

            // Si ya tiene el username correcto, saltar
            if ($user->usuario === $nuevoUsername) continue;

            // Verificar que no haya conflicto de username con otro usuario
            $conflicto = DB::table('usuarios')
                ->where('usuario', $nuevoUsername)
                ->where('id', '!=', $user->id)
                ->first();

            if ($conflicto) {
                // Si hay conflicto, primero borrar el conflicto si tiene nombre sin acento
                // (es un duplicado del tipo que ya deberíamos haber borrado)
                DB::table('usuario_modulos')->where('usuario_id', $conflicto->id)->delete();
                DB::table('usuarios')->where('id', $conflicto->id)->delete();
            }

            DB::table('usuarios')
                ->where('id', $user->id)
                ->update([
                    'usuario' => $nuevoUsername,
                    'fecha_actualizacion' => $now,
                ]);
        }

        // =====================================================================
        // PASO 3: Verificar y corregir que Adrian Isidro no tenga username Gabriel_Garcia
        // (corrección del error de IDs hardcodeados)
        // =====================================================================
        $adrianConMalUsername = DB::table('usuarios')
            ->where('usuario', 'Gabriel_Garcia')
            ->where('nombre_completo', 'like', '%Isidro%')
            ->first();

        if ($adrianConMalUsername) {
            DB::table('usuarios')
                ->where('id', $adrianConMalUsername->id)
                ->update([
                    'usuario' => 'Adrian_Isidro',
                    'fecha_actualizacion' => $now,
                ]);
        }
    }

    public function down()
    {
        // No se revierten eliminaciones de duplicados
    }
};
