<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProgramacionInicial extends Model
{
    use HasFactory;

    protected $table = 'programacion_inicial';

    protected $guarded = ['id', 'created_at', 'updated_at'];

    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

    public function relevo()
    {
        return $this->belongsTo(Conductor::class, 'relevo_conductor_id');
    }

    public function maniobrista()
    {
        return $this->belongsTo(Maniobrista::class, 'maniobrista_id');
    }
}
