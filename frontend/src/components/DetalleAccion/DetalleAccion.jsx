import React from 'react';
import { parseDetallesModificacion } from '../../utils/historialHelper';
import './DetalleAccion.css';

const CHIP_SPLIT = /((?:OCT|INC)-[A-Za-z0-9-]+|ECO\s?\d+)/g;
const CHIP_TEST = /^((?:OCT|INC)-[A-Za-z0-9-]+|ECO\s?\d+)$/;

/** Resalta códigos (OCT-123, INC-…, ECO 203) dentro de un texto. */
const conChips = (texto) =>
  String(texto || '')
    .split(CHIP_SPLIT)
    .map((part, idx) =>
      CHIP_TEST.test(part)
        ? <span key={idx} className="da-chip">{part}</span>
        : <React.Fragment key={idx}>{part}</React.Fragment>
    );

/**
 * Obtiene icono temático, etiqueta y estilo según el tipo de campo u operación
 */
export const getFieldInfo = (campo) => {
  const c = String(campo || '').toLowerCase().trim();

  // Ruta / Corrida
  if (c.includes('ruta') || c.includes('corrida')) {
    return {
      label: c.includes('corrida') ? 'Corrida' : 'Ruta',
      colorClass: 'da-icon--ruta',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      )
    };
  }

  // Horarios / Salida / Encierro
  if (c.includes('hora') || c.includes('salida') || c.includes('encierro') || c.includes('horario') || c.includes('tiempo')) {
    let lbl = 'Horario';
    if (c.includes('encierro')) lbl = 'Encierro';
    else if (c.includes('salida')) lbl = 'Hora Salida';
    else if (c.includes('programada') || c.includes('prog')) lbl = 'Hora Prog.';

    return {
      label: lbl,
      colorClass: c.includes('encierro') ? 'da-icon--encierro' : 'da-icon--hora',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    };
  }

  // Acople
  if (c.includes('acople')) {
    return {
      label: 'Acople',
      colorClass: 'da-icon--acople',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    };
  }

  // Relevo
  if (c.includes('relevo')) {
    return {
      label: 'Relevo',
      colorClass: 'da-icon--relevo',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      )
    };
  }

  // Conductor / Operador / Tarjetón
  if (c.includes('conductor') || c.includes('operador') || c.includes('tarjeton')) {
    return {
      label: c.includes('tarjeton') ? 'Tarjetón' : 'Conductor',
      colorClass: 'da-icon--conductor',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    };
  }

  // Estatus / Estado
  if (c.includes('estatus') || c.includes('estado')) {
    return {
      label: 'Estatus',
      colorClass: 'da-icon--estatus',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )
    };
  }

  // Incidencia / Falla / Percance
  if (c.includes('incidencia') || c.includes('falla') || c.includes('percance')) {
    return {
      label: c.includes('falla') ? 'Falla' : 'Incidencia',
      colorClass: 'da-icon--falla',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      )
    };
  }

  // Folio / Taller / Mantenimiento
  if (c.includes('folio') || c.includes('taller') || c.includes('mantenimiento')) {
    return {
      label: c.includes('folio') ? 'Folio' : 'Mantenimiento',
      colorClass: 'da-icon--folio',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    };
  }

  // Combustible / Odómetro
  if (c.includes('combustible') || c.includes('litro') || c.includes('adblue') || c.includes('odometro')) {
    return {
      label: 'Combustible',
      colorClass: 'da-icon--combustible',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="22" x2="15" y2="22" />
          <line x1="4" y1="9" x2="14" y2="9" />
          <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L19 6" />
        </svg>
      )
    };
  }

  // Despacho / Salida directa
  if (c.includes('despacho') || c.includes('salida')) {
    return {
      label: 'Salida',
      colorClass: 'da-icon--salida',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    };
  }

  // Default: Modificación / Edición
  return {
    label: campo,
    colorClass: 'da-icon--default',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    )
  };
};

