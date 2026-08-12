<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Maniobrista;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class ManiobristaController extends Controller
{
    private function ensureColumnsExist()
    {
        try {
            if (!Schema::hasColumn('maniobristas', 'estatus')) {
                Schema::table('maniobristas', function (Blueprint $table) {
                    $table->string('estatus', 20)->default('activo');
                });
            }
            if (!Schema::hasColumn('maniobristas', 'tipo_tarjeton')) {
                Schema::table('maniobristas', function (Blueprint $table) {
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

        $query = Maniobrista::query();

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

        $maniobristas = $query->get()->map(function ($c) use ($asignaciones) {
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

        return response()->json($maniobristas);
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
        $existingTarjetones = DB::table('maniobristas')->pluck('tarjeton');
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
        while (DB::table('maniobristas')->where('tarjeton', $tarjetonGenerado)->exists()) {
            $nuevoNumero++;
            $tarjetonGenerado = "TJ-" . $nuevoNumero;
        }

        $maniobrista = Maniobrista::create([
            'nombre' => trim($request->nombre),
            'tarjeton' => $tarjetonGenerado,
            'tipo_tarjeton' => trim($request->tipo_tarjeton),
            'estado_servicio' => 'disponible',
            'estatus' => 'activo'
        ]);

        return response()->json([
            'message' => 'Maniobrista registrado correctamente',
            'maniobrista' => $maniobrista
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $this->ensureColumnsExist();

        $maniobrista = Maniobrista::findOrFail($id);

        $request->validate([
            'nombre' => 'sometimes|required|string|max:200',
            'tipo_tarjeton' => 'sometimes|required|string|max:50',
            'estado_servicio' => 'sometimes|required|string|in:disponible,en_servicio,falta'
        ]);

        if ($request->has('nombre')) {
            $maniobrista->nombre = trim($request->nombre);
        }

        if ($request->has('tipo_tarjeton')) {
            $maniobrista->tipo_tarjeton = trim($request->tipo_tarjeton);
        }

        if ($request->has('estado_servicio')) {
            $nuevoEstado = $request->estado_servicio;
            $maniobrista->estado_servicio = $nuevoEstado;

            // Si el nuevo estado NO es en_servicio, y el maniobrista estaba asignado a alguna unidad,
            // desvincular al maniobrista de la unidad
            if ($nuevoEstado !== 'en_servicio') {
                DB::table('informacion_operativa')
                    ->where('numero_tarjeton', $maniobrista->tarjeton)
                    ->update([
                        'numero_tarjeton' => null,
                        'nombre_maniobrista' => null
                    ]);
            }
        }

        $maniobrista->save();

        return response()->json([
            'message' => 'Maniobrista actualizado correctamente',
            'maniobrista' => $maniobrista
        ]);
    }

    public function darDeBaja(Request $request, $id)
    {
        $this->ensureColumnsExist();

        // El rol de Programación no puede dar de baja a operadores
        if ($request->user() && $request->user()->role && $request->user()->role->codigo === 'PROGRAMACION') {
            return response()->json(['message' => 'El rol de Programación no tiene permiso para dar de baja operadores.'], 403);
        }

        $maniobrista = Maniobrista::findOrFail($id);
        $maniobrista->estatus = 'baja';
        $maniobrista->estado_servicio = null;
        $maniobrista->tipo_tarjeton = null;
        $maniobrista->save();

        return response()->json([
            'message' => 'Maniobrista dado de baja correctamente',
            'maniobrista' => $maniobrista
        ]);
    }
}
