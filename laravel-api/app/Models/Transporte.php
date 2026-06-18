<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transporte extends Model
{
    use HasFactory;

    // Nombre de la tabla en la base de datos
    protected $table = 'transportes';

    protected $fillable = [
        'nombre'
    ];

    // Desactivamos los timestamps ya que la tabla 'transportes' en database.sql no los tiene
    public $timestamps = false;

    /**
     * Relación con el modelo Unidad
     * Un transporte (ej. URBANUSS, ZAFIRO) tiene muchas unidades
     */
    public function unidades()
    {
        return $this->hasMany(Unidad::class, 'transporte_id');
    }
}
