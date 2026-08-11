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
                ->whereRaw('LOWER(informacion_operativa.estatus) LIKE ?', ['%operaci%'])
                ->get();

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
                    'id'       => strtolower(str_replace(' ', '_', $tipo)),
                    'label'    => strtoupper($tipo),
                    'operacion'=> count($units),
                    'units'    => $units,
                ];
            }

            return response()->json($response, 200);

        } catch (\Exception $e) {
            \Log::error('Error en getUnidadesOperacion: ' . $e->getMessage());
            return response()->json(['error' => 'Error al obtener unidades en operación'], 500);
        }
    }

    /**
     * Devuelve el histórico completo de todos los reportes Titán,
     * con soporte de filtros: tipo_evento, fecha_desde, fecha_hasta, titan_id.
     */
    public function getAllReportes(Request $request)
    {
        try {
            $query = DB::table('reportes_titan')
                ->join('unidades', 'reportes_titan.unidad_id', '=', 'unidades.id')
                ->join('usuarios', 'reportes_titan.usuario_id', '=', 'usuarios.id')
                ->select(
                    'reportes_titan.*',
                    'unidades.numero_eco as numero_economico',
                    'usuarios.nombre_completo as nombre_titan'
                )
                ->orderBy('reportes_titan.created_at', 'desc');

            if ($request->filled('tipo_evento')) {
                $query->where('reportes_titan.tipo_evento', $request->tipo_evento);
            }

            if ($request->filled('fecha_desde')) {
                $query->whereDate('reportes_titan.created_at', '>=', $request->fecha_desde);
            }

            if ($request->filled('fecha_hasta')) {
                $query->whereDate('reportes_titan.created_at', '<=', $request->fecha_hasta);
            }

            if ($request->filled('titan_id')) {
                $query->where('reportes_titan.usuario_id', $request->titan_id);
            }

            $reportes = $query->get();

            // Adjuntar fotos
            $reporteIds = $reportes->pluck('id')->filter()->values();
            $fotos = collect();
            if ($reporteIds->isNotEmpty()) {
                $fotos = DB::table('reportes_titan_fotos')
                    ->whereIn('reporte_titan_id', $reporteIds)
                    ->get()
                    ->groupBy('reporte_titan_id');
            }

            $data = $reportes->map(function ($r) use ($fotos) {
                $r->fotos = isset($fotos[$r->id])
                    ? $fotos[$r->id]->map(function ($f) {
                        return !empty($f->ruta_foto) ? asset('storage/' . $f->ruta_foto) : null;
                    })->filter()->values()
                    : [];

                if (!empty($r->firma_particular_url)) {
                    $r->firma_particular_url = asset($r->firma_particular_url);
                }

                // Decodificar asistencia_sitio JSON si existe
                if (!empty($r->asistencia_sitio)) {
                    $decoded = json_decode($r->asistencia_sitio, true);
                    $r->asistencia_sitio = is_array($decoded) ? $decoded : [$r->asistencia_sitio];
                } else {
                    $r->asistencia_sitio = [];
                }

                return $r;
            });

            // Conteos por tipo para el resumen
            $conteos = [
                'DESINCORPORACION' => 0,
                'INCORPORACION'    => 0,
                'ACCIDENTE'        => 0,
                'CHOQUE'           => 0,
                'ATROPELLADO'      => 0,
                'CODIGO_AMBAR'     => 0,
                'CODIGO_ROJO'      => 0,
                'CODIGO_NARANJA'   => 0,
            ];
            foreach ($reportes as $r) {
                $tipo = $r->tipo_evento ?? '';
                if (array_key_exists($tipo, $conteos)) {
                    $conteos[$tipo]++;
                }
            }

            return response()->json([
                'reportes' => $data,
                'total'    => $data->count(),
                'conteos'  => $conteos,
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Error en getAllReportes Titan: ' . $e->getMessage());
            return response()->json(['error' => 'Error al obtener el histórico: ' . $e->getMessage()], 500);
        }
    }

    public function guardarReporte(Request $request)
    {
        try {
            $validated = $request->validate([
                'unidad_id'              => 'required|integer',
                'intervalo'              => 'nullable|string',
                'observaciones'          => 'nullable|string',
                'tipo_evento'            => 'required|string',
                'corrida'                => 'nullable|string',
                'hora_evento'            => 'nullable|string',
                'ubicacion_gps'          => 'nullable|string',
                'ubicacion_evento'       => 'nullable|string',
                'motivo_desincorporacion'=> 'nullable|string',
                'accidente_dueno'        => 'nullable|string',
                'accidente_vehiculo'     => 'nullable|string',
                'accidente_edad'         => 'nullable|string',
                'accidente_placas'       => 'nullable|string',
                'accidente_seguro'       => 'nullable',
                'accidente_hechos'       => 'nullable|string',
                'accidente_genero'       => 'nullable|string',
                // Campos de main
                'accidente_hecho_tipo' => 'nullable|string',
                'accidente_favor_de_quien' => 'nullable|string',
                'accidente_cantidades_dinero' => 'nullable|string',
                // Campos extendidos Código Ámbar / Rojo (HEAD)
                'lesionados_cantidad'    => 'nullable|integer',
                'nombres_afectados'      => 'nullable|string',
                'asistencia_sitio'       => 'nullable|string',   // JSON string
                'diagnostico_preliminar' => 'nullable|string',
                'amerita_traslado'       => 'nullable',
                'estatus_legal'          => 'nullable|string',
                // Campos Código Naranja (HEAD)
                'usuario_anonimo'        => 'nullable',
                'estacion_hecho'         => 'nullable|string',
                'ruta_hecho'             => 'nullable|string',
                'autoridad_interviniente'=> 'nullable|string',
                'puesto_disposicion'     => 'nullable',
                'motivo_no_disposicion'  => 'nullable|string',
                // Archivos
                'firma_particular'       => 'nullable|image|mimes:png,jpg,jpeg|max:5120',
                'fotos'                  => 'nullable|array',
                'fotos.*'               => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            ]);

            DB::beginTransaction();

            // Normalizar booleanos que vienen como string del FormData
            $normalizeBool = function ($val) {
                if (is_bool($val))  return $val;
                if ($val === 'true'  || $val === '1' || $val === 1)  return true;
                if ($val === 'false' || $val === '0' || $val === 0)  return false;
                return null;
            };

            $rutaFirma = null;
            if ($request->hasFile('firma_particular')) {
                $rutaFirma = $request->file('firma_particular')->store('titan/firmas', 'public');
            }

            $reporteId = DB::table('reportes_titan')->insertGetId([
                'unidad_id'               => $validated['unidad_id'],
                'usuario_id'              => auth()->id() ?? 1,
                'intervalo'               => $validated['intervalo']               ?? null,
                'observaciones'           => $validated['observaciones']           ?? null,
                'tipo_evento'             => $validated['tipo_evento'],
                'corrida'                 => $validated['corrida']                 ?? null,
                'hora_evento'             => $validated['hora_evento']             ?? null,
                'ubicacion_gps'           => $validated['ubicacion_gps']           ?? null,
                'ubicacion_evento'        => $validated['ubicacion_evento']        ?? null,
                'motivo_desincorporacion' => $validated['motivo_desincorporacion'] ?? null,
                'accidente_dueno'         => $validated['accidente_dueno']         ?? null,
                'accidente_vehiculo'      => $validated['accidente_vehiculo']      ?? null,
                'accidente_edad'          => $validated['accidente_edad']          ?? null,
                'accidente_genero'        => $validated['accidente_genero']        ?? null,
                'accidente_placas'        => $validated['accidente_placas']        ?? null,
                'accidente_seguro'        => $normalizeBool($request->input('accidente_seguro')),
                'accidente_hecho_tipo'    => $validated['accidente_hecho_tipo']    ?? null,
                'accidente_favor_de_quien'=> $validated['accidente_favor_de_quien']?? null,
                'accidente_cantidades_dinero' => $validated['accidente_cantidades_dinero'] ?? null,
                'accidente_hechos'        => $validated['accidente_hechos']        ?? null,
                'accidente_hubo_fallecidos' => $validated['accidente_hubo_fallecidos'] ?? null,
                'accidente_fallecidos_cantidad' => $validated['accidente_fallecidos_cantidad'] ?? null,
                'accidente_fallecidos_nombres' => $validated['accidente_fallecidos_nombres'] ?? null,
                'accidente_hora_fallecimiento' => $validated['accidente_hora_fallecimiento'] ?? null,
                'accidente_hora_asistencia_cemefo' => $validated['accidente_hora_asistencia_cemefo'] ?? null,
                'firma_particular_url'    => $rutaFirma,
                'lesionados_cantidad'     => isset($validated['lesionados_cantidad']) ? (int)$validated['lesionados_cantidad'] : null,
                'nombres_afectados'       => $validated['nombres_afectados']       ?? null,
                'asistencia_sitio'        => $validated['asistencia_sitio']        ?? null,
                'diagnostico_preliminar'  => $validated['diagnostico_preliminar']  ?? null,
                'amerita_traslado'        => $normalizeBool($request->input('amerita_traslado')),
                'estatus_legal'           => $validated['estatus_legal']           ?? null,
                'usuario_anonimo'         => $normalizeBool($request->input('usuario_anonimo')),
                'estacion_hecho'          => $validated['estacion_hecho']          ?? null,
                'ruta_hecho'              => $validated['ruta_hecho']              ?? null,
                'autoridad_interviniente' => $validated['autoridad_interviniente'] ?? null,
                'puesto_disposicion'      => $normalizeBool($request->input('puesto_disposicion')),
                'motivo_no_disposicion'   => $validated['motivo_no_disposicion']   ?? null,
                'created_at'              => now(),
                'updated_at'              => now(),
            ]);

            if ($request->hasFile('fotos')) {
                foreach ($request->file('fotos') as $foto) {
                    if (!$foto->isValid()) continue;
                    $rutaFoto = $foto->store('titan/fotos', 'public');
                    DB::table('reportes_titan_fotos')->insert([
                        'reporte_titan_id' => $reporteId,
                        'ruta_foto'        => $rutaFoto,
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);
                }
            }

            DB::commit();
            return response()->json([
                'message'    => 'Reporte guardado exitosamente',
                'reporte_id' => $reporteId,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error en guardarReporte Titan: ' . $e->getMessage());
            return response()->json(['error' => 'Error al guardar el reporte: ' . $e->getMessage()], 500);
        }
    }
}