// src/utils/itinerarioUtils.js

/**
 * Normaliza una cadena de tiempo al formato HH:mm.
 */
export function normalizarHora(hora) {
  if (!hora || typeof hora !== 'string') return '';
  const limpia = hora.trim();
  if (limpia === '' || limpia === '--:--') return '';
  const match = limpia.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/**
 * Obtiene la hora actual formateada en HH:mm (hora de México / sistema).
 */
export function getHoraActualHHMM() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Obtiene la fecha actual local formateada en YYYY-MM-DD (hora de México / sistema).
 * Evita el salto de día prematuro que ocasiona toISOString() después de las 18:00 hrs.
 */
export function getFechaActualLocal() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determina si una unidad con estatus de operación se encuentra actualmente
 * desincorporada por itinerario.
 *
 * @param {Object} unidad Objeto con datos de la unidad
 * @param {string} [horaActual] Hora actual en formato HH:mm (opcional)
 * @returns {boolean}
 */
export function estaDesincorporadaPorItinerario(unidad, horaActual = null) {
  if (!unidad) return false;

  const est = (unidad.ESTATUS || unidad.estatus || unidad.estado || '').toString().toLowerCase().trim();
  if (est !== 'operacion') {
    return false;
  }

  // Si el backend ya marcó la bandera explícitamente y no se proporcionó una hora alternativa
  if (horaActual === null && (unidad.DESINCORPORADA_ITINERARIO === true || unidad.desincorporada_itinerario === true)) {
    return true;
  }

  const hDesincRaw = unidad.HORA_DESINCORPORACION || unidad.hora_desincorporacion || unidad.horaDesincorporacion || '';
  const hIncorpRaw = unidad.HORA_INCORPORACION || unidad.hora_incorporacion || unidad.horaIncorporacion || '';

  const hDesinc = normalizarHora(hDesincRaw);
  const hIncorp = normalizarHora(hIncorpRaw);

  if (!hDesinc || !hIncorp) {
    return false;
  }

  const hora = horaActual ? normalizarHora(horaActual) : getHoraActualHHMM();
  if (!hora) return false;

  // Rango regular durante el día (ej. 13:55 a 16:45)
  if (hDesinc < hIncorp) {
    return hora >= hDesinc && hora < hIncorp;
  }

  // Rango que cruza la medianoche (ej. 23:00 a 05:00)
  if (hDesinc > hIncorp) {
    return hora >= hDesinc || hora < hIncorp;
  }

  return false;
}
