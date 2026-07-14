// config/patioRoutes.js
// Puntos digitalizados según las rutas proporcionadas.
// Todas las coordenadas están en % (top/left) relativas al contenedor del plano.

// ---------------------------------------------------------------------------
// Ruta: Reserva con Conductor → Operación
// ---------------------------------------------------------------------------
const reservaConductorToOperacionPoints = [
  { x: '54.94%', y: '27.74%' },
  { x: '53.81%', y: '29.26%' },
  { x: '53.35%', y: '31.29%' },
  { x: '52.56%', y: '33.82%' },
  { x: '50.87%', y: '37.20%' },
  { x: '49.40%', y: '38.22%' },
  { x: '47.70%', y: '39.74%' },
  { x: '45.44%', y: '39.91%' },
  { x: '43.07%', y: '39.06%' },
  { x: '41.26%', y: '38.39%' },
  { x: '37.64%', y: '34.50%' },
  { x: '27.02%', y: '19.62%' },
  { x: '20.23%', y: '10.66%' },
];

const operacionToReservaConductorPoints = [...reservaConductorToOperacionPoints].reverse();

// ---------------------------------------------------------------------------
// Ruta: Reserva con Conductor → Mantenimiento
// ---------------------------------------------------------------------------
const reservaConductorToMantenimientoPoints = [
  { x: '54.03%', y: '29.09%' },
  { x: '52.90%', y: '29.93%' },
  { x: '52.68%', y: '31.29%' },
  { x: '52.79%', y: '33.99%' },
  { x: '53.35%', y: '37.04%' },
  { x: '53.69%', y: '38.05%' },
  { x: '54.37%', y: '40.08%' },
  { x: '55.05%', y: '42.28%' },
  { x: '56.18%', y: '45.15%' },
  { x: '57.76%', y: '50.06%' },
  { x: '59.12%', y: '52.93%' },
  { x: '61.04%', y: '53.94%' },
  { x: '62.62%', y: '54.62%' },
  { x: '65.11%', y: '55.97%' },
  { x: '67.82%', y: '56.82%' },
  { x: '70.08%', y: '57.50%' },
];

const mantenimientoToReservaConductorPoints = [...reservaConductorToMantenimientoPoints].reverse();

// ---------------------------------------------------------------------------
// Ruta: Reserva sin Conductor → Operación
// ---------------------------------------------------------------------------
const reservaSinConductorToOperacionPoints = [
  { x: '58.10%', y: '41.09%' },
  { x: '56.97%', y: '41.77%' },
  { x: '55.39%', y: '42.45%' },
  { x: '53.35%', y: '42.78%' },
  { x: '51.43%', y: '42.78%' },
  { x: '49.96%', y: '42.45%' },
  { x: '48.38%', y: '42.28%' },
  { x: '45.89%', y: '41.94%' },
  { x: '44.42%', y: '41.43%' },
  { x: '42.39%', y: '40.08%' },
  { x: '40.81%', y: '38.73%' },
  { x: '38.43%', y: '36.02%' },
  { x: '32.67%', y: '27.23%' },
  { x: '26.90%', y: '19.11%' },
  { x: '20.80%', y: '11.00%' },
];

const operacionToReservaSinConductorPoints = [...reservaSinConductorToOperacionPoints].reverse();

// ---------------------------------------------------------------------------
// Ruta: Reserva sin Conductor → Mantenimiento
// ---------------------------------------------------------------------------
const reservaSinConductorToMantenimientoPoints = [
  { x: '70.08%', y: '33.15%' },
  { x: '71.55%', y: '32.30%' },
  { x: '73.59%', y: '32.30%' },
  { x: '75.17%', y: '30.95%' },
  { x: '76.87%', y: '29.60%' },
  { x: '79.01%', y: '28.75%' },
  { x: '80.82%', y: '27.90%' },
  { x: '83.08%', y: '27.90%' },
  { x: '84.33%', y: '31.12%' },
  { x: '85.12%', y: '34.67%' },
  { x: '84.78%', y: '37.20%' },
  { x: '83.87%', y: '39.40%' },
  { x: '82.52%', y: '42.11%' },
  { x: '80.71%', y: '44.64%' },
  { x: '78.90%', y: '46.50%' },
  { x: '77.77%', y: '48.03%' },
  { x: '76.30%', y: '50.39%' },
  { x: '74.72%', y: '52.08%' },
  { x: '73.13%', y: '54.28%' },
];

