<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conductor extends Model
{
    use HasFactory;

    protected $table = 'conductores';

    protected $appends = ['nombre', 'info_ventana_faltas'];

    protected $fillable = [
        'nombres',
        'apellidos',
        'tarjeton',
        'tipo_tarjeton',
        'estado_servicio',
        'estatus',
        'ultima_capacitacion',
        'proxima_capacitacion',
        'accidentes_siniestros',
        'faltas',
        'retardos',
        'amonestaciones',
        'reconocimientos',
        'condicionamientos_juridicos',
        'permutas',
        'permisos',
        'evaluacion',
        'observaciones',
        'vigencia_licencia',
        'sexo',
        'fecha_nacimiento',
        'telefono',
        'referencia_1',
        'referencia_2',
        'fecha_ingreso',
        'amonestaciones_detalle',
        'reconocimientos_detalle',
        'permisos_detalle',
        'permutas_detalle',
        'condicionamientos_medicos',
        'accidentes_siniestros_detalle',
        'faltas_detalle'
    ];

    protected $casts = [
        'amonestaciones_detalle' => 'array',
        'reconocimientos_detalle' => 'array',
        'permisos_detalle' => 'array',
        'permutas_detalle' => 'array',
        'accidentes_siniestros_detalle' => 'array',
        'faltas_detalle' => 'array',
    ];

    public function setTarjetonAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['tarjeton'] = $value;
            return;
        }
        $parts = explode('_BAJA_', $value);
        $parts[0] = str_pad($parts[0], 4, '0', STR_PAD_LEFT);
        $this->attributes['tarjeton'] = implode('_BAJA_', $parts);
    }

    public function getNombreAttribute()
    {
        return trim("{$this->apellidos} {$this->nombres}");
    }

    public function evaluarInhabilitacionFaltas()
    {
        $rawDetalle = $this->faltas_detalle;
        $detalle = [];
        if (is_array($rawDetalle)) {
            $detalle = $rawDetalle;
        } elseif (is_string($rawDetalle) && !empty($rawDetalle)) {
            $parsed = json_decode($rawDetalle, true);
            if (is_array($parsed)) {
                $detalle = $parsed;
            }
        }

        $faltasNoJustificadas = [];
        foreach ($detalle as $item) {
            $esJustificada = isset($item['estado']) && $item['estado'] === 'justificada';
            if (isset($item['justificada']) && $item['justificada']) {
                $esJustificada = true;
            }
            if (!$esJustificada) {
                $fechaStr = $item['fecha'] ?? null;
                if ($fechaStr && $fechaStr !== 'Fecha sin registrar') {
                    $timestamp = strtotime(substr($fechaStr, 0, 10));
                    if ($timestamp !== false) {
                        $faltasNoJustificadas[] = [
                            'item' => $item,
                            'fecha' => date('Y-m-d', $timestamp),
                            'timestamp' => strtotime(date('Y-m-d', $timestamp)),
                        ];
                    }
                } else {
                    // Si no tiene fecha bien definida pero existe como falta no justificada, asumir hoy o fecha de creación
                    $ts = strtotime($this->created_at ? $this->created_at->format('Y-m-d') : date('Y-m-d'));
                    $faltasNoJustificadas[] = [
                        'item' => $item,
                        'fecha' => date('Y-m-d', $ts),
                        'timestamp' => $ts,
                    ];
                }
            }
        }

        usort($faltasNoJustificadas, function ($a, $b) {
            return $a['timestamp'] <=> $b['timestamp'];
        });

        if (empty($faltasNoJustificadas)) {
            return [
                'inhabilitado' => false,
                'faltas_ventana_activa' => 0,
                'ventana_inicio' => null,
                'ventana_fin' => null,
                'dias_restantes_ventana' => 0,
            ];
        }

        $inhabilitado = false;
        $ventanaInicio = null;
        $ventanaFin = null;
        $faltasEnVentana = [];
        $todayTimestamp = strtotime(date('Y-m-d'));

        $i = 0;
        $total = count($faltasNoJustificadas);

        while ($i < $total) {
            $inicioTs = $faltasNoJustificadas[$i]['timestamp'];
            $finTs = strtotime('+30 days', $inicioTs);

            $currentVentanaFaltas = [];
            while ($i < $total && $faltasNoJustificadas[$i]['timestamp'] <= $finTs) {
                $currentVentanaFaltas[] = $faltasNoJustificadas[$i];
                $i++;
            }

            $countInVentana = count($currentVentanaFaltas);
            $ventanaInicio = date('Y-m-d', $inicioTs);
            $ventanaFin = date('Y-m-d', $finTs);
            $faltasEnVentana = $currentVentanaFaltas;

            if ($countInVentana >= 4) {
                $inhabilitado = true;
                break;
            }
        }

        $faltasVentanaCount = count($faltasEnVentana);

        if (!$inhabilitado && $ventanaFin && strtotime($ventanaFin) < $todayTimestamp) {
            $faltasVentanaCount = 0;
            $diasRestantes = 0;
        } else {
            $diasRestantes = $ventanaFin ? max(0, (int)ceil((strtotime($ventanaFin) - $todayTimestamp) / 86400)) : 0;
        }

        return [
            'inhabilitado' => $inhabilitado,
            'faltas_ventana_activa' => $faltasVentanaCount,
            'ventana_inicio' => $ventanaInicio,
            'ventana_fin' => $ventanaFin,
            'dias_restantes_ventana' => $diasRestantes,
        ];
    }

    public function getInfoVentanaFaltasAttribute()
    {
        return $this->evaluarInhabilitacionFaltas();
    }
}
