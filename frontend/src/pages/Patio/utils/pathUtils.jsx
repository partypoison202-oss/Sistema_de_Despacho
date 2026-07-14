// utils/pathUtils.js
export const getPositionOnRoute = (route, progress) => {
  const points = route.points;
  if (!points || points.length === 0) return null;
  // Clamp progress
  const p = Math.max(0, Math.min(1, progress));
  if (p === 0) return { x: points[0].x, y: points[0].y };
  if (p === 1) return { x: points[points.length - 1].x, y: points[points.length - 1].y };

  // Distancia total en segmentos
  const totalSegments = points.length - 1;
  const totalDistance = totalSegments; // cada segmento tiene longitud 1 (distancia normalizada)
  const targetDistance = p * totalDistance;

  let accumulated = 0;
  for (let i = 0; i < totalSegments; i++) {
    const segLen = 1;
    if (targetDistance <= accumulated + segLen) {
      const localProgress = (targetDistance - accumulated) / segLen;
      const p0 = points[i];
      const p1 = points[i+1];
      // Interpolar lineal
      const x = parseFloat(p0.x) + localProgress * (parseFloat(p1.x) - parseFloat(p0.x));
      const y = parseFloat(p0.y) + localProgress * (parseFloat(p1.y) - parseFloat(p0.y));
      return { x: x + '%', y: y + '%' };
    }
    accumulated += segLen;
  }
  // fallback
  return { x: points[points.length-1].x, y: points[points.length-1].y };
};