<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Conductor;
use App\Helpers\BitacoraConductorHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ConductorController extends Controller
{
    private function ensureColumnsExist()
    {
        try {
            if (Schema::hasTable('conductores')) {
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
            }
        } catch (\Throwable $e) {
            // Manejo silencioso si las columnas ya existen o si el driver de DB rechaza DDL durante GET
        }
    }

    public function index(Request $request)
    {
        @ini_set('memory_limit', '512M');
        try {
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
            $asignaciones = [];
            try {
                if (Schema::hasTable('informacion_operativa')) {
                    $asignaciones = DB::table('informacion_operativa')
                        ->whereNotNull('numero_tarjeton')
                        ->where('numero_tarjeton', '!=', '')
                        ->pluck('numero_tarjeton')
                        ->toArray();
                }
            } catch (\Throwable $e) {
                $asignaciones = [];
            }

            $conductores = $query->get()->map(function ($c) use ($asignaciones) {
                try {
                    // Evaluar regla de 4 faltas en 30 días
                    $eval = $c->evaluarInhabilitacionFaltas();
                    if (!empty($eval['inhabilitado']) && $c->estatus !== 'inhabilitado') {
                        $c->estatus = 'inhabilitado';
                        $c->estado_servicio = null;
                        try {
                            DB::table('conductores')->where('id', $c->id)->update([
                                'estatus' => 'inhabilitado',
                                'estado_servicio' => null
                            ]);
                            if (Schema::hasTable('informacion_operativa')) {
                                DB::table('informacion_operativa')
                                    ->where('numero_tarjeton', $c->tarjeton)
                                    ->update([
                                        'numero_tarjeton' => null,
                                        'nombre_conductor' => null
                                    ]);
                            }
                        } catch (\Throwable $e) {
                            // Ignorar errores de actualización en lectura
                        }
                    }
                } catch (\Throwable $e) {
                    // Ignorar error individual por registro
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
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Error al listar conductores: ' . $e->getMessage());
            return response()->json(['error' => 'Error al listar conductores', 'message' => $e->getMessage()], 500);
        }
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
            'accidentes_siniestros_detalle' => 'sometimes|array',
            'retardos_detalle' => 'sometimes|array'
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
            'accidentes_siniestros_detalle',
            'retardos_detalle'
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
            $fileContent = $file->getContent();
            $base64 = 'data:' . $file->getMimeType() . ';base64,' . base64_encode($fileContent);
            
            $conductor->foto = $base64;
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
                'foto_url' => $conductor->foto,
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
            $fileContent = $file->getContent();
            $base64 = 'data:' . $file->getMimeType() . ';base64,' . base64_encode($fileContent);
            
            $conductor->qr_documento = $base64;
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
                'qr_url' => $conductor->qr_documento,
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

        // Validar plazo de 3 días naturales para poder justificar (omitido para Administradores)
        $user = $request->user() ?: auth('sanctum')->user();
        $isAdmin = false;
        if ($user) {
            $roleCode = strtoupper(trim($user->role->codigo ?? $user->rol ?? ''));
            if ($roleCode === 'ADMINISTRADOR') {
                $isAdmin = true;
            }
        }

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
            $targetFecha = $request->input('fecha_falta') ?: ($conductor->updated_at ? ($conductor->updated_at instanceof \DateTimeInterface ? $conductor->updated_at->format('Y-m-d') : (is_string($conductor->updated_at) ? substr($conductor->updated_at, 0, 10) : date('Y-m-d'))) : date('Y-m-d'));
        }

        if (!$isAdmin && $targetFecha && $targetFecha !== 'Fecha sin registrar') {
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
     * Elimina / anula una falta del expediente del conductor (exclusivo Administradores).
     */
    public function eliminarFalta(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $request->validate([
            'falta_id' => 'nullable|string',
            'falta_index' => 'nullable|integer',
            'fecha_falta' => 'nullable|string',
            'motivo_anulacion' => 'nullable|string|max:500',
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
        $eliminada = null;
        $nuevoDetalle = [];

        foreach ($detalle as $idx => $item) {
            $match = ($faltaId && isset($item['id']) && (string)$item['id'] === (string)$faltaId) ||
                     ($faltaIndex !== null && (int)$idx === (int)$faltaIndex);
            if ($match && $eliminada === null) {
                $eliminada = $item;
            } else {
                $nuevoDetalle[] = $item;
            }
        }

        // Si la falta no estaba explícita en el array (ej. generada como conteo)
        if ($eliminada === null && $conductor->faltas > 0) {
            $eliminada = [
                'fecha' => $request->input('fecha_falta') ?: date('Y-m-d'),
                'motivo' => 'Falta eliminada por ajuste manual'
            ];
        }

        $conductor->faltas_detalle = array_values($nuevoDetalle);

        $eraJustificada = isset($eliminada['estado']) && ($eliminada['estado'] === 'justificada' || !empty($eliminada['justificada']));
        if (!$eraJustificada && $conductor->faltas > 0) {
            $conductor->faltas = max(0, (int)$conductor->faltas - 1);
        }

        // Reevaluar inhabilitación
        $eval = $conductor->evaluarInhabilitacionFaltas();
        if ($conductor->estatus === 'inhabilitado' && !$eval['inhabilitado']) {
            $conductor->estatus = 'activo';
            $conductor->estado_servicio = 'disponible';
        }

        $conductor->save();

        $fechaFalta = $eliminada['fecha'] ?? ($request->input('fecha_falta') ?: 'Fecha no especificada');
        $motivoAnulacion = $request->input('motivo_anulacion') ?: 'Eliminación autorizada por Administrador';

        BitacoraConductorHelper::registrarAccion(
            $conductor->id,
            $conductor->tarjeton,
            $conductor->nombres . ' ' . $conductor->apellidos,
            'FALTA_ELIMINADA',
            "Falta del día {$fechaFalta} eliminada del expediente por Administrador. Motivo: {$motivoAnulacion}",
            $request
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Falta eliminada correctamente del expediente del operador.',
            'conductor' => $conductor
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

    private function normalizarTexto($str)
    {
        if (empty($str)) return '';
        $str = mb_strtoupper(trim($str), 'UTF-8');
        $unwantedArray = [
            'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U', 'Ü'=>'U', 'Ñ'=>'N'
        ];
        $str = strtr($str, $unwantedArray);
        return preg_replace('/\s+/', ' ', $str);
    }

    /**
     * Obtiene el historial operativo y administrativo completo de un conductor en un rango de fechas.
     */
    public function getHistorialCompleto(Request $request, $id)
    {
        try {
            $this->ensureColumnsExist();

            // 1. Buscar conductor por ID o por Tarjetón
            $conductor = Conductor::where('id', $id)
                ->orWhere('tarjeton', $id)
                ->first();

            if (!$conductor) {
                return response()->json(['error' => 'Persona conductora no encontrada'], 404);
            }

            // 2. Rango de fechas
            $desdeParam = $request->query('desde');
            $hastaParam = $request->query('hasta');

            if ($desdeParam) {
                $desde = Carbon::parse($desdeParam)->startOfDay();
            } else {
                $desde = Carbon::today()->subDays(30)->startOfDay();
            }

            if ($hastaParam) {
                $hasta = Carbon::parse($hastaParam)->endOfDay();
            } else {
                $hasta = Carbon::today()->endOfDay();
            }

            if ($desde->gt($hasta)) {
                $tmp = $desde;
                $desde = $hasta;
                $hasta = $tmp;
            }

            $desdeStr = $desde->toDateString();
            $hastaStr = $hasta->toDateString();

            $period = CarbonPeriod::create($desdeStr, $hastaStr);
            $fechasPeriodo = [];
            foreach ($period as $date) {
                $fechasPeriodo[] = $date->format('Y-m-d');
            }

            $tarjetonRaw = trim((string)($conductor->tarjeton ?? ''));
            $tarjetonNum = (string)(int)preg_replace('/\D/', '', $tarjetonRaw);
            $nombreNorm = $this->normalizarTexto($conductor->nombres . ' ' . $conductor->apellidos);

            $eventos = [];

            // 3. Obtener Asistencias de Despacho (historial_operativo)
            if (Schema::hasTable('historial_operativo')) {
                try {
                    $historialQuery = DB::table('historial_operativo')
                        ->leftJoin('unidades', 'historial_operativo.unidad_id', '=', 'unidades.id')
                        ->whereBetween('historial_operativo.fecha_historial', [$desdeStr, $hastaStr])
                        ->select(
                            'historial_operativo.*',
                            'unidades.numero_economico as unidad_economico',
                            'unidades.tipo_transporte as unidad_tipo'
                        );

                    $registrosHistorial = $historialQuery->get();

                    foreach ($registrosHistorial as $h) {
                        $fechaH = $h->fecha_historial;
                        $tTitular = trim((string)($h->numero_tarjeton ?? ''));
                        $tTitularNum = (string)(int)preg_replace('/\D/', '', $tTitular);
                        $nTitularNorm = $this->normalizarTexto($h->nombre_conductor ?? '');

                        $tRelevo = trim((string)($h->relevo_tarjeton ?? ''));
                        $tRelevoNum = (string)(int)preg_replace('/\D/', '', $tRelevo);
                        $nRelevoNorm = $this->normalizarTexto($h->relevo_conductor ?? '');

                        $esTitular = ($tarjetonRaw && $tTitular === $tarjetonRaw) ||
                                     ($tarjetonNum !== '0' && $tTitularNum === $tarjetonNum) ||
                                     ($nombreNorm && $nTitularNorm && str_contains($nTitularNorm, $nombreNorm));

                        $esRelevo = ($tarjetonRaw && $tRelevo === $tarjetonRaw) ||
                                    ($tarjetonNum !== '0' && $tRelevoNum === $tarjetonNum) ||
                                    ($nombreNorm && $nRelevoNorm && str_contains($nRelevoNorm, $nombreNorm));

                        if ($esTitular || $esRelevo) {
                            $eco = $h->unidad_economico ?? 'S/N';
                            $tipoTrans = $h->unidad_tipo ?? $h->tipo ?? 'Autobús';
                            $ruta = $h->ruta ?: 'Ruta asignada';
                            $horaSal = $h->hora_salida ?: ($h->hora_programada ?: 'En horario');
                            $subtipo = $esRelevo ? 'RELEVO' : 'DESPACHO_REGULAR';
                            $titulo = $esRelevo ? "Asistencia en Relevo (Unidad {$eco})" : "Asistencia en Despacho (Unidad {$eco})";
                            $detalles = "Ruta: {$ruta} | Salida: {$horaSal}";
                            if (!empty($h->momento)) $detalles .= " | Momento: {$h->momento}";
                            if (!empty($h->observaciones)) $detalles .= " | Obs: {$h->observaciones}";

                            $eventos[] = [
                                'id' => 'despacho_' . $h->id,
                                'fecha' => $fechaH,
                                'created_at' => $h->fecha_registro ?? $h->created_at ?? ($fechaH . ' 06:00:00'),
                                'tipo' => 'ASISTENCIA',
                                'subtipo' => $subtipo,
                                'titulo' => $titulo,
                                'descripcion' => "Servicio de transporte despachado en Ruta {$ruta}",
                                'detalles' => $detalles,
                                'origen' => 'Despacho Operativo',
                                'usuario' => 'Despacho',
                                'badge_color' => '#15803d',
                                'badge_bg' => '#dcfce7',
                                'icono' => 'bus',
                                'meta' => [
                                    'unidad' => $eco,
                                    'tipo_transporte' => $tipoTrans,
                                    'ruta' => $ruta,
                                    'hora_salida' => $h->hora_salida,
                                    'hora_programada' => $h->hora_programada,
                                    'es_relevo' => $esRelevo,
                                    'observaciones' => $h->observaciones
                                ]
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::error('Error consultando historial_operativo en historial conductor: ' . $e->getMessage());
                }
            }

            // 4. Asistencia hoy en informacion_operativa
            $hoyStr = Carbon::today()->toDateString();
            if ($hoyStr >= $desdeStr && $hoyStr <= $hastaStr && Schema::hasTable('informacion_operativa')) {
                try {
                    $hoyOps = DB::table('informacion_operativa')
                        ->leftJoin('unidades', 'informacion_operativa.unidad_id', '=', 'unidades.id')
                        ->select(
                            'informacion_operativa.*',
                            'unidades.numero_economico as unidad_economico',
                            'unidades.tipo_transporte as unidad_tipo'
                        )
                        ->get();

                    foreach ($hoyOps as $op) {
                        $tTitular = trim((string)($op->numero_tarjeton ?? ''));
                        $tTitularNum = (string)(int)preg_replace('/\D/', '', $tTitular);
                        $nTitularNorm = $this->normalizarTexto($op->nombre_conductor ?? '');

                        $tRelevo = trim((string)($op->relevo_tarjeton ?? ''));
                        $tRelevoNum = (string)(int)preg_replace('/\D/', '', $tRelevo);
                        $nRelevoNorm = $this->normalizarTexto($op->relevo_conductor ?? '');

                        $esTitular = ($tarjetonRaw && $tTitular === $tarjetonRaw) ||
                                     ($tarjetonNum !== '0' && $tTitularNum === $tarjetonNum) ||
                                     ($nombreNorm && $nTitularNorm && str_contains($nTitularNorm, $nombreNorm));

                        $esRelevo = ($tarjetonRaw && $tRelevo === $tarjetonRaw) ||
                                    ($tarjetonNum !== '0' && $tRelevoNum === $tarjetonNum) ||
                                    ($nombreNorm && $nRelevoNorm && str_contains($nRelevoNorm, $nombreNorm));

                        if ($esTitular || $esRelevo) {
                            $eco = $op->unidad_economico ?? 'S/N';
                            $tipoTrans = $op->unidad_tipo ?? 'Autobús';
                            $ruta = $op->ruta ?: 'Ruta activa hoy';

                            // Solo agregar si no fue agregado previamente
                            $yaExiste = collect($eventos)->contains(fn($ev) => $ev['fecha'] === $hoyStr && $ev['tipo'] === 'ASISTENCIA' && ($ev['meta']['unidad'] ?? '') === $eco);

                            if (!$yaExiste) {
                                $eventos[] = [
                                    'id' => 'hoy_despacho_' . $op->id,
                                    'fecha' => $hoyStr,
                                    'created_at' => Carbon::now()->toDateTimeString(),
                                    'tipo' => 'ASISTENCIA',
                                    'subtipo' => $esRelevo ? 'RELEVO_HOY' : 'DESPACHO_HOY',
                                    'titulo' => $esRelevo ? "Asistencia en Relevo Hoy (Unidad {$eco})" : "Asistencia Activa Hoy (Unidad {$eco})",
                                    'descripcion' => "Asignación activa en Despacho en Ruta {$ruta}",
                                    'detalles' => "Ruta: {$ruta} | Estado: Activo en servicio",
                                    'origen' => 'Despacho en Vivo',
                                    'usuario' => 'Despacho',
                                    'badge_color' => '#15803d',
                                    'badge_bg' => '#dcfce7',
                                    'icono' => 'bus',
                                    'meta' => [
                                        'unidad' => $eco,
                                        'tipo_transporte' => $tipoTrans,
                                        'ruta' => $ruta,
                                        'es_relevo' => $esRelevo
                                    ]
                                ];
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::error('Error consultando informacion_operativa en historial conductor: ' . $e->getMessage());
                }
            }

            // 5. Parsear JSONs del Conductor
            $parseArray = function ($json) {
                if (empty($json)) return [];
                if (is_array($json)) return $json;
                if (is_string($json)) {
                    $d = json_decode($json, true);
                    return is_array($d) ? $d : [];
                }
                return [];
            };

            $faltasDetalle = $parseArray($conductor->faltas_detalle);
            $retardosDetalle = $parseArray($conductor->retardos_detalle);
            $permutasDetalle = $parseArray($conductor->permutas_detalle);
            $permisosDetalle = $parseArray($conductor->permisos_detalle);
            $descansosDetalle = $parseArray($conductor->descansos_detalle);
            $vacacionesDetalle = $parseArray($conductor->vacaciones_detalle);
            $incapacidadesDetalle = $parseArray($conductor->incapacidades_detalle);
            $amonestacionesDetalle = $parseArray($conductor->amonestaciones_detalle);
            $accidentesDetalle = $parseArray($conductor->accidentes_siniestros_detalle);

            // A. Faltas y Faltas Justificadas
            foreach ($faltasDetalle as $idx => $f) {
                $fFecha = $f['fecha'] ?? null;
                if (!$fFecha || $fFecha === 'Fecha sin registrar') continue;
                $fFechaStr = substr((string)$fFecha, 0, 10);
                if ($fFechaStr < $desdeStr || $fFechaStr > $hastaStr) continue;

                $esRetardo = (isset($f['estado']) && $f['estado'] === 'retardo');
                $esJustificada = (isset($f['estado']) && $f['estado'] === 'justificada') || !empty($f['justificada']);

                if ($esRetardo) {
                    $eventos[] = [
                        'id' => $f['id'] ?? ('ret_falta_' . $idx),
                        'fecha' => $fFechaStr,
                        'created_at' => $f['fecha_registro'] ?? ($fFechaStr . ' 08:00:00'),
                        'tipo' => 'RETARDO',
                        'subtipo' => 'RETARDO',
                        'titulo' => 'Retardo Registrado',
                        'descripcion' => $f['motivo'] ?? 'Llegada tarde a turno operativo',
                        'detalles' => 'Incidencia de retardo registrada',
                        'origen' => 'Control de Operadores',
                        'usuario' => $f['usuario'] ?? 'Administrador',
                        'badge_color' => '#a16207',
                        'badge_bg' => '#fef9c3',
                        'icono' => 'clock',
                        'meta' => $f
                    ];
                } elseif ($esJustificada) {
                    $motivoJust = $f['motivo_justificacion'] ?? ($f['justificante'] ?? 'Justificante presentado y autorizado');
                    $eventos[] = [
                        'id' => $f['id'] ?? ('falta_j_' . $idx),
                        'fecha' => $fFechaStr,
                        'created_at' => $f['fecha_justificacion'] ?? ($f['fecha_registro'] ?? ($fFechaStr . ' 08:00:00')),
                        'tipo' => 'FALTA_JUSTIFICADA',
                        'subtipo' => 'JUSTIFICADA',
                        'titulo' => 'Falta Justificada',
                        'descripcion' => $f['motivo'] ?? 'Inasistencia con justificación autorizada',
                        'detalles' => "Justificante: {$motivoJust}" . (!empty($f['fecha_justificacion']) ? " (Fecha de justificación: {$f['fecha_justificacion']})" : ''),
                        'origen' => 'Control de Operadores',
                        'usuario' => $f['usuario_justifico'] ?? ($f['usuario'] ?? 'Administrador'),
                        'badge_color' => '#047857',
                        'badge_bg' => '#d1fae5',
                        'icono' => 'check-circle',
                        'meta' => $f
                    ];
                } else {
                    $eventos[] = [
                        'id' => $f['id'] ?? ('falta_' . $idx),
                        'fecha' => $fFechaStr,
                        'created_at' => $f['fecha_registro'] ?? ($fFechaStr . ' 08:00:00'),
                        'tipo' => 'FALTA',
                        'subtipo' => 'INJUSTIFICADA',
                        'titulo' => 'Falta Injustificada',
                        'descripcion' => $f['motivo'] ?? 'Inasistencia injustificada en turno',
                        'detalles' => 'Falta no amparada por justificante médico ni permiso',
                        'origen' => 'Control de Operadores',
                        'usuario' => $f['usuario'] ?? 'Administrador',
                        'badge_color' => '#b91c1c',
                        'badge_bg' => '#fee2e2',
                        'icono' => 'alert-triangle',
                        'meta' => $f
                    ];
                }
            }

            // B. Retardos adicionales de retardos_detalle
            foreach ($retardosDetalle as $idx => $r) {
                $rFecha = $r['fecha'] ?? null;
                if (!$rFecha || $rFecha === 'Fecha sin registrar') continue;
                $rFechaStr = substr((string)$rFecha, 0, 10);
                if ($rFechaStr < $desdeStr || $rFechaStr > $hastaStr) continue;

                $rId = $r['id'] ?? null;
                $yaExiste = collect($eventos)->contains(fn($ev) => $ev['tipo'] === 'RETARDO' && ($ev['id'] === $rId || $ev['fecha'] === $rFechaStr));

                if (!$yaExiste) {
                    $eventos[] = [
                        'id' => $rId ?: ('retardo_' . $idx),
                        'fecha' => $rFechaStr,
                        'created_at' => $r['fecha_registro'] ?? ($rFechaStr . ' 08:00:00'),
                        'tipo' => 'RETARDO',
                        'subtipo' => 'RETARDO',
                        'titulo' => 'Retardo Registrado',
                        'descripcion' => $r['motivo'] ?? 'Retardo registrado en sistema',
                        'detalles' => 'Incidencia de retardo en turno',
                        'origen' => 'Control de Operadores',
                        'usuario' => $r['usuario'] ?? 'Administrador',
                        'badge_color' => '#a16207',
                        'badge_bg' => '#fef9c3',
                        'icono' => 'clock',
                        'meta' => $r
                    ];
                }
            }

            // C. Permutas
            foreach ($permutasDetalle as $idx => $p) {
                $pFecha = $p['fecha'] ?? null;
                if (!$pFecha) continue;
                $pFechaStr = substr((string)$pFecha, 0, 10);
                if ($pFechaStr < $desdeStr || $pFechaStr > $hastaStr) continue;

                $tipoP = $p['tipo'] ?? 'PERMUTA';
                $esAP = ($tipoP === 'AP');
                $esDP = ($tipoP === 'DP');

                $relNombre = $p['conductor_relacionado_nombre'] ?? '';
                $relTarjeton = $p['conductor_relacionado_tarjeton'] ?? '';
                $relTexto = ($relNombre || $relTarjeton) ? "Intercambio con [{$relTarjeton}] {$relNombre}" : '';

                $eventos[] = [
                    'id' => $p['id'] ?? ('permuta_' . $idx),
                    'fecha' => $pFechaStr,
                    'created_at' => $p['fecha_registro'] ?? ($pFechaStr . ' 08:00:00'),
                    'tipo' => $esAP ? 'PERMUTA_AP' : ($esDP ? 'PERMUTA_DP' : 'PERMUTA'),
                    'subtipo' => $tipoP,
                    'titulo' => $esAP ? 'Permuta: Asistencia Cubierta (AP)' : ($esDP ? 'Permuta: Descanso Autorizado (DP)' : 'Permuta de Turno'),
                    'descripcion' => $p['motivo'] ?? 'Permuta acordada entre conductores',
                    'detalles' => $relTexto ? "{$relTexto} | Motivo: " . ($p['motivo'] ?? 'S/N') : ($p['motivo'] ?? 'Permuta registrada'),
                    'origen' => 'Itinerario / Programación',
                    'usuario' => $p['usuario'] ?? 'Administrador',
                    'badge_color' => $esAP ? '#3730a3' : '#6d28d9',
                    'badge_bg' => $esAP ? '#e0e7ff' : '#ede9fe',
                    'icono' => 'repeat',
                    'meta' => $p
                ];
            }

            // D. Permisos
            foreach ($permisosDetalle as $idx => $pm) {
                $pmFecha = $pm['fecha'] ?? ($pm['desde'] ?? null);
                if (!$pmFecha) continue;
                $pmFechaStr = substr((string)$pmFecha, 0, 10);
                if ($pmFechaStr < $desdeStr || $pmFechaStr > $hastaStr) continue;

                $eventos[] = [
                    'id' => $pm['id'] ?? ('permiso_' . $idx),
                    'fecha' => $pmFechaStr,
                    'created_at' => $pm['fecha_registro'] ?? ($pmFechaStr . ' 08:00:00'),
                    'tipo' => 'PERMISO',
                    'subtipo' => $pm['tipo'] ?? 'ECONOMICO',
                    'titulo' => 'Permiso Autorizado',
                    'descripcion' => $pm['motivo'] ?? 'Permiso laboral con goce/sin goce autorizado',
                    'detalles' => (!empty($pm['dias']) ? "Duración: {$pm['dias']} día(s) | " : '') . "Motivo: " . ($pm['motivo'] ?? 'Permiso concedido'),
                    'origen' => 'Control de Operadores',
                    'usuario' => $pm['usuario'] ?? 'Administrador',
                    'badge_color' => '#0284c7',
                    'badge_bg' => '#e0f2fe',
                    'icono' => 'calendar-check',
                    'meta' => $pm
                ];
            }

            // E. Descansos
            foreach ($descansosDetalle as $idx => $d) {
                $dFecha = $d['fecha'] ?? null;
                if (!$dFecha) continue;
                $dFechaStr = substr((string)$dFecha, 0, 10);
                if ($dFechaStr < $desdeStr || $dFechaStr > $hastaStr) continue;

                $eventos[] = [
                    'id' => $d['id'] ?? ('descanso_' . $idx),
                    'fecha' => $dFechaStr,
                    'created_at' => $d['fecha_registro'] ?? ($dFechaStr . ' 08:00:00'),
                    'tipo' => 'DESCANSO',
                    'subtipo' => 'PROGRAMADO',
                    'titulo' => 'Descanso Programado',
                    'descripcion' => $d['motivo'] ?? 'Día de descanso semanal',
                    'detalles' => 'Descanso establecido en itinerario/programación',
                    'origen' => 'Itinerario / Programación',
                    'usuario' => $d['usuario'] ?? 'Sistema',
                    'badge_color' => '#9a3412',
                    'badge_bg' => '#fed7aa',
                    'icono' => 'coffee',
                    'meta' => $d
                ];
            }

            // F. Vacaciones
            foreach ($vacacionesDetalle as $idx => $v) {
                $vFecha = $v['fecha'] ?? null;
                if (!$vFecha) continue;
                $vFechaStr = substr((string)$vFecha, 0, 10);
                if ($vFechaStr < $desdeStr || $vFechaStr > $hastaStr) continue;

                $eventos[] = [
                    'id' => $v['id'] ?? ('vacaciones_' . $idx),
                    'fecha' => $vFechaStr,
                    'created_at' => $v['fecha_registro'] ?? ($vFechaStr . ' 08:00:00'),
                    'tipo' => 'VACACIONES',
                    'subtipo' => 'VACACIONES',
                    'titulo' => 'Periodo Vacacional',
                    'descripcion' => $v['motivo'] ?? 'Día de vacaciones disfrutado',
                    'detalles' => 'Vacaciones autorizadas y programadas',
                    'origen' => 'Control de Operadores',
                    'usuario' => $v['usuario'] ?? 'Recursos Humanos',
                    'badge_color' => '#854d0e',
                    'badge_bg' => '#fef08a',
                    'icono' => 'sun',
                    'meta' => $v
                ];
            }

            // G. Incapacidades
            foreach ($incapacidadesDetalle as $idx => $inc) {
                $incFecha = $inc['fecha'] ?? null;
                if (!$incFecha) continue;
                $incFechaStr = substr((string)$incFecha, 0, 10);
                if ($incFechaStr < $desdeStr || $incFechaStr > $hastaStr) continue;

                $eventos[] = [
                    'id' => $inc['id'] ?? ('incapacidad_' . $idx),
                    'fecha' => $incFechaStr,
                    'created_at' => $inc['fecha_registro'] ?? ($incFechaStr . ' 08:00:00'),
                    'tipo' => 'INCAPACIDAD',
                    'subtipo' => 'MEDICA',
                    'titulo' => 'Incapacidad Médica',
                    'descripcion' => $inc['motivo'] ?? 'Incapacidad médica expedida',
                    'detalles' => 'Amparada por dictamen médico oficial',
                    'origen' => 'Control de Operadores',
                    'usuario' => $inc['usuario'] ?? 'Servicios Médicos',
                    'badge_color' => '#1e40af',
                    'badge_bg' => '#bfdbfe',
                    'icono' => 'shield',
                    'meta' => $inc
                ];
            }

            // H. Amonestaciones y Sanciones
            foreach ($amonestacionesDetalle as $idx => $am) {
                $amFecha = $am['fecha'] ?? null;
                if (!$amFecha) continue;
                $amFechaStr = substr((string)$amFecha, 0, 10);
                if ($amFechaStr < $desdeStr || $amFechaStr > $hastaStr) continue;

                $eventos[] = [
                    'id' => $am['id'] ?? ('amonestacion_' . $idx),
                    'fecha' => $amFechaStr,
                    'created_at' => $am['fecha_registro'] ?? ($amFechaStr . ' 08:00:00'),
                    'tipo' => 'AMONESTACION',
                    'subtipo' => 'SANCION',
                    'titulo' => 'Amonestación Administrativa',
                    'descripcion' => $am['motivo'] ?? ($am['observaciones'] ?? 'Amonestación asentada'),
                    'detalles' => 'Acta o amonestación en expediente',
                    'origen' => 'Control de Operadores',
                    'usuario' => $am['usuario'] ?? 'Administrador',
                    'badge_color' => '#b45309',
                    'badge_bg' => '#fef3c7',
                    'icono' => 'alert-circle',
                    'meta' => $am
                ];
            }

            // I. Auditoría / Bitácora de Conductor
            if (Schema::hasTable('bitacora_conductores')) {
                try {
                    $bitacoras = DB::table('bitacora_conductores')
                        ->where(function ($q) use ($conductor) {
                            $q->where('conductor_id', $conductor->id)
                              ->orWhere('tarjeton', $conductor->tarjeton);
                        })
                        ->whereBetween('fecha', [$desdeStr, $hastaStr])
                        ->orderBy('created_at', 'desc')
                        ->get();

                    foreach ($bitacoras as $b) {
                        if (in_array($b->tipo_accion, ['CREACION', 'EDICION', 'BAJA', 'REINGRESO', 'SUBIR_FOTO', 'SUBIR_QR'])) {
                            $eventos[] = [
                                'id' => 'bitacora_' . $b->id,
                                'fecha' => $b->fecha,
                                'created_at' => $b->created_at,
                                'tipo' => 'BITACORA',
                                'subtipo' => $b->tipo_accion,
                                'titulo' => 'Auditoría: ' . $b->tipo_accion,
                                'descripcion' => $b->detalles ?: "Acción de {$b->tipo_accion} en expediente",
                                'detalles' => "Usuario auditor: " . ($b->usuario_nombre ?? 'Sistema'),
                                'origen' => 'Auditoría Operativa',
                                'usuario' => $b->usuario_nombre ?? 'Sistema',
                                'badge_color' => '#475569',
                                'badge_bg' => '#f1f5f9',
                                'icono' => 'file-text',
                                'meta' => (array)$b
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::error('Error consultando bitacora_conductores en historial: ' . $e->getMessage());
                }
            }

            // Ordenar todos los eventos cronológicamente (más recientes primero)
            usort($eventos, function ($a, $b) {
                $cmp = strcmp($b['fecha'], $a['fecha']);
                if ($cmp !== 0) return $cmp;
                return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
            });

            // Resumen Estadístico
            $totAsistencias = collect($eventos)->whereIn('tipo', ['ASISTENCIA', 'PERMUTA_AP'])->count();
            $totFaltasInj = collect($eventos)->where('tipo', 'FALTA')->count();
            $totFaltasJust = collect($eventos)->where('tipo', 'FALTA_JUSTIFICADA')->count();
            $totDescansos = collect($eventos)->whereIn('tipo', ['DESCANSO', 'PERMUTA_DP'])->count();
            $totPermutasAP = collect($eventos)->where('tipo', 'PERMUTA_AP')->count();
            $totPermutasDP = collect($eventos)->where('tipo', 'PERMUTA_DP')->count();
            $totPermisos = collect($eventos)->where('tipo', 'PERMISO')->count();
            $totVacaciones = collect($eventos)->where('tipo', 'VACACIONES')->count();
            $totIncapacidades = collect($eventos)->where('tipo', 'INCAPACIDAD')->count();
            $totRetardos = collect($eventos)->where('tipo', 'RETARDO')->count();
            $totAmonestaciones = collect($eventos)->where('tipo', 'AMONESTACION')->count();
            $totDespachosRelevo = collect($eventos)->where('subtipo', 'RELEVO')->count();

            $divisorLaboral = $totAsistencias + $totFaltasInj;
            $tasaAsistencia = $divisorLaboral > 0 ? round(($totAsistencias / $divisorLaboral) * 100, 1) : 100.0;

            // Matriz día a día en el rango
            $matrizDias = [];
            $eventosPorDia = [];
            foreach ($eventos as $ev) {
                $f = $ev['fecha'];
                if (!isset($eventosPorDia[$f])) {
                    $eventosPorDia[$f] = [];
                }
                $eventosPorDia[$f][] = $ev;
            }

            foreach ($fechasPeriodo as $fStr) {
                $evsDelDia = $eventosPorDia[$fStr] ?? [];
                $codigoPrincipal = '-';
                $etiqueta = 'Sin registro';

                if (!empty($evsDelDia)) {
                    $tipos = array_column($evsDelDia, 'tipo');
                    if (in_array('FALTA', $tipos)) {
                        $codigoPrincipal = 'F';
                        $etiqueta = 'Falta Injustificada';
                    } elseif (in_array('FALTA_JUSTIFICADA', $tipos)) {
                        $codigoPrincipal = 'FJ';
                        $etiqueta = 'Falta Justificada';
                    } elseif (in_array('INCAPACIDAD', $tipos)) {
                        $codigoPrincipal = 'I';
                        $etiqueta = 'Incapacidad';
                    } elseif (in_array('VACACIONES', $tipos)) {
                        $codigoPrincipal = 'V';
                        $etiqueta = 'Vacaciones';
                    } elseif (in_array('PERMUTA_AP', $tipos)) {
                        $codigoPrincipal = 'AP';
                        $etiqueta = 'Asistencia (Permuta)';
                    } elseif (in_array('PERMUTA_DP', $tipos)) {
                        $codigoPrincipal = 'DP';
                        $etiqueta = 'Descanso (Permuta)';
                    } elseif (in_array('DESCANSO', $tipos)) {
                        $codigoPrincipal = 'D';
                        $etiqueta = 'Descanso Programado';
                    } elseif (in_array('PERMISO', $tipos)) {
                        $codigoPrincipal = 'P';
                        $etiqueta = 'Permiso Autorizado';
                    } elseif (in_array('RETARDO', $tipos)) {
                        $codigoPrincipal = 'R';
                        $etiqueta = 'Retardo';
                    } elseif (in_array('ASISTENCIA', $tipos)) {
                        $codigoPrincipal = 'A';
                        $etiqueta = 'Asistencia en Despacho';
                    } else {
                        $codigoPrincipal = 'MOV';
                        $etiqueta = 'Movimiento en expediente';
                    }
                }

                $matrizDias[] = [
                    'fecha' => $fStr,
                    'dia_semana' => Carbon::parse($fStr)->locale('es')->isoFormat('dddd'),
                    'codigo' => $codigoPrincipal,
                    'etiqueta' => $etiqueta,
                    'eventos' => $evsDelDia
                ];
            }

            return response()->json([
                'conductor' => [
                    'id' => $conductor->id,
                    'tarjeton' => $conductor->tarjeton,
                    'nombres' => $conductor->nombres,
                    'apellidos' => $conductor->apellidos,
                    'nombre_completo' => $conductor->nombre ?: ($conductor->nombres . ' ' . $conductor->apellidos),
                    'foto' => $conductor->foto,
                    'tipo_tarjeton' => $conductor->tipo_tarjeton,
                    'estatus' => $conductor->estatus,
                    'estado_servicio' => $conductor->estado_servicio,
                    'puesto' => $conductor->puesto,
                    'categoria' => $conductor->categoria,
                    'turno' => $conductor->turno,
                    'jornada' => $conductor->jornada,
                    'telefono' => $conductor->telefono,
                    'fecha_ingreso' => $conductor->fecha_ingreso,
                    'inhabilitacion_info' => $conductor->evaluarInhabilitacionFaltas(),
                ],
                'rango' => [
                    'desde' => $desdeStr,
                    'hasta' => $hastaStr,
                    'dias_totales' => count($fechasPeriodo),
                ],
                'resumen' => [
                    'asistencias' => $totAsistencias,
                    'faltas_injustificadas' => $totFaltasInj,
                    'faltas_justificadas' => $totFaltasJust,
                    'faltas_totales' => $totFaltasInj + $totFaltasJust,
                    'descansos' => $totDescansos,
                    'permutas_ap' => $totPermutasAP,
                    'permutas_dp' => $totPermutasDP,
                    'permutas_totales' => $totPermutasAP + $totPermutasDP,
                    'permisos' => $totPermisos,
                    'vacaciones' => $totVacaciones,
                    'incapacidades' => $totIncapacidades,
                    'retardos' => $totRetardos,
                    'amonestaciones' => $totAmonestaciones,
                    'despachos_relevo' => $totDespachosRelevo,
                    'tasa_asistencia_pct' => $tasaAsistencia,
                    'total_eventos' => count($eventos),
                ],
                'eventos' => $eventos,
                'matriz_dias' => $matrizDias,
            ]);

        } catch (\Throwable $e) {
            \Log::error('Error en getHistorialCompleto: ' . $e->getMessage() . ' ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Error al obtener el historial completo del conductor: ' . $e->getMessage()
            ], 500);
        }
    }
}
