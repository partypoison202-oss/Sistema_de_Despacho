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
        'observaciones'
    ];
}
