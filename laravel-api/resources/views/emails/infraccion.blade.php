<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Boleta de Infracción</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #601a2a; border-bottom: 2px solid #601a2a; padding-bottom: 10px;">Boleta de Infracción - Sistema de Despacho</h2>
    <p>Estimado(a) <strong>{{ $infraccion->conductor_nombre }}</strong>,</p>
    
    <p>Se ha emitido una boleta de infracción asociada a su vehículo o persona. A continuación se presentan los detalles principales:</p>
    
    <ul>
        <li><strong>Folio:</strong> {{ $infraccion->folio }}</li>
        <li><strong>Fecha de Infracción:</strong> {{ \Carbon\Carbon::parse($infraccion->fecha_expedicion)->format('d/m/Y') }} a las {{ $infraccion->hora_intervencion }}</li>
        <li><strong>Vehículo:</strong> {{ $infraccion->marca }} {{ $infraccion->modelo }} (Placas: {{ $infraccion->placas }})</li>
        <li><strong>Sanción en UMA:</strong> {{ number_format($infraccion->sancion_uma, 2) }} UMAs</li>
        <li><strong>Garantía retenida:</strong> {{ $infraccion->garantia_tipo }}</li>
    </ul>

    <p>Puede consultar el documento digital original generado por el sistema en el <strong>archivo PDF adjunto</strong> a este correo electrónico.</p>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666;">
        Este es un mensaje generado automáticamente por el Sistema de Despacho del Sistema Integrado de Transporte Masivo de Hidalgo (SITMAH). Por favor, no responda a este correo.
    </p>
</body>
</html>