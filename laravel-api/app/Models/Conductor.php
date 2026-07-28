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
        'estatus'
    ];
}
