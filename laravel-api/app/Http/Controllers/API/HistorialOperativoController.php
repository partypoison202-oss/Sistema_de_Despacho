<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
        $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');
        $hasRelevoInfo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');

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

        // 4. Encierros del día
        $encierros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'ENCIERRO')
            ->select(
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
        $totalProgramadas = $programacion->count();
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
                    'operacion' => 0,
                    'reserva' => 0,
                    'mantenimiento' => 0,
                    'percance' => 0
                ];
            }
            $porTipoMap[$tipoKey]['total']++;
            if ($est === 'operacion' || $est === 'operación') $porTipoMap[$tipoKey]['operacion']++;
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

            if ($fecha === Carbon::today()->toDateString() && Schema::hasTable('informacion_operativa') && $hasRelevoInfo) {
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
                    'informacion_operativa.created_at'
                )
                ->orderBy('unidades.numero_eco')
                ->get();
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
                        'historial_operativo.created_at'
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
}
