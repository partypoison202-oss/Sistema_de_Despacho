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

        if (Schema::hasTable('historial_mantenimiento') && Schema::hasColumn('historial_mantenimiento', 'fecha_ultima_carga')) {
            $fechasComb = DB::table('historial_mantenimiento')
                ->whereNotNull('fecha_ultima_carga')
                ->whereRaw("TRIM(CAST(fecha_ultima_carga AS VARCHAR)) != ''")
                ->distinct()
                ->pluck('fecha_ultima_carga')
                ->map(fn($f) => substr(trim((string) $f), 0, 10))
                ->filter(fn($f) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $f))
                ->toArray();
            $fechas = array_merge($fechas, $fechasComb);
        }

        if (Schema::hasTable('reportes_combustible') && Schema::hasColumn('reportes_combustible', 'fecha_reporte')) {
            $fechasRepComb = DB::table('reportes_combustible')
                ->whereNotNull('fecha_reporte')
                ->distinct()
                ->pluck('fecha_reporte')
                ->map(fn($f) => substr(trim((string) $f), 0, 10))
                ->filter(fn($f) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $f))
                ->toArray();
            $fechas = array_merge($fechas, $fechasRepComb);
        }

        $hoy = Carbon::today()->toDateString();
        $hoyMx = Carbon::now('America/Mexico_City')->toDateString();
        if (!in_array($hoy, $fechas)) array_unshift($fechas, $hoy);
        if (!in_array($hoyMx, $fechas)) array_unshift($fechas, $hoyMx);

        $fechas = array_values(array_unique(array_filter($fechas)));
        rsort($fechas);

        return response()->json($fechas);
    }

    /**
     * Expresión SQL para normalizar y obtener el tipo de unidad con fallback seguro.
     */
    private function tipoUnidadRaw($tableColumn = 'historial_operativo.tipo', $alias = 'tipo')
    {
        return DB::raw("CASE 
            WHEN {$tableColumn} IS NOT NULL AND TRIM(CAST({$tableColumn} AS VARCHAR)) != '' AND UPPER(TRIM(CAST({$tableColumn} AS VARCHAR))) != 'DESCONOCIDO' 
            THEN (CASE WHEN UPPER(TRIM(CAST({$tableColumn} AS VARCHAR))) = 'URBANUS' THEN 'URBANUSS' ELSE UPPER(TRIM(CAST({$tableColumn} AS VARCHAR))) END) 
            ELSE COALESCE(NULLIF(TRIM(CAST(unidades.tipo AS VARCHAR)), ''), transportes.nombre) 
        END as {$alias}");
    }

    private function tipoUnidadFromUnidadesRaw($alias = 'tipo')
    {
        return DB::raw("COALESCE(NULLIF(TRIM(CAST(unidades.tipo AS VARCHAR)), ''), transportes.nombre) as {$alias}");
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->select(
                    'historial_operativo.id as id_historial',
                    'unidades.numero_eco as economico',
                    'historial_operativo.ruta',
                    'historial_operativo.numero_tarjeton',
                    'historial_operativo.nombre_conductor',
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->whereIn('roles.codigo', ['DESPACHO', 'ADMINISTRADOR'])
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                $this->tipoUnidadFromUnidadesRaw('tipo'),
                $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->select(
                    'informacion_operativa.id as id_historial',
                    'unidades.numero_eco as economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->whereIn(DB::raw('LOWER(historial_operativo.estatus)'), ['mantenimiento', 'percance', 'reserva'])
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                'historial_operativo.estatus',
                DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.motivo_estatus), ''), UPPER(historial_operativo.estatus)) as motivo_estatus"),
                DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.falla_reportada), ''), NULLIF(TRIM(historial_operativo.falla), ''), NULLIF(TRIM(historial_operativo.diagnostico), ''), NULLIF(TRIM(historial_operativo.observaciones), ''), NULLIF(TRIM(historial_operativo.motivo_estatus), ''), '-') as falla")
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        $fechaHoyMex = Carbon::now('America/Mexico_City')->toDateString();
        $esHoy = ($fecha === $fechaHoyMex || $fecha === Carbon::today()->toDateString());

        if ($inicio->isEmpty() && $esHoy) {
            \App\Helpers\BitacoraHelper::ensureInicioSnapshot(false);
            $inicio = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->whereIn(DB::raw('LOWER(informacion_operativa.estatus)'), ['mantenimiento', 'percance', 'reserva'])
                ->select(
                    'informacion_operativa.id as id_historial',
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
                    'informacion_operativa.estatus',
                    DB::raw("COALESCE(NULLIF(TRIM(informacion_operativa.motivo_estatus), ''), UPPER(informacion_operativa.estatus)) as motivo_estatus"),
                    DB::raw("COALESCE(NULLIF(TRIM(informacion_operativa.falla_reportada), ''), NULLIF(TRIM(informacion_operativa.falla), ''), NULLIF(TRIM(informacion_operativa.diagnostico), ''), NULLIF(TRIM(informacion_operativa.observaciones), ''), NULLIF(TRIM(informacion_operativa.motivo_estatus), ''), '-') as falla")
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->where('fecha_historial', $prevDate)
                ->whereIn('momento', ['FIN', 'INICIO'])
                ->whereIn(DB::raw('LOWER(historial_operativo.estatus)'), ['mantenimiento', 'percance', 'reserva'])
                ->select(
                    'historial_operativo.id as id_historial',
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                    'historial_operativo.estatus',
                    DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.motivo_estatus), ''), UPPER(historial_operativo.estatus)) as motivo_estatus"),
                    DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.falla_reportada), ''), NULLIF(TRIM(historial_operativo.falla), ''), NULLIF(TRIM(historial_operativo.diagnostico), ''), NULLIF(TRIM(historial_operativo.observaciones), ''), NULLIF(TRIM(historial_operativo.motivo_estatus), ''), '-') as falla")
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (solo del rol correspondiente: ENCIERRO o ADMIN)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->whereIn('roles.codigo', ['ENCIERRO', 'ADMINISTRADOR'])
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                $this->tipoUnidadFromUnidadesRaw('tipo'),
                $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
                'usuarios.nombre_completo as usuario_nombre',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'desc')
            ->get();

        // 3. Fin
        $fin = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->whereIn('historial_operativo.estatus', ['MANTENIMIENTO', 'RESERVA'])
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->whereIn('informacion_operativa.estatus', ['mantenimiento', 'reserva'])
                ->select(
                    'informacion_operativa.id as id_historial',
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
                    'informacion_operativa.estatus',
                    'informacion_operativa.motivo_estatus',
                    'informacion_operativa.falla'
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 4. Encierros del día
        $queryEncierros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'ENCIERRO');

        $fechaHoyMex = Carbon::now('America/Mexico_City')->toDateString();
        if ($fecha === $fechaHoyMex || $fecha === Carbon::today()->toDateString()) {
            $idsEnOperacion = DB::table('informacion_operativa')
                ->whereRaw("LOWER(estatus) = 'operacion'")
                ->pluck('unidad_id')
                ->toArray();
            if (! empty($idsEnOperacion)) {
                $queryEncierros->whereNotIn('historial_operativo.unidad_id', $idsEnOperacion);
            }
        }

        $encierros = $queryEncierros
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                'historial_operativo.id as id_historial',
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
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->select(
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                    'historial_operativo.id as id_historial',
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                $this->tipoUnidadFromUnidadesRaw('tipo'),
                $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->select(
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                'historial_operativo.id as id_historial',
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
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->select(
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
                    'informacion_operativa.id as id_historial',
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
        $fechaHoyMex = Carbon::now('America/Mexico_City')->toDateString();
        $esHoy = ($fecha === $fechaHoyMex || $fecha === Carbon::today()->toDateString());

        // Si es el día de hoy y aún no existe el snapshot de inicio, asegurar su creación
        if ($esHoy) {
            \App\Helpers\BitacoraHelper::ensureInicioSnapshot(false);
        }

        // 1. Inicio (unidades que iniciaron en mantenimiento o percance)
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->whereIn(DB::raw('LOWER(historial_operativo.estatus)'), ['mantenimiento', 'percance'])
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                'historial_operativo.estatus',
                DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.motivo_estatus), ''), UPPER(historial_operativo.estatus)) as motivo_estatus"),
                DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.falla_reportada), ''), NULLIF(TRIM(historial_operativo.falla), ''), NULLIF(TRIM(historial_operativo.diagnostico), ''), NULLIF(TRIM(historial_operativo.observaciones), ''), NULLIF(TRIM(historial_operativo.motivo_estatus), ''), '-') as falla")
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        // Fallback 1: Si es hoy y el snapshot de inicio no tiene unidades en mantenimiento pero en informacion_operativa sí las hay
        if ($inicio->isEmpty() && $esHoy) {
            $inicio = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->whereIn(DB::raw('LOWER(informacion_operativa.estatus)'), ['mantenimiento', 'percance'])
                ->select(
                    'informacion_operativa.id as id_historial',
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
                    'informacion_operativa.estatus',
                    DB::raw("COALESCE(NULLIF(TRIM(informacion_operativa.motivo_estatus), ''), UPPER(informacion_operativa.estatus)) as motivo_estatus"),
                    DB::raw("COALESCE(NULLIF(TRIM(informacion_operativa.falla_reportada), ''), NULLIF(TRIM(informacion_operativa.falla), ''), NULLIF(TRIM(informacion_operativa.diagnostico), ''), NULLIF(TRIM(informacion_operativa.observaciones), ''), NULLIF(TRIM(informacion_operativa.motivo_estatus), ''), '-') as falla")
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // Fallback 2: Si es un día histórico y no hay snapshot de inicio, buscar en el cierre o inicio del día previo
        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->where('fecha_historial', $prevDate)
                ->whereIn('momento', ['FIN', 'INICIO'])
                ->whereIn(DB::raw('LOWER(historial_operativo.estatus)'), ['mantenimiento', 'percance'])
                ->select(
                    'historial_operativo.id as id_historial',
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                    'historial_operativo.estatus',
                    DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.motivo_estatus), ''), UPPER(historial_operativo.estatus)) as motivo_estatus"),
                    DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.falla_reportada), ''), NULLIF(TRIM(historial_operativo.falla), ''), NULLIF(TRIM(historial_operativo.diagnostico), ''), NULLIF(TRIM(historial_operativo.observaciones), ''), NULLIF(TRIM(historial_operativo.motivo_estatus), ''), '-') as falla")
                )
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 2. Cambios (solo de mantenimiento o admin)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->whereIn('roles.codigo', ['MANTENIMIENTO', 'ADMINISTRADOR', 'CARGA_DE_COMBUSTIBLE'])
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                $this->tipoUnidadFromUnidadesRaw('tipo'),
                $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->whereIn(DB::raw('LOWER(historial_operativo.estatus)'), ['mantenimiento', 'percance'])
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                'historial_operativo.estatus',
                DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.motivo_estatus), ''), UPPER(historial_operativo.estatus)) as motivo_estatus"),
                DB::raw("COALESCE(NULLIF(TRIM(historial_operativo.falla_reportada), ''), NULLIF(TRIM(historial_operativo.falla), ''), NULLIF(TRIM(historial_operativo.diagnostico), ''), NULLIF(TRIM(historial_operativo.observaciones), ''), NULLIF(TRIM(historial_operativo.motivo_estatus), ''), '-') as falla")
            )
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        if ($fin->isEmpty() && $esHoy) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->whereIn(DB::raw('LOWER(informacion_operativa.estatus)'), ['mantenimiento', 'percance'])
                ->select(
                    'informacion_operativa.id as id_historial',
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
                    'informacion_operativa.estatus',
                    DB::raw("COALESCE(NULLIF(TRIM(informacion_operativa.motivo_estatus), ''), UPPER(informacion_operativa.estatus)) as motivo_estatus"),
                    DB::raw("COALESCE(NULLIF(TRIM(informacion_operativa.falla_reportada), ''), NULLIF(TRIM(informacion_operativa.falla), ''), NULLIF(TRIM(informacion_operativa.diagnostico), ''), NULLIF(TRIM(informacion_operativa.observaciones), ''), NULLIF(TRIM(informacion_operativa.motivo_estatus), ''), '-') as falla")
                )
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        // 4. Registros de checklists/cargas de mantenimiento (conservar funcionalidad histórica previa)
        $checklists = DB::table('historial_mantenimiento')
            ->join('unidades', 'historial_mantenimiento.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->whereDate('historial_mantenimiento.fecha_registro', $fecha)
            ->select(
                'historial_mantenimiento.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_mantenimiento.tipo_vehiculo', 'tipo'),
                $this->tipoUnidadRaw('historial_mantenimiento.tipo_vehiculo', 'tipo_unidad'),
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
     * Prioriza el snapshot de cierre 'FIN' y utiliza 'INICIO' como fallback.
     */
    public function getHistorialAlimentadorasAyer()
    {
        $hoy = \Carbon\Carbon::now('America/Mexico_City')->toDateString();

        // Obtener dinámicamente la última fecha operativa anterior registrada en el historial
        $fechaAyer = DB::table('historial_operativo')
            ->where('fecha_historial', '<', $hoy)
            ->max('fecha_historial');

        if (!$fechaAyer) {
            $fechaAyer = \Carbon\Carbon::yesterday()->toDateString();
        }

        $queryBase = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fechaAyer)
            ->whereRaw('LOWER(historial_operativo.tipo) != ?', ['urbanuss']) // Solo alimentadoras
            ->whereNotNull('historial_operativo.ruta')
            ->whereRaw("TRIM(historial_operativo.ruta) != ''")
            ->select(
                'historial_operativo.id as id_historial',
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
                'historial_operativo.ruta',
                'historial_operativo.numero_tarjeton',
                'historial_operativo.nombre_conductor'
            )
            ->orderBy('historial_operativo.ruta')
            ->orderBy('unidades.numero_eco');

        // 1. Prioridad: 'FIN' (estado de cierre operativo de la jornada anterior)
        $momentoUsado = 'FIN';
        $registros = (clone $queryBase)->where('momento', 'FIN')->get();

        // 2. Fallback: 'INICIO' (si no se generó snapshot de cierre FIN)
        if ($registros->isEmpty()) {
            $momentoUsado = 'INICIO';
            $registros = (clone $queryBase)->where('momento', 'INICIO')->get();
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
                'tipo_unidad' => $row->tipo_unidad,
                'tarjeton' => $row->numero_tarjeton,
                'conductor' => $row->nombre_conductor
            ];
        }

        return response()->json([
            'fecha' => $fechaAyer,
            'momento' => $momentoUsado,
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
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->select(
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
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

        // Obtener la bitácora de cambios y movimientos registrados para esta fecha
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                $this->tipoUnidadFromUnidadesRaw('tipo'),
                $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
                'usuarios.nombre_completo as usuario_nombre',
                'roles.nombre as usuario_rol',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'desc')
            ->get();

        return response()->json([
            'fecha' => $fecha,
            'programacion' => $programacion,
            'cambios' => $cambios,
            'resumen' => [
                'total_programadas' => $totalProgramadas,
                'operacion' => $operacionCount,
                'reserva' => $reservaCount,
                'mantenimiento' => $mantenimientoCount,
                'percance' => $percanceCount,
                'con_conductor' => $conConductorCount,
                'sin_conductor' => $sinConductorCount,
                'total_cambios' => $cambios->count(),
                'por_tipo' => array_values($porTipoMap),
                'por_ruta' => array_values($porRutaMap)
            ]
        ]);
    }

    /**
     * Obtiene el historial de Mesa de Control para una fecha específica.
     */
    public function getHistorialMesaControl($fecha)
    {
        $hasRelevoHist = Schema::hasColumn('historial_operativo', 'relevo_tarjeton');
        $hasRelevoInfo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');
        $hasSalidaPatioHist = Schema::hasColumn('historial_operativo', 'hora_salida_patio');
        $hasSalidaPatioInfo = Schema::hasColumn('informacion_operativa', 'hora_salida_patio');
        $hasAcopleHist = Schema::hasColumn('historial_operativo', 'acople');
        $hasAcopleInfo = Schema::hasColumn('informacion_operativa', 'acople');

        // 1. Inicio
        $inicio = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'INICIO')
            ->select(
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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

        if ($inicio->isEmpty()) {
            $prevDate = Carbon::parse($fecha)->subDay()->toDateString();
            $inicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->where('fecha_historial', $prevDate)
                ->where('momento', 'FIN')
                ->select(
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                    $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
        }

        // 2. Cambios (Bitácora de movimientos)
        $cambios = DB::table('bitacora_cambios_unidades')
            ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
            ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
            ->where('bitacora_cambios_unidades.fecha', $fecha)
            ->select(
                'bitacora_cambios_unidades.id',
                'unidades.numero_eco as economico',
                $this->tipoUnidadFromUnidadesRaw('tipo'),
                $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
                'usuarios.nombre_completo as usuario_nombre',
                'roles.nombre as usuario_rol',
                'bitacora_cambios_unidades.tipo_accion',
                'bitacora_cambios_unidades.estatus_anterior',
                'bitacora_cambios_unidades.estatus_nuevo',
                'bitacora_cambios_unidades.detalles',
                'bitacora_cambios_unidades.created_at as hora'
            )
            ->orderBy('bitacora_cambios_unidades.created_at', 'desc')
            ->get();

        // 3. Fin / Estado Actual
        $fin = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->where('fecha_historial', $fecha)
            ->where('momento', 'FIN')
            ->select(
                'unidades.numero_eco as economico',
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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

        if ($fin->isEmpty() && $fecha === Carbon::today()->toDateString()) {
            $fin = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->select(
                    'unidades.numero_eco as economico',
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
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
                ->orderBy('informacion_operativa.tipo')
                ->orderBy('unidades.numero_eco')
                ->get();
        }

        return response()->json([
            'fecha' => $fecha,
            'inicio' => $inicio,
            'cambios' => $cambios,
            'fin' => $fin,
            'resumen' => [
                'total_cambios' => $cambios->count(),
                'total_operacion' => $fin->filter(fn($u) => str_contains(strtolower($u->estatus ?? ''), 'operaci'))->count(),
                'total_reserva' => $fin->filter(fn($u) => str_contains(strtolower($u->estatus ?? ''), 'reserva'))->count(),
                'total_mantenimiento' => $fin->filter(fn($u) => str_contains(strtolower($u->estatus ?? ''), 'mantenimiento'))->count(),
                'total_percance' => $fin->filter(fn($u) => str_contains(strtolower($u->estatus ?? ''), 'percance'))->count(),
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
                    ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
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
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo'),
                    $this->tipoUnidadRaw('informacion_operativa.tipo', 'tipo_unidad'),
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
                        ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
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
                        $this->tipoUnidadRaw('informacion_operativa_manana.tipo', 'tipo'),
                        $this->tipoUnidadRaw('informacion_operativa_manana.tipo', 'tipo_unidad'),
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
                    ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
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
                        $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo'),
                        $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad'),
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
                    ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
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
                        $this->tipoUnidadFromUnidadesRaw('tipo'),
                        $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
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
                return response()->json(['status' => 'error', 'message' => 'Registro histórico no encontrado'], 404);
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
            // 1. Cargas de combustible registradas para esa fecha
            $cargasRaw = DB::table('historial_mantenimiento')
                ->join('unidades', 'historial_mantenimiento.unidad_id', '=', 'unidades.id')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->where(function($q) use ($fecha) {
                    $q->where('historial_mantenimiento.fecha_ultima_carga', $fecha)
                      ->orWhere(function($sub) use ($fecha) {
                          $sub->where(function($nullDate) {
                              $nullDate->whereNull('historial_mantenimiento.fecha_ultima_carga')
                                       ->orWhereRaw("TRIM(CAST(historial_mantenimiento.fecha_ultima_carga AS VARCHAR)) = ''");
                          })->where(function($regDate) use ($fecha) {
                              $regDate->whereDate('historial_mantenimiento.fecha_registro', $fecha)
                                      ->orWhereDate('historial_mantenimiento.created_at', $fecha);
                          });
                      });
                })
                ->where(function($q) {
                    $q->whereNotNull('historial_mantenimiento.litros_combustible')
                      ->orWhereNotNull('historial_mantenimiento.litros_adblue')
                      ->orWhereNotNull('historial_mantenimiento.kilometraje')
                      ->orWhereNotNull('historial_mantenimiento.nivel_combustible')
                      ->orWhereNotNull('historial_mantenimiento.numero_cincho');
                })
                ->select(
                    'historial_mantenimiento.id as id_historial',
                    'unidades.numero_eco as economico',
                    'historial_mantenimiento.tipo_vehiculo',
                    'unidades.tipo as u_tipo',
                    'transportes.nombre as t_nombre',
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
                ->orderByDesc('historial_mantenimiento.id')
                ->get();

            $resolverTipo = function($eco, $tipoVehiculo, $uTipo, $tNombre) {
                $ecoNum = (int) preg_replace('/\D/', '', (string) $eco);
                $tv = strtoupper(trim((string) ($tipoVehiculo ?? '')));
                if (in_array($tv, ['URBANUSS', 'URBANUS', 'ZAFIRO', 'VAGONETA', 'ORION', 'ORIÓN'], true)) {
                    return $tv === 'URBANUS' ? 'URBANUSS' : ($tv === 'ORIÓN' ? 'ORION' : $tv);
                }
                if ($ecoNum >= 1 && $ecoNum <= 99) return 'URBANUSS';
                if ($ecoNum >= 100 && $ecoNum <= 199) return 'ZAFIRO';
                if ($ecoNum >= 200 && $ecoNum <= 299) return 'VAGONETA';
                if ($ecoNum >= 400 && $ecoNum <= 499) return 'ORION';
                $fallback = strtoupper(trim((string) ($uTipo ?: $tNombre ?: 'DIESEL')));
                return $fallback === 'URBANUS' ? 'URBANUSS' : $fallback;
            };

            // Deduplicar por económico conservando el registro más reciente de esa fecha
            $cargasPorEco = [];
            foreach ($cargasRaw as $row) {
                $ecoKey = trim((string) $row->economico);
                if (isset($cargasPorEco[$ecoKey])) {
                    continue;
                }
                $tipoNormalizado = $resolverTipo($row->economico, $row->tipo_vehiculo, $row->u_tipo, $row->t_nombre);
                $row->tipo = $tipoNormalizado;
                $row->tipo_unidad = $tipoNormalizado;
                unset($row->tipo_vehiculo, $row->u_tipo, $row->t_nombre);
                $cargasPorEco[$ecoKey] = $row;
            }

            $cargas = collect(array_values($cargasPorEco))->sortBy('economico')->values();

            // Si no hay en historial_mantenimiento, checar unidades que tienen fecha_ultima_carga exactamente en esa fecha
            if ($cargas->isEmpty()) {
                $cargasUnidades = DB::table('unidades')
                    ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                    ->where('unidades.fecha_ultima_carga', $fecha)
                    ->where(function($sub) {
                        $sub->whereNotNull('unidades.litros_combustible')
                            ->orWhereNotNull('unidades.litros_adblue')
                            ->orWhereNotNull('unidades.kilometraje');
                    })
                    ->select(
                        DB::raw('NULL as id_historial'),
                        'unidades.numero_eco as economico',
                        'unidades.tipo as u_tipo',
                        'transportes.nombre as t_nombre',
                        'unidades.nivel_combustible',
                        'unidades.litros_combustible',
                        'unidades.nivel_adblue',
                        'unidades.litros_adblue',
                        'unidades.numero_cincho',
                        'unidades.numero_cincho_adblue',
                        'unidades.kilometraje',
                        'unidades.odometro',
                        'unidades.fecha_ultima_carga',
                        'unidades.fecha_ultima_carga as hora_guardado'
                    )
                    ->orderBy('unidades.numero_eco')
                    ->get()
                    ->map(function($row) use ($resolverTipo) {
                        $tipoNormalizado = $resolverTipo($row->economico, null, $row->u_tipo, $row->t_nombre);
                        $row->tipo = $tipoNormalizado;
                        $row->tipo_unidad = $tipoNormalizado;
                        unset($row->u_tipo, $row->t_nombre);
                        return $row;
                    });
                $cargas = $cargasUnidades;
            }

            // 2. Cambios en bitácora relacionados a combustible
            $cambios = collect();
            if (Schema::hasTable('bitacora_cambios_unidades')) {
                $cambios = DB::table('bitacora_cambios_unidades')
                    ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
                    ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
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
                        $this->tipoUnidadFromUnidadesRaw('tipo'),
                        $this->tipoUnidadFromUnidadesRaw('tipo_unidad'),
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

    /**
     * Reporte Historial Integral de Unidades (Analítica, Línea de Tiempo y Movimientos).
     */
    public function getHistorialUnidades(Request $request)
    {
        try {
            $economico = trim((string)$request->input('economico', ''));
            $tipoUnidad = trim((string)$request->input('tipo_unidad', 'TODOS'));
            $estatusFiltro = strtolower(trim((string)$request->input('estatus', 'todos')));
            $conductorFiltro = strtolower(trim((string)$request->input('conductor', '')));
            $rutaFiltro = strtolower(trim((string)$request->input('ruta', '')));
            $corridaFiltro = trim((string)$request->input('corrida', ''));
            $motivoFallaFiltro = strtolower(trim((string)$request->input('motivo_falla', '')));
            $incidenciaFiltro = strtolower(trim((string)$request->input('incidencia', 'todas')));
            $soloIncidencias = filter_var($request->input('solo_incidencias', false), FILTER_VALIDATE_BOOLEAN);

            $hoy = Carbon::today('America/Mexico_City')->toDateString();
            $hasta = $request->input('hasta') ?: $hoy;
            $desde = $request->input('desde') ?: Carbon::parse($hasta)->subDays(30)->toDateString();

            // Asegurar orden desde <= hasta
            if ($desde > $hasta) {
                $temp = $desde;
                $desde = $hasta;
                $hasta = $temp;
            }

            // Helper para obtener mapa de columnas existentes en una tabla de forma segura
            $getColsMap = function (string $table): array {
                try {
                    if (!Schema::hasTable($table)) return [];
                    $cols = Schema::getColumnListing($table);
                    $map = [];
                    foreach ($cols as $c) {
                        $map[strtolower($c)] = true;
                    }
                    return $map;
                } catch (\Throwable $e) {
                    return [];
                }
            };

            $unidadesCols = $getColsMap('unidades');
            $hasUnidadesTipo = isset($unidadesCols['tipo']);

            // Catálogo completo de unidades para selector y filtros
            $unidadesCatalogo = collect();
            try {
                $unidadesCatalogo = DB::table('unidades')
                    ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                    ->select(
                        'unidades.id',
                        'unidades.numero_eco as economico',
                        $hasUnidadesTipo ? $this->tipoUnidadFromUnidadesRaw('tipo') : DB::raw("transportes.nombre as tipo"),
                        $hasUnidadesTipo ? $this->tipoUnidadFromUnidadesRaw('tipo_unidad') : DB::raw("transportes.nombre as tipo_unidad")
                    )
                    ->orderBy('unidades.numero_eco')
                    ->get();
            } catch (\Throwable $e) {
                \Log::warning('Aviso catálogo unidades en getHistorialUnidades: ' . $e->getMessage());
            }

            // Mapa de unidades por id y por numero_eco
            $unidadPorEco = [];
            foreach ($unidadesCatalogo as $u) {
                $ecoKey = ltrim(trim((string)$u->economico), '0') ?: '0';
                $unidadPorEco[$ecoKey] = $u;
                $unidadPorEco[trim((string)$u->economico)] = $u;
            }

            // Helper para seleccionar columna con fallback seguro a otra columna o NULL
            $safeCol = function (string $table, array $colsMap, string $col, ?string $alias = null, ?string $fallbackCol = null) {
                $targetAlias = $alias ?: $col;
                if (isset($colsMap[strtolower($col)])) {
                    return $alias ? "{$table}.{$col} as {$alias}" : "{$table}.{$col}";
                }
                if ($fallbackCol && isset($colsMap[strtolower($fallbackCol)])) {
                    return "{$table}.{$fallbackCol} as {$targetAlias}";
                }
                return DB::raw("NULL as {$targetAlias}");
            };

            $registrosPorDia = [];

            // 1. Obtener registros de historial_operativo en el rango de fechas
            $histCols = $getColsMap('historial_operativo');
            if (!empty($histCols) && isset($histCols['fecha_historial'])) {
                try {
                    $queryHist = DB::table('historial_operativo')
                        ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                        ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                        ->whereBetween('historial_operativo.fecha_historial', [$desde, $hasta]);

                    if (!empty($economico) && strtoupper($economico) !== 'TODAS' && strtoupper($economico) !== 'TODOS') {
                        $ecoPad = str_pad(ltrim($economico, '0'), 3, '0', STR_PAD_LEFT);
                        $queryHist->where(function ($q) use ($economico, $ecoPad) {
                            $q->where('unidades.numero_eco', $economico)
                              ->orWhere('unidades.numero_eco', $ecoPad)
                              ->orWhereRaw("LTRIM(CAST(unidades.numero_eco AS VARCHAR), '0') = ?", [ltrim($economico, '0')]);
                        });
                    }

                    if (!empty($tipoUnidad) && strtoupper($tipoUnidad) !== 'TODOS' && strtoupper($tipoUnidad) !== 'TODAS') {
                        $hasHistTipo = isset($histCols['tipo']);
                        $queryHist->where(function ($q) use ($tipoUnidad, $hasHistTipo, $hasUnidadesTipo) {
                            $q->whereRaw("UPPER(TRIM(CAST(transportes.nombre AS VARCHAR))) = ?", [strtoupper($tipoUnidad)]);
                            if ($hasHistTipo) {
                                $q->orWhereRaw("UPPER(TRIM(CAST(historial_operativo.tipo AS VARCHAR))) = ?", [strtoupper($tipoUnidad)]);
                            }
                            if ($hasUnidadesTipo) {
                                $q->orWhereRaw("UPPER(TRIM(CAST(unidades.tipo AS VARCHAR))) = ?", [strtoupper($tipoUnidad)]);
                            }
                        });
                    }

                    $hasHistTipoCol = isset($histCols['tipo']);
                    $selectCols = [
                        'historial_operativo.id as id_historial',
                        'historial_operativo.fecha_historial',
                        $safeCol('historial_operativo', $histCols, 'momento'),
                        'unidades.id as unidad_id',
                        'unidades.numero_eco as economico',
                        ($hasHistTipoCol && $hasUnidadesTipo) ? $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo') : DB::raw("transportes.nombre as tipo"),
                        ($hasHistTipoCol && $hasUnidadesTipo) ? $this->tipoUnidadRaw('historial_operativo.tipo', 'tipo_unidad') : DB::raw("transportes.nombre as tipo_unidad"),
                        $safeCol('historial_operativo', $histCols, 'ruta'),
                        $safeCol('historial_operativo', $histCols, 'numero_tarjeton'),
                        $safeCol('historial_operativo', $histCols, 'nombre_conductor'),
                        $safeCol('historial_operativo', $histCols, 'estatus'),
                        $safeCol('historial_operativo', $histCols, 'falla'),
                        $safeCol('historial_operativo', $histCols, 'motivo'),
                        $safeCol('historial_operativo', $histCols, 'motivo_estatus'),
                        $safeCol('historial_operativo', $histCols, 'corridas'),
                        $safeCol('historial_operativo', $histCols, 'ciclo'),
                        $safeCol('historial_operativo', $histCols, 'hora_salida_patio', 'hora_salida_patio', 'hora_programada'),
                        $safeCol('historial_operativo', $histCols, 'observaciones'),
                        $safeCol('historial_operativo', $histCols, 'relevo_tarjeton'),
                        $safeCol('historial_operativo', $histCols, 'relevo_conductor'),
                        $safeCol('historial_operativo', $histCols, 'relevo_hora'),
                        $safeCol('historial_operativo', $histCols, 'tarjeton_maniobrista'),
                        $safeCol('historial_operativo', $histCols, 'nombre_maniobrista'),
                        $safeCol('historial_operativo', $histCols, 'hora_encierro'),
                        $safeCol('historial_operativo', $histCols, 'hora_real_salida_patio', 'hora_real_salida_patio', 'hora_salida'),
                        $safeCol('historial_operativo', $histCols, 'hora_de_acople', 'hora_de_acople', 'acople'),
                    ];

                    $historialRaw = $queryHist->select($selectCols)
                        ->orderBy('historial_operativo.fecha_historial', 'desc')
                        ->orderBy('unidades.numero_eco', 'asc')
                        ->get();

                    foreach ($historialRaw as $row) {
                        $ecoKey = trim((string)$row->economico);
                        $fechaKey = substr((string)$row->fecha_historial, 0, 10);
                        $key = "{$fechaKey}_{$ecoKey}";

                        if (!isset($registrosPorDia[$key])) {
                            $registrosPorDia[$key] = [
                                'fecha' => $fechaKey,
                                'unidad_id' => $row->unidad_id,
                                'economico' => $row->economico,
                                'tipo_unidad' => $row->tipo_unidad ?: ($row->tipo ?: 'URBANUSS'),
                                'ruta' => $row->ruta,
                                'numero_tarjeton' => $row->numero_tarjeton,
                                'nombre_conductor' => $row->nombre_conductor,
                                'relevo_tarjeton' => $row->relevo_tarjeton,
                                'relevo_conductor' => $row->relevo_conductor,
                                'relevo_hora' => $row->relevo_hora,
                                'tarjeton_maniobrista' => $row->tarjeton_maniobrista,
                                'nombre_maniobrista' => $row->nombre_maniobrista,
                                'estatus' => strtolower(trim((string)$row->estatus)),
                                'estatus_inicio' => $row->momento === 'INICIO' ? strtolower(trim((string)$row->estatus)) : null,
                                'estatus_fin' => $row->momento === 'FIN' ? strtolower(trim((string)$row->estatus)) : null,
                                'falla' => $row->falla,
                                'motivo' => $row->motivo,
                                'motivo_estatus' => $row->motivo_estatus,
                                'corridas' => is_numeric($row->corridas) ? (int)$row->corridas : 0,
                                'ciclo' => $row->ciclo,
                                'hora_salida_patio' => $row->hora_salida_patio,
                                'hora_real_salida_patio' => $row->hora_real_salida_patio,
                                'hora_de_acople' => $row->hora_de_acople,
                                'hora_encierro' => $row->hora_encierro,
                                'observaciones' => $row->observaciones,
                                'momento_fuente' => $row->momento,
                                'movimientos' => []
                            ];
                        } else {
                            if ($row->momento === 'FIN') {
                                $registrosPorDia[$key]['estatus_fin'] = strtolower(trim((string)$row->estatus));
                                $registrosPorDia[$key]['estatus'] = strtolower(trim((string)$row->estatus));
                                if (!empty($row->falla)) $registrosPorDia[$key]['falla'] = $row->falla;
                                if (!empty($row->motivo_estatus)) $registrosPorDia[$key]['motivo_estatus'] = $row->motivo_estatus;
                                if (!empty($row->hora_encierro)) $registrosPorDia[$key]['hora_encierro'] = $row->hora_encierro;
                                if (is_numeric($row->corridas) && (int)$row->corridas > 0) {
                                    $registrosPorDia[$key]['corridas'] = (int)$row->corridas;
                                }
                            } elseif ($row->momento === 'INICIO') {
                                $registrosPorDia[$key]['estatus_inicio'] = strtolower(trim((string)$row->estatus));
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::error('Error consultando historial_operativo en getHistorialUnidades: ' . $e->getMessage());
                }
            }

            // 2. Si el rango incluye HOY y no tiene registros en historial_operativo, incorporar informacion_operativa
            $infoCols = $getColsMap('informacion_operativa');
            if ($hoy >= $desde && $hoy <= $hasta && !empty($infoCols)) {
                try {
                    $queryHoy = DB::table('informacion_operativa')
                        ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                        ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id');

                    if (!empty($economico) && strtoupper($economico) !== 'TODAS' && strtoupper($economico) !== 'TODOS') {
                        $ecoPad = str_pad(ltrim($economico, '0'), 3, '0', STR_PAD_LEFT);
                        $queryHoy->where(function ($q) use ($economico, $ecoPad) {
                            $q->where('unidades.numero_eco', $economico)
                              ->orWhere('unidades.numero_eco', $ecoPad)
                              ->orWhereRaw("LTRIM(CAST(unidades.numero_eco AS VARCHAR), '0') = ?", [ltrim($economico, '0')]);
                        });
                    }

                    if (!empty($tipoUnidad) && strtoupper($tipoUnidad) !== 'TODOS' && strtoupper($tipoUnidad) !== 'TODAS') {
                        $queryHoy->where(function ($q) use ($tipoUnidad, $hasUnidadesTipo) {
                            $q->whereRaw("UPPER(TRIM(CAST(transportes.nombre AS VARCHAR))) = ?", [strtoupper($tipoUnidad)]);
                            if ($hasUnidadesTipo) {
                                $q->orWhereRaw("UPPER(TRIM(CAST(unidades.tipo AS VARCHAR))) = ?", [strtoupper($tipoUnidad)]);
                            }
                        });
                    }

                    $filasHoy = $queryHoy->select([
                        'informacion_operativa.id',
                        'unidades.id as unidad_id',
                        'unidades.numero_eco as economico',
                        $hasUnidadesTipo ? $this->tipoUnidadFromUnidadesRaw('tipo') : DB::raw("transportes.nombre as tipo"),
                        $hasUnidadesTipo ? $this->tipoUnidadFromUnidadesRaw('tipo_unidad') : DB::raw("transportes.nombre as tipo_unidad"),
                        $safeCol('informacion_operativa', $infoCols, 'ruta'),
                        $safeCol('informacion_operativa', $infoCols, 'numero_tarjeton'),
                        $safeCol('informacion_operativa', $infoCols, 'nombre_conductor'),
                        $safeCol('informacion_operativa', $infoCols, 'estatus'),
                        $safeCol('informacion_operativa', $infoCols, 'falla'),
                        $safeCol('informacion_operativa', $infoCols, 'motivo'),
                        $safeCol('informacion_operativa', $infoCols, 'motivo_estatus'),
                        $safeCol('informacion_operativa', $infoCols, 'corridas'),
                        $safeCol('informacion_operativa', $infoCols, 'ciclo'),
                        $safeCol('informacion_operativa', $infoCols, 'hora_salida_patio', 'hora_salida_patio', 'hora_programada'),
                        $safeCol('informacion_operativa', $infoCols, 'observaciones'),
                        $safeCol('informacion_operativa', $infoCols, 'relevo_tarjeton'),
                        $safeCol('informacion_operativa', $infoCols, 'relevo_conductor'),
                        $safeCol('informacion_operativa', $infoCols, 'relevo_hora'),
                        $safeCol('informacion_operativa', $infoCols, 'tarjeton_maniobrista'),
                        $safeCol('informacion_operativa', $infoCols, 'nombre_maniobrista'),
                        $safeCol('informacion_operativa', $infoCols, 'hora_encierro'),
                        $safeCol('informacion_operativa', $infoCols, 'hora_real_salida_patio', 'hora_real_salida_patio', 'hora_salida'),
                        $safeCol('informacion_operativa', $infoCols, 'hora_de_acople', 'hora_de_acople', 'acople'),
                    ])->get();

                    foreach ($filasHoy as $hRow) {
                        $ecoKey = trim((string)$hRow->economico);
                        $key = "{$hoy}_{$ecoKey}";
                        if (!isset($registrosPorDia[$key])) {
                            $registrosPorDia[$key] = [
                                'fecha' => $hoy,
                                'unidad_id' => $hRow->unidad_id,
                                'economico' => $hRow->economico,
                                'tipo_unidad' => $hRow->tipo_unidad ?: ($hRow->tipo ?: 'URBANUSS'),
                                'ruta' => $hRow->ruta,
                                'numero_tarjeton' => $hRow->numero_tarjeton,
                                'nombre_conductor' => $hRow->nombre_conductor,
                                'relevo_tarjeton' => $hRow->relevo_tarjeton,
                                'relevo_conductor' => $hRow->relevo_conductor,
                                'relevo_hora' => $hRow->relevo_hora,
                                'tarjeton_maniobrista' => $hRow->tarjeton_maniobrista,
                                'nombre_maniobrista' => $hRow->nombre_maniobrista,
                                'estatus' => strtolower(trim((string)$hRow->estatus)) ?: 'disponible',
                                'estatus_inicio' => strtolower(trim((string)$hRow->estatus)) ?: 'disponible',
                                'estatus_fin' => strtolower(trim((string)$hRow->estatus)) ?: 'disponible',
                                'falla' => $hRow->falla,
                                'motivo' => $hRow->motivo,
                                'motivo_estatus' => $hRow->motivo_estatus,
                                'corridas' => is_numeric($hRow->corridas) ? (int)$hRow->corridas : 0,
                                'ciclo' => $hRow->ciclo,
                                'hora_salida_patio' => $hRow->hora_salida_patio,
                                'hora_real_salida_patio' => $hRow->hora_real_salida_patio,
                                'hora_de_acople' => $hRow->hora_de_acople,
                                'hora_encierro' => $hRow->hora_encierro,
                                'observaciones' => $hRow->observaciones,
                                'momento_fuente' => 'EN_VIVO',
                                'movimientos' => []
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::error('Error consultando informacion_operativa en getHistorialUnidades: ' . $e->getMessage());
                }
            }

            // 3. Cargar movimientos de bitacora_cambios_unidades entre $desde y $hasta
            $bitacoraCols = $getColsMap('bitacora_cambios_unidades');
            if (!empty($bitacoraCols) && isset($bitacoraCols['fecha'])) {
                try {
                    $queryCambios = DB::table('bitacora_cambios_unidades')
                        ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
                        ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
                        ->whereBetween('bitacora_cambios_unidades.fecha', [$desde, $hasta]);

                    if (!empty($economico) && strtoupper($economico) !== 'TODAS' && strtoupper($economico) !== 'TODOS') {
                        $ecoPad = str_pad(ltrim($economico, '0'), 3, '0', STR_PAD_LEFT);
                        $queryCambios->where(function ($q) use ($economico, $ecoPad) {
                            $q->where('unidades.numero_eco', $economico)
                              ->orWhere('unidades.numero_eco', $ecoPad)
                              ->orWhereRaw("LTRIM(CAST(unidades.numero_eco AS VARCHAR), '0') = ?", [ltrim($economico, '0')]);
                        });
                    }

                    $cambiosRaw = $queryCambios->select([
                        'bitacora_cambios_unidades.id',
                        'bitacora_cambios_unidades.fecha',
                        'unidades.numero_eco as economico',
                        $safeCol('bitacora_cambios_unidades', $bitacoraCols, 'tipo_accion'),
                        $safeCol('bitacora_cambios_unidades', $bitacoraCols, 'estatus_anterior'),
                        $safeCol('bitacora_cambios_unidades', $bitacoraCols, 'estatus_nuevo'),
                        $safeCol('bitacora_cambios_unidades', $bitacoraCols, 'detalles'),
                        $safeCol('bitacora_cambios_unidades', $bitacoraCols, 'created_at'),
                        'usuarios.nombre_completo as usuario_nombre'
                    ])->orderBy('bitacora_cambios_unidades.id', 'asc')->get();

                    foreach ($cambiosRaw as $cRow) {
                        $fKey = substr((string)$cRow->fecha, 0, 10);
                        $eKey = trim((string)$cRow->economico);
                        $k = "{$fKey}_{$eKey}";

                        $movimientoObj = [
                            'id' => $cRow->id,
                            'tipo_accion' => $cRow->tipo_accion,
                            'estatus_anterior' => $cRow->estatus_anterior,
                            'estatus_nuevo' => $cRow->estatus_nuevo,
                            'detalles' => $cRow->detalles,
                            'hora' => $cRow->created_at ? Carbon::parse($cRow->created_at)->format('H:i') : null,
                            'usuario_nombre' => $cRow->usuario_nombre ?: 'Sistema'
                        ];

                        if (isset($registrosPorDia[$k])) {
                            $registrosPorDia[$k]['movimientos'][] = $movimientoObj;
                        } else {
                            $uObj = $unidadPorEco[$eKey] ?? null;
                            $registrosPorDia[$k] = [
                                'fecha' => $fKey,
                                'unidad_id' => $uObj ? $uObj->id : null,
                                'economico' => $cRow->economico,
                                'tipo_unidad' => $uObj ? ($uObj->tipo_unidad ?: $uObj->tipo) : 'URBANUSS',
                                'ruta' => 'Sin ruta',
                                'numero_tarjeton' => null,
                                'nombre_conductor' => null,
                                'relevo_tarjeton' => null,
                                'relevo_conductor' => null,
                                'relevo_hora' => null,
                                'tarjeton_maniobrista' => null,
                                'nombre_maniobrista' => null,
                                'estatus' => strtolower(trim((string)$cRow->estatus_nuevo)) ?: 'reserva',
                                'estatus_inicio' => strtolower(trim((string)$cRow->estatus_anterior)),
                                'estatus_fin' => strtolower(trim((string)$cRow->estatus_nuevo)),
                                'falla' => null,
                                'motivo' => $cRow->detalles,
                                'motivo_estatus' => $cRow->detalles,
                                'corridas' => 0,
                                'ciclo' => null,
                                'hora_salida_patio' => null,
                                'hora_real_salida_patio' => null,
                                'hora_de_acople' => null,
                                'hora_encierro' => null,
                                'observaciones' => null,
                                'momento_fuente' => 'BITACORA',
                                'movimientos' => [$movimientoObj]
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::error('Error consultando bitacora_cambios_unidades en getHistorialUnidades: ' . $e->getMessage());
                }
            }

            // 4. Filtrar y ordenar los registros resultantes
            $registrosFiltrados = [];
            foreach ($registrosPorDia as $item) {
                // Filtro por estatus
                if (!empty($estatusFiltro) && $estatusFiltro !== 'todos') {
                    $st = strtolower($item['estatus'] ?? '');
                    if ($estatusFiltro === 'operacion' && $st !== 'operacion') continue;
                    if ($estatusFiltro === 'mantenimiento' && $st !== 'mantenimiento') continue;
                    if ($estatusFiltro === 'reserva' && $st !== 'reserva') continue;
                }

                // Filtro por conductor
                if (!empty($conductorFiltro)) {
                    $matchTitular = str_contains(strtolower($item['nombre_conductor'] ?? ''), $conductorFiltro) ||
                                    str_contains(strtolower($item['numero_tarjeton'] ?? ''), $conductorFiltro);
                    $matchRelevo = str_contains(strtolower($item['relevo_conductor'] ?? ''), $conductorFiltro) ||
                                   str_contains(strtolower($item['relevo_tarjeton'] ?? ''), $conductorFiltro);
                    if (!$matchTitular && !$matchRelevo) continue;
                }

                // Filtro por ruta
                if (!empty($rutaFiltro)) {
                    if (!str_contains(strtolower($item['ruta'] ?? ''), $rutaFiltro)) continue;
                }

                // Filtro por corrida
                if (!empty($corridaFiltro)) {
                    $cVal = (string)($item['corridas'] ?? '');
                    if ($cVal !== $corridaFiltro) continue;
                }

                // Filtro por motivo de falla
                if (!empty($motivoFallaFiltro)) {
                    $fallaTxt = strtolower(($item['falla'] ?? '') . ' ' . ($item['motivo_estatus'] ?? '') . ' ' . ($item['motivo'] ?? ''));
                    if (!str_contains($fallaTxt, $motivoFallaFiltro)) continue;
                }

                // Filtro por tipo de incidencia específica
                if ($incidenciaFiltro === 'fallas') {
                    $esMantenimiento = ($item['estatus'] === 'mantenimiento') || !empty($item['falla']);
                    if (!$esMantenimiento) continue;
                } elseif ($incidenciaFiltro === 'movimientos') {
                    $tieneMovimientos = !empty($item['movimientos']) && count($item['movimientos']) > 0;
                    if (!$tieneMovimientos) continue;
                } elseif ($incidenciaFiltro === 'relevos') {
                    $tieneRelevo = !empty($item['relevo_conductor']) || !empty($item['relevo_tarjeton']);
                    if (!$tieneRelevo) continue;
                } elseif ($soloIncidencias) {
                    $esMantenimiento = ($item['estatus'] === 'mantenimiento') || !empty($item['falla']);
                    $tieneMovimientos = !empty($item['movimientos']) && count($item['movimientos']) > 0;
                    $esReserva = ($item['estatus'] === 'reserva');
                    if (!$esMantenimiento && !$tieneMovimientos && !$esReserva) continue;
                }

                $registrosFiltrados[] = $item;
            }

            // Ordenar por fecha DESC, economico ASC
            usort($registrosFiltrados, function ($a, $b) {
                $cmp = strcmp($b['fecha'], $a['fecha']);
                if ($cmp !== 0) return $cmp;
                return (int)$a['economico'] <=> (int)$b['economico'];
            });

            // 5. Estadísticas y Agregaciones Gráficas
            $totalDias = count($registrosFiltrados);
            $diasOperacion = 0;
            $diasMantenimiento = 0;
            $diasReserva = 0;
            $totalCorridas = 0;
            $totalMovimientos = 0;
            $conductoresUnicos = [];
            $conductoresConteo = [];
            $rutasConteo = [];
            $motivosFallaConteo = [];
            $actividadPorFecha = [];

            foreach ($registrosFiltrados as $reg) {
                $st = $reg['estatus'] ?? 'operacion';
                if ($st === 'operacion') {
                    $diasOperacion++;
                } elseif ($st === 'mantenimiento') {
                    $diasMantenimiento++;
                } else {
                    $diasReserva++;
                }

                $totalCorridas += (int)($reg['corridas'] ?? 0);
                $totalMovimientos += count($reg['movimientos'] ?? []);

                // Conductores
                if (!empty($reg['nombre_conductor'])) {
                    $cNombre = trim($reg['nombre_conductor']);
                    $conductoresUnicos[$cNombre] = true;
                    $conductoresConteo[$cNombre] = ($conductoresConteo[$cNombre] ?? 0) + 1;
                }
                if (!empty($reg['relevo_conductor'])) {
                    $rNombre = trim($reg['relevo_conductor']);
                    $conductoresUnicos[$rNombre] = true;
                }

                // Rutas
                if (!empty($reg['ruta']) && $reg['ruta'] !== 'Sin ruta') {
                    $rutasConteo[$reg['ruta']] = ($rutasConteo[$reg['ruta']] ?? 0) + 1;
                }

                // Motivos de mantenimiento / fallas
                $motivoTexto = !empty($reg['falla']) ? $reg['falla'] : (!empty($reg['motivo_estatus']) ? $reg['motivo_estatus'] : null);
                if ($motivoTexto && ($st === 'mantenimiento' || str_contains(strtolower($motivoTexto), 'falla'))) {
                    if (function_exists('mb_substr') && function_exists('mb_strtoupper')) {
                        $motivoLimpio = mb_strtoupper(trim(mb_substr($motivoTexto, 0, 45, 'UTF-8')), 'UTF-8');
                    } else {
                        $motivoLimpio = strtoupper(trim(preg_replace('/[\x80-\xFF]/', '', substr($motivoTexto, 0, 45))));
                    }
                    if ($motivoLimpio !== '') {
                        $motivosFallaConteo[$motivoLimpio] = ($motivosFallaConteo[$motivoLimpio] ?? 0) + 1;
                    }
                }

                // Actividad por fecha
                $f = $reg['fecha'];
                if (!isset($actividadPorFecha[$f])) {
                    $actividadPorFecha[$f] = [
                        'fecha' => $f,
                        'operacion' => 0,
                        'mantenimiento' => 0,
                        'reserva' => 0,
                        'corridas' => 0,
                    ];
                }
                if ($st === 'operacion') $actividadPorFecha[$f]['operacion']++;
                elseif ($st === 'mantenimiento') $actividadPorFecha[$f]['mantenimiento']++;
                else $actividadPorFecha[$f]['reserva']++;
                $actividadPorFecha[$f]['corridas'] += (int)($reg['corridas'] ?? 0);
            }

            // Top Conductores
            arsort($conductoresConteo);
            $topConductores = [];
            foreach (array_slice($conductoresConteo, 0, 6, true) as $nombre => $dias) {
                $topConductores[] = [
                    'nombre' => $nombre,
                    'dias' => $dias,
                ];
            }

            // Top Rutas
            arsort($rutasConteo);
            $topRutas = [];
            foreach (array_slice($rutasConteo, 0, 6, true) as $ruta => $cant) {
                $topRutas[] = [
                    'ruta' => $ruta,
                    'dias' => $cant,
                ];
            }

            // Top Motivos Falla
            arsort($motivosFallaConteo);
            $topMotivosFalla = [];
            foreach (array_slice($motivosFallaConteo, 0, 5, true) as $motivo => $cant) {
                $topMotivosFalla[] = [
                    'motivo' => $motivo,
                    'total' => $cant,
                ];
            }

            // Tendencia diaria ordenada cronológicamente ASC para gráficas
            ksort($actividadPorFecha);
            $tendenciaDiaria = array_values($actividadPorFecha);

            $tasaDisponibilidad = $totalDias > 0 ? round(($diasOperacion / $totalDias) * 100, 1) : 0;

            return response()->json([
                'rango' => [
                    'desde' => $desde,
                    'hasta' => $hasta,
                    'unidad_filtrada' => $economico ?: 'TODAS',
                    'tipo_unidad_filtrado' => $tipoUnidad ?: 'TODOS',
                ],
                'resumen' => [
                    'total_dias_registros' => $totalDias,
                    'dias_operacion' => $diasOperacion,
                    'dias_mantenimiento' => $diasMantenimiento,
                    'dias_reserva' => $diasReserva,
                    'tasa_disponibilidad_pct' => $tasaDisponibilidad,
                    'total_corridas' => $totalCorridas,
                    'total_movimientos' => $totalMovimientos,
                    'total_conductores_unicos' => count($conductoresUnicos),
                ],
                'graficas' => [
                    'distribucion_estatus' => [
                        ['name' => 'Operación', 'valor' => $diasOperacion, 'color' => '#10b981'],
                        ['name' => 'Mantenimiento', 'valor' => $diasMantenimiento, 'color' => '#ef4444'],
                        ['name' => 'Reserva', 'valor' => $diasReserva, 'color' => '#3b82f6'],
                    ],
                    'tendencia_diaria' => $tendenciaDiaria,
                    'top_conductores' => $topConductores,
                    'top_rutas' => $topRutas,
                    'motivos_falla' => $topMotivosFalla,
                ],
                'unidades_catalogo' => $unidadesCatalogo,
                'registros' => $registrosFiltrados,
            ]);

        } catch (\Throwable $e) {
            \Log::error('Error en getHistorialUnidades: ' . $e->getMessage() . ' ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Error al consultar el historial de unidades: ' . $e->getMessage(),
                'rango' => [
                    'desde' => $request->input('desde', ''),
                    'hasta' => $request->input('hasta', ''),
                    'unidad_filtrada' => $request->input('economico', 'TODAS'),
                    'tipo_unidad_filtrado' => $request->input('tipo_unidad', 'TODOS'),
                ],
                'resumen' => [
                    'total_dias_registros' => 0,
                    'dias_operacion' => 0,
                    'dias_mantenimiento' => 0,
                    'dias_reserva' => 0,
                    'tasa_disponibilidad_pct' => 0,
                    'total_corridas' => 0,
                    'total_movimientos' => 0,
                    'total_conductores_unicos' => 0,
                ],
                'graficas' => [
                    'distribucion_estatus' => [],
                    'tendencia_diaria' => [],
                    'top_conductores' => [],
                    'top_rutas' => [],
                    'motivos_falla' => [],
                ],
                'unidades_catalogo' => [],
                'registros' => [],
            ], 200);
        }
    }
}




