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
            $unidades = DB::table('unidades')
                ->join('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
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
                'firma_particular' => 'nullable|image|mimes:png,jpg,jpeg|max:5120',
                'fotos' => 'nullable|array',
                'fotos.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120'
            ]);

            DB::beginTransaction();

            // Normalizar accidente_seguro a string 'true'/'false' para Postgres
            $seguro = $request->input('accidente_seguro');
            if (is_bool($seguro)) {
                $seguro = $seguro ? 'true' : 'false';
            } elseif (is_numeric($seguro)) {
                $seguro = (int) $seguro ? 'true' : 'false';
            } elseif ($seguro === null) {
                $seguro = null;
            }

            // Guardar firma del particular (si viene)
            $rutaFirma = null;
            if ($request->hasFile('firma_particular')) {
                $rutaFirma = $request->file('firma_particular')->store('titan/firmas', 'public');
            }

            // Guardar reporte
            $reporteId = DB::table('reportes_titan')->insertGetId([
                'unidad_id' => $validated['unidad_id'],
                'usuario_id' => auth()->id() ?? 1,
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

            // Guardar fotos (el frontend debe enviar el campo como fotos[])
            if ($request->hasFile('fotos')) {
                foreach ($request->file('fotos') as $foto) {
                    if (!$foto->isValid()) {
                        continue;
                    }
                    $rutaFoto = $foto->store('titan/fotos', 'public');
                    DB::table('reportes_titan_fotos')->insert([
                        'reporte_titan_id' => $reporteId,
                        'ruta_foto' => $rutaFoto,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::commit();
            return response()->json([
                'message' => 'Reporte guardado exitosamente',
                'reporte_id' => $reporteId
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error en guardarReporte: ' . $e->getMessage());
            return response()->json(['error' => 'Error al guardar el reporte: ' . $e->getMessage()], 500);
        }
    }
}