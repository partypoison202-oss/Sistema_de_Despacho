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

export default {
  normalizeRuta,
  normalizeRutaClave,
};