/**
 * Resuelve el icono temático para cadenas simples en función de sus palabras clave
 */
const getSimpleTextInfo = (text) => {
  const t = String(text || '').toLowerCase();
  if (t.includes('despacho') || t.includes('salida')) return getFieldInfo('salida');
  if (t.includes('ruta') || t.includes('corrida')) return getFieldInfo('ruta');
  if (t.includes('hora') || t.includes('horario') || t.includes('tiempo')) return getFieldInfo('hora');
  if (t.includes('acople')) return getFieldInfo('acople');
  if (t.includes('relevo')) return getFieldInfo('relevo');
  if (t.includes('conductor') || t.includes('operador') || t.includes('tarjeton')) return getFieldInfo('conductor');
  if (t.includes('estatus') || t.includes('estado')) return getFieldInfo('estatus');
  if (t.includes('incidencia') || t.includes('falla') || t.includes('percance')) return getFieldInfo('falla');
  if (t.includes('folio') || t.includes('mantenimiento') || t.includes('taller')) return getFieldInfo('folio');
  if (t.includes('combustible') || t.includes('litro')) return getFieldInfo('combustible');
  if (t.includes('encierro')) return getFieldInfo('encierro');
  return getFieldInfo('modificacion');
};

/**
 * Parser inteligente de patrones en la bitácora
 */
