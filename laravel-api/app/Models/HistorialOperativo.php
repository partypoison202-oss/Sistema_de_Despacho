<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialOperativo extends Model
{
    use HasFactory;

    protected $table = 'historial_operativo';

    protected $fillable = [
        'fecha_historial',
        'unidad_id',
        'ruta',
        'numero_tarjeton',
        'nombre_conductor',
        'tipo',
        'estatus',
        'falla',
        'corridas',
        'ciclo',
        'motivo',
        'hora_programada',
        'motivo_estatus',
        'fecha_registro',
    ];

    public function unidad()
    {
        return $this->belongsTo(Unidad::class);
    }
}
