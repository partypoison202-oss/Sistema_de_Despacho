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
            'estatus' => 'activo'
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
            'estado_servicio' => 'sometimes|required|string|in:disponible,en_servicio,falta'
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

        $conductor->save();

        return response()->json([
            'message' => 'Operador actualizado correctamente',
            'conductor' => $conductor
        ]);
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
