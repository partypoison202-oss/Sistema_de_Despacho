<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Ruta;
use App\Services\SyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RutaController extends Controller
{
    /**
     * Parsea un código de ruta para extraer si es troncal, su número base y su sufijo alfabético.
     */
    public static function parsearPartesRuta($raw)
    {
        $str = strtoupper(trim($raw ?? ''));
        if ($str === '' || str_contains($str, 'SIN ASIGNAR')) {
            return ['isTroncal' => false, 'num' => 999999, 'suffix' => '', 'original' => $str];
        }

        $isTroncal = (bool) preg_match('/^T(?:RONCAL)?(?:\s*[-_]?\s*\d|\d|$)/i', $str);

        $clean = preg_replace('/^(?:TRONCAL|ALIMENTADORA|RA|RUTA)\s*[-_]?\s*/i', '', $str);
        $clean = trim($clean);

        if ($isTroncal && preg_match('/^T\s*[-_]?\s*/i', $clean)) {
            $clean = trim(preg_replace('/^T\s*[-_]?\s*/i', '', $clean));
        }

        if (preg_match('/^(\d+)\s*[-_]?\s*([A-Z]*)$/i', $clean, $m)) {
            return [
                'isTroncal' => $isTroncal,
                'num' => (int) $m[1],
                'suffix' => $m[2] ?? '',
                'original' => $str,
            ];
        }

        $num = 999999;
        if (preg_match('/(\d+)/', $clean, $nm)) {
            $num = (int) $nm[1];
        }
        $suffix = preg_replace('/[^A-Z]/i', '', preg_replace('/\d+/', '', $clean));

        return [
            'isTroncal' => $isTroncal,
            'num' => $num,
            'suffix' => $suffix,
            'original' => $str,
        ];
    }

    /**
     * Compara códigos de ruta asegurando orden de menor a mayor y alfabético por sufijo.
     */
    public static function compararCodigosRuta($rutaA, $rutaB)
    {
        $strA = strtoupper(trim($rutaA ?? ''));
        $strB = strtoupper(trim($rutaB ?? ''));

        if ($strA === $strB) {
            return 0;
        }

        $pA = self::parsearPartesRuta($strA);
        $pB = self::parsearPartesRuta($strB);

        if ($pA['isTroncal'] !== $pB['isTroncal']) {
            return $pA['isTroncal'] ? -1 : 1;
        }

        if ($pA['num'] !== $pB['num']) {
            return $pA['num'] <=> $pB['num'];
        }

        $sufCmp = strcasecmp($pA['suffix'], $pB['suffix']);
        if ($sufCmp !== 0) {
            return $sufCmp;
        }

        return strcasecmp($pA['original'], $pB['original']);
    }

    /**
     * Asegura que la descripción guardada siempre contenga el código oficial de la ruta
     * (ej. "T-05 Parador (Téllez - Centro)" o "2A San Alfonso - Matilde"),
     * evitando que quede solo el nombre del trayecto aislado (ej. "San juan,- San mateo").
     */
    public static function normalizarDescripcionRuta(string $codigo, ?string $descripcion, string $tipo = 'alimentadora'): string
    {
        $codigoTrim = strtoupper(trim($codigo));
        $descTrim = trim($descripcion ?? '');

        if ($descTrim === '') {
            return strtolower($tipo) === 'troncal' ? "{$codigoTrim} Troncal" : "{$codigoTrim} Alimentadora";
        }

        $cleanCodigo = preg_replace('/[^A-Z0-9]/', '', $codigoTrim);
        $prefix = strtoupper(substr($descTrim, 0, min(strlen($descTrim), strlen($codigoTrim) + 10)));
        $cleanPrefix = preg_replace('/[^A-Z0-9]/', '', $prefix);

        // Si ya empieza con el código o con "RUTA" + código
        if (str_starts_with($cleanPrefix, $cleanCodigo) || str_starts_with($cleanPrefix, 'RUTA' . $cleanCodigo)) {
            return $descTrim;
        }

        return "{$codigoTrim} {$descTrim}";
    }

    /**
     * Obtiene el listado completo de rutas ordenadas naturalmente de menor a mayor y alfabéticamente.
     */
    public function index(Request $request)
    {
        $query = Ruta::query();

        if ($request->has('tipo') && in_array(strtolower($request->tipo), ['troncal', 'alimentadora'])) {
            $query->where('tipo', strtolower($request->tipo));
        }

        $rutas = $query->get()->sort(function ($a, $b) {
            return self::compararCodigosRuta($a->ruta, $b->ruta);
        })->values();

        $troncales = $rutas->where('tipo', 'troncal')->values();
        $alimentadoras = $rutas->where('tipo', 'alimentadora')->values();

        return response()->json([
            'status' => 'success',
            'data' => $rutas,
            'troncales' => $troncales,
            'alimentadoras' => $alimentadoras,
            'totales' => [
                'todas' => $rutas->count(),
                'troncales' => $troncales->count(),
                'alimentadoras' => $alimentadoras->count(),
            ],
        ], 200);
    }

    /**
     * Registra una nueva ruta en el catálogo.
     */
    public function store(Request $request)
    {
        $request->validate([
            'ruta' => 'required|string|max:20',
            'tipo' => 'required|string|in:troncal,alimentadora,TRONCAL,ALIMENTADORA',
            'descripcion' => 'nullable|string|max:150',
        ], [
            'ruta.required' => 'El código de ruta es obligatorio.',
            'ruta.max' => 'El código de ruta no puede exceder 20 caracteres.',
            'tipo.required' => 'Debe seleccionar el tipo de ruta (Troncal o Alimentadora).',
            'tipo.in' => 'El tipo de ruta debe ser Troncal o Alimentadora.',
            'descripcion.max' => 'La descripción o trayecto no puede exceder 150 caracteres.',
        ]);

        $codigoLimpio = strtoupper(trim($request->ruta));
        $tipoLimpio = strtolower(trim($request->tipo));
        $descripcionLimpia = self::normalizarDescripcionRuta(
            $codigoLimpio,
            $request->filled('descripcion') ? trim($request->descripcion) : null,
            $tipoLimpio
        );

        // Verificar unicidad case-insensitive
        $existe = Ruta::whereRaw('LOWER(TRIM(ruta)) = ?', [strtolower($codigoLimpio)])->first();
        if ($existe) {
            return response()->json([
                'status' => 'error',
                'message' => "La ruta '{$codigoLimpio}' ya se encuentra registrada como {$existe->tipo}.",
            ], 422);
        }

        $nuevaRuta = Ruta::create([
            'ruta' => $codigoLimpio,
            'tipo' => $tipoLimpio,
            'descripcion' => $descripcionLimpia,
        ]);

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => "Ruta '{$codigoLimpio}' creada exitosamente.",
            'data' => $nuevaRuta,
        ], 201);
    }

    /**
     * Actualiza una ruta existente.
     */
    public function update(Request $request, $id)
    {
        $ruta = Ruta::find($id);
        if (! $ruta) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ruta no encontrada.',
            ], 404);
        }

        $request->validate([
            'ruta' => 'required|string|max:20',
            'tipo' => 'required|string|in:troncal,alimentadora,TRONCAL,ALIMENTADORA',
            'descripcion' => 'nullable|string|max:150',
        ], [
            'ruta.required' => 'El código de ruta es obligatorio.',
            'ruta.max' => 'El código de ruta no puede exceder 20 caracteres.',
            'tipo.required' => 'Debe seleccionar el tipo de ruta.',
            'tipo.in' => 'El tipo de ruta debe ser Troncal o Alimentadora.',
            'descripcion.max' => 'La descripción o trayecto no puede exceder 150 caracteres.',
        ]);

        $codigoLimpio = strtoupper(trim($request->ruta));
        $tipoLimpio = strtolower(trim($request->tipo));
        $descripcionLimpia = self::normalizarDescripcionRuta(
            $codigoLimpio,
            $request->filled('descripcion') ? trim($request->descripcion) : null,
            $tipoLimpio
        );

        // Verificar unicidad excluyendo la actual
        $existe = Ruta::whereRaw('LOWER(TRIM(ruta)) = ?', [strtolower($codigoLimpio)])
            ->where('id', '!=', $id)
            ->first();

        if ($existe) {
            return response()->json([
                'status' => 'error',
                'message' => "Ya existe otra ruta con el código '{$codigoLimpio}'.",
            ], 422);
        }

        $codigoAnterior = $ruta->ruta;
        $ruta->update([
            'ruta' => $codigoLimpio,
            'tipo' => $tipoLimpio,
            'descripcion' => $descripcionLimpia,
        ]);

        // Si se renombró el código, sincronizar en tablas operativas activas
        if ($codigoAnterior !== $codigoLimpio) {
            $codigoAntLimpio = strtoupper(trim($codigoAnterior));
            $codigoAntSinPrefijo = preg_replace('/^(?:RA|T|RUTA|ALIMENTADORA|TRONCAL)\s*[-_]?\s*/i', '', $codigoAntLimpio);

            $actualizarRutaEnTabla = function ($tabla) use ($codigoAntLimpio, $codigoAntSinPrefijo, $codigoLimpio) {
                if (!Schema::hasTable($tabla) || !Schema::hasColumn($tabla, 'ruta')) {
                    return;
                }
                DB::table($tabla)
                    ->where(function ($q) use ($codigoAntLimpio, $codigoAntSinPrefijo) {
                        $q->whereRaw('UPPER(TRIM(ruta)) = ?', [$codigoAntLimpio])
                          ->orWhereRaw('UPPER(TRIM(ruta)) = ?', [$codigoAntSinPrefijo])
                          ->orWhereRaw("UPPER(TRIM(ruta)) = ?", ['RA ' . $codigoAntSinPrefijo])
                          ->orWhereRaw("UPPER(TRIM(ruta)) = ?", ['T-' . $codigoAntSinPrefijo])
                          ->orWhereRaw("UPPER(TRIM(ruta)) = ?", ['T' . $codigoAntSinPrefijo]);
                    })
                    ->update(['ruta' => $codigoLimpio]);
            };

            $actualizarRutaEnTabla('informacion_operativa');
            $actualizarRutaEnTabla('informacion_operativa_manana');
        }

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => "Ruta '{$codigoLimpio}' actualizada correctamente.",
            'data' => $ruta,
        ], 200);
    }

    /**
     * Elimina una ruta del catálogo y limpia asignaciones en unidades activas.
     */
    public function destroy($id)
    {
        $ruta = Ruta::find($id);
        if (! $ruta) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ruta no encontrada.',
            ], 404);
        }

        $codigo = $ruta->ruta;
        $ruta->delete();

        // Limpiar asignaciones de la ruta eliminada en las unidades operativas activas
        $codigoLimpio = strtoupper(trim($codigo));
        $codigoSinPrefijo = preg_replace('/^(?:RA|T|RUTA|ALIMENTADORA|TRONCAL)\s*[-_]?\s*/i', '', $codigoLimpio);

        $limpiarRutaEnTabla = function ($tabla) use ($codigoLimpio, $codigoSinPrefijo) {
            if (!Schema::hasTable($tabla) || !Schema::hasColumn($tabla, 'ruta')) {
                return;
            }
            DB::table($tabla)
                ->where(function ($q) use ($codigoLimpio, $codigoSinPrefijo) {
                    $q->whereRaw('UPPER(TRIM(ruta)) = ?', [$codigoLimpio])
                      ->orWhereRaw('UPPER(TRIM(ruta)) = ?', [$codigoSinPrefijo])
                      ->orWhereRaw("UPPER(TRIM(ruta)) = ?", ['RA ' . $codigoSinPrefijo])
                      ->orWhereRaw("UPPER(TRIM(ruta)) = ?", ['T-' . $codigoSinPrefijo])
                      ->orWhereRaw("UPPER(TRIM(ruta)) = ?", ['T' . $codigoSinPrefijo]);
                })
                ->update(['ruta' => null]);
        };

        $limpiarRutaEnTabla('informacion_operativa');
        $limpiarRutaEnTabla('informacion_operativa_manana');

        SyncService::notifyChange();

        return response()->json([
            'status' => 'success',
            'message' => "Ruta '{$codigo}' eliminada del catálogo.",
        ], 200);
    }
}
