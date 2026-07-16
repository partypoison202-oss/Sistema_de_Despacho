<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TitanController extends Controller
{
    public function getUnidadesOperacion()
    {
        try {
            $hoy = now()->toDateString();
            
            $unidades = DB::table('unidades')
                ->join('informacion_operativa', function ($join) use ($hoy) {
                    $join->on('unidades.id', '=', 'informacion_operativa.unidad_id')
                         ->whereDate('informacion_operativa.fecha_registro', '=', $hoy);
                })
                ->select(
                    'unidades.id',
                    'unidades.numero_eco as numero_economico',
                    'informacion_operativa.estatus',
                    'informacion_operativa.tipo as tipo_transporte',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton',
                    'informacion_operativa.nombre_conductor',
                    'informacion_operativa.hora_programada',
                    'informacion_operativa.corridas as corrida'
                )
                // Filter exclusively by OPERACION
                ->whereRaw('LOWER(informacion_operativa.estatus) LIKE ?', ['%operaci%'])
                ->get();

            // Group by model (tipo_transporte)
            $grouped = [];
            foreach ($unidades as $u) {
                $tipo = $u->tipo_transporte ?? 'OTROS';
                if (!isset($grouped[$tipo])) {
                    $grouped[$tipo] = [];
                }
                $grouped[$tipo][] = $u;
            }

            $response = [];
            foreach ($grouped as $tipo => $units) {
                $response[] = [
                    'id' => strtolower(str_replace(' ', '_', $tipo)),
                    'label' => strtoupper($tipo),
                    'operacion' => count($units),
                    'units' => $units
                ];
            }

            return response()->json($response, 200);

        } catch (\Exception $e) {
            \Log::error('Error en getUnidadesOperacion: ' . $e->getMessage());
            return response()->json(['error' => 'Error al obtener unidades en operación'], 500);
        }
    }

    public function guardarReporte(Request $request)
    {
        try {
            $validated = $request->validate([
                'unidad_id' => 'required|integer',
                'intervalo' => 'nullable|string',
                'observaciones' => 'nullable|string',
                'tipo_evento' => 'required|string',
                'corrida' => 'nullable|string',
                'hora_evento' => 'nullable|string',
                'ubicacion_gps' => 'nullable|string',
                'motivo_desincorporacion' => 'nullable|string',
                'accidente_dueno' => 'nullable|string',
                'accidente_vehiculo' => 'nullable|string',
                'accidente_placas' => 'nullable|string',
                'accidente_seguro' => 'nullable',
                'accidente_hechos' => 'nullable|string',
                'fotos.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120'
            ]);

            DB::beginTransaction();

            $seguro = null;
            if (isset($validated['accidente_seguro'])) {
                $seguro = filter_var($validated['accidente_seguro'], FILTER_VALIDATE_BOOLEAN);
            }

            // Guardar reporte
            $reporteId = DB::table('reportes_titan')->insertGetId([
                'unidad_id' => $validated['unidad_id'],
                'usuario_id' => auth()->id() ?? 1, // Fallback a 1 si no hay usuario auth temporalmente
                'intervalo' => $validated['intervalo'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'tipo_evento' => $validated['tipo_evento'],
                'corrida' => $validated['corrida'] ?? null,
                'hora_evento' => $validated['hora_evento'] ?? null,
                'ubicacion_gps' => $validated['ubicacion_gps'] ?? null,
                'motivo_desincorporacion' => $validated['motivo_desincorporacion'] ?? null,
                'accidente_dueno' => $validated['accidente_dueno'] ?? null,
                'accidente_vehiculo' => $validated['accidente_vehiculo'] ?? null,
                'accidente_placas' => $validated['accidente_placas'] ?? null,
                'accidente_seguro' => $seguro,
                'accidente_hechos' => $validated['accidente_hechos'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Guardar fotos
            if ($request->hasFile('fotos')) {
                foreach ($request->file('fotos') as $foto) {
                    $path = $foto->store('reportes_titan', 'public');
                    DB::table('reportes_titan_fotos')->insert([
                        'reporte_titan_id' => $reporteId,
                        'ruta_foto' => $path,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }

            DB::commit();

            return response()->json(['message' => 'Reporte guardado exitosamente', 'reporte_id' => $reporteId], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error en guardarReporte: ' . $e->getMessage());
            return response()->json(['error' => 'Error al guardar el reporte: ' . $e->getMessage()], 500);
        }
    }
}
