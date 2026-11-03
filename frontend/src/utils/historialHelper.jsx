import React from 'react';

/**
 * Utilidades para formateo y estandarización visual de las bitácoras y registros
 * en todos los módulos de "Histórico de la Operación" (ACOTMA).
 * Replica con precisión el diseño mostrado en la referencia:
 * - Píldoras rosadas de cabecera / tipo de evento (`#fee2e2`, `#991b1b`)
 * - Badges de transición con valor anterior tachado (`#f1f5f9`, strikethrough) -> nuevo en verde (`#dcfce7`, `#15803d`)
 * - Cuadros de Motivo / Justificación en tono ámbar/crema con bandera (`#fffbeb`, `#f59e0b`)
 * - Badges estilizados para valores individuales (fallas, incidencias, conductores, rutas)
 */

export const formatAccion = (accion) => {
  if (!accion) return 'Acción General';
  switch (accion.toUpperCase()) {
    case 'CAMBIO_ESTATUS': return 'Cambio de Estatus';
    case 'CAMBIO_HORAS': return 'Modificación de Horarios / Acople';
    case 'CAMBIO_RUTA': return 'Cambio de Ruta';
    case 'CAMBIO_CONDUCTOR': return 'Cambio de Conductor';
    case 'ASIGNAR_OPERADOR':
    case 'ASIGNACION_CONDUCTOR': return 'Asignación de Conductor';
    case 'DESASIGNAR_OPERADOR':
    case 'RETIRO_CONDUCTOR': return 'Desasignación de Conductor';
    case 'VALIDAR_DESPACHO': return 'Validación de Despacho';
    case 'CAMBIO_UNIDAD_REEMPLAZO': return 'Reemplazo de Unidad';
    case 'INCORPORACION': return 'Incorporación';
    case 'DESINCORPORACION': return 'Desincorporación';
    case 'MANTENIMIENTO': return 'Registro Mantenimiento';
    case 'GENERAR_FOLIO': return 'Generación Folio Mantenimiento';
    case 'ASIGNACION_INCIDENCIA': return 'Asignación de Incidencia';
    case 'REGISTRO_INFRACCION': return 'Registro Infracción';
    case 'RELEVO_TARJETON': return 'Relevo de Conductor';
    case 'ACTUALIZACION_DATOS': return 'Actualización de Datos';
    case 'ASIGNACION_FOLIO': return 'Asignación de Folio';
    case 'PROGRAMACION_LOGISTICA': return 'Programación Logística';
    default:
      return accion.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
};

export const getAccionBadgeStyle = (accion) => {
  if (!accion) return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  const act = accion.toUpperCase();
  if (act.includes('VALIDAR') || act.includes('INCORPORACION')) {
    return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
  }
  if (act.includes('DESINCORPORACION') || act.includes('ESTATUS')) {
    return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
  }
  if (act.includes('HORAS') || act.includes('RUTA') || act.includes('CONDUCTOR') || act.includes('ASIGNAR') || act.includes('DATOS') || act.includes('PROGRAMACION')) {
    return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
  }
  if (act.includes('MANTENIMIENTO') || act.includes('FOLIO') || act.includes('INCIDENCIA')) {
    return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
  }
  if (act.includes('INFRACCION') || act.includes('REEMPLAZO') || act.includes('RETIRO')) {
    return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
  }
  return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
};

export const humanizeTexto = (texto) => {
  if (!texto) return '';
  let str = String(texto).trim();
  str = str.replace(/^['"]+|['"]+$/g, '').trim();

  const normalizaciones = {
    'SIN FOLIO': 'SIN FOLIO',
    'SIN FECHA': 'SIN FECHA',
    'SIN RUTA': 'SIN RUTA',
    'SIN ASIGNAR': 'SIN ASIGNAR',
    'SIN ASIGNAR (S/T)': 'SIN ASIGNAR (S/T)',
    'SIN INCIDENCIA': 'SIN INCIDENCIA',
    'S/T': 'S/T',
    'OPERACION': 'OPERACION',
    'OPERACIÓN': 'OPERACION',
    'MANTENIMIENTO': 'MANTENIMIENTO',
    'RESERVA': 'RESERVA',
    'PERCANCE': 'PERCANCE',
    'BAJA': 'BAJA',
    'TALLER': 'TALLER',
    'PATIO': 'PATIO',
    'DISPONIBLE': 'DISPONIBLE'
  };

  const upper = str.toUpperCase();
  if (normalizaciones[upper]) {
    return normalizaciones[upper];
  }

  return str;
};

const getFieldIcon = (label = '') => {
  const lbl = String(label).toUpperCase();
  if (lbl.includes('FOLIO') || lbl.includes('FECHA')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    );
  }
  if (lbl.includes('ESTATUS') || lbl.includes('ESTADO')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="1 4 1 10 7 10"></polyline>
        <polyline points="23 20 23 14 17 14"></polyline>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
      </svg>
    );
  }
  if (lbl.includes('RUTA')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="10" r="3"></circle>
        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path>
      </svg>
    );
  }
  if (lbl.includes('CONDUCTOR') || lbl.includes('OPERADOR') || lbl.includes('TITULAR') || lbl.includes('RELEVO') || lbl.includes('TARJET')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    );
  }
  if (lbl.includes('INCIDENCIA')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    );
  }
  if (lbl.includes('FALLA') || lbl.includes('PERCANCE')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    );
  }
  if (lbl.includes('HORA') || lbl.includes('SALIDA') || lbl.includes('ENCIERRO') || lbl.includes('ACOPLE')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    );
  }
  if (lbl.includes('LITROS') || lbl.includes('COMBUSTIBLE') || lbl.includes('MONTO') || lbl.includes('KILOMETRAJE')) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path>
        <line x1="3" y1="22" x2="21" y2="22"></line>
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
};

