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

            $registrosParaInsertar[] = [
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
            ->select(
                'unidades.numero_eco', 
                'informacion_operativa.numero_tarjeton as tarjeton', 
                'informacion_operativa.estatus',
                'informacion_operativa.ruta',
                'informacion_operativa.nombre_conductor',
                'informacion_operativa.falla'
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
                'informacion_operativa.hora_programada',
                'informacion_operativa.acople'
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
                'hora_programada' => $info->hora_programada,
                'acople'    => $info->acople
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
                'acople'    => null
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
                    $horaSalidaVal = trim((string) ($fila['HORA_DE_ACOPLE'] ?? $fila['HORA_PROGRAMADA'] ?? ''));

                    DB::table('informacion_operativa')
                        ->where('id', $registro->id)
                        ->update([
                            'ruta'             => (string) ($fila['RUTA'] ?? ''),
                            'numero_tarjeton'  => (string) ($fila['TARJETON'] ?? ''),
                            'nombre_conductor' => (string) ($fila['NOMBRE_CONDUCTOR'] ?? ''),
                            'corridas'         => $corridasVal === '' ? null : (int)$corridasVal,
                            'hora_programada'  => $horaSalidaVal === '' ? null : $horaSalidaVal,
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
            ->select('informacion_operativa.id', 'informacion_operativa.numero_tarjeton')
            ->first();

        if (!$registro) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en la operación de hoy.'
            ], 404);
        }

        // Si el conductor ya estaba asignado a otra unidad hoy, desasignarlo de esa otra unidad
        DB::table('informacion_operativa')
            ->whereDate('fecha_registro', $fechaHoy)
            ->where('numero_tarjeton', $tarjetonLimpio)
            ->where('id', '!=', $registro->id)
            ->update([
                'numero_tarjeton' => null,
                'nombre_conductor' => null
            ]);

        // 3. actualizar en informacion_operativa
        DB::table('informacion_operativa')
            ->where('id', $registro->id)
            ->update([
                'numero_tarjeton' => $tarjetonLimpio,
                'nombre_conductor' => $conductor->nombre
            ]);

        // 4. Actualizar disponibilidad de conductores
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
            'acople' => 'nullable|string'
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
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad no encontrada en el registro de hoy'
            ], 404);
        }

        $actualizado = DB::table('informacion_operativa')
            ->where('id', $registro->id)
            ->update([
                'hora_programada' => $request->hora_programada,
                'acople' => $request->acople
            ]);

        if ($actualizado !== false) {
            return response()->json([
                'status' => 'success',
                'message' => 'Horas actualizadas exitosamente',
                'hora_programada' => $request->hora_programada,
                'acople' => $request->acople
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

        $updateData = [
            'estatus' => $nuevoEstatus,
            'motivo_estatus' => $motivoEstatus
        ];

        $fechaHoy = Carbon::today()->toDateString();

        if ($nuevoEstatus === 'reserva') {
            $updateData['nombre_conductor'] = null;
            $updateData['numero_tarjeton'] = null;
            $updateData['ruta'] = null;

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
                        ->whereDate('fecha_registro', $fechaHoy)
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

        return response()->json([
            'status' => 'success',
            'message' => 'Estatus actualizado correctamente.',
            'estatus' => $nuevoEstatus
        ], 200);
    }

    public function obtenerRutas()
    {
        $troncales = DB::table('rutas')->where('tipo', 'troncal')->pluck('ruta');
        $alimentadoras = DB::table('rutas')->where('tipo', 'alimentadora')->pluck('ruta');

        return response()->json([
            'troncales' => $troncales,
            'alimentadoras' => $alimentadoras
        ], 200);
    }

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
        $fechaHoy = Carbon::today()->toDateString();

        $operacion = DB::table('informacion_operativa')
            ->join('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
            ->where('unidades.numero_eco', $numeroEcoClean)
            ->where(DB::raw('LOWER(informacion_operativa.tipo)'), $tipoNormalizado)
            ->whereDate('informacion_operativa.fecha_registro', $fechaHoy)
            ->select('informacion_operativa.id')
            ->first();

        if (!$operacion) {
            return response()->json([
                'status' => 'error',
                'message' => 'No hay registro de operación para esta unidad hoy.'
            ], 404);
        }

        DB::table('informacion_operativa')
            ->where('id', $operacion->id)
            ->update([
                'ruta' => $rutaLimpia,
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ruta actualizada correctamente.'
        ], 200);
    }
}