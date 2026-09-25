<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Conductor;
use App\Helpers\BitacoraConductorHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class ConductorController extends Controller
{
    private function ensureColumnsExist()
    {
        try {
            if (!Schema::hasColumn('conductores', 'estatus')) {
                Schema::table('conductores', function (Blueprint $table) {
                    $table->string('estatus', 20)->default('activo');
                });
            }
            if (!Schema::hasColumn('conductores', 'tipo_tarjeton')) {
                Schema::table('conductores', function (Blueprint $table) {
                    $table->string('tipo_tarjeton', 50)->nullable();
                });
            }
            if (!Schema::hasColumn('conductores', 'foto')) {
                Schema::table('conductores', function (Blueprint $table) {
                    $table->string('foto', 255)->nullable();
                });
            }
            if (!Schema::hasColumn('conductores', 'faltas_detalle')) {
                Schema::table('conductores', function (Blueprint $table) {
                    $table->text('faltas_detalle')->nullable();
                });
            }
        } catch (\Exception $e) {
            // Manejo silencioso si las columnas ya existen
        }
    }

    public function index(Request $request)
    {
        $this->ensureColumnsExist();

        $query = Conductor::query();

        // Filtrar sólo operadores activos (no dados de baja ni inhabilitados) por defecto
        if (!$request->has('incluir_bajas') || $request->incluir_bajas !== 'true') {
            $query->where(function ($q) {
                $q->where('estatus', 'activo')
                  ->orWhereNull('estatus');
            });
        }

        // Obtener todos los tarjetones asignados en tiempo real en despacho
        $asignaciones = DB::table('informacion_operativa')
            ->whereNotNull('numero_tarjeton')
            ->where('numero_tarjeton', '!=', '')
            ->pluck('numero_tarjeton')
            ->toArray();

        $conductores = $query->get()->map(function ($c) use ($asignaciones) {
            // Evaluar regla de 4 faltas en 30 días
            $eval = $c->evaluarInhabilitacionFaltas();
            if ($eval['inhabilitado'] && $c->estatus !== 'inhabilitado') {
                $c->estatus = 'inhabilitado';
                $c->estado_servicio = null;
                DB::table('conductores')->where('id', $c->id)->update([
                    'estatus' => 'inhabilitado',
                    'estado_servicio' => null
                ]);
                DB::table('informacion_operativa')
                    ->where('numero_tarjeton', $c->tarjeton)
                    ->update([
                        'numero_tarjeton' => null,
                        'nombre_conductor' => null
                    ]);
            }

            $tarjetonClean = trim($c->tarjeton ?? '');
            $estaAsignado = false;
            foreach ($asignaciones as $t) {
                if (trim($t) === $tarjetonClean) {
                    $estaAsignado = true;
                    break;
                }
            }
            if ($c->estatus === 'baja' || $c->estatus === 'inhabilitado') {
                $c->estado_servicio = null;
            } elseif ($c->estado_servicio === 'maniobrista') {
                // Respetar siempre el estado maniobrista, aunque esté asignado
                $c->estado_servicio = 'maniobrista';
            } else {
                $c->estado_servicio = $estaAsignado ? 'en_servicio' : ($c->estado_servicio ?? 'disponible');
            }
            return $c;
        });

        // Si no se incluyeron bajas/inhabilitados explícitamente, filtrar aquellos que hayan resultado inhabilitados al evaluar
        if (!$request->has('incluir_bajas') || $request->incluir_bajas !== 'true') {
            $conductores = $conductores->filter(function ($c) {
                return $c->estatus === 'activo' || is_null($c->estatus);
            })->values();
        }

        return response()->json($conductores);
    }

    public function store(Request $request)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'nombres' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'tipo_tarjeton' => 'required|string|max:50',
            'telefono' => 'nullable|string|digits:10',
            'sexo' => 'required|string|in:Masculino,Femenino'
        ]);

        // Generar tarjetón de forma automática
        $maxNum = 0;
        $existingTarjetones = DB::table('conductores')->pluck('tarjeton');
        foreach ($existingTarjetones as $t) {
            preg_match_all('/\d+/', (string)$t, $matches);
            if (!empty($matches[0])) {
                foreach ($matches[0] as $numStr) {
                    $n = (int)$numStr;
                    if ($n > $maxNum) {
                        $maxNum = $n;
                    }
                }
            }
        }
        
        $nuevoNumero = $maxNum > 0 ? $maxNum + 1 : 1;
        $tarjetonGenerado = str_pad($nuevoNumero, 4, '0', STR_PAD_LEFT);

        // Asegurar unicidad si por algún motivo existe
        while (DB::table('conductores')->where('tarjeton', $tarjetonGenerado)->exists()) {
            $nuevoNumero++;
            $tarjetonGenerado = str_pad($nuevoNumero, 4, '0', STR_PAD_LEFT);
        }

        $conductor = Conductor::create([
            'nombres' => trim($request->nombres),
            'apellidos' => trim($request->apellidos),
            'tarjeton' => $tarjetonGenerado,
            'tipo_tarjeton' => trim($request->tipo_tarjeton),
            'estado_servicio' => 'disponible',
            'estatus' => 'activo',
            'vigencia_licencia' => $request->vigencia_licencia ?? null,
            'sexo' => $request->sexo ?? null,
            'fecha_nacimiento' => $request->fecha_nacimiento ?? null,
            'telefono' => $request->telefono ?? null,
            'referencia_1' => $request->referencia_1 ?? null,
            'referencia_2' => $request->referencia_2 ?? null,
            'fecha_ingreso' => $request->fecha_ingreso ?? null,
            'amonestaciones_detalle' => [],
            'reconocimientos_detalle' => [],
            'condicionamientos_medicos' => null,
        ]);

        BitacoraConductorHelper::registrarAccion(
            $conductor->id,
            $conductor->tarjeton,
            $conductor->nombres . ' ' . $conductor->apellidos,
            'CREACION',
            "Registro de nuevo operador con Tarjetón {$conductor->tarjeton} ({$conductor->tipo_tarjeton})",
            $request
        );

        return response()->json([
            'message' => 'Operador registrado correctamente',
            'conductor' => $conductor
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $conductor = Conductor::findOrFail($id);

        $request->validate([
            'nombres' => 'sometimes|required|string|max:100',
            'apellidos' => 'sometimes|required|string|max:100',
            'tipo_tarjeton' => 'sometimes|required|string|max:50',
            'estado_servicio' => 'sometimes|required|string|in:disponible,en_servicio,falta,maniobrista,permuta,incapacidad,descanso',
            'ultima_capacitacion' => 'sometimes|nullable|date',
            'proxima_capacitacion' => 'sometimes|nullable|date',
            'accidentes_siniestros' => 'sometimes|integer|min:0',
            'faltas' => 'sometimes|integer|min:0',
            'retardos' => 'sometimes|integer|min:0',
            'amonestaciones' => 'sometimes|integer|min:0',
            'reconocimientos' => 'sometimes|integer|min:0',
            'condicionamientos_medicos' => 'sometimes|nullable|string|max:255',
            'condicionamientos_juridicos' => 'sometimes|nullable|string|max:255',
            'permutas' => 'sometimes|integer|min:0',
            'permisos' => 'sometimes|integer|min:0',
            'evaluacion' => 'sometimes|nullable|string|max:100',
            'observaciones' => 'sometimes|nullable|string|max:500',
            'vigencia_licencia' => 'sometimes|nullable|date',
            'sexo' => 'sometimes|required|string|in:Masculino,Femenino',
            'fecha_nacimiento' => 'sometimes|nullable|date',
            'telefono' => 'sometimes|nullable|string|digits:10',
            'referencia_1' => 'sometimes|nullable|string|max:200',
            'referencia_2' => 'sometimes|nullable|string|max:200',
            'fecha_ingreso' => 'sometimes|nullable|date',
            'amonestaciones_detalle' => 'sometimes|array',
            'reconocimientos_detalle' => 'sometimes|array',
            'permisos_detalle' => 'sometimes|array',
            'permutas_detalle' => 'sometimes|array',
            'accidentes_siniestros_detalle' => 'sometimes|array'
        ]);

        if ($request->has('nombres')) {
            $conductor->nombres = trim($request->nombres);
        }

        if ($request->has('apellidos')) {
            $conductor->apellidos = trim($request->apellidos);
        }

        if ($request->has('tipo_tarjeton')) {
            $conductor->tipo_tarjeton = trim($request->tipo_tarjeton);
        }

        if ($request->has('estado_servicio')) {
            $nuevoEstado = $request->estado_servicio;
            $conductor->estado_servicio = $nuevoEstado;

            // Lógica de Bitácora de Asistencias Diarias (Itinerario)
            if (in_array($nuevoEstado, ['falta', 'descanso', 'vacaciones', 'incapacidad'])) {
                $campo = $nuevoEstado === 'falta' ? 'faltas_detalle' : 
                         ($nuevoEstado === 'descanso' ? 'descansos_detalle' : 
                         ($nuevoEstado === 'vacaciones' ? 'vacaciones_detalle' : 'incapacidades_detalle'));
                
                $hoy = date('Y-m-d');
                $rawDetalle = $conductor->$campo;
                $detalle = [];
                if (is_array($rawDetalle)) $detalle = $rawDetalle;
                elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
                    $parsed = json_decode($rawDetalle, true);
                    if (is_array($parsed)) $detalle = $parsed;
                }
                
                $existe = false;
                foreach ($detalle as $item) {
                    if (isset($item['fecha']) && $item['fecha'] === $hoy) {
                        $existe = true; break;
                    }
                }
                
                if (!$existe) {
                    $detalle[] = [
                        'id' => $nuevoEstado . '_' . time() . '_' . random_int(1000, 9999),
                        'fecha' => $hoy,
                        'motivo' => 'Asignado desde Mesa de Control',
                        'estado' => 'pendiente',
                        'justificada' => false
                    ];
                    $conductor->$campo = $detalle;
                    if ($nuevoEstado === 'falta') {
                        $conductor->faltas = ((int)($conductor->faltas ?? 0)) + 1;
                    }
                }
            }

            // Si el nuevo estado NO es en_servicio, y el conductor estaba asignado a alguna unidad,
            // desvincular al conductor de la unidad
            if ($nuevoEstado !== 'en_servicio') {
                DB::table('informacion_operativa')
                    ->where('numero_tarjeton', $conductor->tarjeton)
                    ->update([
                        'numero_tarjeton' => null,
                        'nombre_conductor' => null
                    ]);
            }
        }

        $kardexFields = [
            'ultima_capacitacion',
            'proxima_capacitacion',
            'accidentes_siniestros',
            'faltas',
            'retardos',
            'amonestaciones',
            'reconocimientos',
            'condicionamientos_juridicos',
            'permutas',
            'permisos',
            'evaluacion',
            'observaciones',
            'vigencia_licencia',
            'sexo',
            'fecha_nacimiento',
            'telefono',
            'referencia_1',
            'referencia_2',
            'fecha_ingreso',
            'condicionamientos_medicos',
            'amonestaciones_detalle',
            'reconocimientos_detalle',
            'permisos_detalle',
            'permutas_detalle',
            'accidentes_siniestros_detalle'
        ];

        foreach ($kardexFields as $field) {
            if ($request->has($field)) {
                $conductor->$field = $request->$field;
            }
        }

        $conductor->save();

        BitacoraConductorHelper::registrarAccion(
            $conductor->id,
            $conductor->tarjeton,
            $conductor->nombres . ' ' . $conductor->apellidos,
            'EDICION',
            "Actualización de datos del operador (estatus: " . ($conductor->estatus ?? 'activo') . ", servicio: " . ($conductor->estado_servicio ?? 'disponible') . ")",
            $request
        );

        return response()->json([
            'message' => 'Operador actualizado correctamente',
            'conductor' => $conductor
        ]);
    }

    public function uploadFoto(Request $request, $id)
    {
        $this->ensureColumnsExist();
        
        $request->validate([
            'foto' => 'required|image|max:5120' // Max 5MB
        ]);

        $conductor = Conductor::findOrFail($id);

        if ($request->hasFile('foto')) {
            $file = $request->file('foto');
            $extension = strtolower($file->extension() ?: $file->guessExtension() ?: 'jpg');
            $filename = 'conductor_' . (int)$id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            // Guardar en public/storage/conductores
            $path = $file->storeAs('conductores', $filename, 'public');
            
            $conductor->foto = $path;
            $conductor->save();

            BitacoraConductorHelper::registrarAccion(
                $conductor->id,
                $conductor->tarjeton,
                $conductor->nombres . ' ' . $conductor->apellidos,
                'SUBIR_FOTO',
                "Actualización de fotografía oficial del operador",
                $request
            );

            return response()->json([
                'message' => 'Foto subida exitosamente',
                'foto_url' => '/storage/' . $path,
                'conductor' => $conductor
            ]);
        }

        return response()->json(['message' => 'No se proporcionó ninguna imagen'], 400);
    }

    public function uploadQr(Request $request, $id)
    {
        $request->validate([
            'qr' => 'required|image|max:5120' // Max 5MB
        ]);

        $conductor = Conductor::findOrFail($id);

        if ($request->hasFile('qr')) {
            $file = $request->file('qr');
            $extension = strtolower($file->extension() ?: $file->guessExtension() ?: 'jpg');
            $filename = 'conductor_qr_' . (int)$id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            // Guardar en public/storage/conductores
            $path = $file->storeAs('conductores', $filename, 'public');
            
            $conductor->qr_documento = $path;
            $conductor->save();

            BitacoraConductorHelper::registrarAccion(
                $conductor->id,
                $conductor->tarjeton,
                $conductor->nombres . ' ' . $conductor->apellidos,
                'SUBIR_QR',
                "Actualización de documento QR del operador",
                $request
            );

            return response()->json([
                'message' => 'Código QR subido exitosamente',
                'qr_url' => '/storage/' . $path,
                'conductor' => $conductor
            ]);
        }

        return response()->json(['message' => 'No se proporcionó ninguna imagen'], 400);
    }

    public function darDeBaja(Request $request, $id)
    {
        $this->ensureColumnsExist();

        // El rol de Programación no puede dar de baja a operadores
        if ($request->user() && $request->user()->role && $request->user()->role->codigo === 'PROGRAMACION') {
            return response()->json(['message' => 'El rol de Programación no tiene permiso para dar de baja operadores.'], 403);
        }

        $conductor = Conductor::findOrFail($id);
        $conductor->estatus = 'baja';
        $conductor->estado_servicio = null;
        $conductor->tipo_tarjeton = null;
        $conductor->save();

        BitacoraConductorHelper::registrarAccion(
            $conductor->id,
            $conductor->tarjeton,
            $conductor->nombres . ' ' . $conductor->apellidos,
            'BAJA',
            "Baja de operador en el sistema. " . ($request->motivo ? "Motivo: {$request->motivo}" : "Sin motivo registrado"),
            $request
        );

        return response()->json([
            'message' => 'Operador dado de baja correctamente',
            'conductor' => $conductor
        ]);
    }

    /**
     * Sube un documento justificante para una falta y la descuenta de las faltas activas.
     */
    public function justificarFalta(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'justificante' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:25600', // Max 25MB
            'falta_id' => 'nullable|string',
            'falta_index' => 'nullable|integer',
            'observaciones' => 'nullable|string|max:1000',
            'fecha_falta' => 'nullable|string',
            'motivo_falta' => 'nullable|string',
        ]);

        $conductor = Conductor::findOrFail($id);

        // Validar plazo de 3 días naturales para poder justificar
        $rawDetalle = $conductor->faltas_detalle;
        $detalleCheck = [];
        if (is_array($rawDetalle)) {
            $detalleCheck = $rawDetalle;
        } elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
            $parsed = json_decode($rawDetalle, true);
            if (is_array($parsed)) $detalleCheck = $parsed;
        }

        $faltaIndexCheck = $request->input('falta_index');
        $faltaIdCheck = $request->input('falta_id');
        $targetFecha = null;

        foreach ($detalleCheck as $idx => $item) {
            if (($faltaIdCheck && isset($item['id']) && (string)$item['id'] === (string)$faltaIdCheck) || ($faltaIndexCheck !== null && (int)$idx === (int)$faltaIndexCheck)) {
                $targetFecha = $item['fecha'] ?? null;
                break;
            }
        }

        if (!$targetFecha) {
            $targetFecha = $request->input('fecha_falta') ?: ($conductor->updated_at ? $conductor->updated_at->format('Y-m-d') : date('Y-m-d'));
        }

        if ($targetFecha && $targetFecha !== 'Fecha sin registrar') {
            $faltaTs = strtotime(substr($targetFecha, 0, 10));
            $todayTs = strtotime(date('Y-m-d'));
            if ($faltaTs !== false) {
                $diasDiferencia = (int)floor(($todayTs - $faltaTs) / 86400);
                if ($diasDiferencia > 3) {
                    return response()->json([
                        'message' => 'El plazo límite de 3 días para justificar esta falta ha expirado. Esta falta ya no es justificable.'
                    ], 422);
                }
            }
        }

        if ($request->hasFile('justificante')) {
            $file = $request->file('justificante');
            $extension = strtolower($file->extension() ?: $file->guessExtension() ?: 'pdf');
            $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
            if (!in_array($extension, $allowedExtensions, true)) {
                $extension = 'pdf';
            }
            $safeOriginalName = htmlspecialchars(basename($file->getClientOriginalName()), ENT_QUOTES, 'UTF-8');
            $filename = 'justificante_' . (int)$id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            
            // Asegurar creación de directorios
            $dirPublic = storage_path('app/public/justificantes');
            $dirStorage = public_path('storage/justificantes');
            $dirApp = storage_path('app/justificantes');
            if (!file_exists($dirPublic)) @mkdir($dirPublic, 0777, true);
            if (!file_exists($dirStorage)) @mkdir($dirStorage, 0777, true);
            if (!file_exists($dirApp)) @mkdir($dirApp, 0777, true);

            $path = $file->storeAs('justificantes', $filename, 'public');

            // Copiar explícitamente para garantizar redundancia en todos los directorios
            $fullStoredPath = storage_path('app/public/' . $path);
            if (file_exists($fullStoredPath)) {
                @copy($fullStoredPath, public_path('storage/justificantes/' . $filename));
                @copy($fullStoredPath, storage_path('app/justificantes/' . $filename));
            }

            $rawDetalle = $conductor->faltas_detalle;
            $detalle = [];
            if (is_array($rawDetalle)) {
                $detalle = $rawDetalle;
            } elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
                $parsed = json_decode($rawDetalle, true);
                if (is_array($parsed)) $detalle = $parsed;
            }

            $faltaIndex = $request->input('falta_index');
            $faltaId = $request->input('falta_id');
            $updated = false;

            foreach ($detalle as $idx => &$item) {
                if (($faltaId && isset($item['id']) && (string)$item['id'] === (string)$faltaId) || ($faltaIndex !== null && (int)$idx === (int)$faltaIndex)) {
                    $item['estado'] = 'justificada';
                    $item['justificada'] = true;
                    $item['justificante_url'] = '/api/justificantes/' . $filename;
                    $item['justificante_nombre'] = $safeOriginalName;
                    $item['justificante_fecha'] = date('Y-m-d H:i');
                    $item['observaciones_justificacion'] = $request->input('observaciones') ?: 'Justificante adjuntado correctamente';
                    $updated = true;
                    break;
                }
            }

            if (!$updated) {
                $detalle[] = [
                    'id' => 'falta_' . time() . '_' . random_int(1000, 9999),
                    'fecha' => $request->input('fecha_falta') ?: date('Y-m-d'),
                    'motivo' => $request->input('motivo_falta') ?: 'Falta registrada',
                    'estado' => 'justificada',
                    'justificada' => true,
                    'justificante_url' => '/api/justificantes/' . $filename,
                    'justificante_nombre' => $safeOriginalName,
                    'justificante_fecha' => date('Y-m-d H:i'),
                    'observaciones_justificacion' => $request->input('observaciones') ?: 'Justificante adjuntado correctamente',
                ];
            }

            $conductor->faltas_detalle = $detalle;

            if ($conductor->faltas > 0) {
                $conductor->faltas = max(0, (int)$conductor->faltas - 1);
            }

            // Reevaluar regla de 4 faltas en 30 días tras justificar
            $eval = $conductor->evaluarInhabilitacionFaltas();
            if ($conductor->estatus === 'inhabilitado' && !$eval['inhabilitado']) {
                $conductor->estatus = 'activo';
                $conductor->estado_servicio = 'disponible';
            }

            $conductor->save();

            BitacoraConductorHelper::registrarAccion(
                $conductor->id,
                $conductor->tarjeton,
                $conductor->nombres . ' ' . $conductor->apellidos,
                'FALTA_JUSTIFICADA',
                "Falta justificada. Comprobante adjuntado: " . ($safeOriginalName ?? 'documento.pdf') . ($request->input('observaciones') ? " - Obs: {$request->input('observaciones')}" : ""),
                $request
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Falta justificada correctamente. El comprobante fue almacenado y la falta fue descontada del historial activo.',
                'justificante_url' => '/api/justificantes/' . $filename,
                'conductor' => $conductor
            ], 200);
        }

        return response()->json(['status' => 'error', 'message' => 'No se proporcionó ningún archivo justificante.'], 400);
    }

    /**
     * Convierte una falta pendiente en un retardo.
     */
    public function marcarRetardo(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'falta_id' => 'nullable|string',
            'falta_index' => 'nullable|integer',
            'fecha_falta' => 'nullable|string',
            'motivo_falta' => 'nullable|string',
        ]);

        $conductor = Conductor::findOrFail($id);

        $rawDetalle = $conductor->faltas_detalle;
        $detalle = [];
        if (is_array($rawDetalle)) {
            $detalle = $rawDetalle;
        } elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
            $parsed = json_decode($rawDetalle, true);
            if (is_array($parsed)) $detalle = $parsed;
        }

        $faltaIndex = $request->input('falta_index');
        $faltaId = $request->input('falta_id');
        $updated = false;

        $fechaFalta = null;

        // 1. Determinar la fecha de la falta a convertir
        foreach ($detalle as $idx => $item) {
            if (($faltaId && isset($item['id']) && (string)$item['id'] === (string)$faltaId) || ($faltaIndex !== null && (int)$idx === (int)$faltaIndex)) {
                $fechaFalta = $item['fecha'] ?? null;
                break;
            }
        }
        if (!$fechaFalta) {
            $fechaFalta = $request->input('fecha_falta') ?: date('Y-m-d');
        }

        // 2. Validar que no exista ya un retardo en esa misma fecha dentro de faltas_detalle
        foreach ($detalle as $idx => $item) {
            if (isset($item['fecha']) && $item['fecha'] === $fechaFalta && isset($item['estado']) && $item['estado'] === 'retardo') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'El operador ya tiene un retardo registrado para el día ' . $fechaFalta . '. Solo se permite un retardo por día.'
                ], 400);
            }
        }

        // 3. Validar también en retardos_detalle por si acaso
        $rawRetardos = $conductor->retardos_detalle;
        $retardosList = is_string($rawRetardos) ? json_decode($rawRetardos, true) : (is_array($rawRetardos) ? $rawRetardos : []);
        foreach ($retardosList as $r) {
            if (isset($r['fecha']) && $r['fecha'] === $fechaFalta) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'El operador ya tiene un retardo registrado para el día ' . $fechaFalta . '. Solo se permite un retardo por día.'
                ], 400);
            }
        }

        foreach ($detalle as $idx => &$item) {
            if (($faltaId && isset($item['id']) && (string)$item['id'] === (string)$faltaId) || ($faltaIndex !== null && (int)$idx === (int)$faltaIndex)) {
                $item['estado'] = 'retardo';
                $item['justificada'] = false; 
                $item['observaciones_justificacion'] = 'Convertido a retardo el ' . date('Y-m-d H:i');
                $updated = true;
                break;
            }
        }

        if (!$updated) {
            $detalle[] = [
                'id' => 'retardo_' . time() . '_' . random_int(1000, 9999),
                'fecha' => $request->input('fecha_falta') ?: date('Y-m-d'),
                'motivo' => ($request->input('motivo_falta') ?: 'Falta registrada') . ' (Convertido a retardo)',
                'estado' => 'retardo',
                'justificada' => false,
                'observaciones_justificacion' => 'Convertido a retardo el ' . date('Y-m-d H:i'),
            ];
        }

        $conductor->faltas_detalle = $detalle;

        if ($conductor->faltas > 0) {
            $conductor->faltas = max(0, (int)$conductor->faltas - 1);
        }
        $conductor->retardos = (int)$conductor->retardos + 1;

        // Reevaluar regla de 4 faltas en 30 días tras justificar/retardo
        $eval = $conductor->evaluarInhabilitacionFaltas();
        if ($conductor->estatus === 'inhabilitado' && !$eval['inhabilitado']) {
            $conductor->estatus = 'activo';
            $conductor->estado_servicio = 'disponible';
        }

        $conductor->save();

        BitacoraConductorHelper::registrarAccion(
            $conductor->id,
            $conductor->tarjeton,
            $conductor->nombres . ' ' . $conductor->apellidos,
            'RETARDO',
            "Falta convertida a retardo para la fecha " . ($fechaFalta ?? date('Y-m-d')),
            $request
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Falta convertida a retardo correctamente. Se descontó la falta y sumó al historial de retardos.',
            'conductor' => $conductor
        ], 200);
    }

    /**
     * Registra una falta con fecha y motivo detallado para un conductor.
     */
    public function agregarFalta(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'fecha' => 'required|date',
            'motivo' => 'nullable|string|max:255',
        ]);

        $conductor = Conductor::findOrFail($id);

        $rawDetalle = $conductor->faltas_detalle;
        $detalle = [];
        if (is_array($rawDetalle)) {
            $detalle = $rawDetalle;
        } elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
            $parsed = json_decode($rawDetalle, true);
            if (is_array($parsed)) $detalle = $parsed;
        }

        $nuevaFalta = [
            'id' => 'falta_' . time() . '_' . random_int(1000, 9999),
            'fecha' => $request->input('fecha'),
            'motivo' => $request->input('motivo') ?: 'Inasistencia no justificada',
            'estado' => 'pendiente',
            'justificada' => false,
        ];

        $detalle[] = $nuevaFalta;
        $conductor->faltas_detalle = $detalle;
        $conductor->faltas = ((int)($conductor->faltas ?? 0)) + 1;

        // Evaluar regla de 4 faltas en 30 días
        $eval = $conductor->evaluarInhabilitacionFaltas();
        $fueInhabilitado = false;
        if ($eval['inhabilitado']) {
            $conductor->estatus = 'inhabilitado';
            $conductor->estado_servicio = null;
            $fueInhabilitado = true;

            // Desvincular automáticamente de cualquier unidad asignada
            DB::table('informacion_operativa')
                ->where('numero_tarjeton', $conductor->tarjeton)
                ->update([
                    'numero_tarjeton' => null,
                    'nombre_conductor' => null
                ]);
        }

        $conductor->save();

        BitacoraConductorHelper::registrarAccion(
            $conductor->id,
            $conductor->tarjeton,
            $conductor->nombres . ' ' . $conductor->apellidos,
            'FALTA_REGISTRADA',
            "Inasistencia registrada para la fecha {$request->input('fecha')}. Motivo: " . ($request->input('motivo') ?: 'Inasistencia no justificada'),
            $request
        );

        $mensaje = $fueInhabilitado
            ? 'Falta registrada correctamente. ATENCIÓN: El operador ha sido INHABILITADO al acumular 4 faltas en un lapso de 30 días.'
            : 'Falta registrada correctamente.';

        return response()->json([
            'status' => 'success',
            'message' => $mensaje,
            'conductor' => $conductor,
            'inhabilitado' => $fueInhabilitado
        ], 200);
    }

    /**
     * Sirve el archivo justificante almacenado evitando problemas de permisos o 403 en Nginx/symlink.
     */
    public function servirJustificante($filename)
    {
        $filenameOnly = strtok($filename, '?');
        $safeFilename = urldecode(basename(trim($filenameOnly)));
        
        $diskPath = '';
        try {
            $diskPath = \Illuminate\Support\Facades\Storage::disk('public')->path('justificantes/' . $safeFilename);
        } catch (\Throwable $e) {
            $diskPath = '';
        }

        $candidatePaths = array_values(array_filter(array_unique([
            $diskPath,
            storage_path('app/public/justificantes/' . $safeFilename),
            storage_path('app/justificantes/' . $safeFilename),
            public_path('storage/justificantes/' . $safeFilename),
            public_path('justificantes/' . $safeFilename),
            storage_path('app/private/justificantes/' . $safeFilename),
        ])));

        $foundPath = null;
        foreach ($candidatePaths as $p) {
            if (file_exists($p) && is_file($p)) {
                $foundPath = $p;
                break;
            }
        }

        // Búsqueda escaneando directorios si no se encontró en rutas directas
        if (!$foundPath) {
            $folders = [
                storage_path('app/public/justificantes'),
                public_path('storage/justificantes'),
                storage_path('app/justificantes'),
                storage_path('app/private/justificantes'),
            ];

            foreach ($folders as $folder) {
                if (is_dir($folder)) {
                    $files = scandir($folder);
                    foreach ($files as $f) {
                        if ($f === '.' || $f === '..') continue;
                        if (strcasecmp($f, $safeFilename) === 0 || str_contains($f, $safeFilename) || str_contains($safeFilename, $f)) {
                            $foundPath = $folder . '/' . $f;
                            break 2;
                        }
                    }
                }
            }
        }

        if (!$foundPath) {
            $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
                <rect width="100%" height="100%" fill="#fff5f5" rx="16"/>
                <rect x="2" y="2" width="596" height="296" fill="none" stroke="#fca5a5" stroke-width="2" rx="14" stroke-dasharray="8,8"/>
                <path d="M300 65 L345 140 L255 140 Z" fill="#ef4444" />
                <text x="300" y="125" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">!</text>
                <text x="300" y="180" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#991b1b" text-anchor="middle">Archivo No Encontrado en el Servidor</text>
                <text x="300" y="210" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">El comprobante (' . htmlspecialchars($safeFilename, ENT_QUOTES) . ') no existe en el almacenamiento.</text>
                <text x="300" y="240" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#dc2626" text-anchor="middle">Por favor vuelva a adjuntar la justificación desde el panel de faltas.</text>
            </svg>';

            return response($svg, 200, [
                'Content-Type' => 'image/svg+xml',
                'Cache-Control' => 'no-cache',
            ]);
        }

        $extension = strtolower(pathinfo($foundPath, PATHINFO_EXTENSION));
        $contentTypes = [
            'pdf' => 'application/pdf',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
        ];

        $contentType = $contentTypes[$extension] ?? (mime_content_type($foundPath) ?: 'application/octet-stream');

        return response()->file($foundPath, [
            'Content-Type' => $contentType,
            'Content-Disposition' => 'inline; filename="' . $safeFilename . '"',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Retorna el resumen mensual de asistencias e inasistencias por conductor para el módulo de Control de Personas Conductoras.
     */
    public function resumenInasistencias(Request $request)
    {
        $mesStr = $request->query('mes'); // Formato YYYY-MM
        if (!$mesStr || !preg_match('/^\d{4}-\d{2}$/', $mesStr)) {
            $mesStr = date('Y-m');
        }

        try {
            $startOfMonth = \Carbon\Carbon::parse($mesStr . '-01')->startOfMonth();
            $endOfMonth = \Carbon\Carbon::parse($mesStr . '-01')->endOfMonth();
        } catch (\Throwable $e) {
            $startOfMonth = \Carbon\Carbon::now()->startOfMonth();
            $endOfMonth = \Carbon\Carbon::now()->endOfMonth();
            $mesStr = \Carbon\Carbon::now()->format('Y-m');
        }

        $daysInMonth = $startOfMonth->daysInMonth;

        $nombresMeses = [
            '01' => 'ENERO', '02' => 'FEBRERO', '03' => 'MARZO', '04' => 'ABRIL',
            '05' => 'MAYO', '06' => 'JUNIO', '07' => 'JULIO', '08' => 'AGOSTO',
            '09' => 'SEPTIEMBRE', '10' => 'OCTUBRE', '11' => 'NOVIEMBRE', '12' => 'DICIEMBRE'
        ];
        $mesNum = $startOfMonth->format('m');
        $nombreMes = ($nombresMeses[$mesNum] ?? 'MES') . ' ' . $startOfMonth->format('Y');

        // Obtener lista de conductores
        $conductores = Conductor::where('estatus', '!=', 'baja')
            ->orWhereNull('estatus')
            ->get();

        // Obtener historial operativo de asistencias validadas en el mes
        $historialMap = []; // [tarjetonNormalizado][YYYY-MM-DD] = true
        
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('historial_operativo')) {
                $registrosHistorial = DB::table('historial_operativo')
                    ->whereBetween('fecha_historial', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                    ->whereNotNull('numero_tarjeton')
                    ->where('numero_tarjeton', '!=', '')
                    ->whereNotNull('hora_real_salida_patio')
                    ->where('hora_real_salida_patio', '!=', '')
                    ->where('hora_real_salida_patio', '!=', '00:00:00')
                    ->where('hora_real_salida_patio', '!=', '00:00')
                    ->select('fecha_historial', 'numero_tarjeton')
                    ->get();

                foreach ($registrosHistorial as $h) {
                    $tarjNorm = preg_replace('/\D/', '', (string)$h->numero_tarjeton);
                    if ($tarjNorm) {
                        $historialMap[$tarjNorm][$h->fecha_historial] = true;
                    }
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Error consultando historial_operativo para resumen: ' . $e->getMessage());
        }

        // Consultar informacion_operativa si el mes incluye el día de hoy
        $todayStr = date('Y-m-d');
        if ($todayStr >= $startOfMonth->toDateString() && $todayStr <= $endOfMonth->toDateString()) {
            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('informacion_operativa')) {
                    $hoyOps = DB::table('informacion_operativa')
                        ->whereNotNull('numero_tarjeton')
                        ->where('numero_tarjeton', '!=', '')
                        ->whereNotNull('hora_real_salida_patio')
                        ->where('hora_real_salida_patio', '!=', '')
                        ->where('hora_real_salida_patio', '!=', '00:00:00')
                        ->where('hora_real_salida_patio', '!=', '00:00')
                        ->select('numero_tarjeton')
                        ->get();

                    foreach ($hoyOps as $op) {
                        $tarjNorm = preg_replace('/\D/', '', (string)$op->numero_tarjeton);
                        if ($tarjNorm) {
                            $historialMap[$tarjNorm][$todayStr] = true;
                        }
                    }
                }
            } catch (\Throwable $e) {
                \Log::error('Error consultando informacion_operativa para resumen: ' . $e->getMessage());
            }
        }

        // Procesar matriz por conductor
        $resultado = [];

        foreach ($conductores as $c) {
            $tarjetonRaw = $c->tarjeton ?: '';
            $tarjetonNum = preg_replace('/\D/', '', $tarjetonRaw);
            
            // Faltas del conductor
            $rawDetalle = $c->faltas_detalle;
            $faltasDetalle = [];
            if (is_array($rawDetalle)) {
                $faltasDetalle = $rawDetalle;
            } elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
                $parsed = json_decode($rawDetalle, true);
                if (is_array($parsed)) $faltasDetalle = $parsed;
            }

            $faltasFechasMap = [];
            foreach ($faltasDetalle as $f) {
                $fFecha = $f['fecha'] ?? null;
                if ($fFecha && $fFecha !== 'Fecha sin registrar') {
                    $fFechaClean = substr($fFecha, 0, 10);
                    $faltasFechasMap[$fFechaClean] = true;
                }
            }

            // Si el estado de servicio es 'falta' y hoy cae en el mes
            if ($c->estado_servicio === 'falta' && $todayStr >= $startOfMonth->toDateString() && $todayStr <= $endOfMonth->toDateString()) {
                $faltasFechasMap[$todayStr] = true;
            }

            $diasMatriz = [];
            $countA = 0;
            $countD = 0;
            $countV = 0;
            $countI = 0;
            $countF = 0;

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $dayKey = sprintf('%02d', $day);
                $dateStr = $startOfMonth->copy()->day($day)->format('Y-m-d');

                $codigo = null;

                if (isset($faltasFechasMap[$dateStr])) {
                    $codigo = 'F';
                    $countF++;
                } elseif ($tarjetonNum && isset($historialMap[$tarjetonNum][$dateStr])) {
                    $codigo = 'A';
                    $countA++;
                }

                $diasMatriz[$dayKey] = $codigo;
            }

            $resultado[] = [
                'id' => $c->id,
                'tarjeton' => $c->tarjeton,
                'nombre' => $c->nombre,
                'resumen' => [
                    'A' => $countA,
                    'D' => $countD,
                    'V' => $countV,
                    'I' => $countI,
                    'F' => $countF,
                ],
                'dias' => $diasMatriz,
            ];
        }

        // Ordenar por número numérico de tarjetón
        usort($resultado, function ($a, $b) {
            $numA = (int)preg_replace('/\D/', '', $a['tarjeton'] ?? '');
            $numB = (int)preg_replace('/\D/', '', $b['tarjeton'] ?? '');
            return $numA <=> $numB;
        });

        return response()->json([
            'mes' => $mesStr,
            'nombre_mes' => $nombreMes,
            'dias_mes' => $daysInMonth,
            'conductores' => $resultado,
        ]);
    }
}
