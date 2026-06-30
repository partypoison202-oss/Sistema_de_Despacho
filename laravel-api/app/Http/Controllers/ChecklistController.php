<?php

namespace App\Http\Controllers;

use App\Models\Checklist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ChecklistController extends Controller
{
    private function dateRange(string $period, ?string $date = null): array
    {
        $base = $date ? Carbon::parse($date) : Carbon::now();

        return match ($period) {
            'daily'   => [$base->copy()->startOfDay(), $base->copy()->endOfDay()],
            'weekly'  => [$base->copy()->startOfWeek(Carbon::MONDAY), $base->copy()->endOfWeek(Carbon::SUNDAY)],
            'monthly' => [$base->copy()->startOfMonth(), $base->copy()->endOfMonth()],
            'yearly'  => [$base->copy()->startOfYear(), $base->copy()->endOfYear()],
            default   => [$base->copy()->startOfDay(), $base->copy()->endOfDay()],
        };
    }

    public function index(Request $request)
    {
        try {
            $period = $request->query('period', 'daily');
            $date = $request->query('date');
            
            [$from, $to] = $this->dateRange($period, $date);

            $checklists = Checklist::with('user')
                ->whereBetween('fecha_hora', [$from, $to])
                ->orderByDesc('fecha_hora')
                ->get()
                ->map(function (Checklist $c) {
                    $puntos = is_array($c->puntos) ? $c->puntos : [];
                    $bien = 0;
                    $mal  = 0;
                    foreach ($puntos as $p) {
                        if (($p['estado'] ?? null) === 'bien') $bien++;
                        if (($p['estado'] ?? null) === 'mal')  $mal++;
                    }
                    return [
                        'id'           => $c->id,
                        'user_name'    => $c->user?->nombre_completo ?? '—',
                        'tipo_unidad'  => $c->tipo_unidad,

                        'conductor_id' => $c->conductor_id,
                        'economico'    => $c->economico,
                        'servicio'     => $c->servicio,
                        'fecha_hora'   => Carbon::parse($c->fecha_hora)->toISOString(),
                        'total_bien'   => $bien,
                        'total_mal'    => $mal,
                        'total_puntos' => count($puntos),
                        'puntos'       => $puntos,
                        'dibujo'       => $c->dibujo,
                    ];
                });

            return response()->json([
                'checklists' => $checklists,
                'dateFrom'   => $from->toDateString(),
                'dateTo'     => $to->toDateString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching checklists: ' . $e->getMessage());
            return response()->json(['error' => 'Error al obtener checklists'], 500);
        }
    }

    /**
     * Recibe y procesa el checklist enviado.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tipo_unidad'               => ['required', 'in:URBANUSS,ZAFIRO,VAGONETA,ORION'],
            'conductor_id'              => ['nullable', 'string', 'max:20'],
            'economico'                 => ['nullable', 'string', 'max:20'],
            'servicio'                  => ['required', 'string', 'max:50'],
            'puntos'                    => ['required', 'array'],
            'puntos.*.estado'           => ['nullable', 'in:bien,mal'],
            'puntos.*.observaciones'    => ['nullable', 'string', 'max:500'],
            'puntos.*.fotos'            => ['nullable', 'array'],
            'puntos.*.fotos.*'          => ['nullable', 'string'],
            'dibujo'                    => ['nullable', 'string'],
            'fecha_hora'                => ['required', 'string'],
        ]);

        $checklist = Checklist::create([
            'usuario_id'   => $request->user()->id,
            'tipo_unidad'  => $validated['tipo_unidad'],
            'conductor_id' => $validated['conductor_id'] ?? null,
            'economico'    => $validated['economico'] ?? null,
            'servicio'     => $validated['servicio'],
            'puntos'       => $validated['puntos'],
            'dibujo'       => $validated['dibujo'] ?? null,
            'fecha_hora'   => $validated['fecha_hora'],
        ]);

        return response()->json([
            'message' => 'Checklist guardado correctamente.',
            'checklist' => $checklist
        ], 201);
    }
}

