<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HistorialOperativoController extends Controller
{
    /**
     * Obtiene las fechas únicas en las que se ha guardado un historial.
     */
    public function getFechas()
    {
        $fechasOperativo = DB::table('historial_operativo')->select('fecha_historial as fecha')->distinct();
        $fechasAcciones = DB::table('bitacora_cambios_unidades')->select('fecha')->distinct();

        $fechas = $fechasOperativo->union($fechasAcciones)
            ->orderBy('fecha', 'desc')
            ->pluck('fecha');

        return response()->json($fechas);
    }

    /**
     * Obtiene el historial de una fecha, filtrado para Despacho.
     */
    public function getHistorialDespacho($fecha)
    {
        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->select(
                    'unidades.numero_eco as economico',
                    'historial_operativo.ruta',
                    'historial_operativo.numero_tarjeton',
                    'historial_operativo.nombre_conductor',
                    'historial_operativo.tipo',
                    'historial_operativo.estatus',
                    'historial_operativo.corridas',
                    'historial_operativo.ciclo',
                    'historial_operativo.motivo'
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (solo del rol correspondiente: DESPACHO o ADMIN)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.role_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->whereIn('roles.codigo', ['DESPACHO', 'ADMINISTRADOR'])
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                'unidades.tipo as tipo_unidad',
                'usuarios.nombre_completo as usuario_nombre',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'asc')
            ->get();

        // 3. Fin
        $fin = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->select(
                'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->select(
                    'unidades.numero_eco as economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.tipo',
                    'informacion_operativa.estatus',
                    'informacion_operativa.corridas',
                    'informacion_operativa.ciclo',
                    'informacion_operativa.motivo'
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        return response()->json([
            'inicio' => $inicio,
            'cambios' => $cambios,
            'fin' => $fin
        ]);
    }

    /**
     * Obtiene el historial de una fecha, filtrado para Encierro.
     */
    public function getHistorialEncierro($fecha)
    {
        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->whereIn('historial_operativo.estatus', ['MANTENIMIENTO', 'RESERVA'])
            ->select(
                'unidades.numero_eco as economico',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.motivo_estatus',
                'historial_operativo.falla'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->whereIn('historial_operativo.estatus', ['MANTENIMIENTO', 'RESERVA'])
                ->select(
                    'unidades.numero_eco as economico',
                    'historial_operativo.tipo',
                    'historial_operativo.estatus',
                    'historial_operativo.motivo_estatus',
                    'historial_operativo.falla'
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (solo del rol correspondiente: ENCIERRO o ADMIN)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.role_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->whereIn('roles.codigo', ['ENCIERRO', 'ADMINISTRADOR'])
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                'unidades.tipo as tipo_unidad',
                'usuarios.nombre_completo as usuario_nombre',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'asc')
            ->get();

        // 3. Fin
        $fin = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->whereIn('historial_operativo.estatus', ['MANTENIMIENTO', 'RESERVA'])
            ->select(
                'unidades.numero_eco as economico',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.motivo_estatus',
                'historial_operativo.falla'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->whereIn('informacion_operativa.estatus', ['mantenimiento', 'reserva'])
                ->select(
                    'unidades.numero_eco as economico',
                    'informacion_operativa.tipo',
                    'informacion_operativa.estatus',
                    'informacion_operativa.motivo_estatus',
                    'informacion_operativa.falla'
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        return response()->json([
            'inicio' => $inicio,
            'cambios' => $cambios,
            'fin' => $fin
        ]);
    }

    /**
     * Obtiene el historial completo (Capturista / General) de una fecha.
     */
    public function getHistorialGeneral($fecha)
    {
        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'historial_operativo.tipo',
                'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                'historial_operativo.hora_programada as hora_acople',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                'historial_operativo.falla',
                'historial_operativo.motivo_estatus'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->select(
                    'historial_operativo.tipo',
                    'unidades.numero_eco as economico',
                    'historial_operativo.ruta',
                    'historial_operativo.numero_tarjeton',
                    'historial_operativo.nombre_conductor',
                    'historial_operativo.estatus',
                    'historial_operativo.hora_programada as hora_acople',
                    'historial_operativo.corridas',
                    'historial_operativo.ciclo',
                    'historial_operativo.motivo',
                    'historial_operativo.falla',
                    'historial_operativo.motivo_estatus'
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (todos los roles sin restricción)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                'unidades.tipo as tipo_unidad',
                'usuarios.nombre_completo as usuario_nombre',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'asc')
            ->get();

        // 3. Fin
        $fin = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->select(
                'historial_operativo.tipo',
                'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                'historial_operativo.hora_programada as hora_acople',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                'historial_operativo.falla',
                'historial_operativo.motivo_estatus'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->select(
                    'informacion_operativa.tipo',
                    'unidades.numero_eco as economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.estatus',
                    'informacion_operativa.hora_programada as hora_acople',
                    'informacion_operativa.corridas',
                    'informacion_operativa.ciclo',
                    'informacion_operativa.motivo',
                    'informacion_operativa.falla',
                    'informacion_operativa.motivo_estatus'
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        return response()->json([
            'inicio' => $inicio,
            'cambios' => $cambios,
            'fin' => $fin
        ]);
    }

    /**
     * Obtiene el historial de mantenimiento de una fecha.
     */
    public function getHistorialMantenimiento($fecha)
    {
        // 1. Inicio (unidades que iniciaron en mantenimiento)
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->where('historial_operativo.estatus', 'MANTENIMIENTO')
            ->select(
                'unidades.numero_eco as economico',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.motivo_estatus',
                'historial_operativo.falla'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->where('historial_operativo.estatus', 'MANTENIMIENTO')
                ->select(
                    'unidades.numero_eco as economico',
                    'historial_operativo.tipo',
                    'historial_operativo.estatus',
                    'historial_operativo.motivo_estatus',
                    'historial_operativo.falla'
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (solo de mantenimiento o admin)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.role_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->whereIn('roles.codigo', ['MANTENIMIENTO', 'ADMINISTRADOR', 'CARGA_DE_COMBUSTIBLE'])
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                'unidades.tipo as tipo_unidad',
                'usuarios.nombre_completo as usuario_nombre',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'asc')
            ->get();

        // 3. Fin
        $fin = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->where('historial_operativo.estatus', 'MANTENIMIENTO')
            ->select(
                'unidades.numero_eco as economico',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.motivo_estatus',
                'historial_operativo.falla'
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->where('informacion_operativa.estatus', 'mantenimiento')
                ->select(
                    'unidades.numero_eco as economico',
                    'informacion_operativa.tipo',
                    'informacion_operativa.estatus',
                    'informacion_operativa.motivo_estatus',
                    'informacion_operativa.falla'
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 4. Registros de checklists/cargas de mantenimiento (conservar funcionalidad histórica previa)
        $checklists = DB::table('historial_mantenimiento')
            ->join('unidades', 'historial_mantenimiento.unidad_id', '=', 'unidades.id')
            ->whereDate('historial_mantenimiento.fecha_registro', $fecha)
            ->select(
                'unidades.numero_eco as economico',
                'historial_mantenimiento.tipo_vehiculo as tipo',
                'historial_mantenimiento.nivel_combustible',
                'historial_mantenimiento.nivel_adblue',
                'historial_mantenimiento.kilometraje',
                'historial_mantenimiento.numero_cincho',
                'historial_mantenimiento.fecha_ultima_carga',
                'historial_mantenimiento.fecha_registro as hora_guardado'
            )
            ->orderBy('historial_mantenimiento.fecha_registro', 'desc')
            ->get();

        return response()->json([
            'inicio' => $inicio,
            'cambios' => $cambios,
            'fin' => $fin,
            'checklists' => $checklists
        ]);
    }

    /**
     * Obtiene las fechas únicas en las que se ha guardado mantenimiento.
     */
    public function getFechasMantenimiento()
    {
        $fechas = DB::table('historial_mantenimiento')
            ->select(DB::raw('DATE(fecha_registro) as fecha'))
            ->distinct()
            ->orderBy('fecha', 'desc')
            ->pluck('fecha');

        return response()->json($fechas);
    }

    /**
     * Obtiene el historial de acciones y cambios de una fecha.
     */
    public function getHistorialAcciones($fecha)
    {
        $registros = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                'unidades.tipo as tipo_unidad',
                'usuarios.nombre_completo as usuario_nombre',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'desc')
            ->get();

        return response()->json($registros);
    }
}