const parseDetalleDinamico = (texto) => {
  if (!texto) return null;
  const t = String(texto).trim();

  // 1. Despacho validado: "DESPACHO VALIDADO - HORA SALIDA: 21:55" o "SALIDA VALIDADA DE PATIO A LAS 21:55"
  const mDespacho = t.match(/^(DESPACHO VALIDADO|VALIDACI[ÓO]N DE DESPACHO|UNIDAD VALIDADA Y DESPACHADA|SALIDA VALIDADA.*?)(?:\s*-\s*|\s+A LAS\s+)?(?:HORA(?:\s+REAL)?(?:\s+DE)?\s+SALIDA:\s*)?([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)?(?:\s*-\s*OBS:\s*(.*))?$/i);
  if (mDespacho && (mDespacho[2] || mDespacho[1].toUpperCase().includes('DESPACHADA') || mDespacho[1].toUpperCase().includes('VALIDAD'))) {
    return {
      tipo: 'despacho',
      titulo: 'DESPACHO VALIDADO',
      hora: mDespacho[2] || null,
      obs: mDespacho[3] || null
    };
  }

  // 2. Paréntesis diffs: "ACTUALIZÓ HORA PROGRAMADA (ANTERIOR: 04:46, NUEVA: 04:46) Y ACOPLE (ANTERIOR: SIN ASIGNAR, NUEVA: SIN ASIGNAR)"
  const regexParen = /([A-ZÁÉÍÓÚÑa-záéíóúñ ]+?)\s*\(\s*ANTERIOR:\s*(.*?),\s*NUEV[AO]:\s*(.*?)\s*\)/gi;
  const parenMatches = [...t.matchAll(regexParen)];
  if (parenMatches.length > 0) {
    const diffs = parenMatches.map(m => {
      let campo = m[1].trim()
        .replace(/^(ACTUALIZ[ÓO]|CAMBI[ÓO]|MODIFIC[ÓO]|REGISTR[ÓO]|Y|E|Y\/O|\s|-)+/i, '')
        .trim();
      return {
        campo: campo || 'VALOR',
        anterior: m[2].trim(),
        nuevo: m[3].trim()
      };
    });
    return {
      tipo: 'diffs',
      contexto: 'MODIFICACIÓN DE HORARIO / ASIGNACIÓN',
      diffs
    };
  }

  // 3. Guión con anterior y nueva: "CAMBIO DE RUTA - ANTERIOR: T01, NUEVA: T01"
  const mDash = t.match(/^(.*?)\s*-\s*ANTERIOR:\s*(.*?),\s*NUEV[AO]:\s*(.*?)$/i);
  if (mDash) {
    const ctx = mDash[1].trim();
    let campo = 'VALOR';
    const cu = ctx.toUpperCase();
    if (cu.includes('RUTA')) campo = 'RUTA';
    else if (cu.includes('CONDUCTOR') || cu.includes('OPERADOR')) campo = 'CONDUCTOR';
    else if (cu.includes('HORA') || cu.includes('HORARIO')) campo = 'HORARIO';
    else if (cu.includes('ACOPLE')) campo = 'ACOPLE';
    else if (cu.includes('ESTATUS')) campo = 'ESTATUS';
    return {
      tipo: 'diffs',
      contexto: ctx,
      diffs: [{ campo, anterior: mDash[2].trim(), nuevo: mDash[3].trim() }]
    };
  }

  // 4. Incorporación a servicio: "INCORPORACIÓN - CONDUCTOR: 0397, RUTA: T01"
  const mIncorp = t.match(/^INCORPORACI[ÓO]N(?:\s*A\s+SERVICIO)?\s*-\s*CONDUCTOR:\s*(.*?),\s*RUTA:\s*(.*?)$/i);
  if (mIncorp) {
    return {
      tipo: 'incorporacion',
      contexto: 'INCORPORACIÓN A SERVICIO',
      conductor: mIncorp[1].trim(),
      ruta: mIncorp[2].trim()
    };
  }

  // 5. Desincorporación: "DESINCORPORACIÓN A MANTENIMIENTO - MOTIVO: T4"
  const mDesinc = t.match(/^DESINCORPORACI[ÓO]N(?:\s+A\s+([A-ZÁÉÍÓÚÑa-z]+))?(?:\s*-\s*MOTIVO:\s*(.*))?$/i);
  if (mDesinc) {
    return {
      tipo: 'desincorporacion',
      contexto: 'DESINCORPORACIÓN' + (mDesinc[1] ? ` A ${mDesinc[1].toUpperCase()}` : ''),
      destino: mDesinc[1] ? mDesinc[1].trim().toUpperCase() : 'MANTENIMIENTO',
      motivo: mDesinc[2] ? mDesinc[2].trim() : null
    };
  }

  // 6. Cambio de Estatus de X a Y: "CAMBIO DE ESTATUS DE MANTENIMIENTO A RESERVA"
  const mCambioEst = t.match(/^CAMBIO DE ESTATUS(?:\s+DE\s+([A-ZÁÉÍÓÚÑa-z]+))?\s+A\s+([A-ZÁÉÍÓÚÑa-z]+)(?:\s+POR MOTIVO:\s*(.*))?$/i);
  if (mCambioEst) {
    return {
      tipo: 'diffs',
      contexto: 'CAMBIO DE ESTATUS',
      diffs: [{
        campo: 'ESTATUS',
        anterior: mCambioEst[1] ? mCambioEst[1].trim() : 'MANTENIMIENTO',
        nuevo: mCambioEst[2].trim()
      }],
      motivo: mCambioEst[3] ? mCambioEst[3].trim() : null
    };
  }

  // 7. Asignación / Generación de Folio o Incidencia
  const mIncFolio = t.match(/^(?:SE\s+GENER[ÓO]\s+(?:EL\s+)?FOLIO(?: DE MANTENIMIENTO)?|ASIGNACI[ÓO]N DE (?:INCIDENCIA|FOLIO)|GENERACI[ÓO]N DE FOLIO.*?):\s*([A-Za-z0-9-]+)(?:\s*-\s*(.*))?$/i);
  if (mIncFolio) {
    const isInc = t.toUpperCase().includes('INCIDENCIA');
    return {
      tipo: 'folio_incidencia',
      contexto: isInc ? 'INCIDENCIA ASIGNADA' : 'FOLIO DE MANTENIMIENTO',
      codigo: mIncFolio[1].trim(),
      extra: mIncFolio[2] ? mIncFolio[2].trim() : null
    };
  }

  // 8. Cambio de Conductor
  const mCond = t.match(/^CAMBIO DE CONDUCTOR A:\s*([0-9]+)\s*-\s*(.*?)(?:\s*-\s*MOTIVO RETIRO ANTERIOR:\s*(.*))?$/i);
  if (mCond) {
    return {
      tipo: 'conductor',
      contexto: 'CAMBIO DE CONDUCTOR',
      tarjeton: mCond[1].trim(),
      conductor: mCond[2].trim(),
      motivo: mCond[3] ? mCond[3].trim() : null
    };
  }

  // 9. Encierro Automático
  const mEncierro = t.match(/^UNIDAD ENCERRADA AUTOM[ÁA]TICAMENTE A LAS\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)(?:\s*POR\s*(.*))?$/i);
  if (mEncierro) {
    return {
      tipo: 'encierro_auto',
      contexto: 'ENCIERRO AUTOMÁTICO',
      hora: mEncierro[1].trim(),
      motivo: mEncierro[2] ? mEncierro[2].trim() : 'Hora programada de encierro'
    };
  }

  return null;
};

