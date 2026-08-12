<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Maniobrista;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManiobristaController extends Controller
{
    public function index(Request $request)
    {
        $query = Maniobrista::query();

        // Filtrar sólo activos (no dados de baja) por defecto
        if (!$request->has('incluir_bajas') || $request->incluir_bajas !== 'true') {
            $query->where(function ($q) {
                $q->where('estatus', 'activo')
                  ->orWhereNull('estatus');
            });
        }

        $maniobristas = $query->get()->map(function ($m) {
            if ($m->estatus === 'baja') {
                $m->estado_servicio = null;
            } else {
                $m->estado_servicio = $m->estado_servicio ?? 'disponible';
            }
            return $m;
        });

        return response()->json($maniobristas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:200'
        ]);

        // Generar identificador de forma automática (iniciar a partir del 1080 si no hay mayores)
        $maxNum = 1079;
        $existing = DB::table('maniobristas')->pluck('identificador');
        foreach ($existing as $t) {
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
        $idGenerado = "MN-" . $nuevoNumero;

        // Asegurar unicidad si por algún motivo existe
        while (DB::table('maniobristas')->where('identificador', $idGenerado)->exists()) {
            $nuevoNumero++;
            $idGenerado = "MN-" . $nuevoNumero;
        }

        $maniobrista = Maniobrista::create([
            'nombre' => trim($request->nombre),
            'identificador' => $idGenerado,
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
        $maniobrista = Maniobrista::findOrFail($id);

        $request->validate([
            'nombre' => 'sometimes|required|string|max:200',
            'estado_servicio' => 'sometimes|required|string|in:disponible,en_servicio,falta'
        ]);

        if ($request->has('nombre')) {
            $maniobrista->nombre = trim($request->nombre);
        }

        if ($request->has('estado_servicio')) {
            $maniobrista->estado_servicio = $request->estado_servicio;
        }

        $maniobrista->save();

        return response()->json([
            'message' => 'Maniobrista actualizado correctamente',
            'maniobrista' => $maniobrista
        ]);
    }

    public function baja(Request $request, $id)
    {
        $maniobrista = Maniobrista::findOrFail($id);

        $user = $request->user();
        if ($user && $user->role && $user->role->name === 'PROGRAMACION') {
            return response()->json(['message' => 'El rol de Programación no tiene permiso para dar de baja maniobristas.'], 403);
        }

        $maniobrista->estatus = 'baja';
        $maniobrista->estado_servicio = null;
        $maniobrista->save();

        return response()->json([
            'message' => 'Maniobrista dado de baja correctamente',
            'maniobrista' => $maniobrista
        ]);
    }
}
