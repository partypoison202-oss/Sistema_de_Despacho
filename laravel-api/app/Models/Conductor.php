<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conductor extends Model
{
    use HasFactory;

    protected $table = 'conductores';

    protected $fillable = [
        'nombre',
        'tarjeton',
        'tipo_tarjeton',
        'estado_servicio',
        'estatus',
        'ultima_capacitacion',
        'proxima_capacitacion',
        'accidentes_siniestros',
        'faltas',
        'retardos',
        'amonestaciones',
        'reconocimientos',
        'condicionamientos_juridicos',
        'permutas',
        'permisos',
        'evaluacion',
        'observaciones',
        'vigencia_licencia',
        'sexo',
        'fecha_nacimiento',
        'telefono',
        'referencia_1',
        'referencia_2',
        'fecha_ingreso',
        'amonestaciones_detalle',
        'reconocimientos_detalle',
        'permisos_detalle',
        'permutas_detalle',
        'condicionamientos_medicos'
    ];

    protected $casts = [
        'amonestaciones_detalle' => 'array',
        'reconocimientos_detalle' => 'array',
        'permisos_detalle' => 'array',
        'permutas_detalle' => 'array',
    ];
}
