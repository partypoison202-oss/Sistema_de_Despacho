<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

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
            $r->firma_particular_url = !empty($r->firma_particular) 
                ? asset('storage/' . $r->firma_particular) 
                : null;

            return $r;
        });

        return response()->json([
            'incorporaciones' => $reportes->where('tipo_evento', 'INCORPORACION')->count(),
            'desincorporaciones' => $reportes->where('tipo_evento', 'DESINCORPORACION')->count(),
            'accidentes' => $reportes->where('tipo_evento', 'ACCIDENTE')->count(),
            'reportes' => $data,
        ], 200);

    } catch (\Exception $e) {
        // Registrar el error en el log de Laravel
        \Log::error('Error en reportesPorTitan para usuario ' . $usuarioId . ': ' . $e->getMessage(), [
            'trace' => $e->getTraceAsString()
        ]);

        // Devolver un mensaje claro para el desarrollador (en desarrollo)
        // En producción, puedes devolver un mensaje genérico
        return response()->json([
            'error' => 'Error al obtener los reportes: ' . $e->getMessage()
        ], 500);
    }
}
}