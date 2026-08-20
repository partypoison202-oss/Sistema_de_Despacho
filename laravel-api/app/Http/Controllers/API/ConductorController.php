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
            'nombre' => 'required|string|max:200',
            'tipo_tarjeton' => 'required|string|max:50'
        ]);

        // Generar tarjetón de forma automática (iniciar a partir del 1080 si no hay mayores)
        $maxNum = 1079;
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
        $nuevoNumero = $maxNum + 1;
        $tarjetonGenerado = "TJ-" . $nuevoNumero;

        // Asegurar unicidad si por algún motivo existe
        while (DB::table('conductores')->where('tarjeton', $tarjetonGenerado)->exists()) {
            $nuevoNumero++;
            $tarjetonGenerado = "TJ-" . $nuevoNumero;
        }

        $conductor = Conductor::create([
            'nombre' => trim($request->nombre),
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
            'nombre' => 'sometimes|required|string|max:200',
            'tipo_tarjeton' => 'sometimes|required|string|max:50',
            'estado_servicio' => 'sometimes|required|string|in:disponible,en_servicio,falta,maniobrista,permuta',
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
            'sexo' => 'sometimes|nullable|string|in:Masculino,Femenino',
            'fecha_nacimiento' => 'sometimes|nullable|date',
            'telefono' => 'sometimes|nullable|string|max:50',
            'referencia_1' => 'sometimes|nullable|string|max:200',
            'referencia_2' => 'sometimes|nullable|string|max:200',
            'fecha_ingreso' => 'sometimes|nullable|date',
            'amonestaciones_detalle' => 'sometimes|array',
            'reconocimientos_detalle' => 'sometimes|array',
            'permisos_detalle' => 'sometimes|array',
            'permutas_detalle' => 'sometimes|array',
            'accidentes_siniestros_detalle' => 'sometimes|array'
        ]);

        if ($request->has('nombre')) {
            $conductor->nombre = trim($request->nombre);
        }

        if ($request->has('tipo_tarjeton')) {
            $conductor->tipo_tarjeton = trim($request->tipo_tarjeton);
        }

        if ($request->has('estado_servicio')) {
            $nuevoEstado = $request->estado_servicio;
            $conductor->estado_servicio = $nuevoEstado;

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
            $filename = 'conductor_' . $id . '_' . time() . '.' . $file->getClientOriginalExtension();
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
}
