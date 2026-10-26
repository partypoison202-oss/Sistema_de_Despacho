// src/utils/rutaUtils.js
export const normalizeRuta = (ruta) => String(ruta ?? '').trim().toUpperCase();

export const normalizeRutaClave = (ruta) => {
  let texto = normalizeRuta(ruta).replace(/[^A-Z0-9]/g, '');
  // Unifica variantes de escritura antes de extraer el número
  texto = texto.replace(/TRONCAL/g, 'T');
  texto = texto.replace(/ALIMENTADORA/g, 'RA');

  const troncalMatch = /T0*(\d+)([A-Z]*)/.exec(texto);
  if (troncalMatch) return `T${troncalMatch[1].padStart(2, '0')}${troncalMatch[2]}`;

  const raMatch = /RA0*(\d+)([A-Z]*)/.exec(texto);
  if (raMatch) return `RA${raMatch[1].padStart(2, '0')}${raMatch[2]}`;

  const orionMatch = /ORION0*(\d*)([A-Z]*)/.exec(texto);
  if (orionMatch) return `ORION${orionMatch[1] ? orionMatch[1].padStart(2, '0') : ''}${orionMatch[2]}`;

  return texto;
};

/**
 * Lista canónica y oficial de rutas alimentadoras en orden secuencial de menor a mayor.
 */
export const OFFICIAL_ALIMENTADORAS_ORDER = [
  '1A', '1B', '2A', '2B', '2D', '2E', '3', '4', '4A', '4B', '5', '6',
  '7', '8', '9', '10', '11', '12', '13', '14', '15A', '15B',
  '15C', '16', '17', '19', '20B'
];

/**
 * Desglosa un código de ruta para extraer categoría (Troncal vs Alimentadora),
 * número secuencial y sufijo de letra.
 */
export const parseRutaParts = (raw) => {
  const str = String(raw || '').trim().toUpperCase();
  if (!str || str.includes('SIN ASIGNAR')) {
    return { isTroncal: false, num: 999999, suffix: '', original: str };
  }

  // Detectar si es troncal
  const isTroncal = /^T(?:RONCAL)?(?:\s*[-_]?\s*\d|\d|$)/i.test(str);

  // Limpiar prefijos comunes como TRONCAL, ALIMENTADORA, RA, RUTA
  let clean = str
    .replace(/^(?:TRONCAL|ALIMENTADORA|RA|RUTA)\s*[-_]?\s*/i, '')
    .trim();

  // Si era troncal y quedó como T01 o T-01, remover la T inicial para extraer el número
  if (isTroncal && /^T\s*[-_]?\s*/i.test(clean)) {
    clean = clean.replace(/^T\s*[-_]?\s*/i, '').trim();
  }

  // Extraer número y sufijo de letras
  const match = clean.match(/^(\d+)\s*[-_]?\s*([A-Z]*)$/i);
  if (match) {
    return {
      isTroncal,
      num: parseInt(match[1], 10),
      suffix: match[2] || '',
      original: str,
    };
  }

  // Si no encaja en formato numérico puro, intentar encontrar primer número
  const numMatch = clean.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 999999;
  const suffix = clean.replace(/\d+/g, '').replace(/[^A-Z]/g, '');

  return { isTroncal, num, suffix, original: str };
};

/**
 * Ordena rutas de menor a mayor numéricamente y alfabéticamente por sufijo.
 * Prioriza rutas Troncales al inicio y luego Alimentadoras en estricto orden ascendente.
 */
export const compareRutas = (a, b) => {
  if (!a && !b) return 0;
  if (!a || String(a).toUpperCase().includes('SIN ASIGNAR')) return 1;
  if (!b || String(b).toUpperCase().includes('SIN ASIGNAR')) return -1;

  const cleanA = String(a).trim().toUpperCase();
  const cleanB = String(b).trim().toUpperCase();

  if (cleanA === cleanB) return 0;

  const pA = parseRutaParts(cleanA);
  const pB = parseRutaParts(cleanB);

  // Troncales van primero
  if (pA.isTroncal !== pB.isTroncal) {
    return pA.isTroncal ? -1 : 1;
  }

  // Orden numérico de menor a mayor
  if (pA.num !== pB.num) {
    return pA.num - pB.num;
  }

  // Orden alfabético por sufijo de letra (ej. 1A antes de 1B, 2A antes de 2B, etc.)
  const sufCmp = pA.suffix.localeCompare(pB.suffix);
  if (sufCmp !== 0) {
    return sufCmp;
  }

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
};

export default {
  normalizeRuta,
  normalizeRutaClave,
  OFFICIAL_ALIMENTADORAS_ORDER,
  parseRutaParts,
  compareRutas,
};
