<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReservaController extends Controller
{
    private function resolverFecha($fechaInput)
    {
        $fecha = Carbon::today('America/Mexico_City');
        
        switch (strtoupper($fechaInput)) {
            case 'MANANA':
                $fecha->addDay();
                break;
            case 'SABADO':
                $fecha->next(Carbon::SATURDAY);
                break;
            case 'DOMINGO':
                $fecha->next(Carbon::SUNDAY);
                break;
            case 'LUNES':
                $fecha->next(Carbon::MONDAY);
                break;
            case 'FESTIVO':
            case 'HOY':
            default:
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaInput)) {
                    return $fechaInput;
                }
                break;
        }
        
        return $fecha->toDateString();
    }

    /**
     * Obtiene los tarjetones de los conductores autorizados como reserva para una fecha dada.
     */
    public function getReservasPorFecha(Request $request)
    {
        $fechaInput = $request->query('fecha', 'HOY');
        $fecha = $this->resolverFecha($fechaInput);
        
        $autorizadas = DB::table('reservas_autorizadas')
            ->where('fecha_operativa', $fecha)
            ->pluck('tarjeton');
            
        return response()->json($autorizadas);
    }
    
    /**
     * Sincroniza (sobrescribe) la lista de reservas autorizadas para una fecha.
     */
    public function syncReservas(Request $request)
    {
        $request->validate([
            'fecha' => 'required|string',
            'tarjetones' => 'array',
        ]);
        
        $fechaInput = $request->input('fecha', 'HOY');
        $fecha = $this->resolverFecha($fechaInput);
        
        $tarjetones = $request->input('tarjetones', []);
        
        DB::transaction(function () use ($fecha, $tarjetones) {
            // Eliminar las autorizaciones previas para ese día
            DB::table('reservas_autorizadas')
                ->where('fecha_operativa', $fecha)
                ->delete();
                
            $insertData = [];
            $now = now();
            foreach ($tarjetones as $tarjeton) {
                // Prevenir nulos
                if (empty($tarjeton)) continue;
                
                $insertData[] = [
                    'tarjeton' => $tarjeton,
                    'fecha_operativa' => $fecha,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            
            if (!empty($insertData)) {
                DB::table('reservas_autorizadas')->insert($insertData);
            }
        });
        
        return response()->json(['status' => 'success', 'message' => 'Reservas autorizadas guardadas correctamente.']);
    }
}
