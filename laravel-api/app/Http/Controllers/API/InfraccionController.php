<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Infraccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

class InfraccionController extends Controller
{
    public function checkPlaca($placa)
    {
        $this->ensureTableExists();
        $searchTerm = strtoupper(trim($placa));
        $infraccion = Infraccion::where('placas', $searchTerm)
            ->orWhere('conductor_nombre', 'like', "%{$searchTerm}%")
            ->latest()
            ->first();
        return response()->json([
            'has_infraccion' => $infraccion ? true : false,
            'latest' => $infraccion
        ]);
    }

    /**
     * Garantizar que la tabla 'infracciones' exista dinámicamente.
     */
    private function ensureTableExists()
    {
        if (!Schema::hasTable('infracciones')) {
            Schema::create('infracciones', function (Blueprint $table) {
                $table->id();
                $table->string('folio', 50)->unique();
                // 1. Lugar, Fecha y Hora
                $table->dateTime('fecha_expedicion');
                $table->string('hora_intervencion', 20);
                $table->string('municipio', 100)->default('Pachuca de Soto');
                $table->string('ubicacion_exacta', 255);

                // Imágenes (Evidencia)
                $table->string('imagen_1', 255)->nullable();
                $table->string('imagen_2', 255)->nullable();
                $table->string('imagen_3', 255)->nullable();
                $table->string('imagen_4', 255)->nullable();
                $table->string('imagen_5', 255)->nullable();

                // 2. Datos del Vehículo Infractor
                $table->string('placas', 20)->index();
                $table->string('entidad_federativa', 100);
                $table->string('marca', 100);
                $table->string('submarca', 100)->nullable();
                $table->string('modelo', 100);
                $table->string('color', 50);
                $table->string('niv_vin', 100)->nullable();
                $table->string('tipo_vehiculo', 50)->default('Particular');

                // 3. Datos de la Persona Conductora / Propietaria
                $table->string('conductor_nombre', 150);
                $table->text('conductor_domicilio')->nullable();
                $table->string('licencia_numero', 100)->nullable();
                $table->string('licencia_tipo', 50)->nullable();
                $table->string('licencia_estado', 100)->nullable();
                $table->string('calidad_conductor', 50)->default('Conductora');
                $table->string('correo_infractor', 255)->nullable();

                // 4. Motivación y Hechos
                $table->string('motivacion_hecho', 100)->default('transitaba');
                $table->text('descripcion_hechos')->nullable();

                // 5. Sanción y Garantía Retenida
                $table->decimal('sancion_uma', 10, 2)->default(0);
                $table->string('garantia_tipo', 100)->default('Detención del Vehículo');
                $table->text('garantia_observaciones')->nullable();

                // 6. Inspector de Transporte
                $table->unsignedBigInteger('inspector_id')->nullable();
                $table->string('inspector_nombre', 150);
                $table->string('inspector_gafete', 100);
                $table->string('adscripcion', 255)->default('Dirección Jurídica del SITMAH');
                $table->longText('firma_inspector');

                // 7. Notificación e Infractor
                $table->boolean('conductor_nego_firmar')->default(false);
                $table->string('recibio_nombre', 150)->nullable();
                $table->longText('firma_conductor')->nullable();

                $table->timestamps();
            });
        } else {
            // Asegurar que si la tabla ya existe (de versiones previas), se agreguen las nuevas columnas
            Schema::table('infracciones', function (Blueprint $table) {
                if (!Schema::hasColumn('infracciones', 'imagen_4')) {
                    $table->string('imagen_4', 255)->nullable();
                }
                if (!Schema::hasColumn('infracciones', 'imagen_5')) {
                    $table->string('imagen_5', 255)->nullable();
                }
                if (!Schema::hasColumn('infracciones', 'correo_infractor')) {
                    $table->string('correo_infractor', 255)->nullable();
                }
            });
        }
    }

