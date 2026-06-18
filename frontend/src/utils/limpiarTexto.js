// src/utils/limpiarTexto.js
export const limpiarTexto = (texto) => {
  if (!texto) return '';
  let limpio = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  limpio = limpio.replace(/[^\x20-\x7E\u00E0-\u00FC]/g, '');
  limpio = limpio.replace(/[^a-zA-Z0-9\s\.\,\-\/\(\)\:]/g, '');
  return limpio.trim();
};