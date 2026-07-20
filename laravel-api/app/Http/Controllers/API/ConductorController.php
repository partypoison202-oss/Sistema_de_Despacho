<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Conductor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ConductorController extends Controller
{
    public function index()
    {
        // Obtener todos los tarjetones asignados en tiempo real
        $asignaciones = DB::table('informacion_operativa')
            ->whereNotNull('numero_tarjeton')
            ->where('numero_tarjeton', '!=', '')
            ->pluck('numero_tarjeton')
            ->toArray();

        $conductores = Conductor::all()->map(function ($c) use ($asignaciones) {
            // Limpiar espacios en blanco al comparar
            $tarjetonClean = trim($c->tarjeton);
            $estaAsignado = false;
            foreach ($asignaciones as $t) {
                if (trim($t) === $tarjetonClean) {
                    $estaAsignado = true;
                    break;
                }
            }
            $c->estado_servicio = $estaAsignado ? 'en_servicio' : 'disponible';
            return $c;
        });

        return response()->json($conductores);
    }
}