    /**
     * Listar infracciones registradas.
     */
    public function index(Request $request)
    {
        $this->ensureTableExists();

        $query = Infraccion::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('placas', 'like', "%{$s}%")
                  ->orWhere('conductor_nombre', 'like', "%{$s}%")
                  ->orWhere('folio', 'like', "%{$s}%")
                  ->orWhere('marca', 'like', "%{$s}%");
            });
        }

        $infracciones = $query->orderBy('fecha_expedicion', 'desc')->paginate(20);

        return response()->json($infracciones);
    }

    /**
     * Guardar una nueva Boleta de Infracción (7 Secciones)
     */
    public function store(Request $request)
    {
        $this->ensureTableExists();

        $request->validate([
            'fecha_expedicion' => 'required|date',
            'hora_intervencion' => 'required|string|max:20',
            'municipio' => 'required|string|max:100',
            'ubicacion_exacta' => 'required|string|max:255',

            'imagen_1' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',
            'imagen_2' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',
            'imagen_3' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',

            'placas' => 'required|string|max:20',
            'entidad_federativa' => 'required|string|max:100',
            'marca' => 'required|string|max:100',
            'submarca' => 'nullable|string|max:100',
            'modelo' => 'required|string|max:100',
            'color' => 'required|string|max:50',
            'niv_vin' => 'nullable|string|max:100',
            'tipo_vehiculo' => 'required|string|max:50',

            'conductor_nombre' => 'required|string|max:150',
            'conductor_domicilio' => 'nullable|string',
            'licencia_numero' => 'nullable|string|max:100',
            'licencia_tipo' => 'nullable|string|max:50',
            'licencia_estado' => 'nullable|string|max:100',
            'calidad_conductor' => 'required|string|max:50',
            'correo_infractor' => 'nullable|email|max:255',

            'motivacion_hecho' => 'required|string|max:100',
            'descripcion_hechos' => 'nullable|string',

            'sancion_uma' => 'required|numeric|min:0',
            'garantia_tipo' => 'required|string|max:100',
            'garantia_observaciones' => 'nullable|string',

            'inspector_gafete' => 'required|string|max:100',
            'firma_inspector' => 'required|string',

            'conductor_nego_firmar' => 'required|boolean',
            'recibio_nombre' => 'nullable|string|max:150',
            'firma_conductor' => 'nullable|string',
        ]);

        $user = $request->user();

        // Generar Folio Único de Infracción (ej: INF-2026-0001)
        $year = date('Y');
        $countYear = Infraccion::whereYear('created_at', $year)->count() + 1;
        $folio = sprintf('INF-%s-%04d', $year, $countYear);

        $img1 = $request->file('imagen_1') ? $request->file('imagen_1')->store('infracciones', 'public') : null;
        $img2 = $request->file('imagen_2') ? $request->file('imagen_2')->store('infracciones', 'public') : null;
        $img3 = $request->file('imagen_3') ? $request->file('imagen_3')->store('infracciones', 'public') : null;
        $img4 = $request->file('imagen_4') ? $request->file('imagen_4')->store('infracciones', 'public') : null;
        $img5 = $request->file('imagen_5') ? $request->file('imagen_5')->store('infracciones', 'public') : null;

        $infraccion = Infraccion::create([
            'folio' => $folio,
            'fecha_expedicion' => $request->fecha_expedicion,
            'hora_intervencion' => $request->hora_intervencion,
            'municipio' => $request->municipio,
            'ubicacion_exacta' => $request->ubicacion_exacta,
            
            'imagen_1' => $img1,
            'imagen_2' => $img2,
            'imagen_3' => $img3,
            'imagen_4' => $img4,
            'imagen_5' => $img5,

            'placas' => strtoupper(trim($request->placas)),
            'entidad_federativa' => $request->entidad_federativa,
            'marca' => $request->marca,
            'submarca' => $request->submarca,
            'modelo' => $request->modelo,
            'color' => $request->color,
            'niv_vin' => $request->niv_vin,
            'tipo_vehiculo' => $request->tipo_vehiculo,

            'conductor_nombre' => $request->conductor_nombre,
            'conductor_domicilio' => $request->conductor_domicilio,
            'licencia_numero' => $request->licencia_numero,
            'licencia_tipo' => $request->licencia_tipo,
            'licencia_estado' => $request->licencia_estado,
            'calidad_conductor' => $request->calidad_conductor,
            'correo_infractor' => $request->correo_infractor,

            'motivacion_hecho' => $request->motivacion_hecho,
            'descripcion_hechos' => $request->descripcion_hechos,

            'sancion_uma' => $request->sancion_uma,
            'garantia_tipo' => $request->garantia_tipo,
            'garantia_observaciones' => $request->garantia_observaciones,

            'inspector_id' => $user ? $user->id : null,
            'inspector_nombre' => $user ? $user->nombre_completo : ($request->inspector_nombre ?? 'INSPECTOR'),
            'inspector_gafete' => $request->inspector_gafete,
            'adscripcion' => 'Dirección Jurídica del SITMAH',
            'firma_inspector' => $request->firma_inspector,

            'conductor_nego_firmar' => DB::raw(filter_var($request->conductor_nego_firmar, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false'),
            'recibio_nombre' => $request->recibio_nombre,
            'firma_conductor' => $request->firma_conductor,
        ]);

        return response()->json([
            'message' => 'Boleta de Infracción registrada con éxito',
            'infraccion' => $infraccion
        ], 201);
    }

    /**
     * Enviar la boleta de infracción por correo
     */
    public function sendEmail($id, Request $request)
    {
        $infraccion = Infraccion::findOrFail($id);

        if (!$infraccion->correo_infractor) {
            return response()->json(['message' => 'No hay correo registrado para esta infracción.'], 400);
        }

        $request->validate([
            'pdf_file' => 'required|file|mimes:pdf',
        ]);

        $pdfFile = $request->file('pdf_file');
        $pdfPath = $pdfFile->getRealPath();
        $pdfName = 'Boleta_Infraccion_' . $infraccion->folio . '.pdf';

        try {
            \Illuminate\Support\Facades\Mail::to($infraccion->correo_infractor)
                // ->bcc('karina.navarrete@hidalgo.gob.mx')
                ->send(new \App\Mail\InfraccionMail($infraccion, $pdfPath, $pdfName));
            return response()->json(['message' => 'Correo enviado exitosamente.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al enviar correo: ' . $e->getMessage()], 500);
        }
    }
}
