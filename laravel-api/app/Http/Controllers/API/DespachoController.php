<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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
                            'updated_at' => now()
                        ]
                    );
                } catch (\Exception $e) {
                    \Log::error('Error al auto-alimentar conductores en importación: ' . $e->getMessage());
                }
            }

            $registrosParaInsertar[] = [
                'unidad_id' => $unidad->id,
                'ruta' => trim((string) ($fila['RUTA'] ?? '')),
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $nombreConductor,
                'tipo' => trim((string) ($fila['TIPO_DE_UNIDAD'] ?? 'Desconocido')),
                'estatus' => trim((string) ($fila['ESTATUS'] ?? 'Sin estatus')),
                'corridas' => trim((string) ($fila['CORRIDA'] ?? '')) === '' ? null : (int) trim((string) ($fila['CORRIDA'] ?? '')),
                'hora_salida' => trim((string) ($fila['HORA_SALIDA'] ?? '')) === '' ? null : trim((string) ($fila['HORA_SALIDA'] ?? '')),
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
        $fechaHoy = Carbon::today()->toDateString();

        \Log::info('conteoUnidadesPorTipo - fechaHoy', ['fecha' => $fechaHoy]);

        $conteos = DB::table('informacion_operativa')
            ->whereDate('fecha_registro', $fechaHoy)
            ->select('tipo', DB::raw('count(distinct unidad_id) as total'))
            ->groupBy('tipo')
            ->get();

        \Log::info('conteoUnidadesPorTipo - resultados crudos', $conteos->toArray());

        $resultado = [];
        foreach ($conteos as $item) {
            if (!empty($item->tipo)) {
                $tipo = strtolower(trim($item->tipo));
                $resultado[$tipo] = (int)$item->total;
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
        $fechaHoy = Carbon::today()->toDateString();

        $unidades = DB::table('unidades')
            ->join('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado]) // ← CAMBIO AQUÍ
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
            ->select('unidades.numero_eco', 'informacion_operativa.numero_tarjeton as tarjeton', 'informacion_operativa.estatus')
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
        $fechaHoy = Carbon::today()->toDateString();

        if ($tarjetonLimpio === '') {
            return response()->json(['status' => 'success', 'unidad' => null], 200);
        }

        $unidad = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
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
        $fechaHoy = Carbon::today()->toDateString();

        // 🔥 CORREGIDO: usar informacion_operativa.tipo
        $data = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
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
    // app/Http/Controllers/API/DespachoController.php

    public function obtenerDetalleUnidad($tipo, $numeroEco)
    {
        $tipoNormalizado = strtolower(trim($tipo));
        $numeroEcoClean = str_pad(trim($numeroEco), 3, '0', STR_PAD_LEFT);

        // 🔥 CORREGIDO: agregar numero_tarjeton al select
        $info = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->whereDate('informacion_operativa.fecha_registro', Carbon::today()->toDateString())
            ->select(
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.numero_tarjeton',  // ✅ ahora seleccionado
                'informacion_operativa.estatus',
                'unidades.numero_eco',
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
                'informacion_operativa.ciclo',
                'informacion_operativa.motivo',
                'informacion_operativa.hora_salida'
            )
            ->first();

        if ($info) {
            $estatus = strtolower(trim($info->estatus ?? 'operacion'));
            if (!in_array($estatus, ['operacion', 'mantenimiento', 'reserva'], true)) {
                $estatus = 'operacion';
            }
        }

        return response()->json(
            $info ? [
                'status'    => 'success',
                'asignado'  => true,
                'ruta'      => $info->ruta,
                'conductor' => $info->nombre_conductor,
                'tarjeton'  => $info->numero_tarjeton ?? '',  // ✅ ahora llega
                'estatus'   => $estatus,
                'falla'     => $info->falla,
                'corridas'  => $info->corridas,
                'ciclo'     => $info->ciclo,
                'motivo'    => $info->motivo,
                'hora_salida' => $info->hora_salida
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
                'motivo'    => null
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
        $unidadesExcel = $request->input('unidades');
        $fechaHoy = Carbon::today()->toDateString();

        $unidadesMap = DB::table('unidades')->select('id', 'numero_eco')->get()->keyBy('numero_eco');

        $actualizados = 0;
        $errores = [];

        foreach ($unidadesExcel as $fila) {
            $numeroEco = ltrim(trim((string) ($fila['ECONOMICO'] ?? '')), '0');
            $numeroEcoClean = str_pad($numeroEco, 3, '0', STR_PAD_LEFT);

            $unidad = $unidadesMap->get($numeroEcoClean);
            if (!$unidad) {
                $errores[] = "ECO no encontrado: {$numeroEcoClean}";
                continue;
            }

            $registro = DB::table('informacion_operativa')
                ->where('unidad_id', $unidad->id)
                ->whereDate('fecha_registro', $fechaHoy)
                ->first();

            if ($registro) {
                try {
                    $corridasVal = trim((string) ($fila['CORRIDAS'] ?? ''));
                    $horaSalidaVal = trim((string) ($fila['HORA_SALIDA'] ?? ''));

                    DB::table('informacion_operativa')
                        ->where('id', $registro->id)
                        ->update([
                            'ruta'             => (string) ($fila['RUTA'] ?? ''),
                            'numero_tarjeton'  => (string) ($fila['TARJETON'] ?? ''),
                            'nombre_conductor' => (string) ($fila['NOMBRE_CONDUCTOR'] ?? ''),
                            'corridas'         => $corridasVal === '' ? null : (int)$corridasVal,
                            'hora_salida'      => $horaSalidaVal === '' ? null : $horaSalidaVal,
                        ]);

                    $actualizados++;
                } catch (\Exception $e) {
                    \Log::error("Fallo individual en ID {$registro->id}: " . $e->getMessage());
                    $errores[] = "Error al actualizar ECO {$numeroEcoClean}: " . $e->getMessage();
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proceso finalizado. Total actualizados: {$actualizados}",
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
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
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
        $fechaHoy = Carbon::today()->toDateString();

        // 1. buscar conductor por tarjeton en catalogo
        $conductor = DB::table('conductores')
            ->where('tarjeton', $tarjetonLimpio)
            ->first();

        if (!$conductor) {
            return response()->json([
                'status' => 'error',
                'message' => "El tarjetón {$tarjetonLimpio} no está registrado en el catálogo de conductores."
            ], 422);
        }

        // 2. buscar registro de informacion_operativa de hoy para la unidad
        $registro = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->whereRaw('LOWER(informacion_operativa.tipo) = ?', [$tipoNormalizado])
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
            ->select('informacion_operativa.id')
            ->first();

        if (!$registro) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en la operación de hoy.'
            ], 404);
        }

        // 3. actualizar en informacion_operativa
        DB::table('informacion_operativa')
            ->where('id', $registro->id)
            ->update([
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $conductor->nombre
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tarjetón y conductor asignados correctamente.',
            'tarjeton' => $tarjetonLimpio,
            'conductor' => $conductor->nombre
        ], 200);
    }

    /**
     * Obtiene todos los registros de información operativa del día actual,
     * formateados para la tabla de vista previa del Capturista.
     */
    public function obtenerDatosHoy()
    {
        $fechaHoy = Carbon::today()->toDateString();

        $registros = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
            ->select(
                'unidades.numero_eco',
                'informacion_operativa.tipo',
                'informacion_operativa.ruta',
                'informacion_operativa.numero_tarjeton',   // ✅ agregado
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.estatus',
                'informacion_operativa.falla',
                'informacion_operativa.corridas',
                'informacion_operativa.ciclo',
                'informacion_operativa.motivo',
                'informacion_operativa.hora_salida'
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
                'HORA_SALIDA' => $reg->hora_salida
            ];
        });

        return response()->json($formateados, 200);
    }

    /**
     * Cambia el estatus operativo de una unidad (para el rol Encierro).
     */
    public function cambiarEstatus(Request $request)
    {
        $request->validate([
            'numero_eco' => 'required',
            'tipo' => 'required',
            'estatus' => 'required|in:operacion,mantenimiento,reserva',
        ]);

        $numeroEco = str_pad(ltrim(trim($request->numero_eco), '0'), 3, '0', STR_PAD_LEFT);
        $tipoNormalizado = strtolower(trim($request->tipo));
        $nuevoEstatus = strtolower(trim($request->estatus));
        $fechaHoy = Carbon::today()->toDateString();

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
            ->whereDate('fecha_registro', $fechaHoy)
            ->whereRaw('LOWER(tipo) = ?', [$tipoNormalizado])
            ->first();

        if (!$registroOperativo) {
            return response()->json([
                'status' => 'error',
                'message' => 'Esta unidad no tiene registro operativo para el día de hoy.'
            ], 404);
        }

        DB::table('informacion_operativa')
            ->where('id', $registroOperativo->id)
            ->update([
                'estatus' => $nuevoEstatus,
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Estatus actualizado correctamente.',
            'estatus' => $nuevoEstatus
        ], 200);
    }
}