/**
 * Detecta cambios del tipo: "CAMPO: Sin ruta -> T01 | CAMPO2: A -> B"
 */
const parseDiffsSinComillas = (texto) => {
  if (!texto || !texto.includes('->')) return null;

  let contexto = null;
  let cuerpo = texto.trim();

  const ctx = cuerpo.match(/^(.+?)\s+-\s+([A-ZÁÉÍÓÚÑa-záéíóúñ ]+:\s*.+->.+)$/);
  if (ctx) {
    contexto = ctx[1].trim();
    cuerpo = ctx[2].trim();
  }

  const diffs = [];
  const extras = [];
  cuerpo.split(/\s*\|\s*/).forEach((seg) => {
    const m = seg.match(/^([^:>]{2,40}):\s*(.+?)\s*->\s*(.+)$/);
    if (m) diffs.push({ campo: m[1].trim(), anterior: m[2].trim(), nuevo: m[3].trim() });
    else if (seg.trim()) extras.push(seg.trim());
  });

  if (!diffs.length) return null;
  return { contexto, diffs, extra: extras.join(' | ') || null };
};

/**
 * Representa el flujo de cambio: [Anterior] ➔ [Nuevo] o [✓ Confirmado] si son idénticos
 */
const Flujo = ({ anterior, nuevo }) => {
  const antStr = String(anterior || '').trim();
  const nvoStr = String(nuevo || '').trim();
  const esVacioAnt = antStr.toUpperCase().startsWith('SIN ') || antStr === '-' || antStr === '—' || !antStr;
  const esVacioNvo = nvoStr.toUpperCase().startsWith('SIN ') || nvoStr === '-' || nvoStr === '—' || !nvoStr;
  const esIgual = antStr.toUpperCase() === nvoStr.toUpperCase();

  // Si anterior y nuevo son iguales (ej. T01 -> T01 o 04:46 -> 04:46), mostrar estado confirmado
  if (esIgual && !esVacioNvo) {
    return (
      <div className="da-flow">
        <span className="da-tag da-tag-same" title="Valor asignado y confirmado">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <strong className="da-tag-val">{nvoStr}</strong>
          <span className="da-tag-sub">Confirmado</span>
        </span>
      </div>
    );
  }

  return (
    <div className="da-flow">
      <span className={`da-tag da-tag-old ${esVacioAnt ? 'is-empty' : ''}`} title="Valor anterior">
        {antStr || '—'}
      </span>
      <span className="da-arrow" title="Transición a nuevo valor">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
      <span className={`da-tag da-tag-new ${esVacioNvo ? 'is-empty' : ''}`} title="Nuevo valor">
        {nvoStr || '—'}
      </span>
    </div>
  );
};

/**
 * Renderiza la lista de diferencias de campo con alineación consistente
 */
