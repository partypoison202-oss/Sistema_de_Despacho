<?php

namespace App\Http\Controllers\API;

use App\Helpers\BitacoraHelper;
use App\Http\Controllers\Controller;
use App\Models\Conductor;
use App\Services\SyncService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class DespachoController extends Controller
{
    /**
     * Retorna la versión actual del estado de unidades para sincronización en tiempo real.
     */
    public function getVersionUnidades()
    {
        return response()->json([
            'status' => 'success',
            'version' => SyncService::getVersion(),
            'timestamp' => microtime(true),
        ])->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    /**
     * Importa y sincroniza los datos usando el formato estandarizado:
     * TIPO_UNIDAD, RUTA, ECONOMICO, TARJETON, NOMBRE_CONDUCTOR
     */
    public function importar(Request $request)
    {
        set_time_limit(300);
        DB::reconnect();

        $request->validate([
            'unidades' => 'required|array',
        ]);

        $unidadesExcel = $request->input('unidades');
        $fechaHoy = Carbon::today()->toDateString();

        // Al iniciar una importación masiva, liberar todos los conductores
        DB::table('conductores')->update(['estado_servicio' => 'disponible']);
        // Al iniciar una importación masiva, liberar todos los conductores
        DB::table('conductores')->update(['estado_servicio' => 'disponible']);

        // Pre-cargar todas las unidades en memoria
        $todasLasUnidades = DB::table('unidades')
            ->select('id', 'numero_eco')
            ->get()
            ->keyBy('numero_eco');

        \Log::info('Unidades pre-cargadas', ['total' => $todasLasUnidades->count()]);

        $registrosParaInsertar = [];
        $filasIgnoradas = 0;
        $unidadesNoEncontradas = [];
        \Log::info('Cabeceras del Excel detectadas:', array_keys($unidadesExcel[0]));

        foreach ($unidadesExcel as $fila) {
            // Normalizar ECO: eliminar ceros a la izquierda y espacios
            $numeroEcoRaw = trim((string) ($fila['ECONOMICO'] ?? ''));
            $numeroEco = ltrim($numeroEcoRaw, '0');
            if ($numeroEco === '' || ! is_numeric($numeroEco)) {
                $filasIgnoradas++;
                \Log::info('Fila ignorada: ECO no válido', ['eco' => $numeroEcoRaw]);

                continue;
            }

            $nombreConductor = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));

            if (strtoupper($nombreConductor) === 'FALTA DE UNIDAD') {
                $filasIgnoradas++;
                \Log::info('Fila ignorada: falta de unidad', ['eco' => $numeroEco]);

                continue;
            }

            // Padear a 3 dígitos
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $todasLasUnidades->get($numeroEcoClean);

            if (! $unidad) {
                $unidadesNoEncontradas[] = $numeroEcoClean;
                \Log::warning('Unidad no encontrada', ['eco' => $numeroEcoClean]);

                continue;
            }

            $tarjetonLimpio = trim((string) ($fila['TARJETON'] ?? ''));
            if ($tarjetonLimpio !== '' && $nombreConductor !== '') {
                try {
                    DB::table('conductores')->updateOrInsert(
                        ['tarjeton' => $tarjetonLimpio],
                        [
                            'nombre' => $nombreConductor,
                            'estado_servicio' => 'en_servicio',
                            'updated_at' => now(),
                        ]
                    );
                } catch (\Exception $e) {
                    \Log::error('Error al auto-alimentar conductores en importación: '.$e->getMessage());
                }
            }

            $horaAcople = trim((string) ($fila['HORA_SALIDA_PATIO'] ?? '')) ?: trim((string) ($fila['HORA_DE_ACOPLE'] ?? ''));
            $horaEncierro = trim((string) ($fila['HORA_DE_ENCIERRO'] ?? $fila['HORA_ENCIERRO'] ?? $fila['ENCIERRO'] ?? ''));

            // Usamos unidad_id como clave para sobrescribir duplicados si existen en el mismo Excel
            $registrosParaInsertar[$unidad->id] = [
                'unidad_id' => $unidad->id,
                'ruta' => trim((string) ($fila['RUTA'] ?? '')),
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $nombreConductor,
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'Sin estatus')),
                'corridas' => trim((string) ($fila['CORRIDA'] ?? '')) === '' ? null : (int) trim((string) ($fila['CORRIDA'] ?? '')),
                'hora_salida_patio' => $horaAcople === '' ? null : $horaAcople,
                'hora_encierro' => $horaEncierro === '' ? null : $horaEncierro,
                'itinerario' => filter_var($fila['ITINERARIO'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'hora_desincorporacion' => trim((string) ($fila['HORA_DESINCORPORACION'] ?? '')) ?: null,
                'fecha_registro' => now(),
            ];
        }

        \Log::info('Registros preparados', [
            'para_insertar' => count($registrosParaInsertar),
            'ignorados' => $filasIgnoradas,
            'sin_unidad_en_bd' => count($unidadesNoEncontradas),
        ]);

        if (empty($registrosParaInsertar)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se encontraron registros válidos para importar.',
            ], 422);
        }

        try {
            DB::table('informacion_operativa')->delete();

            // Eliminar el snapshot de inicio anterior para hoy para que se regenere con el nuevo Excel
            DB::table('historial_operativo')
                ->where('fecha_historial', $fechaHoy)
                ->where('momento', 'INICIO')
                ->delete();

            \Log::info('Delete ejecutado sin transacción');

            $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
            $registrosFiltrados = array_map(function ($row) use ($targetCols) {
                return array_intersect_key($row, $targetCols);
            }, $registrosParaInsertar);

            $chunks = array_chunk($registrosFiltrados, 50);
            foreach ($chunks as $chunk) {
                DB::table('informacion_operativa')->insert($chunk);
            }

            // Forzar la creación inmediata del snapshot de INICIO con los nuevos datos
            BitacoraHelper::ensureInicioSnapshot();

            // Forzar la creación inmediata del snapshot de INICIO con los nuevos datos
            BitacoraHelper::ensureInicioSnapshot();

            \Log::info('Todos los registros insertados', [
                'total' => count($registrosParaInsertar),
            ]);

            $mensaje = count($registrosParaInsertar).' registros importados exitosamente.';
            if (! empty($unidadesNoEncontradas)) {
                $mensaje .= ' ('.count($unidadesNoEncontradas).' unidades no encontradas en la BD)';
            }

            return response()->json([
                'status' => 'success',
                'message' => $mensaje,
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Error importación', [
                'mensaje' => $e->getMessage(),
                'archivo' => $e->getFile(),
                'linea' => $e->getLine(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Determina si una unidad en estatus de operación se encuentra temporalmente
     * desincorporada por itinerario según la hora actual en México.
     */
    public static function esDesincorporadaPorItinerario($estatus, $itinerario, $horaDesinc, $horaIncorp, $horaActual = null): bool
    {
        $estatusNorm = strtolower(trim((string) $estatus));
        if ($estatusNorm !== 'operacion') {
            return false;
        }

        $hDesinc = trim((string) $horaDesinc);
        $hIncorp = trim((string) $horaIncorp);

        if ($hDesinc === '' || $hIncorp === '' || $hDesinc === '--:--' || $hIncorp === '--:--') {
            return false;
        }

        $hDesinc = substr($hDesinc, 0, 5);
        $hIncorp = substr($hIncorp, 0, 5);

        if (!preg_match('/^\d{2}:\d{2}$/', $hDesinc) || !preg_match('/^\d{2}:\d{2}$/', $hIncorp)) {
            return false;
        }

        if ($horaActual === null) {
            $horaActual = Carbon::now('America/Mexico_City')->format('H:i');
        } else {
            $horaActual = substr(trim((string) $horaActual), 0, 5);
        }

        if ($hDesinc < $hIncorp) {
            return ($horaActual >= $hDesinc && $horaActual < $hIncorp);
        }

        if ($hDesinc > $hIncorp) {
            return ($horaActual >= $hDesinc || $horaActual < $hIncorp);
        }

        return false;
    }

    /**
     * Normaliza el tipo de transporte para soportar variantes como urbanus / urbanuss.
     */
    public static function normalizarTiposTransporte($tipo): array
    {
        $tipoNorm = strtolower(trim((string) $tipo));
        if ($tipoNorm === 'urbanuss' || $tipoNorm === 'urbanus') {
            return ['urbanuss', 'urbanus'];
        }
        return [$tipoNorm];
    }

    /**
     * Obtiene el conteo de unidades con registro operativo hoy, agrupadas por tipo.
     */
    public function conteoUnidadesPorTipo(Request $request)
    {
        self::procesarEncierrosAutomaticos();

        $horaActual = Carbon::now('America/Mexico_City')->format('H:i');

        $registros = DB::table('informacion_operativa')
            ->select('tipo', 'unidad_id', 'itinerario', 'hora_desincorporacion', 'hora_incorporacion')
            ->whereRaw("LOWER(COALESCE(estatus, '')) = 'operacion'")
            ->get();

        $resultado = [];
        $agrupados = [];

        foreach ($registros as $item) {
            if (empty($item->tipo)) {
                continue;
            }

            // Si está desincorporada por itinerario actualmente, no se cuenta en operación activa
            if (self::esDesincorporadaPorItinerario('operacion', $item->itinerario, $item->hora_desincorporacion, $item->hora_incorporacion, $horaActual)) {
                continue;
            }

            $tipo = strtolower(trim($item->tipo));
            if ($tipo === 'urbanus') {
                $tipo = 'urbanuss';
            }
            $agrupados[$tipo][$item->unidad_id] = true;
        }

        foreach ($agrupados as $tipo => $unidades) {
            $resultado[$tipo] = count($unidades);
        }

        return response()->json($resultado, 200);
    }

    public function conteoUnidadesEncierro(Request $request)
    {
        self::procesarEncierrosAutomaticos();

        $hoy = Carbon::now('America/Mexico_City')->toDateString();

        $hasHoraRealSalidaPatio = Schema::hasColumn('informacion_operativa', 'hora_real_salida_patio');
        $hasHoraSalida = Schema::hasColumn('informacion_operativa', 'hora_salida');
        $colSalidaInfo = $hasHoraRealSalidaPatio ? 'hora_real_salida_patio' : ($hasHoraSalida ? 'hora_salida' : null);

        $queryConteos = DB::table('informacion_operativa')
            ->select('tipo', DB::raw('count(distinct unidad_id) as total'))
            ->whereRaw("LOWER(estatus) = 'operacion'");

        if ($colSalidaInfo) {
            $queryConteos->whereNotNull($colSalidaInfo)
                ->whereRaw("TRIM(CAST({$colSalidaInfo} AS VARCHAR)) != ''");
        }

        $conteos = $queryConteos->whereNotExists(function ($query) use ($hoy) {
                $query->select(DB::raw(1))
                    ->from('historial_operativo')
                    ->whereColumn('historial_operativo.unidad_id', 'informacion_operativa.unidad_id')
                    ->where('historial_operativo.momento', 'ENCIERRO')
                    ->where('historial_operativo.fecha_historial', $hoy);
            })
            ->groupBy('tipo')
            ->get();

        $resultado = [];
        foreach ($conteos as $item) {
            if (! empty($item->tipo)) {
                $tipo = strtolower(trim($item->tipo));
                if ($tipo === 'urbanus') {
                    $tipo = 'urbanuss';
                }
                if (isset($resultado[$tipo])) {
                    $resultado[$tipo] += (int) $item->total;
                } else {
                    $resultado[$tipo] = (int) $item->total;
                }
            }
        }

        return response()->json($resultado, 200);
    }

    /**
     * Obtiene el listado de unidades que tienen registro operativo para hoy
     * y pertenecen al tipo de transporte solicitado.
     */
    public function listarUnidadesPorTipo(Request $request, $tipo)
    {
        self::verificarYEjecutarCambioDiaAutomatico();
        self::procesarEncierrosAutomaticos();

        $tiposBusqueda = self::normalizarTiposTransporte($tipo);

        $hasHoraEncierro = Cache::remember('col_info_op_hora_encierro', 86400, fn() => Schema::hasColumn('informacion_operativa', 'hora_encierro'));
        $hasHoraRealSalidaPatio = Cache::remember('col_info_op_hora_real_salida_patio', 86400, fn() => Schema::hasColumn('informacion_operativa', 'hora_real_salida_patio'));
        $hasHoraSalida = Cache::remember('col_info_op_hora_salida', 86400, fn() => Schema::hasColumn('informacion_operativa', 'hora_salida'));
        $colSalidaPatio = $hasHoraRealSalidaPatio 
            ? 'informacion_operativa.hora_real_salida_patio' 
            : ($hasHoraSalida ? 'informacion_operativa.hora_salida as hora_real_salida_patio' : DB::raw('NULL as hora_real_salida_patio'));

        $unidades = DB::table('unidades')
            ->join('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
            ->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), $tiposBusqueda)
            ->select(
                'unidades.id as unidad_id',
                'unidades.numero_eco',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.estatus',
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.tarjeton_maniobrista',
                'informacion_operativa.nombre_maniobrista',
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
                'informacion_operativa.hora_salida_patio',
                'informacion_operativa.acople',
                $colSalidaPatio,
                $hasHoraEncierro ? 'informacion_operativa.hora_encierro' : DB::raw('NULL as hora_encierro'),
                'informacion_operativa.folio_mantenimiento',
                'informacion_operativa.numero_incidencia',
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.transporte_patio_norte',
                'informacion_operativa.mantenimiento_conductor',
                'informacion_operativa.mantenimiento_tarjeton',
                'informacion_operativa.mantenimiento_ruta',
                'informacion_operativa.mantenimiento_corrida',
                'informacion_operativa.mantenimiento_kilometraje',
                'informacion_operativa.relevo_conductor',
                'informacion_operativa.relevo_tarjeton',
                'informacion_operativa.relevo_hora',
                'informacion_operativa.itinerario',
                'informacion_operativa.hora_incorporacion',
                'informacion_operativa.hora_desincorporacion'
            )
            ->distinct()
            ->orderBy('unidades.numero_eco')
            ->get();

        // ─── Pre-cargar movimientos manuales de HOY para evitar N+1 ─────────────
        $unidadIds = $unidades->pluck('unidad_id')->toArray();
        $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();
        $horaActual = Carbon::now('America/Mexico_City')->format('H:i');

        // Obtener el último movimiento de conductor de hoy por unidad.
        // NO filtramos whereNotNull(conductor_asignado) porque un retiro sin
        // reemplazo (conductor_asignado = NULL) también debe contar como evento.
        $ultimoMovPorUnidad = DB::table('plataforma_movimientos')
            ->whereIn('unidad_id', $unidadIds)
            ->whereDate('created_at', $fechaHoy)
            ->whereIn('tipo_movimiento', ['RETIRO_CONDUCTOR', 'ASIGNACION_CONDUCTOR'])
            ->orderBy('created_at', 'asc')
            ->get()
            ->groupBy('unidad_id')
            ->map(fn ($movs) => $movs->last());

        // Pre-cargar registros de ENCIERRO de hoy
        $encierrosHoy = DB::table('historial_operativo')
            ->whereIn('unidad_id', $unidadIds)
            ->where('momento', 'ENCIERRO')
            ->where('fecha_historial', $fechaHoy)
            ->orderByDesc('id')
            ->get()
            ->groupBy('unidad_id')
            ->map(fn ($items) => $items->first());

        // Pre-cargar despachos de hoy con hora de salida no nula
        $hasHoraRealEnHistorial = Cache::remember('col_hist_op_hora_real_salida_patio', 86400, fn() => Schema::hasColumn('historial_operativo', 'hora_real_salida_patio'));
        $hasHoraSalidaEnHistorial = Cache::remember('col_hist_op_hora_salida', 86400, fn() => Schema::hasColumn('historial_operativo', 'hora_salida'));
        $colSalidaHistorial = $hasHoraRealEnHistorial ? 'hora_real_salida_patio' : ($hasHoraSalidaEnHistorial ? 'hora_salida' : null);

        $despachosHoy = collect();
        if ($colSalidaHistorial && ! empty($unidadIds)) {
            $despachosHoy = DB::table('historial_operativo')
                ->whereIn('unidad_id', $unidadIds)
                ->where('fecha_historial', $fechaHoy)
                ->whereNotNull($colSalidaHistorial)
                ->whereRaw("TRIM(CAST({$colSalidaHistorial} AS VARCHAR)) != ''")
                ->orderByDesc('id')
                ->get()
                ->groupBy('unidad_id')
                ->map(fn ($items) => $items->first());
        }
        // ──────────────────────────────────────────────────────────────────────

        // Si hay registros de encierro de hoy para unidades que actualmente están en operación
        // (por ejemplo, unidades que fueron desincorporadas y luego reincorporadas a operación),
        // eliminamos esos encierros obsoletos de historial_operativo para mantener consistencia.
        $unidadesEnOperacionIds = $unidades->filter(function ($u) {
            $st = strtolower(trim($u->estatus ?? 'operacion'));
            return ! in_array($st, ['reserva', 'no_programada', 'mantenimiento', 'percance'], true);
        })->pluck('unidad_id')->toArray();

        if (! empty($unidadesEnOperacionIds)) {
            $encierrosObsoletosIds = $encierrosHoy->keys()
                ->intersect($unidadesEnOperacionIds)
                ->toArray();
            if (! empty($encierrosObsoletosIds)) {
                DB::table('historial_operativo')
                    ->whereIn('unidad_id', $encierrosObsoletosIds)
                    ->where('fecha_historial', $fechaHoy)
                    ->where('momento', 'ENCIERRO')
                    ->delete();
                foreach ($encierrosObsoletosIds as $eId) {
                    $encierrosHoy->forget($eId);
                }
            }
        }

        $unidades = $unidades->map(function ($unidad) use ($ultimoMovPorUnidad, $encierrosHoy, $despachosHoy, $horaActual, $colSalidaHistorial) {
            $estatusRaw = strtolower(trim($unidad->estatus ?? 'operacion'));
            $estatus = match ($estatusRaw) {
                'no_programada', 'reserva' => 'reserva',
                'mantenimiento' => 'mantenimiento',
                'percance' => 'percance',
                default => 'operacion',
            };

            $encierro = $estatus === 'operacion' ? null : $encierrosHoy->get($unidad->unidad_id);
            $yaEncerrada = ! is_null($encierro);

            $despacho = $despachosHoy->get($unidad->unidad_id);
            $horaDespachoHistorial = $despacho ? ($colSalidaHistorial ? ($despacho->{$colSalidaHistorial} ?? null) : null) : null;
            $horaEncierroHistorial = $encierro ? ($colSalidaHistorial ? ($encierro->{$colSalidaHistorial} ?? null) : null) : null;

            $horaRealSalida = $unidad->hora_real_salida_patio
                ?: ($horaEncierroHistorial ?: $horaDespachoHistorial);

            $estatusRaw = strtolower(trim($unidad->estatus ?? 'operacion'));
            $estatus = match ($estatusRaw) {
                'no_programada', 'reserva' => 'reserva',
                'mantenimiento' => 'mantenimiento',
                'percance' => 'percance',
                default => 'operacion',
            };

            // Si está encerrada pero sus datos en informacion_operativa se limpiaron por pasar a reserva,
            // restauramos los datos operativos que tuvo durante el turno desde el encierro / despacho
            $rutaEfectiva = $unidad->ruta ?: ($encierro?->ruta ?: $despacho?->ruta);
            $tarjetonOperativo = $unidad->tarjeton ?: ($encierro?->numero_tarjeton ?: $despacho?->numero_tarjeton);
            $conductorOperativo = $unidad->nombre_conductor ?: ($encierro?->nombre_conductor ?: $despacho?->nombre_conductor);
            $corridasEfectivas = $unidad->corridas ?: ($encierro?->corridas ?: $despacho?->corridas);
            $horaSalidaPatioEfectiva = $unidad->hora_salida_patio ?: ($encierro?->hora_salida_patio ?: $despacho?->hora_salida_patio);
            $acopleEfectivo = $unidad->acople ?: ($encierro?->acople ?: $despacho?->acople);

            $titularConductorResp = $conductorOperativo ?? null;
            $titularTarjetonResp = $tarjetonOperativo ?? '';
            $relevoConductorResp = $unidad->relevo_conductor ?: ($encierro?->relevo_conductor ?? null);
            $relevoTarjetonResp = $unidad->relevo_tarjeton ?: ($encierro?->relevo_tarjeton ?? null);
            $relevoHoraResp = $unidad->relevo_hora ?: ($encierro?->relevo_hora ?? null);

            $relevoYaVigente = false;

            // Paso 1: ¿El relevo programado ya entró en vigor según el reloj?
            if (! empty($relevoHoraResp) && ! empty($relevoConductorResp)) {
                if ($horaActual >= $relevoHoraResp) {
                    $titularConductorResp = $relevoConductorResp;
                    $titularTarjetonResp = $relevoTarjetonResp;
                    $relevoConductorResp = null;
                    $relevoTarjetonResp = null;
                    $relevoHoraResp = null;
                    $relevoYaVigente = true;
                }
            }

            // Paso 2: Evaluar movimientos manuales de hoy en plataforma
            $ultimoMov = $ultimoMovPorUnidad->get($unidad->unidad_id);
            if ($ultimoMov && $encierro && $ultimoMov->created_at <= $encierro->created_at) {
                $ultimoMov = null;
            }
            if ($ultimoMov) {
                $horaUltimoMov = Carbon::parse($ultimoMov->created_at)
                    ->setTimezone('America/Mexico_City')->format('H:i');
                $relevoHoraBase = $relevoHoraResp ?? '00:00';

                if (! empty($relevoHoraResp) && ! empty($relevoConductorResp)) {
                    // Si hay relevo programado:
                    if ($horaUltimoMov >= $relevoHoraBase) {
                        // Movimiento manual posterior a la hora del relevo: prioridad
                        if ($ultimoMov->conductor_asignado !== null) {
                            $titularConductorResp = $conductorOperativo;
                            $titularTarjetonResp = $tarjetonOperativo;
                        } else {
                            $titularConductorResp = null;
                            $titularTarjetonResp = null;
                        }
                        $relevoConductorResp = null;
                        $relevoTarjetonResp = null;
                        $relevoHoraResp = null;
                    } else {
                        // Movimiento manual previo a la hora del relevo:
                        // solo afecta al turno matutino si el relevo aún no está vigente.
                        if (! $relevoYaVigente) {
                            if ($ultimoMov->conductor_asignado !== null) {
                                $titularConductorResp = $conductorOperativo;
                                $titularTarjetonResp = $tarjetonOperativo;
                            } else {
                                $titularConductorResp = null;
                                $titularTarjetonResp = null;
                            }
                        }
                    }
                } else {
                    // No hay relevo programado
                    if ($ultimoMov->conductor_asignado !== null) {
                        $titularConductorResp = $conductorOperativo;
                        $titularTarjetonResp = $tarjetonOperativo;
                    } else {
                        $titularConductorResp = null;
                        $titularTarjetonResp = null;
                    }
                    $relevoConductorResp = null;
                    $relevoTarjetonResp = null;
                    $relevoHoraResp = null;
                }
            }

            $conductorEfectivo = $titularConductorResp;
            $tarjetonEfectivo = $titularTarjetonResp;

            return [
                'unidad_id' => $unidad->unidad_id,
                'numero_eco' => $unidad->numero_eco,
                'tarjeton' => $tarjetonEfectivo,
                'estatus' => $estatus,
                'ruta' => $rutaEfectiva,
                'nombre_conductor' => $conductorEfectivo,
                'titular_conductor' => $titularConductorResp,
                'titular_tarjeton' => $titularTarjetonResp,
                'tarjeton_maniobrista' => $unidad->tarjeton_maniobrista,
                'nombre_maniobrista' => $unidad->nombre_maniobrista,
                'falla' => $unidad->falla,
                'corridas' => $corridasEfectivas,
                'hora_salida_patio' => $horaSalidaPatioEfectiva,
                'acople' => $acopleEfectivo,
                'hora_real_salida_patio' => $horaRealSalida,
                'hora_encierro' => $estatus === 'operacion' ? null : ($encierro?->hora_encierro ?? ($unidad->hora_encierro ?? null)),
                'folio_mantenimiento' => $unidad->folio_mantenimiento,
                'numero_incidencia' => $unidad->numero_incidencia,
                'fecha_folio_mantenimiento' => $unidad->fecha_folio_mantenimiento,
                'falla_reportada' => $unidad->falla_reportada,
                'diagnostico' => $unidad->diagnostico,
                'transporte_patio_norte' => $unidad->transporte_patio_norte,
                'mantenimiento_conductor' => $unidad->mantenimiento_conductor,
                'mantenimiento_tarjeton' => $unidad->mantenimiento_tarjeton,
                'mantenimiento_ruta' => $unidad->mantenimiento_ruta,
                'mantenimiento_corrida' => $unidad->mantenimiento_corrida,
                'mantenimiento_kilometraje' => $unidad->mantenimiento_kilometraje,
                'relevo_conductor' => $relevoConductorResp,
                'relevo_tarjeton' => $relevoTarjetonResp,
                'relevo_hora' => $relevoHoraResp,
                'itinerario' => (bool) ($unidad->itinerario ?? false),
                'hora_incorporacion' => $unidad->hora_incorporacion ?? null,
                'hora_desincorporacion' => $unidad->hora_desincorporacion ?? null,
                'desincorporada_itinerario' => self::esDesincorporadaPorItinerario(
                    $estatus,
                    $unidad->itinerario,
                    $unidad->hora_desincorporacion,
                    $unidad->hora_incorporacion,
                    $horaActual
                ),
                'ya_encerrada' => $yaEncerrada,
            ];
        });

        return response()->json($unidades, 200);
    }

    /**
     * Busca una unidad por número de tarjetón para el tipo indicado.
     */
    public function buscarUnidadPorTarjeton($tipo, $tarjeton)
    {
        $tipoNormalizado = strtolower(trim($tipo));

        $tarjetonLimpio = trim($tarjeton);

        if ($tarjetonLimpio === '') {
            return response()->json(['status' => 'success', 'unidad' => null], 200);
        }

        $tiposBusqueda = self::normalizarTiposTransporte($tipo);

        $unidad = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), $tiposBusqueda)
            ->where('informacion_operativa.numero_tarjeton', $tarjetonLimpio)
            ->select('unidades.numero_eco as numero_eco', 'informacion_operativa.numero_tarjeton as tarjeton', 'informacion_operativa.estatus')
            ->first();

        if ($unidad) {
            $estatus = strtolower(trim($unidad->estatus ?? 'operacion'));
            if (! in_array($estatus, ['operacion', 'mantenimiento', 'reserva', 'percance'], true)) {
                $estatus = 'operacion';
            }
        }

        return response()->json(
            $unidad
                ? ['status' => 'success', 'unidad' => ['numero_eco' => $unidad->numero_eco, 'tarjeton' => $unidad->tarjeton, 'estatus' => $estatus]]
                : ['status' => 'success', 'unidad' => null],
            200
        );
    }

    /**
     * Obtiene información operativa filtrada por tipo de unidad
     */
    public function obtenerPorTipo($tipo)
    {
        $tiposBusqueda = self::normalizarTiposTransporte($tipo);

        $data = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), $tiposBusqueda)
            ->select(
                'unidades.numero_eco as economico',
                'informacion_operativa.ruta',
                DB::raw("COALESCE(NULLIF(informacion_operativa.relevo_tarjeton, ''), informacion_operativa.numero_tarjeton) as tarjeton"),
                DB::raw("COALESCE(NULLIF(informacion_operativa.relevo_conductor, ''), informacion_operativa.nombre_conductor) as conductor_nombre"),
                'informacion_operativa.nombre_conductor as titular_conductor',
                'informacion_operativa.numero_tarjeton as titular_tarjeton',
                'informacion_operativa.relevo_tarjeton',
                'informacion_operativa.relevo_conductor',
                'informacion_operativa.relevo_hora'
            )
            ->get();

        return response()->json($data, 200);
    }

    /**
     * Obtiene el detalle de una unidad específica por tipo y número ECO
     */
    public function obtenerDetalleUnidad($tipo, $numeroEco)
    {
        try {
            self::procesarEncierrosAutomaticos();

            $tiposBusqueda = self::normalizarTiposTransporte($tipo);

            $numeroEcoClean = str_pad(trim($numeroEco), 3, '0', STR_PAD_LEFT);

            $unidadBase = DB::table('unidades')
                ->where('numero_eco', $numeroEcoClean)
                ->first();

            $hasHoraEncierro = Schema::hasColumn('informacion_operativa', 'hora_encierro');
            $hasHoraRealSalidaPatio = Schema::hasColumn('informacion_operativa', 'hora_real_salida_patio');
            $hasHoraSalida = Schema::hasColumn('informacion_operativa', 'hora_salida');
            $colSalidaPatio = $hasHoraRealSalidaPatio 
                ? 'informacion_operativa.hora_real_salida_patio' 
                : ($hasHoraSalida ? 'informacion_operativa.hora_salida as hora_real_salida_patio' : DB::raw('NULL as hora_real_salida_patio'));

            $info = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->where('unidades.numero_eco', $numeroEcoClean)
                ->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), $tiposBusqueda)
                ->select(
                    'informacion_operativa.ruta',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.estatus',
                    'unidades.numero_eco',
                    'informacion_operativa.falla',
                    'informacion_operativa.corridas',
                    'informacion_operativa.ciclo',
                    'informacion_operativa.motivo',
                    'informacion_operativa.motivo_estatus',
                    'informacion_operativa.folio_mantenimiento',
                    'informacion_operativa.numero_incidencia',
                    'informacion_operativa.fecha_folio_mantenimiento',
                    'informacion_operativa.falla_reportada',
                    'informacion_operativa.diagnostico',
                    'informacion_operativa.firma_base64',
                    'informacion_operativa.hora_salida_patio',
                    'informacion_operativa.acople',
                    $colSalidaPatio,
                    $hasHoraEncierro ? 'informacion_operativa.hora_encierro' : DB::raw('NULL as hora_encierro'),
                    'informacion_operativa.observaciones',
                    'informacion_operativa.transporte_patio_norte',
                    'unidades.kilometraje',
                    'informacion_operativa.mantenimiento_conductor',
                    'informacion_operativa.mantenimiento_tarjeton',
                    'informacion_operativa.mantenimiento_ruta',
                    'informacion_operativa.mantenimiento_corrida',
                    'informacion_operativa.mantenimiento_kilometraje',
                    'informacion_operativa.relevo_conductor',
                    'informacion_operativa.relevo_tarjeton',
                    'informacion_operativa.relevo_hora',
                    'informacion_operativa.itinerario',
                    'informacion_operativa.hora_incorporacion',
                    'informacion_operativa.hora_desincorporacion'
                )
                ->first();

            $horaSalidaLegacy = null;
            if ($info && empty($info->hora_real_salida_patio) && empty($info->hora_salida_patio) && empty($info->acople)) {
                $registroBitacora = DB::table('bitacora_cambios_unidades')
                    ->where('unidad_id', $unidadBase->id)
                    ->where('tipo_accion', 'VALIDAR_DESPACHO')
                    ->orderByDesc('created_at')
                    ->first();

                if ($registroBitacora && ! empty($registroBitacora->detalles)) {
                    if (preg_match('/HORA SALIDA:\s*([0-9]{1,2}:[0-9]{2})/i', $registroBitacora->detalles, $matches)) {
                        $horaSalidaLegacy = strtoupper($matches[1]);
                    }
                }
            }

            if ($info) {
                $estatusRaw = strtolower(trim($info->estatus ?? 'operacion'));
                $estatus = match ($estatusRaw) {
                    'no_programada', 'reserva' => 'reserva',
                    'mantenimiento' => 'mantenimiento',
                    'percance' => 'percance',
                    default => 'operacion',
                };

                // Verificar si hubo un encierro hoy
                $encierroHoy = DB::table('historial_operativo')
                    ->where('unidad_id', $unidadBase->id)
                    ->where('momento', 'ENCIERRO')
                    ->where('fecha_historial', date('Y-m-d'))
                    ->orderByDesc('id')
                    ->first();

                // Si la unidad está desincorporada (reserva, mantenimiento, percance), NO debe tener conductor ni ruta asignados en servicio activo
                // EXCEPTO si tiene un encierro registrado hoy: en ese caso preservamos o restauramos los datos del encierro para poder visualizar la unidad en Encierro de Unidades
                if (in_array($estatus, ['mantenimiento', 'reserva', 'percance'], true)) {
                    if ($encierroHoy) {
                        $hasHoraRealHist = Schema::hasColumn('historial_operativo', 'hora_real_salida_patio');
                        $hasHoraSalidaHist = Schema::hasColumn('historial_operativo', 'hora_salida');
                        $colSalidaHist = $hasHoraRealHist ? 'hora_real_salida_patio' : ($hasHoraSalidaHist ? 'hora_salida' : null);

                        $despachoQuery = DB::table('historial_operativo')
                            ->where('unidad_id', $unidadBase->id)
                            ->where('fecha_historial', date('Y-m-d'));

                        if ($colSalidaHist) {
                            $despachoQuery->whereNotNull($colSalidaHist)
                                ->whereRaw("TRIM(CAST({$colSalidaHist} AS VARCHAR)) != ''");
                        }
                        $despachoHoy = $despachoQuery->orderByDesc('id')->first();

                        $horaSalidaHistVal = $despachoHoy ? ($despachoHoy->hora_real_salida_patio ?? ($despachoHoy->hora_salida ?? null)) : null;

                        $info->ruta = $encierroHoy->ruta ?: ($info->ruta ?: $despachoHoy?->ruta);
                        $info->nombre_conductor = $encierroHoy->nombre_conductor ?: ($info->nombre_conductor ?: $despachoHoy?->nombre_conductor);
                        $info->numero_tarjeton = $encierroHoy->numero_tarjeton ?: ($info->numero_tarjeton ?: $despachoHoy?->numero_tarjeton);
                        $info->corridas = $encierroHoy->corridas ?: ($info->corridas ?: $despachoHoy?->corridas);
                        $info->ciclo = $encierroHoy->ciclo ?: $info->ciclo;
                        $info->hora_salida_patio = $encierroHoy->hora_salida_patio ?: ($info->hora_salida_patio ?: $despachoHoy?->hora_salida_patio);
                        $info->acople = $encierroHoy->acople ?: ($info->acople ?: $despachoHoy?->acople);
                        $info->hora_real_salida_patio = $encierroHoy->hora_real_salida_patio ?? ($encierroHoy->hora_salida ?? ($info->hora_real_salida_patio ?: $horaSalidaHistVal));
                        $info->relevo_conductor = $encierroHoy->relevo_conductor ?: $info->relevo_conductor;
                        $info->relevo_tarjeton = $encierroHoy->relevo_tarjeton ?: $info->relevo_tarjeton;
                        $info->relevo_hora = $encierroHoy->relevo_hora ?: $info->relevo_hora;
                    } else {
                        $info->ruta = null;
                        $info->nombre_conductor = null;
                        $info->numero_tarjeton = null;
                        $info->corridas = null;
                        $info->ciclo = null;
                        $info->hora_salida_patio = null;
                        $info->acople = null;
                        $info->hora_real_salida_patio = null;
                        $info->relevo_conductor = null;
                        $info->relevo_tarjeton = null;
                        $info->relevo_hora = null;
                    }
                }

                if ($encierroHoy && $estatus !== 'operacion') {
                    $info->hora_encierro = $encierroHoy->hora_encierro;
                } elseif ($estatus === 'operacion') {
                    $info->hora_encierro = null;
                    if ($encierroHoy) {
                        DB::table('historial_operativo')
                            ->where('unidad_id', $unidadBase->id)
                            ->where('fecha_historial', date('Y-m-d'))
                            ->where('momento', 'ENCIERRO')
                            ->delete();
                        $encierroHoy = null;
                    }
                }
            }

            $titularConductorResp = $info ? $info->nombre_conductor : null;
            $titularTarjetonResp = $info ? ($info->numero_tarjeton ?? '') : '';
            $relevoConductorResp = $info ? ($info->relevo_conductor ?? null) : null;
            $relevoTarjetonResp = $info ? ($info->relevo_tarjeton ?? null) : null;
            $relevoHoraResp = $info ? ($info->relevo_hora ?? null) : null;

            if ($info) {
                $horaActual = Carbon::now('America/Mexico_City')->format('H:i');
                $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();
                $relevoYaVigente = false;

                // Paso 1: ¿El relevo programado ya entró en vigor según el reloj?
                if (! empty($info->relevo_hora) && ! empty($info->relevo_conductor)) {
                    if ($horaActual >= $info->relevo_hora) {
                        $titularConductorResp = $info->relevo_conductor;
                        $titularTarjetonResp = $info->relevo_tarjeton;
                        $relevoConductorResp = null;
                        $relevoTarjetonResp = null;
                        $relevoHoraResp = null;
                        $relevoYaVigente = true;
                    }
                }

                // Paso 2: Evaluar movimientos manuales de hoy en plataforma
                if ($unidadBase) {
                    $movManualQuery = DB::table('plataforma_movimientos')
                        ->where('unidad_id', $unidadBase->id)
                        ->whereDate('created_at', $fechaHoy)
                        ->whereIn('tipo_movimiento', ['RETIRO_CONDUCTOR', 'ASIGNACION_CONDUCTOR']);

                    if ($encierroHoy && ! empty($encierroHoy->created_at)) {
                        $movManualQuery->where('created_at', '>', $encierroHoy->created_at);
                    }

                    $ultimoMovManual = $movManualQuery->orderBy('created_at', 'desc')->first();

                    if ($ultimoMovManual) {
                        $horaUltimoMov = Carbon::parse($ultimoMovManual->created_at)
                            ->setTimezone('America/Mexico_City')->format('H:i');
                        $relevoHoraBase = $info->relevo_hora ?? '00:00';

                        if (! empty($info->relevo_hora) && ! empty($info->relevo_conductor)) {
                            // Si hay relevo programado:
                            if ($horaUltimoMov >= $relevoHoraBase) {
                                // Movimiento manual posterior a la hora del relevo: prioridad
                                if ($ultimoMovManual->conductor_asignado !== null) {
                                    $titularConductorResp = $info->nombre_conductor;
                                    $titularTarjetonResp = $info->numero_tarjeton;
                                } else {
                                    $titularConductorResp = null;
                                    $titularTarjetonResp = null;
                                }
                                $relevoConductorResp = null;
                                $relevoTarjetonResp = null;
                                $relevoHoraResp = null;
                            } else {
                                // Movimiento manual previo a la hora del relevo:
                                // solo afecta al turno matutino si el relevo aún no está vigente.
                                if (! $relevoYaVigente) {
                                    if ($ultimoMovManual->conductor_asignado !== null) {
                                        $titularConductorResp = $info->nombre_conductor;
                                        $titularTarjetonResp = $info->numero_tarjeton;
                                    } else {
                                        $titularConductorResp = null;
                                        $titularTarjetonResp = null;
                                    }
                                }
                            }
                        } else {
                            // No hay relevo programado
                            if ($ultimoMovManual->conductor_asignado !== null) {
                                $titularConductorResp = $info->nombre_conductor;
                                $titularTarjetonResp = $info->numero_tarjeton;
                            } else {
                                $titularConductorResp = null;
                                $titularTarjetonResp = null;
                            }
                            $relevoConductorResp = null;
                            $relevoTarjetonResp = null;
                            $relevoHoraResp = null;
                        }
                    }
                }
            }

            $conductorEfectivo = $titularConductorResp;
            $tarjetonEfectivo = ($titularTarjetonResp !== null && $titularTarjetonResp !== '') ? $titularTarjetonResp : '';

            return response()->json(
                $info ? [
                    'status' => 'success',
                    'asignado' => true,
                    'ruta' => $info->ruta,
                    'conductor' => $conductorEfectivo,
                    'tarjeton' => $tarjetonEfectivo,
                    'titular_conductor' => $titularConductorResp,
                    'titular_tarjeton' => $titularTarjetonResp,
                    'relevo_conductor' => $relevoConductorResp,
                    'relevo_tarjeton' => $relevoTarjetonResp,
                    'relevo_hora' => $relevoHoraResp,
                    'estatus' => $estatus,
                    'falla' => $info->falla,
                    'corridas' => $info->corridas,
                    'ciclo' => $info->ciclo,
                    'motivo' => $info->motivo,
                    'motivo_estatus' => $info->motivo_estatus,
                    'folio_mantenimiento' => $info->folio_mantenimiento,
                    'numero_incidencia' => $info->numero_incidencia,
                    'fecha_folio_mantenimiento' => $info->fecha_folio_mantenimiento,
                    'falla_reportada' => $info->falla_reportada,
                    'diagnostico' => $info->diagnostico,
                    'firma_base64' => $info->firma_base64,
                    'hora_salida_patio' => $info->hora_salida_patio,
                    'acople' => $info->acople,
                    'hora_real_salida_patio' => $info->hora_real_salida_patio,
                    'hora_encierro' => $info->hora_encierro ?? null,
                    'observaciones' => $info->observaciones,
                    'hora_real_salida_patio_legacy' => $horaSalidaLegacy,
                    'transporte_patio_norte' => $info->transporte_patio_norte,
                    'itinerario' => (bool) ($info->itinerario ?? false),
                    'hora_incorporacion' => $info->hora_incorporacion ?? null,
                    'hora_desincorporacion' => $info->hora_desincorporacion ?? null,
                    'desincorporada_itinerario' => self::esDesincorporadaPorItinerario(
                        $estatus,
                        $info->itinerario,
                        $info->hora_desincorporacion,
                        $info->hora_incorporacion
                    ),
                    'estatus_itinerario' => self::esDesincorporadaPorItinerario(
                        $estatus,
                        $info->itinerario,
                        $info->hora_desincorporacion,
                        $info->hora_incorporacion
                    ) ? 'DESINCORPORADA POR ITINERARIO' : null,
                    'kilometraje' => $info->kilometraje,
                    'mantenimiento_conductor' => $info->mantenimiento_conductor,
                    'mantenimiento_tarjeton' => $info->mantenimiento_tarjeton,
                    'mantenimiento_ruta' => $info->mantenimiento_ruta,
                    'mantenimiento_corrida' => $info->mantenimiento_corrida,
                    'mantenimiento_kilometraje' => $info->mantenimiento_kilometraje,
                    // Nuevos campos de mantenimiento
                    'nivel_combustible' => $unidadBase->nivel_combustible ?? null,
                    'nivel_adblue' => $unidadBase->nivel_adblue ?? null,
                    'numero_cincho' => $unidadBase->numero_cincho ?? null,
                    'fecha_ultima_carga' => $unidadBase->fecha_ultima_carga ?? null,
                    'ya_encerrada' => ! is_null($encierroHoy) && $estatus !== 'operacion',
                ] : [
                    'status' => 'success',
                    'asignado' => false,
                    'ruta' => 'Sin ruta asignada',
                    'conductor' => 'Sin conductor',
                    'tarjeton' => '',
                    'titular_conductor' => null,
                    'titular_tarjeton' => null,
                    'estatus' => 'operacion',
                    'falla' => null,
                    'corridas' => null,
                    'ciclo' => null,
                    'motivo' => null,
                    'motivo_estatus' => null,
                    'hora_salida_patio' => null,
                    'acople' => null,
                    'hora_real_salida_patio' => null,
                    'transporte_patio_norte' => null,
                    'itinerario' => false,
                    'hora_desincorporacion' => null,
                    'relevo_conductor' => null,
                    'relevo_tarjeton' => null,
                    'relevo_hora' => null,
                    // Nuevos campos de mantenimiento aunque no esté asignado operativamente
                    'nivel_combustible' => $unidadBase->nivel_combustible ?? null,
                    'nivel_adblue' => $unidadBase->nivel_adblue ?? null,
                    'numero_cincho' => $unidadBase->numero_cincho ?? null,
                    'fecha_ultima_carga' => $unidadBase->fecha_ultima_carga ?? null,
                ],
                200
            );
        } catch (\Throwable $e) {
            try {
                \Log::error('[obtenerDetalleUnidad] Error 500: '.$e->getMessage().' en la linea '.$e->getLine());
            } catch (\Throwable $logEx) {
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Error 500: '.$e->getMessage(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    /**
     * Actualiza los registros de informacion_operativa para el día actual
     * a partir de los datos enviados desde la vista previa.
     */
    public function actualizar(Request $request)
    {
        $request->validate(['unidades' => 'required|array']);
        $unidadesReq = $request->input('unidades');

        $unidadesRaw = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->select('unidades.id', 'unidades.numero_eco', DB::raw('COALESCE(unidades.tipo, transportes.nombre) as tipo_display'))
            ->get();
        $unidadesMap = collect();
        foreach ($unidadesRaw as $u) {
            $eco = trim((string) $u->numero_eco);
            if ($eco !== '') {
                $unidadesMap->put($eco, $u);
                $unidadesMap->put(ltrim($eco, '0'), $u);
                $unidadesMap->put(str_pad(ltrim($eco, '0'), 3, '0', STR_PAD_LEFT), $u);
            }
        }

        $conductoresRaw = DB::table('conductores')
            ->select('tarjeton', DB::raw("CONCAT(nombres, ' ', apellidos) AS nombre"))
            ->get();
        $conductoresMap = collect();
        foreach ($conductoresRaw as $c) {
            $t = trim((string) $c->tarjeton);
            if ($t !== '') {
                $conductoresMap->put($t, $c);
                $conductoresMap->put(ltrim($t, '0'), $c);
                $conductoresMap->put(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT), $c);
            }
        }

        $maniobristasRaw = DB::table('maniobristas')
            ->select('tarjeton', 'nombre')
            ->get();
        $maniobristasMap = collect();
        foreach ($maniobristasRaw as $m) {
            $t = trim((string) $m->tarjeton);
            if ($t !== '') {
                $maniobristasMap->put($t, $m);
                $maniobristasMap->put(ltrim($t, '0'), $m);
                $maniobristasMap->put(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT), $m);
            }
        }

        $infoOperativaRegistros = DB::table('informacion_operativa')->get()->keyBy('unidad_id');
        $infoOperativaIds = $infoOperativaRegistros->map(fn ($r) => $r->id)->all();
        $origen = strtoupper(trim((string) ($request->input('origen') ?? '')));
        // Guardado parcial: el frontend envía solo las unidades modificadas. No se deben eliminar las no enviadas.
        $parcial = $request->boolean('parcial');

        $unidadesProcesadasIds = [];
        $tarjetonesEnServicio = [];
        $maniobristasEnServicio = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        DB::table('conductores')->update(['estado_servicio' => 'disponible']);
        DB::table('maniobristas')->update(['estado_servicio' => 'disponible']);

        $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));

        foreach ($unidadesReq as $fila) {
            $ecoVal = trim((string) ($fila['ECONOMICO'] ?? ''));
            $numeroEco = ltrim($ecoVal, '0');
            $numeroEcoClean = str_pad($numeroEco === '' ? '0' : $numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($ecoVal) ?? $unidadesMap->get($numeroEcoClean) ?? $unidadesMap->get($numeroEco);
            if (! $unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";

                continue;
            }

            $unidadesProcesadasIds[] = $unidad->id;

            $prevInfo = $infoOperativaRegistros->get($unidad->id);

            // Procesar Conductor
            $tarjetonVal = trim((string) ($fila['TARJETON'] ?? ''));
            $conductorNombre = '';
            if ($tarjetonVal !== '') {
                $conductorCatalog = $conductoresMap->get($tarjetonVal) ?? $conductoresMap->get(ltrim($tarjetonVal, '0')) ?? $conductoresMap->get(str_pad(ltrim($tarjetonVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($conductorCatalog) {
                    $conductorNombre = mb_strtoupper(trim($conductorCatalog->nombre), 'UTF-8');
                    $tarjetonesEnServicio[] = $conductorCatalog->tarjeton;
                } else {
                    $conductorNombre = mb_strtoupper(trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? '')), 'UTF-8');
                }
            }

            // Procesar Maniobrista
            $tarjetonManiobristaVal = trim((string) ($fila['TARJETON_MANIOBRISTA'] ?? ''));
            $maniobristaNombre = '';
            if ($tarjetonManiobristaVal !== '') {
                $maniobristaCatalog = $maniobristasMap->get($tarjetonManiobristaVal) ?? $maniobristasMap->get(ltrim($tarjetonManiobristaVal, '0')) ?? $maniobristasMap->get(str_pad(ltrim($tarjetonManiobristaVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($maniobristaCatalog) {
                    $maniobristaNombre = $maniobristaCatalog->nombre;
                    $maniobristasEnServicio[] = $maniobristaCatalog->tarjeton;
                } else {
                    $maniobristaNombre = trim((string) ($fila['NOMBRE_MANIOBRISTA'] ?? ''));
                }
            }

            // Procesar Relevo
            $relevoTarjetonVal = trim((string) ($fila['RELEVO_TARJETON'] ?? ''));
            $relevoConductorNombre = '';
            $relevoHoraVal = trim((string) ($fila['RELEVO_HORA'] ?? ''));

            // Si el guardado NO proviene de RELEVOS (ej: viene de PROGRAMACION o PASTELES)
            // y la fila entrante no incluye relevo pero en BD ya existía uno guardado, PRESERVARLO
            if ($origen !== 'RELEVOS' && $relevoTarjetonVal === '' && $prevInfo && !empty($prevInfo->relevo_tarjeton)) {
                $relevoTarjetonVal = trim((string) $prevInfo->relevo_tarjeton);
                $relevoConductorNombre = trim((string) ($prevInfo->relevo_conductor ?? ''));
                $relevoHoraVal = trim((string) ($prevInfo->relevo_hora ?? ''));
                if ($relevoTarjetonVal !== '') {
                    $tarjetonesEnServicio[] = $relevoTarjetonVal;
                }
            } elseif ($relevoTarjetonVal !== '') {
                $relevoCatalog = $conductoresMap->get($relevoTarjetonVal) ?? $conductoresMap->get(ltrim($relevoTarjetonVal, '0')) ?? $conductoresMap->get(str_pad(ltrim($relevoTarjetonVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($relevoCatalog) {
                    $relevoConductorNombre = mb_strtoupper(trim($relevoCatalog->nombre), 'UTF-8');
                    $tarjetonesEnServicio[] = $relevoCatalog->tarjeton;
                } else {
                    $relevoConductorNombre = mb_strtoupper(trim((string) ($fila['RELEVO_CONDUCTOR'] ?? '')), 'UTF-8');
                }
            } else {
                $relevoConductorNombre = mb_strtoupper(trim((string) ($fila['RELEVO_CONDUCTOR'] ?? '')), 'UTF-8');
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_SALIDA_PATIO'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaEncierroVal = trim((string) ($fila['HORA_ENCIERRO'] ?? $fila['hora_encierro'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_REAL_SALIDA_PATIO'] ?? $fila['HORA_SALIDA'] ?? ''));

            // Si proviene de RELEVOS, los campos de titular no se gestionan en este módulo: preservar de BD si vienen vacíos
            if ($origen === 'RELEVOS' && $prevInfo) {
                if ($tarjetonVal === '' && !empty($prevInfo->numero_tarjeton)) {
                    $tarjetonVal = trim((string) $prevInfo->numero_tarjeton);
                    $conductorNombre = trim((string) ($prevInfo->nombre_conductor ?? ''));
                    if ($tarjetonVal !== '') {
                        $tarjetonesEnServicio[] = $tarjetonVal;
                    }
                }
                if ($horaProgVal === '' && !empty($prevInfo->hora_salida_patio)) {
                    $horaProgVal = trim((string) $prevInfo->hora_salida_patio);
                }
                if ($acopleVal === '' && !empty($prevInfo->acople)) {
                    $acopleVal = trim((string) $prevInfo->acople);
                }
                if ($horaEncierroVal === '' && !empty($prevInfo->hora_encierro)) {
                    $horaEncierroVal = trim((string) $prevInfo->hora_encierro);
                }
                if ($corridasVal === '' && !empty($prevInfo->corridas)) {
                    $corridasVal = (string) $prevInfo->corridas;
                }
            }

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $rutaVal = (string) ($fila['RUTA'] ?? '');
            if ($origen === 'RELEVOS' && $rutaVal === '' && $prevInfo && !empty($prevInfo->ruta)) {
                $rutaVal = (string) $prevInfo->ruta;
            }

            $data = [
                'ruta' => $rutaVal,
                'numero_tarjeton' => $tarjetonVal,
                'nombre_conductor' => $conductorNombre,
                'tarjeton_maniobrista' => $tarjetonManiobristaVal,
                'nombre_maniobrista' => $maniobristaNombre,
                'relevo_tarjeton' => $relevoTarjetonVal,
                'relevo_conductor' => preg_replace('/\s*\(\d+\)$/', '', $relevoConductorNombre !== '' ? $relevoConductorNombre : trim((string) ($fila['RELEVO_CONDUCTOR'] ?? ''))),
                'relevo_hora' => $relevoHoraVal,
                'corridas' => $corridasVal === '' ? null : (int) $corridasVal,
                'hora_salida_patio' => $horaProgVal === '' ? null : $horaProgVal,
                'acople' => $acopleVal === '' ? null : $acopleVal,
                'hora_encierro' => $horaEncierroVal === '' ? null : $horaEncierroVal,
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? '')) ?: ($unidad->tipo_display ?? 'Desconocido'),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'operacion')),
                'patio_norte' => filter_var($fila['PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'transporte_patio_norte' => filter_var($fila['TRANSPORTE_PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'itinerario' => filter_var($fila['ITINERARIO'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'hora_incorporacion' => trim((string) ($fila['HORA_INCORPORACION'] ?? '')) ?: null,
                'hora_desincorporacion' => trim((string) ($fila['HORA_DESINCORPORACION'] ?? '')) ?: null,
            ];

            $estatusReq = strtolower(trim((string) ($fila['ESTATUS'] ?? '')));
            $tieneServicioAsignado = ($data['ruta'] !== '' || $data['numero_tarjeton'] !== '' || !empty($data['corridas']) || $data['relevo_tarjeton'] !== '');

            if ($tieneServicioAsignado && ($estatusReq === '' || $estatusReq === 'reserva')) {
                $data['estatus'] = 'operacion';
            } elseif (!empty($estatusReq)) {
                $data['estatus'] = $estatusReq;
            } else {
                $data['estatus'] = $tieneServicioAsignado ? 'operacion' : 'reserva';
            }

            if (strtolower($data['estatus']) === 'reserva') {
                $data['ruta'] = '';
                $data['numero_tarjeton'] = '';
                $data['nombre_conductor'] = '';
                $data['tarjeton_maniobrista'] = '';
                $data['nombre_maniobrista'] = '';
                $data['relevo_tarjeton'] = '';
                $data['relevo_conductor'] = '';
                $data['relevo_hora'] = '';
                $data['corridas'] = null;
                $data['hora_salida_patio'] = null;
                $data['acople'] = null;
                $data['hora_encierro'] = null;
                $data['hora_real_salida_patio'] = null;
                $data['patio_norte'] = 'false';
                $data['transporte_patio_norte'] = 'false';
                $data['itinerario'] = 'false';
                $data['hora_incorporacion'] = null;
                $data['hora_desincorporacion'] = null;
                $data['falla'] = null;
                $data['ciclo'] = null;
                $data['motivo'] = null;
                $data['motivo_estatus'] = null;
            } elseif (in_array(strtolower($data['estatus']), ['mantenimiento', 'percance'])) {
                $data['ruta'] = '';
                $data['numero_tarjeton'] = '';
                $data['nombre_conductor'] = '';
                $data['tarjeton_maniobrista'] = '';
                $data['nombre_maniobrista'] = '';
                $data['relevo_tarjeton'] = '';
                $data['relevo_conductor'] = '';
                $data['relevo_hora'] = '';
                $data['corridas'] = null;
                $data['hora_salida_patio'] = null;
                $data['acople'] = null;
                $data['hora_encierro'] = null;
                $data['hora_real_salida_patio'] = null;
                $data['patio_norte'] = 'false';
                $data['transporte_patio_norte'] = 'false';
                $data['itinerario'] = 'false';
                $data['hora_incorporacion'] = null;
                $data['hora_desincorporacion'] = null;
                $prevInfo = $infoOperativaRegistros->get($unidad->id);
                $data['falla'] = (isset($fila['FALLA']) && trim((string)$fila['FALLA']) !== '')
                    ? trim((string)$fila['FALLA'])
                    : ($prevInfo->falla ?? null);
                $data['ciclo'] = $prevInfo->ciclo ?? null;
                $data['motivo'] = $prevInfo->motivo ?? null;
                $data['motivo_estatus'] = $prevInfo->motivo_estatus ?? null;

                // Preservar folios, incidencias y detalles de mantenimiento
                $data['folio_mantenimiento'] = (isset($fila['FOLIO_MANTENIMIENTO']) && trim((string)$fila['FOLIO_MANTENIMIENTO']) !== '')
                    ? trim((string)$fila['FOLIO_MANTENIMIENTO'])
                    : ($prevInfo->folio_mantenimiento ?? null);
                $data['fecha_folio_mantenimiento'] = (isset($fila['FECHA_FOLIO_MANTENIMIENTO']) && trim((string)$fila['FECHA_FOLIO_MANTENIMIENTO']) !== '')
                    ? trim((string)$fila['FECHA_FOLIO_MANTENIMIENTO'])
                    : ($prevInfo->fecha_folio_mantenimiento ?? null);
                $data['numero_incidencia'] = (isset($fila['NUMERO_INCIDENCIA']) && trim((string)$fila['NUMERO_INCIDENCIA']) !== '')
                    ? trim((string)$fila['NUMERO_INCIDENCIA'])
                    : ($prevInfo->numero_incidencia ?? null);
                $data['falla_reportada'] = (isset($fila['FALLA_REPORTADA']) && trim((string)$fila['FALLA_REPORTADA']) !== '')
                    ? trim((string)$fila['FALLA_REPORTADA'])
                    : ($prevInfo->falla_reportada ?? null);
                $data['diagnostico'] = (isset($fila['DIAGNOSTICO']) && trim((string)$fila['DIAGNOSTICO']) !== '')
                    ? trim((string)$fila['DIAGNOSTICO'])
                    : ($prevInfo->diagnostico ?? null);
                $data['mantenimiento_conductor'] = (isset($fila['MANTENIMIENTO_CONDUCTOR']) && trim((string)$fila['MANTENIMIENTO_CONDUCTOR']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_CONDUCTOR'])
                    : ($prevInfo->mantenimiento_conductor ?? null);
                $data['mantenimiento_tarjeton'] = (isset($fila['MANTENIMIENTO_TARJETON']) && trim((string)$fila['MANTENIMIENTO_TARJETON']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_TARJETON'])
                    : ($prevInfo->mantenimiento_tarjeton ?? null);
                $data['mantenimiento_ruta'] = (isset($fila['MANTENIMIENTO_RUTA']) && trim((string)$fila['MANTENIMIENTO_RUTA']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_RUTA'])
                    : ($prevInfo->mantenimiento_ruta ?? null);
                $data['mantenimiento_corrida'] = (isset($fila['MANTENIMIENTO_CORRIDA']) && trim((string)$fila['MANTENIMIENTO_CORRIDA']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_CORRIDA'])
                    : ($prevInfo->mantenimiento_corrida ?? null);
                $data['mantenimiento_kilometraje'] = (isset($fila['MANTENIMIENTO_KILOMETRAJE']) && trim((string)$fila['MANTENIMIENTO_KILOMETRAJE']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_KILOMETRAJE'])
                    : ($prevInfo->mantenimiento_kilometraje ?? null);
                $data['firma_base64'] = $prevInfo->firma_base64 ?? null;
                $data['id_firma'] = $prevInfo->id_firma ?? null;
                $data['fecha_firma'] = $prevInfo->fecha_firma ?? null;
                $data['km_ultima_lectura'] = $prevInfo->km_ultima_lectura ?? null;
            } else {
                // Si la unidad está en operación, PRESERVAR la hora de salida de patio registrada por Despacho
                // a menos que venga un valor explícito en la fila entrante.
                $data['hora_real_salida_patio'] = $horaSalidaRealVal !== ''
                    ? $horaSalidaRealVal
                    : ($prevInfo->hora_real_salida_patio ?? null);
                $data['falla'] = null;
                $data['ciclo'] = null;
                $data['motivo'] = null;
                $data['motivo_estatus'] = null;
            }

            if ($registroId) {
                try {
                    $prev = $infoOperativaRegistros->get($unidad->id);
                    if ($prev) {
                        $cambiosDetalles = [];
                        $oldEstatus = strtolower(trim((string) ($prev->estatus ?? '')));
                        $newEstatus = strtolower(trim((string) ($data['estatus'] ?? '')));
                        if ($oldEstatus !== $newEstatus) {
                            $cambiosDetalles[] = 'ESTATUS: '.strtoupper($prev->estatus ?: 'SIN ASIGNAR').' -> '.strtoupper($data['estatus'] ?: 'SIN ASIGNAR');
                        }
                        $oldRuta = trim((string) ($prev->ruta ?? ''));
                        $newRuta = trim((string) ($data['ruta'] ?? ''));
                        if ($oldRuta !== $newRuta) {
                            $cambiosDetalles[] = 'RUTA: '.($oldRuta ?: 'SIN RUTA').' -> '.($newRuta ?: 'SIN RUTA');
                        }
                        $oldTarjeton = trim((string) ($prev->numero_tarjeton ?? ''));
                        $newTarjeton = trim((string) ($data['numero_tarjeton'] ?? ''));
                        if ($oldTarjeton !== $newTarjeton) {
                            $cambiosDetalles[] = 'CONDUCTOR: '.($prev->nombre_conductor ?: 'SIN ASIGNAR').' ('.($oldTarjeton ?: 'S/T').') -> '.($data['nombre_conductor'] ?: 'SIN ASIGNAR').' ('.($newTarjeton ?: 'S/T').')';
                        }
                        $oldRelevo = trim((string) ($prev->relevo_tarjeton ?? ''));
                        $newRelevo = trim((string) ($data['relevo_tarjeton'] ?? ''));
                        $oldRelevoHora = trim((string) ($prev->relevo_hora ?? ''));
                        $newRelevoHora = trim((string) ($data['relevo_hora'] ?? ''));
                        if ($oldRelevo !== $newRelevo || $oldRelevoHora !== $newRelevoHora) {
                            $cambiosDetalles[] = 'RELEVO: '.($prev->relevo_conductor ?: 'SIN RELEVO').' ('.($oldRelevo ?: 'S/T').' '.$oldRelevoHora.') -> '.($data['relevo_conductor'] ?: 'SIN RELEVO').' ('.($newRelevo ?: 'S/T').' '.$newRelevoHora.')';
                        }

                        if (! empty($cambiosDetalles)) {
                            try {
                                $tipoAccion = ($origen === 'RELEVOS') ? 'RELEVOS_T6' : ($origen === 'PASTELES' ? 'PROGRAMACION_PASTELES' : 'PROGRAMACION_LOGISTICA');
                                $prefijo = ($origen === 'RELEVOS') ? 'MODIFICACIÓN EN RELEVOS T6' : ($origen === 'PASTELES' ? 'MODIFICACIÓN EN PROGRAMACIÓN (PASTELES)' : 'MODIFICACIÓN EN PROGRAMACIÓN');
                                BitacoraHelper::registrarCambio(
                                    $unidad->id,
                                    $tipoAccion,
                                    $prefijo.' - '.implode(' | ', $cambiosDetalles),
                                    $prev->estatus ?? null,
                                    $data['estatus'] ?? null
                                );
                            } catch (\Throwable $th) {
                                \Log::warning('Error registrando bitácora en actualizar: '.$th->getMessage());
                            }
                        }
                    }

                    $updateFiltered = array_intersect_key($data, $targetCols);
                    DB::table('informacion_operativa')
                        ->where('id', $registroId)
                        ->update($updateFiltered);
                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual de actualización en ID {$registroId}: ".$e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: ".$e->getMessage();
                }
            } else {
                try {
                    $data['unidad_id'] = $unidad->id;
                    $data['estatus'] = $data['estatus'] ?? trim((string) ($fila['ESTATUS'] ?? 'operacion'));
                    $data['fecha_registro'] = now();

                    $insertFiltered = array_intersect_key($data, $targetCols);
                    DB::table('informacion_operativa')->insert($insertFiltered);
                    $creados++;

                    try {
                        BitacoraHelper::registrarCambio(
                            $unidad->id,
                            'PROGRAMACION_LOGISTICA',
                            'ALTA DE PROGRAMACIÓN (PASTELES) - ESTATUS: '.strtoupper($data['estatus']).' | RUTA: '.($data['ruta'] ?: 'SIN RUTA').' | CONDUCTOR: '.($data['nombre_conductor'] ?: 'SIN ASIGNAR'),
                            null,
                            $data['estatus']
                        );
                    } catch (\Throwable $th) {
                        \Log::warning('Error registrando bitácora creación en actualizar: '.$th->getMessage());
                    }
                } catch (\Exception $e) {
                    \Log::error("Fallo individual de creación para ECO {$numeroEcoClean}: ".$e->getMessage());
                    $errores[] = "Error al crear ECO {$numeroEcoClean}: ".$e->getMessage();
                }
            }
        }

        if ($parcial) {
            // El payload solo trae unidades modificadas: recalcular quién está en servicio con TODA la tabla,
            // para no marcar como disponibles a los conductores de unidades que no se enviaron.
            $registrosServicio = DB::table('informacion_operativa')
                ->select('numero_tarjeton', 'relevo_tarjeton', 'tarjeton_maniobrista')
                ->get();
            foreach ($registrosServicio as $rs) {
                foreach ([$rs->numero_tarjeton, $rs->relevo_tarjeton] as $t) {
                    $t = trim((string) $t);
                    if ($t === '') {
                        continue;
                    }
                    $cat = $conductoresMap->get($t) ?? $conductoresMap->get(ltrim($t, '0')) ?? $conductoresMap->get(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT));
                    if ($cat) {
                        $tarjetonesEnServicio[] = $cat->tarjeton;
                    }
                }
                $tm = trim((string) $rs->tarjeton_maniobrista);
                if ($tm !== '') {
                    $catM = $maniobristasMap->get($tm) ?? $maniobristasMap->get(ltrim($tm, '0')) ?? $maniobristasMap->get(str_pad(ltrim($tm, '0'), 4, '0', STR_PAD_LEFT));
                    if ($catM) {
                        $maniobristasEnServicio[] = $catM->tarjeton;
                    }
                }
            }
        }

        if (! empty($tarjetonesEnServicio)) {
            DB::table('conductores')
                ->whereIn('tarjeton', array_unique($tarjetonesEnServicio))
                ->update(['estado_servicio' => 'en_servicio']);
        }

        if (! empty($maniobristasEnServicio)) {
            DB::table('maniobristas')
                ->whereIn('tarjeton', array_unique($maniobristasEnServicio))
                ->update(['estado_servicio' => 'en_servicio']);
        }

        $eliminados = 0;
        if (! $parcial) {
            try {
                $unidadesEliminadas = DB::table('informacion_operativa')
                    ->whereNotIn('unidad_id', $unidadesProcesadasIds)
                    ->get();
                foreach ($unidadesEliminadas as $uElim) {
                    try {
                        BitacoraHelper::registrarCambio(
                            $uElim->unidad_id,
                            'PROGRAMACION_LOGISTICA',
                            'UNIDAD RETIRADA DE LA PROGRAMACIÓN DEL DÍA (PASTELES)',
                            $uElim->estatus,
                            'no_programada'
                        );
                    } catch (\Throwable $th) {
                        \Log::warning('Error registrando bitácora eliminación en actualizar: '.$th->getMessage());
                    }
                }
                $eliminados = DB::table('informacion_operativa')
                    ->whereNotIn('unidad_id', $unidadesProcesadasIds)
                    ->delete();
            } catch (\Exception $e) {
                \Log::error('Fallo al eliminar registros no enviados: '.$e->getMessage());
                $errores[] = 'Error al eliminar registros obsoletos: '.$e->getMessage();
                $eliminados = 0;
            }
        }

        // Asegurar snapshot de inicio únicamente si aún no existe, sin sobrescribir el congelado del cambio de día operativo
        BitacoraHelper::ensureInicioSnapshot(false);

        self::procesarEncierrosAutomaticos();
        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Creados: {$creados}, Actualizados: {$actualizados}, Eliminados: {$eliminados}",
            'errores' => $errores,
        ], 200);
    }

    public function actualizarManana(Request $request)
    {
        $request->validate(['unidades' => 'required|array']);
        $unidadesReq = $request->input('unidades');

        $unidadesRaw = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->select('unidades.id', 'unidades.numero_eco', DB::raw('COALESCE(unidades.tipo, transportes.nombre) as tipo_display'))
            ->get();
        $unidadesMap = collect();
        foreach ($unidadesRaw as $u) {
            $eco = trim((string) $u->numero_eco);
            if ($eco !== '') {
                $unidadesMap->put($eco, $u);
                $unidadesMap->put(ltrim($eco, '0'), $u);
                $unidadesMap->put(str_pad(ltrim($eco, '0'), 3, '0', STR_PAD_LEFT), $u);
            }
        }

        $conductoresRaw = DB::table('conductores')
            ->select('tarjeton', DB::raw("CONCAT(nombres, ' ', apellidos) AS nombre"))
            ->get();
        $conductoresMap = collect();
        foreach ($conductoresRaw as $c) {
            $t = trim((string) $c->tarjeton);
            if ($t !== '') {
                $conductoresMap->put($t, $c);
                $conductoresMap->put(ltrim($t, '0'), $c);
                $conductoresMap->put(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT), $c);
            }
        }

        $maniobristasRaw = DB::table('maniobristas')
            ->select('tarjeton', 'nombre')
            ->get();
        $maniobristasMap = collect();
        foreach ($maniobristasRaw as $m) {
            $t = trim((string) $m->tarjeton);
            if ($t !== '') {
                $maniobristasMap->put($t, $m);
                $maniobristasMap->put(ltrim($t, '0'), $m);
                $maniobristasMap->put(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT), $m);
            }
        }

        $infoOperativaMananaRegistros = DB::table('informacion_operativa_manana')->get()->keyBy('unidad_id');
        $infoOperativaHoyRegistros = DB::table('informacion_operativa')->get()->keyBy('unidad_id');
        $infoOperativaIds = $infoOperativaMananaRegistros->map(fn ($r) => $r->id)->all();
        $origen = strtoupper(trim((string) ($request->input('origen') ?? '')));

        $unidadesProcesadasIds = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        $mananaCols = array_flip(Schema::getColumnListing('informacion_operativa_manana'));

        foreach ($unidadesReq as $fila) {
            $ecoVal = trim((string) ($fila['ECONOMICO'] ?? ''));
            $numeroEco = ltrim($ecoVal, '0');
            $numeroEcoClean = str_pad($numeroEco === '' ? '0' : $numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($ecoVal) ?? $unidadesMap->get($numeroEcoClean) ?? $unidadesMap->get($numeroEco);
            if (! $unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";

                continue;
            }

            $unidadesProcesadasIds[] = $unidad->id;
            $prevInfo = $infoOperativaMananaRegistros->get($unidad->id);

            $tarjetonVal = trim((string) ($fila['TARJETON'] ?? ''));
            $conductorNombre = '';
            if ($tarjetonVal !== '') {
                $conductorCatalog = $conductoresMap->get($tarjetonVal) ?? $conductoresMap->get(ltrim($tarjetonVal, '0')) ?? $conductoresMap->get(str_pad(ltrim($tarjetonVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($conductorCatalog) {
                    $conductorNombre = mb_strtoupper(trim($conductorCatalog->nombre), 'UTF-8');
                } else {
                    $conductorNombre = mb_strtoupper(trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? '')), 'UTF-8');
                }
            }

            $tarjetonManiobristaVal = trim((string) ($fila['TARJETON_MANIOBRISTA'] ?? ''));
            $maniobristaNombre = '';
            if ($tarjetonManiobristaVal !== '') {
                $maniobristaCatalog = $maniobristasMap->get($tarjetonManiobristaVal) ?? $maniobristasMap->get(ltrim($tarjetonManiobristaVal, '0')) ?? $maniobristasMap->get(str_pad(ltrim($tarjetonManiobristaVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($maniobristaCatalog) {
                    $maniobristaNombre = $maniobristaCatalog->nombre;
                } else {
                    $maniobristaNombre = trim((string) ($fila['NOMBRE_MANIOBRISTA'] ?? ''));
                }
            }

            // Procesar Relevo
            $relevoTarjetonVal = trim((string) ($fila['RELEVO_TARJETON'] ?? ''));
            $relevoConductorNombre = '';
            $relevoHoraVal = trim((string) ($fila['RELEVO_HORA'] ?? ''));

            if ($origen !== 'RELEVOS' && $relevoTarjetonVal === '' && $prevInfo && !empty($prevInfo->relevo_tarjeton)) {
                $relevoTarjetonVal = trim((string) $prevInfo->relevo_tarjeton);
                $relevoConductorNombre = trim((string) ($prevInfo->relevo_conductor ?? ''));
                $relevoHoraVal = trim((string) ($prevInfo->relevo_hora ?? ''));
            } elseif ($relevoTarjetonVal !== '') {
                $relevoCatalog = $conductoresMap->get($relevoTarjetonVal) ?? $conductoresMap->get(ltrim($relevoTarjetonVal, '0')) ?? $conductoresMap->get(str_pad(ltrim($relevoTarjetonVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($relevoCatalog) {
                    $relevoConductorNombre = mb_strtoupper(trim($relevoCatalog->nombre), 'UTF-8');
                } else {
                    $relevoConductorNombre = mb_strtoupper(trim((string) ($fila['RELEVO_CONDUCTOR'] ?? '')), 'UTF-8');
                }
            } else {
                $relevoConductorNombre = mb_strtoupper(trim((string) ($fila['RELEVO_CONDUCTOR'] ?? '')), 'UTF-8');
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_SALIDA_PATIO'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaEncierroVal = trim((string) ($fila['HORA_ENCIERRO'] ?? $fila['hora_encierro'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));

            if ($origen === 'RELEVOS' && $prevInfo) {
                if ($tarjetonVal === '' && !empty($prevInfo->numero_tarjeton)) {
                    $tarjetonVal = trim((string) $prevInfo->numero_tarjeton);
                    $conductorNombre = trim((string) ($prevInfo->nombre_conductor ?? ''));
                }
                if ($horaProgVal === '' && !empty($prevInfo->hora_salida_patio)) {
                    $horaProgVal = trim((string) $prevInfo->hora_salida_patio);
                }
                if ($acopleVal === '' && !empty($prevInfo->acople)) {
                    $acopleVal = trim((string) $prevInfo->acople);
                }
                if ($horaEncierroVal === '' && !empty($prevInfo->hora_encierro)) {
                    $horaEncierroVal = trim((string) $prevInfo->hora_encierro);
                }
                if ($corridasVal === '' && !empty($prevInfo->corridas)) {
                    $corridasVal = (string) $prevInfo->corridas;
                }
            }

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $rutaVal = (string) ($fila['RUTA'] ?? '');
            if ($origen === 'RELEVOS' && $rutaVal === '' && $prevInfo && !empty($prevInfo->ruta)) {
                $rutaVal = (string) $prevInfo->ruta;
            }

            $data = [
                'ruta' => $rutaVal,
                'numero_tarjeton' => $tarjetonVal,
                'nombre_conductor' => $conductorNombre,
                'tarjeton_maniobrista' => $tarjetonManiobristaVal,
                'nombre_maniobrista' => $maniobristaNombre,
                'relevo_tarjeton' => $relevoTarjetonVal,
                'relevo_conductor' => preg_replace('/\s*\(\d+\)$/', '', $relevoConductorNombre !== '' ? $relevoConductorNombre : trim((string) ($fila['RELEVO_CONDUCTOR'] ?? ''))),
                'relevo_hora' => $relevoHoraVal,
                'corridas' => $corridasVal === '' ? null : (int) $corridasVal,
                'hora_salida_patio' => $horaProgVal === '' ? null : $horaProgVal,
                'acople' => $acopleVal === '' ? null : $acopleVal,
                'hora_encierro' => $horaEncierroVal === '' ? null : $horaEncierroVal,
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? '')) ?: ($unidad->tipo_display ?? 'Desconocido'),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'operacion')),
                'patio_norte' => filter_var($fila['PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'transporte_patio_norte' => filter_var($fila['TRANSPORTE_PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'itinerario' => filter_var($fila['ITINERARIO'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'hora_incorporacion' => trim((string) ($fila['HORA_INCORPORACION'] ?? '')) ?: null,
                'hora_desincorporacion' => trim((string) ($fila['HORA_DESINCORPORACION'] ?? '')) ?: null,
            ];

            $estatusReq = strtolower(trim((string) ($fila['ESTATUS'] ?? '')));
            $tieneServicioAsignado = ($data['ruta'] !== '' || $data['numero_tarjeton'] !== '' || !empty($data['corridas']) || $data['relevo_tarjeton'] !== '');

            if ($tieneServicioAsignado && ($estatusReq === '' || $estatusReq === 'reserva')) {
                $data['estatus'] = 'operacion';
            } elseif (!empty($estatusReq)) {
                $data['estatus'] = $estatusReq;
            } else {
                $data['estatus'] = $tieneServicioAsignado ? 'operacion' : 'reserva';
            }

            if (strtolower($data['estatus']) === 'reserva') {
                $data['ruta'] = '';
                $data['numero_tarjeton'] = '';
                $data['nombre_conductor'] = '';
                $data['tarjeton_maniobrista'] = '';
                $data['nombre_maniobrista'] = '';
                $data['relevo_tarjeton'] = '';
                $data['relevo_conductor'] = '';
                $data['relevo_hora'] = '';
                $data['corridas'] = null;
                $data['hora_salida_patio'] = null;
                $data['acople'] = null;
                $data['hora_encierro'] = null;
                $data['hora_real_salida_patio'] = null;
                $data['patio_norte'] = 'false';
                $data['transporte_patio_norte'] = 'false';
                $data['itinerario'] = 'false';
                $data['hora_incorporacion'] = null;
                $data['hora_desincorporacion'] = null;
                $data['falla'] = null;
                $data['ciclo'] = null;
                $data['motivo'] = null;
                $data['motivo_estatus'] = null;
            } elseif (in_array(strtolower($data['estatus']), ['mantenimiento', 'percance'])) {
                $data['ruta'] = '';
                $data['numero_tarjeton'] = '';
                $data['nombre_conductor'] = '';
                $data['tarjeton_maniobrista'] = '';
                $data['nombre_maniobrista'] = '';
                $data['relevo_tarjeton'] = '';
                $data['relevo_conductor'] = '';
                $data['relevo_hora'] = '';
                $data['corridas'] = null;
                $data['hora_salida_patio'] = null;
                $data['acople'] = null;
                $data['hora_encierro'] = null;
                $data['hora_real_salida_patio'] = null;
                $data['patio_norte'] = 'false';
                $data['transporte_patio_norte'] = 'false';
                $data['itinerario'] = 'false';
                $data['hora_incorporacion'] = null;
                $data['hora_desincorporacion'] = null;
                $prevInfo = $infoOperativaMananaRegistros->get($unidad->id);
                $prevHoy = $infoOperativaHoyRegistros->get($unidad->id);

                $data['falla'] = (isset($fila['FALLA']) && trim((string)$fila['FALLA']) !== '')
                    ? trim((string)$fila['FALLA'])
                    : ($prevInfo->falla ?? ($prevHoy->falla ?? null));
                $data['ciclo'] = $prevInfo->ciclo ?? ($prevHoy->ciclo ?? null);
                $data['motivo'] = $prevInfo->motivo ?? ($prevHoy->motivo ?? null);
                $data['motivo_estatus'] = $prevInfo->motivo_estatus ?? ($prevHoy->motivo_estatus ?? null);

                // Preservar folios, incidencias y detalles de mantenimiento para mañana
                $data['folio_mantenimiento'] = (isset($fila['FOLIO_MANTENIMIENTO']) && trim((string)$fila['FOLIO_MANTENIMIENTO']) !== '')
                    ? trim((string)$fila['FOLIO_MANTENIMIENTO'])
                    : ($prevInfo->folio_mantenimiento ?? ($prevHoy->folio_mantenimiento ?? null));
                $data['fecha_folio_mantenimiento'] = (isset($fila['FECHA_FOLIO_MANTENIMIENTO']) && trim((string)$fila['FECHA_FOLIO_MANTENIMIENTO']) !== '')
                    ? trim((string)$fila['FECHA_FOLIO_MANTENIMIENTO'])
                    : ($prevInfo->fecha_folio_mantenimiento ?? ($prevHoy->fecha_folio_mantenimiento ?? null));
                $data['numero_incidencia'] = (isset($fila['NUMERO_INCIDENCIA']) && trim((string)$fila['NUMERO_INCIDENCIA']) !== '')
                    ? trim((string)$fila['NUMERO_INCIDENCIA'])
                    : ($prevInfo->numero_incidencia ?? ($prevHoy->numero_incidencia ?? null));
                $data['falla_reportada'] = (isset($fila['FALLA_REPORTADA']) && trim((string)$fila['FALLA_REPORTADA']) !== '')
                    ? trim((string)$fila['FALLA_REPORTADA'])
                    : ($prevInfo->falla_reportada ?? ($prevHoy->falla_reportada ?? null));
                $data['diagnostico'] = (isset($fila['DIAGNOSTICO']) && trim((string)$fila['DIAGNOSTICO']) !== '')
                    ? trim((string)$fila['DIAGNOSTICO'])
                    : ($prevInfo->diagnostico ?? ($prevHoy->diagnostico ?? null));
                $data['mantenimiento_conductor'] = (isset($fila['MANTENIMIENTO_CONDUCTOR']) && trim((string)$fila['MANTENIMIENTO_CONDUCTOR']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_CONDUCTOR'])
                    : ($prevInfo->mantenimiento_conductor ?? ($prevHoy->mantenimiento_conductor ?? null));
                $data['mantenimiento_tarjeton'] = (isset($fila['MANTENIMIENTO_TARJETON']) && trim((string)$fila['MANTENIMIENTO_TARJETON']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_TARJETON'])
                    : ($prevInfo->mantenimiento_tarjeton ?? ($prevHoy->mantenimiento_tarjeton ?? null));
                $data['mantenimiento_ruta'] = (isset($fila['MANTENIMIENTO_RUTA']) && trim((string)$fila['MANTENIMIENTO_RUTA']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_RUTA'])
                    : ($prevInfo->mantenimiento_ruta ?? ($prevHoy->mantenimiento_ruta ?? null));
                $data['mantenimiento_corrida'] = (isset($fila['MANTENIMIENTO_CORRIDA']) && trim((string)$fila['MANTENIMIENTO_CORRIDA']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_CORRIDA'])
                    : ($prevInfo->mantenimiento_corrida ?? ($prevHoy->mantenimiento_corrida ?? null));
                $data['mantenimiento_kilometraje'] = (isset($fila['MANTENIMIENTO_KILOMETRAJE']) && trim((string)$fila['MANTENIMIENTO_KILOMETRAJE']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_KILOMETRAJE'])
                    : ($prevInfo->mantenimiento_kilometraje ?? ($prevHoy->mantenimiento_kilometraje ?? null));
                $data['firma_base64'] = $prevInfo->firma_base64 ?? ($prevHoy->firma_base64 ?? null);
                $data['id_firma'] = $prevInfo->id_firma ?? ($prevHoy->id_firma ?? null);
                $data['fecha_firma'] = $prevInfo->fecha_firma ?? ($prevHoy->fecha_firma ?? null);
                $data['km_ultima_lectura'] = $prevInfo->km_ultima_lectura ?? ($prevHoy->km_ultima_lectura ?? null);
            } else {
                $data['hora_real_salida_patio'] = $horaSalidaRealVal !== '' ? $horaSalidaRealVal : null;
                $data['falla'] = null;
                $data['ciclo'] = null;
                $data['motivo'] = null;
                $data['motivo_estatus'] = null;
            }

            if ($registroId) {
                try {
                    $updateFiltered = array_intersect_key($data, $mananaCols);
                    DB::table('informacion_operativa_manana')
                        ->where('id', $registroId)
                        ->update($updateFiltered);
                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual actualización MANANA ID {$registroId}: ".$e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: ".$e->getMessage();
                }
            } else {
                try {
                    $data['unidad_id'] = $unidad->id;
                    $data['estatus'] = trim((string) ($fila['ESTATUS'] ?? 'operacion'));
                    $data['fecha_registro'] = now();

                    $insertFiltered = array_intersect_key($data, $mananaCols);
                    DB::table('informacion_operativa_manana')->insert($insertFiltered);
                    $creados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual creación MANANA ECO {$numeroEcoClean}: ".$e->getMessage());
                    $errores[] = "Error al crear ECO {$numeroEcoClean}: ".$e->getMessage();
                }
            }
        }

        // NOTA: No eliminamos registros que no vinieron en el payload.
        // actualizarManana solo hace upsert de las unidades enviadas.
        // La limpieza total la hace cargarProgramacionExcel (al subir Excel completo).
        $eliminados = 0;


        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Creados: {$creados}, Actualizados: {$actualizados}, Eliminados: {$eliminados}",
            'errores' => $errores,
        ], 200);
    }

    public function actualizarEspecifico(Request $request, $dia)
    {
        if ($dia !== 'festivo') {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_'.$dia;

        $request->validate(['unidades' => 'required|array']);
        $unidadesReq = $request->input('unidades');

        $unidadesRaw = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->select('unidades.id', 'unidades.numero_eco', DB::raw('COALESCE(unidades.tipo, transportes.nombre) as tipo_display'))
            ->get();
        $unidadesMap = collect();
        foreach ($unidadesRaw as $u) {
            $eco = trim((string) $u->numero_eco);
            if ($eco !== '') {
                $unidadesMap->put($eco, $u);
                $unidadesMap->put(ltrim($eco, '0'), $u);
                $unidadesMap->put(str_pad(ltrim($eco, '0'), 3, '0', STR_PAD_LEFT), $u);
            }
        }

        $conductoresRaw = DB::table('conductores')
            ->select('tarjeton', DB::raw("CONCAT(nombres, ' ', apellidos) AS nombre"))
            ->get();
        $conductoresMap = collect();
        foreach ($conductoresRaw as $c) {
            $t = trim((string) $c->tarjeton);
            if ($t !== '') {
                $conductoresMap->put($t, $c);
                $conductoresMap->put(ltrim($t, '0'), $c);
                $conductoresMap->put(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT), $c);
            }
        }

        $maniobristasRaw = DB::table('maniobristas')
            ->select('tarjeton', 'nombre')
            ->get();
        $maniobristasMap = collect();
        foreach ($maniobristasRaw as $m) {
            $t = trim((string) $m->tarjeton);
            if ($t !== '') {
                $maniobristasMap->put($t, $m);
                $maniobristasMap->put(ltrim($t, '0'), $m);
                $maniobristasMap->put(str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT), $m);
            }
        }

        $infoOperativaEspecificoRegistros = DB::table($tableName)->get()->keyBy('unidad_id');
        $infoOperativaHoyRegistros = DB::table('informacion_operativa')->get()->keyBy('unidad_id');
        $infoOperativaIds = $infoOperativaEspecificoRegistros->map(fn ($r) => $r->id)->all();
        $origen = strtoupper(trim((string) ($request->input('origen') ?? '')));

        $unidadesProcesadasIds = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        $festivoCols = array_flip(Schema::getColumnListing($tableName));

        foreach ($unidadesReq as $fila) {
            $ecoVal = trim((string) ($fila['ECONOMICO'] ?? ''));
            $numeroEco = ltrim($ecoVal, '0');
            $numeroEcoClean = str_pad($numeroEco === '' ? '0' : $numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($ecoVal) ?? $unidadesMap->get($numeroEcoClean) ?? $unidadesMap->get($numeroEco);
            if (! $unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";

                continue;
            }

            $unidadesProcesadasIds[] = $unidad->id;
            $prevInfo = $infoOperativaEspecificoRegistros->get($unidad->id);

            $tarjetonVal = trim((string) ($fila['TARJETON'] ?? ''));
            $conductorNombre = '';
            if ($tarjetonVal !== '') {
                $conductorCatalog = $conductoresMap->get($tarjetonVal) ?? $conductoresMap->get(ltrim($tarjetonVal, '0')) ?? $conductoresMap->get(str_pad(ltrim($tarjetonVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($conductorCatalog) {
                    $conductorNombre = mb_strtoupper(trim($conductorCatalog->nombre), 'UTF-8');
                } else {
                    $conductorNombre = mb_strtoupper(trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? '')), 'UTF-8');
                }
            }

            $tarjetonManiobristaVal = trim((string) ($fila['TARJETON_MANIOBRISTA'] ?? ''));
            $maniobristaNombre = '';
            if ($tarjetonManiobristaVal !== '') {
                $maniobristaCatalog = $maniobristasMap->get($tarjetonManiobristaVal) ?? $maniobristasMap->get(ltrim($tarjetonManiobristaVal, '0')) ?? $maniobristasMap->get(str_pad(ltrim($tarjetonManiobristaVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($maniobristaCatalog) {
                    $maniobristaNombre = $maniobristaCatalog->nombre;
                } else {
                    $maniobristaNombre = trim((string) ($fila['NOMBRE_MANIOBRISTA'] ?? ''));
                }
            }

            // Procesar Relevo
            $relevoTarjetonVal = trim((string) ($fila['RELEVO_TARJETON'] ?? ''));
            $relevoConductorNombre = '';
            $relevoHoraVal = trim((string) ($fila['RELEVO_HORA'] ?? ''));

            if ($origen !== 'RELEVOS' && $relevoTarjetonVal === '' && $prevInfo && !empty($prevInfo->relevo_tarjeton)) {
                $relevoTarjetonVal = trim((string) $prevInfo->relevo_tarjeton);
                $relevoConductorNombre = trim((string) ($prevInfo->relevo_conductor ?? ''));
                $relevoHoraVal = trim((string) ($prevInfo->relevo_hora ?? ''));
            } elseif ($relevoTarjetonVal !== '') {
                $relevoCatalog = $conductoresMap->get($relevoTarjetonVal) ?? $conductoresMap->get(ltrim($relevoTarjetonVal, '0')) ?? $conductoresMap->get(str_pad(ltrim($relevoTarjetonVal, '0'), 4, '0', STR_PAD_LEFT));
                if ($relevoCatalog) {
                    $relevoConductorNombre = mb_strtoupper(trim($relevoCatalog->nombre), 'UTF-8');
                } else {
                    $relevoConductorNombre = mb_strtoupper(trim((string) ($fila['RELEVO_CONDUCTOR'] ?? '')), 'UTF-8');
                }
            } else {
                $relevoConductorNombre = mb_strtoupper(trim((string) ($fila['RELEVO_CONDUCTOR'] ?? '')), 'UTF-8');
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_SALIDA_PATIO'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaEncierroVal = trim((string) ($fila['HORA_ENCIERRO'] ?? $fila['hora_encierro'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));

            if ($origen === 'RELEVOS' && $prevInfo) {
                if ($tarjetonVal === '' && !empty($prevInfo->numero_tarjeton)) {
                    $tarjetonVal = trim((string) $prevInfo->numero_tarjeton);
                    $conductorNombre = trim((string) ($prevInfo->nombre_conductor ?? ''));
                }
                if ($horaProgVal === '' && !empty($prevInfo->hora_salida_patio)) {
                    $horaProgVal = trim((string) $prevInfo->hora_salida_patio);
                }
                if ($acopleVal === '' && !empty($prevInfo->acople)) {
                    $acopleVal = trim((string) $prevInfo->acople);
                }
                if ($horaEncierroVal === '' && !empty($prevInfo->hora_encierro)) {
                    $horaEncierroVal = trim((string) $prevInfo->hora_encierro);
                }
                if ($corridasVal === '' && !empty($prevInfo->corridas)) {
                    $corridasVal = (string) $prevInfo->corridas;
                }
            }

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $rutaVal = (string) ($fila['RUTA'] ?? '');
            if ($origen === 'RELEVOS' && $rutaVal === '' && $prevInfo && !empty($prevInfo->ruta)) {
                $rutaVal = (string) $prevInfo->ruta;
            }

            $data = [
                'ruta' => $rutaVal,
                'numero_tarjeton' => $tarjetonVal,
                'nombre_conductor' => $conductorNombre,
                'tarjeton_maniobrista' => $tarjetonManiobristaVal,
                'nombre_maniobrista' => $maniobristaNombre,
                'relevo_tarjeton' => $relevoTarjetonVal,
                'relevo_conductor' => preg_replace('/\s*\(\d+\)$/', '', $relevoConductorNombre !== '' ? $relevoConductorNombre : trim((string) ($fila['RELEVO_CONDUCTOR'] ?? ''))),
                'relevo_hora' => $relevoHoraVal,
                'corridas' => $corridasVal === '' ? null : (int) $corridasVal,
                'hora_salida_patio' => $horaProgVal === '' ? null : $horaProgVal,
                'acople' => $acopleVal === '' ? null : $acopleVal,
                'hora_encierro' => $horaEncierroVal === '' ? null : $horaEncierroVal,
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? '')) ?: ($unidad->tipo_display ?? 'Desconocido'),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'operacion')),
                'patio_norte' => filter_var($fila['PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'transporte_patio_norte' => filter_var($fila['TRANSPORTE_PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'itinerario' => filter_var($fila['ITINERARIO'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'hora_incorporacion' => trim((string) ($fila['HORA_INCORPORACION'] ?? '')) ?: null,
                'hora_desincorporacion' => trim((string) ($fila['HORA_DESINCORPORACION'] ?? '')) ?: null,
            ];

            $estatusReq = strtolower(trim((string) ($fila['ESTATUS'] ?? '')));
            $tieneServicioAsignado = ($data['ruta'] !== '' || $data['numero_tarjeton'] !== '' || !empty($data['corridas']) || $data['relevo_tarjeton'] !== '');

            if ($tieneServicioAsignado && ($estatusReq === '' || $estatusReq === 'reserva')) {
                $data['estatus'] = 'operacion';
            } elseif (!empty($estatusReq)) {
                $data['estatus'] = $estatusReq;
            } else {
                $data['estatus'] = $tieneServicioAsignado ? 'operacion' : 'reserva';
            }

            if (strtolower($data['estatus']) === 'reserva') {
                $data['ruta'] = '';
                $data['numero_tarjeton'] = '';
                $data['nombre_conductor'] = '';
                $data['tarjeton_maniobrista'] = '';
                $data['nombre_maniobrista'] = '';
                $data['relevo_tarjeton'] = '';
                $data['relevo_conductor'] = '';
                $data['relevo_hora'] = '';
                $data['corridas'] = null;
                $data['hora_salida_patio'] = null;
                $data['acople'] = null;
                $data['hora_encierro'] = null;
                $data['hora_real_salida_patio'] = null;
                $data['patio_norte'] = 'false';
                $data['transporte_patio_norte'] = 'false';
                $data['itinerario'] = 'false';
                $data['hora_incorporacion'] = null;
                $data['hora_desincorporacion'] = null;
                $data['falla'] = null;
                $data['ciclo'] = null;
                $data['motivo'] = null;
                $data['motivo_estatus'] = null;
            } elseif (in_array(strtolower($data['estatus']), ['mantenimiento', 'percance'])) {
                $data['ruta'] = '';
                $data['numero_tarjeton'] = '';
                $data['nombre_conductor'] = '';
                $data['tarjeton_maniobrista'] = '';
                $data['nombre_maniobrista'] = '';
                $data['relevo_tarjeton'] = '';
                $data['relevo_conductor'] = '';
                $data['relevo_hora'] = '';
                $data['corridas'] = null;
                $data['hora_salida_patio'] = null;
                $data['acople'] = null;
                $data['hora_encierro'] = null;
                $data['hora_real_salida_patio'] = null;
                $data['patio_norte'] = 'false';
                $data['transporte_patio_norte'] = 'false';
                $data['itinerario'] = 'false';
                $data['hora_incorporacion'] = null;
                $data['hora_desincorporacion'] = null;
                $prevInfo = $infoOperativaEspecificoRegistros->get($unidad->id);
                $prevHoy = $infoOperativaHoyRegistros->get($unidad->id);

                $data['falla'] = (isset($fila['FALLA']) && trim((string)$fila['FALLA']) !== '')
                    ? trim((string)$fila['FALLA'])
                    : ($prevInfo->falla ?? ($prevHoy->falla ?? null));
                $data['ciclo'] = $prevInfo->ciclo ?? ($prevHoy->ciclo ?? null);
                $data['motivo'] = $prevInfo->motivo ?? ($prevHoy->motivo ?? null);
                $data['motivo_estatus'] = $prevInfo->motivo_estatus ?? ($prevHoy->motivo_estatus ?? null);

                // Preservar folios, incidencias y detalles de mantenimiento para festivo
                $data['folio_mantenimiento'] = (isset($fila['FOLIO_MANTENIMIENTO']) && trim((string)$fila['FOLIO_MANTENIMIENTO']) !== '')
                    ? trim((string)$fila['FOLIO_MANTENIMIENTO'])
                    : ($prevInfo->folio_mantenimiento ?? ($prevHoy->folio_mantenimiento ?? null));
                $data['fecha_folio_mantenimiento'] = (isset($fila['FECHA_FOLIO_MANTENIMIENTO']) && trim((string)$fila['FECHA_FOLIO_MANTENIMIENTO']) !== '')
                    ? trim((string)$fila['FECHA_FOLIO_MANTENIMIENTO'])
                    : ($prevInfo->fecha_folio_mantenimiento ?? ($prevHoy->fecha_folio_mantenimiento ?? null));
                $data['numero_incidencia'] = (isset($fila['NUMERO_INCIDENCIA']) && trim((string)$fila['NUMERO_INCIDENCIA']) !== '')
                    ? trim((string)$fila['NUMERO_INCIDENCIA'])
                    : ($prevInfo->numero_incidencia ?? ($prevHoy->numero_incidencia ?? null));
                $data['falla_reportada'] = (isset($fila['FALLA_REPORTADA']) && trim((string)$fila['FALLA_REPORTADA']) !== '')
                    ? trim((string)$fila['FALLA_REPORTADA'])
                    : ($prevInfo->falla_reportada ?? ($prevHoy->falla_reportada ?? null));
                $data['diagnostico'] = (isset($fila['DIAGNOSTICO']) && trim((string)$fila['DIAGNOSTICO']) !== '')
                    ? trim((string)$fila['DIAGNOSTICO'])
                    : ($prevInfo->diagnostico ?? ($prevHoy->diagnostico ?? null));
                $data['mantenimiento_conductor'] = (isset($fila['MANTENIMIENTO_CONDUCTOR']) && trim((string)$fila['MANTENIMIENTO_CONDUCTOR']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_CONDUCTOR'])
                    : ($prevInfo->mantenimiento_conductor ?? ($prevHoy->mantenimiento_conductor ?? null));
                $data['mantenimiento_tarjeton'] = (isset($fila['MANTENIMIENTO_TARJETON']) && trim((string)$fila['MANTENIMIENTO_TARJETON']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_TARJETON'])
                    : ($prevInfo->mantenimiento_tarjeton ?? ($prevHoy->mantenimiento_tarjeton ?? null));
                $data['mantenimiento_ruta'] = (isset($fila['MANTENIMIENTO_RUTA']) && trim((string)$fila['MANTENIMIENTO_RUTA']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_RUTA'])
                    : ($prevInfo->mantenimiento_ruta ?? ($prevHoy->mantenimiento_ruta ?? null));
                $data['mantenimiento_corrida'] = (isset($fila['MANTENIMIENTO_CORRIDA']) && trim((string)$fila['MANTENIMIENTO_CORRIDA']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_CORRIDA'])
                    : ($prevInfo->mantenimiento_corrida ?? ($prevHoy->mantenimiento_corrida ?? null));
                $data['mantenimiento_kilometraje'] = (isset($fila['MANTENIMIENTO_KILOMETRAJE']) && trim((string)$fila['MANTENIMIENTO_KILOMETRAJE']) !== '')
                    ? trim((string)$fila['MANTENIMIENTO_KILOMETRAJE'])
                    : ($prevInfo->mantenimiento_kilometraje ?? ($prevHoy->mantenimiento_kilometraje ?? null));
                $data['firma_base64'] = $prevInfo->firma_base64 ?? ($prevHoy->firma_base64 ?? null);
                $data['id_firma'] = $prevInfo->id_firma ?? ($prevHoy->id_firma ?? null);
                $data['fecha_firma'] = $prevInfo->fecha_firma ?? ($prevHoy->fecha_firma ?? null);
                $data['km_ultima_lectura'] = $prevInfo->km_ultima_lectura ?? ($prevHoy->km_ultima_lectura ?? null);
            } else {
                $data['hora_real_salida_patio'] = $horaSalidaRealVal !== '' ? $horaSalidaRealVal : null;
                $data['falla'] = null;
                $data['ciclo'] = null;
                $data['motivo'] = null;
                $data['motivo_estatus'] = null;
            }

            if ($registroId) {
                try {
                    $updateFiltered = array_intersect_key($data, $festivoCols);
                    DB::table($tableName)
                        ->where('id', $registroId)
                        ->update($updateFiltered);
                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual actualización {$dia} ID {$registroId}: ".$e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: ".$e->getMessage();
                }
            } else {
                try {
                    $data['unidad_id'] = $unidad->id;
                    $data['estatus'] = trim((string) ($fila['ESTATUS'] ?? 'operacion'));
                    $data['fecha_registro'] = now();

                    $insertFiltered = array_intersect_key($data, $festivoCols);
                    DB::table($tableName)->insert($insertFiltered);
                    $creados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual creación {$dia} ECO {$numeroEcoClean}: ".$e->getMessage());
                    $errores[] = "Error al crear ECO {$numeroEcoClean}: ".$e->getMessage();
                }
            }
        }

        $eliminados = 0;
        if (! $request->boolean('parcial')) {
            try {
                $eliminados = DB::table($tableName)
                    ->whereNotIn('unidad_id', $unidadesProcesadasIds)
                    ->delete();
            } catch (\Exception $e) {
                \Log::error("Fallo al eliminar registros no enviados ({$dia}): ".$e->getMessage());
                $errores[] = 'Error al eliminar registros obsoletos: '.$e->getMessage();
                $eliminados = 0;
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Creados: {$creados}, Actualizados: {$actualizados}, Eliminados: {$eliminados}",
            'errores' => $errores,
        ], 200);
    }

    /**
     * Verifica y asegura que el cambio de día operativo se ejecute oportunamente.
     */
    public static function verificarYEjecutarCambioDiaAutomatico()
    {
        $nowMexico = Carbon::now('America/Mexico_City');
        $hoy = $nowMexico->toDateString();

        if (Cache::has('cambio_dia_operativo_ejecutado_'.$hoy)) {
            return;
        }

        $esDiaAnterior = DB::table('informacion_operativa')
            ->whereNotNull('fecha_registro')
            ->whereDate('fecha_registro', '<', $hoy)
            ->exists();

        if ($esDiaAnterior) {
            self::ejecutarCambioDiaAutomatico();
        } else {
            // El día de hoy ya está inicializado y vigente, cachear para evitar la consulta a la BD en cada petición
            Cache::put('cambio_dia_operativo_ejecutado_'.$hoy, true, 300);
        }
    }

    public static function ejecutarCambioDiaAutomatico()
    {
        $now = Carbon::now('America/Mexico_City');
        $fechaHoy = $now->toDateString();
        $fechaAyer = $now->copy()->subDay()->toDateString();
        $horaEncierroNocturno = '23:59:59';

        \Log::info("Iniciando ejecución de cambio de día operativo automático para la fecha {$fechaHoy}...");

        try {
            DB::beginTransaction();

            // 1. Identificar unidades bloqueadas en Mantenimiento o Percance (deben permanecer excluidas del reseteo)
            $unidadesBloqueadas = DB::table('informacion_operativa')
                ->whereIn(DB::raw('LOWER(estatus)'), ['mantenimiento', 'percance'])
                ->get()
                ->keyBy(function ($item) {
                    return (int) $item->unidad_id;
                });

            $sourceTable = null;
            $deleteSourceAfter = false;

            // 3. Prioridad: informacion_operativa_manana (programada para el día siguiente)
            if (DB::table('informacion_operativa_manana')->count() > 0) {
                $sourceTable = 'informacion_operativa_manana';
                $deleteSourceAfter = true;
            }

            if ($sourceTable) {
                $nuevosRegistros = DB::table($sourceTable)->get();
                DB::table('informacion_operativa')->delete();

                // Limpiar cualquier registro de encierro de hoy para garantizar que el nuevo día comience limpio
                DB::table('historial_operativo')
                    ->where('fecha_historial', $fechaHoy)
                    ->where('momento', 'ENCIERRO')
                    ->delete();

                $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
                $inicialCols = array_flip(Schema::getColumnListing('programacion_inicial'));
                $historialCols = array_flip(Schema::getColumnListing('historial_operativo'));
                $tarjetones = [];
                $maniobristas = [];

                // Copy to programacion_inicial y snapshot de INICIO (deben capturar el 100% de la flota programada original)
                $inicialInsert = [];
                $snapshotInicioInsert = [];

                foreach ($nuevosRegistros as $row) {
                    unset($row->id);
                    $arrayRow = (array) $row;
                    $unidadId = !empty($row->unidad_id) ? (int) $row->unidad_id : null;

                    // 1. Determinar si esta unidad fue planificada/programada para salir a operar en la programación original
                    $estatusOriginal = strtolower(trim((string)($arrayRow['estatus'] ?? '')));
                    $tieneServicioProgramado = !empty($arrayRow['ruta']) || !empty($arrayRow['numero_tarjeton']) || !empty($arrayRow['corridas']);
                    $esProgramadaOperacion = ($estatusOriginal === 'operacion' || $tieneServicioProgramado);

                    // 2. Registrar en programacion_inicial para que la flota programada original quede íntegra y fija (ej. 91 unidades)
                    if ($esProgramadaOperacion) {
                        $inicialRowFiltered = [];
                        foreach ($arrayRow as $k => $v) {
                            if (isset($inicialCols[$k])) {
                                $inicialRowFiltered[$k] = in_array($k, ['patio_norte', 'transporte_patio_norte', 'itinerario'])
                                    ? (filter_var($v, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false')
                                    : $v;
                            }
                        }
                        $inicialRowFiltered['estatus'] = 'operacion';
                        $inicialRowFiltered['fecha'] = $fechaHoy;
                        $inicialRowFiltered['created_at'] = now();
                        $inicialRowFiltered['updated_at'] = now();
                        $inicialInsert[] = array_intersect_key($inicialRowFiltered, $inicialCols);
                    }

                    // 3. Registrar en snapshot de historial_operativo (momento = 'INICIO') con su estatus programado
                    // Esto garantiza que Monitoreo de la Operación (Centro de Control) y Resumen de Despacho
                    // muestren el total programado real fijado (ej. 91) aun si la unidad se encuentra en taller.
                    $snapshotItem = [
                        'fecha_historial' => $fechaHoy,
                        'momento'         => 'INICIO',
                        'unidad_id'       => $unidadId,
                        'ruta'            => $arrayRow['ruta'] ?? null,
                        'numero_tarjeton' => $arrayRow['numero_tarjeton'] ?? null,
                        'nombre_conductor'=> $arrayRow['nombre_conductor'] ?? null,
                        'tipo'            => $arrayRow['tipo'] ?? null,
                        'estatus'         => $esProgramadaOperacion ? 'operacion' : ($arrayRow['estatus'] ?? 'reserva'),
                        'falla'           => $arrayRow['falla'] ?? null,
                        'corridas'        => $arrayRow['corridas'] ?? null,
                        'ciclo'           => $arrayRow['ciclo'] ?? null,
                        'motivo'          => $arrayRow['motivo'] ?? null,
                        'motivo_estatus'  => $arrayRow['motivo_estatus'] ?? null,
                        'hora_salida_patio' => $arrayRow['hora_salida_patio'] ?? ($arrayRow['hora_programada'] ?? null),
                        'fecha_registro'  => $fechaHoy,
                        'created_at'      => now(),
                        'updated_at'      => now(),
                    ];
                    if (isset($historialCols['tarjeton_maniobrista'])) {
                        $snapshotItem['tarjeton_maniobrista'] = $arrayRow['tarjeton_maniobrista'] ?? null;
                        $snapshotItem['nombre_maniobrista']   = $arrayRow['nombre_maniobrista'] ?? null;
                    }
                    if (isset($historialCols['acople'])) {
                        $snapshotItem['acople'] = $arrayRow['acople'] ?? null;
                    }
                    if (isset($historialCols['itinerario'])) {
                        $snapshotItem['itinerario'] = filter_var($arrayRow['itinerario'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                    }
                    if (isset($historialCols['hora_incorporacion'])) {
                        $snapshotItem['hora_incorporacion'] = $arrayRow['hora_incorporacion'] ?? null;
                    }
                    if (isset($historialCols['hora_desincorporacion'])) {
                        $snapshotItem['hora_desincorporacion'] = $arrayRow['hora_desincorporacion'] ?? null;
                    }
                    if (isset($historialCols['hora_encierro'])) {
                        $snapshotItem['hora_encierro'] = $arrayRow['hora_encierro'] ?? null;
                    }
                    if (isset($historialCols['relevo_tarjeton'])) {
                        $snapshotItem['relevo_tarjeton'] = $arrayRow['relevo_tarjeton'] ?? null;
                        $snapshotItem['relevo_conductor'] = $arrayRow['relevo_conductor'] ?? null;
                        $snapshotItem['relevo_hora'] = $arrayRow['relevo_hora'] ?? null;
                    }
                    $snapshotInicioInsert[] = array_intersect_key($snapshotItem, $historialCols);

                    // 4. Si la unidad estaba en Mantenimiento o Percance:
                    // Se preserva INCONDICIONALMENTE en su estado de taller en informacion_operativa
                    // (no puede salir a operar hasta que sea formalmente liberada de taller).
                    $seMantieneEnMantenimiento = false;
                    if ($unidadId && $unidadesBloqueadas->has($unidadId)) {
                        $seMantieneEnMantenimiento = true;
                    }

                    if ($seMantieneEnMantenimiento) {
                        $bloqueada = (array) $unidadesBloqueadas->get($unidadId);
                        unset($bloqueada['id']);

                        $insertRow = [];
                        foreach ($bloqueada as $key => $val) {
                            if (isset($targetCols[$key])) {
                                if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                                    $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                                } else {
                                    $insertRow[$key] = $val;
                                }
                            }
                        }

                        // Preservar íntegramente todos los datos de mantenimiento
                        $camposMantenimiento = [
                            'folio_mantenimiento',
                            'fecha_folio_mantenimiento',
                            'numero_incidencia',
                            'falla_reportada',
                            'diagnostico',
                            'mantenimiento_conductor',
                            'mantenimiento_tarjeton',
                            'mantenimiento_ruta',
                            'mantenimiento_corrida',
                            'mantenimiento_kilometraje',
                            'motivo_estatus',
                            'motivo',
                            'falla',
                            'observaciones',
                            'firma_base64',
                            'id_firma',
                            'fecha_firma',
                            'km_ultima_lectura',
                        ];
                        foreach ($camposMantenimiento as $campo) {
                            if (!empty($bloqueada[$campo])) {
                                $insertRow[$campo] = $bloqueada[$campo];
                            } elseif (!empty($arrayRow[$campo])) {
                                $insertRow[$campo] = $arrayRow[$campo];
                            }
                        }

                        // Si la fila de origen traía servicio asignado y no lo teníamos en mantenimiento_*, conservarlo como referencia
                        if (empty($insertRow['mantenimiento_conductor']) && !empty($arrayRow['nombre_conductor'])) {
                            $insertRow['mantenimiento_conductor'] = $arrayRow['nombre_conductor'];
                        }
                        if (empty($insertRow['mantenimiento_tarjeton']) && !empty($arrayRow['numero_tarjeton'])) {
                            $insertRow['mantenimiento_tarjeton'] = $arrayRow['numero_tarjeton'];
                        }
                        if (empty($insertRow['mantenimiento_ruta']) && !empty($arrayRow['ruta'])) {
                            $insertRow['mantenimiento_ruta'] = $arrayRow['ruta'];
                        }
                        if (empty($insertRow['mantenimiento_corrida']) && !empty($arrayRow['corridas'])) {
                            $insertRow['mantenimiento_corrida'] = $arrayRow['corridas'];
                        }

                        // Garantizar estatus y motivo de mantenimiento/percance
                        $insertRow['estatus'] = $bloqueada['estatus'];
                        $insertRow['motivo_estatus'] = !empty($bloqueada['motivo_estatus']) ? $bloqueada['motivo_estatus'] : strtoupper($bloqueada['estatus']);

                        // Desvincular de servicio activo (la unidad no sale a ruta mientras esté en mantenimiento/percance)
                        $insertRow['nombre_conductor'] = null;
                        $insertRow['numero_tarjeton'] = null;
                        $insertRow['ruta'] = null;
                        $insertRow['corridas'] = null;
                        $insertRow['acople'] = null;
                        $insertRow['hora_salida_patio'] = null;
                        $insertRow['hora_real_salida_patio'] = null;
                        $insertRow['hora_salida'] = null;
                        $insertRow['hora_programada'] = null;
                        $insertRow['ciclo'] = null;
                        $insertRow['tarjeton_maniobrista'] = null;
                        $insertRow['nombre_maniobrista'] = null;
                        $insertRow['relevo_tarjeton'] = null;
                        $insertRow['relevo_conductor'] = null;
                        $insertRow['relevo_hora'] = null;
                        $insertRow['hora_desincorporacion'] = null;
                        $insertRow['hora_incorporacion'] = null;
                        $insertRow['hora_encierro'] = null;
                        $insertRow['fecha_registro'] = $fechaHoy;

                        $insertRow = array_intersect_key($insertRow, $targetCols);
                        DB::table('informacion_operativa')->insert($insertRow);
                        continue;
                    }

                    $insertRow = [];
                    foreach ($arrayRow as $key => $val) {
                        if (isset($targetCols[$key])) {
                            if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                                $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                            } else {
                                $insertRow[$key] = $val;
                            }
                        }
                    }

                    // Si la unidad pasa a mantenimiento o percance desde la tabla origen, recuperar cualquier dato previo si no viene en fila
                    if (in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                        if ($unidadId && $unidadesBloqueadas->has($unidadId)) {
                            $bloqueadaPrev = (array) $unidadesBloqueadas->get($unidadId);
                            $camposMantenimiento = [
                                'folio_mantenimiento',
                                'fecha_folio_mantenimiento',
                                'numero_incidencia',
                                'falla_reportada',
                                'diagnostico',
                                'mantenimiento_conductor',
                                'mantenimiento_tarjeton',
                                'mantenimiento_ruta',
                                'mantenimiento_corrida',
                                'mantenimiento_kilometraje',
                                'motivo_estatus',
                                'motivo',
                                'falla',
                                'observaciones',
                                'firma_base64',
                                'id_firma',
                                'fecha_firma',
                                'km_ultima_lectura',
                            ];
                            foreach ($camposMantenimiento as $campo) {
                                if (empty($insertRow[$campo]) && !empty($bloqueadaPrev[$campo])) {
                                    $insertRow[$campo] = $bloqueadaPrev[$campo];
                                }
                            }
                        }
                    }

                    // Reiniciar campos de validación para el nuevo día operativo (reinicio limpio de operaciones)
                    // Las unidades en mantenimiento o percance ya fueron procesadas y preservadas arriba.
                    if (array_key_exists('hora_real_salida_patio', $insertRow)) {
                        $insertRow['hora_real_salida_patio'] = null;
                    }
                    if (array_key_exists('hora_salida', $insertRow)) {
                        $insertRow['hora_salida'] = null;
                    }
                    if (array_key_exists('hora_desincorporacion', $insertRow)) {
                        $insertRow['hora_desincorporacion'] = null;
                    }
                    if (array_key_exists('hora_incorporacion', $insertRow)) {
                        $insertRow['hora_incorporacion'] = null;
                    }
                    if (array_key_exists('firma_base64', $insertRow)) {
                        // Solo reiniciar firma de salida de patio; preservar firma de mantenimiento si la unidad está en taller
                        if (!in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                            $insertRow['firma_base64'] = null;
                        }
                    }
                    $insertRow['fecha_registro'] = $fechaHoy;

                    $insertRow = array_intersect_key($insertRow, $targetCols);
                    DB::table('informacion_operativa')->insert($insertRow);

                    if (! empty($row->numero_tarjeton)) {
                        $tarjetones[] = $row->numero_tarjeton;
                    }
                    if (! empty($row->tarjeton_maniobrista)) {
                        $maniobristas[] = $row->tarjeton_maniobrista;
                    }
                }

                // Asegurar que ninguna unidad bloqueada se quede fuera si no venía en sourceTable
                $unidadesInsertadas = DB::table('informacion_operativa')->pluck('unidad_id')->toArray();
                foreach ($unidadesBloqueadas as $uId => $bloqueadaObj) {
                    if (! in_array($uId, $unidadesInsertadas, true)) {
                        $bloqueada = (array) $bloqueadaObj;
                        unset($bloqueada['id']);
                        $insertRow = [];
                        foreach ($bloqueada as $key => $val) {
                            if (isset($targetCols[$key])) {
                                if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                                    $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                                } else {
                                    $insertRow[$key] = $val;
                                }
                            }
                        }
                        if (isset($targetCols['hora_real_salida_patio'])) {
                            $insertRow['hora_real_salida_patio'] = null;
                        }
                        if (isset($targetCols['hora_salida'])) {
                            $insertRow['hora_salida'] = null;
                        }
                        if (isset($targetCols['hora_encierro'])) {
                            $insertRow['hora_encierro'] = null;
                        }
                        if (!in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                            $insertRow['firma_base64'] = null;
                        }
                        $insertRow['fecha_registro'] = $fechaHoy;
                        $insertRow = array_intersect_key($insertRow, $targetCols);
                        DB::table('informacion_operativa')->insert($insertRow);

                        // Registrar también en el snapshot de inicio como mantenimiento
                        $bloqArray = (array) $bloqueadaObj;
                        $snapBloq = [
                            'fecha_historial' => $fechaHoy,
                            'momento'         => 'INICIO',
                            'unidad_id'       => $uId,
                            'tipo'            => $bloqArray['tipo'] ?? null,
                            'estatus'         => $bloqArray['estatus'] ?? 'mantenimiento',
                            'motivo_estatus'  => $bloqArray['motivo_estatus'] ?? 'MANTENIMIENTO',
                            'fecha_registro'  => $fechaHoy,
                            'created_at'      => now(),
                            'updated_at'      => now(),
                        ];
                        $snapshotInicioInsert[] = array_intersect_key($snapBloq, $historialCols);
                    }
                }

                if (! empty($inicialInsert)) {
                    // Limpiar snapshot previo de programacion_inicial de hoy para evitar duplicados en cambios forzados
                    DB::table('programacion_inicial')->where('fecha', $fechaHoy)->delete();
                    foreach (array_chunk($inicialInsert, 50) as $chunk) {
                        DB::table('programacion_inicial')->insert($chunk);
                    }
                }

                // Guardar snapshot congelado de INICIO en historial_operativo con el 100% de la flota programada
                if (! empty($snapshotInicioInsert)) {
                    DB::table('historial_operativo')
                        ->where('fecha_historial', $fechaHoy)
                        ->where('momento', 'INICIO')
                        ->delete();
                    foreach (array_chunk($snapshotInicioInsert, 50) as $chunk) {
                        DB::table('historial_operativo')->insert($chunk);
                    }
                }

                if ($deleteSourceAfter) {
                    DB::table($sourceTable)->delete();
                }

                DB::table('conductores')->update(['estado_servicio' => 'disponible']);
                DB::table('maniobristas')->update(['estado_servicio' => 'disponible']);

                if (! empty($tarjetones)) {
                    DB::table('conductores')->whereIn('tarjeton', array_unique($tarjetones))->update(['estado_servicio' => 'en_servicio']);
                }
                if (! empty($maniobristas)) {
                    DB::table('maniobristas')->whereIn('tarjeton', array_unique($maniobristas))->update(['estado_servicio' => 'en_servicio']);
                }

                DB::commit();

                Cache::forever('cambio_dia_operativo_ejecutado_'.$fechaHoy, true);

                \Log::info("Cambio de día operativo automático completado con éxito desde {$sourceTable}. Unidades en mantenimiento/percance preservadas.");

                return [
                    'status'  => 'success',
                    'message' => "Cambio de día aplicado exitosamente desde tabla {$sourceTable}.",
                ];
            } else {
                // Si no hay tabla con programación nueva para mañana:
                // La programación operativa actual (rutas, conductores, horarios) SE MANTIENE para el nuevo día.
                // Reinicio de operaciones: las unidades que estaban en reserva por encierro vuelven a operación.
                // Solo las unidades en mantenimiento o percance conservan su estatus de taller.
                $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));

                DB::table('informacion_operativa')
                    ->whereNotIn(DB::raw('LOWER(estatus)'), ['mantenimiento', 'percance'])
                    ->where(function ($q) {
                        $q->where('motivo_estatus', 'like', '%Encierro%')
                          ->orWhere('motivo_estatus', 'like', '%Fin de turno%');
                    })
                    ->update([
                        'estatus' => 'operacion',
                        'motivo_estatus' => null,
                        'motivo' => null,
                    ]);

                $updateOperacion = [];
                if (isset($targetCols['hora_real_salida_patio'])) {
                    $updateOperacion['hora_real_salida_patio'] = null;
                }
                if (isset($targetCols['hora_salida'])) {
                    $updateOperacion['hora_salida'] = null;
                }
                if (isset($targetCols['hora_desincorporacion'])) {
                    $updateOperacion['hora_desincorporacion'] = null;
                }
                if (isset($targetCols['hora_incorporacion'])) {
                    $updateOperacion['hora_incorporacion'] = null;
                }
                if (isset($targetCols['firma_base64'])) {
                    $updateOperacion['firma_base64'] = null;
                }
                if (isset($targetCols['fecha_registro'])) {
                    $updateOperacion['fecha_registro'] = $fechaHoy;
                }
                if (! empty($updateOperacion)) {
                    DB::table('informacion_operativa')
                        ->whereNotIn(DB::raw('LOWER(estatus)'), ['mantenimiento', 'percance'])
                        ->update($updateOperacion);
                }

                // Limpiar cualquier registro de encierro de hoy en historial_operativo
                DB::table('historial_operativo')
                    ->where('fecha_historial', $fechaHoy)
                    ->where('momento', 'ENCIERRO')
                    ->delete();

                DB::table('conductores')->update(['estado_servicio' => 'disponible']);
                DB::table('maniobristas')->update(['estado_servicio' => 'disponible']);

                // Re-marcar como en_servicio a los conductores que siguen asignados hoy
                $conductoresAsignados = DB::table('informacion_operativa')
                    ->whereNotNull('numero_tarjeton')
                    ->whereRaw("TRIM(CAST(numero_tarjeton AS VARCHAR)) != ''")
                    ->pluck('numero_tarjeton')
                    ->toArray();
                if (! empty($conductoresAsignados)) {
                    DB::table('conductores')->whereIn('tarjeton', array_unique($conductoresAsignados))->update(['estado_servicio' => 'en_servicio']);
                }

                $maniobristasAsignados = DB::table('informacion_operativa')
                    ->whereNotNull('tarjeton_maniobrista')
                    ->whereRaw("TRIM(CAST(tarjeton_maniobrista AS VARCHAR)) != ''")
                    ->pluck('tarjeton_maniobrista')
                    ->toArray();
                if (! empty($maniobristasAsignados)) {
                    DB::table('maniobristas')->whereIn('tarjeton', array_unique($maniobristasAsignados))->update(['estado_servicio' => 'en_servicio']);
                }

                BitacoraHelper::ensureInicioSnapshot();

                DB::commit();

                Cache::forever('cambio_dia_operativo_ejecutado_'.$fechaHoy, true);

                \Log::info('Cambio de día operativo automático completado preservando la programación activa de la flota (sin tabla mañana).');

                return [
                    'status'  => 'success',
                    'message' => 'Cambio de día aplicado preservando la programación operativa de la flota.',
                ];
            }
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error en cambio de día operativo automático: '.$e->getMessage());

            return [
                'status' => 'error',
                'message' => 'Error al ejecutar cambio de día operativo automático: '.$e->getMessage(),
            ];
        }
    }

    public function aplicarCambioDia(Request $request)
    {
        $user = $request->user();
        $rolCodigo = strtoupper(trim($user?->role?->codigo ?? ''));
        $rolNombre = strtoupper(trim($user?->role?->nombre ?? ''));
        $username = strtolower(trim($user?->usuario ?? ''));
        $nombreCompleto = strtolower(trim($user?->nombre_completo ?? ''));

        $autorizado = in_array($rolCodigo, ['ADMIN', 'ADMINISTRADOR'])
            || in_array($rolNombre, ['ADMIN', 'ADMINISTRADOR'])
            || str_contains($username, 'enrique')
            || str_contains($username, 'erik')
            || str_contains($nombreCompleto, 'erik');

        if (! $autorizado) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Acceso denegado. Solo administradores autorizados pueden ejecutar esta acción.',
            ], 403);
        }

        if (DB::table('informacion_operativa_manana')->count() === 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'No hay programación registrada en "Día Siguiente" para trasladar al día actual.',
            ], 400);
        }

        $resAuto = self::ejecutarCambioDiaAutomatico();

        // Si se configuraron ciclos para mañana, sincronizarlos para la fecha operativa actual al aplicar manualmente
        try {
            if (Schema::hasTable('programacion_ciclos')) {
                $fechaHoy = Carbon::today('America/Mexico_City')->toDateString();
                $fechaManana = Carbon::tomorrow('America/Mexico_City')->toDateString();
                $ciclosManana = DB::table('programacion_ciclos')->where('fecha_operativa', $fechaManana)->first();
                if ($ciclosManana) {
                    $ahora = Carbon::now('America/Mexico_City');
                    DB::table('programacion_ciclos')->updateOrInsert(
                        ['fecha_operativa' => $fechaHoy],
                        [
                            'ciclos' => $ciclosManana->ciclos,
                            'updated_at' => $ahora,
                            'created_at' => $ahora,
                        ]
                    );
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('No se pudieron trasladar los ciclos de mañana a hoy: '.$e->getMessage());
        }

        \Log::info('Cambio de día operativo manual ejecutado exitosamente por: '.($user->usuario ?? 'admin'));

        return response()->json($resAuto, ($resAuto['status'] ?? '') === 'error' ? 500 : 200);
    }

    public function aplicarCambioDiaEspecifico($dia)
    {
        if ($dia !== 'festivo') {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_'.$dia;

        try {
            DB::beginTransaction();

            $unidadesBloqueadas = DB::table('informacion_operativa')
                ->whereIn(DB::raw('LOWER(estatus)'), ['mantenimiento', 'percance'])
                ->get()
                ->keyBy(function ($item) {
                    return (int) $item->unidad_id;
                });

            $registros = DB::table($tableName)->get();
            $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
            DB::table('informacion_operativa')->delete();

            $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();

            foreach ($registros as $reg) {
                unset($reg->id);
                $arrayRow = (array) $reg;
                $unidadId = !empty($arrayRow['unidad_id']) ? (int) $arrayRow['unidad_id'] : null;

                $seMantieneEnMantenimiento = false;
                if ($unidadId && $unidadesBloqueadas->has($unidadId)) {
                    $seMantieneEnMantenimiento = true;
                }

                if ($seMantieneEnMantenimiento) {
                    $bloqueada = (array) $unidadesBloqueadas->get($unidadId);
                    unset($bloqueada['id']);
                    $insertRow = [];
                    foreach ($bloqueada as $key => $val) {
                        if (isset($targetCols[$key])) {
                            if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                                $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                            } else {
                                $insertRow[$key] = $val;
                            }
                        }
                    }

                    $camposMantenimiento = [
                        'folio_mantenimiento',
                        'fecha_folio_mantenimiento',
                        'numero_incidencia',
                        'falla_reportada',
                        'diagnostico',
                        'mantenimiento_conductor',
                        'mantenimiento_tarjeton',
                        'mantenimiento_ruta',
                        'mantenimiento_corrida',
                        'mantenimiento_kilometraje',
                        'motivo_estatus',
                        'motivo',
                        'falla',
                        'observaciones',
                        'firma_base64',
                        'id_firma',
                        'fecha_firma',
                        'km_ultima_lectura',
                    ];
                    foreach ($camposMantenimiento as $campo) {
                        if (!empty($bloqueada[$campo])) {
                            $insertRow[$campo] = $bloqueada[$campo];
                        } elseif (!empty($arrayRow[$campo])) {
                            $insertRow[$campo] = $arrayRow[$campo];
                        }
                    }

                    if (empty($insertRow['mantenimiento_conductor']) && !empty($arrayRow['nombre_conductor'])) {
                        $insertRow['mantenimiento_conductor'] = $arrayRow['nombre_conductor'];
                    }
                    if (empty($insertRow['mantenimiento_tarjeton']) && !empty($arrayRow['numero_tarjeton'])) {
                        $insertRow['mantenimiento_tarjeton'] = $arrayRow['numero_tarjeton'];
                    }
                    if (empty($insertRow['mantenimiento_ruta']) && !empty($arrayRow['ruta'])) {
                        $insertRow['mantenimiento_ruta'] = $arrayRow['ruta'];
                    }
                    if (empty($insertRow['mantenimiento_corrida']) && !empty($arrayRow['corridas'])) {
                        $insertRow['mantenimiento_corrida'] = $arrayRow['corridas'];
                    }

                    $insertRow['estatus'] = $bloqueada['estatus'];
                    $insertRow['motivo_estatus'] = !empty($bloqueada['motivo_estatus']) ? $bloqueada['motivo_estatus'] : strtoupper($bloqueada['estatus']);

                    $insertRow['nombre_conductor'] = null;
                    $insertRow['numero_tarjeton'] = null;
                    $insertRow['ruta'] = null;
                    $insertRow['corridas'] = null;
                    $insertRow['acople'] = null;
                    $insertRow['hora_salida_patio'] = null;
                    $insertRow['hora_real_salida_patio'] = null;
                    $insertRow['hora_salida'] = null;
                    $insertRow['hora_programada'] = null;
                    $insertRow['ciclo'] = null;
                    $insertRow['tarjeton_maniobrista'] = null;
                    $insertRow['nombre_maniobrista'] = null;
                    $insertRow['relevo_tarjeton'] = null;
                    $insertRow['relevo_conductor'] = null;
                    $insertRow['relevo_hora'] = null;
                    $insertRow['hora_desincorporacion'] = null;
                    $insertRow['hora_incorporacion'] = null;
                    $insertRow['hora_encierro'] = null;
                    $insertRow['fecha_registro'] = $fechaHoy;

                    $insertRow = array_intersect_key($insertRow, $targetCols);
                    DB::table('informacion_operativa')->insert($insertRow);
                    continue;
                }

                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                            $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }

                if (in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                    if ($unidadId && $unidadesBloqueadas->has($unidadId)) {
                        $bloqueadaPrev = (array) $unidadesBloqueadas->get($unidadId);
                        $camposMantenimiento = [
                            'folio_mantenimiento',
                            'fecha_folio_mantenimiento',
                            'numero_incidencia',
                            'falla_reportada',
                            'diagnostico',
                            'mantenimiento_conductor',
                            'mantenimiento_tarjeton',
                            'mantenimiento_ruta',
                            'mantenimiento_corrida',
                            'mantenimiento_kilometraje',
                            'motivo_estatus',
                            'motivo',
                            'falla',
                            'observaciones',
                            'firma_base64',
                            'id_firma',
                            'fecha_firma',
                            'km_ultima_lectura',
                        ];
                        foreach ($camposMantenimiento as $campo) {
                            if (empty($insertRow[$campo]) && !empty($bloqueadaPrev[$campo])) {
                                $insertRow[$campo] = $bloqueadaPrev[$campo];
                            }
                        }
                    }
                }

                // Reiniciar campos de validación para el nuevo día
                if (array_key_exists('hora_real_salida_patio', $insertRow)) {
                    $insertRow['hora_real_salida_patio'] = null;
                }
                if (array_key_exists('hora_salida', $insertRow)) {
                    $insertRow['hora_salida'] = null;
                }
                if (array_key_exists('firma_base64', $insertRow)) {
                    if (!in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                        $insertRow['firma_base64'] = null;
                    }
                }
                $insertRow['fecha_registro'] = $fechaHoy;

                $insertRow = array_intersect_key($insertRow, $targetCols);
                DB::table('informacion_operativa')->insert($insertRow);
            }

            // Asegurar que ninguna unidad bloqueada se quede fuera si no venía en la tabla
            $unidadesInsertadas = DB::table('informacion_operativa')->pluck('unidad_id')->toArray();
            foreach ($unidadesBloqueadas as $uId => $bloqueadaObj) {
                if (! in_array($uId, $unidadesInsertadas, true)) {
                    $bloqueada = (array) $bloqueadaObj;
                    unset($bloqueada['id']);
                    $insertRow = [];
                    foreach ($bloqueada as $key => $val) {
                        if (isset($targetCols[$key])) {
                            if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                                $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                            } else {
                                $insertRow[$key] = $val;
                            }
                        }
                    }
                    if (isset($targetCols['hora_real_salida_patio'])) {
                        $insertRow['hora_real_salida_patio'] = null;
                    }
                    if (isset($targetCols['hora_salida'])) {
                        $insertRow['hora_salida'] = null;
                    }
                    if (isset($targetCols['hora_encierro'])) {
                        $insertRow['hora_encierro'] = null;
                    }
                    if (!in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                        $insertRow['firma_base64'] = null;
                    }
                    $insertRow['fecha_registro'] = $fechaHoy;
                    $insertRow = array_intersect_key($insertRow, $targetCols);
                    DB::table('informacion_operativa')->insert($insertRow);
                }
            }

            // Opcional: Si queremos dejar la tabla en blanco luego de aplicarla, descomentamos la siguiente línea
            // DB::table($tableName)->delete();

            DB::table('conductores')->update(['estado_servicio' => 'disponible']);
            DB::table('maniobristas')->update(['estado_servicio' => 'disponible']);

            $conductoresAsignados = DB::table('informacion_operativa')
                ->whereNotNull('numero_tarjeton')
                ->where('numero_tarjeton', '!=', '')
                ->pluck('numero_tarjeton')
                ->toArray();

            if (! empty($conductoresAsignados)) {
                DB::table('conductores')->whereIn('tarjeton', $conductoresAsignados)->update(['estado_servicio' => 'en_servicio']);
            }

            $maniobristasAsignados = DB::table('informacion_operativa')
                ->whereNotNull('tarjeton_maniobrista')
                ->where('tarjeton_maniobrista', '!=', '')
                ->pluck('tarjeton_maniobrista')
                ->toArray();

            if (! empty($maniobristasAsignados)) {
                DB::table('maniobristas')->whereIn('tarjeton', $maniobristasAsignados)->update(['estado_servicio' => 'en_servicio']);
            }

            DB::commit();

            return response()->json(['status' => 'success', 'message' => "Cambio de día aplicado desde {$dia}."], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Fallo al aplicar cambio de día desde {$dia}: ".$e->getMessage());

            return response()->json(['error' => 'Error al aplicar el cambio de día.', 'detalle' => $e->getMessage()], 500);
        }
    }

    public function actualizarAdicionales(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'falla' => 'nullable|string|max:100',
            'corridas' => 'nullable|integer',
            'ciclo' => 'nullable|string|max:50',
            'motivo' => 'nullable|string|max:150',
        ]);

        $tipoNormalizado = strtolower(trim($request->tipo));
        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);

        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select(
                'informacion_operativa.id',
                'informacion_operativa.unidad_id',
                'informacion_operativa.numero_tarjeton',
                'informacion_operativa.motivo',
                'informacion_operativa.ciclo',
                'informacion_operativa.corridas',
                'informacion_operativa.falla'
            )
            ->first();

        if (! $registro) {
            return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada en la operación de hoy'], 404);
        }

        $updateData = [];
        if ($request->has('falla')) {
            $updateData['falla'] = $request->falla;
        }
        if ($request->has('corridas')) {
            $updateData['corridas'] = $request->corridas;
        }
        if ($request->has('ciclo')) {
            $updateData['ciclo'] = $request->ciclo;
        }
        if ($request->has('motivo')) {
            $updateData['motivo'] = $request->motivo;
        }

        try {
            if (! empty($updateData)) {
                DB::table('informacion_operativa')
                    ->where('id', $registro->id)
                    ->update($updateData);

                // Logica para sumar o restar faltas si el motivo cambia a/desde "Falta de Operador"
                if ($request->has('motivo') && ! empty($registro->numero_tarjeton)) {
                    $oldMotivo = strtoupper(trim((string) ($registro->motivo ?? '')));
                    $newMotivo = strtoupper(trim((string) ($request->motivo ?? '')));
                    $motivoFalta = 'FALTA DE OPERADOR';

                    if ($newMotivo === $motivoFalta && $oldMotivo !== $motivoFalta) {
                        // Agregar falta al conductor
                        DB::table('conductores')->where('tarjeton', $registro->numero_tarjeton)->increment('faltas');
                    } elseif ($oldMotivo === $motivoFalta && $newMotivo !== $motivoFalta) {
                        // Quitar falta si se equivocaron
                        DB::table('conductores')->where('tarjeton', $registro->numero_tarjeton)->where('faltas', '>', 0)->decrement('faltas');
                    }
                }

                // Registrar en bitácora datos adicionales modificados
                try {
                    $detallesArray = [];
                    if ($request->has('corridas') && $request->corridas != ($registro->corridas ?? null)) {
                        $detallesArray[] = 'CORRIDAS: '.($registro->corridas ?? '0').' -> '.$request->corridas;
                    }
                    if ($request->has('ciclo') && $request->ciclo != ($registro->ciclo ?? null)) {
                        $detallesArray[] = 'CICLO: '.($registro->ciclo ?? 'N/A').' -> '.($request->ciclo ?? 'N/A');
                    }
                    if ($request->has('motivo') && $request->motivo != ($registro->motivo ?? null)) {
                        $detallesArray[] = 'MOTIVO: '.($registro->motivo ?? 'SIN MOTIVO').' -> '.($request->motivo ?? 'SIN MOTIVO');
                    }
                    if ($request->has('falla') && $request->falla != ($registro->falla ?? null)) {
                        $detallesArray[] = 'FALLA: '.($registro->falla ?? 'SIN FALLA').' -> '.($request->falla ?? 'SIN FALLA');
                    }

                    if (! empty($detallesArray) && ! empty($registro->unidad_id)) {
                        BitacoraHelper::registrarCambio(
                            $registro->unidad_id,
                            'ACTUALIZACION_DATOS',
                            'ACTUALIZACIÓN DE DATOS - '.implode(' | ', $detallesArray)
                        );
                    }
                } catch (\Throwable $bitacoraEx) {
                    \Log::warning('Bitacora error al actualizar adicionales: '.$bitacoraEx->getMessage());
                }
            }

            return response()->json(['status' => 'success', 'message' => 'Datos adicionales guardados'], 200);

        } catch (\Throwable $e) {
            \Log::error('Error en actualizarAdicionales: '.$e->getMessage());

            return response()->json(['status' => 'error', 'message' => 'Error al guardar los datos adicionales'], 500);
        }
    }

    /**
     * Actualiza el tarjetón de una unidad y asigna automáticamente al conductor del catálogo
     */
    public function actualizarTarjeton(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'tarjeton' => 'required|string',
        ]);

        $tipoNormalizado = strtolower(trim($request->tipo));

        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);
        $tarjetonLimpio = trim($request->tarjeton);

        $conductor = DB::table('conductores')
            ->where('tarjeton', $tarjetonLimpio)
            ->first();

        if (! $conductor) {
            return response()->json([
                'status' => 'error',
                'message' => "El tarjetón {$tarjetonLimpio} no está registrado en el catálogo de conductores.",
            ], 422);
        }

        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select('informacion_operativa.id', 'informacion_operativa.numero_tarjeton', 'informacion_operativa.nombre_conductor', 'informacion_operativa.unidad_id')
            ->first();

        if (! $registro) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en la operación.',
            ], 404);
        }

        // Desasignar conductor de otra unidad si estaba asignado
        DB::table('informacion_operativa')
            ->where('numero_tarjeton', $tarjetonLimpio)
            ->where('id', '!=', $registro->id)
            ->update([
                'numero_tarjeton' => null,
                'nombre_conductor' => null,
            ]);

        DB::table('informacion_operativa')
            ->where('id', $registro->id)
            ->update([
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $conductor->nombre,
            ]);

        if ($registro->numero_tarjeton && $registro->numero_tarjeton !== $tarjetonLimpio) {
            DB::table('conductores')
                ->where('tarjeton', $registro->numero_tarjeton)
                ->update(['estado_servicio' => 'disponible']);
        }

        DB::table('conductores')
            ->where('tarjeton', $tarjetonLimpio)
            ->update(['estado_servicio' => 'en_servicio']);

        BitacoraHelper::registrarCambio(
            $registro->unidad_id,
            'ASIGNAR_OPERADOR',
            'ASIGNACIÓN DE CONDUCTOR - TARJETÓN '.$tarjetonLimpio.' ('.strtoupper($conductor->nombre).')'.($registro->nombre_conductor ? ' REEMPLAZA A: '.strtoupper($registro->nombre_conductor) : ''),
            $registro->nombre_conductor ?? 'SIN ASIGNAR',
            $conductor->nombre
        );

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => 'Tarjetón y conductor asignados correctamente.',
            'tarjeton' => $tarjetonLimpio,
            'conductor' => $conductor->nombre,
        ], 200);
    }

    /**
     * Actualiza la hora de salida de patio y el acople de una unidad en el día actual
     */
    public function actualizarHoras(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'hora_salida_patio' => 'nullable|string',
            'acople' => 'nullable|string',
            'hora_encierro' => 'nullable|string',
            'hora_real_salida_patio' => 'nullable|string',
            'observaciones' => 'nullable|string|max:150',
        ]);

        \Log::info('[actualizarHoras] Payload: ', $request->all());

        $tipoNormalizado = strtolower(trim($request->tipo));
        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);

        try {
            return DB::transaction(function () use ($request, $tipoNormalizado, $numeroEcoClean) {
                // Primero obtenemos la unidad
                $unidad = DB::table('unidades')->where('numero_eco', $numeroEcoClean)->first();
                if (! $unidad) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Unidad no encontrada',
                    ], 404);
                }

                $tiposBusqueda = self::normalizarTiposTransporte($request->tipo);

                // Ahora obtenemos el registro operativo con bloqueo para evitar concurrencia
                $registro = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidad->id)
                    ->whereIn(DB::raw('LOWER(tipo)'), $tiposBusqueda)
                    ->lockForUpdate()
                    ->first();

                if (! $registro) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Unidad no encontrada en el registro operativo. Debug: ID='.$unidad->id.', tipo='.$tipoNormalizado,
                    ], 404);
                }

                // Verificación de concurrencia para la validación de salida
                if ($request->has('hora_real_salida_patio') && ! empty($request->hora_real_salida_patio)) {
                    if (! empty($registro->hora_real_salida_patio)) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Esta unidad ya fue validada por otro usuario (Concurrencia).',
                        ], 422);
                    }
                }

                $updateData = [
                    'hora_salida_patio' => $request->hora_salida_patio,
                    'acople' => $request->acople,
                ];

                if ($request->has('hora_encierro')) {
                    $updateData['hora_encierro'] = $request->hora_encierro;
                }

                if ($request->has('hora_real_salida_patio')) {
                    $updateData['hora_real_salida_patio'] = $request->hora_real_salida_patio;
                    if (! empty($request->hora_real_salida_patio)) {
                        $updateData['estatus'] = 'operacion';
                        $updateData['fecha_registro'] = Carbon::now('America/Mexico_City')->toDateString();
                    }
                }

                if ($request->has('ruta') && ! empty($request->ruta) && ! str_contains(strtolower($request->ruta), 'seleccione')) {
                    $updateData['ruta'] = substr(trim((string)$request->ruta), 0, 20);
                }
                if ($request->has('tarjeton') && ! empty($request->tarjeton) && ! str_contains(strtolower($request->tarjeton), 'seleccione')) {
                    $updateData['numero_tarjeton'] = trim((string)$request->tarjeton);
                }
                if ($request->has('conductor') && ! empty($request->conductor) && ! str_contains(strtolower($request->conductor), 'seleccione')) {
                    $updateData['nombre_conductor'] = trim((string)$request->conductor);
                }
                if ($request->has('corridas') && $request->corridas !== null) {
                    $updateData['corridas'] = $request->corridas;
                }
                if ($request->has('corrida') && $request->corrida !== null) {
                    $updateData['corridas'] = $request->corrida;
                }

                if ($request->has('observaciones')) {
                    $updateData['observaciones'] = $request->observaciones;
                }

                $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
                $filteredUpdate = array_intersect_key($updateData, $targetCols);

                DB::table('informacion_operativa')
                    ->where('id', $registro->id)
                    ->update($filteredUpdate);

                // Registrar acción detallada en la bitácora de cambios
                if ($request->filled('hora_real_salida_patio')) {
                    self::registrarAsistenciaDespacho(
                        $registro->unidad_id,
                        $request->hora_real_salida_patio,
                        $request->all(),
                        $registro
                    );

                    BitacoraHelper::registrarCambio(
                        $registro->unidad_id,
                        'VALIDAR_DESPACHO',
                        'SALIDA VALIDADA DE PATIO A LAS '.$request->hora_real_salida_patio.($request->observaciones ? ' - OBS: '.strtoupper($request->observaciones) : ''),
                        $registro->estatus ?? 'reserva',
                        'operacion'
                    );
                } else {
                    $detallesHoras = [];
                    if ($request->has('hora_salida_patio') && $request->hora_salida_patio !== $registro->hora_salida_patio) {
                        $detallesHoras[] = 'HORA SALIDA: '.($registro->hora_salida_patio ?? 'SIN ASIGNAR').' -> '.($request->hora_salida_patio ?? 'SIN ASIGNAR');
                    }
                    if ($request->has('acople') && $request->acople !== $registro->acople) {
                        $detallesHoras[] = 'ACOPLE: '.($registro->acople ?? 'SIN ASIGNAR').' -> '.($request->acople ?? 'SIN ASIGNAR');
                    }
                    if ($request->has('hora_encierro') && $request->hora_encierro !== $registro->hora_encierro) {
                        $detallesHoras[] = 'ENCIERRO: '.($registro->hora_encierro ?? 'SIN ASIGNAR').' -> '.($request->hora_encierro ?? 'SIN ASIGNAR');
                    }
                    if ($request->has('observaciones') && $request->observaciones !== $registro->observaciones) {
                        $detallesHoras[] = 'OBSERVACIONES: '.($request->observaciones ?? 'SIN OBS');
                    }
                    if (empty($detallesHoras)) {
                        $detallesHoras[] = 'ACTUALIZACIÓN DE HORARIO / ACOPLE';
                    }

                    BitacoraHelper::registrarCambio(
                        $registro->unidad_id,
                        'CAMBIO_HORAS',
                        implode(' | ', $detallesHoras)
                    );
                }

                self::procesarEncierrosAutomaticos();
                SyncService::notifyChange();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Horas actualizadas exitosamente',
                    'hora_salida_patio' => $request->hora_salida_patio,
                    'acople' => $request->acople,
                    'hora_encierro' => $request->hora_encierro ?? $registro->hora_encierro,
                    'hora_real_salida_patio' => $request->hora_real_salida_patio ?? null,
                ], 200);
            });
        } catch (\Exception $e) {
            \Log::error('Error en actualizarHoras: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar las horas: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene todos los registros de información operativa del día actual,
     * formateados para la tabla de vista previa del Capturista.
     */
    public function obtenerDatosHoy()
    {
        self::verificarYEjecutarCambioDiaAutomatico();

        self::procesarEncierrosAutomaticos();

        $hasRelevo = Schema::hasColumn('informacion_operativa', 'relevo_tarjeton');
        $hasHoraEncierro = Schema::hasColumn('informacion_operativa', 'hora_encierro');
        $hasHoraRealSalidaPatio = Schema::hasColumn('informacion_operativa', 'hora_real_salida_patio');
        $hasHoraSalida = Schema::hasColumn('informacion_operativa', 'hora_salida');

        $colSalidaPatio = $hasHoraRealSalidaPatio 
            ? 'informacion_operativa.hora_real_salida_patio' 
            : ($hasHoraSalida ? 'informacion_operativa.hora_salida as hora_real_salida_patio' : DB::raw('NULL as hora_real_salida_patio'));

        $hoyMexico = Carbon::now('America/Mexico_City')->toDateString();
        $hoyUtc = Carbon::now('UTC')->toDateString();
        $horaActual = Carbon::now('America/Mexico_City')->format('H:i');

        $idsEncerradasHoy = DB::table('historial_operativo')
            ->where('momento', 'ENCIERRO')
            ->where(function ($q) use ($hoyMexico, $hoyUtc) {
                $q->whereIn('fecha_historial', [$hoyMexico, $hoyUtc])
                    ->orWhereDate('created_at', $hoyMexico)
                    ->orWhereDate('created_at', $hoyUtc);
            })
            ->pluck('unidad_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();

        $idsOperacion = DB::table('informacion_operativa')
            ->whereRaw("LOWER(estatus) = 'operacion'")
            ->pluck('unidad_id')
            ->map(fn ($id) => (int) $id)
            ->toArray();
        $idsEncerradasHoy = array_values(array_diff($idsEncerradasHoy, $idsOperacion));

        $registros = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
            ->select(
                'unidades.id as unidad_id',
                'unidades.numero_eco',
                DB::raw('COALESCE(informacion_operativa.tipo, transportes.nombre) as tipo'),
                'informacion_operativa.ruta',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.tarjeton_maniobrista',
                'informacion_operativa.nombre_maniobrista',
                $hasRelevo ? 'informacion_operativa.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevo ? 'informacion_operativa.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevo ? 'informacion_operativa.relevo_hora' : DB::raw('NULL as relevo_hora'),
                DB::raw("COALESCE(informacion_operativa.estatus, 'reserva') as estatus"),
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
                'informacion_operativa.ciclo',
                'informacion_operativa.motivo',
                'informacion_operativa.motivo_estatus',
                'informacion_operativa.folio_mantenimiento',
                'informacion_operativa.numero_incidencia',
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.firma_base64',
                'informacion_operativa.hora_salida_patio',
                'informacion_operativa.acople',
                $hasHoraEncierro ? 'informacion_operativa.hora_encierro' : DB::raw('NULL as hora_encierro'),
                $colSalidaPatio,
                'informacion_operativa.patio_norte',
                'informacion_operativa.itinerario',
                'informacion_operativa.hora_incorporacion',
                'informacion_operativa.hora_desincorporacion',
                'informacion_operativa.mantenimiento_conductor',
                'informacion_operativa.mantenimiento_tarjeton',
                'informacion_operativa.mantenimiento_ruta',
                'informacion_operativa.mantenimiento_corrida',
                'informacion_operativa.mantenimiento_kilometraje'
            )
            ->orderBy(DB::raw('COALESCE(informacion_operativa.tipo, transportes.nombre)'))
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) use ($idsEncerradasHoy, $horaActual) {
            $estatusNorm = strtolower(trim($reg->estatus ?? 'reserva'));
            $isOperacion = ($estatusNorm === 'operacion');

            // Una unidad solo está encerrada si NO está en operación y figura en historial de encierro
            $isEncerrada = ! $isOperacion && in_array((int) $reg->unidad_id, $idsEncerradasHoy, true);

            // Solo desincorporamos datos de servicio si está en mantenimiento o percance
            $isDesincorporada = in_array($estatusNorm, ['mantenimiento', 'percance'], true);
            $horaSalidaEfectiva = $isDesincorporada ? null : $reg->hora_real_salida_patio;

            // Relevo dinámico si ya entró en vigor por horario
            $conductorEfectivo = $reg->nombre_conductor;
            $tarjetonEfectivo = $reg->tarjeton;
            if (! empty($reg->relevo_hora) && ! empty($reg->relevo_conductor) && $horaActual >= $reg->relevo_hora) {
                $conductorEfectivo = $reg->relevo_conductor;
                $tarjetonEfectivo = $reg->relevo_tarjeton;
            }

            // Desincorporación temporal por itinerario según horario actual
            $isDesincItinerario = self::esDesincorporadaPorItinerario(
                $reg->estatus,
                $reg->itinerario,
                $reg->hora_desincorporacion,
                $reg->hora_incorporacion,
                $horaActual
            );

            return [
                'UNIDAD_ID' => $reg->unidad_id,
                'unidad_id' => $reg->unidad_id,
                'TIPO_DE_UNIDAD' => strtoupper((string) ($reg->tipo ?? '')),
                'RUTA' => $isDesincorporada ? null : $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $isDesincorporada ? null : ($tarjetonEfectivo ?: $reg->tarjeton),
                'NOMBRE_CONDUCTOR' => $isDesincorporada ? null : ($conductorEfectivo ?: $reg->nombre_conductor),
                'TARJETON_TITULAR' => $reg->tarjeton,
                'CONDUCTOR_TITULAR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $isDesincorporada ? null : $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $isDesincorporada ? null : $reg->nombre_maniobrista,
                'RELEVO_TARJETON' => $isDesincorporada ? null : ($reg->relevo_tarjeton ?? ''),
                'RELEVO_CONDUCTOR' => $isDesincorporada ? null : ($reg->relevo_conductor ?? ''),
                'RELEVO_HORA' => $isDesincorporada ? null : ($reg->relevo_hora ?? ''),
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $isDesincorporada ? null : $reg->corridas,
                'CICLO' => $isDesincorporada ? null : $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'FOLIO_MANTENIMIENTO' => $reg->folio_mantenimiento,
                'FECHA_FOLIO_MANTENIMIENTO' => $reg->fecha_folio_mantenimiento,
                'NUMERO_INCIDENCIA' => $reg->numero_incidencia,
                'numero_incidencia' => $reg->numero_incidencia,
                'FALLA_REPORTADA' => $reg->falla_reportada,
                'DIAGNOSTICO' => $reg->diagnostico,
                'FIRMA_BASE64' => $reg->firma_base64,
                'HORA_DE_ACOPLE' => $isDesincorporada ? null : $reg->hora_salida_patio,
                'HORA_PROGRAMADA' => $isDesincorporada ? null : $reg->hora_salida_patio,
                'ACOPLE' => $isDesincorporada ? null : $reg->acople,
                'HORA_ENCIERRO' => $reg->hora_encierro,
                'hora_encierro' => $reg->hora_encierro,
                'HORA_SALIDA' => $horaSalidaEfectiva,
                'HORA_REAL_SALIDA_PATIO' => $horaSalidaEfectiva,
                'PATIO_NORTE' => (bool) $reg->patio_norte,
                'ITINERARIO' => (bool) $reg->itinerario,
                'HORA_INCORPORACION' => $isDesincorporada ? null : $reg->hora_incorporacion,
                'HORA_DESINCORPORACION' => $isDesincorporada ? null : $reg->hora_desincorporacion,
                'DESINCORPORADA_ITINERARIO' => $isDesincItinerario,
                'desincorporada_itinerario' => $isDesincItinerario,
                'SUB_ESTATUS' => $isDesincItinerario ? 'DESINCORPORADA POR ITINERARIO' : null,
                'MANTENIMIENTO_CONDUCTOR' => $reg->mantenimiento_conductor,
                'MANTENIMIENTO_TARJETON' => $reg->mantenimiento_tarjeton,
                'MANTENIMIENTO_RUTA' => $reg->mantenimiento_ruta,
                'MANTENIMIENTO_CORRIDA' => $reg->mantenimiento_corrida,
                'MANTENIMIENTO_KILOMETRAJE' => $reg->mantenimiento_kilometraje,
                'YA_ENCERRADA' => $isEncerrada,
                'ya_encerrada' => $isEncerrada,
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosManana()
    {
        // Si la tabla de mañana está vacía, la inicializamos con la programación actual
        if (DB::table('informacion_operativa_manana')->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            $targetCols = array_flip(Schema::getColumnListing('informacion_operativa_manana'));
            $bulkInserts = [];
            foreach ($hoy as $row) {
                unset($row->id);
                $arrayRow = (array) $row;
                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                            $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }

                // Evitar copiar el estatus de despachado/validado al día de mañana
                if (array_key_exists('hora_real_salida_patio', $insertRow)) {
                    $insertRow['hora_real_salida_patio'] = null;
                }
                if (array_key_exists('firma_base64', $insertRow)) {
                    if (!in_array(strtolower(trim($insertRow['estatus'] ?? '')), ['mantenimiento', 'percance'])) {
                        $insertRow['firma_base64'] = null;
                    }
                }

                $bulkInserts[] = $insertRow;
            }
            foreach (array_chunk($bulkInserts, 100) as $chunk) {
                DB::table('informacion_operativa_manana')->insert($chunk);
            }
        }

        $hasRelevo = Schema::hasColumn('informacion_operativa_manana', 'relevo_tarjeton');
        $hasHoraEncierro = Schema::hasColumn('informacion_operativa_manana', 'hora_encierro');
        $hasHoraRealSalidaPatio = Schema::hasColumn('informacion_operativa_manana', 'hora_real_salida_patio');
        $hasHoraSalida = Schema::hasColumn('informacion_operativa_manana', 'hora_salida');

        $colSalidaPatio = $hasHoraRealSalidaPatio 
            ? 'informacion_operativa_manana.hora_real_salida_patio' 
            : ($hasHoraSalida ? 'informacion_operativa_manana.hora_salida as hora_real_salida_patio' : DB::raw('NULL as hora_real_salida_patio'));

        $registros = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('informacion_operativa_manana', 'unidades.id', '=', 'informacion_operativa_manana.unidad_id')
            ->select(
                'unidades.numero_eco',
                DB::raw("COALESCE(NULLIF(informacion_operativa_manana.tipo, ''), transportes.nombre) as tipo"),
                'informacion_operativa_manana.ruta',
                'informacion_operativa_manana.numero_tarjeton as tarjeton',
                'informacion_operativa_manana.nombre_conductor',
                'informacion_operativa_manana.tarjeton_maniobrista',
                'informacion_operativa_manana.nombre_maniobrista',
                $hasRelevo ? 'informacion_operativa_manana.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevo ? 'informacion_operativa_manana.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                DB::raw("COALESCE(informacion_operativa_manana.estatus, 'reserva') as estatus"),
                'informacion_operativa_manana.falla',
                'informacion_operativa_manana.corridas',
                'informacion_operativa_manana.ciclo',
                'informacion_operativa_manana.motivo',
                'informacion_operativa_manana.motivo_estatus',
                'informacion_operativa_manana.folio_mantenimiento',
                'informacion_operativa_manana.numero_incidencia',
                'informacion_operativa_manana.fecha_folio_mantenimiento',
                'informacion_operativa_manana.falla_reportada',
                'informacion_operativa_manana.diagnostico',
                'informacion_operativa_manana.firma_base64',
                'informacion_operativa_manana.hora_salida_patio',
                'informacion_operativa_manana.acople',
                $hasHoraEncierro ? 'informacion_operativa_manana.hora_encierro' : DB::raw('NULL as hora_encierro'),
                $colSalidaPatio,
                'informacion_operativa_manana.patio_norte',
                'informacion_operativa_manana.itinerario',
                'informacion_operativa_manana.hora_incorporacion',
                'informacion_operativa_manana.hora_desincorporacion',
                'informacion_operativa_manana.mantenimiento_conductor',
                'informacion_operativa_manana.mantenimiento_tarjeton',
                'informacion_operativa_manana.mantenimiento_ruta',
                'informacion_operativa_manana.mantenimiento_corrida',
                'informacion_operativa_manana.mantenimiento_kilometraje'
            )
            ->orderBy(DB::raw('COALESCE(informacion_operativa_manana.tipo, transportes.nombre)'))
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => strtoupper((string) ($reg->tipo ?? '')),
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'RELEVO_TARJETON' => $reg->relevo_tarjeton ?? '',
                'RELEVO_CONDUCTOR' => $reg->relevo_conductor ?? '',
                'RELEVO_HORA' => $reg->relevo_hora ?? '',
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'FOLIO_MANTENIMIENTO' => $reg->folio_mantenimiento,
                'FECHA_FOLIO_MANTENIMIENTO' => $reg->fecha_folio_mantenimiento,
                'NUMERO_INCIDENCIA' => $reg->numero_incidencia,
                'numero_incidencia' => $reg->numero_incidencia,
                'FALLA_REPORTADA' => $reg->falla_reportada,
                'DIAGNOSTICO' => $reg->diagnostico,
                'FIRMA_BASE64' => $reg->firma_base64,
                'HORA_DE_ACOPLE' => $reg->hora_salida_patio,
                'HORA_PROGRAMADA' => $reg->hora_salida_patio,
                'ACOPLE' => $reg->acople,
                'HORA_ENCIERRO' => $reg->hora_encierro,
                'hora_encierro' => $reg->hora_encierro,
                'HORA_SALIDA' => $reg->hora_real_salida_patio,
                'HORA_REAL_SALIDA_PATIO' => $reg->hora_real_salida_patio,
                'PATIO_NORTE' => (bool) $reg->patio_norte,
                'ITINERARIO' => (bool) $reg->itinerario,
                'HORA_INCORPORACION' => $reg->hora_incorporacion,
                'HORA_DESINCORPORACION' => $reg->hora_desincorporacion,
                'MANTENIMIENTO_CONDUCTOR' => $reg->mantenimiento_conductor,
                'MANTENIMIENTO_TARJETON' => $reg->mantenimiento_tarjeton,
                'MANTENIMIENTO_RUTA' => $reg->mantenimiento_ruta,
                'MANTENIMIENTO_CORRIDA' => $reg->mantenimiento_corrida,
                'MANTENIMIENTO_KILOMETRAJE' => $reg->mantenimiento_kilometraje,
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosEspecifico($dia)
    {
        if ($dia !== 'festivo') {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_'.$dia;

        // Inicializamos con la programación actual si está vacía
        if (DB::table($tableName)->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            $targetCols = array_flip(Schema::getColumnListing($tableName));
            $bulkInserts = [];
            foreach ($hoy as $row) {
                unset($row->id);
                $arrayRow = (array) $row;
                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                            $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }
                $bulkInserts[] = $insertRow;
            }
            foreach (array_chunk($bulkInserts, 100) as $chunk) {
                DB::table($tableName)->insert($chunk);
            }
        }

        $hasRelevo = Schema::hasColumn($tableName, 'relevo_tarjeton');
        $hasHoraEncierro = Schema::hasColumn($tableName, 'hora_encierro');
        $hasHoraRealSalidaPatio = Schema::hasColumn($tableName, 'hora_real_salida_patio');
        $hasHoraSalida = Schema::hasColumn($tableName, 'hora_salida');

        $colSalidaPatio = $hasHoraRealSalidaPatio 
            ? "{$tableName}.hora_real_salida_patio" 
            : ($hasHoraSalida ? "{$tableName}.hora_salida as hora_real_salida_patio" : DB::raw('NULL as hora_real_salida_patio'));

        $registros = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin($tableName, 'unidades.id', '=', "{$tableName}.unidad_id")
            ->select(
                'unidades.numero_eco',
                DB::raw("COALESCE({$tableName}.tipo, transportes.nombre) as tipo"),
                "{$tableName}.ruta",
                "{$tableName}.numero_tarjeton as tarjeton",
                "{$tableName}.nombre_conductor",
                "{$tableName}.tarjeton_maniobrista",
                "{$tableName}.nombre_maniobrista",
                $hasRelevo ? "{$tableName}.relevo_tarjeton" : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevo ? "{$tableName}.relevo_conductor" : DB::raw('NULL as relevo_conductor'),
                $hasRelevo ? "{$tableName}.relevo_hora" : DB::raw('NULL as relevo_hora'),
                DB::raw("COALESCE({$tableName}.estatus, 'reserva') as estatus"),
                "{$tableName}.falla",
                "{$tableName}.corridas",
                "{$tableName}.ciclo",
                "{$tableName}.motivo",
                "{$tableName}.motivo_estatus",
                "{$tableName}.folio_mantenimiento",
                "{$tableName}.numero_incidencia",
                "{$tableName}.fecha_folio_mantenimiento",
                "{$tableName}.falla_reportada",
                "{$tableName}.diagnostico",
                "{$tableName}.firma_base64",
                "{$tableName}.hora_salida_patio",
                "{$tableName}.acople",
                $hasHoraEncierro ? "{$tableName}.hora_encierro" : DB::raw('NULL as hora_encierro'),
                $colSalidaPatio,
                "{$tableName}.patio_norte",
                "{$tableName}.itinerario",
                "{$tableName}.hora_incorporacion",
                "{$tableName}.hora_desincorporacion",
                "{$tableName}.mantenimiento_conductor",
                "{$tableName}.mantenimiento_tarjeton",
                "{$tableName}.mantenimiento_ruta",
                "{$tableName}.mantenimiento_corrida",
                "{$tableName}.mantenimiento_kilometraje"
            )
            ->orderBy(DB::raw("COALESCE({$tableName}.tipo, transportes.nombre)"))
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => strtoupper((string) ($reg->tipo ?? '')),
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'RELEVO_TARJETON' => $reg->relevo_tarjeton ?? '',
                'RELEVO_CONDUCTOR' => $reg->relevo_conductor ?? '',
                'RELEVO_HORA' => $reg->relevo_hora ?? '',
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'FOLIO_MANTENIMIENTO' => $reg->folio_mantenimiento,
                'FECHA_FOLIO_MANTENIMIENTO' => $reg->fecha_folio_mantenimiento,
                'NUMERO_INCIDENCIA' => $reg->numero_incidencia,
                'numero_incidencia' => $reg->numero_incidencia,
                'FALLA_REPORTADA' => $reg->falla_reportada,
                'DIAGNOSTICO' => $reg->diagnostico,
                'FIRMA_BASE64' => $reg->firma_base64,
                'HORA_DE_ACOPLE' => $reg->hora_salida_patio,
                'HORA_PROGRAMADA' => $reg->hora_salida_patio,
                'ACOPLE' => $reg->acople,
                'HORA_ENCIERRO' => $reg->hora_encierro,
                'hora_encierro' => $reg->hora_encierro,
                'HORA_SALIDA' => $reg->hora_real_salida_patio,
                'HORA_REAL_SALIDA_PATIO' => $reg->hora_real_salida_patio,
                'PATIO_NORTE' => (bool) $reg->patio_norte,
                'ITINERARIO' => (bool) $reg->itinerario,
                'HORA_INCORPORACION' => $reg->hora_incorporacion,
                'HORA_DESINCORPORACION' => $reg->hora_desincorporacion,
                'MANTENIMIENTO_CONDUCTOR' => $reg->mantenimiento_conductor,
                'MANTENIMIENTO_TARJETON' => $reg->mantenimiento_tarjeton,
                'MANTENIMIENTO_RUTA' => $reg->mantenimiento_ruta,
                'MANTENIMIENTO_CORRIDA' => $reg->mantenimiento_corrida,
                'MANTENIMIENTO_KILOMETRAJE' => $reg->mantenimiento_kilometraje,
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosMananaDuplicado()
    {
        // Si la tabla de mañana está vacía, la inicializamos con la programación actual
        if (DB::table('informacion_operativa_manana')->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            $targetCols = array_flip(Schema::getColumnListing('informacion_operativa_manana'));
            $bulkInserts = [];
            foreach ($hoy as $row) {
                unset($row->id);
                $arrayRow = (array) $row;
                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte', 'itinerario'])) {
                            $insertRow[$key] = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }

                // Evitar copiar el estatus de despachado/validado al duplicar
                if (array_key_exists('hora_real_salida_patio', $insertRow)) {
                    $insertRow['hora_real_salida_patio'] = null;
                }
                if (array_key_exists('firma_base64', $insertRow)) {
                    $insertRow['firma_base64'] = null;
                }

                $bulkInserts[] = $insertRow;
            }
            foreach (array_chunk($bulkInserts, 100) as $chunk) {
                DB::table('informacion_operativa_manana')->insert($chunk);
            }
        }

        $hasRelevo = Schema::hasColumn('informacion_operativa_manana', 'relevo_tarjeton');

        $registros = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('informacion_operativa_manana', 'unidades.id', '=', 'informacion_operativa_manana.unidad_id')
            ->select(
                'unidades.numero_eco',
                DB::raw("COALESCE(NULLIF(informacion_operativa_manana.tipo, ''), transportes.nombre) as tipo"),
                'informacion_operativa_manana.ruta',
                'informacion_operativa_manana.numero_tarjeton as tarjeton',
                'informacion_operativa_manana.nombre_conductor',
                'informacion_operativa_manana.tarjeton_maniobrista',
                'informacion_operativa_manana.nombre_maniobrista',
                $hasRelevo ? 'informacion_operativa_manana.relevo_tarjeton' : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevo ? 'informacion_operativa_manana.relevo_conductor' : DB::raw('NULL as relevo_conductor'),
                $hasRelevo ? 'informacion_operativa_manana.relevo_hora' : DB::raw('NULL as relevo_hora'),
                DB::raw("COALESCE(informacion_operativa_manana.estatus, 'reserva') as estatus"),
                'informacion_operativa_manana.falla',
                'informacion_operativa_manana.corridas',
                'informacion_operativa_manana.ciclo',
                'informacion_operativa_manana.motivo',
                'informacion_operativa_manana.motivo_estatus',
                'informacion_operativa_manana.hora_salida_patio',
                'informacion_operativa_manana.acople',
                'informacion_operativa_manana.hora_real_salida_patio',
                'informacion_operativa_manana.patio_norte',
                'informacion_operativa_manana.itinerario',
                'informacion_operativa_manana.hora_incorporacion',
                'informacion_operativa_manana.hora_desincorporacion'
            )
            ->orderBy(DB::raw('COALESCE(informacion_operativa_manana.tipo, transportes.nombre)'))
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => strtoupper((string) ($reg->tipo ?? '')),
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'RELEVO_TARJETON' => $reg->relevo_tarjeton ?? '',
                'RELEVO_CONDUCTOR' => $reg->relevo_conductor ?? '',
                'RELEVO_HORA' => $reg->relevo_hora ?? '',
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_salida_patio,
                'HORA_PROGRAMADA' => $reg->hora_salida_patio,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_real_salida_patio,
                'HORA_REAL_SALIDA_PATIO' => $reg->hora_real_salida_patio,
                'PATIO_NORTE' => filter_var($reg->patio_norte, FILTER_VALIDATE_BOOLEAN),
                'ITINERARIO' => filter_var($reg->itinerario, FILTER_VALIDATE_BOOLEAN),
                'HORA_INCORPORACION' => $reg->hora_incorporacion,
                'HORA_DESINCORPORACION' => $reg->hora_desincorporacion,
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosEspecificoDuplicado($dia)
    {
        if ($dia !== 'festivo') {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_'.$dia;

        // Inicializamos con la programación actual si está vacía
        if (DB::table($tableName)->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            foreach ($hoy as $row) {
                unset($row->id);
                DB::table($tableName)->insert((array) $row);
            }
        }

        $hasRelevo = Schema::hasColumn($tableName, 'relevo_tarjeton');

        $registros = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin($tableName, 'unidades.id', '=', "{$tableName}.unidad_id")
            ->select(
                'unidades.numero_eco',
                DB::raw("COALESCE({$tableName}.tipo, transportes.nombre) as tipo"),
                "{$tableName}.ruta",
                "{$tableName}.numero_tarjeton as tarjeton",
                "{$tableName}.nombre_conductor",
                "{$tableName}.tarjeton_maniobrista",
                "{$tableName}.nombre_maniobrista",
                $hasRelevo ? "{$tableName}.relevo_tarjeton" : DB::raw('NULL as relevo_tarjeton'),
                $hasRelevo ? "{$tableName}.relevo_conductor" : DB::raw('NULL as relevo_conductor'),
                $hasRelevo ? "{$tableName}.relevo_hora" : DB::raw('NULL as relevo_hora'),
                DB::raw("COALESCE({$tableName}.estatus, 'reserva') as estatus"),
                "{$tableName}.falla",
                "{$tableName}.corridas",
                "{$tableName}.ciclo",
                "{$tableName}.motivo",
                "{$tableName}.motivo_estatus",
                "{$tableName}.hora_salida_patio",
                "{$tableName}.acople",
                "{$tableName}.hora_real_salida_patio",
                "{$tableName}.patio_norte",
                "{$tableName}.itinerario",
                "{$tableName}.hora_incorporacion",
                "{$tableName}.hora_desincorporacion"
            )
            ->orderBy(DB::raw("COALESCE({$tableName}.tipo, transportes.nombre)"))
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => strtoupper((string) ($reg->tipo ?? '')),
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'RELEVO_TARJETON' => $reg->relevo_tarjeton ?? '',
                'RELEVO_CONDUCTOR' => $reg->relevo_conductor ?? '',
                'RELEVO_HORA' => $reg->relevo_hora ?? '',
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_salida_patio,
                'HORA_PROGRAMADA' => $reg->hora_salida_patio,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_real_salida_patio,
                'HORA_REAL_SALIDA_PATIO' => $reg->hora_real_salida_patio,
                'PATIO_NORTE' => filter_var($reg->patio_norte, FILTER_VALIDATE_BOOLEAN),
                'ITINERARIO' => filter_var($reg->itinerario, FILTER_VALIDATE_BOOLEAN),
                'HORA_INCORPORACION' => $reg->hora_incorporacion,
                'HORA_DESINCORPORACION' => $reg->hora_desincorporacion,
            ];
        });

        return response()->json($formateados, 200);
    }

    /**
     * Obtiene la programación de inicio para el día de hoy.
     */
    public function obtenerInicioHoy()
    {
        $fechaHoy = Carbon::today()->toDateString();

        // Asegurar que exista el snapshot si se consulta
        BitacoraHelper::ensureInicioSnapshot();

        $columns = [
            'unidades.numero_eco',
            DB::raw('COALESCE(historial_operativo.tipo, transportes.nombre) as tipo'),
            'historial_operativo.ruta',
            'historial_operativo.numero_tarjeton as tarjeton',
            'historial_operativo.nombre_conductor',
            DB::raw("COALESCE(historial_operativo.estatus, 'reserva') as estatus"),
            'historial_operativo.falla',
            'historial_operativo.corridas',
            'historial_operativo.ciclo',
            'historial_operativo.motivo',
            'historial_operativo.motivo_estatus',
        ];

        $hasManiobrista = Schema::hasColumn('historial_operativo', 'tarjeton_maniobrista');
        if ($hasManiobrista) {
            $columns[] = 'historial_operativo.tarjeton_maniobrista';
            $columns[] = 'historial_operativo.nombre_maniobrista';
        }

        $hasHoraSalidaPatio = Schema::hasColumn('historial_operativo', 'hora_salida_patio');
        if ($hasHoraSalidaPatio) {
            $columns[] = 'historial_operativo.hora_salida_patio';
        }

        $hasAcople = Schema::hasColumn('historial_operativo', 'acople');
        if ($hasAcople) {
            $columns[] = 'historial_operativo.acople';
        }

        $hasHoraRealSalida = Schema::hasColumn('historial_operativo', 'hora_real_salida_patio');
        $hasHoraSalidaLegacy = Schema::hasColumn('historial_operativo', 'hora_salida');
        $hasHoraSalida = $hasHoraRealSalida || $hasHoraSalidaLegacy;
        if ($hasHoraRealSalida) {
            $columns[] = 'historial_operativo.hora_real_salida_patio';
        } elseif ($hasHoraSalidaLegacy) {
            $columns[] = 'historial_operativo.hora_salida as hora_real_salida_patio';
        }

        $hasPatioNorte = Schema::hasColumn('historial_operativo', 'patio_norte');
        if ($hasPatioNorte) {
            $columns[] = 'historial_operativo.patio_norte';
        }

        $hasItinerario = Schema::hasColumn('historial_operativo', 'itinerario');
        if ($hasItinerario) {
            $columns[] = 'historial_operativo.itinerario';
        }

        $hasHoraIncorp = Schema::hasColumn('historial_operativo', 'hora_incorporacion');
        if ($hasHoraIncorp) {
            $columns[] = 'historial_operativo.hora_incorporacion';
        }

        $hasHoraDesinc = Schema::hasColumn('historial_operativo', 'hora_desincorporacion');
        if ($hasHoraDesinc) {
            $columns[] = 'historial_operativo.hora_desincorporacion';
        }

        $hasHoraEncierro = Schema::hasColumn('historial_operativo', 'hora_encierro');
        if ($hasHoraEncierro) {
            $columns[] = 'historial_operativo.hora_encierro';
        }

        $registros = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->leftJoin('historial_operativo', function ($join) use ($fechaHoy) {
                $join->on('unidades.id', '=', 'historial_operativo.unidad_id')
                    ->where('historial_operativo.fecha_historial', $fechaHoy)
                    ->where('historial_operativo.momento', 'INICIO');
            })
            ->select($columns)
            ->orderBy(DB::raw('COALESCE(historial_operativo.tipo, transportes.nombre)'))
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) use ($hasManiobrista, $hasHoraSalidaPatio, $hasAcople, $hasHoraEncierro, $hasHoraSalida, $hasPatioNorte, $hasItinerario, $hasHoraIncorp, $hasHoraDesinc) {
            return [
                'TIPO_DE_UNIDAD' => strtoupper((string) ($reg->tipo ?? '')),
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $hasManiobrista ? $reg->tarjeton_maniobrista : '',
                'NOMBRE_MANIOBRISTA' => $hasManiobrista ? $reg->nombre_maniobrista : '',
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $hasHoraSalidaPatio ? $reg->hora_salida_patio : '',
                'HORA_PROGRAMADA' => $hasHoraSalidaPatio ? $reg->hora_salida_patio : '',
                'ACOPLE' => $hasAcople ? $reg->acople : '',
                'HORA_ENCIERRO' => $hasHoraEncierro ? $reg->hora_encierro : '',
                'hora_encierro' => $hasHoraEncierro ? $reg->hora_encierro : '',
                'HORA_SALIDA' => $hasHoraSalida ? $reg->hora_real_salida_patio : '',
                'HORA_REAL_SALIDA_PATIO' => $hasHoraSalida ? $reg->hora_real_salida_patio : '',
                'PATIO_NORTE' => $hasPatioNorte ? (bool) $reg->patio_norte : false,
                'ITINERARIO' => $hasItinerario ? (bool) $reg->itinerario : false,
                'HORA_INCORPORACION' => $hasHoraIncorp ? $reg->hora_incorporacion : '',
                'HORA_DESINCORPORACION' => $hasHoraDesinc ? $reg->hora_desincorporacion : '',
            ];
        });

        return response()->json($formateados, 200);
    }

    public function validarDespacho(Request $request)
    {
        $request->validate([
            'tipo' => 'required',
            'numero_eco' => 'required',
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));

        try {
            return DB::transaction(function () use ($numeroEco, $tipoNormalizado, $request) {
                $unidad = DB::table('unidades')->where('numero_eco', $numeroEco)->first();

                if (! $unidad) {
                    return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada'], 404);
                }

                $tiposBusqueda = self::normalizarTiposTransporte($request->tipo);

                $registroOperativo = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidad->id)
                    ->whereIn(DB::raw('LOWER(tipo)'), $tiposBusqueda)
                    ->lockForUpdate()
                    ->first();

                if (! $registroOperativo) {
                    return response()->json(['status' => 'error', 'message' => 'Sin registro operativo'], 404);
                }

                if ($registroOperativo->hora_real_salida_patio !== null && $registroOperativo->hora_real_salida_patio !== '') {
                    return response()->json(['status' => 'error', 'message' => 'Esta unidad ya fue validada por otro usuario (Concurrencia).'], 422);
                }

                $updateData = [];
                if ($request->has('ruta') && ! empty($request->ruta) && ! str_contains(strtolower($request->ruta), 'seleccione')) {
                    $updateData['ruta'] = substr(trim((string)$request->ruta), 0, 20);
                }
                if ($request->has('tarjeton') && ! empty($request->tarjeton) && ! str_contains(strtolower($request->tarjeton), 'seleccione')) {
                    $updateData['numero_tarjeton'] = trim((string)$request->tarjeton);
                }
                if ($request->has('conductor') && ! empty($request->conductor) && ! str_contains(strtolower($request->conductor), 'seleccione')) {
                    $updateData['nombre_conductor'] = trim((string)$request->conductor);
                }
                if ($request->has('corridas') || $request->has('corrida')) {
                    $updateData['corridas'] = $request->corridas ?? $request->corrida;
                }
                if ($request->has('hora_salida_patio')) {
                    $updateData['hora_salida_patio'] = $request->hora_salida_patio;
                }
                if ($request->has('acople')) {
                    $updateData['acople'] = $request->acople;
                }
                if ($request->has('ciclo')) {
                    $updateData['ciclo'] = $request->ciclo;
                }
                if ($request->has('motivo')) {
                    $updateData['motivo'] = $request->motivo;
                }
                if ($request->has('falla')) {
                    $updateData['falla'] = $request->falla;
                }
                if ($request->has('hora_real_salida_patio')) {
                    $updateData['hora_real_salida_patio'] = $request->hora_real_salida_patio;
                }
                $updateData['estatus'] = 'operacion';
                $updateData['fecha_registro'] = Carbon::now('America/Mexico_City')->toDateString();

                DB::table('informacion_operativa')
                    ->where('id', $registroOperativo->id)
                    ->update($updateData);

                $horaSalidaValidada = $request->hora_real_salida_patio ?: Carbon::now('America/Mexico_City')->format('H:i:s');
                self::registrarAsistenciaDespacho(
                    $unidad->id,
                    $horaSalidaValidada,
                    $request->all(),
                    $registroOperativo
                );

                BitacoraHelper::registrarCambio(
                    $unidad->id,
                    'VALIDAR_DESPACHO',
                    'UNIDAD VALIDADA Y DESPACHADA.'
                );

                return response()->json([
                    'status' => 'success',
                    'message' => 'Despacho validado exitosamente',
                    'hora_real_salida_patio' => $request->hora_real_salida_patio,
                    'ruta' => $request->ruta,
                    'tarjeton' => $request->tarjeton,
                    'conductor' => $request->conductor,
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Error en validarDespacho: '.$e->getMessage());

            return response()->json(['status' => 'error', 'message' => 'Error al validar: '.$e->getMessage()], 500);
        }
    }

    /**
     * Registra la asistencia del conductor y relevo al despachar/validar una unidad.
     * Actualiza asistencias_detalle en conductores, estado_servicio='en_servicio',
     * limpia faltas/descansos en conflicto para esa fecha y sincroniza historial_operativo.
     */
    public static function registrarAsistenciaDespacho($unidadId, $horaRealSalida, $datosContexto = [], $registroActual = null)
    {
        try {
            $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();

            // 1. Obtener datos operativos más recientes de la unidad
            $info = $registroActual;
            if (!$info || !isset($info->numero_tarjeton)) {
                $info = DB::table('informacion_operativa')->where('unidad_id', $unidadId)->first();
            }

            if (!$info && empty($datosContexto)) {
                return;
            }

            $unidad = DB::table('unidades')->where('id', $unidadId)->first();
            $eco = $unidad ? $unidad->numero_eco : ($datosContexto['numero_eco'] ?? null);

            $ruta = $datosContexto['ruta'] ?? ($info->ruta ?? null);
            $tarjetonTitular = $datosContexto['tarjeton'] ?? ($datosContexto['numero_tarjeton'] ?? ($info->numero_tarjeton ?? null));
            $nombreTitular = $datosContexto['conductor'] ?? ($datosContexto['nombre_conductor'] ?? ($info->nombre_conductor ?? null));

            $relevoTarjeton = $datosContexto['relevo_tarjeton'] ?? ($info->relevo_tarjeton ?? null);
            $relevoConductor = $datosContexto['relevo_conductor'] ?? ($info->relevo_conductor ?? null);

            $horaSalidaEfectiva = !empty($horaRealSalida) ? $horaRealSalida : ($datosContexto['hora_salida_patio'] ?? ($info->hora_salida_patio ?? Carbon::now('America/Mexico_City')->format('H:i:s')));

            // 2. Procesar conductor titular
            if (!empty($tarjetonTitular) || !empty($nombreTitular)) {
                $condTitular = self::buscarConductorFlexible($tarjetonTitular, $nombreTitular);
                if ($condTitular) {
                    self::asignarAsistenciaConductorIndividual($condTitular, $fechaHoy, [
                        'numero_eco' => $eco,
                        'ruta' => $ruta,
                        'hora_salida' => $horaSalidaEfectiva,
                        'es_relevo' => false,
                        'motivo' => "Despacho validado en Unidad {$eco} (Ruta {$ruta})"
                    ]);
                }
            }

            // 3. Procesar conductor relevo si está asignado
            if (!empty($relevoTarjeton) || !empty($relevoConductor)) {
                $condRelevo = self::buscarConductorFlexible($relevoTarjeton, $relevoConductor);
                if ($condRelevo) {
                    self::asignarAsistenciaConductorIndividual($condRelevo, $fechaHoy, [
                        'numero_eco' => $eco,
                        'ruta' => $ruta,
                        'hora_salida' => $horaSalidaEfectiva,
                        'es_relevo' => true,
                        'motivo' => "Relevo despachado en Unidad {$eco} (Ruta {$ruta})"
                    ]);
                }
            }

            // 4. Sincronizar en historial_operativo para la fecha de hoy
            if (Schema::hasTable('historial_operativo')) {
                $historialCols = array_flip(Schema::getColumnListing('historial_operativo'));
                $updateHist = [];

                if (isset($historialCols['hora_real_salida_patio']) && !empty($horaSalidaEfectiva)) {
                    $updateHist['hora_real_salida_patio'] = $horaSalidaEfectiva;
                }
                if (isset($historialCols['hora_salida']) && !empty($horaSalidaEfectiva)) {
                    $updateHist['hora_salida'] = $horaSalidaEfectiva;
                }
                if (!empty($tarjetonTitular)) {
                    $updateHist['numero_tarjeton'] = $tarjetonTitular;
                }
                if (!empty($nombreTitular)) {
                    $updateHist['nombre_conductor'] = $nombreTitular;
                }
                if (!empty($ruta)) {
                    $updateHist['ruta'] = $ruta;
                }
                if (!empty($relevoTarjeton)) {
                    $updateHist['relevo_tarjeton'] = $relevoTarjeton;
                }
                if (!empty($relevoConductor)) {
                    $updateHist['relevo_conductor'] = $relevoConductor;
                }
                $updateHist['updated_at'] = Carbon::now('America/Mexico_City');

                $affected = DB::table('historial_operativo')
                    ->where('unidad_id', $unidadId)
                    ->where('fecha_historial', $fechaHoy)
                    ->update($updateHist);

                // Si no existía registro en historial_operativo para hoy, crearlo
                if ($affected === 0 && $unidad) {
                    $insertHist = array_merge([
                        'unidad_id' => $unidadId,
                        'fecha_historial' => $fechaHoy,
                        'momento' => 'INICIO',
                        'tipo' => $unidad->tipo_transporte ?? ($info->tipo ?? 'Autobús'),
                        'estatus' => 'operacion',
                        'created_at' => Carbon::now('America/Mexico_City'),
                    ], $updateHist);
                    $insertValido = array_intersect_key($insertHist, $historialCols);
                    DB::table('historial_operativo')->insert($insertValido);
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Error en DespachoController::registrarAsistenciaDespacho: ' . $e->getMessage());
        }
    }

    /**
     * Búsqueda flexible de conductor por tarjetón o nombre, tolerante a ceros a la izquierda
     * y orden de nombres/apellidos.
     */
    public static function buscarConductorFlexible($tarjeton, $nombre = null)
    {
        // 1. Búsqueda por tarjetón usando PlataformaController
        if (!empty($tarjeton)) {
            $rawTarjeton = trim((string)$tarjeton);
            if (!in_array(strtolower($rawTarjeton), ['sin tarjeton', 'seleccione', 's/t', 'null', '0'])) {
                $cond = PlataformaController::buscarConductorPorTarjeton($rawTarjeton);
                if ($cond) {
                    return Conductor::find($cond->id);
                }

                // Intentar buscar candidatos extrayendo dígitos exactos
                $soloDigitos = preg_replace('/\D/', '', $rawTarjeton);
                if (!empty($soloDigitos)) {
                    $candidatos = PlataformaController::obtenerCandidatosTarjeton($soloDigitos);
                    $cond = DB::table('conductores')
                        ->whereIn('tarjeton', $candidatos)
                        ->first();
                    if ($cond) {
                        return Conductor::find($cond->id);
                    }
                }
            }
        }

        // 2. Búsqueda por nombre si se proporcionó
        if (!empty($nombre)) {
            $nombreLimpio = trim((string)$nombre);
            if (!in_array(strtolower($nombreLimpio), ['sin conductor', 'seleccione', 's/c', 'null'])) {
                $tokensBuscados = self::tokenizarNombre($nombreLimpio);
                if (!empty($tokensBuscados)) {
                    $conductores = Conductor::where('estatus', '!=', 'baja')
                        ->orWhereNull('estatus')
                        ->get();

                    $coincidencias = [];
                    foreach ($conductores as $c) {
                        $nombreCompleto1 = ($c->nombres ?? '') . ' ' . ($c->apellidos ?? '');
                        $tokens1 = self::tokenizarNombre($nombreCompleto1);
                        if ($tokensBuscados === $tokens1) {
                            return $c;
                        }

                        $significativosBuscados = array_filter(explode(' ', $tokensBuscados), fn($w) => strlen($w) >= 3);
                        $significativosC = array_filter(explode(' ', $tokens1), fn($w) => strlen($w) >= 3);
                        if (!empty($significativosBuscados) && !empty($significativosC)) {
                            $interseccion = array_intersect($significativosBuscados, $significativosC);
                            if (count($interseccion) === count($significativosBuscados) && count($interseccion) >= 2) {
                                $coincidencias[] = $c;
                            }
                        }
                    }

                    // Solo si hay exactamente una coincidencia unívoca (evitar ambigüedad)
                    if (count($coincidencias) === 1) {
                        return $coincidencias[0];
                    }
                }
            }
        }

        return null;
    }

    public static function tokenizarNombre($str)
    {
        if (empty($str)) return '';
        $str = mb_strtoupper(trim((string)$str), 'UTF-8');
        $unwanted = [
            'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U', 'Ü'=>'U', 'Ñ'=>'N'
        ];
        $str = strtr($str, $unwanted);
        $str = preg_replace('/[^A-Z0-9\s]/', ' ', $str);
        $words = preg_split('/\s+/', $str, -1, PREG_SPLIT_NO_EMPTY);
        sort($words);
        return implode(' ', $words);
    }

    /**
     * Asigna la asistencia a un conductor en su asistencias_detalle,
     * limpia faltas y descansos en conflicto para esa fecha, y actualiza estado_servicio.
     */
    public static function asignarAsistenciaConductorIndividual($conductor, $fecha, $datosExtra = [])
    {
        if (!$conductor) return;

        $rawAsist = $conductor->asistencias_detalle;
        $asistencias = is_array($rawAsist) ? $rawAsist : (is_string($rawAsist) ? (json_decode($rawAsist, true) ?: []) : []);

        $motivo = $datosExtra['motivo'] ?? "Asistencia registrada en Despacho";
        $yaExiste = false;
        $modificado = false;

        foreach ($asistencias as &$item) {
            if (isset($item['fecha']) && substr((string)$item['fecha'], 0, 10) === $fecha) {
                $yaExiste = true;
                if (($item['unidad'] ?? '') !== ($datosExtra['numero_eco'] ?? '')) {
                    $item['motivo'] = $motivo;
                    $item['estado'] = 'asistencia';
                    if (!empty($datosExtra['numero_eco'])) $item['unidad'] = $datosExtra['numero_eco'];
                    if (!empty($datosExtra['ruta'])) $item['ruta'] = $datosExtra['ruta'];
                    if (isset($datosExtra['es_relevo'])) $item['es_relevo'] = $datosExtra['es_relevo'];
                    if (!empty($datosExtra['hora_salida'])) $item['hora_salida'] = $datosExtra['hora_salida'];
                    $modificado = true;
                }
                break;
            }
        }
        unset($item);

        if (!$yaExiste) {
            $asistencias[] = [
                'id' => 'asistencia_despacho_' . time() . '_' . random_int(1000, 9999),
                'fecha' => $fecha,
                'motivo' => $motivo,
                'estado' => 'asistencia',
                'unidad' => $datosExtra['numero_eco'] ?? null,
                'ruta' => $datosExtra['ruta'] ?? null,
                'es_relevo' => !empty($datosExtra['es_relevo']),
                'hora_salida' => $datosExtra['hora_salida'] ?? null,
                'created_at' => Carbon::now('America/Mexico_City')->toDateTimeString(),
            ];
            $modificado = true;
        }

        // Limpiar de faltas_detalle cualquier falta NO justificada para esta misma fecha
        $rawF = $conductor->faltas_detalle;
        $arrF = is_array($rawF) ? $rawF : (is_string($rawF) ? (json_decode($rawF, true) ?: []) : []);
        $nuevasF = [];
        $remF = 0;
        foreach ($arrF as $item) {
            $fFecha = is_array($item) ? substr((string)($item['fecha'] ?? ''), 0, 10) : '';
            $esJustificada = is_array($item) && ((isset($item['estado']) && $item['estado'] === 'justificada') || !empty($item['justificada']));
            if ($fFecha === $fecha && !$esJustificada) {
                $remF++;
            } else {
                $nuevasF[] = $item;
            }
        }
        if ($remF > 0) {
            $conductor->faltas_detalle = $nuevasF;
            $conductor->faltas = max(0, ((int)($conductor->faltas ?? 0)) - $remF);
            $modificado = true;
        }

        // Limpiar de descansos_detalle si estaba programado descanso
        $rawD = $conductor->descansos_detalle;
        $arrD = is_array($rawD) ? $rawD : (is_string($rawD) ? (json_decode($rawD, true) ?: []) : []);
        $nuevosD = array_values(array_filter($arrD, function($item) use ($fecha) {
            $dFecha = is_array($item) ? substr((string)($item['fecha'] ?? ''), 0, 10) : '';
            return $dFecha !== $fecha;
        }));
        if (count($nuevosD) !== count($arrD)) {
            $conductor->descansos_detalle = $nuevosD;
            $modificado = true;
        }

        // Si la fecha es hoy, marcar en servicio
        $hoy = Carbon::today('America/Mexico_City')->toDateString();
        if ($fecha === $hoy && $conductor->estado_servicio !== 'en_servicio') {
            $conductor->estado_servicio = 'en_servicio';
            $modificado = true;
        }

        if ($modificado) {
            $conductor->asistencias_detalle = $asistencias;
            $conductor->save();
        }
    }

    /**
     * Sincroniza retroactivamente las asistencias del día de hoy para todas las unidades
     * que ya cuenten con hora real de salida de patio o estatus operación.
     * Incluye throttle en caché para evitar sobrecarga en peticiones concurrentes.
     */
    public static function sincronizarAsistenciasHoy()
    {
        try {
            $fechaHoy = Carbon::now('America/Mexico_City')->toDateString();
            $cacheKey = 'sync_asistencias_hoy_' . $fechaHoy;
            if (Cache::has($cacheKey)) {
                return;
            }
            Cache::put($cacheKey, true, 180); // 3 minutos de throttle

            if (!Schema::hasTable('informacion_operativa')) {
                return;
            }

            $unidadesValidadas = DB::table('informacion_operativa')
                ->where(function($q) {
                    $q->whereNotNull('hora_real_salida_patio')
                      ->where('hora_real_salida_patio', '!=', '')
                      ->where('hora_real_salida_patio', '!=', '00:00:00')
                      ->where('hora_real_salida_patio', '!=', '00:00');
                })
                ->orWhere(function($q) {
                    $q->where(DB::raw('LOWER(estatus)'), 'operacion')
                      ->where(function($q2) {
                          $q2->whereNotNull('hora_salida_patio')
                             ->orWhereNotNull('hora_salida');
                      });
                })
                ->get();

            foreach ($unidadesValidadas as $info) {
                $horaSalida = !empty($info->hora_real_salida_patio) ? $info->hora_real_salida_patio : ($info->hora_salida_patio ?? ($info->hora_salida ?? '06:00:00'));
                self::registrarAsistenciaDespacho($info->unidad_id, $horaSalida, [], $info);
            }
        } catch (\Throwable $e) {
            \Log::error('Error en DespachoController::sincronizarAsistenciasHoy: ' . $e->getMessage());
        }
    }

    /**
     * Cambia el estatus operativo de una unidad (para el rol Encierro).
     */
    public function registrarEncierro(Request $request)
    {
        $request->validate([
            'numero_eco' => 'required',
            'tipo' => 'required',
            'motivo_estatus' => 'nullable|string',
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));

        $unidad = DB::table('unidades')
            ->where('numero_eco', $numeroEco)
            ->first();

        if (! $unidad) {
            return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada'], 404);
        }

        $registroOperativo = DB::table('informacion_operativa')->where('unidad_id', $unidad->id)->first();
        if (! $registroOperativo) {
            return response()->json(['status' => 'error', 'message' => 'No hay información operativa para la unidad'], 400);
        }


        $horaEncierro = trim((string) $request->input('hora_encierro'));
        if (empty($horaEncierro)) {
            $horaEncierro = Carbon::now('America/Mexico_City')->format('H:i:s');
        }
        $motivoFinal = $request->motivo_estatus ?? 'Fin de turno (Encierro regular)';

        // Liberar conductor si tenía uno asignado (titular y/o relevo)
        if (! empty($registroOperativo->numero_tarjeton)) {
            $tarjetonCandidates = PlataformaController::obtenerCandidatosTarjeton($registroOperativo->numero_tarjeton);
            if (!empty($tarjetonCandidates)) {
                DB::table('conductores')
                    ->whereIn('tarjeton', $tarjetonCandidates)
                    ->update(['estado_servicio' => 'disponible']);
            }
        }

        if (! empty($registroOperativo->relevo_tarjeton)) {
            $tarjetonRelCandidates = PlataformaController::obtenerCandidatosTarjeton($registroOperativo->relevo_tarjeton);
            if (!empty($tarjetonRelCandidates)) {
                DB::table('conductores')
                    ->whereIn('tarjeton', $tarjetonRelCandidates)
                    ->update(['estado_servicio' => 'disponible']);
            }
        }

        $hasHoraRealEnHistorial = Schema::hasColumn('historial_operativo', 'hora_real_salida_patio');
        $hasHoraSalidaEnHistorial = Schema::hasColumn('historial_operativo', 'hora_salida');
        $colSalidaHistorial = $hasHoraRealEnHistorial ? 'hora_real_salida_patio' : ($hasHoraSalidaEnHistorial ? 'hora_salida' : null);

        $horaRealSalidaSnapshot = $registroOperativo->hora_real_salida_patio;
        if (! $horaRealSalidaSnapshot && $colSalidaHistorial) {
            $horaRealSalidaSnapshot = DB::table('historial_operativo')
                ->where('unidad_id', $unidad->id)
                ->where('fecha_historial', date('Y-m-d'))
                ->whereNotNull($colSalidaHistorial)
                ->orderByDesc('id')
                ->value($colSalidaHistorial);
        }

        // Registrar snapshot en historial_operativo ANTES de limpiar la informacion_operativa
        $insertEncierro = [
            'unidad_id' => $unidad->id,
            'ruta' => $registroOperativo->ruta,
            'numero_tarjeton' => $registroOperativo->numero_tarjeton,
            'nombre_conductor' => $registroOperativo->nombre_conductor,
            'corridas' => $registroOperativo->corridas,
            'tipo' => $registroOperativo->tipo,
            'estatus' => 'reserva',
            'motivo_estatus' => $motivoFinal,
            'momento' => 'ENCIERRO',
            'fecha_historial' => date('Y-m-d'),
            'fecha_registro' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('historial_operativo', 'hora_encierro')) {
            $insertEncierro['hora_encierro'] = $horaEncierro;
        }
        if ($colSalidaHistorial && $horaRealSalidaSnapshot) {
            $insertEncierro[$colSalidaHistorial] = $horaRealSalidaSnapshot;
        }
        if (Schema::hasColumn('historial_operativo', 'hora_salida_patio')) {
            $insertEncierro['hora_salida_patio'] = $registroOperativo->hora_salida_patio;
        }
        if (Schema::hasColumn('historial_operativo', 'acople')) {
            $insertEncierro['acople'] = $registroOperativo->acople;
        }
        if (Schema::hasColumn('historial_operativo', 'relevo_conductor')) {
            $insertEncierro['relevo_conductor'] = $registroOperativo->relevo_conductor;
            $insertEncierro['relevo_tarjeton'] = $registroOperativo->relevo_tarjeton;
            $insertEncierro['relevo_hora'] = $registroOperativo->relevo_hora;
        }

        $historialCols = array_flip(Schema::getColumnListing('historial_operativo'));
        $insertEncierro = array_intersect_key($insertEncierro, $historialCols);
        DB::table('historial_operativo')->insert($insertEncierro);

        // Actualizar estatus en informacion_operativa a reserva y registrar hora de encierro si existe
        $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
        $updateInfoOperativa = [
            'estatus' => 'reserva',
            'motivo_estatus' => $motivoFinal,
            'motivo' => $motivoFinal,
            'nombre_conductor' => null,
            'numero_tarjeton' => null,
            'ruta' => null,
            'corridas' => null,
            'ciclo' => null,
            'falla' => null,
            'hora_salida_patio' => null,
            'acople' => null,
            'hora_real_salida_patio' => null,
            'relevo_tarjeton' => null,
            'relevo_conductor' => null,
            'relevo_hora' => null,
            'tarjeton_maniobrista' => null,
            'nombre_maniobrista' => null,
            'mantenimiento_conductor' => null,
            'mantenimiento_tarjeton' => null,
            'mantenimiento_ruta' => null,
            'mantenimiento_corrida' => null,
            'patio_norte' => 'false',
            'transporte_patio_norte' => 'false',
        ];

        if (isset($targetCols['hora_encierro'])) {
            $updateInfoOperativa['hora_encierro'] = $horaEncierro;
        }

        $updateInfoOperativa = array_intersect_key($updateInfoOperativa, $targetCols);

        DB::table('informacion_operativa')
            ->where('id', $registroOperativo->id)
            ->update($updateInfoOperativa);

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => 'Encierro registrado exitosamente',
            'hora_encierro' => $horaEncierro,
        ]);
    }

    /**
     * Procesa el encierro automático de unidades en base a su hora_encierro programada.
     * Transfiere a estatus reserva y registra en historial_operativo exactamente como en Encierro de Unidades.
     */
    public static function procesarEncierrosAutomaticos()
    {
        $lockKey = 'procesar_encierros_auto_cooldown';
        if (Cache::has($lockKey)) {
            return 0;
        }
        Cache::put($lockKey, true, 45);

        try {
            $now = Carbon::now('America/Mexico_City');
            $horaActual = $now->format('H:i');
            $fechaHoy = $now->toDateString();

            $hasHoraEncierro = Cache::remember('col_info_op_hora_encierro', 86400, fn() => Schema::hasColumn('informacion_operativa', 'hora_encierro'));
            if (! $hasHoraEncierro) {
                return 0;
            }

            $hasHoraRealSalida = Cache::remember('col_info_op_hora_real_salida_patio', 86400, fn() => Schema::hasColumn('informacion_operativa', 'hora_real_salida_patio'));
            if (! $hasHoraRealSalida) {
                return 0;
            }

            // Buscar unidades en operación que tengan hora_encierro asignada
            // Y que YA HAYAN SIDO DESPACHADAS DE PATIO (hora_real_salida_patio válida).
            // NUNCA auto-encerrar unidades que siguen en patio pendientes por despachar.
            $unidadesParaEncierro = DB::table('informacion_operativa')
                ->whereRaw("LOWER(estatus) = 'operacion'")
                ->whereNotNull('hora_encierro')
                ->whereRaw("TRIM(CAST(hora_encierro AS VARCHAR)) != ''")
                ->whereNotNull('hora_real_salida_patio')
                ->whereRaw("TRIM(CAST(hora_real_salida_patio AS VARCHAR)) != ''")
                ->whereRaw("TRIM(CAST(hora_real_salida_patio AS VARCHAR)) != '00:00'")
                ->whereRaw("TRIM(CAST(hora_real_salida_patio AS VARCHAR)) != '00:00:00'")
                ->get();

            if ($unidadesParaEncierro->isEmpty()) {
                return 0;
            }

            $encerradasCount = 0;

            foreach ($unidadesParaEncierro as $registroOperativo) {
                // Validación estricta 1: La unidad DEBE haber salido físicamente de patio hoy
                $horaRealRaw = trim((string) ($registroOperativo->hora_real_salida_patio ?? ''));
                if ($horaRealRaw === '' || $horaRealRaw === '00:00' || $horaRealRaw === '00:00:00') {
                    continue; // Aún en patio (pendiente por despachar). Jamás auto-encerrar.
                }

                $partsSalida = explode(':', $horaRealRaw);
                if (count($partsSalida) < 2) {
                    continue;
                }
                $horaSalidaReal = sprintf('%02d:%02d', (int) $partsSalida[0], (int) $partsSalida[1]);

                $horaEncRaw = trim((string) $registroOperativo->hora_encierro);
                $partsEnc = explode(':', $horaEncRaw);
                if (count($partsEnc) >= 2) {
                    $horaEnc = sprintf('%02d:%02d', (int) $partsEnc[0], (int) $partsEnc[1]);
                } else {
                    continue;
                }

                // REGLA: Ignorar unidades con hora de encierro de 12:00 am a 02:00 am (00:00 a 02:59)
                // Pertenecen al cierre de turno de madrugada del día siguiente y NO se deben encerrar
                // automáticamente por programación. Podrán ser encerradas manualmente desde el módulo
                // de encierro o al desincorporarse como las demás.
                if ($horaEnc >= '00:00' && $horaEnc <= '02:59') {
                    continue;
                }

                $debeEncerrar = false;

                if ($horaEnc >= '06:00') {
                    // Turno regular diurno/vespertino (06:00 a 23:59)
                    if ($horaActual >= '06:00') {
                        // En el día: encierra si ya se alcanzó o superó la hora de encierro
                        // y la hora de encierro es posterior o igual a la salida
                        if ($horaActual >= $horaEnc && $horaEnc >= $horaSalidaReal) {
                            $debeEncerrar = true;
                        }
                    } else {
                        // Pasó la medianoche a la madrugada del día siguiente y la unidad salió el día previo
                        if ($horaSalidaReal >= '06:00') {
                            $debeEncerrar = true;
                        }
                    }
                } else {
                    // Turno nocturno que concluye en la madrugada (00:00 a 05:59)
                    if ($horaActual < '06:00') {
                        if ($horaSalidaReal >= '06:00') {
                            // Salió en el turno de la tarde/noche anterior y concluye en esta madrugada
                            if ($horaActual >= $horaEnc) {
                                $debeEncerrar = true;
                            }
                        } else {
                            // Salió en esta misma madrugada y concluye más tarde en la misma madrugada
                            if ($horaActual >= $horaEnc && $horaEnc >= $horaSalidaReal) {
                                $debeEncerrar = true;
                            }
                        }
                    }
                    // Si $horaActual >= '06:00', aún estamos en el turno diurno previo a la medianoche;
                    // la hora de encierro de madrugada es para el final del día, no al inicio.
                }

                if (! $debeEncerrar) {
                    continue;
                }

                $motivoFinal = 'Fin de turno (Encierro programado)';
                $horaRegistroEncierro = $registroOperativo->hora_encierro ?: $horaActual;

                // 1. Liberar conductor titular si tenía uno asignado
                if (! empty($registroOperativo->numero_tarjeton)) {
                    $tarjetonCandidates = PlataformaController::obtenerCandidatosTarjeton($registroOperativo->numero_tarjeton);
                    if (!empty($tarjetonCandidates)) {
                        DB::table('conductores')
                            ->whereIn('tarjeton', $tarjetonCandidates)
                            ->update(['estado_servicio' => 'disponible']);
                    }
                }

                // 2. Liberar conductor de relevo si tenía uno asignado
                if (! empty($registroOperativo->relevo_tarjeton)) {
                    $tarjetonRelCandidates = PlataformaController::obtenerCandidatosTarjeton($registroOperativo->relevo_tarjeton);
                    if (!empty($tarjetonRelCandidates)) {
                        DB::table('conductores')
                            ->whereIn('tarjeton', $tarjetonRelCandidates)
                            ->update(['estado_servicio' => 'disponible']);
                    }
                }

                $hasHoraRealEnHistorial = Cache::remember('col_hist_op_hora_real_salida_patio', 86400, fn() => Schema::hasColumn('historial_operativo', 'hora_real_salida_patio'));
                $hasHoraSalidaEnHistorial = Cache::remember('col_hist_op_hora_salida', 86400, fn() => Schema::hasColumn('historial_operativo', 'hora_salida'));
                $colSalidaHistorial = $hasHoraRealEnHistorial ? 'hora_real_salida_patio' : ($hasHoraSalidaEnHistorial ? 'hora_salida' : null);

                $horaRealSalidaSnapshot = $registroOperativo->hora_real_salida_patio;
                if (! $horaRealSalidaSnapshot && $colSalidaHistorial) {
                    $horaRealSalidaSnapshot = DB::table('historial_operativo')
                        ->where('unidad_id', $registroOperativo->unidad_id)
                        ->where('fecha_historial', $fechaHoy)
                        ->whereNotNull($colSalidaHistorial)
                        ->orderByDesc('id')
                        ->value($colSalidaHistorial);
                }

                // 3. Registrar snapshot en historial_operativo
                $insertAutoHistorial = [
                    'unidad_id' => $registroOperativo->unidad_id,
                    'ruta' => $registroOperativo->ruta,
                    'numero_tarjeton' => $registroOperativo->numero_tarjeton,
                    'nombre_conductor' => $registroOperativo->nombre_conductor,
                    'corridas' => $registroOperativo->corridas,
                    'tipo' => $registroOperativo->tipo,
                    'estatus' => 'reserva',
                    'motivo_estatus' => $motivoFinal,
                    'momento' => 'ENCIERRO',
                    'fecha_historial' => $fechaHoy,
                    'fecha_registro' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (Schema::hasColumn('historial_operativo', 'hora_encierro')) {
                    $insertAutoHistorial['hora_encierro'] = $horaRegistroEncierro;
                }
                if ($colSalidaHistorial && $horaRealSalidaSnapshot) {
                    $insertAutoHistorial[$colSalidaHistorial] = $horaRealSalidaSnapshot;
                }
                if (Schema::hasColumn('historial_operativo', 'hora_salida_patio')) {
                    $insertAutoHistorial['hora_salida_patio'] = $registroOperativo->hora_salida_patio;
                }
                if (Schema::hasColumn('historial_operativo', 'acople')) {
                    $insertAutoHistorial['acople'] = $registroOperativo->acople;
                }
                if (Schema::hasColumn('historial_operativo', 'relevo_conductor')) {
                    $insertAutoHistorial['relevo_conductor'] = $registroOperativo->relevo_conductor;
                    $insertAutoHistorial['relevo_tarjeton'] = $registroOperativo->relevo_tarjeton;
                    $insertAutoHistorial['relevo_hora'] = $registroOperativo->relevo_hora;
                }

                $historialCols = array_flip(Schema::getColumnListing('historial_operativo'));
                $insertAutoHistorial = array_intersect_key($insertAutoHistorial, $historialCols);
                DB::table('historial_operativo')->insert($insertAutoHistorial);

                // 4. Actualizar informacion_operativa: pasar a reserva y limpiar datos operativos de calle,
                // manteniendo intacta la hora_encierro asignada por programación
                $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
                $updateEncierroAuto = [
                    'estatus' => 'reserva',
                    'motivo_estatus' => $motivoFinal,
                    'motivo' => $motivoFinal,
                    'nombre_conductor' => null,
                    'numero_tarjeton' => null,
                    'ruta' => null,
                    'corridas' => null,
                    'ciclo' => null,
                    'falla' => null,
                    'hora_salida_patio' => null,
                    'acople' => null,
                    'hora_real_salida_patio' => null,
                    'relevo_tarjeton' => null,
                    'relevo_conductor' => null,
                    'relevo_hora' => null,
                    'tarjeton_maniobrista' => null,
                    'nombre_maniobrista' => null,
                    'mantenimiento_conductor' => null,
                    'mantenimiento_tarjeton' => null,
                    'mantenimiento_ruta' => null,
                    'mantenimiento_corrida' => null,
                    'patio_norte' => 'false',
                    'transporte_patio_norte' => 'false',
                ];
                $updateEncierroAuto = array_intersect_key($updateEncierroAuto, $targetCols);

                DB::table('informacion_operativa')
                    ->where('id', $registroOperativo->id)
                    ->update($updateEncierroAuto);

                BitacoraHelper::registrarCambio(
                    $registroOperativo->unidad_id,
                    'ENCIERRO_PROGRAMADO',
                    "UNIDAD ENCERRADA AUTOMÁTICAMENTE A LAS {$horaRegistroEncierro} POR HORA PROGRAMADA DE ENCIERRO",
                    'operacion',
                    'reserva'
                );

                $encerradasCount++;
            }

            if ($encerradasCount > 0) {
                \Log::info("Encierro automático procesado para {$encerradasCount} unidades a las {$horaActual}.");
                SyncService::notifyChange();
            }

            return $encerradasCount;
        } catch (\Exception $e) {
            \Log::error('Error en procesarEncierrosAutomaticos: ' . $e->getMessage());
            return 0;
        }
    }

    public function procesarEncierrosManual()
    {
        $count = self::procesarEncierrosAutomaticos();
        return response()->json([
            'status' => 'success',
            'message' => "Proceso de encierro completado. Unidades encerradas: {$count}",
            'encerradas' => $count,
        ]);
    }

    public function cambiarEstatus(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('cambiarEstatus request data', $request->all());

        $request->validate([
            'numero_eco' => 'required',
            'tipo' => 'required',
            'estatus' => 'required|in:operacion,mantenimiento,reserva,percance',
            'motivo_estatus' => 'nullable|string',
            'falla_reportada' => 'nullable|string',
            'numero_incidencia' => 'nullable|string',
            'cambio_unidad_activo' => 'nullable|boolean',
            'eco_reemplazo' => 'nullable|string',
            'tarjeton_reemplazo' => 'nullable|string',
            'ruta_reemplazo' => 'nullable',
            'corrida_reemplazo' => 'nullable',
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));

        $nuevoEstatus = strtolower(trim($request->estatus));
        $motivoEstatus = $request->motivo_estatus;
        $cambioUnidadActivo = $request->input('cambio_unidad_activo') == 1 || $request->input('cambio_unidad_activo') === true;

        $unidad = DB::table('unidades')
            ->where('numero_eco', $numeroEco)
            ->first();

        if (! $unidad) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en el catálogo.',
            ], 404);
        }

        $tiposBusqueda = self::normalizarTiposTransporte($request->tipo);

        $registroOperativo = DB::table('informacion_operativa')
            ->where('unidad_id', $unidad->id)
            ->whereIn(DB::raw('LOWER(tipo)'), $tiposBusqueda)
            ->first();

        if (! $registroOperativo) {
            $registroOperativo = DB::table('informacion_operativa')
                ->where('unidad_id', $unidad->id)
                ->first();
        }

        if (! $registroOperativo) {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta unidad no tiene registro operativo.',
            ], 404);
        }

        $updateData = [
            'estatus' => $nuevoEstatus,
            'motivo_estatus' => $motivoEstatus,
        ];

        if ($request->has('falla_reportada')) {
            $updateData['falla_reportada'] = trim($request->falla_reportada);
        }

        if ($request->has('folio_mantenimiento')) {
            $folioReq = trim((string)$request->folio_mantenimiento);
            if (! empty($folioReq)) {
                $existe = DB::table('informacion_operativa')
                    ->where('folio_mantenimiento', $folioReq)
                    ->where('id', '!=', $registroOperativo->id)
                    ->exists();

                if ($existe) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "El número de folio '$folioReq' ya está siendo usado por otra unidad. Por favor verifica.",
                    ], 400);
                }
                $updateData['folio_mantenimiento'] = $folioReq;
            }
        }

        if ($request->has('numero_incidencia')) {
            $incReq = trim((string)$request->numero_incidencia);
            if (! empty($incReq)) {
                $existeInc = DB::table('informacion_operativa')
                    ->where('numero_incidencia', $incReq)
                    ->where('id', '!=', $registroOperativo->id)
                    ->exists();

                if ($existeInc) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "El número de incidencia '$incReq' ya está siendo usado por otra unidad. Por favor verifica.",
                    ], 400);
                }
                $updateData['numero_incidencia'] = $incReq;
            }
        }

        if ($request->has('fecha_folio_mantenimiento')) {
            $updateData['fecha_folio_mantenimiento'] = $request->fecha_folio_mantenimiento;
        }
        if ($request->has('falla_reportada')) {
            $updateData['falla_reportada'] = $request->falla_reportada;
        }
        if ($request->has('diagnostico')) {
            $updateData['diagnostico'] = $request->diagnostico;
        }
        if ($request->has('firma_base64')) {
            $updateData['firma_base64'] = $request->firma_base64;
        }

        if ($request->has('mantenimiento_conductor')) {
            $updateData['mantenimiento_conductor'] = $request->mantenimiento_conductor;
        }
        if ($request->has('mantenimiento_tarjeton')) {
            $updateData['mantenimiento_tarjeton'] = $request->mantenimiento_tarjeton;
        }
        if ($request->has('mantenimiento_ruta')) {
            $updateData['mantenimiento_ruta'] = $request->mantenimiento_ruta;
        }
        if ($request->has('mantenimiento_corrida')) {
            $updateData['mantenimiento_corrida'] = $request->mantenimiento_corrida;
        }
        if ($request->has('mantenimiento_kilometraje')) {
            $updateData['mantenimiento_kilometraje'] = $request->mantenimiento_kilometraje;
        }

        if ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento' || $nuevoEstatus === 'percance') {
            $updateData['mantenimiento_conductor'] = $updateData['mantenimiento_conductor'] ?? (! empty($registroOperativo->nombre_conductor) ? $registroOperativo->nombre_conductor : ($registroOperativo->mantenimiento_conductor ?? null));
            $updateData['mantenimiento_tarjeton'] = $updateData['mantenimiento_tarjeton'] ?? (! empty($registroOperativo->numero_tarjeton) ? $registroOperativo->numero_tarjeton : ($registroOperativo->mantenimiento_tarjeton ?? null));
            $updateData['mantenimiento_ruta'] = $updateData['mantenimiento_ruta'] ?? (! empty($registroOperativo->ruta) ? $registroOperativo->ruta : ($registroOperativo->mantenimiento_ruta ?? null));
            $updateData['mantenimiento_corrida'] = $updateData['mantenimiento_corrida'] ?? (! empty($registroOperativo->corridas) ? $registroOperativo->corridas : ($registroOperativo->mantenimiento_corrida ?? null));

            $updateData['nombre_conductor'] = null;
            $updateData['numero_tarjeton'] = null;
            $updateData['ruta'] = null;
            $updateData['corridas'] = null;
            $updateData['ciclo'] = null;
            if ($nuevoEstatus !== 'mantenimiento' && $nuevoEstatus !== 'percance') {
                $updateData['falla'] = null;
            } elseif (empty($updateData['falla'])) {
                $updateData['falla'] = $motivoEstatus ?: strtoupper($nuevoEstatus);
            }
            $updateData['motivo'] = $motivoEstatus ?: strtoupper($nuevoEstatus);
            $updateData['motivo_estatus'] = $motivoEstatus ?: strtoupper($nuevoEstatus);
            $updateData['hora_salida_patio'] = null;
            $updateData['acople'] = null;
            $updateData['hora_real_salida_patio'] = null;
            $updateData['relevo_tarjeton'] = null;
            $updateData['relevo_conductor'] = null;
            $updateData['relevo_hora'] = null;
            $updateData['tarjeton_maniobrista'] = null;
            $updateData['nombre_maniobrista'] = null;
            $updateData['patio_norte'] = 'false';
            $updateData['transporte_patio_norte'] = 'false';

            if ($registroOperativo && $registroOperativo->numero_tarjeton) {
                $tarjetonCandidates = PlataformaController::obtenerCandidatosTarjeton($registroOperativo->numero_tarjeton);
                if (!empty($tarjetonCandidates)) {
                    DB::table('conductores')
                        ->whereIn('tarjeton', $tarjetonCandidates)
                        ->update(['estado_servicio' => 'disponible']);
                }
            }
            if ($registroOperativo && ! empty($registroOperativo->relevo_tarjeton)) {
                $tarjetonRelCandidates = PlataformaController::obtenerCandidatosTarjeton($registroOperativo->relevo_tarjeton);
                if (!empty($tarjetonRelCandidates)) {
                    DB::table('conductores')
                        ->whereIn('tarjeton', $tarjetonRelCandidates)
                        ->update(['estado_servicio' => 'disponible']);
                }
            }
        } else {
            $updateData['hora_real_salida_patio'] = ! empty($registroOperativo->hora_real_salida_patio) ? $registroOperativo->hora_real_salida_patio : date('H:i:s');
            $updateData['motivo_estatus'] = $motivoEstatus ?: 'OPERACION';
            $updateData['falla'] = null;
            $updateData['motivo'] = null;
            $updateData['hora_encierro'] = null;

            // Si la unidad vuelve a entrar en operación, eliminar cualquier encierro previo de hoy
            $fechaHoyMex = Carbon::now('America/Mexico_City')->toDateString();
            DB::table('historial_operativo')
                ->where('unidad_id', $unidad->id)
                ->where('fecha_historial', $fechaHoyMex)
                ->where('momento', 'ENCIERRO')
                ->delete();

            $allInputs = $request->all();
            if (array_key_exists('nombre_conductor', $allInputs)) {
                $updateData['nombre_conductor'] = $request->nombre_conductor;
            }
            if (array_key_exists('numero_tarjeton', $allInputs)) {
                $tarjetonLimpio = trim((string) $request->numero_tarjeton);
                $updateData['numero_tarjeton'] = $tarjetonLimpio;

                if ($tarjetonLimpio) {
                    DB::table('informacion_operativa')
                        ->where('numero_tarjeton', $tarjetonLimpio)
                        ->where('id', '!=', $registroOperativo->id)
                        ->update([
                            'numero_tarjeton' => null,
                            'nombre_conductor' => null,
                        ]);
                }

                if ($registroOperativo->numero_tarjeton && $registroOperativo->numero_tarjeton !== $tarjetonLimpio) {
                    DB::table('conductores')
                        ->where('tarjeton', $registroOperativo->numero_tarjeton)
                        ->update(['estado_servicio' => 'disponible']);
                }

                if ($tarjetonLimpio) {
                    DB::table('conductores')
                        ->where('tarjeton', $tarjetonLimpio)
                        ->update(['estado_servicio' => 'en_servicio']);
                }
            }
            if (array_key_exists('ruta', $allInputs)) {
                $updateData['ruta'] = $request->ruta;
            }
            if (array_key_exists('corrida', $allInputs)) {
                $updateData['corridas'] = $request->corrida;
            }
        }

        $targetCols = array_flip(Schema::getColumnListing('informacion_operativa'));
        $filteredUpdate = array_intersect_key($updateData, $targetCols);

        DB::table('informacion_operativa')
            ->where('id', $registroOperativo->id)
            ->update($filteredUpdate);

        // Registrar acción en la bitácora de cambios para la unidad original
        BitacoraHelper::registrarCambio(
            $unidad->id,
            'CAMBIO_ESTATUS',
            ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento' || $nuevoEstatus === 'percance')
                ? 'CAMBIO DE ESTATUS DE '.strtoupper($registroOperativo->estatus ?? '').' A '.strtoupper($nuevoEstatus).($motivoEstatus ? ' POR MOTIVO: '.strtoupper($motivoEstatus) : '').($cambioUnidadActivo ? ' (UNIDAD REEMPLAZADA)' : '')
                : 'CAMBIO DE ESTATUS DE '.strtoupper($registroOperativo->estatus ?? '').' A '.strtoupper($nuevoEstatus),
            $registroOperativo->estatus ?? null,
            $nuevoEstatus
        );

        // Si es un cambio de unidad, procesar el reemplazo
        $conductorAsignado = null;
        $rutaAsignada = null;
        $tarjetonAsignado = null;
        if ($cambioUnidadActivo && $request->eco_reemplazo) {
            $ecoReemplazo = str_pad(ltrim(trim($request->eco_reemplazo), '0'), 3, '0', STR_PAD_LEFT);
            $tarjetonReemplazo = trim($request->tarjeton_reemplazo);
            $rutaReemplazo = trim($request->ruta_reemplazo);
            $corridaReemplazo = trim($request->corrida_reemplazo);

            $unidadReemplazo = null;
            if (! empty($request->unidad_id_reemplazo)) {
                $unidadReemplazo = DB::table('unidades')->where('id', $request->unidad_id_reemplazo)->first();
            }
            if (! $unidadReemplazo) {
                $unidadReemplazo = DB::table('unidades')->where('numero_eco', $ecoReemplazo)->first();
            }

            if ($unidadReemplazo) {
                // 1. Determinar tipo de transporte de la unidad de reemplazo
                $nombreTransporteReemplazo = null;
                if (! empty($unidadReemplazo->transporte_id)) {
                    $nombreTransporteReemplazo = DB::table('transportes')->where('id', $unidadReemplazo->transporte_id)->value('nombre');
                }
                $registroReemplazoActual = DB::table('informacion_operativa')->where('unidad_id', $unidadReemplazo->id)->first();
                $tipoParaReemplazo = strtoupper(trim(
                    $request->tipo_reemplazo
                    ?? $nombreTransporteReemplazo
                    ?? $registroReemplazoActual->tipo
                    ?? $unidadReemplazo->tipo
                    ?? $registroOperativo->tipo
                    ?? $tipoNormalizado
                    ?? 'URBANUSS'
                ));

                // 2. Tarjetón y Conductor
                $tarjetonReemplazo = ! empty($tarjetonReemplazo)
                    ? $tarjetonReemplazo
                    : ($registroOperativo->numero_tarjeton ?? null);

                $nombreConductorReemplazo = null;
                if ($tarjetonReemplazo) {
                    $conductorReemplazo = PlataformaController::buscarConductorPorTarjeton($tarjetonReemplazo);

                    if ($conductorReemplazo) {
                        $tarjetonReemplazo = $conductorReemplazo->tarjeton;
                        $nombreConductorReemplazo = trim(($conductorReemplazo->nombres ?? '').' '.($conductorReemplazo->apellidos ?? ''));
                        if (empty($nombreConductorReemplazo)) {
                            $nombreConductorReemplazo = trim(($conductorReemplazo->apellidos ?? '').' '.($conductorReemplazo->nombres ?? ''));
                        }
                    }
                }

                if (empty($nombreConductorReemplazo)) {
                    $nombreConductorReemplazo = ! empty($request->conductor_reemplazo)
                        ? trim($request->conductor_reemplazo)
                        : (! empty($request->nombre_conductor) ? trim($request->nombre_conductor) : ($registroOperativo->nombre_conductor ?? null));
                }

                // Desasignar cualquier otra unidad que tenga este tarjetón
                if ($tarjetonReemplazo) {
                    DB::table('informacion_operativa')
                        ->where('unidad_id', '!=', $unidadReemplazo->id)
                        ->where('numero_tarjeton', $tarjetonReemplazo)
                        ->update([
                            'numero_tarjeton' => null,
                            'nombre_conductor' => null,
                        ]);

                    DB::table('conductores')
                        ->where('tarjeton', $tarjetonReemplazo)
                        ->update(['estado_servicio' => 'en_servicio']);
                }

                $rutaReemplazo = (! empty($rutaReemplazo) && ! in_array($rutaReemplazo, ['Sin ruta', 'Sin ruta asignada', 'SELECCIONAR'], true))
                    ? $rutaReemplazo
                    : ($registroOperativo->ruta ?? null);

                $corridaReemplazoVal = ($corridaReemplazo !== '' && $corridaReemplazo !== null)
                    ? (int) $corridaReemplazo
                    : ($registroOperativo->corridas ?? null);

                $registroReemplazo = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidadReemplazo->id)
                    ->first();

                // La unidad de reemplazo entra en operación activa y hereda la hora_real_salida_patio (o la hora actual)
                $horaSalidaParaReemplazo = ! empty($registroOperativo->hora_real_salida_patio)
                    ? $registroOperativo->hora_real_salida_patio
                    : date('H:i:s');

                $reemplazoData = [
                    'tipo' => $tipoParaReemplazo,
                    'estatus' => 'operacion',
                    'numero_tarjeton' => $tarjetonReemplazo,
                    'nombre_conductor' => $nombreConductorReemplazo,
                    'ruta' => $rutaReemplazo,
                    'corridas' => $corridaReemplazoVal,
                    'hora_salida_patio' => $registroOperativo->hora_salida_patio ?? null,
                    'acople' => $registroOperativo->acople ?? null,
                    'hora_real_salida_patio' => $horaSalidaParaReemplazo,
                    'ciclo' => $registroOperativo->ciclo ?? null,
                    'relevo_tarjeton' => $registroOperativo->relevo_tarjeton ?? null,
                    'relevo_conductor' => $registroOperativo->relevo_conductor ?? null,
                    'relevo_hora' => $registroOperativo->relevo_hora ?? null,
                    'tarjeton_maniobrista' => $registroOperativo->tarjeton_maniobrista ?? null,
                    'nombre_maniobrista' => $registroOperativo->nombre_maniobrista ?? null,
                    'transporte_patio_norte' => $registroOperativo->transporte_patio_norte ?? 'false',
                    'patio_norte' => $registroOperativo->patio_norte ?? 'false',
                    'motivo_estatus' => 'REEMPLAZO DE ECO '.$numeroEco,
                    'cambio_desde' => $numeroEco,
                    'cambio_motivo' => $motivoEstatus ?: 'REEMPLAZO',
                    'falla' => null,
                    'motivo' => null,
                    'hora_encierro' => null,
                    'updated_at' => now(),
                ];

                if ($registroReemplazo) {
                    DB::table('informacion_operativa')
                        ->where('id', $registroReemplazo->id)
                        ->update($reemplazoData);
                } else {
                    $reemplazoData['unidad_id'] = $unidadReemplazo->id;
                    $reemplazoData['fecha_registro'] = now();
                    $reemplazoData['created_at'] = now();
                    DB::table('informacion_operativa')->insert($reemplazoData);
                }

                // Si la unidad de reemplazo tenía un encierro previo de hoy, liberarlo/eliminarlo
                $fechaHoyMexReemplazo = Carbon::now('America/Mexico_City')->toDateString();
                DB::table('historial_operativo')
                    ->where('unidad_id', $unidadReemplazo->id)
                    ->where('fecha_historial', $fechaHoyMexReemplazo)
                    ->where('momento', 'ENCIERRO')
                    ->delete();

                // A la unidad saliente (reemplazada) le quitamos hora_real_salida_patio para que no figure en encierro pendiente
                DB::table('informacion_operativa')
                    ->where('id', $registroOperativo->id)
                    ->update(['hora_real_salida_patio' => null]);

                // Registrar en historial_operativo que la unidad original fue desincorporada/encerrada por reemplazo
                $horaEncierroSaliente = date('H:i:s');
                DB::table('historial_operativo')->insert([
                    'unidad_id' => $unidad->id,
                    'ruta' => $registroOperativo->ruta,
                    'numero_tarjeton' => $registroOperativo->numero_tarjeton,
                    'nombre_conductor' => $registroOperativo->nombre_conductor,
                    'corridas' => $registroOperativo->corridas,
                    'tipo' => $registroOperativo->tipo,
                    'estatus' => $nuevoEstatus,
                    'motivo_estatus' => 'DESINCORPORADA / REEMPLAZADA POR ECO '.$ecoReemplazo.($motivoEstatus ? ' - '.$motivoEstatus : ''),
                    'momento' => 'ENCIERRO',
                    'hora_encierro' => $horaEncierroSaliente,
                    'fecha_historial' => date('Y-m-d'),
                    'fecha_registro' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                BitacoraHelper::registrarCambio(
                    $unidadReemplazo->id,
                    'CAMBIO_UNIDAD_REEMPLAZO',
                    'UNIDAD ASIGNADA COMO REEMPLAZO DE ECO '.$unidad->numero_eco.' - CONDUCTOR: '.strtoupper($nombreConductorReemplazo).', RUTA: '.strtoupper($rutaReemplazo),
                    $registroReemplazo->estatus ?? 'reserva',
                    'operacion'
                );

                $conductorAsignado = $nombreConductorReemplazo;
                $rutaAsignada = $rutaReemplazo;
                $tarjetonAsignado = $tarjetonReemplazo;
            }
        }

        $horaEncierro = null;
        if (! $cambioUnidadActivo && ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento' || $nuevoEstatus === 'percance') && ! empty($registroOperativo->hora_real_salida_patio)) {
            $horaEncierro = date('H:i:s');
            DB::table('historial_operativo')->insert([
                'unidad_id' => $unidad->id,
                'ruta' => $registroOperativo->ruta,
                'numero_tarjeton' => $registroOperativo->numero_tarjeton,
                'nombre_conductor' => $registroOperativo->nombre_conductor,
                'corridas' => $registroOperativo->corridas,
                'tipo' => $registroOperativo->tipo,
                'estatus' => $nuevoEstatus,
                'motivo_estatus' => $motivoEstatus,
                'momento' => 'ENCIERRO',
                'hora_encierro' => $horaEncierro,
                'fecha_historial' => date('Y-m-d'),
                'fecha_registro' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Limpiamos hora_real_salida_patio en informacion_operativa para que no figure despachada activa
            DB::table('informacion_operativa')
                ->where('id', $registroOperativo->id)
                ->update(['hora_real_salida_patio' => null]);
        }

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => 'Estatus actualizado correctamente.',
            'estatus' => $nuevoEstatus,
            'conductor_asignado' => $conductorAsignado,
            'ruta_asignada' => $rutaAsignada,
            'tarjeton' => $tarjetonAsignado,
            'corridas' => $request->corrida,
            'hora_encierro' => $horaEncierro,
        ], 200);
    }

    /**
     * Obtiene la lista de rutas (troncales y alimentadoras) desde la tabla 'rutas'.
     */
    public function obtenerRutas()
    {
        $troncales = DB::table('rutas')->where('tipo', 'troncal')->pluck('ruta');
        $alimentadoras = DB::table('rutas')->where('tipo', 'alimentadora')->pluck('ruta');

        return response()->json([
            'troncales' => $troncales,
            'alimentadoras' => $alimentadoras,
        ], 200);
    }

    /**
     * Actualiza la ruta de una unidad específica.
     */
    public function actualizarRuta(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'ruta' => 'required|string',
        ]);

        $tipoNormalizado = strtolower(trim($request->tipo));

        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);
        $rutaLimpia = trim($request->ruta);

        $operacion = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->where(DB::raw('LOWER(informacion_operativa.tipo)'), $tipoNormalizado)
            ->select('informacion_operativa.id', 'informacion_operativa.ruta', 'informacion_operativa.unidad_id')
            ->first();

        if (! $operacion) {
            return response()->json([
                'status' => 'error',
                'message' => 'No hay registro de operación para esta unidad.',
            ], 404);
        }

        DB::table('informacion_operativa')
            ->where('id', $operacion->id)
            ->update([
                'ruta' => $rutaLimpia,
            ]);

        // Registrar acción en la bitácora de cambios
        // Registrar acción en la bitácora de cambios
        BitacoraHelper::registrarCambio(
            $operacion->unidad_id,
            'CAMBIO_RUTA',
            'CAMBIO DE RUTA - ANTERIOR: '.strtoupper($operacion->ruta ?? 'SIN RUTA').', NUEVA: '.strtoupper($rutaLimpia)
        );

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => 'Ruta actualizada correctamente.',
        ], 200);
    }

    /**
     * Obtiene el catálogo de todas las unidades (id, número_eco, tipo).
     */
    public function obtenerCatalogoUnidades()
    {
        $unidades = DB::table('unidades')
            ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
            ->select(
                'unidades.id',
                'unidades.numero_eco',
                DB::raw('COALESCE(unidades.tipo, transportes.nombre) as tipo')
            )
            ->orderBy('unidades.numero_eco')
            ->get();

        return response()->json($unidades, 200);
    }

    public function obtenerPendientesMantenimiento()
    {
        $unidades = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereIn(DB::raw('LOWER(informacion_operativa.estatus)'), ['mantenimiento', 'percance'])
            ->select(
                'informacion_operativa.id as id_incidencia',
                'informacion_operativa.numero_incidencia',
                'unidades.numero_eco',
                'informacion_operativa.tipo',
                'informacion_operativa.folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.motivo_estatus',
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.fecha_registro',
                'informacion_operativa.mantenimiento_conductor',
                'informacion_operativa.mantenimiento_tarjeton',
                'informacion_operativa.mantenimiento_ruta',
                'informacion_operativa.mantenimiento_corrida',
                'informacion_operativa.mantenimiento_kilometraje'
            )
            ->orderBy('unidades.numero_eco')
            ->get();

        return response()->json($unidades, 200);
    }

    /**
     * Genera un folio de mantenimiento a partir del ID de la incidencia activa.
     */
    public function generarFolioMantenimiento(Request $request)
    {
        try {
            $request->validate([
                'numero_eco' => 'required|string',
            ]);

            $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);

            // 1. Encontrar la unidad
            $unidad = DB::table('unidades')->where('numero_eco', $numeroEco)->first();
            if (! $unidad) {
                return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada'], 404);
            }

            // 2. Encontrar el registro operativo activo (en mantenimiento, reserva, percance, etc.)
            $registroOperativo = DB::table('informacion_operativa')
                ->where('unidad_id', $unidad->id)
                ->first();

            if (! $registroOperativo) {
                return response()->json(['status' => 'error', 'message' => 'No hay registro operativo para esta unidad'], 404);
            }

            if ($registroOperativo->folio_mantenimiento && strpos($registroOperativo->folio_mantenimiento, 'MANT-') === 0) {
                return response()->json(['status' => 'error', 'message' => 'La unidad ya tiene un folio de mantenimiento asignado'], 400);
            }

            // 3. Generar el folio (MANT-{ID}-ECO{ECO})
            // Si ya hay un número en folio_mantenimiento, ese es el ID de incidencia ingresado manualmente
            $incidencia = $registroOperativo->folio_mantenimiento ?: $registroOperativo->id;
            $folio = 'MANT-'.$incidencia.'-ECO'.$numeroEco;
            $fechaActual = now()->toDateTimeString();

            // 4. Actualizar tabla informacion_operativa
            DB::table('informacion_operativa')
                ->where('id', $registroOperativo->id)
                ->update([
                    'folio_mantenimiento' => $folio,
                    'fecha_folio_mantenimiento' => $fechaActual,
                ]);

            // 5. Opcional: Actualizar unidad si tiene columnas de mantenimiento pendientes o bitacora
            BitacoraHelper::registrarCambio(
                $unidad->id,
                'GENERAR_FOLIO',
                "SE GENERÓ EL FOLIO DE MANTENIMIENTO: $folio",
                null,
                $folio
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Folio generado correctamente',
                'folio' => $folio,
                'fecha_folio' => $fechaActual,
            ], 200);

        } catch (\Exception $e) {
            \Log::error('[generarFolioMantenimiento] Error: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error al generar el folio de mantenimiento',
            ], 500);
        }
    }

    /**
     * Guarda la información de mantenimiento (combustible, adblue, cincho) en la tabla unidades.
     */
    public function guardarMantenimiento(Request $request)
    {
        try {
            \Log::info('[guardarMantenimiento] RAW', ['raw' => file_get_contents('php://input')]);
            \Log::info('[guardarMantenimiento] Request recibido', $request->all());

            $request->validate([
                'numero_eco' => 'required|string',
                'tipo' => 'required|string',
            ]);

            $tipoNormalizado = strtolower(trim($request->tipo));

            $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);

            \Log::info('[guardarMantenimiento] Buscando unidad', ['eco' => $numeroEcoClean, 'tipo' => $tipoNormalizado]);

            $unidad = DB::table('unidades')
                ->where('numero_eco', $numeroEcoClean)
                ->first();

            \Log::info('[guardarMantenimiento] Unidad encontrada', ['unidad' => $unidad]);

            if (! $unidad) {
                \Log::error('[guardarMantenimiento] Unidad NO encontrada', ['eco' => $numeroEcoClean]);

                return response()->json([
                    'status' => 'error',
                    'message' => 'Unidad no encontrada en la base de datos.',
                ], 404);
            }

            $kmValue = $request->kilometraje === '' ? null : $request->kilometraje;
            $odoValue = ($request->odometro === '' || $request->odometro === null) ? $kmValue : $request->odometro;

            DB::table('unidades')
                ->where('id', $unidad->id)
                ->update([
                    'nivel_combustible' => $request->nivel_combustible === '' ? null : $request->nivel_combustible,
                    'litros_combustible' => $request->litros_combustible === '' ? null : $request->litros_combustible,
                    'nivel_adblue' => $request->nivel_adblue === '' ? null : $request->nivel_adblue,
                    'litros_adblue' => $request->litros_adblue === '' ? null : $request->litros_adblue,
                    'numero_cincho' => $request->numero_cincho === '' ? null : $request->numero_cincho,
                    'numero_cincho_adblue' => $request->numero_cincho_adblue === '' ? null : $request->numero_cincho_adblue,
                    'fecha_ultima_carga' => $request->fecha_ultima_carga === '' ? null : $request->fecha_ultima_carga,
                    'kilometraje' => $kmValue,
                    'odometro' => $odoValue,
                ]);

            DB::table('historial_mantenimiento')->insert([
                'unidad_id' => $unidad->id,
                'tipo_vehiculo' => $tipoNormalizado,
                'nivel_combustible' => $request->nivel_combustible === '' ? null : $request->nivel_combustible,
                'litros_combustible' => $request->litros_combustible === '' ? null : $request->litros_combustible,
                'nivel_adblue' => $request->nivel_adblue === '' ? null : $request->nivel_adblue,
                'litros_adblue' => $request->litros_adblue === '' ? null : $request->litros_adblue,
                'numero_cincho' => $request->numero_cincho === '' ? null : $request->numero_cincho,
                'numero_cincho_adblue' => $request->numero_cincho_adblue === '' ? null : $request->numero_cincho_adblue,
                'fecha_ultima_carga' => $request->fecha_ultima_carga === '' ? null : $request->fecha_ultima_carga,
                'kilometraje' => $kmValue,
                'odometro' => $odoValue,
                'fecha_registro' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            \Log::info('[guardarMantenimiento] Guardado exitosamente', ['id' => $unidad->id]);
            SyncService::notifyChange();

            return response()->json([
                'status' => 'success',
                'message' => 'Información de mantenimiento guardada correctamente.',
            ], 200);
        } catch (ValidationException $e) {
            \Log::error('[guardarMantenimiento] Error de validación', ['errors' => $e->errors()]);

            return response()->json(['status' => 'error', 'message' => $e->getMessage(), 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Log::error('[guardarMantenimiento] Excepción', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);

            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Devuelve el último registro de mantenimiento guardado para una unidad.
     */
    public function ultimoRegistroMantenimiento($eco)
    {
        $numeroEcoClean = str_pad(trim($eco), 3, '0', STR_PAD_LEFT);

        $unidad = DB::table('unidades')
            ->where('numero_eco', $numeroEcoClean)
            ->first();

        if (! $unidad) {
            return response()->json([
                'status' => 'success',
                'nivel_combustible' => null,
                'litros_combustible' => null,
                'nivel_adblue' => null,
                'litros_adblue' => null,
                'numero_cincho' => null,
                'numero_cincho_adblue' => null,
                'fecha_ultima_carga' => null,
                'kilometraje' => null,
                'odometro' => null,
            ], 200);
        }

        return response()->json([
            'status' => 'success',
            'nivel_combustible' => $unidad->nivel_combustible,
            'litros_combustible' => $unidad->litros_combustible ?? null,
            'nivel_adblue' => $unidad->nivel_adblue,
            'litros_adblue' => $unidad->litros_adblue ?? null,
            'numero_cincho' => $unidad->numero_cincho,
            'numero_cincho_adblue' => $unidad->numero_cincho_adblue,
            'fecha_ultima_carga' => $unidad->fecha_ultima_carga,
            'kilometraje' => $unidad->kilometraje,
            'odometro' => $unidad->odometro,
        ], 200);
    }

    /**
     * Obtiene todas las unidades de un tipo específico que están asignadas a una ruta determinada,
     * para el día actual.
     */
    public function unidadesPorRuta($tipo, $ruta)
    {
        $tiposBusqueda = self::normalizarTiposTransporte($tipo);

        $rutaLimpia = trim($ruta);

        $unidades = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), $tiposBusqueda)
            ->where('informacion_operativa.ruta', $rutaLimpia)
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.estatus',
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.hora_salida_patio',
                'informacion_operativa.acople',
                'informacion_operativa.hora_real_salida_patio'
            )
            ->distinct()
            ->orderBy('unidades.numero_eco')
            ->get()
            ->map(function ($unidad) {
                $estatus = strtolower(trim($unidad->estatus ?? 'operacion'));
                if (! in_array($estatus, ['operacion', 'mantenimiento', 'reserva', 'percance'], true)) {
                    $estatus = 'operacion';
                }

                return [
                    'numero_eco' => $unidad->numero_eco,
                    'tarjeton' => $unidad->tarjeton,
                    'estatus' => $estatus,
                    'ruta' => $unidad->ruta,
                    'nombre_conductor' => $unidad->nombre_conductor,
                    'hora_salida_patio' => $unidad->hora_salida_patio,
                    'acople' => $unidad->acople,
                    'hora_real_salida_patio' => $unidad->hora_real_salida_patio,
                ];
            });

        return response()->json($unidades, 200);
    }

    /**
     * Genera las estadísticas diarias de combustible por tipo de unidad.
     */
    public function reporteCombustibleDiario(Request $request)
    {
        try {
            $fechaFiltro = $request->query('fecha');
            if (! $fechaFiltro) {
                // Al registrarse con fecha del día anterior, buscar la fecha más reciente registrada
                $maxFecha = null;
                if (Schema::hasTable('unidades')) {
                    $maxFecha = DB::table('unidades')
                        ->whereNotNull('litros_combustible')
                        ->where('litros_combustible', '!=', '')
                        ->where('litros_combustible', '!=', '0')
                        ->where('litros_combustible', '!=', '0.0')
                        ->whereNotNull('fecha_ultima_carga')
                        ->max('fecha_ultima_carga');
                }

                if (! $maxFecha && Schema::hasTable('historial_mantenimiento')) {
                    $maxFecha = DB::table('historial_mantenimiento')
                        ->whereNotNull('litros_combustible')
                        ->where('litros_combustible', '!=', '')
                        ->where('litros_combustible', '!=', '0')
                        ->where('litros_combustible', '!=', '0.0')
                        ->whereNotNull('fecha_ultima_carga')
                        ->max('fecha_ultima_carga');
                }

                $fechaFiltro = $maxFecha ? Carbon::parse($maxFecha)->toDateString() : Carbon::yesterday()->toDateString();
            }
            $today = $fechaFiltro;
            $unidades = Schema::hasTable('unidades') ? DB::table('unidades')->get() : collect();
            $informacion = Schema::hasTable('informacion_operativa') ? DB::table('informacion_operativa')->get()->keyBy('unidad_id') : collect();
            $transportes = Schema::hasTable('transportes') ? DB::table('transportes')->get()->keyBy('id') : collect();

            // Cargar historial de mantenimiento con kilometraje/odometro para calcular rendimiento
            $historialPorUnidad = collect();
            if (Schema::hasTable('historial_mantenimiento')) {
                $historialPorUnidad = DB::table('historial_mantenimiento')
                    ->where(function ($q) {
                        $q->whereNotNull('kilometraje')->orWhereNotNull('odometro');
                    })
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('unidad_id');
            }

            $reporte = [];
            $tipos = ['urbanuss', 'zafiro', 'urvan', 'orion'];

            $totalesKm = 0;
            $totalesLitrosKm = 0;

            foreach ($tipos as $tipo) {
                $unidadesTipo = $unidades->filter(function ($u) use ($tipo, $transportes) {
                    $transporte = $transportes->get($u->transporte_id);
                    $nombreTrans = $transporte ? strtolower(trim($transporte->nombre)) : '';
                    if ($tipo === 'urvan' && $nombreTrans === 'vagoneta') {
                        return true;
                    }
                    if ($nombreTrans === $tipo) {
                        return true;
                    }
                    $tipoU = strtolower(trim($u->tipo ?? ''));
                    if ($tipo === 'urvan' && ($tipoU === 'urvan' || $tipoU === 'vagoneta')) {
                        return true;
                    }

                    return $tipoU === $tipo;
                });

                $parque = $unidadesTipo->count();

                $unidadesCargaron = $unidadesTipo->filter(function ($u) use ($today) {
                    $fecha = (string) ($u->fecha_ultima_carga ?? '');

                    return str_starts_with($fecha, $today) && floatval($u->litros_combustible ?? 0) > 0;
                });

                $cargaronCount = $unidadesCargaron->count();
                $sinCargarCount = $parque - $cargaronCount;
                $litrosTotal = round($unidadesCargaron->sum(fn ($u) => floatval($u->litros_combustible ?? 0)), 2);

                $porcentaje = $parque > 0 ? round(($cargaronCount / $parque) * 100) : 0;

                // Cálculo de Rendimiento (km/L)
                $kmDeltaTipo = 0;
                $litrosDeltaTipo = 0;

                foreach ($unidadesCargaron as $u) {
                    $litrosU = floatval($u->litros_combustible ?? 0);
                    if ($litrosU <= 0) {
                        continue;
                    }

                    $records = $historialPorUnidad->get($u->id);
                    if ($records && $records->count() >= 2) {
                        $curr = $records->first();
                        $prev = $records->skip(1)->first();

                        $currKm = floatval($curr->kilometraje ?: $curr->odometro);
                        $prevKm = floatval($prev->kilometraje ?: $prev->odometro);

                        if ($currKm > $prevKm && $prevKm > 0) {
                            $diff = $currKm - $prevKm;
                            if ($diff > 0 && $diff <= 2500) {
                                $kmDeltaTipo += $diff;
                                $litrosDeltaTipo += $litrosU;
                            }
                        } elseif ($currKm > 0 && $currKm <= 800) {
                            $kmDeltaTipo += $currKm;
                            $litrosDeltaTipo += $litrosU;
                        }
                    } elseif ($records && $records->count() === 1) {
                        $curr = $records->first();
                        $currKm = floatval($curr->kilometraje ?: $curr->odometro);
                        if ($currKm > 0 && $currKm <= 800) {
                            $kmDeltaTipo += $currKm;
                            $litrosDeltaTipo += $litrosU;
                        }
                    } else {
                        $currKm = floatval($u->kilometraje ?: $u->odometro);
                        if ($currKm > 0 && $currKm <= 800) {
                            $kmDeltaTipo += $currKm;
                            $litrosDeltaTipo += $litrosU;
                        }
                    }
                }

                $rendimiento = $litrosDeltaTipo > 0 ? round($kmDeltaTipo / $litrosDeltaTipo, 2) : null;
                $totalesKm += $kmDeltaTipo;
                $totalesLitrosKm += $litrosDeltaTipo;

                $motivo = '';
                $obs = '';

                if ($sinCargarCount > 0) {
                    $unidadesSinCargar = $unidadesTipo->filter(function ($u) use ($today) {
                        $fecha = (string) ($u->fecha_ultima_carga ?? '');

                        return ! (str_starts_with($fecha, $today) && floatval($u->litros_combustible ?? 0) > 0);
                    });

                    $estatusCounts = [];
                    foreach ($unidadesSinCargar as $u) {
                        $info = $informacion->get($u->id);
                        $est = $info ? strtolower(trim($info->estatus ?? '')) : 'operacion';
                        if (! $est) {
                            $est = 'operacion';
                        }
                        if (! isset($estatusCounts[$est])) {
                            $estatusCounts[$est] = 0;
                        }
                        $estatusCounts[$est]++;
                    }

                    arsort($estatusCounts);
                    $primaryEstatus = key($estatusCounts) ?: 'operacion';
                    $countEstatus = current($estatusCounts) ?: 0;

                    if ($primaryEstatus === 'reserva') {
                        $motivo = 'Combustible suficiente';
                        $obs = 'UNIDADES RESERVA';
                    } elseif (in_array($primaryEstatus, ['mantenimiento', 'taller', 'baja', 'percance'])) {
                        $motivo = 'Fuera de operación';
                        $obs = "$countEstatus UNIDADES FUERA DE OPERACIÓN";
                    } else {
                        $motivo = 'Combustible suficiente';
                        $obs = 'COMBUSTIBLE SUFICIENTE';
                    }
                }

                $combustibleStr = in_array($tipo, ['urbanuss', 'zafiro', 'orion']) ? 'Diésel' : 'Gasolina';
                $nombreDisplay = ucfirst($tipo);
                // Mantenemos "Urbanuss" con doble 's' según solicitud
                if ($nombreDisplay === 'Orion') {
                    $nombreDisplay = 'Orión';
                }

                $reporte[] = [
                    'tipo_unidad' => $nombreDisplay,
                    'combustible' => $combustibleStr,
                    'parque' => $parque,
                    'litros_cargados' => $litrosTotal,
                    'unidades_cargaron' => $cargaronCount,
                    'unidades_sin_cargar' => $sinCargarCount,
                    'rendimiento' => $rendimiento,
                    'porcentaje' => $porcentaje,
                    'motivo_no_carga' => $motivo,
                    'observaciones' => $obs,
                    'raw_tipo' => $tipo,
                ];
            }

            $totales = [
                'litros_totales' => round(collect($reporte)->sum('litros_cargados'), 2),
                'unidades_cargaron' => collect($reporte)->sum('unidades_cargaron'),
                'unidades_sin_cargar' => collect($reporte)->sum('unidades_sin_cargar'),
                'rendimiento' => $totalesLitrosKm > 0 ? round($totalesKm / $totalesLitrosKm, 2) : null,
            ];
            $parqueTotal = collect($reporte)->sum('parque');
            $totales['porcentaje'] = $parqueTotal > 0 ? round(($totales['unidades_cargaron'] / $parqueTotal) * 100) : 0;

            return response()->json([
                'status' => 'success',
                'data' => $reporte,
                'totales' => $totales,
            ]);
        } catch (\Exception $e) {
            \Log::error('[reporteCombustibleDiario] Error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Error al generar el reporte: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Registra un reporte de combustible con folio único COMB-XXX y guarda el historial.
     */
    public function registrarReporteCombustible(Request $request)
    {
        try {
            $request->validate([
                'data' => 'required|array',
                'totales' => 'required|array',
            ]);

            // Si la tabla no existe en la base de datos de producción, crearla automáticamente
            if (! Schema::hasTable('reportes_combustible')) {
                Schema::create('reportes_combustible', function (Blueprint $table) {
                    $table->id();
                    $table->string('folio', 20)->unique();
                    $table->date('fecha_reporte');
                    $table->string('generado_por', 150)->nullable();
                    $table->json('datos_resumen')->nullable();
                    $table->json('datos_detalle')->nullable();
                    $table->timestamps();
                });
            }

            // Generar folio incremental: contar registros existentes + 1
            $count = DB::table('reportes_combustible')->count();
            $folio = 'COMB-'.str_pad($count + 1, 3, '0', STR_PAD_LEFT);

            // Asegurarnos de que el folio no exista (por si se generaron dos al mismo tiempo)
            while (DB::table('reportes_combustible')->where('folio', $folio)->exists()) {
                $count++;
                $folio = 'COMB-'.str_pad($count + 1, 3, '0', STR_PAD_LEFT);
            }

            // Obtener el nombre del usuario autenticado
            $usuario = $request->user();
            $generadoPor = $usuario ? ($usuario->nombre_completo ?? $usuario->nombre ?? 'Sistema') : 'Sistema';

            DB::table('reportes_combustible')->insert([
                'folio' => $folio,
                'fecha_reporte' => now()->toDateString(),
                'generado_por' => $generadoPor,
                'datos_resumen' => json_encode($request->totales),
                'datos_detalle' => json_encode($request->data),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'folio' => $folio,
            ]);
        } catch (\Exception $e) {
            \Log::error('[registrarReporteCombustible] Error: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Error al registrar el reporte: '.$e->getMessage(),
            ], 500);
        }
    }

    public function asignarIncidencia(Request $request)
    {
        try {
            $request->validate([
                'numero_eco' => 'required',
                'tipo' => 'required',
                'incidencia' => 'required|string|max:255',
            ]);

            $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
            $tipoNormalizado = strtolower(trim($request->tipo));

            $unidad = DB::table('unidades')->where('numero_eco', $numeroEco)->first();
            if (! $unidad) {
                return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada'], 404);
            }

            $registroOperativo = DB::table('informacion_operativa')
                ->where('unidad_id', $unidad->id)
                ->whereRaw('LOWER(tipo) = ?', [$tipoNormalizado])
                ->first();

            if (! $registroOperativo) {
                $registroOperativo = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidad->id)
                    ->first();
            }

            if (! $registroOperativo) {
                return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada en operación'], 404);
            }

            DB::table('informacion_operativa')
                ->where('id', $registroOperativo->id)
                ->update([
                    'numero_incidencia' => trim($request->incidencia),
                ]);

            BitacoraHelper::registrarCambio(
                $registroOperativo->unidad_id,
                'ASIGNACION_INCIDENCIA',
                'ASIGNÓ NÚMERO DE INCIDENCIA: '.trim($request->incidencia)
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Número de incidencia asignado exitosamente',
                'incidencia' => trim($request->incidencia),
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error en asignarIncidencia: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Ocurrió un error al asignar la incidencia',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene el monitoreo general de conductores para Mesa de Control:
     * Compara el conductor inicial de Programación y Logística con el conductor actual
     * e identifica cambios y relevos ocurridos en el día.
     */
    public function monitoreoConductoresDia($tipo)
    {
        try {
            $tipoNormalizado = strtolower(trim($tipo));
            $hoy = Carbon::today()->toDateString();

            // 1. Asegurar snapshot de inicio si no existe
            BitacoraHelper::ensureInicioSnapshot();

            // 2. Obtener conductores del catálogo para autocompletar nombres si faltan
            $catalogoConductores = DB::table('conductores')
                ->select('tarjeton', DB::raw("TRIM(CONCAT(COALESCE(nombres, ''), ' ', COALESCE(apellidos, ''))) as nombre_completo"))
                ->get()
                ->keyBy(function ($c) {
                    return trim($c->tarjeton);
                });

            // 3. Obtener asignaciones originales de Programación y Logística (Apertura INICIO congelada)
            $historialInicio = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->where('historial_operativo.fecha_historial', $hoy)
                ->where('historial_operativo.momento', 'INICIO')
                ->select(
                    'unidades.id as unidad_id',
                    'unidades.numero_eco',
                    'historial_operativo.tipo',
                    'historial_operativo.ruta as ruta_inicial',
                    'historial_operativo.corridas as corrida_inicial',
                    'historial_operativo.numero_tarjeton as tarjeton_inicial',
                    'historial_operativo.nombre_conductor as conductor_inicial',
                    'historial_operativo.hora_salida_patio as hora_salida_patio_inicial',
                    'historial_operativo.estatus as estatus_inicial'
                )
                ->get()
                ->keyBy('unidad_id');

            // Fallback a informacion_operativa solo si aún no existiese historial_operativo INICIO para hoy
            if ($historialInicio->isEmpty()) {
                $historialInicio = DB::table('informacion_operativa')
                    ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                    ->select(
                        'unidades.id as unidad_id',
                        'unidades.numero_eco',
                        'informacion_operativa.tipo',
                        'informacion_operativa.ruta as ruta_inicial',
                        'informacion_operativa.corridas as corrida_inicial',
                        'informacion_operativa.numero_tarjeton as tarjeton_inicial',
                        'informacion_operativa.nombre_conductor as conductor_inicial',
                        'informacion_operativa.hora_salida_patio as hora_salida_patio_inicial',
                        'informacion_operativa.estatus as estatus_inicial'
                    )
                    ->get()
                    ->keyBy('unidad_id');
            }

            // 4. Obtener estado operativo actual
            $queryActual = DB::table('informacion_operativa')
                ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                ->select(
                    'unidades.id as unidad_id',
                    'unidades.numero_eco',
                    'informacion_operativa.tipo',
                    'informacion_operativa.ruta as ruta_actual',
                    'informacion_operativa.corridas as corrida_actual',
                    'informacion_operativa.numero_tarjeton as tarjeton_actual',
                    'informacion_operativa.nombre_conductor as conductor_actual',
                    'informacion_operativa.relevo_tarjeton',
                    'informacion_operativa.relevo_conductor',
                    'informacion_operativa.relevo_hora',
                    'informacion_operativa.estatus as estatus_actual',
                    'informacion_operativa.hora_salida_patio',
                    'informacion_operativa.hora_real_salida_patio',
                    'informacion_operativa.acople',
                    'informacion_operativa.motivo',
                    'informacion_operativa.motivo_estatus'
                );

            if ($tipoNormalizado !== 'todos') {
                if ($tipoNormalizado === 'urbanuss' || $tipoNormalizado === 'urbanus') {
                    $queryActual->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), ['urbanuss', 'urbanus']);
                } else {
                    $queryActual->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado]);
                }
            }

            $unidadesActuales = $queryActual->get();

            // 5. Movimientos de hoy en plataforma y bitácora
            $movimientosHoy = DB::table('plataforma_movimientos')
                ->whereDate('created_at', $hoy)
                ->whereIn('tipo_movimiento', ['ASIGNACION_CONDUCTOR', 'RETIRO_CONDUCTOR', 'INCORPORACION'])
                ->orderByDesc('id')
                ->get()
                ->groupBy('unidad_id');

            $bitacoraHoy = DB::table('bitacora_cambios_unidades')
                ->where('fecha', $hoy)
                ->orderByDesc('id')
                ->get()
                ->groupBy('unidad_id');

            // 6. Construir lista procesada
            $lista = [];
            $totalTitulares = 0;
            $totalRelevos = 0;
            $totalSinConductor = 0;
            $totalOperacion = 0;

            foreach ($unidadesActuales as $u) {
                $uid = $u->unidad_id;
                $regInicio = $historialInicio->get($uid);

                $tarjetonIni = trim((string) ($regInicio->tarjeton_inicial ?? ''));
                $conductorIni = trim((string) ($regInicio->conductor_inicial ?? ''));
                if (empty($conductorIni) && ! empty($tarjetonIni) && isset($catalogoConductores[$tarjetonIni])) {
                    $conductorIni = $catalogoConductores[$tarjetonIni]->nombre_completo;
                }

                $tarjetonAct = trim((string) ($u->tarjeton_actual ?? ''));
                $conductorAct = trim((string) ($u->conductor_actual ?? ''));
                if (empty($conductorAct) && ! empty($tarjetonAct) && isset($catalogoConductores[$tarjetonAct])) {
                    $conductorAct = $catalogoConductores[$tarjetonAct]->nombre_completo;
                }

                // Evaluar si aplica Relevo de T6 programado por horario
                $horaActual = Carbon::now('America/Mexico_City')->format('H:i');
                $relevoYaVigente = false;
                if (! empty($u->relevo_hora) && ! empty($u->relevo_conductor) && $horaActual >= $u->relevo_hora) {
                    $conductorAct = $u->relevo_conductor;
                    $tarjetonAct = $u->relevo_tarjeton ?? '';
                    $relevoYaVigente = true;
                }

                // Revisar movimientos de conductor registrados hoy en plataforma
                $movimientosUnidad = $movimientosHoy->get($uid);
                $bitacoraUnidad = $bitacoraHoy->get($uid);
                $ultimoMov = $movimientosUnidad ? $movimientosUnidad->first() : null;

                $horaMovimiento = null;
                $motivoMovimiento = null;
                $tipoMovimientoRegistrado = null;

                if ($ultimoMov) {
                    $horaUltimoMov = Carbon::parse($ultimoMov->created_at)->setTimezone('America/Mexico_City')->format('H:i');
                    $relevoHoraBase = $u->relevo_hora ?? '00:00';

                    // Si hubo movimiento manual y es posterior al relevo (o no hubo relevo vigente)
                    if (! $relevoYaVigente || $horaUltimoMov >= $relevoHoraBase) {
                        $tarjetonAct = trim((string) ($u->tarjeton_actual ?? ''));
                        $conductorAct = trim((string) ($u->conductor_actual ?? ''));
                        if (empty($conductorAct) && ! empty($tarjetonAct) && isset($catalogoConductores[$tarjetonAct])) {
                            $conductorAct = $catalogoConductores[$tarjetonAct]->nombre_completo;
                        }
                    }

                    $horaMovimiento = Carbon::parse($ultimoMov->created_at)->format('H:i');
                    $motivoMovimiento = $ultimoMov->motivo;
                    $tipoMovimientoRegistrado = $ultimoMov->tipo_movimiento;
                } elseif ($bitacoraUnidad) {
                    $bItem = $bitacoraUnidad->first(function ($b) {
                        return str_contains($b->detalles ?? '', 'CONDUCTOR') || str_contains($b->detalles ?? '', 'TARJETÓN');
                    });
                    if ($bItem) {
                        $horaMovimiento = Carbon::parse($bItem->created_at)->format('H:i');
                        $motivoMovimiento = $bItem->detalles;
                        $tipoMovimientoRegistrado = $bItem->tipo_accion;
                    }
                }

                $estatusActual = strtolower(trim((string) ($u->estatus_actual ?? 'operacion')));
                if ($estatusActual === 'operacion') {
                    $totalOperacion++;
                }

                // Determinar estado del conductor
                $tieneRelevo = false;
                $estadoVisual = 'titular';
                $descripcionEstado = 'Titular sin cambios';

                if (empty($tarjetonAct) && empty($conductorAct)) {
                    $estadoVisual = 'sin_conductor';
                    $descripcionEstado = ! empty($tarjetonIni) ? 'Conductor Retirado' : 'Sin Conductor';
                    $totalSinConductor++;
                } elseif (! empty($tarjetonIni) && $tarjetonAct !== $tarjetonIni) {
                    $tieneRelevo = true;
                    $estadoVisual = 'relevo';
                    $descripcionEstado = 'Relevo / Cambio Realizado';
                    $totalRelevos++;
                } elseif ($ultimoMov && in_array($ultimoMov->tipo_movimiento, ['ASIGNACION_CONDUCTOR', 'RETIRO_CONDUCTOR'])) {
                    $tieneRelevo = true;
                    $estadoVisual = 'relevo';
                    $descripcionEstado = 'Relevo / Asignación en Plataforma';
                    $totalRelevos++;
                } elseif ($relevoYaVigente) {
                    $tieneRelevo = true;
                    $estadoVisual = 'relevo';
                    $descripcionEstado = 'Relevo Programado Realizado';
                    $totalRelevos++;
                } else {
                    $totalTitulares++;
                }

                $lista[] = [
                    'unidad_id' => $uid,
                    'numero_eco' => str_pad((string) $u->numero_eco, 3, '0', STR_PAD_LEFT),
                    'tipo' => $u->tipo,
                    'estatus' => $estatusActual,
                    'ruta_inicial' => $regInicio->ruta_inicial ?? null,
                    'corrida_inicial' => $regInicio->corrida_inicial ?? null,
                    'hora_salida_patio' => $u->hora_salida_patio ?? ($regInicio->hora_salida_patio_inicial ?? null),
                    'ruta_actual' => $u->ruta_actual ?: 'Sin ruta',
                    'corrida_actual' => $u->corrida_actual,
                    'tarjeton_inicial' => $tarjetonIni ?: null,
                    'conductor_inicial' => $conductorIni ?: 'No asignado al inicio',
                    'tarjeton_actual' => $tarjetonAct ?: null,
                    'conductor_actual' => $conductorAct ?: 'Sin conductor actual',
                    'tiene_relevo' => $tieneRelevo,
                    'estado_visual' => $estadoVisual,
                    'descripcion_estado' => $descripcionEstado,
                    'hora_movimiento' => $horaMovimiento,
                    'motivo_movimiento' => $motivoMovimiento ?: ($tieneRelevo ? 'Relevo de operación' : null),
                    'tipo_movimiento' => $tipoMovimientoRegistrado,
                ];
            }

            // Ordenar por número económico
            usort($lista, function ($a, $b) {
                return (int)$a['numero_eco'] <=> (int)$b['numero_eco'];
            });

            // 7. Obtener lista de conductores con estatus de inasistencia o falta registrada para hoy
            $parseJsonDetalle = function ($raw) {
                if (empty($raw)) {
                    return [];
                }
                if (is_array($raw)) {
                    return $raw;
                }
                if (is_string($raw)) {
                    $decoded = json_decode($raw, true);

                    return is_array($decoded) ? $decoded : [];
                }

                return [];
            };

            $todosConductores = DB::table('conductores')
                ->where(function ($q) {
                    $q->where('estatus', 'activo')
                        ->orWhereNull('estatus');
                })
                ->select(
                    'id',
                    'tarjeton',
                    'nombres',
                    'apellidos',
                    'tipo_tarjeton',
                    'estado_servicio',
                    'telefono',
                    'observaciones',
                    'faltas',
                    'permutas',
                    'faltas_detalle',
                    'descansos_detalle',
                    'vacaciones_detalle',
                    'incapacidades_detalle',
                    'permisos_detalle',
                    'permutas_detalle',
                    'updated_at'
                )
                ->get();

            // Movimientos de hoy en plataforma con motivo de inasistencia/falta
            $movimientosInasistenciaHoy = DB::table('plataforma_movimientos')
                ->whereDate('created_at', $hoy)
                ->whereIn('tipo_movimiento', ['RETIRO_CONDUCTOR', 'DESINCORPORACION'])
                ->get();

            $tarjetonesInasistenciaPlataforma = [];
            foreach ($movimientosInasistenciaHoy as $mov) {
                $motivoUpper = strtoupper(trim((string) ($mov->motivo ?? '')));
                if (str_contains($motivoUpper, 'FALTA') || in_array($motivoUpper, ['PERMISO', 'ENFERMEDAD', 'INCAPACIDAD', 'PERMUTA', 'DESCANSO'])) {
                    $tarjetonRetirado = !empty($mov->conductor_anterior) ? $mov->conductor_anterior : $mov->conductor_asignado;
                    if (! empty($tarjetonRetirado)) {
                        $tarjetonesInasistenciaPlataforma[trim((string) $tarjetonRetirado)] = [
                            'motivo' => $mov->motivo ?? 'Inasistencia',
                            'hora' => $mov->created_at ? Carbon::parse($mov->created_at)->format('H:i') : '',
                        ];
                    }
                }
            }

            $conductoresFaltaMap = [];

            foreach ($todosConductores as $c) {
                $tarjetonKey = trim((string) $c->tarjeton);
                $tarjetonNum = (string) (int) preg_replace('/\D/', '', $tarjetonKey);
                $estadoServicio = strtolower(trim((string) ($c->estado_servicio ?? '')));

                $tieneFaltaHoy = false;
                $motivoDetectado = null;
                $estadoFinal = null;
                $fechaActualizacion = $c->updated_at ? Carbon::parse($c->updated_at)->format('d/m/Y H:i') : null;

                // 1. Verificar faltas_detalle para hoy
                $faltasDetalle = $parseJsonDetalle($c->faltas_detalle);
                foreach ($faltasDetalle as $f) {
                    if (isset($f['fecha']) && substr((string) $f['fecha'], 0, 10) === $hoy) {
                        if (isset($f['estado']) && $f['estado'] === 'retardo') {
                            continue; // Los retardos no cuentan como falta
                        }
                        $tieneFaltaHoy = true;
                        $estadoFinal = 'falta';
                        $motivoDetectado = $f['motivo'] ?? 'Falta registrada';
                        break;
                    }
                }

                // 2. Verificar incapacidades_detalle
                if (! $tieneFaltaHoy) {
                    $incapacidadesDetalle = $parseJsonDetalle($c->incapacidades_detalle);
                    foreach ($incapacidadesDetalle as $inc) {
                        if (isset($inc['fecha']) && substr((string) $inc['fecha'], 0, 10) === $hoy) {
                            $tieneFaltaHoy = true;
                            $estadoFinal = 'incapacidad';
                            $motivoDetectado = $inc['motivo'] ?? 'Incapacidad médica';
                            break;
                        }
                    }
                }

                // 3. Verificar permisos_detalle
                if (! $tieneFaltaHoy) {
                    $permisosDetalle = $parseJsonDetalle($c->permisos_detalle);
                    foreach ($permisosDetalle as $p) {
                        if (isset($p['fecha']) && substr((string) $p['fecha'], 0, 10) === $hoy) {
                            $tieneFaltaHoy = true;
                            $estadoFinal = 'permiso';
                            $motivoDetectado = $p['motivo'] ?? 'Permiso autorizado';
                            break;
                        }
                    }
                }

                // 4. Verificar permutas_detalle
                if (! $tieneFaltaHoy) {
                    $permutasDetalle = $parseJsonDetalle($c->permutas_detalle);
                    foreach ($permutasDetalle as $pm) {
                        if (isset($pm['fecha']) && substr((string) $pm['fecha'], 0, 10) === $hoy) {
                            $tipoPerm = is_array($pm) ? ($pm['tipo'] ?? 'DP') : 'DP';
                            if ($tipoPerm === 'DP' || $tipoPerm !== 'AP') {
                                $tieneFaltaHoy = true;
                                $estadoFinal = 'permuta';
                                $motivoDetectado = is_array($pm) ? ($pm['motivo'] ?? 'Permuta (Descanso)') : (is_string($pm) ? $pm : 'Permuta (Descanso)');
                                break;
                            }
                        }
                    }
                }

                // 5. Verificar descansos_detalle
                if (! $tieneFaltaHoy) {
                    $descansosDetalle = $parseJsonDetalle($c->descansos_detalle);
                    foreach ($descansosDetalle as $d) {
                        if (isset($d['fecha']) && substr((string) $d['fecha'], 0, 10) === $hoy) {
                            $tieneFaltaHoy = true;
                            $estadoFinal = 'descanso';
                            $motivoDetectado = $d['motivo'] ?? 'Descanso programado';
                            break;
                        }
                    }
                }

                // 6. Verificar vacaciones_detalle
                if (! $tieneFaltaHoy) {
                    $vacacionesDetalle = $parseJsonDetalle($c->vacaciones_detalle);
                    foreach ($vacacionesDetalle as $v) {
                        if (isset($v['fecha']) && substr((string) $v['fecha'], 0, 10) === $hoy) {
                            $tieneFaltaHoy = true;
                            $estadoFinal = 'vacaciones';
                            $motivoDetectado = $v['motivo'] ?? 'Periodo vacacional';
                            break;
                        }
                    }
                }

                // 7. Verificar si en estado_servicio tiene un estado explícito de inasistencia
                if (! $tieneFaltaHoy && ! empty($estadoServicio) && ! in_array($estadoServicio, ['disponible', 'en_servicio', 'maniobrista'])) {
                    $tieneFaltaHoy = true;
                    $estadoFinal = $estadoServicio;
                    $motivoDetectado = $c->observaciones ?: ('Estado: '.strtoupper($estadoServicio));
                }

                // 8. Verificar si fue retirado hoy en plataforma con motivo de falta / inasistencia
                if (! $tieneFaltaHoy) {
                    $infoMov = $tarjetonesInasistenciaPlataforma[$tarjetonKey]
                        ?? ($tarjetonNum !== '0' ? ($tarjetonesInasistenciaPlataforma[$tarjetonNum] ?? null) : null);

                    if ($infoMov) {
                        $tieneFaltaHoy = true;
                        $estadoFinal = str_contains(strtoupper($infoMov['motivo']), 'FALTA') ? 'falta' : strtolower($infoMov['motivo']);
                        $motivoDetectado = "Retirado en Mesa de Control ({$infoMov['hora']}) - ".$infoMov['motivo'];
                    }
                }

                if ($tieneFaltaHoy) {
                    $nombreCompleto = trim(($c->apellidos ?? '').' '.($c->nombres ?? ''));
                    $conductoresFaltaMap[$c->id] = [
                        'id' => $c->id,
                        'tarjeton' => $c->tarjeton ?: 'SIN TARJETÓN',
                        'nombre_completo' => $nombreCompleto !== '' ? $nombreCompleto : 'Sin nombre registrado',
                        'tipo_tarjeton' => $c->tipo_tarjeton ?: 'N/A',
                        'estado_servicio' => $estadoFinal ?: 'falta',
                        'telefono' => $c->telefono ?: 'Sin registro',
                        'observaciones' => $motivoDetectado ?: ($c->observaciones ?: 'Sin observaciones'),
                        'faltas' => (int) ($c->faltas ?? 0),
                        'permutas' => (int) ($c->permutas ?? 0),
                        'fecha_actualizacion' => $fechaActualizacion,
                    ];
                }
            }

            $conductoresFalta = array_values($conductoresFaltaMap);

            return response()->json([
                'status' => 'success',
                'fecha' => $hoy,
                'tipo' => $tipo,
                'kpis' => [
                    'total_flota' => count($lista),
                    'total_operacion' => $totalOperacion,
                    'total_titulares' => $totalTitulares,
                    'total_relevos' => $totalRelevos,
                    'total_sin_conductor' => $totalSinConductor,
                    'total_conductores_falta' => count($conductoresFalta),
                ],
                'unidades' => $lista,
                'conductores_falta' => $conductoresFalta,
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error en monitoreoConductoresDia: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error al consultar monitoreo de conductores',
                'detalle' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene la programación inicial (Apertura de las 04:30 AM) para Mesa de Control.
     * Retorna el snapshot congelado de historial_operativo con momento = 'INICIO'.
     */
    public function obtenerProgramacionApertura($tipo)
    {
        try {
            $tipoNormalizado = strtolower(trim($tipo));
            $hoy = Carbon::today()->toDateString();

            // 1. Asegurar snapshot de inicio si no existe aún para el día
            BitacoraHelper::ensureInicioSnapshot();

            // 2. Consultar primordialmente el snapshot de apertura (04:30 AM congelada de Logística)
            $columns = [
                'unidades.id as unidad_id',
                'unidades.numero_eco',
                'historial_operativo.tipo',
                'historial_operativo.ruta',
                'historial_operativo.corridas',
                'historial_operativo.ciclo',
                'historial_operativo.numero_tarjeton as tarjeton',
                'historial_operativo.nombre_conductor',
                'historial_operativo.estatus',
                'historial_operativo.falla',
                'historial_operativo.motivo',
                'historial_operativo.motivo_estatus',
                'informacion_operativa.relevo_tarjeton',
                'informacion_operativa.relevo_conductor',
                'informacion_operativa.relevo_hora',
            ];

            if (Schema::hasColumn('historial_operativo', 'tarjeton_maniobrista')) {
                $columns[] = 'historial_operativo.tarjeton_maniobrista';
                $columns[] = 'historial_operativo.nombre_maniobrista';
            }
            if (Schema::hasColumn('historial_operativo', 'hora_salida_patio')) {
                $columns[] = 'historial_operativo.hora_salida_patio';
            }
            if (Schema::hasColumn('historial_operativo', 'acople')) {
                $columns[] = 'historial_operativo.acople';
            }
            if (Schema::hasColumn('historial_operativo', 'hora_real_salida_patio')) {
                $columns[] = 'historial_operativo.hora_real_salida_patio';
            }
            if (Schema::hasColumn('historial_operativo', 'itinerario')) {
                $columns[] = 'historial_operativo.itinerario';
            }
            if (Schema::hasColumn('historial_operativo', 'hora_incorporacion')) {
                $columns[] = 'historial_operativo.hora_incorporacion';
            }
            if (Schema::hasColumn('historial_operativo', 'hora_desincorporacion')) {
                $columns[] = 'historial_operativo.hora_desincorporacion';
            }

            $query = DB::table('historial_operativo')
                ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                ->leftJoin('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
                ->where('historial_operativo.fecha_historial', $hoy)
                ->where('historial_operativo.momento', 'INICIO')
                ->select($columns);

            if ($tipoNormalizado !== 'todos') {
                if ($tipoNormalizado === 'urbanuss' || $tipoNormalizado === 'urbanus') {
                    $query->whereIn(DB::raw('LOWER(historial_operativo.tipo)'), ['urbanuss', 'urbanus']);
                } else {
                    $query->whereRaw('LOWER(historial_operativo.tipo) = ?', [$tipoNormalizado]);
                }
            }

            $registros = $query
                ->orderBy('historial_operativo.tipo')
                ->orderBy('unidades.numero_eco')
                ->get()
                ->unique('numero_eco')
                ->values();

            // Si aún no existe historial_operativo INICIO, usar informacion_operativa como fallback inicial
            if ($registros->isEmpty()) {
                $queryFallback = DB::table('informacion_operativa')
                    ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                    ->select(
                        'unidades.id as unidad_id',
                        'unidades.numero_eco',
                        'informacion_operativa.tipo',
                        'informacion_operativa.ruta',
                        'informacion_operativa.corridas',
                        'informacion_operativa.ciclo',
                        'informacion_operativa.numero_tarjeton as tarjeton',
                        'informacion_operativa.nombre_conductor',
                        'informacion_operativa.estatus',
                        'informacion_operativa.falla',
                        'informacion_operativa.motivo',
                        'informacion_operativa.motivo_estatus',
                        'informacion_operativa.tarjeton_maniobrista',
                        'informacion_operativa.nombre_maniobrista',
                        'informacion_operativa.hora_salida_patio',
                        'informacion_operativa.acople',
                        'informacion_operativa.hora_real_salida_patio',
                        'informacion_operativa.relevo_tarjeton',
                        'informacion_operativa.relevo_conductor',
                        'informacion_operativa.relevo_hora',
                        'informacion_operativa.itinerario',
                        'informacion_operativa.hora_incorporacion',
                        'informacion_operativa.hora_desincorporacion'
                    );

                if ($tipoNormalizado !== 'todos') {
                    if ($tipoNormalizado === 'urbanuss' || $tipoNormalizado === 'urbanus') {
                        $queryFallback->whereIn(DB::raw('LOWER(informacion_operativa.tipo)'), ['urbanuss', 'urbanus']);
                    } else {
                        $queryFallback->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado]);
                    }
                }

                $registros = $queryFallback
                    ->orderBy('informacion_operativa.tipo')
                    ->orderBy('unidades.numero_eco')
                    ->get()
                    ->unique('numero_eco')
                    ->values();
            }

            $kpis = [
                'total_flota' => $registros->count(),
                'total_operacion' => 0,
                'total_reserva' => 0,
                'total_mantenimiento' => 0,
                'con_conductor' => 0,
                'sin_conductor' => 0,
            ];

            $unidadesFormateadas = $registros->map(function ($r) use (&$kpis) {
                $estatus = strtolower(trim($r->estatus ?? 'reserva'));
                if ($estatus === 'operacion') {
                    $kpis['total_operacion']++;
                } elseif ($estatus === 'reserva') {
                    $kpis['total_reserva']++;
                } elseif ($estatus === 'mantenimiento' || $estatus === 'percance') {
                    $kpis['total_mantenimiento']++;
                } else {
                    $kpis['total_reserva']++;
                }

                $tieneConductor = ! empty(trim($r->nombre_conductor ?? '')) || ! empty(trim($r->tarjeton ?? ''));
                if ($tieneConductor) {
                    $kpis['con_conductor']++;
                } elseif ($estatus === 'operacion') {
                    $kpis['sin_conductor']++;
                }

                return [
                    'unidad_id' => $r->unidad_id ?? null,
                    'numero_eco' => $r->numero_eco,
                    'tipo' => strtoupper($r->tipo ?? ''),
                    'ruta' => $r->ruta ?? '',
                    'corridas' => $r->corridas ?? '',
                    'ciclo' => $r->ciclo ?? '',
                    'tarjeton' => $r->tarjeton ?? '',
                    'nombre_conductor' => $r->nombre_conductor ?? '',
                    'tarjeton_maniobrista' => $r->tarjeton_maniobrista ?? '',
                    'nombre_maniobrista' => $r->nombre_maniobrista ?? '',
                    'estatus' => $estatus,
                    'falla' => $r->falla ?? '',
                    'motivo' => $r->motivo ?? '',
                    'motivo_estatus' => $r->motivo_estatus ?? '',
                    'hora_salida_patio' => $r->hora_salida_patio ?? '',
                    'acople' => $r->acople ?? '',
                    'hora_real_salida_patio' => $r->hora_real_salida_patio ?? '',
                    'relevo_tarjeton' => $r->relevo_tarjeton ?? '',
                    'relevo_conductor' => $r->relevo_conductor ?? '',
                    'relevo_hora' => $r->relevo_hora ?? '',
                    'itinerario' => (bool) ($r->itinerario ?? false),
                    'hora_incorporacion' => $r->hora_incorporacion ?? '',
                    'hora_desincorporacion' => $r->hora_desincorporacion ?? '',
                ];
            });

            return response()->json([
                'status' => 'success',
                'fecha' => $hoy,
                'corte' => 'Apertura (04:30 AM)',
                'kpis' => $kpis,
                'unidades' => $unidadesFormateadas,
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error en obtenerProgramacionApertura: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error al cargar programación de apertura: '.$e->getMessage(),
            ], 500);
        }
    }

    public function cargarProgramacionExcel(Request $request)
    {
        $request->validate([
            'datos' => 'required|array',
        ]);

        $datos = $request->datos;

        try {
            DB::beginTransaction();

            // Solo afecta 'manana'
            DB::table('informacion_operativa_manana')->delete();

            // También limpiar la tabla entradas_t6 para mañana
            $mananaFecha = Carbon::tomorrow('America/Mexico_City')->toDateString();
            DB::table('entradas_t6')->where('fecha', $mananaFecha)->delete();

            $erroresFormato = [];
            $insertData = [];
            $entradasT6Data = [];

            // Obtener rutas y unidades
            $rutas = DB::table('rutas')->pluck('ruta', 'ruta')->toArray();
            $unidadesData = DB::table('unidades')
                ->leftJoin('transportes', 'unidades.transporte_id', '=', 'transportes.id')
                ->get([
                    'unidades.id',
                    'unidades.numero_eco',
                    DB::raw('COALESCE(unidades.tipo, transportes.nombre) as tipo')
                ]);
            $conductoresRaw = DB::table('conductores')->get(['tarjeton', 'nombres', 'apellidos']);
            $conductores = [];
            foreach ($conductoresRaw as $c) {
                $nom = mb_strtoupper(trim(($c->nombres ?? '') . ' ' . ($c->apellidos ?? '')), 'UTF-8');
                $t = trim((string) $c->tarjeton);
                if ($t !== '') {
                    $conductores[$t] = $nom;
                    $conductores[ltrim($t, '0')] = $nom;
                    $conductores[str_pad(ltrim($t, '0'), 4, '0', STR_PAD_LEFT)] = $nom;
                }
            }
            
            $unidadesDict = [];
            foreach ($unidadesData as $u) {
                $unidadesDict[ltrim((string)$u->numero_eco, '0')] = $u;
                $unidadesDict[(string)$u->numero_eco] = $u;
            }

            // Obtener unidades actualmente en Mantenimiento o Percance para preservar su estatus
            $unidadesMantenimientoPercance = DB::table('informacion_operativa')
                ->whereIn(DB::raw('LOWER(estatus)'), ['mantenimiento', 'percance'])
                ->get()
                ->keyBy('unidad_id');

            $unidadesProcesadas = [];
            $ecosEnExcel = [];
            $tarjetonesEnExcel = [];

            foreach ($datos as $index => $fila) {
                $hojaStr = trim((string) ($fila['HOJA'] ?? ''));
                $filaNum = isset($fila['FILA']) ? (int)$fila['FILA'] : ($index + 2);
                $prefixErr = $hojaStr !== '' ? "Hoja \"{$hojaStr}\", Fila {$filaNum}:" : "Fila {$filaNum}:";

                $eco = trim((string) ($fila['ECONOMICO'] ?? ($fila['eco'] ?? '')));
                if ($eco === '') {
                    continue;
                }

                if (isset($ecosEnExcel[$eco])) {
                    $erroresFormato[] = "{$prefixErr} El económico {$eco} está duplicado en el archivo.";
                }
                $ecosEnExcel[$eco] = true;

                $ecoKey = ltrim($eco, '0');

                $unidadObj = null;
                if (isset($unidadesDict[$ecoKey])) {
                    $unidadObj = $unidadesDict[$ecoKey];
                } elseif (isset($unidadesDict[$eco])) {
                    $unidadObj = $unidadesDict[$eco];
                }

                if (! $unidadObj) {
                    $erroresFormato[] = "{$prefixErr} Unidad económico {$eco} no encontrada en la base de datos.";
                    continue;
                }
                
                $unidadId = $unidadObj->id;
                $tipoUnidadDB = strtoupper($unidadObj->tipo ?? '');

                $unidadesProcesadas[] = $unidadId;

                // SERVICIO (T05-06) -> Ruta y Corrida
                $servicio = trim((string) ($fila['SERVICIO'] ?? ''));
                $servicio = str_replace(':', '-', $servicio);

                $rutaStr = null;
                $corridaNum = null;
                $corridaVal = null;
                if (str_contains($servicio, '-')) {
                    $partes = explode('-', $servicio);
                    $rutaStr = trim((string) ($partes[0] ?? ''));
                    $corridaVal = isset($partes[1]) ? trim((string) $partes[1]) : '';
                } elseif (preg_match('/^([^\s]+)\s+(\d+)$/', $servicio, $matchesServicio)) {
                    $rutaStr = trim($matchesServicio[1]);
                    $corridaVal = trim($matchesServicio[2]);
                } else {
                    $rutaStr = $servicio !== '' ? $servicio : trim((string) ($fila['ruta'] ?? ''));
                    $corridaVal = trim((string) ($fila['corrida'] ?? ''));
                }

                if ($corridaVal !== '') {
                    if (!is_numeric($corridaVal)) {
                        $erroresFormato[] = "{$prefixErr} La corrida debe ser un número (recibido: {$corridaVal}).";
                    } else {
                        $corridaNum = (int) $corridaVal;
                    }
                }

                if ($rutaStr !== '' && !str_starts_with($rutaStr, 'T')) {
                    $rutaStr = ltrim($rutaStr, '0');
                }

                if ($rutaStr !== '' && ! isset($rutas[$rutaStr])) {
                    $erroresFormato[] = "{$prefixErr} La ruta {$rutaStr} no existe en el sistema.";
                }

                // Validar tecnologia (Eco vs Ruta)
                if ($rutaStr !== '') {
                    $ecoNumVal = (int) $ecoKey;
                    $esTroncalUnidad = ($ecoNumVal >= 1 && $ecoNumVal <= 42) || str_contains($tipoUnidadDB, 'URBANUS');
                    
                    if ($esTroncalUnidad && !str_starts_with($rutaStr, 'T')) {
                        $erroresFormato[] = "{$prefixErr} El económico {$eco} es troncal, pero la ruta {$rutaStr} no lo es.";
                    } elseif (!$esTroncalUnidad && str_starts_with($rutaStr, 'T')) {
                        $erroresFormato[] = "{$prefixErr} El económico {$eco} es alimentadora, pero la ruta {$rutaStr} es troncal.";
                    }
                }

                // Validar horas (Formato HH:MM)
                $horaSalida = trim((string) ($fila['HORA DE SALIDA DE PATIO'] ?? ($fila['horaSalida'] ?? '')));
                $horaAcople = trim((string) ($fila['HORA DE ACOPLE'] ?? ($fila['horaAcople'] ?? '')));
                $horaEncierro = trim((string) ($fila['HORA DE ENCIERRO'] ?? ($fila['horaEncierro'] ?? ($fila['HORA_ENCIERRO'] ?? ($fila['hora_encierro'] ?? '')))));
                $horaEntrada = trim((string) ($fila['HORA ENTRADA T6'] ?? ($fila['horaEntrada'] ?? '')));

                $regexHora = '/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/';

                if ($horaSalida !== '' && ! preg_match($regexHora, $horaSalida)) {
                    $erroresFormato[] = "{$prefixErr} Hora de salida de patio ({$horaSalida}) inválida. Formato esperado HH:MM.";
                }
                if ($horaAcople !== '' && ! preg_match($regexHora, $horaAcople)) {
                    $erroresFormato[] = "{$prefixErr} Hora de acople ({$horaAcople}) inválida. Formato esperado HH:MM.";
                }
                if ($horaEncierro !== '' && ! preg_match($regexHora, $horaEncierro)) {
                    $erroresFormato[] = "{$prefixErr} Hora de encierro ({$horaEncierro}) inválida. Formato esperado HH:MM.";
                }
                if ($horaEntrada !== '' && ! preg_match($regexHora, $horaEntrada)) {
                    $erroresFormato[] = "{$prefixErr} Hora de entrada T6 ({$horaEntrada}) inválida. Formato esperado HH:MM.";
                }

                $tarjetonStr = trim((string) ($fila['TARJETON'] ?? ($fila['tarjeton'] ?? '')));
                if ($tarjetonStr !== '') {
                    if (!is_numeric($tarjetonStr)) {
                        $erroresFormato[] = "{$prefixErr} El tarjetón debe contener solo números (recibido: {$tarjetonStr}).";
                    } else {
                        $tarjetonStr = str_pad($tarjetonStr, 4, '0', STR_PAD_LEFT);
                        if (isset($tarjetonesEnExcel[$tarjetonStr])) {
                            $erroresFormato[] = "{$prefixErr} El tarjetón {$tarjetonStr} está duplicado en el archivo.";
                        }
                        $tarjetonesEnExcel[$tarjetonStr] = true;
                    }
                }

                $nombreConductor = null;
                if ($tarjetonStr !== '') {
                    if (!isset($conductores[$tarjetonStr])) {
                        $erroresFormato[] = "{$prefixErr} El conductor con tarjetón {$tarjetonStr} no existe en la base de datos.";
                    } else {
                        $nombreConductor = mb_strtoupper(trim($conductores[$tarjetonStr]), 'UTF-8');
                    }
                } elseif (!empty($fila['CONDUCTOR']) || !empty($fila['NOMBRE_CONDUCTOR'])) {
                    $nombreConductor = mb_strtoupper(trim((string) ($fila['CONDUCTOR'] ?? $fila['NOMBRE_CONDUCTOR'])), 'UTF-8');
                }
                
                $patioNorteRaw = $fila['PATIO_NORTE'] ?? ($fila['patio_norte'] ?? false);
                $patioNorteStr = strtoupper(trim((string)$patioNorteRaw));
                $patioNorteBool = filter_var($patioNorteRaw, FILTER_VALIDATE_BOOLEAN) || in_array($patioNorteStr, ['SI', 'SÍ', '1', 'TRUE']);
                $patioNorteVal = $patioNorteBool ? 'true' : 'false';

                $itinerarioRaw = $fila['ITINERARIO'] ?? ($fila['itinerario'] ?? false);
                $itinerarioStr = strtoupper(trim((string)$itinerarioRaw));
                $itinerarioBool = filter_var($itinerarioRaw, FILTER_VALIDATE_BOOLEAN) || in_array($itinerarioStr, ['SI', 'SÍ', '1', 'TRUE']);
                $itinerarioVal = $itinerarioBool ? 'true' : 'false';

                $horaIncorporacionVal = trim((string) ($fila['HORA DE INCORPORACION'] ?? ($fila['horaIncorporacion'] ?? ($fila['HORA_INCORPORACION'] ?? ($fila['hora_incorporacion'] ?? ''))))) ?: null;
                $horaDesincorporacionVal = trim((string) ($fila['HORA DE DESINCORPORACION'] ?? ($fila['horaDesincorporacion'] ?? ($fila['HORA_DESINCORPORACION'] ?? ($fila['hora_desincorporacion'] ?? ''))))) ?: null;

                // Lógica de "reserva" o "operación"
                // Si Ruta, Tarjetón, Hora Salida, Hora Acople y Corrida están vacíos:
                $estaVacia = ($rutaStr === '' && $corridaVal === '' && $tarjetonStr === '' && $horaSalida === '' && $horaAcople === '');
                
                if ($estaVacia) {
                    if ($unidadesMantenimientoPercance->has($unidadId)) {
                        $bloq = $unidadesMantenimientoPercance->get($unidadId);
                        $insertData[] = [
                            'unidad_id'                 => $unidadId,
                            'tipo'                      => $bloq->tipo ?? (!empty($tipoUnidadDB) ? $tipoUnidadDB : null),
                            'estatus'                   => $bloq->estatus,
                            'motivo_estatus'            => $bloq->motivo_estatus,
                            'folio_mantenimiento'       => $bloq->folio_mantenimiento,
                            'fecha_folio_mantenimiento' => $bloq->fecha_folio_mantenimiento,
                            'numero_incidencia'         => $bloq->numero_incidencia,
                            'falla_reportada'           => $bloq->falla_reportada,
                            'diagnostico'               => $bloq->diagnostico,
                            'falla'                     => $bloq->falla,
                            'motivo'                    => $bloq->motivo,
                            'observaciones'             => $bloq->observaciones ?? null,
                            'firma_base64'              => $bloq->firma_base64,
                            'id_firma'                  => $bloq->id_firma,
                            'fecha_firma'               => $bloq->fecha_firma,
                            'km_ultima_lectura'         => $bloq->km_ultima_lectura,
                            'mantenimiento_conductor'   => $bloq->mantenimiento_conductor,
                            'mantenimiento_tarjeton'    => $bloq->mantenimiento_tarjeton,
                            'mantenimiento_ruta'        => $bloq->mantenimiento_ruta,
                            'mantenimiento_corrida'     => $bloq->mantenimiento_corrida,
                            'mantenimiento_kilometraje' => $bloq->mantenimiento_kilometraje,
                            'patio_norte'               => $patioNorteVal,
                            'itinerario'                => $itinerarioVal,
                            'hora_incorporacion'        => null,
                            'hora_desincorporacion'     => null,
                            'hora_encierro'             => null,
                        ];
                    } else {
                        $insertData[] = [
                            'unidad_id' => $unidadId,
                            'estatus' => 'reserva',
                            'patio_norte' => $patioNorteVal,
                            'itinerario' => $itinerarioVal,
                            'hora_incorporacion' => null,
                            'hora_desincorporacion' => null,
                            'hora_encierro' => null,
                        ];
                    }
                } else {
                    // Si no está vacía, DEBE tener todo lleno para ser operación
                    $faltantes = [];
                    if ($rutaStr === '') $faltantes[] = 'Ruta';
                    if ($corridaVal === '') $faltantes[] = 'Corrida';
                    if ($tarjetonStr === '') $faltantes[] = 'Tarjetón';
                    if ($horaSalida === '') $faltantes[] = 'Hora de Salida';
                    if ($horaAcople === '') $faltantes[] = 'Hora de Acople';

                    if (count($faltantes) > 0) {
                        $faltantesStr = implode(', ', $faltantes);
                        $erroresFormato[] = "{$prefixErr} Faltan campos obligatorios para asignar la unidad en operación: {$faltantesStr}. Si desea enviarla a reserva, deje todas esas celdas vacías.";
                    } else {
                        $insertData[] = [
                            'unidad_id' => $unidadId,
                            'ruta' => $rutaStr,
                            'corridas' => $corridaNum,
                            'numero_tarjeton' => $tarjetonStr,
                            'nombre_conductor' => $nombreConductor,
                            'tipo' => !empty($tipoUnidadDB) ? $tipoUnidadDB : null,
                            'patio_norte' => $patioNorteVal,
                            'itinerario' => $itinerarioVal,
                            'hora_salida_patio' => $horaSalida,
                            'acople' => $horaAcople,
                            'hora_encierro' => $horaEncierro !== '' ? $horaEncierro : null,
                            'hora_incorporacion' => $horaIncorporacionVal,
                            'hora_desincorporacion' => $horaDesincorporacionVal,
                            'estatus' => 'operacion',
                        ];

                        if ($horaEntrada !== '') {
                            $entradasT6Data[] = [
                                'fecha' => $mananaFecha,
                                'unidad_id' => $unidadId,
                                'hora_entrada_t6' => $horaEntrada,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }
                }
            }

            if (! empty($erroresFormato)) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Errores de validación en el Excel',
                    'errores' => $erroresFormato,
                ], 422);
            }

            // Las unidades que no vinieron en el excel: si están en mantenimiento/percance conservan ese estatus con todos sus datos, si no van a reserva
            $unidadesProcesadas = array_unique($unidadesProcesadas);
            foreach ($unidadesData as $u) {
                if (! in_array($u->id, $unidadesProcesadas, true)) {
                    if ($unidadesMantenimientoPercance->has($u->id)) {
                        $bloq = $unidadesMantenimientoPercance->get($u->id);
                        $insertData[] = [
                            'unidad_id'                 => $u->id,
                            'tipo'                      => $bloq->tipo,
                            'estatus'                   => $bloq->estatus,
                            'motivo_estatus'            => $bloq->motivo_estatus,
                            'folio_mantenimiento'       => $bloq->folio_mantenimiento,
                            'fecha_folio_mantenimiento' => $bloq->fecha_folio_mantenimiento,
                            'numero_incidencia'         => $bloq->numero_incidencia,
                            'falla_reportada'           => $bloq->falla_reportada,
                            'diagnostico'               => $bloq->diagnostico,
                            'falla'                     => $bloq->falla,
                            'motivo'                    => $bloq->motivo,
                            'observaciones'             => $bloq->observaciones ?? null,
                            'firma_base64'              => $bloq->firma_base64,
                            'id_firma'                  => $bloq->id_firma,
                            'fecha_firma'               => $bloq->fecha_firma,
                            'km_ultima_lectura'         => $bloq->km_ultima_lectura,
                            'mantenimiento_conductor'   => $bloq->mantenimiento_conductor,
                            'mantenimiento_tarjeton'    => $bloq->mantenimiento_tarjeton,
                            'mantenimiento_ruta'        => $bloq->mantenimiento_ruta,
                            'mantenimiento_corrida'     => $bloq->mantenimiento_corrida,
                            'mantenimiento_kilometraje' => $bloq->mantenimiento_kilometraje,
                            'patio_norte'               => filter_var($bloq->patio_norte ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                            'itinerario'                => 'false',
                        ];
                    } else {
                        $insertData[] = [
                            'unidad_id'   => $u->id,
                            'estatus'     => 'reserva',
                            'patio_norte' => 'false',
                            'itinerario'  => 'false',
                        ];
                    }
                }
            }

            // Insertar todo
            $mananaCols = array_flip(Schema::getColumnListing('informacion_operativa_manana'));
            foreach ($insertData as $data) {
                $filteredData = array_intersect_key($data, $mananaCols);
                DB::table('informacion_operativa_manana')->insert($filteredData);
            }

            if (! empty($entradasT6Data)) {
                DB::table('entradas_t6')->insert($entradasT6Data);
            }

            DB::commit();

            return response()->json([
                'message' => 'Programación del día siguiente cargada exitosamente.',
                'total' => count($insertData),
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Error cargando Excel: '.$e->getMessage());

            return response()->json([
                'message' => 'Error al cargar programación',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function resolverFechaCiclos($fechaInput)
    {
        $fecha = Carbon::today('America/Mexico_City');
        switch (strtoupper(trim((string) $fechaInput))) {
            case 'MANANA':
                $fecha->addDay();
                break;
            case 'HOY':
            case 'FESTIVO':
                break;
            default:
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $fechaInput)) {
                    return (string) $fechaInput;
                }
                break;
        }
        return $fecha->toDateString();
    }

    public function obtenerCiclos(Request $request)
    {
        $fechaInput = $request->query('fecha', 'MANANA');
        $fecha = $this->resolverFechaCiclos($fechaInput);

        if (!Schema::hasTable('programacion_ciclos')) {
            return response()->json([
                'fecha' => $fecha,
                'ciclos' => null,
            ], 200);
        }

        $registro = DB::table('programacion_ciclos')
            ->where('fecha_operativa', $fecha)
            ->first();

        return response()->json([
            'fecha' => $fecha,
            'ciclos' => $registro ? (int) $registro->ciclos : null,
        ], 200);
    }

    public function guardarCiclos(Request $request)
    {
        $request->validate([
            'fecha' => 'required|string',
            'ciclos' => 'required|integer|min:0',
        ]);

        $fechaInput = $request->input('fecha', 'MANANA');
        $fecha = $this->resolverFechaCiclos($fechaInput);
        $ciclos = (int) $request->input('ciclos');

        if (!Schema::hasTable('programacion_ciclos')) {
            Schema::create('programacion_ciclos', function (Blueprint $table) {
                $table->id();
                $table->date('fecha_operativa')->unique();
                $table->integer('ciclos');
                $table->timestamps();
            });
        }

        $ahora = Carbon::now('America/Mexico_City');

        DB::table('programacion_ciclos')->updateOrInsert(
            ['fecha_operativa' => $fecha],
            [
                'ciclos' => $ciclos,
                'updated_at' => $ahora,
                'created_at' => $ahora,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Número de ciclos guardado correctamente.',
            'fecha' => $fecha,
            'ciclos' => $ciclos,
        ], 200);
    }
}

