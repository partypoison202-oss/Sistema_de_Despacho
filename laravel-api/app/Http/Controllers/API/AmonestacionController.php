<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Amonestacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Str;

class AmonestacionController extends Controller
{
    /**
     * Asegura dinámicamente que la tabla 'amonestaciones' exista en la BD.
     */
    private function ensureTableExists()
    {
        if (!Schema::hasTable('amonestaciones')) {
            Schema::create('amonestaciones', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 50)->unique();
                $table->dateTime('fecha');
                $table->string('lugar', 255)->default('Pachuca de Soto, Estado de Hidalgo');

                // 1. Datos del Vehículo Infractor
                $table->string('placas', 20)->index();
                $table->string('entidad_federativa', 100);
                $table->string('marca', 100);
                $table->string('modelo', 100);
                $table->string('color', 50);
                $table->string('conductor_nombre', 150);
                $table->string('conductor_identificacion', 100)->nullable();

                // 2. Datos de la Persona Inspectora
                $table->unsignedBigInteger('inspector_id')->nullable();
                $table->string('inspector_nombre', 150);
                $table->string('inspector_gafete', 100);
                $table->string('adscripcion', 255)->default('Dirección Jurídica del SITMAH');
                $table->longText('firma_inspector'); // Base64 PNG de la firma

                // 3. Notificación y firma del conductor
                $table->boolean('conductor_nego_firmar')->default(false);
                $table->string('recibio_nombre', 150)->nullable();
                $table->longText('firma_conductor')->nullable(); // Base64 PNG si firmó

                $table->timestamps();
            });
        }
    }

    /**
     * Listar amonestaciones registradas (Historial)
     */
    public function index(Request $request)
    {
        $this->ensureTableExists();

        $query = Amonestacion::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('placas', 'like', "%{$s}%")
                  ->orWhere('conductor_nombre', 'like', "%{$s}%")
                  ->orWhere('folio', 'like', "%{$s}%")
                  ->orWhere('marca', 'like', "%{$s}%");
            });
        }

        $amonestaciones = $query->orderBy('fecha', 'desc')->paginate(20);

        return response()->json($amonestaciones);
    }

    /**
     * Verificar en tiempo real si un número de placa ya cuenta con amonestaciones previas.
     */
    public function checkPlaca($placa)
    {
        $this->ensureTableExists();

        $cleanPlaca = strtoupper(trim(str_replace(['-', ' '], '', $placa)));

        $amonestaciones = Amonestacion::whereRaw("REPLACE(REPLACE(UPPER(placas), '-', ''), ' ', '') = ?", [$cleanPlaca])
            ->orderBy('fecha', 'desc')
            ->get();

        $count = $amonestaciones->count();

        return response()->json([
            'placa' => $cleanPlaca,
            'has_amonestacion' => $count > 0,
            'total_amonestaciones' => $count,
            'latest' => $count > 0 ? $amonestaciones->first() : null,
            'history' => $amonestaciones
        ]);
    }

    /**
     * Guardar una nueva Acta de Amonestación
     */
    public function store(Request $request)
    {
        $this->ensureTableExists();

        $request->validate([
            'fecha' => 'required|date',
            'lugar' => 'required|string|max:255',
            'placas' => 'required|string|max:20',
            'entidad_federativa' => 'required|string|max:100',
            'marca' => 'required|string|max:100',
            'modelo' => 'required|string|max:100',
            'color' => 'required|string|max:50',
            'conductor_nombre' => 'required|string|max:150',
            'conductor_identificacion' => 'nullable|string|max:100',
            'inspector_gafete' => 'required|string|max:100',
            'firma_inspector' => 'required|string', // Base64 string
            'conductor_nego_firmar' => 'required|boolean',
            'recibio_nombre' => 'nullable|string|max:150',
            'firma_conductor' => 'nullable|string',
        ]);

        $user = $request->user();

        // Generar Folio Único (ej: AM-2026-0001)
        $year = date('Y');
        $countToday = Amonestacion::whereYear('created_at', $year)->count() + 1;
        $folio = sprintf('AM-%s-%04d', $year, $countToday);

        $amonestacion = Amonestacion::create([
            'folio' => $folio,
            'fecha' => $request->fecha,
            'lugar' => $request->lugar,
            'placas' => strtoupper(trim($request->placas)),
            'entidad_federativa' => $request->entidad_federativa,
            'marca' => $request->marca,
            'modelo' => $request->modelo,
            'color' => $request->color,
            'conductor_nombre' => $request->conductor_nombre,
            'conductor_identificacion' => $request->conductor_identificacion,
            'inspector_id' => $user ? $user->id : null,
            'inspector_nombre' => $user ? $user->nombre_completo : ($request->inspector_nombre ?? 'INSPECTOR'),
            'inspector_gafete' => $request->inspector_gafete,
            'adscripcion' => 'Dirección Jurídica del SITMAH',
            'firma_inspector' => $request->firma_inspector,
            'conductor_nego_firmar' => filter_var($request->conductor_nego_firmar, FILTER_VALIDATE_BOOLEAN) ? true : false,
            'recibio_nombre' => $request->recibio_nombre,
            'firma_conductor' => $request->firma_conductor,
        ]);

        return response()->json([
            'message' => 'Acta de Amonestación registrada con éxito',
            'amonestacion' => $amonestacion
        ], 201);
    }
}
