<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Infraccion extends Model
{
    use HasFactory;

    protected $table = 'infracciones';

    protected $fillable = [
        'folio',
        'amonestacion_id',
        'fecha_expedicion',
        'hora_intervencion',
        'municipio',
        'ubicacion_exacta',
        'imagen_1',
        'imagen_2',
        'imagen_3',
        'imagen_4',
        'imagen_5',
        'placas',
        'entidad_federativa',
        'marca',
        'submarca',
        'modelo',
        'color',
        'niv_vin',
        'tipo_vehiculo',
        'conductor_nombre',
        'conductor_domicilio',
        'licencia_numero',
        'licencia_tipo',
        'licencia_estado',
        'calidad_conductor',
        'correo_infractor',
        'motivacion_hecho',
        'descripcion_hechos',
        'sancion_uma',
        'garantia_tipo',
        'garantia_observaciones',
        'inspector_id',
        'inspector_nombre',
        'inspector_gafete',
        'adscripcion',
        'firma_inspector',
        'conductor_nego_firmar',
        'recibio_nombre',
        'firma_conductor',
    ];

    protected $casts = [
        'fecha_expedicion' => 'datetime',
        'conductor_nego_firmar' => 'boolean',
        'sancion_uma' => 'float',
    ];

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function amonestacion()
    {
        return $this->belongsTo(Amonestacion::class, 'amonestacion_id');
    }
}
