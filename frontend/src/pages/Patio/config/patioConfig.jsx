// config/patioConfig.js

// Punto de entrada/salida principal (debe coincidir con el inicio de las rutas en patioRoutes.js)
export const EXIT_GATE = { top: '17.7%', left: '26.1%' };

// Función para construir filas de slots
export const buildRowSlots = (colA, colB, n, angle) => {
  const slots = [];
  [colA, colB].forEach((c) => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      slots.push({
        top: `${c.sTop + t * (c.eTop - c.sTop)}%`,
        left: `${c.sLeft + t * (c.eLeft - c.sLeft)}%`,
        angle,
      });
    }
  });
  return slots;
};

// Zonas rojas (estáticas)
export const slotsZonaRoja1 = buildRowSlots(
  { sTop: 20.29, sLeft: 75.76, eTop: 33.66, eLeft: 53.09 },
  { sTop: 26.11, sLeft: 77.32, eTop: 39.48, eLeft: 54.65 },
  15,
  -21.7
);
export const slotsZonaRoja2 = buildRowSlots(
  { sTop: 34.06, sLeft: 79.36, eTop: 46.43, eLeft: 56.60 },
  { sTop: 39.93, sLeft: 80.82, eTop: 52.31, eLeft: 58.05 },
  15,
  -20.2
);

// Zona verde (dinámica)
export const ZONA_VERDE_FILA_BASE = { sTop: 61.0, sLeft: 87.0, eTop: 75.5, eLeft: 62.0 };
export const ZONA_VERDE_ANGLE = -20.3;
export const ZONA_VERDE_CAJONES_POR_FILA = 10;
export const ZONA_VERDE_SEPARACION_FILA = { top: 5, left: 1 };
export const ZONA_VERDE_INSET = 0.08;

export const buildZonaVerdeSlots = (totalUnidades) => {
  const filasNecesarias = Math.max(1, Math.ceil(totalUnidades / ZONA_VERDE_CAJONES_POR_FILA));
  const slots = [];
  for (let fila = 0; fila < filasNecesarias; fila++) {
    const linea = {
      sTop: ZONA_VERDE_FILA_BASE.sTop - fila * ZONA_VERDE_SEPARACION_FILA.top,
      sLeft: ZONA_VERDE_FILA_BASE.sLeft - fila * ZONA_VERDE_SEPARACION_FILA.left,
      eTop: ZONA_VERDE_FILA_BASE.eTop - fila * ZONA_VERDE_SEPARACION_FILA.top,
      eLeft: ZONA_VERDE_FILA_BASE.eLeft - fila * ZONA_VERDE_SEPARACION_FILA.left,
    };
    for (let i = 0; i < ZONA_VERDE_CAJONES_POR_FILA; i++) {
      const t = ZONA_VERDE_INSET + (1 - 2 * ZONA_VERDE_INSET) * (i / (ZONA_VERDE_CAJONES_POR_FILA - 1));
      slots.push({
        top: `${linea.sTop + t * (linea.eTop - linea.sTop)}%`,
        left: `${linea.sLeft + t * (linea.eLeft - linea.sLeft)}%`,
        angle: ZONA_VERDE_ANGLE,
      });
    }
  }
  return slots;
};

export const fleets = [
  { id: 'all', label: 'TODAS' },
  { id: 'urbanuss', label: 'URBANUSS' },
  { id: 'vagoneta', label: 'VAGONETA' },
  { id: 'zafiro', label: 'ZAFIRO' },
  { id: 'orion', label: 'ORION' },
];
