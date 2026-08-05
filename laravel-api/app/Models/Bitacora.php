<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Bitacora extends Model
{
    use HasFactory;

    protected $fillable = [
        'corrida',
        'ruta',
        'unidad',
        'cambio_1',
        'cambio_2',
        'cambio_3',
        'cambio_4',
        'id_matutino',
        'id_vespertino',
    ];
}
