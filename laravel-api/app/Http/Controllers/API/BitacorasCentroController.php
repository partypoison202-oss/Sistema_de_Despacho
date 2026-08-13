<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BitacorasCentroController extends Controller
{
    /**
     * Obtiene el historial de bitácoras por fecha
     */
    public function getBitacoras(Request $request)
    {
        try {
            $fecha = $request->query('fecha', Carbon::today()->toDateString());

            $cambios = DB::table('bitacora_cambios_unidades')
                ->join('unidades', 'bitacora_cambios_unidades.unidad_id', '=', 'unidades.id')
                ->leftJoin('usuarios', 'bitacora_cambios_unidades.usuario_id', '=', 'usuarios.id')
                ->leftJoin('roles', 'usuarios.rol_id', '=', 'roles.id')
                ->where('bitacora_cambios_unidades.fecha', $fecha)
                ->select(
                    'bitacora_cambios_unidades.id',
                    'unidades.numero_eco as economico',
                    'unidades.tipo as tipo_unidad',
                    'usuarios.nombre_completo as usuario_nombre',
                    'roles.nombre as usuario_rol',
                    'bitacora_cambios_unidades.tipo_accion',
                    'bitacora_cambios_unidades.estatus_anterior',
                    'bitacora_cambios_unidades.estatus_nuevo',
                    'bitacora_cambios_unidades.detalles',
                    'bitacora_cambios_unidades.created_at as hora'
                )
                ->orderBy('bitacora_cambios_unidades.created_at', 'desc')
                ->get();

            return response()->json([
                'fecha' => $fecha,
                'registros' => $cambios
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
        }
    }
}
