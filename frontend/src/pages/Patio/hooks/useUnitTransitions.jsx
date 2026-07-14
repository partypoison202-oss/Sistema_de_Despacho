// hooks/useUnitTransitions.js
import { useState, useEffect, useRef } from 'react';
import { EXIT_GATE, buildZonaVerdeSlots, slotsZonaRoja1, slotsZonaRoja2 } from '../config/patioConfig';
import { ROUTES, getRouteIdsForStatus } from '../config/patioRoutes';
import { getPositionOnRoute } from '../utils/pathUtils';

// Distancia (en progreso 0-1) que miramos "hacia adelante" sobre la ruta para
// calcular el rumbo instantáneo del vehículo.
const LOOK_AHEAD = 0.015;

// Qué tan rápido el ángulo visual "alcanza" al ángulo objetivo cada frame (0-1).
// Valores bajos = giro más suave/lento (como un volante real), valores altos = giro más rígido.
const ANGLE_SMOOTHING = 0.12;

// Normaliza un ángulo a [-180, 180]
const normalizeAngle = (a) => {
  let angle = a % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
};

// Interpola entre dos ángulos tomando siempre el camino más corto (evita que el
// vehículo "gire de más" al cruzar el límite -180/180)
const lerpAngleShortestPath = (current, target, t) => {
  const delta = normalizeAngle(target - current);
  return current + delta * t;
};

