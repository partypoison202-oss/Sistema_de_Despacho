<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InformacionOperativa extends Model
{
    use HasFactory;

    // Le decimos a Laravel el nombre exacto de tu tabla en Postgres
    protected $table = 'informacion_operativa';

    // Desactivamos timestamps estándar de Laravel (ya que usas fecha_registro)
    public $timestamps = false;

    protected $fillable = [
        'unidad_id',
        'ruta',
        'numero_tarjeton',
        'nombre_conductor',
        'fecha_registro'
    ];

    /**
     * Relación con el modelo Unidad
     * Cada registro operativo pertenece a una unidad específica
     */
    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }
}