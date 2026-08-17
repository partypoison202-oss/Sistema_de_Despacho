import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ROUTES, getPositionOnRoute, getRouteEndpoints } from './config/patioRoutes';
import './PatioDashboard.css';

// --- Cálculo de rumbo entre dos puntos {top,left} en % ---------------------
const toNum = (v) => parseFloat(v);

const angleBetween = (from, to) => {
  if (!from || !to) return null;
  const dx = toNum(to.left) - toNum(from.left);
  const dy = toNum(to.top) - toNum(from.top);
  if (dx === 0 && dy === 0) return null;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
};

// --- Interpolación lineal entre dos puntos {top, left} --------------------
const lerpPoint = (p1, p2, t) => ({
  top: `${toNum(p1.top) + (toNum(p2.top) - toNum(p1.top)) * t}%`,
  left: `${toNum(p1.left) + (toNum(p2.left) - toNum(p1.left)) * t}%`,
});

// --- CONFIGURACIÓN DE ZONAS ------------------------------------------------
const buildRowSlots = (colA, colB, n, angle) => {
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

// Fila superior: reserva CON conductor
const slotsReservaConConductor = buildRowSlots(
  { sTop: 20.29, sLeft: 75.76, eTop: 33.66, eLeft: 53.09 },
  { sTop: 26.11, sLeft: 77.32, eTop: 39.48, eLeft: 54.65 },
  15,
  -21.7
);
// Fila inferior: reserva SIN conductor
const slotsReservaSinConductor = buildRowSlots(
  { sTop: 43.10, sLeft: 58.77, eTop: 29.44, eLeft: 81.08 },
  { sTop: 50.39, sLeft: 60.33, eTop: 36.73, eLeft: 83.66 },
  15,
  -20.2
);

// Zona Verde (mantenimiento)
const ZONA_VERDE_FILA_BASE = { sTop: 61.0, sLeft: 87.0, eTop: 75.5, eLeft: 62.0 };
const ZONA_VERDE_ANGLE = -20.3;
const ZONA_VERDE_CAJONES_POR_FILA = 10;
const ZONA_VERDE_SEPARACION_FILA = { top: 5, left: 1 };
const ZONA_VERDE_INSET = 0.08;

const buildZonaVerdeSlots = (totalUnidades) => {
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
      const t =
        ZONA_VERDE_INSET +
        (1 - 2 * ZONA_VERDE_INSET) * (i / (ZONA_VERDE_CAJONES_POR_FILA - 1));
      slots.push({
        top: `${linea.sTop + t * (linea.eTop - linea.sTop)}%`,
        left: `${linea.sLeft + t * (linea.eLeft - linea.sLeft)}%`,
        angle: ZONA_VERDE_ANGLE,
      });
    }
  }
  return slots;
};

// --- Contornos de zona (reemplazan a los antiguos labels de texto) --------
// Cada zona ahora se marca con un polígono de contorno (outline) dibujado
// sobre el plano, en vez de una etiqueta de texto. Los puntos están en
// porcentaje (top/left) relativos al contenedor del plano.
// Coordenadas exactas de cada zona (x=left, y=top, en %).
const ZONE_OUTLINES = [
  {
    id: 'reserva-conductor',
    label: 'Reserva',
    color: '#1a76e0',
    // [top, left]
    points: [
      [27.90, 53.81],
      [14.04, 78.67],
      [25.71, 81.61],
      [39.91, 56.74],
      [27.57, 53.58],
    ],
  },
  {
    id: 'reserva-sin-conductor',
    label: 'Sin conductor',
    color: '#e0c400',
    points: [
      [41.43, 56.97],
      [26.21, 81.84],
      [38.39, 85.46],
      [53.61, 59.57],
      [41.60, 56.97],
    ],
  },
  {
    id: 'mantenimiento',
    label: 'Mantenimiento',
    color: '#d32f2f',
    points: [
      [78.97, 61.94],
      [64.43, 58.55],
      [50.56, 83.42],
      [64.94, 87.72],
      [78.80, 61.94],
    ],
  },
];

