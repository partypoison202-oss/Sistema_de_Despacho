<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Conductor;
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

        // Filtrar sólo operadores activos (no dados de baja) por defecto
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
            $tarjetonClean = trim($c->tarjeton ?? '');
            $estaAsignado = false;
            foreach ($asignaciones as $t) {
                if (trim($t) === $tarjetonClean) {
                    $estaAsignado = true;
                    break;
                }
            }
            if ($c->estatus === 'baja') {
                $c->estado_servicio = null;
            } elseif ($c->estado_servicio === 'maniobrista') {
                // Respetar siempre el estado maniobrista, aunque esté asignado
                $c->estado_servicio = 'maniobrista';
            } else {
                $c->estado_servicio = $estaAsignado ? 'en_servicio' : ($c->estado_servicio ?? 'disponible');
            }
            return $c;
        });

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
            'justificante' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240', // Max 10MB
            'falta_id' => 'nullable|string',
            'falta_index' => 'nullable|integer',
            'observaciones' => 'nullable|string|max:1000',
            'fecha_falta' => 'nullable|string',
            'motivo_falta' => 'nullable|string',
        ]);

        $conductor = Conductor::findOrFail($id);

        if ($request->hasFile('justificante')) {
            $file = $request->file('justificante');
            $extension = strtolower($file->extension() ?: $file->guessExtension() ?: 'pdf');
            $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
            if (!in_array($extension, $allowedExtensions, true)) {
                $extension = 'pdf';
            }
            $safeOriginalName = htmlspecialchars(basename($file->getClientOriginalName()), ENT_QUOTES, 'UTF-8');
            $filename = 'justificante_' . (int)$id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            $path = $file->storeAs('justificantes', $filename, 'public');

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
                    $item['justificante_url'] = '/storage/' . $path;
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
                    'justificante_url' => '/storage/' . $path,
                    'justificante_nombre' => $safeOriginalName,
                    'justificante_fecha' => date('Y-m-d H:i'),
                    'observaciones_justificacion' => $request->input('observaciones') ?: 'Justificante adjuntado correctamente',
                ];
            }

            $conductor->faltas_detalle = $detalle;

            if ($conductor->faltas > 0) {
                $conductor->faltas = max(0, (int)$conductor->faltas - 1);
            }

            $conductor->save();

            return response()->json([
                'status' => 'success',
                'message' => 'Falta justificada correctamente. El comprobante fue almacenado y la falta fue descontada del historial activo.',
                'justificante_url' => '/storage/' . $path,
                'conductor' => $conductor
            ], 200);
        }

        return response()->json(['status' => 'error', 'message' => 'No se proporcionó ningún archivo justificante.'], 400);
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
        $conductor->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Falta registrada correctamente.',
            'conductor' => $conductor
        ], 200);
    }
}
