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
  '1A', '1B', '2A', '2B', '2D', '2E', '3', '4A', '5', '6',
  '7', '8', '9', '10', '11', '12', '13', '14', '15A', '15B',
  '15C', '16', '17', '19', '20B'
];

/**
 * Ordena rutas de menor a mayor respetando el orden oficial (iniciando en 1A y finalizando en 20B).
 */
export const compareRutas = (a, b) => {
  if (!a && !b) return 0;
  if (!a || a === 'SIN ASIGNAR') return 1;
  if (!b || b === 'SIN ASIGNAR') return -1;

  const cleanA = String(a).trim().toUpperCase();
  const cleanB = String(b).trim().toUpperCase();

  if (cleanA === cleanB) return 0;

  // Comparar primero contra el orden oficial de alimentadoras si ambas coinciden
  const idxA = OFFICIAL_ALIMENTADORAS_ORDER.indexOf(cleanA);
  const idxB = OFFICIAL_ALIMENTADORAS_ORDER.indexOf(cleanB);
  if (idxA !== -1 && idxB !== -1) {
    return idxA - idxB;
  }
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;

  // Extraer prefijos opcionales, número base y sufijo de letra
  const regex = /(?:RA|RUTA|R|T)?\s*0*(\d+)\s*([A-Z]*)/i;
  const matchA = cleanA.match(regex);
  const matchB = cleanB.match(regex);

  if (matchA && matchB) {
    const numA = parseInt(matchA[1], 10);
    const numB = parseInt(matchB[1], 10);

    if (numA !== numB) {
      return numA - numB;
    }

    const suffixA = matchA[2] || '';
    const suffixB = matchB[2] || '';
    if (suffixA !== suffixB) {
      return suffixA.localeCompare(suffixB);
    }
  }

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
};

export default {
  normalizeRuta,
  normalizeRutaClave,
  OFFICIAL_ALIMENTADORAS_ORDER,
  compareRutas,
};
