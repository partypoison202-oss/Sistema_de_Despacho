<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Amonestacion extends Model
{
    use HasFactory;

    protected $table = 'amonestaciones';

    protected $fillable = [
        'folio',
        'fecha',
        'lugar',
        'placas',
        'entidad_federativa',
        'marca',
        'modelo',
        'color',
        'conductor_nombre',
        'conductor_identificacion',
        'inspector_id',
        'inspector_nombre',
        'inspector_gafete',
        'adscripcion',
        'firma_inspector',
        'conductor_nego_firmar',
        'recibio_nombre',
        'firma_conductor',
    ];

    protected $casts = [
        'fecha' => 'datetime',
        'conductor_nego_firmar' => 'boolean',
    ];

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }
}