export const useUnitTransitions = (apiUnits) => {
  const [displayUnits, setDisplayUnits] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [angleMap, setAngleMap] = useState({}); // ángulo visual suavizado por unidad
  const animationFrameRef = useRef();
  const displayUnitsRef = useRef(displayUnits);
  const progressMapRef = useRef(progressMap);
  const angleMapRef = useRef(angleMap);

  displayUnitsRef.current = displayUnits;
  progressMapRef.current = progressMap;
  angleMapRef.current = angleMap;

  // Lógica de transiciones: asigna routeId según la zona destino (mantenimiento -> zona verde,
  // reserva -> zona roja), usando las rutas reales digitalizadas de la imagen del patio.
  useEffect(() => {
    if (!apiUnits) return;
    setDisplayUnits((prevUnits) => {
      const nextDisplay = [];
      const incomingMap = new Map(apiUnits.map((u) => [u.numero_eco, u]));
      const prevMap = new Map(prevUnits.map((u) => [u.numero_eco, u]));

      apiUnits.forEach((incoming) => {
        const prev = prevMap.get(incoming.numero_eco);
        const inBase = incoming.estatus === 'reserva' || incoming.estatus === 'mantenimiento';

        if (!prev) {
          if (inBase) {
            const { entry } = getRouteIdsForStatus(incoming.estatus);
            nextDisplay.push({
              ...incoming,
              transitionState: 'entering',
              opacity: 0,
              routeId: entry,
            });
            setProgressMap((p) => ({ ...p, [incoming.numero_eco]: 0 }));
          }
        } else {
          const prevInBase = prev.estatus === 'reserva' || prev.estatus === 'mantenimiento';
          if (prevInBase && !inBase) {
            const { exit } = getRouteIdsForStatus(prev.estatus);
            nextDisplay.push({
              ...prev,
              estatus: 'operacion',
              transitionState: 'exiting',
              opacity: 1,
              routeId: exit,
            });
            setProgressMap((p) => ({ ...p, [prev.numero_eco]: 0 }));
          } else if (!prevInBase && inBase) {
            const { entry } = getRouteIdsForStatus(incoming.estatus);
            nextDisplay.push({
              ...incoming,
              transitionState: 'entering',
              opacity: 0,
              routeId: entry,
            });
            setProgressMap((p) => ({ ...p, [incoming.numero_eco]: 0 }));
          } else if (prevInBase && inBase && prev.estatus !== incoming.estatus) {
            const { exit } = getRouteIdsForStatus(prev.estatus);
            nextDisplay.push({
              ...prev,
              transitionState: 'exiting',
              opacity: 1,
              routeId: exit,
              _pendingEstatus: incoming.estatus,
            });
            setProgressMap((p) => ({ ...p, [prev.numero_eco]: 0 }));
          } else if (inBase) {
            nextDisplay.push({
              ...incoming,
              transitionState: 'idle',
              opacity: 1,
              routeId: null,
            });
          }
        }
      });

      prevUnits.forEach((prev) => {
        if (prev.transitionState === 'exiting' && !incomingMap.has(prev.numero_eco)) {
          nextDisplay.push(prev);
        }
      });

      return nextDisplay;
    });
  }, [apiUnits]);

  // Bucle de animación: avanza el progreso Y suaviza el ángulo de cada unidad en
  // movimiento, simulando el giro del volante en tiempo real (cuadro a cuadro).
  useEffect(() => {
    const updateFrame = () => {
      const units = displayUnitsRef.current;
      let progressChanged = false;
      let angleChanged = false;

      const newProgress = { ...progressMapRef.current };
      const newAngles = { ...angleMapRef.current };

      units.forEach((unit) => {
        const moving = unit.transitionState === 'entering' || unit.transitionState === 'exiting';
        if (!moving) return;

        // 1) Avanzar progreso a lo largo de la ruta
        const currentProgress = newProgress[unit.numero_eco] || 0;
        const increment = 0.005; // ~3.3s a 60fps para completar el recorrido
        const nextProgress = Math.min(currentProgress + increment, 1);
        if (nextProgress !== currentProgress) {
          newProgress[unit.numero_eco] = nextProgress;
          progressChanged = true;
        }

        // 2) Calcular el rumbo objetivo (heading) en base a la ruta y suavizarlo
        const route = ROUTES[unit.routeId];
        if (route) {
          const pos = getPositionOnRoute(route, nextProgress);
          const lookAheadProgress = Math.min(nextProgress + LOOK_AHEAD, 1);
          const posAhead = getPositionOnRoute(route, lookAheadProgress);

          if (pos && posAhead) {
            const dx = parseFloat(posAhead.x) - parseFloat(pos.x);
            const dy = parseFloat(posAhead.y) - parseFloat(pos.y);

            if (dx !== 0 || dy !== 0) {
              // 🔥 CORRECCIÓN CLAVE: ángulo desde el eje Y positivo (arriba) en sentido horario
              // Esto hace que el frente (luces amarillas) apunte hacia donde se mueve la unidad
              const targetAngle = (Math.atan2(dx, -dy) * 180) / Math.PI;
              const currentAngle = newAngles[unit.numero_eco] ?? targetAngle;
              const smoothed = lerpAngleShortestPath(currentAngle, targetAngle, ANGLE_SMOOTHING);
              if (smoothed !== currentAngle) {
                newAngles[unit.numero_eco] = smoothed;
                angleChanged = true;
              }
            }
          }
        }
      });

      if (progressChanged) setProgressMap(newProgress);
      if (angleChanged) setAngleMap(newAngles);

      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };
    animationFrameRef.current = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  // Finalizar transiciones cuando progreso llega a 1
  useEffect(() => {
    displayUnits.forEach((unit) => {
      if (unit.transitionState === 'entering' || unit.transitionState === 'exiting') {
        const prog = progressMap[unit.numero_eco] || 0;
        if (prog >= 1) {
          if (unit.transitionState === 'entering') {
            setDisplayUnits((prev) =>
              prev.map((u) =>
                u.numero_eco === unit.numero_eco
                  ? { ...u, transitionState: 'idle', opacity: 1, routeId: null }
                  : u
              )
            );
          } else if (unit.transitionState === 'exiting') {
            if (unit._pendingEstatus) {
              const { entry } = getRouteIdsForStatus(unit._pendingEstatus);
              setDisplayUnits((prev) =>
                prev.map((u) =>
                  u.numero_eco === unit.numero_eco
                    ? {
                        ...u,
                        estatus: unit._pendingEstatus,
                        transitionState: 'entering',
                        opacity: 0,
                        routeId: entry,
                        _pendingEstatus: undefined,
                      }
                    : u
                )
              );
              setProgressMap((prev) => ({ ...prev, [unit.numero_eco]: 0 }));
              return;
            }
            setDisplayUnits((prev) => prev.filter((u) => u.numero_eco !== unit.numero_eco));
          }
          setProgressMap((prev) => {
            const newP = { ...prev };
            if (!unit._pendingEstatus) delete newP[unit.numero_eco];
            return newP;
          });
          setAngleMap((prev) => {
            const newA = { ...prev };
            if (!unit._pendingEstatus) delete newA[unit.numero_eco];
            return newA;
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressMap]);

  // Asignación de coordenadas para unidades en idle (slots fijos)
  const getUnitCoordinates = () => {
    const parkedUnits = displayUnits.filter(
      (u) => (u.estatus === 'reserva' || u.estatus === 'mantenimiento') && u.transitionState !== 'exiting'
    );

    const reserveUnits = parkedUnits.filter((u) => u.estatus === 'reserva');
    const maintenanceUnits = parkedUnits.filter((u) => u.estatus === 'mantenimiento');

    reserveUnits.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
    maintenanceUnits.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));

    const slotsZonaVerde = buildZonaVerdeSlots(maintenanceUnits.length);
    const unitCoordinates = new Map();

    const assignCoordinates = (units, zoneSlotsList) => {
      const allSlots = zoneSlotsList.flat();
      units.forEach((u, index) => {
        const slot = allSlots[index % allSlots.length];
        unitCoordinates.set(u.numero_eco, slot);
      });
    };

    assignCoordinates(reserveUnits, [slotsZonaRoja1, slotsZonaRoja2]);
    assignCoordinates(maintenanceUnits, [slotsZonaVerde]);

    return unitCoordinates;
  };

  // Obtener posición y ángulo actuales de una unidad (para renderizar).
  // Durante entering/exiting usa el ángulo YA SUAVIZADO (angleMap), calculado
  // en el bucle de animación cuadro a cuadro para simular el giro del volante.
  const getUnitPosition = (unit) => {
    if (unit.transitionState === 'entering' || unit.transitionState === 'exiting') {
      const route = ROUTES[unit.routeId];
      if (!route) return null;
      const progress = progressMap[unit.numero_eco] || 0;
      const pos = getPositionOnRoute(route, progress);
      if (!pos) return null;

      const angle = angleMap[unit.numero_eco] ?? 0;
      return { top: pos.y, left: pos.x, angle };
    } else {
      const coordsMap = getUnitCoordinates();
      const slot = coordsMap.get(unit.numero_eco);
      if (slot) {
        return { top: slot.top, left: slot.left, angle: slot.angle || 0 };
      }
      return null;
    }
  };

  return { displayUnits, getUnitPosition };
};