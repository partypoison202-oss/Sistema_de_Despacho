<?php
$data = ['tipo' => 'urbanuss', 'numero_eco' => '004', 'ciclo' => '1', 'motivo' => 'Falta de Unidad'];
$ch = curl_init('http://localhost:8000/api/despacho/actualizar-adicionales');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
echo curl_exec($ch);