/**
 * Parsea el texto de `detalles` y estructura los campos, transiciones y motivo.
 * Cubre exhaustivamente todos los formatos generados por el backend (despacho, encierro,
 * mantenimiento, programación, pasteles, combustible y conductores).
 */
export const parseDetallesOperacion = (detalles, estatusAnterior = null, estatusNuevo = null) => {
  if (!detalles || typeof detalles !== 'string') {
    if (estatusAnterior && estatusNuevo && String(estatusAnterior).toUpperCase() !== String(estatusNuevo).toUpperCase()) {
      return {
        header: 'CAMBIO DE ESTATUS',
        items: [{
          label: 'ESTATUS',
          isTransition: true,
          from: String(estatusAnterior).toUpperCase(),
          to: String(estatusNuevo).toUpperCase(),
        }],
        motivo: null,
      };
    }
    return { header: null, items: [], motivo: null };
  }

  let text = detalles.trim();
  let header = null;
  let motivo = null;
  const items = [];

  // 1. Extraer motivo explícito si existe
  const motivoMatch = text.match(/(?:MOTIVO AUDITOR[IÍ]A|POR MOTIVO|MOTIVO\s*\/S*JUSTIFICACI[OÓ]N|MOTIVO RETIRO ANTERIOR|MOTIVO):\s*([^|;]+)/i);
  if (motivoMatch) {
    motivo = motivoMatch[1].trim().replace(/^['"]+|['"]+$/g, '');
    text = text.replace(motivoMatch[0], '').replace(/\|\s*\|/g, '|').trim();
    if (text.endsWith('|') || text.endsWith('-')) text = text.slice(0, -1).trim();
  }

  // 2. Patrones específicos de acciones frecuentes:
  // A. Salida validada de patio
  const salidaPatioMatch = text.match(/^SALIDA VALIDADA DE PATIO A LAS\s+([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i);
  if (salidaPatioMatch) {
    header = 'SALIDA VALIDADA DE PATIO';
    items.push({ label: 'HORA SALIDA', value: salidaPatioMatch[1] });
    text = '';
  }

  // B. Unidad encerrada automáticamente
  const encierroAutoMatch = text.match(/^UNIDAD ENCERRADA AUTOM[AÁ]TICAMENTE A LAS\s+([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)(?:\s+POR\s+(.*))?/i);
  if (encierroAutoMatch) {
    header = 'ENCIERRO AUTOMÁTICO DE UNIDAD';
    items.push({ label: 'HORA ENCIERRO', value: encierroAutoMatch[1] });
    if (!motivo && encierroAutoMatch[2]) {
      motivo = encierroAutoMatch[2].trim();
    }
    text = '';
  }

  // C. Despacho validado
  const despachoValMatch = text.match(/^DESPACHO VALIDADO\s*-\s*HORA SALIDA:\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i);
  if (despachoValMatch) {
    header = 'DESPACHO VALIDADO';
    items.push({ label: 'HORA SALIDA', value: despachoValMatch[1] });
    text = '';
  }

  // D. Horas compuestas: "ACTUALIZÓ HORA PROGRAMADA (ANTERIOR: 05:04, NUEVA: 05:04) Y ACOPLE (ANTERIOR: SIN ASIGNAR, NUEVA: 09:41:48)"
  const horasMatch = text.match(/ACTUALIZ[OÓ]\s+HORA PROGRAMADA\s*\(ANTERIOR:\s*([^,]+),\s*NUEVA:\s*([^)]+)\)\s+Y\s+ACOPLE\s*\(ANTERIOR:\s*([^,]+),\s*NUEVA:\s*([^)]+)\)/i);
  if (horasMatch) {
    header = 'ACTUALIZACIÓN DE HORARIOS';
    items.push({
      label: 'HORA PROGRAMADA',
      isTransition: true,
      from: horasMatch[1].trim(),
      to: horasMatch[2].trim(),
    });
    items.push({
      label: 'HORA ACOPLE',
      isTransition: true,
      from: horasMatch[3].trim(),
      to: horasMatch[4].trim(),
    });
    text = '';
  }

  // E. Cambio de conductor: "CAMBIO DE CONDUCTOR A: 0965 - VELAZQUEZ ESCALANTE CARLOS GERARDO"
  const cambioCondMatch = text.match(/^CAMBIO DE CONDUCTOR A:\s*([0-9]+)\s*-\s*(.*?)(?:\s*-\s*)?$/i);
  if (cambioCondMatch) {
    header = 'CAMBIO DE CONDUCTOR';
    items.push({ label: 'TARJETÓN', value: cambioCondMatch[1].trim() });
    items.push({ label: 'CONDUCTOR', value: cambioCondMatch[2].trim() });
    text = '';
  }

  // F. Retiro de conductor: "RETIRO DE CONDUCTOR: 0067"
  const retiroCondMatch = text.match(/^RETIRO DE CONDUCTOR:\s*([0-9]+)/i);
  if (retiroCondMatch) {
    header = 'RETIRO DE CONDUCTOR';
    items.push({ label: 'TARJETÓN', value: retiroCondMatch[1].trim() });
    text = '';
  }

  // G. Incorporación por reemplazo
  const incReemplazoMatch = text.match(/^INCORPORACI[OÓ]N POR REEMPLAZO DE ECO\s*([0-9A-Z]+)\s*-\s*(.*)$/i);
  if (incReemplazoMatch) {
    header = `INCORPORACIÓN POR REEMPLAZO EN ECO ${incReemplazoMatch[1]}`;
    text = incReemplazoMatch[2].trim();
  }

  // H. Incorporación sencilla
  const incSencillaMatch = text.match(/^INCORPORACI[OÓ]N\s*-\s*(.*)$/i);
  if (incSencillaMatch && !header) {
    header = 'INCORPORACIÓN DE UNIDAD';
    text = incSencillaMatch[1].trim();
  }

  // I. Desincorporación
  const desincMatch = text.match(/^DESINCORPORACI[OÓ]N(?:\s+A\s+([A-ZÁÉÍÓÚÑ]+))?\s*(?:-\s*)?$/i);
  if (desincMatch && !header) {
    header = desincMatch[1] ? `DESINCORPORACIÓN A ${desincMatch[1].toUpperCase()}` : 'DESINCORPORACIÓN DE UNIDAD';
    text = '';
  }

  // J. Cambio de estatus directo en texto: "CAMBIO DE ESTATUS DE [E1] A [E2] ..."
  const estatusDirectoMatch = text.match(/^CAMBIO DE ESTATUS DE\s+([A-ZÁÉÍÓÚÑ_-]+)\s+A\s+([A-ZÁÉÍÓÚÑ_-]+)(?:\s*\(([^)]+)\))?/i);
  if (estatusDirectoMatch) {
    header = estatusDirectoMatch[3] ? `CAMBIO DE ESTATUS (${estatusDirectoMatch[3].toUpperCase()})` : 'CAMBIO DE ESTATUS';
    items.push({
      label: 'ESTATUS',
      isTransition: true,
      from: estatusDirectoMatch[1].trim().toUpperCase(),
      to: estatusDirectoMatch[2].trim().toUpperCase(),
    });
    text = '';
  }

  // 3. Header genérico si viene al inicio separado por ':' o '-'
  const headerMatch = text.match(/^(ACTUALIZACI[OÓ]N DE FOLIO\/FECHA EN ECO \d+|MODIFICACI[OÓ]N EN PROGRAMACI[OÓ]N\s*(?:\([^)]+\))?|ALTA DE PROGRAMACI[OÓ]N\s*(?:\([^)]+\))?|ASIGNACI[OÓ]N DE INCIDENCIA|ASIGNACI[OÓ]N DE FOLIO|ACTUALIZACI[OÓ]N DE DATOS|ACTUALIZACI[OÓ]N DE HORARIO\s*\/\s*ACOPLE)\s*[-:]\s*(.*)$/i);
  if (headerMatch) {
    header = headerMatch[1].trim().toUpperCase();
    text = headerMatch[2].trim();
  }

  // 4. Incidencia con falla: "ASIGNACIÓN DE INCIDENCIA: OCT-2 - FALLA: FALLA DE PISTONES" o "OCT-2 - FALLA: FALLA DE PISTONES"
  const incFallaMatch = text.match(/^(?:ASIGNACI[OÓ]N DE INCIDENCIA:\s*)?([A-Z0-9_-]+)\s*-\s*FALLA:\s*(.*)$/i);
  if (incFallaMatch) {
    if (!header) header = 'ASIGNACIÓN DE INCIDENCIA';
    items.push({ label: 'INCIDENCIA', value: incFallaMatch[1].trim().toUpperCase() });
    items.push({ label: 'FALLA', value: incFallaMatch[2].trim().toUpperCase() });
    text = '';
  }

  // 5. Chunks separados por '|' o ','
  if (text) {
    const delimiter = text.includes('|') ? '|' : (text.includes(';') ? ';' : (text.includes(',') && !text.includes('->') ? ',' : null));
    const chunks = delimiter ? text.split(delimiter) : [text];

    chunks.forEach((chunk) => {
      const c = chunk.trim();
      if (!c) return;

      // Transición con flecha
      const transMatch = c.match(/^(?:([A-Za-zÁÉÍÓÚÑ\s/]+):\s*)?(.*?)\s*(?:->|→|➔)\s*(.*)$/i);
      if (transMatch && (transMatch[2] || transMatch[3])) {
        const rawLabel = transMatch[1] ? transMatch[1].trim().toUpperCase() : 'MODIFICACIÓN';
        const rawFrom = transMatch[2].trim().replace(/^['"]+|['"]+$/g, '');
        const rawTo = transMatch[3].trim().replace(/^['"]+|['"]+$/g, '');
        items.push({
          label: rawLabel,
          isTransition: true,
          from: rawFrom || '—',
          to: rawTo || '—',
        });
        return;
      }

      // Clave: Valor
      const kvMatch = c.match(/^([A-Za-zÁÉÍÓÚÑ\s/]+):\s*(.*)$/i);
      if (kvMatch && kvMatch[2].trim()) {
        const lbl = kvMatch[1].trim().toUpperCase();
        const val = kvMatch[2].trim().replace(/^['"]+|['"]+$/g, '');
        items.push({
          label: lbl,
          value: val,
        });
        return;
      }

      // Texto libre
      items.push({
        label: null,
        value: c,
      });
    });
  }

  // Si se pasaron estatusAnterior y estatusNuevo y no existe aún fila de ESTATUS en items
  if (
    estatusAnterior &&
    estatusNuevo &&
    String(estatusAnterior).toUpperCase() !== String(estatusNuevo).toUpperCase() &&
    !items.some((it) => it.label === 'ESTATUS')
  ) {
    items.unshift({
      label: 'ESTATUS',
      isTransition: true,
      from: String(estatusAnterior).toUpperCase(),
      to: String(estatusNuevo).toUpperCase(),
    });
  }

  return { header, items, motivo };
};

/**
 * Convierte los detalles a un texto plano limpio para exportaciones a Excel.
 */
export const formatDetallesTexto = (detalles, estatusAnterior = null, estatusNuevo = null) => {
  if (!detalles && !estatusAnterior) return '';
  const parsed = parseDetallesOperacion(detalles, estatusAnterior, estatusNuevo);
  const parts = [];
  if (parsed.header) parts.push(`[${parsed.header}]`);
  parsed.items.forEach((it) => {
    if (it.isTransition) {
      const lbl = it.label ? `${it.label}: ` : '';
      parts.push(`${lbl}${it.from} → ${it.to}`);
    } else if (it.label) {
      parts.push(`${it.label}: ${it.value}`);
    } else {
      parts.push(it.value);
    }
  });
  if (parsed.motivo) {
    parts.push(`MOTIVO / JUSTIFICACIÓN: "${parsed.motivo}"`);
  }
  return parts.join(' | ');
};

/**
 * Componente visual que reproduce con exactitud el formato mostrado en la referencia:
 * - Header pill en tono rosa/rojo `#fee2e2`
 * - Renglones con ícono, etiqueta en negrita, valor anterior tachado y valor nuevo en verde `#dcfce7` con tooltip "Valor nuevo actualizado"
 * - Cuadro de "MOTIVO / JUSTIFICACIÓN" en tono ámbar/crema `#fffbeb` con bandera e itálica entre comillas
 * - Badges monocromáticos o destacados para fallas e incidencias
 */
export const DetalleOperacion = ({
  detalles,
  estatusAnterior = null,
  estatusNuevo = null,
  fallback = 'Sin observaciones'
}) => {
  if (!detalles && !estatusAnterior) {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.82rem' }}>{fallback}</span>;
  }

  const parsed = parseDetallesOperacion(detalles, estatusAnterior, estatusNuevo);

  if (parsed.items.length === 0 && !parsed.header && !parsed.motivo) {
    return (
      <span style={{ color: '#334155', fontSize: '0.82rem' }}>
        {detalles || fallback}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', textAlign: 'left', minWidth: '240px', padding: '0.2rem 0', lineHeight: 1.35 }}>
      {/* 1. Header Tag (Píldora rosa/rojo) */}
      {parsed.header && (
        <div
          style={{
            display: 'inline-block',
            width: 'fit-content',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '0.18rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: '800',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '0.1rem',
          }}
        >
          {parsed.header}
        </div>
      )}

      {/* 2. Renglones de Modificación / Transición / Campos */}
      {parsed.items.map((item, idx) => {
        const icon = getFieldIcon(item.label || '');

        if (item.isTransition) {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                flexWrap: 'wrap',
                fontSize: '0.82rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontWeight: '800',
                  color: '#1e293b',
                  fontSize: '0.75rem',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                {icon}
                {item.label}:
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {/* Valor anterior con tachado */}
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.15rem 0.48rem',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    textDecoration: 'line-through',
                  }}
                >
                  {item.from}
                </span>

                {/* Flecha */}
                <span style={{ color: '#0f172a', fontWeight: '900', fontSize: '0.85rem' }}>→</span>

                {/* Valor nuevo actualizado (Verde) */}
                <span
                  title="Valor nuevo actualizado"
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    padding: '0.15rem 0.52rem',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    cursor: 'help',
                  }}
                >
                  {item.to}
                </span>
              </span>
            </div>
          );
        }

        // Renglón de campo individual (clave: valor)
        const isFalla = item.label === 'FALLA' || item.label === 'PERCANCE';
        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              flexWrap: 'wrap',
              fontSize: '0.82rem',
            }}
          >
            {item.label && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontWeight: '800',
                  color: '#1e293b',
                  fontSize: '0.75rem',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                {icon}
                {item.label}:
              </span>
            )}
            <span
              style={{
                display: 'inline-block',
                backgroundColor: isFalla ? '#fee2e2' : '#f1f5f9',
                color: isFalla ? '#991b1b' : '#0f172a',
                border: isFalla ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0.15rem 0.52rem',
                fontSize: '0.78rem',
                fontWeight: '700',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {item.value}
            </span>
          </div>
        );
      })}

      {/* 3. Cuadro de Motivo / Justificación (Ámbar / Crema con bandera) */}
      {parsed.motivo && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fed7aa',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '6px',
            padding: '0.35rem 0.6rem',
            marginTop: '0.15rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: '#9a3412',
              fontSize: '0.72rem',
              fontWeight: '800',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              marginBottom: '0.1rem',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            MOTIVO / JUSTIFICACIÓN:
          </div>
          <div style={{ color: '#451a03', fontSize: '0.78rem', fontWeight: '700', fontStyle: 'italic' }}>
            "{parsed.motivo}"
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Interpreta cambios de mantenimiento para badges y pills
 */
export const interpretarCambioMantenimiento = (d) => {
  if (!d) {
    return {
      modificacion: 'Acción General',
      badgeStyle: getAccionBadgeStyle(''),
      valorAnterior: '-',
      valorNuevo: '-',
      detalles: 'Sin detalles adicionales',
      tipoPillNuevo: 'default'
    };
  }

  const accion = String(d.tipo_accion || '').toUpperCase();
  const ant = String(d.estatus_anterior || '').trim().toUpperCase();
  const nue = String(d.estatus_nuevo || '').trim().toUpperCase();
  const rawDetalles = String(d.detalles || '').trim();

  let incVal = d.numero_incidencia || d.incidencia || null;
  if (!incVal && rawDetalles.includes(':')) {
    const matchInc = rawDetalles.match(/INCIDENCIA:\s*([A-Z0-9-]+)/i);
    if (matchInc) incVal = matchInc[1].trim();
  }
  if (!incVal && (accion.includes('INCIDENCIA') || nue.startsWith('OCT-') || nue.startsWith('INC-'))) {
    incVal = (nue && nue !== 'INCIDENCIA ASIGNADA' && nue !== 'MANTENIMIENTO') ? nue : null;
  }

  let folVal = d.folio_mantenimiento || d.folio || null;
  if (!folVal && rawDetalles.includes(':')) {
    const matchFol = rawDetalles.match(/FOLIO:\s*([A-Z0-9-]+)/i);
    if (matchFol) folVal = matchFol[1].trim();
  }
  if (!folVal && accion.includes('FOLIO')) {
    folVal = (nue && nue !== 'FOLIO ASIGNADO' && nue !== 'MANTENIMIENTO') ? nue : null;
  }

  if (accion.includes('INCIDENCIA') || rawDetalles.toUpperCase().includes('INCIDENCIA:')) {
    return {
      modificacion: 'Registro de Incidencia',
      badgeStyle: { backgroundColor: '#fdf2f4', color: '#A02142', border: '1px solid #fecdd3' },
      valorAnterior: ant && ant !== 'MANTENIMIENTO' && ant !== 'SIN INCIDENCIA' ? ant : 'Sin Incidencia',
      valorNuevo: incVal || nue || 'INCIDENCIA ASIGNADA',
      detalles: rawDetalles.includes('ASIGNACIÓN DE INCIDENCIA:')
        ? rawDetalles
        : (rawDetalles || `Asignación de N° de incidencia: ${incVal || nue || 'Registrada'}`),
      tipoPillNuevo: 'incidencia'
    };
  }

  if (accion.includes('FOLIO') || rawDetalles.toUpperCase().includes('FOLIO:')) {
    const esActualizacion = accion.includes('ACTUALIZ');
    return {
      modificacion: esActualizacion ? 'Actualizar Folio' : 'Asignar Folio',
      badgeStyle: { backgroundColor: '#fdfbf7', color: '#BC955B', border: '1.5px solid #DDC9A3' },
      valorAnterior: ant && ant !== 'MANTENIMIENTO' && ant !== 'SIN FOLIO' ? ant : 'Sin Folio',
      valorNuevo: folVal || nue || 'FOLIO ASIGNADO',
      detalles: rawDetalles.includes('ASIGNACIÓN DE FOLIO:')
        ? rawDetalles
        : (rawDetalles || `Asignación de folio de mtto: ${folVal || nue || 'Asignado'}`),
      tipoPillNuevo: 'folio'
    };
  }

  if (accion === 'CAMBIO_ESTATUS' || accion.includes('ESTATUS')) {
    if (ant && nue && ant === nue) {
      if (ant === 'MANTENIMIENTO') {
        if (incVal) {
          return {
            modificacion: 'Registro de Incidencia',
            badgeStyle: { backgroundColor: '#fdf2f4', color: '#A02142', border: '1px solid #fecdd3' },
            valorAnterior: 'Sin Incidencia',
            valorNuevo: incVal,
            detalles: rawDetalles.includes('DE MANTENIMIENTO A MANTENIMIENTO')
              ? `Registro de incidencia técnica en mtto: ${incVal}`
              : (rawDetalles || `Asignación de número de incidencia: ${incVal}`),
            tipoPillNuevo: 'incidencia'
          };
        }

        if (folVal) {
          return {
            modificacion: 'Asignar Folio',
            badgeStyle: { backgroundColor: '#fdfbf7', color: '#BC955B', border: '1.5px solid #DDC9A3' },
            valorAnterior: 'Sin Folio',
            valorNuevo: folVal,
            detalles: rawDetalles.includes('DE MANTENIMIENTO A MANTENIMIENTO')
              ? `Asignación de folio físico emitido en mtto: ${folVal}`
              : (rawDetalles || `Asignación de folio: ${folVal}`),
            tipoPillNuevo: 'folio'
          };
        }

        if (d.falla_reportada || d.diagnostico) {
          return {
            modificacion: 'Actualización en Mtto',
            badgeStyle: { backgroundColor: '#fdf2f4', color: '#691B31', border: '1px solid #fecdd3' },
            valorAnterior: 'Revisión',
            valorNuevo: d.falla_reportada || d.diagnostico,
            detalles: `Falla o diagnóstico actualizado en mtto: ${d.falla_reportada || d.diagnostico}`,
            tipoPillNuevo: 'permanece'
          };
        }

        return {
          modificacion: 'Actualización en Mtto',
          badgeStyle: { backgroundColor: '#fdf2f4', color: '#691B31', border: '1px solid #fecdd3' },
          valorAnterior: 'MANTENIMIENTO',
          valorNuevo: 'ACTUALIZADO',
          detalles: rawDetalles.includes('DE MANTENIMIENTO A MANTENIMIENTO')
            ? 'Actualización de datos y confirmación de estatus en mtto'
            : (rawDetalles || 'Actualización de datos en mtto'),
          tipoPillNuevo: 'permanece'
        };
      }
      return {
        modificacion: 'Reconfirmación de Estatus',
        badgeStyle: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
        valorAnterior: ant,
        valorNuevo: 'RECONFIRMADO',
        detalles: rawDetalles || `Reconfirmación de estatus ${ant}`,
        tipoPillNuevo: 'reconfirmado'
      };
    }

    if (nue === 'MANTENIMIENTO') {
      let det = 'Ingreso de la unidad a mtto';
      if (rawDetalles.includes('POR MOTIVO:')) {
        const parts = rawDetalles.split(/POR MOTIVO:/i);
        const mot = parts[1] ? parts[1].trim() : '';
        if (mot && mot.toUpperCase() !== 'MANTENIMIENTO') {
          det = `Envío a mtto por: ${mot}`;
        }
      }
      return {
        modificacion: 'Ingreso a Mtto',
        badgeStyle: { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' },
        valorAnterior: ant || 'OPERACION',
        valorNuevo: 'MANTENIMIENTO',
        detalles: det,
        tipoPillNuevo: 'mantenimiento'
      };
    }

    if (ant === 'MANTENIMIENTO') {
      return {
        modificacion: 'Salida de Mtto',
        badgeStyle: { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' },
        valorAnterior: 'MANTENIMIENTO',
        valorNuevo: nue || 'OPERACION',
        detalles: `Salida de mtto e incorporación a ${nue || 'OPERACIÓN'}`,
        tipoPillNuevo: 'operacion'
      };
    }

    return {
      modificacion: 'Cambio de Estatus',
      badgeStyle: { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' },
      valorAnterior: ant || '-',
      valorNuevo: nue || '-',
      detalles: rawDetalles || `Cambio de estatus de ${ant} a ${nue}`,
      tipoPillNuevo: 'estatus'
    };
  }

  if (accion.includes('MANTENIMIENTO') || accion.includes('DIAGNOSTICO') || accion.includes('FALLA')) {
    return {
      modificacion: 'Actualización en Mtto',
      badgeStyle: { backgroundColor: '#fdf2f4', color: '#691B31', border: '1px solid #DDC9A3' },
      valorAnterior: ant || 'REVISIÓN',
      valorNuevo: nue || 'ACTUALIZADO',
      detalles: rawDetalles || 'Actualización de diagnóstico técnico o falla reportada en mtto',
      tipoPillNuevo: 'permanece'
    };
  }

  if (accion.includes('REEMPLAZO')) {
    return {
      modificacion: 'Reemplazo de Unidad',
      badgeStyle: { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
      valorAnterior: ant || '-',
      valorNuevo: nue || '-',
      detalles: rawDetalles || 'Sustitución de unidad en operación',
      tipoPillNuevo: 'estatus'
    };
  }

  return {
    modificacion: formatAccion(accion),
    badgeStyle: getAccionBadgeStyle(accion),
    valorAnterior: ant || '-',
    valorNuevo: nue || '-',
    detalles: rawDetalles || 'Sin detalles adicionales',
    tipoPillNuevo: 'default'
  };
};

export const parseDetallesModificacion = (rawDetalles) => {
  if (!rawDetalles || typeof rawDetalles !== 'string') {
    return { tipo: 'simple', texto: rawDetalles || '' };
  }

  const text = rawDetalles.trim();
  const motivoMatch = text.match(/(?:^|\|\s*)MOTIVO\s+AUDITOR[IÍ]A:\s*(.+)$/i);
  let motivo = null;
  let workText = text;

  if (motivoMatch) {
    motivo = motivoMatch[1].trim();
    workText = text.substring(0, motivoMatch.index).trim();
  }

  const prefixMatch = workText.match(/^(?:ACTUALIZACI[OÓ]N\s+(?:DE\s+)?(?:FOLIO\/FECHA|FOLIO|INCIDENCIA)(?:\s+EN\s+ECO\s+\w+)?\s*:\s*)/i);
  let contextTitle = null;
  if (prefixMatch) {
    contextTitle = prefixMatch[0].replace(/:\s*$/, '').trim();
    workText = workText.substring(prefixMatch[0].length).trim();
  }

  const diffRegex = /([A-Za-z0-9_ÁÉÍÓÚáéíóú\s/]+):\s*'([^']*)'\s*->\s*'([^']*)'/g;
  const diffs = [];
  let match;

  while ((match = diffRegex.exec(workText)) !== null) {
    diffs.push({
      campo: match[1].trim(),
      anterior: match[2].trim(),
      nuevo: match[3].trim()
    });
  }

  if (diffs.length > 0 || motivo) {
    let leftover = workText;
    diffs.forEach(d => {
      const pattern = new RegExp(`${d.campo}:\\s*'${d.anterior.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*->\\s*'${d.nuevo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'i');
      leftover = leftover.replace(pattern, '');
    });
    leftover = leftover.replace(/^[|\s]+|[|\s]+$/g, '').trim();

    return {
      tipo: 'estructurado',
      contextTitle,
      diffs,
      motivo,
      extra: leftover || null
    };
  }

  const asignacionIncMatch = text.match(/^ASIGNACI[OÓ]N DE INCIDENCIA:\s*([^-]+)(?:\s*-\s*FALLA:\s*(.+))?$/i);
  if (asignacionIncMatch) {
    return {
      tipo: 'asignacion_incidencia',
      incidencia: asignacionIncMatch[1].trim(),
      falla: asignacionIncMatch[2]?.trim() || null
    };
  }

  const asignacionFolioMatch = text.match(/^ASIGNACI[OÓ]N DE FOLIO:\s*(.+)$/i);
  if (asignacionFolioMatch) {
    return {
      tipo: 'asignacion_folio',
      folio: asignacionFolioMatch[1].trim()
    };
  }

  return {
    tipo: 'simple',
    texto: text
  };
};

export const formatearFechaDiaMesAnio = (fechaStr) => {
  if (!fechaStr) return '';
  const clean = String(fechaStr).trim().split(/[ T]/)[0];
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const [anio, mes, dia] = parts;
      return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
    }
    if (parts[2].length === 4) {
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
  }
  return fechaStr;
};

export const getValoresTransicion = (item) => {
  if (!item) return { anterior: '—', nuevo: '—' };

  const act = String(item.tipo_accion || '').toUpperCase();
  const t = String(item.detalles || '').trim();
  let ant = item.estatus_anterior ? String(item.estatus_anterior).toUpperCase() : null;
  let nvo = item.estatus_nuevo ? String(item.estatus_nuevo).toUpperCase() : null;

  const esDespacho = act.includes('DESPACHO') || t.includes('DESPACHO VALIDADO') || t.includes('SALIDA VALIDADA');
  if (esDespacho) {
    const mDesp = t.match(/(?:HORA(?:\s+REAL)?(?:\s+DE)?\s+SALIDA:\s*|A LAS\s+)([0-9]{1,2}:[0-9]{2})/i);
    const hora = mDesp ? mDesp[1] : null;
    return {
      anterior: (ant && ant !== 'OPERACION') ? ant : 'EN PATIO',
      nuevo: hora ? `SALIDA ${hora}` : (nvo || 'OPERACION'),
      esEstatus: false
    };
  }

  if (ant && nvo && ant === nvo) {
    const mDash = t.match(/ANTERIOR:\s*(.*?),\s*NUEV[AO]:\s*([^)|]+)/i);
    if (mDash) {
      return { anterior: mDash[1].trim(), nuevo: mDash[2].trim(), esEstatus: false };
    }
    const mArrow = t.match(/:\s*(.+?)\s*->\s*([^|]+)/);
    if (mArrow) {
      return { anterior: mArrow[1].trim(), nuevo: mArrow[2].trim(), esEstatus: false };
    }
  }

  if (ant || nvo) {
    return {
      anterior: ant || '—',
      nuevo: nvo || '—',
      esEstatus: true
    };
  }

  const mDash = t.match(/ANTERIOR:\s*(.*?),\s*NUEV[AO]:\s*([^)|]+)/i);
  if (mDash) {
    return { anterior: mDash[1].trim(), nuevo: mDash[2].trim(), esEstatus: false };
  }

  const mArrow = t.match(/:\s*(.+?)\s*->\s*([^|]+)/);
  if (mArrow) {
    return { anterior: mArrow[1].trim(), nuevo: mArrow[2].trim(), esEstatus: false };
  }

  const mEnc = t.match(/A LAS\s*([0-9]{1,2}:[0-9]{2})/i);
  if (act.includes('ENCIERRO') && mEnc) {
    return { anterior: ant || 'OPERACION', nuevo: `ENCIERRO ${mEnc[1]}`, esEstatus: false };
  }

  return { anterior: '—', nuevo: '—', esEstatus: false };
};

export default DetalleOperacion;
