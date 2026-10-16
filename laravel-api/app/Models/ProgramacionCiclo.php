<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProgramacionCiclo extends Model
{
    use HasFactory;

    protected $table = 'programacion_ciclos';

    protected $fillable = [
        'fecha_operativa',
        'ciclos',
    ];
}
