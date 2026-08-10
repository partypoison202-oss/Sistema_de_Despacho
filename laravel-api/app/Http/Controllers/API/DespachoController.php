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

            $horaAcople = trim((string) ($fila['HORA_DE_ACOPLE'] ?? $fila['HORA_PROGRAMADA'] ?? ''));

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
            DB::table('informacion_operativa')
                ->whereDate('fecha_registro', $fechaHoy)
                ->delete();

            \Log::info('Delete ejecutado sin transacción');

            $chunks = array_chunk($registrosParaInsertar, 50);
            foreach ($chunks as $chunk) {
                DB::table('informacion_operativa')->insert($chunk);
            }

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
    public function conteoUnidadesPorTipo()
    {
        $conteos = DB::table('informacion_operativa')
            ->select('tipo', DB::raw('count(distinct unidad_id) as total'))
            ->groupBy('tipo')
            ->get();

        \Log::info('conteoUnidadesPorTipo - resultados crudos', $conteos->toArray());

        $resultado = [];
        foreach ($conteos as $item) {
            if (!empty($item->tipo)) {
                $tipo = strtolower(trim($item->tipo));
                // Normalizar 'urbanuss' → 'urbanus' para que coincida con el id del módulo en el frontend
                if ($tipo === 'urbanuss') {
                    $tipo = 'urbanus';
                }
                if (isset($resultado[$tipo])) {
                    $resultado[$tipo] += (int)$item->total;
                } else {
                    $resultado[$tipo] = (int)$item->total;
                }
            }
        }

        \Log::info('conteoUnidadesPorTipo - resultado final', $resultado);

        return response()->json($resultado, 200);
    }

    /**
     * Obtiene el listado de unidades que tienen registro operativo para hoy
     * y pertenecen al tipo de transporte solicitado.
     */
    public function listarUnidadesPorTipo($tipo)
    {
        $tipoNormalizado = strtolower(trim($tipo));
        if ($tipoNormalizado === 'urbanuss') {
            $tipoNormalizado = 'urbanus';
        }

        $unidades = DB::table('unidades')
            ->join('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.estatus',
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
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
                    'numero_eco' => $unidad->numero_eco,
                    'tarjeton' => $unidad->tarjeton,
                    'estatus' => $estatus,
                    'ruta' => $unidad->ruta,
                    'nombre_conductor' => $unidad->nombre_conductor,
                    'falla' => $unidad->falla,
                    'corridas' => $unidad->corridas,
                    'acople' => $unidad->acople,
                    'hora_salida' => $unidad->hora_salida,
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
        if ($tipoNormalizado === 'urbanuss') {
            $tipoNormalizado = 'urbanus';
        }
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
        if ($tipoNormalizado === 'urbanuss') {
            $tipoNormalizado = 'urbanus';
        }

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
        if ($tipoNormalizado === 'urbanuss') {
            $tipoNormalizado = 'urbanus';
        }
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
                'informacion_operativa.hora_programada',
                'informacion_operativa.acople',
                'informacion_operativa.hora_salida',
                'informacion_operativa.observaciones'
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
                'hora_programada' => $info->hora_programada,
                'acople'    => $info->acople,
                'hora_salida' => $info->hora_salida,
                'observaciones' => $info->observaciones,
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
                'hora_programada' => null,
                'acople'    => null,
                'hora_salida' => null,
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

        $conductoresMap = DB::table('conductores')->select('tarjeton', 'nombre')->get()->keyBy(function ($c) {
            return trim($c->tarjeton);
        });

        $infoOperativaIds = DB::table('informacion_operativa')->pluck('id', 'unidad_id')->all();

        $unidadesProcesadasIds = [];
        $tarjetonesEnServicio = [];
        $actualizados = 0;
        $creados = 0;
        $errores = [];

        DB::table('conductores')->update(['estado_servicio' => 'disponible']);

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
                    $tarjetonesEnServicio[] = $tarjetonVal;
                } else {
                    $conductorNombre = trim((string) ($fila['NOMBRE_CONDUCTOR'] ?? ''));
                }
            }

            $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
            $horaSalidaVal = trim((string) ($fila['HORA_DE_ACOPLE'] ?? $fila['HORA_PROGRAMADA'] ?? ''));

            $registroId = $infoOperativaIds[$unidad->id] ?? null;

            $data = [
                'ruta'             => (string) ($fila['RUTA'] ?? ''),
                'numero_tarjeton'  => $tarjetonVal,
                'nombre_conductor' => $conductorNombre,
                'corridas'         => $corridasVal === '' ? null : (int)$corridasVal,
                'hora_programada'  => $horaSalidaVal === '' ? null : $horaSalidaVal,
                'tipo'             => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus'          => trim((string) ($fila['ESTATUS'] ?? 'operacion'))
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

    /**
     * Actualiza la información adicional (falla, corridas, ciclo, motivo) de una unidad específica
     */
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

        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select('informacion_operativa.id')
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

        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->select('informacion_operativa.id', 'informacion_operativa.hora_programada', 'informacion_operativa.acople', 'informacion_operativa.unidad_id')
            ->first();

        if (!$registro) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en el registro operativo'
            ], 404);
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

        $actualizado = DB::table('informacion_operativa')
            ->where('id', $registro->id)
            ->update($updateData);

        if ($actualizado !== false) {
            // Registrar acción en la bitácora de cambios
            BitacoraHelper::registrarCambio(
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
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Error al actualizar las horas'
        ], 500);
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
                'informacion_operativa.numero_tarjeton',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.estatus',
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
                'informacion_operativa.ciclo',
                'informacion_operativa.motivo',
                'informacion_operativa.motivo_estatus',
                'informacion_operativa.hora_programada'
            )
            ->orderBy('informacion_operativa.tipo')
            ->orderBy('unidades.numero_eco')
            ->get();

        $formateados = $registros->map(function ($reg) {
            return [
                'TIPO_DE_UNIDAD' => $reg->tipo,
                'RUTA' => $reg->ruta,
                'ECONOMICO' => $reg->numero_eco,
                'TARJETON' => $reg->numero_tarjeton,
                'NOMBRE_CONDUCTOR' => $reg->nombre_conductor,
                'ESTATUS' => $reg->estatus,
                'FALLA' => $reg->falla,
                'CORRIDAS' => $reg->corridas,
                'CICLO' => $reg->ciclo,
                'MOTIVO' => $reg->motivo,
                'MOTIVO_ESTATUS' => $reg->motivo_estatus,
                'HORA_DE_ACOPLE' => $reg->hora_programada,
                'HORA_PROGRAMADA' => $reg->hora_programada
            ];
        });

        return response()->json($formateados, 200);
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
            'estatus' => 'required|in:operacion,mantenimiento,reserva',
            'motivo_estatus' => 'nullable|string'
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));
        $nuevoEstatus = strtolower(trim($request->estatus));
        $motivoEstatus = $request->motivo_estatus;

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

        if ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento') {
            $updateData['nombre_conductor'] = null;
            $updateData['numero_tarjeton'] = null;
            $updateData['ruta'] = null;
            $updateData['corrida'] = null;

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
        }

        DB::table('informacion_operativa')
            ->where('id', $registroOperativo->id)
            ->update($updateData);

        // Registrar acción en la bitácora de cambios
        BitacoraHelper::registrarCambio(
            $unidad->id,
            'CAMBIO_ESTATUS',
            ($nuevoEstatus === 'reserva' || $nuevoEstatus === 'mantenimiento')
                ? "CAMBIO DE ESTATUS DE " . strtoupper($registroOperativo->estatus ?? '') . " A " . strtoupper($nuevoEstatus) . ($motivoEstatus ? " POR MOTIVO: " . strtoupper($motivoEstatus) : "")
                : "CAMBIO DE ESTATUS DE " . strtoupper($registroOperativo->estatus ?? '') . " A " . strtoupper($nuevoEstatus),
            $registroOperativo->estatus ?? null,
            $nuevoEstatus
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Estatus actualizado correctamente.',
            'estatus' => $nuevoEstatus
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
                    'nivel_adblue'       => $request->nivel_adblue === '' ? null : $request->nivel_adblue,
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
                'nivel_adblue'       => $request->nivel_adblue === '' ? null : $request->nivel_adblue,
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
                'nivel_adblue'       => null,
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
            'nivel_adblue'       => $unidad->nivel_adblue,
            'numero_cincho'      => $unidad->numero_cincho,
            'numero_cincho_adblue' => $unidad->numero_cincho_adblue ?? null,
            'fecha_ultima_carga' => $unidad->fecha_ultima_carga,
            'kilometraje'        => $unidad->kilometraje ?? null,
            'odometro'           => $unidad->odometro ?? null,
        ], 200);
    }

    /**
     * Obtiene todas las unidades de un tipo específico que están asignadas a una ruta determinada,
     * para el día actual.
     */
    public function unidadesPorRuta($tipo, $ruta)
    {
        $tipoNormalizado = strtolower(trim($tipo));
        if ($tipoNormalizado === 'urbanuss') {
            $tipoNormalizado = 'urbanus';
        }

        $rutaLimpia = trim($ruta);

        $unidades = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->where('informacion_operativa.ruta', $rutaLimpia)
            ->whereNull('informacion_operativa.hora_salida')
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.numero_tarjeton as tarjeton',
                'informacion_operativa.estatus',
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor'
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
                ];
            });

        return response()->json($unidades, 200);
    }
}