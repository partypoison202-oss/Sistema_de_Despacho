<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unidad extends Model
{
    use HasFactory;

    // Nombre de la tabla en la base de datos
    protected $table = 'unidades';

    protected $fillable = [
        'transporte_id',
        'numero_eco'
    ];

    /**
     * Relación con el modelo Transporte
     * Cada unidad pertenece a un tipo de transporte
     */
    public function transporte()
    {
        return $this->belongsTo(Transporte::class, 'transporte_id');
    }

    /**
     * Relación con el modelo InformacionOperativa
     * Una unidad puede tener muchos registros de información operativa
     */
    public function informacionesOperativas()
    {
        return $this->hasMany(InformacionOperativa::class, 'unidad_id');
    }
}
