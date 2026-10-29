/**
 * Helper utilities for rendering action names and badges in historical views.
 */

export const formatAccion = (accion) => {
  if (!accion) return 'Acción General';
  switch (accion.toUpperCase()) {
    case 'CAMBIO_ESTATUS': return 'Cambio de Estatus';
    case 'CAMBIO_HORA':
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
    case 'ASIGNACION_FOLIO': return 'Asignación de Folio';
    case 'ACTUALIZACION_FOLIO': return 'Actualización de Folio';
    case 'ASIGNACION_INCIDENCIA': return 'Asignación de Incidencia';
    case 'ACTUALIZACION_MANTENIMIENTO': return 'Actualización en Mtto';
    case 'REGISTRO_INFRACCION': return 'Registro Infracción';
    case 'RELEVO_TARJETON': return 'Relevo de Conductor';
    case 'ACTUALIZACION_DATOS': return 'Actualización de Datos';
    default:
      return accion.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
};

export const getAccionBadgeStyle = (accion) => {
  const fallback = { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  if (!accion) return fallback;
  const act = String(accion).toUpperCase();
  if (act.includes('VALIDAR') || act.includes('INCORPORACION')) {
    return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
  }
  if (act.includes('INCIDENCIA')) {
    return { backgroundColor: '#fdf2f4', color: '#A02142', border: '1px solid #fecdd3' };
  }
  if (act.includes('FOLIO')) {
    return { backgroundColor: '#fdfbf7', color: '#BC955B', border: '1.5px solid #DDC9A3' };
  }
  if (act.includes('DESINCORPORACION') || act.includes('ESTATUS')) {
    return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
  }
  if (act.includes('HORA') || act.includes('RUTA') || act.includes('CONDUCTOR') || act.includes('ASIGNAR') || act.includes('DATOS')) {
    return { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
  }
  if (act.includes('MANTENIMIENTO')) {
    return { backgroundColor: '#fdf2f4', color: '#691B31', border: '1px solid #DDC9A3' };
  }
  if (act.includes('INFRACCION') || act.includes('REEMPLAZO') || act.includes('RETIRO')) {
    return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
  }
  return fallback;
};

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

  // Extraer número de incidencia si existe en el objeto o en el texto
  let incVal = d.numero_incidencia || d.incidencia || null;
  if (!incVal && rawDetalles.includes(':')) {
    const matchInc = rawDetalles.match(/INCIDENCIA:\s*([A-Z0-9-]+)/i);
    if (matchInc) incVal = matchInc[1].trim();
  }
  if (!incVal && (accion.includes('INCIDENCIA') || nue.startsWith('OCT-') || nue.startsWith('INC-'))) {
    incVal = (nue && nue !== 'INCIDENCIA ASIGNADA' && nue !== 'MANTENIMIENTO') ? nue : null;
  }

  // Extraer número de folio si existe en el objeto o en el texto
  let folVal = d.folio_mantenimiento || d.folio || null;
  if (!folVal && rawDetalles.includes(':')) {
    const matchFol = rawDetalles.match(/FOLIO:\s*([A-Z0-9-]+)/i);
    if (matchFol) folVal = matchFol[1].trim();
  }
  if (!folVal && accion.includes('FOLIO')) {
    folVal = (nue && nue !== 'FOLIO ASIGNADO' && nue !== 'MANTENIMIENTO') ? nue : null;
  }

  // 1. INCIDENCIA (Agregar o actualizar número de incidencia)
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

  // 2. FOLIO (Asignar o actualizar folio físico de taller)
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

  // 3. CAMBIO DE ESTATUS
  if (accion === 'CAMBIO_ESTATUS' || accion.includes('ESTATUS')) {
    // Si anterior y nuevo son iguales (ej. MANTENIMIENTO a MANTENIMIENTO)
    if (ant && nue && ant === nue) {
      if (ant === 'MANTENIMIENTO') {
        // Si la unidad cuenta con incidencia registrada, reflejarla en lugar de "PERMANECE EN TALLER"
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

        // Si la unidad cuenta con folio asignado
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

        // Si hay falla reportada o diagnóstico
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

    // Ingreso a Mantenimiento (ej. OPERACION -> MANTENIMIENTO)
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

    // Salida de Mantenimiento a Operación
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

  // 4. ACTUALIZACIÓN EN MTTO / DIAGNÓSTICO TÉCNICO
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

  // 5. REEMPLAZO DE UNIDAD
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

/**
 * Parsea los textos de auditoría de bitácora para presentarlos con un diseño entendible y visual.
 * Convierte volcados de texto plano tipo:
 * "ACTUALIZACIÓN DE FOLIO/FECHA EN ECO 203: Folio: 'OCT-4545-REV' -> 'OCT-4545' | MOTIVO AUDITORÍA: RESTAURACIÓN TRAS PRUEBA DE AUDITORÍA"
 * en un objeto estructurado para componentes visuales.
 */
export const parseDetallesModificacion = (rawDetalles) => {
  if (!rawDetalles || typeof rawDetalles !== 'string') {
    return { tipo: 'simple', texto: rawDetalles || '' };
  }

  const text = rawDetalles.trim();

  // 1. Extraer Motivo de Auditoría si existe
  const motivoMatch = text.match(/(?:^|\|\s*)MOTIVO\s+AUDITOR[IÍ]A:\s*(.+)$/i);
  let motivo = null;
  let workText = text;

  if (motivoMatch) {
    motivo = motivoMatch[1].trim();
    workText = text.substring(0, motivoMatch.index).trim();
  }

  // 2. Extraer prefijo de contexto (ej. "ACTUALIZACIÓN DE FOLIO/FECHA EN ECO 203:")
  const prefixMatch = workText.match(/^(?:ACTUALIZACI[OÓ]N\s+(?:DE\s+)?(?:FOLIO\/FECHA|FOLIO|INCIDENCIA)(?:\s+EN\s+ECO\s+\w+)?\s*:\s*)/i);
  let contextTitle = null;
  if (prefixMatch) {
    contextTitle = prefixMatch[0].replace(/:\s*$/, '').trim();
    workText = workText.substring(prefixMatch[0].length).trim();
  }

  // 3. Buscar diferencias de campos: "Campo: 'valAnterior' -> 'valNuevo'"
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
    // Si quedaron notas o textos secundarios que no fueron diffs
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

  // 4. Asignación de incidencia
  const asignacionIncMatch = text.match(/^ASIGNACI[OÓ]N DE INCIDENCIA:\s*([^-]+)(?:\s*-\s*FALLA:\s*(.+))?$/i);
  if (asignacionIncMatch) {
    return {
      tipo: 'asignacion_incidencia',
      incidencia: asignacionIncMatch[1].trim(),
      falla: asignacionIncMatch[2]?.trim() || null
    };
  }

  // 5. Asignación de folio
  const asignacionFolioMatch = text.match(/^ASIGNACI[OÓ]N DE FOLIO:\s*(.+)$/i);
  if (asignacionFolioMatch) {
    return {
      tipo: 'asignacion_folio',
      folio: asignacionFolioMatch[1].trim()
    };
  }

  // 6. Texto simple o mensaje estándar
  return {
    tipo: 'simple',
    texto: text
  };
};

/**
 * Formatea una fecha ISO o string (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss) al formato estándar:
 * Día / Mes / Año (DD/MM/YYYY), ej. "16/10/2026".
 */
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

/**
 * Obtiene los valores de transición (Anterior y Nuevo) para las columnas de las tablas de bitácora.
 * Si estatus_anterior/nuevo no están definidos (ej. cambio de ruta o horario), los extrae de los detalles.
 */
export const getValoresTransicion = (item) => {
  if (!item) return { anterior: '—', nuevo: '—' };

  const act = String(item.tipo_accion || '').toUpperCase();
  const t = String(item.detalles || '').trim();
  let ant = item.estatus_anterior ? String(item.estatus_anterior).toUpperCase() : null;
  let nvo = item.estatus_nuevo ? String(item.estatus_nuevo).toUpperCase() : null;

  // 1. Despacho validado: siempre mostrar transición uniforme EN PATIO -> SALIDA HH:MM
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

  // 2. Si estatus anterior y nuevo son iguales (ej. ambos 'OPERACION'), buscar si en detalles hay cambio de ruta, conductor, etc.
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

  // 3. Si hay estatus diferentes entre anterior y nuevo
  if (ant || nvo) {
    return {
      anterior: ant || '—',
      nuevo: nvo || '—',
      esEstatus: true
    };
  }

  // 4. Dash diff: "CAMBIO DE RUTA - ANTERIOR: T01, NUEVA: T01"
  const mDash = t.match(/ANTERIOR:\s*(.*?),\s*NUEV[AO]:\s*([^)|]+)/i);
  if (mDash) {
    return { anterior: mDash[1].trim(), nuevo: mDash[2].trim(), esEstatus: false };
  }

  // 5. Arrow diff: "CAMPO: X -> Y"
  const mArrow = t.match(/:\s*(.+?)\s*->\s*([^|]+)/);
  if (mArrow) {
    return { anterior: mArrow[1].trim(), nuevo: mArrow[2].trim(), esEstatus: false };
  }

  // 6. Encierro
  const mEnc = t.match(/A LAS\s*([0-9]{1,2}:[0-9]{2})/i);
  if (act.includes('ENCIERRO') && mEnc) {
    return { anterior: ant || 'OPERACION', nuevo: `ENCIERRO ${mEnc[1]}`, esEstatus: false };
  }

  return { anterior: '—', nuevo: '—', esEstatus: false };
};



