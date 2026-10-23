const fs = require('fs');
const path = 'C:/Users/Jose M/Documents/stm-proyecto/laravel-api/app/Http/Controllers/API/InfraccionController.php';
let code = fs.readFileSync(path, 'utf8');

// 1. Update Schema
const schemaOld = `                $table->unsignedBigInteger('amonestacion_id')->nullable();

                // 1. Lugar, Fecha y Hora
                $table->dateTime('fecha_expedicion');
                $table->string('hora_intervencion', 20);
                $table->string('municipio', 100)->default('Pachuca de Soto');
                $table->string('ubicacion_exacta', 255);`;
const schemaNew = `                // 1. Lugar, Fecha y Hora
                $table->dateTime('fecha_expedicion');
                $table->string('hora_intervencion', 20);
                $table->string('municipio', 100)->default('Pachuca de Soto');
                $table->string('calle', 150);
                $table->string('numero', 50)->nullable();
                $table->string('colonia', 100);

                // Imágenes (Evidencia)
                $table->string('imagen_1', 255)->nullable();
                $table->string('imagen_2', 255)->nullable();
                $table->string('imagen_3', 255)->nullable();`;
if(code.includes(schemaOld)) code = code.replace(schemaOld, schemaNew);
else code = code.replace(schemaOld.replace(/\n/g, '\r\n'), schemaNew.replace(/\n/g, '\r\n'));

// 2. Add checkPlaca
const classStartOld = `class InfraccionController extends Controller
{
    /**
     * Garantizar que la tabla 'infracciones' exista dinámicamente.
     */`;
const classStartNew = `class InfraccionController extends Controller
{
    public function checkPlaca($placa)
    {
        $this->ensureTableExists();
        $infraccion = Infraccion::where('placas', strtoupper(trim($placa)))->latest()->first();
        return response()->json([
            'has_infraccion' => $infraccion ? true : false,
            'latest' => $infraccion
        ]);
    }

    /**
     * Garantizar que la tabla 'infracciones' exista dinámicamente.
     */`;
if(code.includes(classStartOld)) code = code.replace(classStartOld, classStartNew);
else code = code.replace(classStartOld.replace(/\n/g, '\r\n'), classStartNew.replace(/\n/g, '\r\n'));

// 3. Update validate rules
const validateOld = `            'hora_intervencion' => 'required|string|max:20',
            'municipio' => 'required|string|max:100',
            'ubicacion_exacta' => 'required|string|max:255',

            'placas' => 'required|string|max:20',`;
const validateNew = `            'hora_intervencion' => 'required|string|max:20',
            'municipio' => 'required|string|max:100',
            'calle' => 'required|string|max:150',
            'numero' => 'nullable|string|max:50',
            'colonia' => 'required|string|max:100',

            'imagen_1' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',
            'imagen_2' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',
            'imagen_3' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',

            'placas' => 'required|string|max:20',`;
if(code.includes(validateOld)) code = code.replace(validateOld, validateNew);
else code = code.replace(validateOld.replace(/\n/g, '\r\n'), validateNew.replace(/\n/g, '\r\n'));

// 4. Update create fields
const createOld = `        $infraccion = Infraccion::create([
            'folio' => $folio,
            'amonestacion_id' => $request->amonestacion_id ?? null,
            'fecha_expedicion' => $request->fecha_expedicion,
            'hora_intervencion' => $request->hora_intervencion,
            'municipio' => $request->municipio,
            'ubicacion_exacta' => $request->ubicacion_exacta,`;
const createNew = `        $img1 = $request->file('imagen_1') ? $request->file('imagen_1')->store('infracciones', 'public') : null;
        $img2 = $request->file('imagen_2') ? $request->file('imagen_2')->store('infracciones', 'public') : null;
        $img3 = $request->file('imagen_3') ? $request->file('imagen_3')->store('infracciones', 'public') : null;

        $infraccion = Infraccion::create([
            'folio' => $folio,
            'fecha_expedicion' => $request->fecha_expedicion,
            'hora_intervencion' => $request->hora_intervencion,
            'municipio' => $request->municipio,
            'calle' => $request->calle,
            'numero' => $request->numero,
            'colonia' => $request->colonia,
            
            'imagen_1' => $img1,
            'imagen_2' => $img2,
            'imagen_3' => $img3,`;
if(code.includes(createOld)) code = code.replace(createOld, createNew);
else code = code.replace(createOld.replace(/\n/g, '\r\n'), createNew.replace(/\n/g, '\r\n'));

fs.writeFileSync(path, code);
console.log("Done");
