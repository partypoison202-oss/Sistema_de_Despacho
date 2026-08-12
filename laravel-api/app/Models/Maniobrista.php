<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Maniobrista extends Model
{
    use HasFactory;

    protected $table = 'maniobristas';

    protected $fillable = [
        'nombre',
        'identificador',
        'estado_servicio',
        'estatus'
    ];
}
