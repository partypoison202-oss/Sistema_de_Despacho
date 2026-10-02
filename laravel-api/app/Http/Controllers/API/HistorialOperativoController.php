<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use App\Helpers\BitacoraConductorHelper;

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
            ->pluck('fecha')
            ->toArray();

        $hoy = Carbon::today()->toDateString();
        $hoyMx = Carbon::now('America/Mexico_City')->toDateString();
        if (!in_array($hoy, $fechas)) array_unshift($fechas, $hoy);
        if (!in_array($hoyMx, $fechas)) array_unshift($fechas, $hoyMx);

        $fechas = array_values(array_unique(array_filter($fechas)));
        rsort($fechas);

        return response()->json($fechas);
    }

    /**
     * Obtiene el historial de una fecha, filtrado para Despacho.
     */
    public function getHistorialDespacho($fecha)
    {
        $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');
        $hasRelevoInfo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');

        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
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
                    'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                    'historial_operativo.ruta',
                    'historial_operativo.numero_tarjeton',
                    'historial_operativo.nombre_conductor',
                    'historial_operativo.tipo',
                    'historial_operativo.estatus',
                    'historial_operativo.corridas',
                    'historial_operativo.ciclo',
                    'historial_operativo.motivo',
                    $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                    $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                    $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (solo del rol correspondiente: DESPACHO o ADMIN)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
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
                'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.tipo',
                'historial_operativo.estatus',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->select(
                    'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.tipo',
                    'informacion_operativa.estatus',
                    'informacion_operativa.corridas',
                    'informacion_operativa.ciclo',
                    'informacion_operativa.motivo',
                    $hasRelevoInfo ? 'informacion_operativa.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                    $hasRelevoInfo ? 'informacion_operativa.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                    $hasRelevoInfo ? 'informacion_operativa.relevo_hora' : DB::raw('NULL as relevo_hora')
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
        $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');

        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->whereIn('historial_operativo.estatus', ['MANTENIMIENTO', 'RESERVA'])
            ->select(
                'historial_mantenimiento.id as id_historial',
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
                    'historial_mantenimiento.id as id_historial',
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
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
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
                'historial_mantenimiento.id as id_historial',
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
                    'historial_mantenimiento.id as id_historial',
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

        // 4. Encierros del día
        $encierros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'ENCIERRO')
            ->select(
                'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                'historial_operativo.tipo',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton as tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                'historial_operativo.motivo_estatus',
                'historial_operativo.hora_encierro',
                $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
            )
            ->orderBy('historial_operativo.hora_encierro')
            ->get();

        return response()->json([
            'inicio' => $inicio,
            'cambios' => $cambios,
            'fin' => $fin,
            'encierros' => $encierros
        ]);
    }

    /**
     * Obtiene el historial completo (Capturista / General) de una fecha.
     */
    public function getHistorialGeneral($fecha)
    {
        $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');
        $hasRelevoInfo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');

        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'historial_operativo.tipo',
                'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                'historial_operativo.hora_salida_patio as hora_acople',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                'historial_operativo.falla',
                'historial_operativo.motivo_estatus',
                $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
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
                    'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                    'historial_operativo.ruta',
                    'historial_operativo.numero_tarjeton',
                    'historial_operativo.nombre_conductor',
                    'historial_operativo.estatus',
                    'historial_operativo.hora_salida_patio as hora_acople',
                    'historial_operativo.corridas',
                    'historial_operativo.ciclo',
                    'historial_operativo.motivo',
                    'historial_operativo.falla',
                    'historial_operativo.motivo_estatus',
                    $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                    $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                    $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
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
                'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                'historial_operativo.hora_salida_patio as hora_acople',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                'historial_operativo.falla',
                'historial_operativo.motivo_estatus',
                $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->select(
                    'informacion_operativa.tipo',
                    'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.estatus',
                    'informacion_operativa.hora_salida_patio as hora_acople',
                    'informacion_operativa.corridas',
                    'informacion_operativa.ciclo',
                    'informacion_operativa.motivo',
                    'informacion_operativa.falla',
                    'informacion_operativa.motivo_estatus',
                    $hasRelevoInfo ? 'informacion_operativa.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                    $hasRelevoInfo ? 'informacion_operativa.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                    $hasRelevoInfo ? 'informacion_operativa.relevo_hora' : DB::raw('NULL as relevo_hora')
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
                'historial_mantenimiento.id as id_historial',
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
                    'historial_mantenimiento.id as id_historial',
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
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
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
                'historial_mantenimiento.id as id_historial',
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
                    'historial_mantenimiento.id as id_historial',
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
                'historial_mantenimiento.id as id_historial',
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

    /**
     * Obtiene las rutas alimentadoras del día anterior para el módulo de PASTELES
     */
    public function getHistorialAlimentadorasAyer()
    {
        $fechaAyer = \Carbon\Carbon::yesterday()->toDateString();
        
        $queryBase = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fechaAyer)
            ->whereRaw('LOWER(historial_operativo.tipo) != ?', ['urbanuss']) // Solo alimentadoras
            ->whereNotNull('historial_operativo.ruta')
            ->whereRaw("TRIM(historial_operativo.ruta) != ''")
            ->select(
                'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor'
            )
            ->orderBy('historial_operativo.ruta')
            ->orderBy('unidades.numero_eco');

        // Intentar primero con INICIO
        $registros = (clone $queryBase)->where('momento', 'INICIO')->get();

        // Fallback a FIN si INICIO está vacío (por si no hubo cierre manual pero sí cierre final)
        if ($registros->isEmpty()) {
            $registros = (clone $queryBase)->where('momento', 'FIN')->get();
        }

        $rutas = [];
        foreach ($registros as $row) {
            $ruta = trim($row->ruta);
            if ($ruta === '') {
                continue; // No incluir rutas vacías o de puros espacios
            }
            if (!isset($rutas[$ruta])) {
                $rutas[$ruta] = [];
            }
            $rutas[$ruta][] = [
                'economico' => $row->economico,
                'tarjeton' => $row->numero_tarjeton,
                'conductor' => $row->nombre_conductor
            ];
        }

        return response()->json([
            'fecha' => $fechaAyer,
            'rutas' => $rutas
        ]);
    }

    /**
     * Obtiene el historial de programación y logística para una fecha específica.
     */
    public function getHistorialProgramacion($fecha)
    {
        $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');
        $hasRelevoInfo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');
        $hasSalidaPatioHist = Schema::hasColumn('historial_operativo', 'hora_salida_patio');
        $hasSalidaPatioInfo = Schema::hasColumn('informacion_operativa', 'hora_salida_patio');
        $hasAcopleHist = Schema::hasColumn('historial_operativo', 'acople');
        $hasAcopleInfo = Schema::hasColumn('informacion_operativa', 'acople');

        $programacion = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'unidades.numero_eco as economico',
                        'unidades.tipo as tipo_unidad',
                'historial_operativo.tipo',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                $hasSalidaPatioHist ? 'historial_operativo.hora_salida_patio as hora_salida' : DB::raw('NULL as hora_salida'),
                $hasAcopleHist ? 'historial_operativo.acople' : DB::raw('NULL as acople'),
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.motivo',
                'historial_operativo.falla',
                'historial_operativo.motivo_estatus',
                $hasRelevoHist ? 'historial_operativo.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevoHist ? 'historial_operativo.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevoHist ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora')
            )
            ->orderBy('unidades.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($programacion->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $programacion = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->select(
                    'unidades.numero_eco as economico',
                        'unidades.tipo as tipo_unidad',
                    'informacion_operativa.tipo',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.estatus',
                    $hasSalidaPatioInfo ? 'informacion_operativa.hora_salida_patio as hora_salida' : DB::raw('NULL as hora_salida'),
                    $hasAcopleInfo ? 'informacion_operativa.acople' : DB::raw('NULL as acople'),
                    'informacion_operativa.corridas',
                    'informacion_operativa.ciclo',
                    'informacion_operativa.motivo',
                    'informacion_operativa.falla',
                    'informacion_operativa.motivo_estatus',
                    $hasRelevoInfo ? 'informacion_operativa.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                    $hasRelevoInfo ? 'informacion_operativa.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                    $hasRelevoInfo ? 'informacion_operativa.relevo_hora' : DB::raw('NULL as relevo_hora')
                )
                ->orderBy('unidades.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // Calcular resumen logístico
        $totalProgramadas = 0;
        $operacionCount = 0;
        $reservaCount = 0;
        $mantenimientoCount = 0;
        $percanceCount = 0;
        $conConductorCount = 0;
        $sinConductorCount = 0;

        $porTipoMap = [];
        $porRutaMap = [];

        foreach ($programacion as $row) {
            $est = strtolower(trim($row->estatus ?? ''));
            if ($est === 'operacion' || $est === 'operación') {
                $operacionCount++;
                $totalProgramadas++;
            } elseif ($est === 'reserva') {
                $reservaCount++;
            } elseif ($est === 'mantenimiento') {
                $mantenimientoCount++;
            } elseif ($est === 'percance') {
                $percanceCount++;
            }

            if (!empty($row->numero_tarjeton) || !empty($row->nombre_conductor)) {
                $conConductorCount++;
            } else {
                $sinConductorCount++;
            }

            $tipoRaw = !empty($row->tipo) ? $row->tipo : (!empty($row->tipo_unidad) ? $row->tipo_unidad : 'DESCONOCIDO');
            $tipoKey = strtoupper(trim($tipoRaw));
            if ($tipoKey === 'URBANUS') $tipoKey = 'URBANUSS';
            if (!isset($porTipoMap[$tipoKey])) {
                $porTipoMap[$tipoKey] = [
                    'tipo' => $tipoKey,
                    'total' => 0,
                    'programadas' => 0,
                    'operacion' => 0,
                    'reserva' => 0,
                    'mantenimiento' => 0,
                    'percance' => 0
                ];
            }
            $porTipoMap[$tipoKey]['total']++;
            if ($est === 'operacion' || $est === 'operación') {
                $porTipoMap[$tipoKey]['programadas']++;
                $porTipoMap[$tipoKey]['operacion']++;
            }
            elseif ($est === 'reserva') $porTipoMap[$tipoKey]['reserva']++;
            elseif ($est === 'mantenimiento') $porTipoMap[$tipoKey]['mantenimiento']++;
            elseif ($est === 'percance') $porTipoMap[$tipoKey]['percance']++;

            $rutaKey = trim($row->ruta ?? '');
            if ($rutaKey !== '') {
                if (!isset($porRutaMap[$rutaKey])) {
                    $porRutaMap[$rutaKey] = [
                        'ruta' => $rutaKey,
                        'total' => 0,
                        'unidades' => []
                    ];
                }
                $porRutaMap[$rutaKey]['total']++;
                $porRutaMap[$rutaKey]['unidades'][] = [
                    'economico' => $row->economico,
                    'tarjeton' => $row->numero_tarjeton,
                    'conductor' => $row->nombre_conductor,
                    'estatus' => $row->estatus
                ];
            }
        }

        return response()->json([
            'fecha' => $fecha,
            'programacion' => $programacion,
            'resumen' => [
                'total_programadas' => $totalProgramadas,
                'operacion' => $operacionCount,
                'reserva' => $reservaCount,
                'mantenimiento' => $mantenimientoCount,
                'percance' => $percanceCount,
                'con_conductor' => $conConductorCount,
                'sin_conductor' => $sinConductorCount,
                'por_tipo' => array_values($porTipoMap),
                'por_ruta' => array_values($porRutaMap)
            ]
        ]);
    }

    /**
     * Obtiene el historial de relevos para una fecha específica.
     */
    public function getHistorialRelevos($fecha)
    {
        try {
            $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');
            $hasRelevoInfo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');

            $relevosQuery = collect();

            $todayUtc = Carbon::today()->toDateString();
            $todayMx = Carbon::now('America/Mexico_City')->toDateString();
            $isToday = in_array($fecha, [$todayUtc, $todayMx], true);

            if ($isToday && Schema::hasTable('informacion_operativa') && $hasRelevoInfo) {
                $queryInfo = DB::table('informacion_operativa')
                    ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                    ->where(function($q) {
                        $q->where(function($q1) {
                            $q1->whereNotNull('informacion_operativa.relevo_conductor')
                               ->whereRaw("TRIM(CAST(informacion_operativa.relevo_conductor AS VARCHAR)) != ''");
                        })->orWhere(function($q2) {
                            $q2->whereNotNull('informacion_operativa.relevo_tarjeton')
                               ->whereRaw("TRIM(CAST(informacion_operativa.relevo_tarjeton AS VARCHAR)) != ''");
                        });
                    });

                $relevosQuery = $queryInfo->select(
                    'unidades.numero_eco as economico',
                        'unidades.tipo as tipo_unidad',
                    'informacion_operativa.tipo',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton as titular_tarjeton',
                    'informacion_operativa.nombre_conductor as titular_conductor',
                    'informacion_operativa.estatus',
                    'informacion_operativa.relevo_tarjeton',
                    'informacion_operativa.relevo_conductor',
                    Schema::hasColumn('informacion_operativa', 'relevo_hora') ? 'informacion_operativa.relevo_hora' : DB::raw('NULL as relevo_hora'),
                    DB::raw("COALESCE(informacion_operativa.fecha_registro, CURRENT_TIMESTAMP) as created_at")
                )
                ->orderBy('unidades.numero_eco')
                ->get();
            }

            if ($relevosQuery->isEmpty() && ($fecha === Carbon::tomorrow()->toDateString() || $fecha === Carbon::now('America/Mexico_City')->addDay()->toDateString()) && Schema::hasTable('informacion_operativa_manana')) {
                $hasMananaRel = Schema::hasColumn('informacion_operativa_manana', 'relevo_tarjeton');
                if ($hasMananaRel) {
                    $queryManana = DB::table('informacion_operativa_manana')
                        ->join('unidades', 'informacion_operativa_manana.unidad_id', '=', 'unidades.id')
                        ->where(function($q) {
                            $q->where(function($q1) {
                                $q1->whereNotNull('informacion_operativa_manana.relevo_conductor')
                                   ->whereRaw("TRIM(CAST(informacion_operativa_manana.relevo_conductor AS VARCHAR)) != ''");
                            })->orWhere(function($q2) {
                                $q2->whereNotNull('informacion_operativa_manana.relevo_tarjeton')
                                   ->whereRaw("TRIM(CAST(informacion_operativa_manana.relevo_tarjeton AS VARCHAR)) != ''");
                            });
                        });

                    $relevosQuery = $queryManana->select(
                        'unidades.numero_eco as economico',
                        'unidades.tipo as tipo_unidad',
                        'informacion_operativa_manana.tipo',
                        'informacion_operativa_manana.ruta',
                        'informacion_operativa_manana.numero_tarjeton as titular_tarjeton',
                        'informacion_operativa_manana.nombre_conductor as titular_conductor',
                        'informacion_operativa_manana.estatus',
                        'informacion_operativa_manana.relevo_tarjeton',
                        'informacion_operativa_manana.relevo_conductor',
                        Schema::hasColumn('informacion_operativa_manana', 'relevo_hora') ? 'informacion_operativa_manana.relevo_hora' : DB::raw('NULL as relevo_hora'),
                        'informacion_operativa_manana.fecha_registro as created_at'
                    )
                    ->orderBy('unidades.numero_eco')
                    ->get();
                }
            }

            if ($relevosQuery->isEmpty() && Schema::hasTable('historial_operativo')) {
                $query = DB::table('historial_operativo')
                    ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                    ->where('fecha_historial', $fecha);

                if ($hasRelevoHist) {
                    $query->where(function($q) {
                        $q->where(function($q1) {
                            $q1->whereNotNull('historial_operativo.relevo_conductor')
                               ->whereRaw("TRIM(CAST(historial_operativo.relevo_conductor AS VARCHAR)) != ''");
                        })->orWhere(function($q2) {
                            $q2->whereNotNull('historial_operativo.relevo_tarjeton')
                               ->whereRaw("TRIM(CAST(historial_operativo.relevo_tarjeton AS VARCHAR)) != ''");
                        });
                    });

                    $relevosQuery = $query->select(
                        'unidades.numero_eco as economico',
                        'unidades.tipo as tipo_unidad',
                        'historial_operativo.tipo',
                        'historial_operativo.ruta',
                        'historial_operativo.numero_tarjeton as titular_tarjeton',
                        'historial_operativo.nombre_conductor as titular_conductor',
                        'historial_operativo.estatus',
                        'historial_operativo.relevo_tarjeton',
                        'historial_operativo.relevo_conductor',
                        Schema::hasColumn('historial_operativo', 'relevo_hora') ? 'historial_operativo.relevo_hora' : DB::raw('NULL as relevo_hora'),
                        Schema::hasColumn('historial_operativo', 'created_at') ? 'historial_operativo.created_at' : DB::raw("COALESCE(historial_operativo.fecha_registro, CURRENT_TIMESTAMP) as created_at")
                    )
                    ->orderBy('unidades.numero_eco')
                    ->get();
                }
            }

            // Obtener bitácora de cambios de relevo / conductor en esa fecha
            $cambiosBitacora = collect();
            if (Schema::hasTable('bitacora_cambios_unidades')) {
                $cambiosBitacora = DB::table('bitacora_cambios_unidades')
                    ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
                    ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
                    ->where('bitacora_cambios_unidades.fecha', $fecha)
                    ->where(function($q) {
                        $q->whereRaw("LOWER(CAST(bitacora_cambios_unidades.tipo_accion AS VARCHAR)) LIKE '%relevo%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%relevo%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.tipo_accion AS VARCHAR)) LIKE '%cambio%conductor%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%cambio%conductor%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.tipo_accion AS VARCHAR)) LIKE '%asignaci%conductor%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%asignaci%conductor%'");
                    })
                    ->select(
                        'bitacora_cambios_unidades.id',
                        'unidades.numero_eco as economico',
                        'unidades.tipo as tipo_unidad',
                        'usuarios.nombre_completo as usuario_nombre',
                        'bitacora_cambios_unidades.tipo_accion',
                        'bitacora_cambios_unidades.detalles',
                        'bitacora_cambios_unidades.created_at as hora'
                    )
                    ->orderBy('bitacora_cambios_unidades.created_at', 'desc')
                    ->get();
            }

            $totalRelevos = $relevosQuery->count();
            $rutasUnicas = $relevosQuery->pluck('ruta')->filter()->unique()->values();

            return response()->json([
                'fecha' => $fecha,
                'relevos' => $relevosQuery,
                'bitacora' => $cambiosBitacora,
                'resumen' => [
                    'total_relevos' => $totalRelevos,
                    'total_rutas' => $rutasUnicas->count(),
                    'total_cambios_bitacora' => $cambiosBitacora->count()
                ]
            ]);
        } catch (\Throwable $e) {
            \Log::error('Error en getHistorialRelevos: ' . $e->getMessage());
            return response()->json([
                'fecha' => $fecha,
                'relevos' => [],
                'bitacora' => [],
                'resumen' => [
                    'total_relevos' => 0,
                    'total_rutas' => 0,
                    'total_cambios_bitacora' => 0
                ],
                'error' => $e->getMessage()
            ], 200);
        }
    }

    /**
     * Obtiene el historial de acciones sobre personas conductoras.
     */
    public function getHistorialConductores(Request $request)
    {
        try {
            BitacoraConductorHelper::ensureTableExists();

            $fecha = $request->query('fecha');
            $busqueda = trim((string)$request->query('busqueda'));
            $tipoAccion = trim((string)$request->query('tipo_accion'));

            // 1. Fechas únicas con actividad de conductores
            $fechas = DB::table('bitacora_conductores')
                ->select('fecha')
                ->distinct()
                ->orderBy('fecha', 'desc')
                ->pluck('fecha');

            if ($fechas->isEmpty()) {
                $fechas = collect([Carbon::today()->toDateString()]);
            }

            $fechaSel = $fecha ?: $fechas->first();

            $query = DB::table('bitacora_conductores')
                ->where('fecha', $fechaSel);

            if (!empty($tipoAccion) && $tipoAccion !== 'TODAS') {
                $query->where('tipo_accion', $tipoAccion);
            }

            if (!empty($busqueda)) {
                $q = strtolower($busqueda);
                $query->where(function($sub) use ($q) {
                    $sub->whereRaw("LOWER(CAST(tarjeton AS VARCHAR)) LIKE ?", ["%{$q}%"])
                        ->orWhereRaw("LOWER(CAST(nombre_conductor AS VARCHAR)) LIKE ?", ["%{$q}%"])
                        ->orWhereRaw("LOWER(CAST(usuario_nombre AS VARCHAR)) LIKE ?", ["%{$q}%"])
                        ->orWhereRaw("LOWER(CAST(detalles AS VARCHAR)) LIKE ?", ["%{$q}%"])
                        ->orWhereRaw("LOWER(CAST(tipo_accion AS VARCHAR)) LIKE ?", ["%{$q}%"]);
                });
            }

            $acciones = $query->orderBy('created_at', 'desc')->get();

            $resumen = [
                'total_acciones'   => $acciones->count(),
                'bajas_reingresos' => $acciones->filter(fn($a) => in_array($a->tipo_accion, ['BAJA', 'REINGRESO']))->count(),
                'faltas_retardos' => $acciones->filter(fn($a) => in_array($a->tipo_accion, ['FALTA_REGISTRADA', 'FALTA_JUSTIFICADA', 'RETARDO']))->count(),
                'modificaciones'   => $acciones->filter(fn($a) => in_array($a->tipo_accion, ['CREACION', 'EDICION', 'SUBIR_FOTO', 'SUBIR_QR']))->count(),
            ];

            return response()->json([
                'fechas'   => $fechas,
                'fecha'    => $fechaSel,
                'acciones' => $acciones,
                'resumen'  => $resumen
            ]);
        } catch (\Throwable $e) {
            \Log::error('Error en getHistorialConductores: ' . $e->getMessage());
            return response()->json([
                'fechas'   => [Carbon::today()->toDateString()],
                'fecha'    => Carbon::today()->toDateString(),
                'acciones' => [],
                'resumen'  => [
                    'total_acciones'   => 0,
                    'bajas_reingresos' => 0,
                    'faltas_retardos'  => 0,
                    'modificaciones'   => 0
                ],
                'error'    => $e->getMessage()
            ], 200);
        }
    }

    /**
     * Obtiene el historial de combustible (cargas, bitácora y reportes) para una fecha.
     */
        public function editarCargaCombustible(Request $request)
    {
        try {
            $request->validate([
                'id_historial' => 'required|integer',
                'nivel_combustible' => 'nullable|string',
                'litros_combustible' => 'nullable|numeric',
                'nivel_adblue' => 'nullable|string',
                'litros_adblue' => 'nullable|numeric',
                'numero_cincho' => 'nullable|string',
                'numero_cincho_adblue' => 'nullable|string',
                'kilometraje' => 'nullable|numeric',
            ]);

            $historial = DB::table('historial_mantenimiento')->where('id', $request->id_historial)->first();
            if (!$historial) {
                return response()->json(['status' => 'error', 'message' => 'Registro hist�rico no encontrado'], 404);
            }

            // Update historial_mantenimiento
            DB::table('historial_mantenimiento')
                ->where('id', $request->id_historial)
                ->update([
                    'nivel_combustible'  => $request->nivel_combustible,
                    'litros_combustible' => $request->litros_combustible,
                    'nivel_adblue'       => $request->nivel_adblue,
                    'litros_adblue'      => $request->litros_adblue,
                    'numero_cincho'      => $request->numero_cincho,
                    'numero_cincho_adblue' => $request->numero_cincho_adblue,
                    'kilometraje'        => $request->kilometraje,
                    'odometro'           => $request->kilometraje, // Keep odometro in sync
                    'updated_at'         => now(),
                ]);

            // Optional: Check if this is the most recent historial record for this unit
            // If so, update the unidades table to keep it in sync
            $latestHist = DB::table('historial_mantenimiento')
                ->where('unidad_id', $historial->unidad_id)
                ->orderBy('created_at', 'desc')
                ->first();
            
            if ($latestHist && $latestHist->id === $historial->id) {
                DB::table('unidades')
                    ->where('id', $historial->unidad_id)
                    ->update([
                        'nivel_combustible'  => $request->nivel_combustible,
                        'litros_combustible' => $request->litros_combustible,
                        'nivel_adblue'       => $request->nivel_adblue,
                        'litros_adblue'      => $request->litros_adblue,
                        'numero_cincho'      => $request->numero_cincho,
                        'numero_cincho_adblue' => $request->numero_cincho_adblue,
                        'kilometraje'        => $request->kilometraje,
                        'odometro'           => $request->kilometraje,
                        'updated_at'         => now(),
                    ]);
            }

            return response()->json(['status' => 'success', 'message' => 'Registro actualizado correctamente']);
        } catch (\Exception $e) {
            \Log::error('[editarCargaCombustible] Error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Error al actualizar el registro'], 500);
        }
    }

    public function getHistorialCombustible($fecha)
    {
        try {
            // 1. Cargas de combustible registradas en esa fecha
            $cargas = DB::table('historial_mantenimiento')
                ->join('unidades', 'historial_mantenimiento.unidad_id', '=', 'unidades.id')
                ->where(function($q) use ($fecha) {
                    $q->whereDate('historial_mantenimiento.fecha_registro', $fecha)
                      ->orWhereDate('historial_mantenimiento.created_at', $fecha)
                      ->orWhere('historial_mantenimiento.fecha_ultima_carga', $fecha);
                })
                ->where(function($q) {
                    $q->whereNotNull('historial_mantenimiento.litros_combustible')
                      ->orWhereNotNull('historial_mantenimiento.nivel_combustible')
                      ->orWhereNotNull('historial_mantenimiento.numero_cincho');
                })
                ->select(
                    'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                    'historial_mantenimiento.tipo_vehiculo as tipo',
                    'historial_mantenimiento.nivel_combustible',
                    'historial_mantenimiento.litros_combustible',
                    'historial_mantenimiento.nivel_adblue',
                    'historial_mantenimiento.litros_adblue',
                    'historial_mantenimiento.numero_cincho',
                    'historial_mantenimiento.numero_cincho_adblue',
                    'historial_mantenimiento.kilometraje',
                    'historial_mantenimiento.odometro',
                    'historial_mantenimiento.fecha_ultima_carga',
                    DB::raw("COALESCE(historial_mantenimiento.fecha_registro, historial_mantenimiento.created_at) as hora_guardado")
                )
                ->orderBy('unidades.numero_eco')
                ->get();

            // Si es hoy y no hay en historial_mantenimiento, checar unidades que tienen carga registrada hoy
            $todayUtc = Carbon::today()->toDateString();
            $todayMx = Carbon::now('America/Mexico_City')->toDateString();
            if ($cargas->isEmpty() && in_array($fecha, [$todayUtc, $todayMx], true)) {
                $cargas = DB::table('unidades')
                    ->where(function($q) use ($fecha) {
                        $q->where('fecha_ultima_carga', $fecha)
                          ->orWhere(function($sub) {
                              $sub->whereNotNull('litros_combustible')
                                  ->whereRaw("CAST(litros_combustible AS VARCHAR) != '' AND CAST(litros_combustible AS VARCHAR) != '0'");
                          });
                    })
                    ->select(
                        DB::raw('NULL as id_historial'),
                        'unidades.numero_eco as economico',
                        'unidades.tipo',
                        'unidades.nivel_combustible',
                        'unidades.litros_combustible',
                        'unidades.nivel_adblue',
                        'unidades.litros_adblue',
                        'unidades.numero_cincho',
                        'unidades.numero_cincho_adblue',
                        'unidades.kilometraje',
                        'unidades.odometro',
                        'unidades.fecha_ultima_carga',
                        'unidades.updated_at as hora_guardado'
                    )
                    ->orderBy('unidades.numero_eco')
                    ->get();
            }

            // 2. Cambios en bitácora relacionados a combustible
            $cambios = collect();
            if (Schema::hasTable('bitacora_cambios_unidades')) {
                $cambios = DB::table('bitacora_cambios_unidades')
                    ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
                    ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
                    ->where('bitacora_cambios_unidades.fecha', $fecha)
                    ->where(function($q) {
                        $q->whereRaw("LOWER(CAST(bitacora_cambios_unidades.tipo_accion AS VARCHAR)) LIKE '%combustible%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%combustible%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%litros%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%adblue%'")
                          ->orWhereRaw("LOWER(CAST(bitacora_cambios_unidades.detalles AS VARCHAR)) LIKE '%cincho%'");
                    })
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
            }

            // 3. Reportes diarios generados (folios COMB)
            $reportes = collect();
            if (Schema::hasTable('reportes_combustible')) {
                $reportes = DB::table('reportes_combustible')
                    ->whereDate('fecha_reporte', $fecha)
                    ->orderBy('id', 'desc')
                    ->get();
            }

            return response()->json([
                'fecha' => $fecha,
                'cargas' => $cargas,
                'cambios' => $cambios,
                'reportes' => $reportes
            ]);
        } catch (\Throwable $e) {
            \Log::error('Error en getHistorialCombustible: ' . $e->getMessage());
            return response()->json([
                'fecha' => $fecha,
                'cargas' => [],
                'cambios' => [],
                'reportes' => []
            ]);
        }
    }
}