// --- Función para detectar si una unidad tiene conductor ------------------
const unitHasConductor = (u) => {
  const conductorValue = u.nombre_conductor ?? u.conductor ?? u.conductor_nombre ?? u.conductorNombre;
  if (!conductorValue) return false;
  if (typeof conductorValue === 'string') {
    const trimmed = conductorValue.trim();
    return trimmed.length > 0 && trimmed !== 'No asignado' && trimmed !== 'Sin asignar' && trimmed !== 'N/A';
  }
  if (typeof conductorValue === 'object') return true;
  if (typeof conductorValue === 'boolean') return conductorValue;
  if (typeof conductorValue === 'number') return conductorValue > 0;
  return false;
};

// --- Función para fusionar datos de incoming y prev, preservando campos ---
const mergeUnitData = (incoming, prev) => {
  const merged = { ...incoming };
  if (prev) {
    const incomingTieneConductor = unitHasConductor(incoming);
    const prevTieneConductor = unitHasConductor(prev);

    if (incomingTieneConductor) {
      merged.nombre_conductor = incoming.nombre_conductor ?? incoming.conductor ?? incoming.conductor_nombre;
      merged.conductor = incoming.conductor ?? merged.conductor;
      merged.conductor_nombre = incoming.conductor_nombre ?? merged.conductor_nombre;
    } else if (prevTieneConductor) {
      merged.nombre_conductor = prev.nombre_conductor ?? prev.conductor ?? prev.conductor_nombre;
      merged.conductor = prev.conductor ?? merged.conductor;
      merged.conductor_nombre = prev.conductor_nombre ?? merged.conductor_nombre;
    }

    merged.tarjeton = incoming.tarjeton ?? prev.tarjeton;
    merged.ruta = incoming.ruta ?? prev.ruta;
    for (const key of Object.keys(prev)) {
      if (!(key in merged) || merged[key] === undefined || merged[key] === null) {
        merged[key] = prev[key];
      }
    }
  }
  return merged;
};

