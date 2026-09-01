<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Helpers\BitacoraHelper;

class DespachoController extends Controller
{
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
            if ($numeroEco === '' || !is_numeric($numeroEco)) {
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

            if (!$unidad) {
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
                            'updated_at' => now()
                        ]
                    );
                } catch (\Exception $e) {
                    \Log::error('Error al auto-alimentar conductores en importación: ' . $e->getMessage());
                }
            }

            $horaAcople = trim((string) ($fila['HORA_PROGRAMADA'] ?? '')) ?: trim((string) ($fila['HORA_DE_ACOPLE'] ?? ''));

            // Usamos unidad_id como clave para sobrescribir duplicados si existen en el mismo Excel
            $registrosParaInsertar[$unidad->id] = [
                'unidad_id' => $unidad->id,
                'ruta' => trim((string) ($fila['RUTA'] ?? '')),
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $nombreConductor,
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'Sin estatus')),
                'corridas' => trim((string) ($fila['CORRIDA'] ?? '')) === '' ? null : (int) trim((string) ($fila['CORRIDA'] ?? '')),
                'hora_programada' => $horaAcople === '' ? null : $horaAcople,
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

            $chunks = array_chunk($registrosParaInsertar, 50);
            foreach ($chunks as $chunk) {
                DB::table('informacion_operativa')->insert($chunk);
            }

            // Forzar la creación inmediata del snapshot de INICIO con los nuevos datos
            \App\Helpers\BitacoraHelper::ensureInicioSnapshot();

            // Forzar la creación inmediata del snapshot de INICIO con los nuevos datos
            \App\Helpers\BitacoraHelper::ensureInicioSnapshot();

            \Log::info('Todos los registros insertados', [
                'total' => count($registrosParaInsertar),
            ]);

            $mensaje = count($registrosParaInsertar) . ' registros importados exitosamente.';
            if (!empty($unidadesNoEncontradas)) {
                $mensaje .= ' (' . count($unidadesNoEncontradas) . ' unidades no encontradas en la BD)';
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
     * Obtiene el conteo de unidades con registro operativo hoy, agrupadas por tipo.
     */
    public function conteoUnidadesPorTipo(Request $request)
    {
        $conteos = DB::table('informacion_operativa')
            ->select('tipo', DB::raw('count(distinct unidad_id) as total'))
            ->groupBy('tipo')
            ->get();

        $resultado = [];
        foreach ($conteos as $item) {
            if (!empty($item->tipo)) {
                $tipo = strtolower(trim($item->tipo));

                if (isset($resultado[$tipo])) {
                    $resultado[$tipo] += (int)$item->total;
                } else {
                    $resultado[$tipo] = (int)$item->total;
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
        $tipoNormalizado = strtolower(trim($tipo));

        $unidades = DB::table('unidades')
            ->join('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
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
                'informacion_operativa.hora_programada',
                'informacion_operativa.acople',
                'informacion_operativa.hora_salida',
                'informacion_operativa.folio_mantenimiento',
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.transporte_patio_norte'
            )
            ->distinct()
            ->orderBy('unidades.numero_eco')
            ->get()
            ->map(function ($unidad) {
                $estatus = strtolower(trim($unidad->estatus ?? 'operacion'));
                if (!in_array($estatus, ['operacion', 'mantenimiento', 'reserva'], true)) {
                    $estatus = 'operacion';
                }

                // Recuperar último conductor si está en mantenimiento o reserva y los datos actuales están vacíos
                if (($estatus === 'mantenimiento' || $estatus === 'reserva') && empty($unidad->nombre_conductor)) {
                    $lastRecord = DB::table('historial_operativo')
                        ->where('unidad_id', $unidad->unidad_id)
                        ->whereNotNull('nombre_conductor')
                        ->where('nombre_conductor', '!=', '')
                        ->orderBy('id', 'desc')
                        ->first();
                        
                    if ($lastRecord) {
                        $unidad->nombre_conductor = $lastRecord->nombre_conductor;
                        $unidad->tarjeton = $lastRecord->numero_tarjeton;
                        $unidad->ruta = $lastRecord->ruta;
                        $unidad->corridas = $lastRecord->corridas;
                    }
                }

                return [
                    'unidad_id' => $unidad->unidad_id,
                    'numero_eco' => $unidad->numero_eco,
                    'tarjeton' => $unidad->tarjeton,
                    'estatus' => $estatus,
                    'ruta' => $unidad->ruta,
                    'nombre_conductor' => $unidad->nombre_conductor,
                    'tarjeton_maniobrista' => $unidad->tarjeton_maniobrista,
                    'nombre_maniobrista' => $unidad->nombre_maniobrista,
                    'falla' => $unidad->falla,
                    'corridas' => $unidad->corridas,
                    'hora_programada' => $unidad->hora_programada,
                    'acople' => $unidad->acople,
                    'hora_salida' => $unidad->hora_salida,
                    'folio_mantenimiento' => $unidad->folio_mantenimiento,
                    'fecha_folio_mantenimiento' => $unidad->fecha_folio_mantenimiento,
                    'falla_reportada' => $unidad->falla_reportada,
                    'diagnostico' => $unidad->diagnostico,
                    'transporte_patio_norte' => $unidad->transporte_patio_norte
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

        $unidad = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->where('informacion_operativa.numero_tarjeton', $tarjetonLimpio)
            ->select('unidades.numero_eco as numero_eco', 'informacion_operativa.numero_tarjeton as tarjeton', 'informacion_operativa.estatus')
            ->first();

        if ($unidad) {
            $estatus = strtolower(trim($unidad->estatus ?? 'operacion'));
            if (!in_array($estatus, ['operacion', 'mantenimiento', 'reserva'], true)) {
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
        $tipoNormalizado = strtolower(trim($tipo));


        $data = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select(
                'unidades.numero_eco as economico',
                'informacion_operativa.ruta',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.nombre_conductor as conductor_nombre'
            )
            ->get();

        return response()->json($data, 200);
    }

    /**
     * Obtiene el detalle de una unidad específica por tipo y número ECO
     */
    public function obtenerDetalleUnidad($tipo, $numeroEco)
    {
        \Log::info('[obtenerDetalleUnidad] Inicio', ['tipo' => $tipo, 'eco' => $numeroEco]);
        $tipoNormalizado = strtolower(trim($tipo));

        $numeroEcoClean = str_pad(trim($numeroEco), 3, '0', STR_PAD_LEFT);

        $unidadBase = DB::table('unidades')
            ->where('numero_eco', $numeroEcoClean)
            ->first();

        $info = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
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
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.firma_base64',
                'informacion_operativa.hora_programada',
                'informacion_operativa.acople',
                'informacion_operativa.hora_salida',
                'informacion_operativa.observaciones',
                'informacion_operativa.transporte_patio_norte',
                'unidades.kilometraje'
            )
            ->first();

        $horaSalidaLegacy = null;
        if ($info && empty($info->hora_salida) && empty($info->hora_programada) && empty($info->acople)) {
            $registroBitacora = DB::table('bitacora_cambios_unidades')
                ->where('unidad_id', $unidadBase->id)
                ->where('tipo_accion', 'VALIDAR_DESPACHO')
                ->orderByDesc('created_at')
                ->first();

            if ($registroBitacora && !empty($registroBitacora->detalles)) {
                if (preg_match('/HORA SALIDA:\s*([0-9]{1,2}:[0-9]{2})/i', $registroBitacora->detalles, $matches)) {
                    $horaSalidaLegacy = strtoupper($matches[1]);
                }
            }
        }

        if ($info) {
            $estatus = strtolower(trim($info->estatus ?? 'operacion'));
            if (!in_array($estatus, ['operacion', 'mantenimiento', 'reserva'], true)) {
                $estatus = 'operacion';
            }
        }

        \Log::info('[obtenerDetalleUnidad] Fin', ['info' => (array)$info]);

        return response()->json(
            $info ? [
                'status'    => 'success',
                'asignado'  => true,
                'ruta'      => $info->ruta,
                'conductor' => $info->nombre_conductor,
                'tarjeton'  => $info->numero_tarjeton ?? '',
                'estatus'   => $estatus,
                'falla'     => $info->falla,
                'corridas'  => $info->corridas,
                'ciclo'     => $info->ciclo,
                'motivo'    => $info->motivo,
                'motivo_estatus' => $info->motivo_estatus,
                'folio_mantenimiento' => $info->folio_mantenimiento,
                'fecha_folio_mantenimiento' => $info->fecha_folio_mantenimiento,
                'falla_reportada' => $info->falla_reportada,
                'diagnostico' => $info->diagnostico,
                'firma_base64' => $info->firma_base64,
                'hora_programada' => $info->hora_programada,
                'acople'    => $info->acople,
                'hora_salida' => $info->hora_salida,
                'observaciones' => $info->observaciones,
                'transporte_patio_norte' => $info->transporte_patio_norte,
                // Nuevos campos de mantenimiento
                'nivel_combustible'  => $unidadBase->nivel_combustible ?? null,
                'nivel_adblue'       => $unidadBase->nivel_adblue ?? null,
                'numero_cincho'      => $unidadBase->numero_cincho ?? null,
                'fecha_ultima_carga' => $unidadBase->fecha_ultima_carga ?? null,
            ] : [
                'status'    => 'success',
                'asignado'  => false,
                'ruta'      => 'Sin ruta asignada',
                'conductor' => 'Sin conductor',
                'tarjeton'  => '',
                'estatus'   => 'operacion',
                'falla'     => null,
                'corridas'  => null,
                'ciclo'     => null,
                'motivo'    => null,
                'motivo_estatus' => null,
                'hora_programada' => null,
                'acople'    => null,
                'hora_salida' => null,
                'transporte_patio_norte' => null,
                // Nuevos campos de mantenimiento aunque no esté asignado operativamente
                'nivel_combustible'  => $unidadBase->nivel_combustible ?? null,
                'nivel_adblue'       => $unidadBase->nivel_adblue ?? null,
                'numero_cincho'      => $unidadBase->numero_cincho ?? null,
                'fecha_ultima_carga' => $unidadBase->fecha_ultima_carga ?? null,
            ],
            200
        );
    }

    /**
     * Actualiza los registros de informacion_operativa para el día actual
     * a partir de los datos enviados desde la vista previa.
     */
    public function actualizar(Request $request)
    {
        $request->validate(['unidades' => 'required|array']);
        $unidadesReq = $request->input('unidades');

        $unidadesMap = DB::table('unidades')->select('id', 'numero_eco')->get()->keyBy('numero_eco');

        $conductoresMap = DB::table('conductores')
            ->select('tarjeton', DB::raw("CONCAT(nombres, ' ', apellidos) AS nombre"))
            ->get()
            ->keyBy(function ($c) {
                return trim($c->tarjeton);
            });

        $maniobristasMap = DB::table('maniobristas')
            ->select('tarjeton', 'nombre')
            ->get()
            ->keyBy(function ($m) {
                return trim($m->tarjeton);
            });

        $infoOperativaIds = DB::table('informacion_operativa')->pluck('id', 'unidad_id')->all();

        $unidadesProcesadasIds = [];
        $tarjetonesEnServicio = [];
        $maniobristasEnServicio = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        DB::table('conductores')->update(['estado_servicio' => 'disponible']);
        DB::table('maniobristas')->update(['estado_servicio' => 'disponible']);

        foreach ($unidadesReq as $fila) {
            $numeroEco = ltrim(trim((string) ($fila['ECONOMICO'] ?? '')), '0');
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($numeroEcoClean);
            if (!$unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";
                continue;
            }

            $unidadesProcesadasIds[] = $unidad->id;

            // Procesar Conductor
            $tarjetonVal = trim((string) ($fila['TARJETON'] ?? ''));
            $conductorNombre = '';
            if ($tarjetonVal !== '') {
                $conductorCatalog = $conductoresMap->get($tarjetonVal);
                if ($conductorCatalog) {
                    $conductorNombre = $conductorCatalog->nombre;
                    $tarjetonesEnServicio[] = $tarjetonVal;
                } else {
                    $conductorNombre = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));
                }
            }

            // Procesar Maniobrista
            $tarjetonManiobristaVal = trim((string) ($fila['TARJETON_MANIOBRISTA'] ?? ''));
            $maniobristaNombre = '';
            if ($tarjetonManiobristaVal !== '') {
                $maniobristaCatalog = $maniobristasMap->get($tarjetonManiobristaVal);
                if ($maniobristaCatalog) {
                    $maniobristaNombre = $maniobristaCatalog->nombre;
                    $maniobristasEnServicio[] = $tarjetonManiobristaVal;
                } else {
                    $maniobristaNombre = trim((string) ($fila['NOMBRE_MANIOBRISTA'] ?? ''));
                }
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_PROGRAMADA'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_PROGRAMADA'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $data = [
                'ruta'                 => (string) ($fila['RUTA'] ?? ''),
                'numero_tarjeton'      => $tarjetonVal,
                'nombre_conductor'     => $conductorNombre,
                'tarjeton_maniobrista' => $tarjetonManiobristaVal,
                'nombre_maniobrista'   => $maniobristaNombre,
                'corridas'             => $corridasVal === '' ? null : (int)$corridasVal,
                'hora_programada'      => $horaProgVal === '' ? null : $horaProgVal,
                'acople'               => $acopleVal === '' ? null : $acopleVal,
                'hora_salida'          => $horaSalidaRealVal === '' ? null : $horaSalidaRealVal,
                'tipo'                 => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus'              => trim((string) ($fila['ESTATUS'] ?? 'operacion')),
                'patio_norte'          => filter_var($fila['PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'transporte_patio_norte'=> filter_var($fila['TRANSPORTE_PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
            ];

            if ($registroId) {
                try {
                    DB::table('informacion_operativa')
                        ->where('id', $registroId)
                        ->update($data);
                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual de actualización en ID {$registroId}: " . $e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            } else {
                try {
                    $data['unidad_id'] = $unidad->id;
                    $data['estatus'] = trim((string) ($fila['ESTATUS'] ?? 'operacion'));
                    $data['fecha_registro'] = now();
                    
                    
                    DB::table('informacion_operativa')->insert($data);
                    $creados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual de creación para ECO {$numeroEcoClean}: " . $e->getMessage());
                    $errores[] = "Error al crear ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            }
        }

        if (!empty($tarjetonesEnServicio)) {
            DB::table('conductores')
                ->whereIn('tarjeton', array_unique($tarjetonesEnServicio))
                ->update(['estado_servicio' => 'en_servicio']);
        }

        if (!empty($maniobristasEnServicio)) {
            DB::table('maniobristas')
                ->whereIn('tarjeton', array_unique($maniobristasEnServicio))
                ->update(['estado_servicio' => 'en_servicio']);
        }

        try {
            $eliminados = DB::table('informacion_operativa')
                ->whereNotIn('unidad_id', $unidadesProcesadasIds)
                ->delete();
        } catch (\Exception $e) {
            \Log::error("Fallo al eliminar registros no enviados: " . $e->getMessage());
            $errores[] = "Error al eliminar registros obsoletos: " . $e->getMessage();
            $eliminados = 0;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Creados: {$creados}, Actualizados: {$actualizados}, Eliminados: {$eliminados}",
            'errores' => $errores
        ], 200);
    }

    public function actualizarManana(Request $request)
    {
        $request->validate(['unidades' => 'required|array']);
        $unidadesReq = $request->input('unidades');

        $unidadesMap = DB::table('unidades')->select('id', 'numero_eco')->get()->keyBy('numero_eco');

        $conductoresMap = DB::table('conductores')
            ->select('tarjeton', DB::raw("CONCAT(nombres, ' ', apellidos) AS nombre"))
            ->get()
            ->keyBy(function ($c) {
                return trim($c->tarjeton);
            });

        $maniobristasMap = DB::table('maniobristas')
            ->select('tarjeton', 'nombre')
            ->get()
            ->keyBy(function ($m) {
                return trim($m->tarjeton);
            });

        $infoOperativaIds = DB::table('informacion_operativa_manana')->pluck('id', 'unidad_id')->all();

        $unidadesProcesadasIds = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        foreach ($unidadesReq as $fila) {
            $numeroEco = ltrim(trim((string) ($fila['ECONOMICO'] ?? '')), '0');
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($numeroEcoClean);
            if (!$unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";
                continue;
            }

            $unidadesProcesadasIds[] = $unidad->id;

            $tarjetonVal = trim((string) ($fila['TARJETON'] ?? ''));
            $conductorNombre = '';
            if ($tarjetonVal !== '') {
                $conductorCatalog = $conductoresMap->get($tarjetonVal);
                if ($conductorCatalog) {
                    $conductorNombre = $conductorCatalog->nombre;
                } else {
                    $conductorNombre = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));
                }
            }

            $tarjetonManiobristaVal = trim((string) ($fila['TARJETON_MANIOBRISTA'] ?? ''));
            $maniobristaNombre = '';
            if ($tarjetonManiobristaVal !== '') {
                $maniobristaCatalog = $maniobristasMap->get($tarjetonManiobristaVal);
                if ($maniobristaCatalog) {
                    $maniobristaNombre = $maniobristaCatalog->nombre;
                } else {
                    $maniobristaNombre = trim((string) ($fila['NOMBRE_MANIOBRISTA'] ?? ''));
                }
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_PROGRAMADA'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $data = [
                'ruta'                 => (string) ($fila['RUTA'] ?? ''),
                'numero_tarjeton'      => $tarjetonVal,
                'nombre_conductor'     => $conductorNombre,
                'tarjeton_maniobrista' => $tarjetonManiobristaVal,
                'nombre_maniobrista'   => $maniobristaNombre,
                'corridas'             => $corridasVal === '' ? null : (int)$corridasVal,
                'hora_programada'      => $horaProgVal === '' ? null : $horaProgVal,
                'acople'               => $acopleVal === '' ? null : $acopleVal,
                'hora_salida'          => $horaSalidaRealVal === '' ? null : $horaSalidaRealVal,
                'tipo'                 => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus'              => trim((string) ($fila['ESTATUS'] ?? 'operacion')),
                'patio_norte'          => filter_var($fila['PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'transporte_patio_norte'=> filter_var($fila['TRANSPORTE_PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
            ];

            if ($registroId) {
                try {
                    DB::table('informacion_operativa_manana')
                        ->where('id', $registroId)
                        ->update($data);
                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual actualización MANANA ID {$registroId}: " . $e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            } else {
                try {
                    $data['unidad_id'] = $unidad->id;
                    $data['estatus'] = trim((string) ($fila['ESTATUS'] ?? 'operacion'));
                    $data['fecha_registro'] = now();
                    
                    DB::table('informacion_operativa_manana')->insert($data);
                    $creados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual creación MANANA ECO {$numeroEcoClean}: " . $e->getMessage());
                    $errores[] = "Error al crear ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            }
        }

        try {
            $eliminados = DB::table('informacion_operativa_manana')
                ->whereNotIn('unidad_id', $unidadesProcesadasIds)
                ->delete();
        } catch (\Exception $e) {
            \Log::error("Fallo al eliminar registros no enviados (MANANA): " . $e->getMessage());
            $errores[] = "Error al eliminar registros obsoletos: " . $e->getMessage();
            $eliminados = 0;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Creados: {$creados}, Actualizados: {$actualizados}, Eliminados: {$eliminados}",
            'errores' => $errores
        ], 200);
    }

    public function actualizarEspecifico(Request $request, $dia)
    {
        if (!in_array($dia, ['sabado', 'domingo', 'lunes', 'festivo'])) {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_' . $dia;

        $request->validate(['unidades' => 'required|array']);
        $unidadesReq = $request->input('unidades');

        $unidadesMap = DB::table('unidades')->select('id', 'numero_eco')->get()->keyBy('numero_eco');

        $conductoresMap = DB::table('conductores')
            ->select('tarjeton', DB::raw("CONCAT(nombres, ' ', apellidos) AS nombre"))
            ->get()
            ->keyBy(function ($c) {
                return trim($c->tarjeton);
            });

        $maniobristasMap = DB::table('maniobristas')
            ->select('tarjeton', 'nombre')
            ->get()
            ->keyBy(function ($m) {
                return trim($m->tarjeton);
            });

        $infoOperativaIds = DB::table($tableName)->pluck('id', 'unidad_id')->all();

        $unidadesProcesadasIds = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        foreach ($unidadesReq as $fila) {
            $numeroEco = ltrim(trim((string) ($fila['ECONOMICO'] ?? '')), '0');
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($numeroEcoClean);
            if (!$unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";
                continue;
            }

            $unidadesProcesadasIds[] = $unidad->id;

            $tarjetonVal = trim((string) ($fila['TARJETON'] ?? ''));
            $conductorNombre = '';
            if ($tarjetonVal !== '') {
                $conductorCatalog = $conductoresMap->get($tarjetonVal);
                if ($conductorCatalog) {
                    $conductorNombre = $conductorCatalog->nombre;
                } else {
                    $conductorNombre = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));
                }
            }

            $tarjetonManiobristaVal = trim((string) ($fila['TARJETON_MANIOBRISTA'] ?? ''));
            $maniobristaNombre = '';
            if ($tarjetonManiobristaVal !== '') {
                $maniobristaCatalog = $maniobristasMap->get($tarjetonManiobristaVal);
                if ($maniobristaCatalog) {
                    $maniobristaNombre = $maniobristaCatalog->nombre;
                } else {
                    $maniobristaNombre = trim((string) ($fila['NOMBRE_MANIOBRISTA'] ?? ''));
                }
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaProgVal = trim((string) ($fila['HORA_PROGRAMADA'] ?? $fila['HORA_DE_ACOPLE'] ?? ''));
            $acopleVal = trim((string) ($fila['ACOPLE'] ?? ''));
            $horaSalidaRealVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $data = [
                'ruta'                 => (string) ($fila['RUTA'] ?? ''),
                'numero_tarjeton'      => $tarjetonVal,
                'nombre_conductor'     => $conductorNombre,
                'tarjeton_maniobrista' => $tarjetonManiobristaVal,
                'nombre_maniobrista'   => $maniobristaNombre,
                'corridas'             => $corridasVal === '' ? null : (int)$corridasVal,
                'hora_programada'      => $horaProgVal === '' ? null : $horaProgVal,
                'acople'               => $acopleVal === '' ? null : $acopleVal,
                'hora_salida'          => $horaSalidaRealVal === '' ? null : $horaSalidaRealVal,
                'tipo'                 => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus'              => trim((string) ($fila['ESTATUS'] ?? 'operacion')),
                'patio_norte'          => filter_var($fila['PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'transporte_patio_norte'=> filter_var($fila['TRANSPORTE_PATIO_NORTE'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
            ];

            if ($registroId) {
                try {
                    DB::table($tableName)
                        ->where('id', $registroId)
                        ->update($data);
                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual actualización {$dia} ID {$registroId}: " . $e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            } else {
                try {
                    $data['unidad_id'] = $unidad->id;
                    $data['estatus'] = trim((string) ($fila['ESTATUS'] ?? 'operacion'));
                    $data['fecha_registro'] = now();
                    
                    DB::table($tableName)->insert($data);
                    $creados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual creación {$dia} ECO {$numeroEcoClean}: " . $e->getMessage());
                    $errores[] = "Error al crear ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            }
        }

        try {
            $eliminados = DB::table($tableName)
                ->whereNotIn('unidad_id', $unidadesProcesadasIds)
                ->delete();
        } catch (\Exception $e) {
            \Log::error("Fallo al eliminar registros no enviados ({$dia}): " . $e->getMessage());
            $errores[] = "Error al eliminar registros obsoletos: " . $e->getMessage();
            $eliminados = 0;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Creados: {$creados}, Actualizados: {$actualizados}, Eliminados: {$eliminados}",
            'errores' => $errores
        ], 200);
    }

    public function aplicarCambioDia()
    {
        try {
            DB::beginTransaction();

            $manana = DB::table('informacion_operativa_manana')->get();
            
            DB::table('informacion_operativa')->delete();

            $tarjetones = [];
            $maniobristas = [];

            foreach ($manana as $row) {
                unset($row->id);
                $arrayRow = (array)$row;
                if (array_key_exists('patio_norte', $arrayRow)) {
                    $arrayRow['patio_norte'] = $arrayRow['patio_norte'] ? 'true' : 'false';
                }
                if (array_key_exists('transporte_patio_norte', $arrayRow)) {
                    $arrayRow['transporte_patio_norte'] = $arrayRow['transporte_patio_norte'] ? 'true' : 'false';
                }
                DB::table('informacion_operativa')->insert($arrayRow);

                if (!empty($row->numero_tarjeton)) $tarjetones[] = $row->numero_tarjeton;
                if (!empty($row->tarjeton_maniobrista)) $maniobristas[] = $row->tarjeton_maniobrista;
            }

            DB::table('conductores')->update(['estado_servicio' => 'disponible']);
            DB::table('maniobristas')->update(['estado_servicio' => 'disponible']);

            if (!empty($tarjetones)) {
                DB::table('conductores')->whereIn('tarjeton', array_unique($tarjetones))->update(['estado_servicio' => 'en_servicio']);
            }
            if (!empty($maniobristas)) {
                DB::table('maniobristas')->whereIn('tarjeton', array_unique($maniobristas))->update(['estado_servicio' => 'en_servicio']);
            }

            DB::table('informacion_operativa_manana')->delete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Cambio de día aplicado exitosamente'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Error al aplicar el cambio de dia: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Error al hacer el cambio de día'
            ], 500);
        }
    }

    public function aplicarCambioDiaEspecifico($dia)
    {
        if (!in_array($dia, ['sabado', 'domingo', 'lunes', 'festivo'])) {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_' . $dia;

        try {
            DB::beginTransaction();

            $registros = DB::table($tableName)->get();
            DB::table('informacion_operativa')->delete();

            foreach ($registros as $reg) {
                unset($reg->id);
                $arrayRow = (array)$reg;
                if (array_key_exists('patio_norte', $arrayRow)) {
                    $arrayRow['patio_norte'] = $arrayRow['patio_norte'] ? 'true' : 'false';
                }
                if (array_key_exists('transporte_patio_norte', $arrayRow)) {
                    $arrayRow['transporte_patio_norte'] = $arrayRow['transporte_patio_norte'] ? 'true' : 'false';
                }
                DB::table('informacion_operativa')->insert($arrayRow);
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
            
            if (!empty($conductoresAsignados)) {
                DB::table('conductores')->whereIn('tarjeton', $conductoresAsignados)->update(['estado_servicio' => 'en_servicio']);
            }

            $maniobristasAsignados = DB::table('informacion_operativa')
                ->whereNotNull('tarjeton_maniobrista')
                ->where('tarjeton_maniobrista', '!=', '')
                ->pluck('tarjeton_maniobrista')
                ->toArray();
            
            if (!empty($maniobristasAsignados)) {
                DB::table('maniobristas')->whereIn('tarjeton', $maniobristasAsignados)->update(['estado_servicio' => 'en_servicio']);
            }

            DB::commit();
            return response()->json(['status' => 'success', 'message' => "Cambio de día aplicado desde {$dia}."], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Fallo al aplicar cambio de día desde {$dia}: " . $e->getMessage());
            return response()->json(['error' => 'Error al aplicar el cambio de día.', 'detalle' => $e->getMessage()], 500);
        }
    }

    public function actualizarAdicionales(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'falla' => 'nullable|string|max:50',
            'corridas' => 'nullable|integer',
            'ciclo' => 'nullable|string|max:10',
            'motivo' => 'nullable|string|max:50'
        ]);

        $tipoNormalizado = strtolower(trim($request->tipo));


        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);
        $fechaHoy = Carbon::today()->toDateString();
        $fechaHoy = Carbon::today()->toDateString();

        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select('informacion_operativa.id', 'informacion_operativa.numero_tarjeton', 'informacion_operativa.motivo')
            ->first();

        if (!$registro) {
            return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada en la operación de hoy'], 404);
        }

        $updateData = [];
        if ($request->has('falla')) $updateData['falla'] = $request->falla;
        if ($request->has('corridas')) $updateData['corridas'] = $request->corridas;
        if ($request->has('ciclo')) $updateData['ciclo'] = $request->ciclo;
        if ($request->has('motivo')) $updateData['motivo'] = $request->motivo;

        $actualizado = false;
        if (!empty($updateData)) {
            $actualizado = DB::table('informacion_operativa')
                ->where('id', $registro->id)
                ->update($updateData);

            // Logica para sumar o restar faltas si el motivo cambia a/desde "Falta de Operador"
            if ($request->has('motivo') && $registro->numero_tarjeton) {
                $oldMotivo = $registro->motivo;
                $newMotivo = $request->motivo;
                
                if ($newMotivo === 'Falta de Operador' && $oldMotivo !== 'Falta de Operador') {
                    // Agregar falta al conductor
                    DB::table('conductores')->where('tarjeton', $registro->numero_tarjeton)->increment('faltas');
                } elseif ($oldMotivo === 'Falta de Operador' && $newMotivo !== 'Falta de Operador') {
                    // Quitar falta si se equivocaron
                    DB::table('conductores')->where('tarjeton', $registro->numero_tarjeton)->where('faltas', '>', 0)->decrement('faltas');
                }
            }
        }

        if ($actualizado !== false) {
            return response()->json(['status' => 'success', 'message' => 'Datos adicionales guardados'], 200);
        }

        return response()->json(['status' => 'error', 'message' => 'No se pudo actualizar'], 500);
    }

    /**
     * Actualiza el tarjetón de una unidad y asigna automáticamente al conductor del catálogo
     */
    public function actualizarTarjeton(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'tarjeton' => 'required|string'
        ]);

        $tipoNormalizado = strtolower(trim($request->tipo));


        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);
        $tarjetonLimpio = trim($request->tarjeton);

        $conductor = DB::table('conductores')
            ->where('tarjeton', $tarjetonLimpio)
            ->first();

        if (!$conductor) {
            return response()->json([
                'status' => 'error',
                'message' => "El tarjetón {$tarjetonLimpio} no está registrado en el catálogo de conductores."
            ], 422);
        }

        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select('informacion_operativa.id', 'informacion_operativa.numero_tarjeton', 'informacion_operativa.nombre_conductor', 'informacion_operativa.unidad_id')
            ->first();

        if (!$registro) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en la operación.'
            ], 404);
        }

        // Desasignar conductor de otra unidad si estaba asignado
        DB::table('informacion_operativa')
            ->where('numero_tarjeton', $tarjetonLimpio)
            ->where('id', '!=', $registro->id)
            ->update([
                'numero_tarjeton' => null,
                'nombre_conductor' => null
            ]);

        DB::table('informacion_operativa')
            ->where('id', $registro->id)
            ->update([
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $conductor->nombre
            ]);

        if ($registro->numero_tarjeton && $registro->numero_tarjeton !== $tarjetonLimpio) {
            DB::table('conductores')
                ->where('tarjeton', $registro->numero_tarjeton)
                ->update(['estado_servicio' => 'disponible']);
        }

        DB::table('conductores')
            ->where('tarjeton', $tarjetonLimpio)
            ->update(['estado_servicio' => 'en_servicio']);

        return response()->json([
            'status' => 'success',
            'message' => 'Tarjetón y conductor asignados correctamente.',
            'tarjeton' => $tarjetonLimpio,
            'conductor' => $conductor->nombre
        ], 200);
    }

    /**
     * Actualiza la hora programada y el acople de una unidad en el día actual
     */
    public function actualizarHoras(Request $request)
    {
        $request->validate([
            'tipo' => 'required|string',
            'numero_eco' => 'required|string',
            'hora_programada' => 'nullable|string',
            'acople' => 'nullable|string',
            'hora_salida' => 'nullable|string',
            'observaciones' => 'nullable|string|max:150'
        ]);

        $tipoNormalizado = strtolower(trim($request->tipo));
        $numeroEcoClean = str_pad(trim($request->numero_eco), 3, '0', STR_PAD_LEFT);

        try {
            return DB::transaction(function () use ($request, $tipoNormalizado, $numeroEcoClean) {
                // Primero obtenemos la unidad
                $unidad = DB::table('unidades')->where('numero_eco', $numeroEcoClean)->first();
                if (!$unidad) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Unidad no encontrada'
                    ], 404);
                }

                // Ahora obtenemos el registro operativo con bloqueo para evitar concurrencia
                $registro = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidad->id)
                    ->whereRaw('LOWER(tipo) = ?', [$tipoNormalizado])
                    ->lockForUpdate()
                    ->first();

                if (!$registro) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Unidad no encontrada en el registro operativo'
                    ], 404);
                }

                // Verificación de concurrencia para la validación de salida
                if ($request->has('hora_salida') && !empty($request->hora_salida)) {
                    if (!empty($registro->hora_salida)) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Esta unidad ya fue validada por otro usuario (Concurrencia).'
                        ], 422);
                    }
                }

                $updateData = [
                    'hora_programada' => $request->hora_programada,
                    'acople' => $request->acople
                ];

                if ($request->has('hora_salida')) {
                    $updateData['hora_salida'] = $request->hora_salida;
                }

                if ($request->has('observaciones')) {
                    $updateData['observaciones'] = $request->observaciones;
                }

                DB::table('informacion_operativa')
                    ->where('id', $registro->id)
                    ->update($updateData);

                // Registrar acción en la bitácora de cambios
                \App\Helpers\BitacoraHelper::registrarCambio(
                    $registro->unidad_id,
                    'CAMBIO_HORAS',
                    "ACTUALIZÓ HORA PROGRAMADA (ANTERIOR: " . ($registro->hora_programada ?? 'SIN ASIGNAR') . ", NUEVA: " . ($request->hora_programada ?? 'SIN ASIGNAR') . ") Y ACOPLE (ANTERIOR: " . ($registro->acople ?? 'SIN ASIGNAR') . ", NUEVA: " . ($request->acople ?? 'SIN ASIGNAR') . ")"
                );

                return response()->json([
                    'status' => 'success',
                    'message' => 'Horas actualizadas exitosamente',
                    'hora_programada' => $request->hora_programada,
                    'acople' => $request->acople,
                    'hora_salida' => $request->hora_salida ?? null
                ], 200);
            });
        } catch (\Exception $e) {
            \Log::error('Error en actualizarHoras: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Error al actualizar las horas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtiene todos los registros de información operativa del día actual,
     * formateados para la tabla de vista previa del Capturista.
     */
    public function obtenerDatosHoy()
    {
        $registros = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.tipo',
                'informacion_operativa.ruta',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.tarjeton_maniobrista',
                'informacion_operativa.nombre_maniobrista',
                'informacion_operativa.estatus',
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
                'informacion_operativa.ciclo',
                'informacion_operativa.motivo',
                'informacion_operativa.motivo_estatus',
                'informacion_operativa.folio_mantenimiento',
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.firma_base64',
                'informacion_operativa.hora_programada',
                'informacion_operativa.acople',
                'informacion_operativa.hora_salida',
                'informacion_operativa.patio_norte'
                'informacion_operativa.hora_salida',
                'informacion_operativa.patio_norte'
            )
            ->orderBy('informacion_operativa.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'FOLIO_MANTENIMIENTO' => $reg->folio_mantenimiento,
                'FECHA_FOLIO_MANTENIMIENTO' => $reg->fecha_folio_mantenimiento,
                'FALLA_REPORTADA' => $reg->falla_reportada,
                'DIAGNOSTICO' => $reg->diagnostico,
                'FIRMA_BASE64' => $reg->firma_base64,
                'HORA_DE_ACOPLE' => $reg->hora_programada,
                'HORA_PROGRAMADA' => $reg->hora_programada,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_salida,
                'PATIO_NORTE' => (bool)$reg->patio_norte
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosManana()
    {
        // Si la tabla de mañana está vacía, la inicializamos con la programación actual
        if (DB::table('informacion_operativa_manana')->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            $targetCols = array_flip(\Illuminate\Support\Facades\Schema::getColumnListing('informacion_operativa_manana'));
            foreach ($hoy as $row) {
                unset($row->id);
                $arrayRow = (array)$row;
                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte'])) {
                            $insertRow[$key] = $val ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }
                DB::table('informacion_operativa_manana')->insert($insertRow);
            }
        }

        $registros = DB::table('informacion_operativa_manana')
            ->join('unidades', 'informacion_operativa_manana.unidad_id', '=', 'unidades.id')
            ->select(
                'unidades.numero_eco',
                'informacion_operativa_manana.tipo',
                'informacion_operativa_manana.ruta',
                'informacion_operativa_manana.numero_tarjeton as tarjeton',
                'informacion_operativa_manana.nombre_conductor',
                'informacion_operativa_manana.tarjeton_maniobrista',
                'informacion_operativa_manana.nombre_maniobrista',
                'informacion_operativa_manana.estatus',
                'informacion_operativa_manana.falla',
                'informacion_operativa_manana.corridas',
                'informacion_operativa_manana.ciclo',
                'informacion_operativa_manana.motivo',
                'informacion_operativa_manana.motivo_estatus',
                'informacion_operativa_manana.hora_programada',
                'informacion_operativa_manana.acople',
                'informacion_operativa_manana.hora_salida',
                'informacion_operativa_manana.patio_norte'
                'informacion_operativa_manana.hora_salida',
                'informacion_operativa_manana.patio_norte'
            )
            ->orderBy('informacion_operativa_manana.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_programada,
                'HORA_PROGRAMADA' => $reg->hora_programada,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_salida,
                'PATIO_NORTE' => (bool)$reg->patio_norte
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosEspecifico($dia)
    {
        if (!in_array($dia, ['sabado', 'domingo', 'lunes', 'festivo'])) {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_' . $dia;

        // Inicializamos con la programación actual si está vacía
        if (DB::table($tableName)->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            $targetCols = array_flip(\Illuminate\Support\Facades\Schema::getColumnListing($tableName));
            foreach ($hoy as $row) {
                unset($row->id);
                $arrayRow = (array)$row;
                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte'])) {
                            $insertRow[$key] = $val ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }
                DB::table($tableName)->insert($insertRow);
            }
        }

        $registros = DB::table($tableName)
            ->join('unidades', "{$tableName}.unidad_id", '=', 'unidades.id')
            ->select(
                'unidades.numero_eco',
                "{$tableName}.tipo",
                "{$tableName}.ruta",
                "{$tableName}.numero_tarjeton as tarjeton",
                "{$tableName}.nombre_conductor",
                "{$tableName}.tarjeton_maniobrista",
                "{$tableName}.nombre_maniobrista",
                "{$tableName}.estatus",
                "{$tableName}.falla",
                "{$tableName}.corridas",
                "{$tableName}.ciclo",
                "{$tableName}.motivo",
                "{$tableName}.motivo_estatus",
                "{$tableName}.hora_programada",
                "{$tableName}.acople",
                "{$tableName}.hora_salida",
                "{$tableName}.patio_norte"
                "{$tableName}.hora_salida",
                "{$tableName}.patio_norte"
            )
            ->orderBy("{$tableName}.tipo")
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_programada,
                'HORA_PROGRAMADA' => $reg->hora_programada,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_salida,
                'PATIO_NORTE' => (bool)$reg->patio_norte
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosMananaDuplicado()
    {
        // Si la tabla de mañana está vacía, la inicializamos con la programación actual
        if (DB::table('informacion_operativa_manana')->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            $targetCols = array_flip(\Illuminate\Support\Facades\Schema::getColumnListing('informacion_operativa_manana'));
            foreach ($hoy as $row) {
                unset($row->id);
                $arrayRow = (array)$row;
                $insertRow = [];
                foreach ($arrayRow as $key => $val) {
                    if (isset($targetCols[$key])) {
                        if (in_array($key, ['patio_norte', 'transporte_patio_norte'])) {
                            $insertRow[$key] = $val ? 'true' : 'false';
                        } else {
                            $insertRow[$key] = $val;
                        }
                    }
                }
                DB::table('informacion_operativa_manana')->insert($insertRow);
            }
        }

        $registros = DB::table('informacion_operativa_manana')
            ->join('unidades', 'informacion_operativa_manana.unidad_id', '=', 'unidades.id')
            ->select(
                'unidades.numero_eco',
                'informacion_operativa_manana.tipo',
                'informacion_operativa_manana.ruta',
                'informacion_operativa_manana.numero_tarjeton as tarjeton',
                'informacion_operativa_manana.nombre_conductor',
                'informacion_operativa_manana.tarjeton_maniobrista',
                'informacion_operativa_manana.nombre_maniobrista',
                'informacion_operativa_manana.estatus',
                'informacion_operativa_manana.falla',
                'informacion_operativa_manana.corridas',
                'informacion_operativa_manana.ciclo',
                'informacion_operativa_manana.motivo',
                'informacion_operativa_manana.motivo_estatus',
                'informacion_operativa_manana.hora_programada',
                'informacion_operativa_manana.acople',
                'informacion_operativa_manana.hora_salida',
                'informacion_operativa_manana.patio_norte'
            )
            ->orderBy('informacion_operativa_manana.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_programada,
                'HORA_PROGRAMADA' => $reg->hora_programada,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_salida,
                'PATIO_NORTE' => filter_var($reg->patio_norte, FILTER_VALIDATE_BOOLEAN)
            ];
        });

        return response()->json($formateados, 200);
    }

    public function obtenerDatosEspecificoDuplicado($dia)
    {
        if (!in_array($dia, ['sabado', 'domingo', 'lunes', 'festivo'])) {
            return response()->json(['error' => 'Día no válido'], 400);
        }
        $tableName = 'informacion_operativa_' . $dia;

        // Inicializamos con la programación actual si está vacía
        if (DB::table($tableName)->count() === 0) {
            $hoy = DB::table('informacion_operativa')->get();
            foreach ($hoy as $row) {
                unset($row->id);
                DB::table($tableName)->insert((array)$row);
            }
        }

        $registros = DB::table($tableName)
            ->join('unidades', "{$tableName}.unidad_id", '=', 'unidades.id')
            ->select(
                'unidades.numero_eco',
                "{$tableName}.tipo",
                "{$tableName}.ruta",
                "{$tableName}.numero_tarjeton as tarjeton",
                "{$tableName}.nombre_conductor",
                "{$tableName}.tarjeton_maniobrista",
                "{$tableName}.nombre_maniobrista",
                "{$tableName}.estatus",
                "{$tableName}.falla",
                "{$tableName}.corridas",
                "{$tableName}.ciclo",
                "{$tableName}.motivo",
                "{$tableName}.motivo_estatus",
                "{$tableName}.hora_programada",
                "{$tableName}.acople",
                "{$tableName}.hora_salida",
                "{$tableName}.patio_norte"
            )
            ->orderBy("{$tableName}.tipo")
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'TARJETON_MANIOBRISTA' => $reg->tarjeton_maniobrista,
                'NOMBRE_MANIOBRISTA' => $reg->nombre_maniobrista,
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_programada,
                'HORA_PROGRAMADA' => $reg->hora_programada,
                'ACOPLE' => $reg->acople,
                'HORA_SALIDA' => $reg->hora_salida,
                'PATIO_NORTE' => filter_var($reg->patio_norte, FILTER_VALIDATE_BOOLEAN)

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
        \App\Helpers\BitacoraHelper::ensureInicioSnapshot();

        $columns = [
            'unidades.numero_eco',
            'historial_operativo.tipo',
            'historial_operativo.ruta',
            'historial_operativo.numero_tarjeton as tarjeton',
            'historial_operativo.nombre_conductor',
            'historial_operativo.estatus',
            'historial_operativo.falla',
            'historial_operativo.corridas',
            'historial_operativo.ciclo',
            'historial_operativo.motivo',
            'historial_operativo.motivo_estatus'
        ];

        $hasManiobrista = \Illuminate\Support\Facades\Schema::hasColumn('historial_operativo', 'tarjeton_maniobrista');
        if ($hasManiobrista) {
            $columns[] = 'historial_operativo.tarjeton_maniobrista';
            $columns[] = 'historial_operativo.nombre_maniobrista';
        }

        $hasHoraProgramada = \Illuminate\Support\Facades\Schema::hasColumn('historial_operativo', 'hora_programada');
        if ($hasHoraProgramada) {
            $columns[] = 'historial_operativo.hora_programada';
        }

        $hasAcople = \Illuminate\Support\Facades\Schema::hasColumn('historial_operativo', 'acople');
        if ($hasAcople) {
            $columns[] = 'historial_operativo.acople';
        }

        $hasHoraSalida = \Illuminate\Support\Facades\Schema::hasColumn('historial_operativo', 'hora_salida');
        if ($hasHoraSalida) {
            $columns[] = 'historial_operativo.hora_salida';
        }

        $registros = DB::table('historial_operativo')
            ->join('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
            ->where('fecha_historial', $fechaHoy)
            ->where('momento', 'INICIO')
            ->select($columns)
            ->orderBy('historial_operativo.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) use ($hasManiobrista, $hasHoraProgramada, $hasAcople, $hasHoraSalida) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
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
                'HORA_DE_ACOPLE' => $hasHoraProgramada ? $reg->hora_programada : '',
                'HORA_PROGRAMADA' => $hasHoraProgramada ? $reg->hora_programada : '',
                'ACOPLE' => $hasAcople ? $reg->acople : '',
                'HORA_SALIDA' => $hasHoraSalida ? $reg->hora_salida : ''
            ];
        });

        return response()->json($formateados, 200);
    }

    public function validarDespacho(Request $request)
    {
        $request->validate([
            'tipo' => 'required',
            'numero_eco' => 'required'
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));

        try {
            return DB::transaction(function () use ($numeroEco, $tipoNormalizado, $request) {
                $unidad = DB::table('unidades')->where('numero_eco', $numeroEco)->first();

                if (!$unidad) {
                    return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada'], 404);
                }

                $registroOperativo = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidad->id)
                    ->whereRaw('LOWER(tipo) = ?', [$tipoNormalizado])
                    ->lockForUpdate()
                    ->first();

                if (!$registroOperativo) {
                    return response()->json(['status' => 'error', 'message' => 'Sin registro operativo'], 404);
                }

                if ($registroOperativo->hora_salida !== null && $registroOperativo->hora_salida !== '') {
                    return response()->json(['status' => 'error', 'message' => 'Esta unidad ya fue validada por otro usuario (Concurrencia).'], 422);
                }

                $updateData = [];
                if ($request->has('ruta')) $updateData['ruta'] = $request->ruta;
                if ($request->has('tarjeton')) $updateData['numero_tarjeton'] = $request->tarjeton;
                if ($request->has('conductor')) $updateData['nombre_conductor'] = $request->conductor;
                if ($request->has('hora_programada')) $updateData['hora_programada'] = $request->hora_programada;
                if ($request->has('acople')) $updateData['acople'] = $request->acople;
                if ($request->has('ciclo')) $updateData['ciclo'] = $request->ciclo;
                if ($request->has('motivo')) $updateData['motivo'] = $request->motivo;
                if ($request->has('falla')) $updateData['falla'] = $request->falla;
                if ($request->has('hora_salida')) $updateData['hora_salida'] = $request->hora_salida;

                DB::table('informacion_operativa')
                    ->where('id', $registroOperativo->id)
                    ->update($updateData);

                \App\Helpers\BitacoraHelper::registrarCambio(
                    $unidad->id,
                    'VALIDAR_DESPACHO',
                    "UNIDAD VALIDADA Y DESPACHADA."
                );

                return response()->json([
                    'status' => 'success',
                    'message' => 'Despacho validado exitosamente',
                    'hora_salida' => $request->hora_salida,
                    'ruta' => $request->ruta,
                    'tarjeton' => $request->tarjeton,
                    'conductor' => $request->conductor
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Error en validarDespacho: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Error al validar: ' . $e->getMessage()], 500);
        }
    }


    /**
     * Cambia el estatus operativo de una unidad (para el rol Encierro).
     */
    public function cambiarEstatus(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('cambiarEstatus request data', $request->all());

        $request->validate([
            'numero_eco' => 'required',
            'tipo' => 'required',
            'estatus' => 'required|in:operacion,mantenimiento,reserva,percance',
            'motivo_estatus' => 'nullable|string',
            'cambio_unidad_activo' => 'nullable|boolean',
            'eco_reemplazo' => 'nullable|string',
            'tarjeton_reemplazo' => 'nullable|string',
            'ruta_reemplazo' => 'nullable',
            'corrida_reemplazo' => 'nullable'
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));


        $nuevoEstatus = strtolower(trim($request->estatus));
        $motivoEstatus = $request->motivo_estatus;
        $cambioUnidadActivo = $request->input('cambio_unidad_activo') == 1 || $request->input('cambio_unidad_activo') === true;
        $cambioUnidadActivo = $request->input('cambio_unidad_activo') == 1 || $request->input('cambio_unidad_activo') === true;

        $unidad = DB::table('unidades')
            ->where('numero_eco', $numeroEco)
            ->first();

        if (!$unidad) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en el catálogo.'
            ], 404);
        }

        $registroOperativo = DB::table('informacion_operativa')
            ->where('unidad_id', $unidad->id)
            ->whereRaw('LOWER(tipo) = ?', [$tipoNormalizado])
            ->first();

        if (!$registroOperativo) {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta unidad no tiene registro operativo.'
            ], 404);
        }

        $updateData = [
            'estatus' => $nuevoEstatus,
            'motivo_estatus' => $motivoEstatus
        ];

        if ($request->has('folio_mantenimiento')) {
            $folioReq = trim($request->folio_mantenimiento);
            if (!empty($folioReq)) {
                $existe = DB::table('informacion_operativa')
                    ->where('folio_mantenimiento', $folioReq)
                    ->where('id', '!=', $registroOperativo->id)
                    ->exists();
                
                if ($existe) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "El número de incidencia '$folioReq' ya está siendo usado por otra unidad. Por favor verifica."
                    ], 400);
                }
            }
            $updateData['folio_mantenimiento'] = $folioReq;
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

        if ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento' || $nuevoEstatus === 'percance') {
            $updateData['nombre_conductor'] = null;
            $updateData['numero_tarjeton'] = null;
            $updateData['ruta'] = null;
            $updateData['corridas'] = null;
            $updateData['ciclo'] = null;
            $updateData['falla'] = null;
            $updateData['motivo'] = null;

            if ($registroOperativo->numero_tarjeton) {
                DB::table('conductores')
                    ->where('tarjeton', $registroOperativo->numero_tarjeton)
                    ->update(['estado_servicio' => 'disponible']);
            }
        } else {
            $allInputs = $request->all();
            if (array_key_exists('nombre_conductor', $allInputs)) {
                $updateData['nombre_conductor'] = $request->nombre_conductor;
            }
            if (array_key_exists('numero_tarjeton', $allInputs)) {
                $tarjetonLimpio = trim((string)$request->numero_tarjeton);
                $updateData['numero_tarjeton'] = $tarjetonLimpio;
                
                
                if ($tarjetonLimpio) {
                    DB::table('informacion_operativa')
                        ->where('numero_tarjeton', $tarjetonLimpio)
                        ->where('id', '!=', $registroOperativo->id)
                        ->update([
                            'numero_tarjeton' => null,
                            'nombre_conductor' => null
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

        DB::table('informacion_operativa')
            ->where('id', $registroOperativo->id)
            ->update($updateData);

        // Registrar acción en la bitácora de cambios para la unidad original
        BitacoraHelper::registrarCambio(
            $unidad->id,
            'CAMBIO_ESTATUS',
            ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento' || $nuevoEstatus === 'percance')
                ? "CAMBIO DE ESTATUS DE " . strtoupper($registroOperativo->estatus ?? '') . " A " . strtoupper($nuevoEstatus) . ($motivoEstatus ? " POR MOTIVO: " . strtoupper($motivoEstatus) : "") . ($cambioUnidadActivo ? " (UNIDAD REEMPLAZADA)" : "")
                : "CAMBIO DE ESTATUS DE " . strtoupper($registroOperativo->estatus ?? '') . " A " . strtoupper($nuevoEstatus),
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

            $unidadReemplazo = DB::table('unidades')->where('numero_eco', $ecoReemplazo)->first();
            
            if ($unidadReemplazo) {
                $conductorReemplazo = DB::table('conductores')->where('tarjeton', $tarjetonReemplazo)->first();
                $nombreConductorReemplazo = $conductorReemplazo ? trim(($conductorReemplazo->nombres ?? '') . ' ' . ($conductorReemplazo->apellidos ?? '')) : null;

                // Desasignar cualquier otra unidad que tenga este tarjetón
                if ($tarjetonReemplazo) {
                    DB::table('informacion_operativa')
                        ->where('numero_tarjeton', $tarjetonReemplazo)
                        ->update([
                            'numero_tarjeton' => null,
                            'nombre_conductor' => null
                        ]);
                        
                    DB::table('conductores')
                        ->where('tarjeton', $tarjetonReemplazo)
                        ->update(['estado_servicio' => 'en_servicio']);
                }

                $registroReemplazo = DB::table('informacion_operativa')
                    ->where('unidad_id', $unidadReemplazo->id)
                    ->whereRaw('LOWER(tipo) = ?', [$tipoNormalizado])
                    ->first();

                $reemplazoData = [
                    'estatus' => 'operacion',
                    'numero_tarjeton' => $tarjetonReemplazo,
                    'nombre_conductor' => $nombreConductorReemplazo,
                    'ruta' => $rutaReemplazo,
                    'corridas' => $corridaReemplazo === '' ? null : (int)$corridaReemplazo,
                    'motivo_estatus' => null,
                    'falla' => null
                ];

                if ($registroReemplazo) {
                    DB::table('informacion_operativa')
                        ->where('id', $registroReemplazo->id)
                        ->update($reemplazoData);
                } else {
                    $reemplazoData['unidad_id'] = $unidadReemplazo->id;
                    $reemplazoData['tipo'] = strtolower($tipoNormalizado);
                    $reemplazoData['fecha_registro'] = now();
                    DB::table('informacion_operativa')->insert($reemplazoData);
                }

                BitacoraHelper::registrarCambio(
                    $unidadReemplazo->id,
                    'CAMBIO_UNIDAD_REEMPLAZO',
                    "UNIDAD ASIGNADA COMO REEMPLAZO DE ECO " . $unidad->numero_eco . " - CONDUCTOR: " . strtoupper($nombreConductorReemplazo) . ", RUTA: " . strtoupper($rutaReemplazo),
                    $registroReemplazo->estatus ?? 'reserva',
                    'operacion'
                );

                $conductorAsignado = $nombreConductorReemplazo;
                $rutaAsignada = $rutaReemplazo;
                $tarjetonAsignado = $tarjetonReemplazo;
            }
        }



        return response()->json([
            'status' => 'success',
            'message' => 'Estatus actualizado correctamente.',
            'estatus' => $nuevoEstatus,
            'conductor_asignado' => $conductorAsignado,
            'ruta_asignada' => $rutaAsignada,
            'tarjeton' => $tarjetonAsignado,
            'corridas' => $request->corrida
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
            'alimentadoras' => $alimentadoras
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
            'ruta' => 'required|string'
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

        if (!$operacion) {
            return response()->json([
                'status' => 'error',
                'message' => 'No hay registro de operación para esta unidad.'
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
            "CAMBIO DE RUTA - ANTERIOR: " . strtoupper($operacion->ruta ?? 'SIN RUTA') . ", NUEVA: " . strtoupper($rutaLimpia)
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Ruta actualizada correctamente.'
        ], 200);
    }

    /**
     * Obtiene el catálogo de todas las unidades (id, número_eco, tipo).
     */
    public function obtenerCatalogoUnidades()
    {
        $unidades = DB::table('unidades')
            ->select('id', 'numero_eco', 'tipo')
            ->orderBy('numero_eco')
            ->get();
        return response()->json($unidades, 200);
    }

    public function obtenerPendientesMantenimiento()
    {
        $unidades = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('informacion_operativa.estatus', 'mantenimiento')
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.tipo',
                'informacion_operativa.folio_mantenimiento',
                'informacion_operativa.falla_reportada',
                'informacion_operativa.diagnostico',
                'informacion_operativa.motivo_estatus',
                'informacion_operativa.fecha_folio_mantenimiento',
                'informacion_operativa.fecha_registro'
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
            if (!$unidad) {
                return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada'], 404);
            }

            // 2. Encontrar el registro operativo activo (en mantenimiento, reserva, percance, etc.)
            $registroOperativo = DB::table('informacion_operativa')
                ->where('unidad_id', $unidad->id)
                ->first();

            if (!$registroOperativo) {
                return response()->json(['status' => 'error', 'message' => 'No hay registro operativo para esta unidad'], 404);
            }

            if ($registroOperativo->folio_mantenimiento && strpos($registroOperativo->folio_mantenimiento, 'MANT-') === 0) {
                return response()->json(['status' => 'error', 'message' => 'La unidad ya tiene un folio de mantenimiento asignado'], 400);
            }

            // 3. Generar el folio (MANT-{ID}-ECO{ECO})
            // Si ya hay un número en folio_mantenimiento, ese es el ID de incidencia ingresado manualmente
            $incidencia = $registroOperativo->folio_mantenimiento ?: $registroOperativo->id;
            $folio = "MANT-" . $incidencia . "-ECO" . $numeroEco;
            $fechaActual = now()->toDateTimeString();

            // 4. Actualizar tabla informacion_operativa
            DB::table('informacion_operativa')
                ->where('id', $registroOperativo->id)
                ->update([
                    'folio_mantenimiento' => $folio,
                    'fecha_folio_mantenimiento' => $fechaActual
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
                'fecha_folio' => $fechaActual
            ], 200);

        } catch (\Exception $e) {
            \Log::error('[generarFolioMantenimiento] Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Error al generar el folio de mantenimiento'
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

            if (!$unidad) {
                \Log::error('[guardarMantenimiento] Unidad NO encontrada', ['eco' => $numeroEcoClean]);
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unidad no encontrada en la base de datos.'
                ], 404);
            }

            DB::table('unidades')
                ->where('id', $unidad->id)
                ->update([
                    'nivel_combustible'  => $request->nivel_combustible === '' ? null : $request->nivel_combustible,
                    'litros_combustible' => $request->litros_combustible === '' ? null : $request->litros_combustible,
                    'nivel_adblue'       => $request->nivel_adblue === '' ? null : $request->nivel_adblue,
                    'litros_adblue'      => $request->litros_adblue === '' ? null : $request->litros_adblue,
                    'numero_cincho'      => $request->numero_cincho === '' ? null : $request->numero_cincho,
                    'numero_cincho_adblue' => $request->numero_cincho_adblue === '' ? null : $request->numero_cincho_adblue,
                    'fecha_ultima_carga' => $request->fecha_ultima_carga === '' ? null : $request->fecha_ultima_carga,
                    'kilometraje'        => $request->kilometraje === '' ? null : $request->kilometraje,
                    'odometro'           => $request->odometro === '' ? null : $request->odometro,
                ]);

            DB::table('historial_mantenimiento')->insert([
                'unidad_id'          => $unidad->id,
                'tipo_vehiculo'      => $tipoNormalizado,
                'nivel_combustible'  => $request->nivel_combustible === '' ? null : $request->nivel_combustible,
                'litros_combustible' => $request->litros_combustible === '' ? null : $request->litros_combustible,
                'nivel_adblue'       => $request->nivel_adblue === '' ? null : $request->nivel_adblue,
                'litros_adblue'      => $request->litros_adblue === '' ? null : $request->litros_adblue,
                'numero_cincho'      => $request->numero_cincho === '' ? null : $request->numero_cincho,
                'numero_cincho_adblue' => $request->numero_cincho_adblue === '' ? null : $request->numero_cincho_adblue,
                'fecha_ultima_carga' => $request->fecha_ultima_carga === '' ? null : $request->fecha_ultima_carga,
                'kilometraje'        => $request->kilometraje === '' ? null : $request->kilometraje,
                'odometro'           => $request->odometro === '' ? null : $request->odometro,
                'fecha_registro'     => now(),
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);

            \Log::info('[guardarMantenimiento] Guardado exitosamente', ['id' => $unidad->id]);

            return response()->json([
                'status' => 'success',
                'message' => 'Información de mantenimiento guardada correctamente.'
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
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

        if (!$unidad) {
            return response()->json([
                'status'             => 'success',
                'nivel_combustible'  => null,
                'litros_combustible' => null,
                'nivel_adblue'       => null,
                'litros_adblue'      => null,
                'numero_cincho'      => null,
                'numero_cincho_adblue' => null,
                'fecha_ultima_carga' => null,
                'kilometraje'        => null,
                'odometro'           => null,
            ], 200);
        }

        return response()->json([
            'status'             => 'success',
            'nivel_combustible'  => $unidad->nivel_combustible,
            'litros_combustible' => $unidad->litros_combustible ?? null,
            'nivel_adblue'       => $unidad->nivel_adblue,
            'litros_adblue'      => $unidad->litros_adblue ?? null,
            'numero_cincho'      => $unidad->numero_cincho,
            'numero_cincho_adblue' => $unidad->numero_cincho_adblue,
            'fecha_ultima_carga' => $unidad->fecha_ultima_carga,
            'kilometraje'        => $unidad->kilometraje,
            'odometro'           => $unidad->odometro,
        ], 200);
    }

    /**
     * Obtiene todas las unidades de un tipo específico que están asignadas a una ruta determinada,
     * para el día actual.
     */
    public function unidadesPorRuta($tipo, $ruta)
    {
        $tipoNormalizado = strtolower(trim($tipo));


        $rutaLimpia = trim($ruta);

        $unidades = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->where('informacion_operativa.ruta', $rutaLimpia)
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.estatus',
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.hora_programada',
                'informacion_operativa.acople',
                'informacion_operativa.hora_salida'
            )
            ->distinct()
            ->orderBy('unidades.numero_eco')
            ->get()
            ->map(function ($unidad) {
                $estatus = strtolower(trim($unidad->estatus ?? 'operacion'));
                if (!in_array($estatus, ['operacion', 'mantenimiento', 'reserva'], true)) {
                    $estatus = 'operacion';
                }
                return [
                    'numero_eco'       => $unidad->numero_eco,
                    'tarjeton'         => $unidad->tarjeton,
                    'estatus'          => $estatus,
                    'ruta'             => $unidad->ruta,
                    'nombre_conductor' => $unidad->nombre_conductor,
                    'hora_programada'  => $unidad->hora_programada,
                    'acople'           => $unidad->acople,
                    'hora_salida'      => $unidad->hora_salida,
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
            $today = \Carbon\Carbon::today()->toDateString();
            $unidades = DB::table('unidades')->get();
            $informacion = DB::table('informacion_operativa')->get()->keyBy('unidad_id');
            $transportes = DB::table('transportes')->get()->keyBy('id');

            $reporte = [];
            $tipos = ['urbanuss', 'zafiro', 'urvan', 'orion'];

            foreach ($tipos as $tipo) {
                $unidadesTipo = $unidades->filter(function($u) use ($tipo, $transportes) {
                    $transporte = $transportes->get($u->transporte_id);
                    $nombreTrans = $transporte ? strtolower(trim($transporte->nombre)) : '';
                    if ($tipo === 'urvan' && $nombreTrans === 'vagoneta') return true;
                    return $nombreTrans === $tipo;
                });

                $parque = $unidadesTipo->count();
                
                $unidadesCargaron = $unidadesTipo->filter(function($u) use ($today) {
                    $fecha = $u->fecha_ultima_carga ?? '';
                    return str_starts_with($fecha, $today) && floatval($u->litros_combustible) > 0;
                });
                
                $cargaronCount = $unidadesCargaron->count();
                $sinCargarCount = $parque - $cargaronCount;
                $litrosTotal = $unidadesCargaron->sum('litros_combustible');
                
                $porcentaje = $parque > 0 ? round(($cargaronCount / $parque) * 100) : 0;
                
                $motivo = '';
                $obs = '';
                
                if ($sinCargarCount > 0) {
                    $unidadesSinCargar = $unidadesTipo->filter(function($u) use ($today) {
                        $fecha = $u->fecha_ultima_carga ?? '';
                        return !(str_starts_with($fecha, $today) && floatval($u->litros_combustible) > 0);
                    });
                    
                    $estatusCounts = [];
                    foreach($unidadesSinCargar as $u) {
                        $info = $informacion->get($u->id);
                        $est = $info ? strtolower(trim($info->estatus)) : 'operacion';
                        if(!isset($estatusCounts[$est])) $estatusCounts[$est] = 0;
                        $estatusCounts[$est]++;
                    }
                    
                    arsort($estatusCounts);
                    $primaryEstatus = key($estatusCounts);
                    $countEstatus = current($estatusCounts);
                    
                    if ($primaryEstatus === 'reserva') {
                        $motivo = 'Combustible suficiente';
                        $obs = "UNIDADES RESERVA";
                    } elseif (in_array($primaryEstatus, ['mantenimiento', 'taller', 'baja'])) {
                        $motivo = 'Fuera de operación';
                        $obs = "$countEstatus UNIDADES FUERA DE OPERACIÓN";
                    } else {
                        $motivo = 'Combustible suficiente';
                        $obs = "COMBUSTIBLE SUFICIENTE";
                    }
                }
                
                $combustibleStr = in_array($tipo, ['urbanuss', 'zafiro', 'orion']) ? 'Diésel' : 'Gasolina';
                $nombreDisplay = ucfirst($tipo);
                if ($nombreDisplay === 'Urbanuss') $nombreDisplay = 'Urbanus';
                if ($nombreDisplay === 'Orion') $nombreDisplay = 'Orión';

                $reporte[] = [
                    'tipo_unidad' => $nombreDisplay,
                    'combustible' => $combustibleStr,
                    'parque' => $parque,
                    'litros_cargados' => $litrosTotal,
                    'unidades_cargaron' => $cargaronCount,
                    'unidades_sin_cargar' => $sinCargarCount,
                    'porcentaje' => $porcentaje,
                    'motivo_no_carga' => $motivo,
                    'observaciones' => $obs,
                    'raw_tipo' => $tipo
                ];
            }

            $totales = [
                'litros_totales' => collect($reporte)->sum('litros_cargados'),
                'unidades_cargaron' => collect($reporte)->sum('unidades_cargaron'),
                'unidades_sin_cargar' => collect($reporte)->sum('unidades_sin_cargar'),
            ];
            $parqueTotal = collect($reporte)->sum('parque');
            $totales['porcentaje'] = $parqueTotal > 0 ? round(($totales['unidades_cargaron'] / $parqueTotal) * 100) : 0;

            return response()->json([
                'status' => 'success',
                'data' => $reporte,
                'totales' => $totales
            ]);
        } catch (\Exception $e) {
            \Log::error('[reporteCombustibleDiario] Error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => 'Error al generar el reporte'], 500);
        }
    }
    public function asignarIncidencia(Request $request)
    {
        try {
            $request->validate([
                'numero_eco' => 'required',
                'tipo' => 'required',
                'incidencia' => 'required|string|max:255'
            ]);

            $registroOperativo = DB::table('informacion_operativa')
                ->where('numero_eco', $request->numero_eco)
                ->where('tipo', $request->tipo)
                ->first();

            if (!$registroOperativo) {
                return response()->json(['status' => 'error', 'message' => 'Unidad no encontrada en operación'], 404);
            }

            DB::table('informacion_operativa')
                ->where('id', $registroOperativo->id)
                ->update([
                    'folio_mantenimiento' => $request->incidencia,
                ]);

            BitacoraHelper::registrarCambio(
                $registroOperativo->unidad_id,
                'ASIGNACION_INCIDENCIA',
                "ASIGNÓ NÚMERO DE INCIDENCIA: " . $request->incidencia
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Número de incidencia asignado exitosamente',
                'incidencia' => $request->incidencia
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error en asignarIncidencia: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Ocurrió un error al asignar la incidencia',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

