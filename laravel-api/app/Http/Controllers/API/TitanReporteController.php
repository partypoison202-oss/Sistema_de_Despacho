<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class TitanReporteController extends Controller
{
    /**
     * Devuelve los conteos y el detalle de reportes (incorporaciones,
     * desincorporaciones, accidentes) generados por un titán específico.
     */
    public function reportesPorTitan($usuarioId)
    {
        try {
            $reportes = DB::table('reportes_titan')
                ->join('unidades', 'reportes_titan.unidad_id', '=', 'unidades.id')
                ->leftJoin('informacion_operativa', 'unidades.id', '=', 'informacion_operativa.unidad_id')
                ->where('reportes_titan.usuario_id', $usuarioId)
                ->select(
                    'reportes_titan.*',
                    'unidades.numero_eco as numero_economico',
                    'informacion_operativa.ruta',
                    'informacion_operativa.numero_tarjeton'
                )
                ->orderBy('reportes_titan.created_at', 'desc')
                ->get();

            // Si no hay reportes, devolver respuesta vacía
            if ($reportes->isEmpty()) {
                return response()->json([
                    'incorporaciones' => 0,
                    'desincorporaciones' => 0,
                    'accidentes' => 0,
                    'reportes' => [],
                ], 200);
            }

            $reporteIds = $reportes->pluck('id')->filter()->values();

            $fotos = collect();
            if ($reporteIds->isNotEmpty()) {
                $fotos = DB::table('reportes_titan_fotos')
                    ->whereIn('reporte_titan_id', $reporteIds)
                    ->get()
                    ->groupBy('reporte_titan_id');
            }

            $data = $reportes->map(function ($r) use ($fotos) {
                // Asegurarse de que el objeto tenga propiedades que podrían ser null
                $r->fotos = isset($fotos[$r->id])
                    ? $fotos[$r->id]->map(function ($f) {
                        // Verificar que la ruta no sea null
                        if (empty($f->ruta_foto)) {
                            return null;
                        }
                        return asset('storage/' . $f->ruta_foto);
                    })->filter()->values() // Eliminar nulos
                    : [];

                // Firma: solo si existe y no es null
                // NOTA: firma_particular_url ya se guarda como URL completa
                // (Storage::url()) desde guardarReporte(), por lo que NO se
                // debe volver a concatenar 'storage/' aquí.
                $r->firma_particular_url = !empty($r->firma_particular_url)
                    ? asset($r->firma_particular_url)
                    : null;

                return $r;
            });

        return response()->json([
            'incorporaciones' => $reportes->where('tipo_evento', 'INCORPORACION')->count(),
            'desincorporaciones' => $reportes->where('tipo_evento', 'DESINCORPORACION')->count(),
            'accidentes' => $reportes->whereIn('tipo_evento', ['ACCIDENTE', 'CHOQUE', 'ATROPELLADO', 'CODIGO_AMBAR', 'CODIGO_ROJO'])->count(),
            'reportes' => $data,
        ], 200);

        } catch (\Exception $e) {
            // Registrar el error en el log de Laravel
            \Log::error('Error en reportesPorTitan para usuario ' . $usuarioId . ': ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Error al obtener los reportes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Devuelve todos los reportes de titanes que aún no han sido
     * vistos por el panel de Centro de Control.
     */
    public function notificacionesPendientes()
    {
        try {
            $pendientes = DB::table('reportes_titan')
                ->whereRaw('visto = false')
                ->select('id', 'usuario_id', 'tipo_evento')
                ->get();

            return response()->json($pendientes, 200);

        } catch (\Exception $e) {
            \Log::error('Error en notificacionesPendientes: ' . $e->getMessage());
            return response()->json(['error' => 'Error al obtener notificaciones pendientes'], 500);
        }
    }

    /**
     * Marca un conjunto de reportes de titanes como vistos.
     */
    public function marcarVistos(Request $request)
    {
        try {
            $request->validate([
                'ids' => ['required', 'array'],
                'ids.*' => ['integer'],
            ]);

            DB::table('reportes_titan')
                ->whereIn('id', $request->input('ids'))
                ->update(['visto' => DB::raw('true'), 'updated_at' => now()]);

            return response()->json(['success' => true], 200);

        } catch (\Exception $e) {
            \Log::error('Error en marcarVistos: ' . $e->getMessage());
            return response()->json(['error' => 'Error al marcar reportes como vistos'], 500);
        }
    }
}