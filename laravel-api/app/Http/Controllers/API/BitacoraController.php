<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Bitacora;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BitacoraController extends Controller
{
    public function index()
    {
        try {
            $bitacoras = Bitacora::leftJoin('unidades', 'bitacoras.unidad', '=', 'unidades.numero_eco')
                ->leftJoin('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
                ->select('bitacoras.*', 'informacion_operativa.tipo as tipo_unidad')
                ->orderBy('bitacoras.created_at', 'desc')
                ->get();
            return response()->json($bitacoras);
        } catch (\Exception $e) {
            Log::error('Error fetching bitacoras: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener bitácoras'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'corrida' => 'nullable|string',
                'ruta' => 'nullable|string',
                'unidad' => 'nullable|string',
                'cambio_1' => 'nullable|string',
                'cambio_2' => 'nullable|string',
                'cambio_3' => 'nullable|string',
                'cambio_4' => 'nullable|string',
                'id_matutino' => 'nullable|string',
                'id_vespertino' => 'nullable|string',
            ]);

            $bitacora = Bitacora::create($validatedData);

            return response()->json(['message' => 'Bitácora guardada correctamente', 'data' => $bitacora], 201);
        } catch (\Exception $e) {
            Log::error('Error saving bitacora: ' . $e->getMessage());
            return response()->json(['message' => 'Error al guardar bitácora'], 500);
        }
    }
}