const Diffs = ({ diffs }) => (
  <div className="da-diffs">
    {diffs.map((diff, idx) => {
      const info = getFieldInfo(diff.campo);
      return (
        <div key={idx} className="da-row">
          <div className="da-field-badge">
            <span className={`da-field-icon-box ${info.colorClass}`}>
              {info.icon}
            </span>
            <span className="da-field-name">{info.label}:</span>
          </div>
          <Flujo anterior={diff.anterior} nuevo={diff.nuevo} />
        </div>
      );
    })}
  </div>
);

/**
 * Presentación visual, estructurada y limpia de "Detalles de la acción/operación".
 */
export default function DetalleAccion({ texto, accent = '#691B31', vacio = 'Sin observaciones' }) {
  const raw = String(texto || '').trim();
  const style = { '--da-accent': accent };

  if (!raw) {
    return <span className="da-vacio">{vacio}</span>;
  }

  // 1. Probar parser de cambios con comillas estructuradas
  const parsed = parseDetallesModificacion(raw);
  if (parsed.tipo === 'estructurado') {
    return (
      <div className="da-card" style={style}>
        {parsed.contextTitle && (
          <div className="da-context">
            <span className="da-context-dot" />
            {parsed.contextTitle}
          </div>
        )}
        {parsed.diffs?.length > 0 && <Diffs diffs={parsed.diffs} />}
        {parsed.motivo && (
          <div className="da-motivo">
            <div className="da-motivo-title">Motivo / Justificación:</div>
            <p className="da-motivo-text">"{parsed.motivo}"</p>
          </div>
        )}
        {parsed.extra && <div className="da-extra">{conChips(parsed.extra)}</div>}
      </div>
    );
  }

  // 2. Probar parser inteligente dinámico
  const dinamico = parseDetalleDinamico(raw);
  if (dinamico) {
    // Despacho validado: Formato uniforme y consistente
    if (dinamico.tipo === 'despacho') {
      return (
        <div className="da-card da-card--despacho" style={style}>
          <div className="da-despacho-row">
            <span className="da-badge-validado">
              <span className="da-check-circle">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              DESPACHO VALIDADO
            </span>
            {dinamico.hora && (
              <span className="da-time-chip" title="Hora efectiva de salida de patio">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="da-time-chip-lbl">SALIDA:</span>
                <strong>{dinamico.hora}</strong>
              </span>
            )}
          </div>
          {dinamico.obs && (
            <div className="da-motivo">
              <div className="da-motivo-title">Observación:</div>
              <p className="da-motivo-text">"{dinamico.obs}"</p>
            </div>
          )}
        </div>
      );
    }

    // Incorporación a servicio
    if (dinamico.tipo === 'incorporacion') {
      return (
        <div className="da-card" style={style}>
          <div className="da-context">
            <span className="da-context-dot" />
            {dinamico.contexto}
          </div>
          <div className="da-row">
            <div className="da-field-badge">
              <span className="da-field-icon-box da-icon--conductor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="da-field-name">Conductor:</span>
              <span className="da-tag da-tag-new">{dinamico.conductor}</span>
            </div>
            <div className="da-field-badge">
              <span className="da-field-icon-box da-icon--ruta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="19" r="3" />
                  <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                  <circle cx="18" cy="5" r="3" />
                </svg>
              </span>
              <span className="da-field-name">Ruta:</span>
              <span className="da-tag da-tag-new">{dinamico.ruta}</span>
            </div>
          </div>
        </div>
      );
    }

    // Desincorporación
    if (dinamico.tipo === 'desincorporacion') {
      return (
        <div className="da-card" style={style}>
          <div className="da-context da-context--falla">
            <span className="da-context-dot" />
            {dinamico.contexto}
          </div>
          <div className="da-row">
            <div className="da-field-badge">
              <span className="da-field-icon-box da-icon--estatus">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </span>
              <span className="da-field-name">Estatus:</span>
            </div>
            <Flujo anterior="OPERACION" nuevo={dinamico.destino} />
          </div>
          {dinamico.motivo && (
            <div className="da-motivo">
              <div className="da-motivo-title">Motivo:</div>
              <p className="da-motivo-text">"{dinamico.motivo}"</p>
            </div>
          )}
        </div>
      );
    }

    // Encierro Automático
    if (dinamico.tipo === 'encierro_auto') {
      return (
        <div className="da-card da-card--encierro" style={style}>
          <div className="da-despacho-row">
            <span className="da-badge-encierro">
              <span className="da-field-icon-box da-icon--encierro">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              {dinamico.contexto}
            </span>
            <span className="da-time-chip" title="Hora de encierro">
              <span className="da-time-chip-lbl">HORA:</span>
              <strong>{dinamico.hora}</strong>
            </span>
          </div>
          {dinamico.motivo && <div className="da-extra">{dinamico.motivo}</div>}
        </div>
      );
    }

    // Diffs directos
    if (dinamico.tipo === 'diffs') {
      return (
        <div className="da-card" style={style}>
          {dinamico.contexto && (
            <div className="da-context">
              <span className="da-context-dot" />
              {dinamico.contexto}
            </div>
          )}
          <Diffs diffs={dinamico.diffs} />
          {dinamico.motivo && (
            <div className="da-motivo">
              <div className="da-motivo-title">Motivo:</div>
              <p className="da-motivo-text">"{dinamico.motivo}"</p>
            </div>
          )}
        </div>
      );
    }

    // Folio / Incidencia
    if (dinamico.tipo === 'folio_incidencia') {
      const isInc = dinamico.contexto.toUpperCase().includes('INCIDENCIA');
      return (
        <div className="da-card" style={style}>
          <div className="da-header-row">
            <span className={`da-context ${isInc ? 'da-context--falla' : 'da-context--folio'}`}>
              <span className="da-context-dot" />
              {dinamico.contexto}
            </span>
            <span className="da-chip da-chip--large">{dinamico.codigo}</span>
          </div>
          {dinamico.extra && <div className="da-extra">{conChips(dinamico.extra)}</div>}
        </div>
      );
    }

    // Conductor
    if (dinamico.tipo === 'conductor') {
      return (
        <div className="da-card" style={style}>
          <div className="da-context">
            <span className="da-context-dot" />
            {dinamico.contexto}
          </div>
          <div className="da-row">
            <div className="da-field-badge">
              <span className="da-field-icon-box da-icon--conductor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>{dinamico.conductor}</span>
            </div>
            <span className="da-chip">Tarjetón: {dinamico.tarjeton}</span>
          </div>
          {dinamico.motivo && (
            <div className="da-motivo">
              <div className="da-motivo-title">Motivo Retiro Anterior:</div>
              <p className="da-motivo-text">"{dinamico.motivo}"</p>
            </div>
          )}
        </div>
      );
    }
  }

  // 3. Probar cambios con formato "campo: ant -> nvo"
  const sinComillas = parseDiffsSinComillas(raw);
  if (sinComillas) {
    return (
      <div className="da-card" style={style}>
        {sinComillas.contexto && (
          <div className="da-context">
            <span className="da-context-dot" />
            {sinComillas.contexto}
          </div>
        )}
        <Diffs diffs={sinComillas.diffs} />
        {sinComillas.extra && <div className="da-extra">{conChips(sinComillas.extra)}</div>}
      </div>
    );
  }

  // 4. Formato simple limpio con icono contextual por palabra clave
  const infoSimple = getSimpleTextInfo(raw);
  return (
    <div className="da-card" style={style}>
      <div className="da-simple">
        <span className={`da-field-icon-box ${infoSimple.colorClass}`}>
          {infoSimple.icon}
        </span>
        <span className="da-simple-text">{conChips(raw)}</span>
      </div>
    </div>
  );
}