const mantenimientoToReservaSinConductorPoints = [...reservaSinConductorToMantenimientoPoints].reverse();

// ---------------------------------------------------------------------------
// Ruta: Mantenimiento → Operación
// ---------------------------------------------------------------------------
const mantenimientoToOperacionPoints = [
  { x: '70.87%', y: '53.94%' },
  { x: '68.73%', y: '54.28%' },
  { x: '67.37%', y: '54.28%' },
  { x: '64.66%', y: '54.96%' },
  { x: '61.04%', y: '54.45%' },
  { x: '58.55%', y: '53.61%' },
  { x: '57.08%', y: '52.76%' },
  { x: '54.94%', y: '51.58%' },
  { x: '52.45%', y: '49.89%' },
  { x: '49.96%', y: '47.18%' },
  { x: '48.15%', y: '46.17%' },
  { x: '46.35%', y: '44.81%' },
  { x: '44.31%', y: '43.29%' },
  { x: '41.71%', y: '40.42%' },
  { x: '37.75%', y: '34.33%' },
  { x: '27.13%', y: '18.77%' },
  { x: '20.23%', y: '10.66%' },
];

const operacionToMantenimientoPoints = [...mantenimientoToOperacionPoints].reverse();

// ---------------------------------------------------------------------------
// EXPORTACIÓN
// ---------------------------------------------------------------------------
export const ROUTES = {
  // Salidas (de base a operación)
  reservaConductorToOperacion: {
    id: 'reservaConductorToOperacion',
    points: reservaConductorToOperacionPoints,
  },
  reservaSinConductorToOperacion: {
    id: 'reservaSinConductorToOperacion',
    points: reservaSinConductorToOperacionPoints,
  },
  mantenimientoToOperacion: {
    id: 'mantenimientoToOperacion',
    points: mantenimientoToOperacionPoints,
  },

  // Entradas (de operación a base)
  operacionToReservaConductor: {
    id: 'operacionToReservaConductor',
    points: operacionToReservaConductorPoints,
  },
  operacionToReservaSinConductor: {
    id: 'operacionToReservaSinConductor',
    points: operacionToReservaSinConductorPoints,
  },
  operacionToMantenimiento: {
    id: 'operacionToMantenimiento',
    points: operacionToMantenimientoPoints,
  },

  // Movimientos internos (reserva ↔ mantenimiento)
  reservaConductorToMantenimiento: {
    id: 'reservaConductorToMantenimiento',
    points: reservaConductorToMantenimientoPoints,
  },
  mantenimientoToReservaConductor: {
    id: 'mantenimientoToReservaConductor',
    points: mantenimientoToReservaConductorPoints,
  },
  reservaSinConductorToMantenimiento: {
    id: 'reservaSinConductorToMantenimiento',
    points: reservaSinConductorToMantenimientoPoints,
  },
  mantenimientoToReservaSinConductor: {
    id: 'mantenimientoToReservaSinConductor',
    points: mantenimientoToReservaSinConductorPoints,
  },
};

// Helper para obtener la posición en una ruta dado un progreso (0-1)
export const getPositionOnRoute = (route, progress) => {
  const points = route.points;
  if (!points || points.length < 2) return null;
  const totalSegments = points.length - 1;
  const target = Math.min(Math.max(progress, 0), 1) * totalSegments;
  const segmentIndex = Math.min(Math.floor(target), totalSegments - 1);
  const segmentProgress = target - segmentIndex;
  const p1 = points[segmentIndex];
  const p2 = points[segmentIndex + 1];
  const x = parseFloat(p1.x) + (parseFloat(p2.x) - parseFloat(p1.x)) * segmentProgress;
  const y = parseFloat(p1.y) + (parseFloat(p2.y) - parseFloat(p1.y)) * segmentProgress;
  return { top: y + '%', left: x + '%' };
};

// Obtiene el primer y último punto de una ruta (como objetos {top, left})
export const getRouteEndpoints = (routeId) => {
  const route = ROUTES[routeId];
  if (!route || route.points.length < 2) return null;
  const first = route.points[0];
  const last = route.points[route.points.length - 1];
  return {
    start: { top: first.y, left: first.x },
    end: { top: last.y, left: last.x },
  };
};