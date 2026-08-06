<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
     * Despacho: Todas las unidades, pero enfatizando corridas faltantes y ciclos perdidos.
     */
    public function getHistorialDespacho($fecha)
    {
        $registros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
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

        return response()->json($registros);
    }

    /**
     * Obtiene el historial de una fecha, filtrado para Encierro.
     * Encierro: Solo unidades en MANTENIMIENTO o RESERVA.
     */
    public function getHistorialEncierro($fecha)
    {
        $registros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
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

        return response()->json($registros);
    }

    /**
     * Obtiene el historial completo (Capturista / General) de una fecha.
     */
    public function getHistorialGeneral($fecha)
    {
        $registros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
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

        return response()->json($registros);
    }

    /**
     * Obtiene el historial de mantenimiento de una fecha.
     */
    public function getHistorialMantenimiento($fecha)
    {
        $registros = DB::table('historial_mantenimiento')
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

        return response()->json($registros);
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