// --- Componente principal -----------------------------------------------
const PatioDashboard = () => {
  const fleets = [
    { id: 'all', label: 'TODAS' },
    { id: 'urbanuss', label: 'URBANUSS' },
    { id: 'vagoneta', label: 'VAGONETA' },
    { id: 'zafiro', label: 'ZAFIRO' },
    { id: 'orion', label: 'ORION' },
  ];

  const [selectedFleet, setSelectedFleet] = useState('all');
  const [displayUnits, setDisplayUnits] = useState([]);
  const [unitSlots, setUnitSlots] = useState(new Map());
  const [unitDetailsCache, setUnitDetailsCache] = useState({});
  const [hoveredUnitEco, setHoveredUnitEco] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef(null);

  const planoRef = useRef(null);

  // --- Fullscreen handlers ---------------------------------------------
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        setControlsVisible(true);
        if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleUserActivity = () => {
    if (!isFullscreen) return;
    setControlsVisible(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const el = planoRef.current;
      if (el) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (req) {
          req.call(el).catch(err => setIsFullscreen(true));
        } else {
          setIsFullscreen(true);
        }
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) {
        exit.call(document);
      } else {
        setIsFullscreen(false);
      }
    }
  };

  // --- Data fetching ----------------------------------------------------
  const fetchAllUnitsData = async () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    const fleetIds = ['urbanuss', 'vagoneta', 'zafiro', 'orion'];

    const promises = fleetIds.map(async (id) => {
      const response = await fetch(`${API_BASE}/api/unidades/listar/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.map((u) => ({ ...u, fleetId: id }));
      }
      return [];
    });

    const results = await Promise.all(promises);
    return results.flat();
  };

  const { data: allApiUnits = [], isLoading: loading, refetch: forceFetchUnits } = useQuery({
    queryKey: ['unidades-patio-all'],
    queryFn: fetchAllUnitsData,
    refetchInterval: 5000, // Cada 5s – casi tiempo real, sin saturar servidor
    refetchOnWindowFocus: true,
  });

  const apiUnits = useMemo(() => {
    if (selectedFleet === 'all') return allApiUnits;
    return allApiUnits.filter((u) => u.fleetId === selectedFleet);
  }, [allApiUnits, selectedFleet]);

  const fetchUnits = () => forceFetchUnits();

  // --- Cache de detalles ----------------------------------------------
  useEffect(() => {
    if (apiUnits && apiUnits.length > 0) {
      setUnitDetailsCache((prev) => {
        const newCache = { ...prev };
        apiUnits.forEach((u) => {
          newCache[u.numero_eco] = {
            ruta: u.ruta,
            nombre_conductor: u.nombre_conductor || u.conductor || u.conductor_nombre,
            numero_tarjeton: u.tarjeton,
            estatus: u.estatus,
            falla: u.falla,
          };
        });
        return newCache;
      });
    }
  }, [apiUnits]);

  // --- Función para asignar slots a unidades en idle --------------------
  const assignSlotsToUnits = (idleUnits) => {
    const reserveCon = idleUnits.filter((u) => u.estatus === 'reserva' && unitHasConductor(u));
    const reserveSin = idleUnits.filter((u) => u.estatus === 'reserva' && !unitHasConductor(u));
    const mantenimiento = idleUnits.filter((u) => u.estatus === 'mantenimiento');

    reserveCon.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
    reserveSin.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
    mantenimiento.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));

    const slotsVerde = buildZonaVerdeSlots(mantenimiento.length);
    const coordsMap = new Map();

    const assign = (list, slotList) => {
      const flat = slotList.flat();
      list.forEach((u, i) => {
        const slot = flat[i % flat.length];
        coordsMap.set(u.numero_eco, slot);
      });
    };

    assign(reserveCon, [slotsReservaConConductor]);
    assign(reserveSin, [slotsReservaSinConductor]);
    assign(mantenimiento, [slotsVerde]);

    return coordsMap;
  };

  // --- Asignar slots ANTES del paint usando useLayoutEffect -------------
  useLayoutEffect(() => {
    const baseUnits = displayUnits.filter(
      (u) =>
        (u.estatus === 'reserva' || u.estatus === 'mantenimiento') &&
        (u.transitionState === 'idle' ||
          u.transitionState === 'entering' ||
          u.transitionState === 'moving-within-base')
    );
    const coordsMap = assignSlotsToUnits(baseUnits);
    setUnitSlots(coordsMap);
  }, [displayUnits]);

  // --- Lógica de transiciones (con preservación de campos) --------------
  const lastFleetRef = useRef(selectedFleet);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!apiUnits || apiUnits.length === 0) return;

    const isFleetChange = lastFleetRef.current !== selectedFleet;
    const isInitial = isFirstLoadRef.current || isFleetChange;

    if (isInitial) {
      isFirstLoadRef.current = false;
      lastFleetRef.current = selectedFleet;
    }

    setDisplayUnits((prevUnits) => {
      const nextDisplay = [];
      const incomingMap = new Map(apiUnits.map((u) => [u.numero_eco, u]));
      const prevMap = new Map(prevUnits.map((u) => [u.numero_eco, u]));

      apiUnits.forEach((incoming) => {
        const prev = prevMap.get(incoming.numero_eco);
        const inBase = incoming.estatus === 'reserva' || incoming.estatus === 'mantenimiento';

        if (!prev) {
          // Unidad nueva
          if (inBase) {
            if (isInitial) {
              nextDisplay.push({
                ...incoming,
                transitionState: 'idle',
                opacity: 1,
              });
            } else {
              const tieneConductor = unitHasConductor(incoming);
              const routeId = incoming.estatus === 'mantenimiento'
                ? 'operacionToMantenimiento'
                : tieneConductor
                  ? 'operacionToReservaConductor'
                  : 'operacionToReservaSinConductor';
              nextDisplay.push({
                ...incoming,
                transitionState: 'entering',
                phase: 'on-route',
                opacity: 1,
                routeId: routeId,
                progress: 0,
              });
            }
          }
        } else {
          const prevInBase = prev.estatus === 'reserva' || prev.estatus === 'mantenimiento';

          if (prevInBase && !inBase) {
            let routeId;
            if (prev.estatus === 'mantenimiento') {
              routeId = 'mantenimientoToOperacion';
            } else {
              const tieneConductor = unitHasConductor(prev);
              routeId = tieneConductor ? 'reservaConductorToOperacion' : 'reservaSinConductorToOperacion';
            }
            const endpoints = getRouteEndpoints(routeId);
            if (!endpoints) return;
            const currentSlot = unitSlots.get(prev.numero_eco);
            const merged = mergeUnitData(incoming, prev);
            if (currentSlot) {
              nextDisplay.push({
                ...merged,
                estatus: 'operacion',
                transitionState: 'exiting',
                phase: 'moving-to-start',
                opacity: 1,
                routeId: routeId,
                progress: 0,
                startPos: currentSlot,
                endPos: endpoints.start,
              });
            } else {
              nextDisplay.push({
                ...merged,
                estatus: 'operacion',
                transitionState: 'exiting',
                phase: 'on-route',
                opacity: 1,
                routeId: routeId,
                progress: 0,
              });
            }
          } else if (!prevInBase && inBase) {
            const merged = mergeUnitData(incoming, prev);
            const tieneConductor = unitHasConductor(merged);
            const routeId = incoming.estatus === 'mantenimiento'
              ? 'operacionToMantenimiento'
              : tieneConductor
                ? 'operacionToReservaConductor'
                : 'operacionToReservaSinConductor';
            nextDisplay.push({
              ...merged,
              transitionState: 'entering',
              phase: 'on-route',
              opacity: 1,
              routeId: routeId,
              progress: 0,
            });
          } else if (inBase) {
            if (prev.estatus !== incoming.estatus) {
              const merged = mergeUnitData(incoming, prev);
              const tieneConductor = unitHasConductor(merged);
              const isMantenimiento = incoming.estatus === 'mantenimiento';
              let routeId;
              if (isMantenimiento) {
                routeId = tieneConductor ? 'reservaConductorToMantenimiento' : 'reservaSinConductorToMantenimiento';
              } else {
                routeId = tieneConductor ? 'mantenimientoToReservaConductor' : 'mantenimientoToReservaSinConductor';
              }
              const endpoints = getRouteEndpoints(routeId);
              if (!endpoints) return;
              const currentSlot = unitSlots.get(prev.numero_eco);
              if (currentSlot) {
                nextDisplay.push({
                  ...merged,
                  transitionState: 'moving-within-base',
                  phase: 'moving-to-start',
                  opacity: 1,
                  routeId: routeId,
                  progress: 0,
                  startPos: currentSlot,
                  endPos: endpoints.start,
                });
              } else {
                nextDisplay.push({
                  ...merged,
                  transitionState: 'moving-within-base',
                  phase: 'on-route',
                  opacity: 1,
                  routeId: routeId,
                  progress: 0,
                });
              }
            } else {
              let newState = prev.transitionState;
              let newPhase = prev.phase;
              let newProgress = prev.progress;
              if (prev.transitionState === 'moving-within-base' && prev.phase === 'on-route' && prev.progress >= 1) {
                newState = 'idle';
                newPhase = null;
                newProgress = undefined;
              } else if (prev.transitionState === 'entering' && prev.phase === 'on-route' && prev.progress >= 1) {
                newState = 'idle';
                newPhase = null;
                newProgress = undefined;
              }
              const merged = mergeUnitData(incoming, prev);
              nextDisplay.push({
                ...merged,
                transitionState: newState,
                phase: newPhase,
                opacity: 1,
                routeId: prev.routeId,
                progress: newProgress,
                startPos: prev.startPos,
                endPos: prev.endPos,
              });
            }
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

  // --- Bucle de animación ------------------------------------------------
  useEffect(() => {
    let frameId;
    const step = () => {
      setDisplayUnits((prev) =>
        prev.map((u) => {
          if (!u.phase) return u;
          if (u.progress === undefined) return u;
          if (u.progress >= 1) return u;
          const newProgress = Math.min(u.progress + 0.005, 1);
          return { ...u, progress: newProgress };
        })
      );
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // --- Cambios de fase al completar una etapa --------------------------
  useEffect(() => {
    const toProcess = displayUnits.filter((u) => u.progress >= 1 && u.phase);
    if (toProcess.length === 0) return;

    setDisplayUnits((prev) =>
      prev.map((u) => {
        if (u.progress < 1 || !u.phase) return u;

        if (u.phase === 'moving-to-start') {
          return {
            ...u,
            phase: 'on-route',
            progress: 0,
            startPos: null,
            endPos: null,
          };
        }

        if (u.phase === 'on-route') {
          if (u.transitionState === 'exiting') {
            return null;
          } else if (u.transitionState === 'entering' || u.transitionState === 'moving-within-base') {
            const targetSlot = unitSlots.get(u.numero_eco);
            const route = ROUTES[u.routeId];
            const lastPoint = route && route.points && route.points.length > 0
              ? route.points[route.points.length - 1]
              : null;
            const routeEnd = lastPoint ? { top: lastPoint.y, left: lastPoint.x } : null;

            if (targetSlot && routeEnd) {
              return {
                ...u,
                phase: 'moving-to-end',
                progress: 0,
                startPos: routeEnd,
                endPos: { top: targetSlot.top, left: targetSlot.left },
              };
            }
            return {
              ...u,
              transitionState: 'idle',
              phase: null,
              progress: undefined,
              routeId: null,
              startPos: null,
              endPos: null,
            };
          }
        }

        if (u.phase === 'moving-to-end') {
          return {
            ...u,
            transitionState: 'idle',
            phase: null,
            progress: undefined,
            routeId: null,
            startPos: null,
            endPos: null,
          };
        }

        return u;
      }).filter(Boolean)
    );
  }, [displayUnits, unitSlots]);

  // --- Handlers de hover -----------------------------------------------
  const handleMouseEnterUnit = async (eco, status) => {
    setHoveredUnitEco(eco);
    if (unitDetailsCache[eco] && unitDetailsCache[eco].nombre_conductor !== 'No asignado' && unitDetailsCache[eco].nombre_conductor !== undefined) return;

    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    try {
      const fleetToUse = selectedFleet !== 'all' ? selectedFleet : 'urbanuss';
      const response = await fetch(`${API_BASE}/api/unidades/detalle/${fleetToUse}/${eco}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnitDetailsCache((prev) => ({
          ...prev,
          [eco]: {
            ...prev[eco],
            ...data,
            nombre_conductor: data.conductor || data.nombre_conductor,
            numero_tarjeton: data.tarjeton,
          },
        }));
      }
    } catch (error) {
      console.warn('Error fetching unit details:', error);
    }
  };

  const handleMouseLeaveUnit = () => {
    setHoveredUnitEco(null);
  };

  // --- Render de una unidad --------------------------------------------
  const renderUnit = (u) => {
    let coords = null;
    let angle = 0;

    if (
      (u.phase === 'moving-to-start' || u.phase === 'moving-to-end') &&
      u.startPos &&
      u.endPos
    ) {
      const pos = lerpPoint(u.startPos, u.endPos, u.progress);
      coords = { top: pos.top, left: pos.left };
      const dx = toNum(u.endPos.left) - toNum(u.startPos.left);
      const dy = toNum(u.endPos.top) - toNum(u.startPos.top);
      angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    } else if (u.phase === 'on-route' && u.routeId) {
      const route = ROUTES[u.routeId];
      if (route) {
        const pos = getPositionOnRoute(route, u.progress);
        if (pos) {
          coords = { top: pos.top, left: pos.left };
          const lookAhead = Math.min(u.progress + 0.01, 1);
          const posAhead = getPositionOnRoute(route, lookAhead);
          if (posAhead) {
            const dx = toNum(posAhead.left) - toNum(pos.left);
            const dy = toNum(posAhead.top) - toNum(pos.top);
            angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
          }
        }
      }
    } else if (u.transitionState === 'idle') {
      const slot = unitSlots.get(u.numero_eco);
      if (slot) {
        coords = { top: slot.top, left: slot.left };
        angle = slot.angle || 0;
      }
    }

    if (!coords) return null;

    const details = unitDetailsCache[u.numero_eco];
    const isHovered = hoveredUnitEco === u.numero_eco;

    return (
      <div
        key={u.numero_eco}
        className={`unit-badge status-${u.estatus} state-${u.transitionState} fleet-${u.fleetId} ${isHovered ? 'hover-active' : ''}`}
        style={{
          top: coords.top,
          left: coords.left,
          opacity: u.opacity ?? 1,
          transition: 'none',
        }}
        onMouseEnter={() => handleMouseEnterUnit(u.numero_eco, u.estatus)}
        onMouseLeave={handleMouseLeaveUnit}
      >
        <div
          className="vehicle-shape"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: 'none',
          }}
        />
        <span className="eco-label-bubble shadow-sm">{u.numero_eco}</span>

        {isHovered && (
          <div className="unit-hover-tooltip shadow-lg">
            <div className="tooltip-header-row">
              <span className="tooltip-eco-title">Eco {u.numero_eco}</span>
              <span className={`tooltip-status-pill badge-${u.estatus}`}>
                {u.estatus === 'reserva' ? 'En Base' : u.estatus === 'mantenimiento' ? 'Mantenimiento' : 'En Operación'}
              </span>
            </div>
            <div className="tooltip-body-content">
              {details ? (
                <>
                  <div className="tooltip-info-item">
                    <span className="lbl">Conductor:</span>
                    <span className="val">{details.nombre_conductor || 'No asignado'}</span>
                  </div>
                  <div className="tooltip-info-item">
                    <span className="lbl">Ruta:</span>
                    <span className="val">{details.ruta || 'Sin ruta'}</span>
                  </div>
                  <div className="tooltip-info-item">
                    <span className="lbl">Tarjetón:</span>
                    <span className="val">{details.numero_tarjeton || 'S/T'}</span>
                  </div>
                  {details.falla && (
                    <div className="tooltip-info-item warning-text">
                      <span className="lbl">Falla:</span>
                      <span className="val">{details.falla}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="tooltip-loading-text">Cargando detalles...</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Estadísticas ----------------------------------------------------
  const totalFleetCount = apiUnits.length;
  const activeCount = apiUnits.filter((u) => u.estatus === 'operacion').length;
  const maintenanceCount = apiUnits.filter((u) => u.estatus === 'mantenimiento').length;
  const reserveCount = apiUnits.filter((u) => u.estatus === 'reserva').length;

  return (
    <div className="patio-dashboard light-theme-base">
      <Header />
      <main className="patio-main-container">
        <section className="patio-info-banner">
          <div className="patio-title-block">
            <span className="patio-breadcrumb">Monitoreo de Patio</span>
            <h1 className="patio-heading">Monitoreo General de Unidades</h1>
            <p className="patio-subheading">
              Consulta en tiempo real de cajones de resguardo y mantenimiento.
            </p>
          </div>
          <div className="patio-stats-row">
            <div className="stat-box shadow-sm border-left-total">
              <span className="stat-label">Flota</span>
              <span className="stat-number">{totalFleetCount}</span>
            </div>
            <div className="stat-box shadow-sm border-left-operacion">
              <span className="stat-label">Operación</span>
              <span className="stat-number text-green">{activeCount}</span>
            </div>
            <div className="stat-box shadow-sm border-left-mantenimiento">
              <span className="stat-label">Mantenimiento</span>
              <span className="stat-number text-orange">{maintenanceCount}</span>
            </div>
            <div className="stat-box shadow-sm border-left-reserva">
              <span className="stat-label">Reserva</span>
              <span className="stat-number text-blue">{reserveCount}</span>
            </div>
          </div>
        </section>

        <div className="patio-viewport-centered">
          <div
            className={`plano-map-wrapper shadow-md ${isFullscreen && typeof document !== 'undefined' && !document.fullscreenElement && !document.webkitFullscreenElement ? 'ios-fullscreen' : ''}`}
            ref={planoRef}
            onMouseMove={handleUserActivity}
            onTouchStart={handleUserActivity}
          >
            {loading && (
              <div className="map-loading-overlay">
                <span className="light-spinner" />
                <p>Cargando información del patio...</p>
              </div>
            )}

            <div className="floating-fleet-tabs">
              {fleets.map((f) => (
                <button
                  key={f.id}
                  className={`fleet-tab fleet-${f.id} ${selectedFleet === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFleet(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="floating-status-badge">
              <span className="online-badge pulse-green-dot"></span>
              <button className="sync-btn-icon" onClick={() => fetchUnits(selectedFleet)} disabled={loading}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>

            <button
              className={`fullscreen-btn ${isFullscreen && !controlsVisible ? 'hide-in-fullscreen' : ''}`}
              onClick={toggleFullscreen}
              aria-label="Pantalla completa"
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                  <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>

            <div className="map-scroll-area">
              <div className="floorplan-canvas">
                <img src="/images/BOCETO PATIO.png" alt="Plano del Patio" className="floorplan-image" />

                {/* Contornos de zona (sustituyen a los labels de texto) */}
                <svg
                  className="zone-outlines-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                >
                  {ZONE_OUTLINES.map((zone) => {
                    const pts = zone.points.map(([top, left]) => `${left},${top}`).join(' ');
                    return (
                      <g key={zone.id}>
                        {/* Contorno blanco de fondo para dar contraste sobre el plano */}
                        <polygon
                          points={pts}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="6"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          opacity="0.9"
                        />
                        {/* Contorno de color, más grueso y visible */}
                        <polygon
                          points={pts}
                          fill="none"
                          stroke={zone.color}
                          strokeWidth="3"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </svg>

                {displayUnits.map(renderUnit)}
              </div>
            </div>

            {/* Leyenda de colores por flota y por zona (Movida fuera del canvas para que no se oculte al hacer scroll) */}
            <div
              className="legend-box"
              style={
                isFullscreen
                  ? {
                      position: 'fixed',
                      bottom: '28px',
                      left: '28px',
                      top: 'auto',
                      right: 'auto',
                      zIndex: 2147483647,
                    }
                  : undefined
              }
            >
              <div className="legend-box-title">Tecnologias</div>
              <div className="legend-item"><span className="legend-color fleet-urbanuss"></span> Urbanuss</div>
              <div className="legend-item"><span className="legend-color fleet-zafiro"></span> Zafiro</div>
              <div className="legend-item"><span className="legend-color fleet-vagoneta"></span> Vagoneta</div>
              <div className="legend-item"><span className="legend-color fleet-orion"></span> Orion</div>

              <div className="legend-box-title" style={{ marginTop: '10px' }}>Zonas</div>
              {ZONE_OUTLINES.map((zone) => (
                <div className="legend-item" key={zone.id}>
                  <span
                    className="legend-color"
                    style={{ backgroundColor: 'transparent', border: `2px solid ${zone.color}` }}
                  ></span>
                  {zone.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatioDashboard;