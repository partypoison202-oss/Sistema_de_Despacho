import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import './PatioDashboard.css';

const WAYPOINT_CENTER = { top: '48%', left: '45%' };
const ENTRANCE_GATE = { top: '22%', left: '20%' }; // Entrada por el cruce peatonal (más arriba)
const ENTRANCE_CURVE = { top: '35%', left: '32%' }; // Curva ajustada para no salirse del pavimento
const EXIT_GATE = { top: '15%', left: '26%' }; // Salida entre la caseta y el edificio café
const EXIT_CURVE = { top: '28%', left: '34%' }; // Curva para enfilarse a la salida entre los edificios

// --- CONFIGURACIÓN DE ZONAS (ROJA: estática, VERDE: dinámica) ---
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

// Zonas rojas (RESERVA) — sin cambios
const slotsZonaRoja1 = buildRowSlots(
  { sTop: 20.29, sLeft: 75.76, eTop: 33.66, eLeft: 53.09 },
  { sTop: 26.11, sLeft: 77.32, eTop: 39.48, eLeft: 54.65 },
  15,
  -21.7
);
const slotsZonaRoja2 = buildRowSlots(
  { sTop: 34.06, sLeft: 79.36, eTop: 46.43, eLeft: 56.60 },
  { sTop: 39.93, sLeft: 80.82, eTop: 52.31, eLeft: 58.05 },
  15,
  -20.2
);

// --- Zona verde (MANTENIMIENTO) — fila base es la de ABAJO (verde), se llena primero;
// las siguientes filas (roja, luego azul) se generan hacia arriba ---
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

// Datos mock (por tipo de flota)
const mockUnitsData = {
  urbanus: [
    { numero_eco: '401', tarjeton: 'TJ-401', estatus: 'mantenimiento' },
    { numero_eco: '404', tarjeton: 'TJ-404', estatus: 'reserva' },
    { numero_eco: '405', tarjeton: 'TJ-405', estatus: 'mantenimiento' },
    { numero_eco: '002', tarjeton: 'TJ-102', estatus: 'reserva' },
    { numero_eco: '003', tarjeton: 'TJ-103', estatus: 'operacion' },
    { numero_eco: '006', tarjeton: 'TJ-106', estatus: 'reserva' },
    { numero_eco: '007', tarjeton: 'TJ-107', estatus: 'operacion' },
    { numero_eco: '008', tarjeton: 'TJ-108', estatus: 'reserva' },
    { numero_eco: '009', tarjeton: 'TJ-109', estatus: 'reserva' },
    { numero_eco: '010', tarjeton: 'TJ-110', estatus: 'mantenimiento' },
  ],
  vagoneta: [
    { numero_eco: '401', tarjeton: 'TJ-401', estatus: 'reserva' },
    { numero_eco: '404', tarjeton: 'TJ-404', estatus: 'reserva' },
    { numero_eco: '405', tarjeton: 'TJ-405', estatus: 'mantenimiento' },
    { numero_eco: '102', tarjeton: 'TJ-202', estatus: 'mantenimiento' },
    { numero_eco: '103', tarjeton: 'TJ-203', estatus: 'operacion' },
  ],
  zafiro: [
    { numero_eco: '401', tarjeton: 'TJ-401', estatus: 'mantenimiento' },
    { numero_eco: '404', tarjeton: 'TJ-404', estatus: 'reserva' },
    { numero_eco: '405', tarjeton: 'TJ-405', estatus: 'mantenimiento' },
    { numero_eco: '202', tarjeton: 'TJ-302', estatus: 'mantenimiento' },
    { numero_eco: '203', tarjeton: 'TJ-303', estatus: 'operacion' },
  ],
  orion: [
    { numero_eco: '401', tarjeton: 'TJ-401', estatus: 'reserva' },
    { numero_eco: '404', tarjeton: 'TJ-404', estatus: 'reserva' },
    { numero_eco: '405', tarjeton: 'TJ-405', estatus: 'mantenimiento' },
    { numero_eco: '302', tarjeton: 'TJ-402', estatus: 'mantenimiento' },
    { numero_eco: '303', tarjeton: 'TJ-403', estatus: 'operacion' },
  ],
};

const getMockDetails = (eco, status) => ({
  ruta: status === 'operacion' ? 'Ruta 10 - Troncal Central' : 'Sin ruta activa',
  nombre_conductor: `Conductor Económico ${eco}`,
  numero_tarjeton: `TJ-${eco}`,
  estatus: status,
  falla: status === 'mantenimiento' ? 'Revisión técnica periódica' : null,
  corridas: status === 'operacion' ? 6 : 0,
  ciclo: 'Normal',
  motivo: status === 'mantenimiento' ? 'Ajuste de Frenos / Motor' : 'Resguardo General',
  hora_programada: '06:40 AM',
});

const PatioDashboard = () => {
  const fleets = [
    { id: 'all', label: 'TODAS' },
    { id: 'urbanus', label: 'URBANUSS' },
    { id: 'vagoneta', label: 'VAGONETA' },
    { id: 'zafiro', label: 'ZAFIRO' },
    { id: 'orion', label: 'ORION' },
  ];

  const [selectedFleet, setSelectedFleet] = useState('all');
  const [displayUnits, setDisplayUnits] = useState([]);
  const [unitDetailsCache, setUnitDetailsCache] = useState({});
  const [hoveredUnitEco, setHoveredUnitEco] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef(null);

  const planoRef = useRef(null);

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
    if (!document.fullscreenElement && planoRef.current) {
      planoRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const fetchAllUnitsData = async () => {
    const token = localStorage.getItem('token');
    const fleetIds = ['urbanus', 'vagoneta', 'zafiro', 'orion'];
    
    const promises = fleetIds.map(async (id) => {
        const response = await fetch(`${API_BASE}/api/unidades/listar/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
           const data = await response.json();
           return data.map(u => ({ ...u, fleetId: id }));
        }
        return [];
    });
    
    const results = await Promise.all(promises);
    const allData = results.flat();

    if (allData.length > 0) {
      setIsOffline(false);
      return allData;
    } else {
      setIsOffline(true);
      return fleetIds.flatMap((id) => (mockUnitsData[id] || []).map(u => ({ ...u, fleetId: id })));
    }
  };

  const { data: allApiUnits = [], isLoading: loading, refetch: forceFetchUnits } = useQuery({
    queryKey: ['unidades-patio-all'],
    queryFn: fetchAllUnitsData,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const apiUnits = useMemo(() => {
    if (selectedFleet === 'all') return allApiUnits;
    return allApiUnits.filter(u => u.fleetId === selectedFleet);
  }, [allApiUnits, selectedFleet]);

  // Alias para mantener la funcion si se llama en un boton
  const fetchUnits = () => forceFetchUnits();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOffline) return;
    const interval = setInterval(() => {
      queryClient.setQueryData(['unidades-patio-all'], (prev) => {
        if (!prev || prev.length === 0) return prev;
        const randomIndex = Math.floor(Math.random() * prev.length);
        return prev.map((u, i) => {
          if (i === randomIndex) {
            const nextStatus =
              u.estatus === 'operacion'
                ? Math.random() > 0.4 ? 'reserva' : 'mantenimiento'
                : 'operacion';
            return { ...u, estatus: nextStatus };
          }
          return u;
        });
      });
    }, 12000);
    return () => clearInterval(interval);
  }, [isOffline, queryClient]);

  // Precargar detalles de unidades en caché
  useEffect(() => {
    if (apiUnits && apiUnits.length > 0) {
      setUnitDetailsCache((prev) => {
        const newCache = { ...prev };
        apiUnits.forEach((u) => {
          newCache[u.numero_eco] = {
            ruta: u.ruta,
            nombre_conductor: u.nombre_conductor,
            numero_tarjeton: u.tarjeton,
            estatus: u.estatus,
            falla: u.falla,
          };
        });
        return newCache;
      });
    }
  }, [apiUnits]);

  const lastFleetRef = useRef(selectedFleet);
  const isFirstLoadRef = useRef(true);

  // Lógica de transiciones
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
          if (inBase) {
            if (isInitial) {
              nextDisplay.push({
                ...incoming,
                transitionState: 'idle',
                opacity: 1,
              });
            } else {
              nextDisplay.push({
                ...incoming,
                transitionState: 'entering-spawn',
                opacity: 0,
                posOverride: ENTRANCE_GATE,
              });
            }
          }
        } else {
          const prevInBase = prev.estatus === 'reserva' || prev.estatus === 'mantenimiento';

          if (prevInBase && !inBase) {
            nextDisplay.push({
              ...prev,
              estatus: 'operacion', // Mantener visualmente en operacion mientras sale
              transitionState: 'exiting-to-waypoint',
              opacity: 1,
              posOverride: WAYPOINT_CENTER,
              transitionSpeed: '1.5s',
              transitionEasing: 'linear',
            });
          } else if (!prevInBase && inBase) {
            nextDisplay.push({
              ...incoming,
              transitionState: 'entering-spawn',
              opacity: 0,
              posOverride: ENTRANCE_GATE,
            });
          } else if (inBase) {
            // Mantener estado actual de animación si ya existe
            nextDisplay.push({
              ...incoming,
              transitionState: prev.transitionState?.startsWith('entering') ? prev.transitionState : 'idle',
              opacity: prev.transitionState?.startsWith('entering-spawn') ? 0 : 1,
              posOverride: prev.posOverride,
            });
          }
        }
      });

      prevUnits.forEach((prev) => {
        if (prev.transitionState?.startsWith('exiting') && !incomingMap.has(prev.numero_eco)) {
          nextDisplay.push(prev);
        }
      });

      return nextDisplay;
    });
  }, [apiUnits]);

  // Timers para entering (Entrando al patio)
  useEffect(() => {
    const spawning = displayUnits.filter((u) => u.transitionState === 'entering-spawn');
    if (spawning.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'entering-spawn'
              ? { ...u, transitionState: 'entering-curve', opacity: 1, posOverride: ENTRANCE_CURVE, transitionSpeed: '2s', transitionEasing: 'linear' }
              : u
          )
        );
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  useEffect(() => {
    const curving = displayUnits.filter((u) => u.transitionState === 'entering-curve');
    if (curving.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'entering-curve'
              ? { ...u, transitionState: 'entering-waypoint', posOverride: WAYPOINT_CENTER, transitionSpeed: '2s', transitionEasing: 'linear' }
              : u
          )
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  useEffect(() => {
    const waypointing = displayUnits.filter((u) => u.transitionState === 'entering-waypoint');
    if (waypointing.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'entering-waypoint'
              ? { ...u, transitionState: 'entering-parking', posOverride: null, transitionSpeed: '4.5s', transitionEasing: 'ease-out' }
              : u
          )
        );
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  useEffect(() => {
    const parking = displayUnits.filter((u) => u.transitionState === 'entering-parking');
    if (parking.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'entering-parking'
              ? { ...u, transitionState: 'idle' }
              : u
          )
        );
      }, 4500); 
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  // Timers para exiting (Saliendo del patio a operacion)
  useEffect(() => {
    const toWaypoint = displayUnits.filter((u) => u.transitionState === 'exiting-to-waypoint');
    if (toWaypoint.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'exiting-to-waypoint'
              ? { ...u, transitionState: 'exiting-to-curve', posOverride: EXIT_CURVE, transitionSpeed: '2s', transitionEasing: 'linear' }
              : u
          )
        );
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  useEffect(() => {
    const toCurve = displayUnits.filter((u) => u.transitionState === 'exiting-to-curve');
    if (toCurve.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'exiting-to-curve'
              ? { ...u, transitionState: 'exiting-to-gate', posOverride: EXIT_GATE, opacity: 0, transitionSpeed: '3s', transitionEasing: 'ease-out' }
              : u
          )
        );
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  useEffect(() => {
    const toGate = displayUnits.filter((u) => u.transitionState === 'exiting-to-gate');
    if (toGate.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) => prev.filter((u) => u.transitionState !== 'exiting-to-gate'));
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  const handleMouseEnterUnit = async (eco, status) => {
    setHoveredUnitEco(eco);
    if (unitDetailsCache[eco] && unitDetailsCache[eco].nombre_conductor !== 'No asignado' && unitDetailsCache[eco].nombre_conductor !== undefined) return;
    
    // Fallback if not loaded in cache
    const token = localStorage.getItem('token');
    try {
      const fleetToUse = selectedFleet !== 'all' ? selectedFleet : 'urbanus';
      const response = await fetch(`${API_BASE}/api/unidades/detalle/${fleetToUse}/${eco}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnitDetailsCache((prev) => ({ ...prev, [eco]: {
          ...prev[eco],
          ...data,
          nombre_conductor: data.conductor,
          numero_tarjeton: data.tarjeton
        }}));
      } else {
        throw new Error('API Details Error');
      }
    } catch (error) {
      if (!unitDetailsCache[eco]) {
        setUnitDetailsCache((prev) => ({
          ...prev,
          [eco]: getMockDetails(eco, status),
        }));
      }
    }
  };

  const handleMouseLeaveUnit = () => {
    setHoveredUnitEco(null);
  };

  // --- ASIGNACIÓN DE COORDENADAS ---
  const parkedUnits = displayUnits.filter(
    (u) => (u.estatus === 'reserva' || u.estatus === 'mantenimiento') && u.transitionState !== 'exiting'
  );

  const reserveUnits = parkedUnits.filter((u) => u.estatus === 'reserva');
  const maintenanceUnits = parkedUnits.filter((u) => u.estatus === 'mantenimiento');

  reserveUnits.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
  maintenanceUnits.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));

  // Generar slots verdes dinámicamente
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

  // Estadísticas
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
            className="plano-map-wrapper shadow-md" 
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
                  className={`fleet-tab ${selectedFleet === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFleet(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="floating-status-badge">
              {isOffline ? (
                <span className="offline-badge pulse-orange-dot">Simulación (Offline)</span>
              ) : (
                <span className="online-badge pulse-green-dot">Monitoreo en Vivo</span>
              )}
              <button
                className="sync-btn-icon"
                onClick={() => fetchUnits(selectedFleet)}
                disabled={loading}
              >
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>

            <div className="floorplan-canvas">
              <img
                src="/images/BOCETO PATIO.png"
                alt="Plano del Patio"
                className="floorplan-image"
              />

              {displayUnits.map((u) => {
                let coords = EXIT_GATE;
                let angle = 0;

                if (!u.posOverride) {
                  if (u.estatus === 'reserva' || u.estatus === 'mantenimiento') {
                    const slotCoords = unitCoordinates.get(u.numero_eco);
                    if (slotCoords) {
                      coords = { top: slotCoords.top, left: slotCoords.left };
                      angle = slotCoords.angle;
                    }
                  }
                } else {
                  coords = u.posOverride;
                  angle = 0;
                }

                if (!coords) return null;

                const details = unitDetailsCache[u.numero_eco];
                const isHovered = hoveredUnitEco === u.numero_eco;

                return (
                  <div
                    key={u.numero_eco}
                    className={`unit-badge status-${u.estatus} state-${u.transitionState} ${
                      isHovered ? 'hover-active' : ''
                    }`}
                    style={{
                      top: coords.top,
                      left: coords.left,
                      opacity: u.opacity ?? 1,
                      transitionDuration: u.transitionSpeed || '4s',
                      transitionTimingFunction: u.transitionEasing || 'cubic-bezier(0.25, 1, 0.5, 1)',
                    }}
                    onMouseEnter={() => handleMouseEnterUnit(u.numero_eco, u.estatus)}
                    onMouseLeave={handleMouseLeaveUnit}
                  >
                    <div
                      className="vehicle-shape"
                      style={{ transform: `rotate(${angle}deg)` }}
                    />
                    <span className="eco-label-bubble shadow-sm">{u.numero_eco}</span>

                    {isHovered && (
                      <div className="unit-hover-tooltip shadow-lg">
                        <div className="tooltip-header-row">
                          <span className="tooltip-eco-title">Eco {u.numero_eco}</span>
                          <span className={`tooltip-status-pill badge-${u.estatus}`}>
                            {u.estatus === 'reserva'
                              ? 'En Base'
                              : u.estatus === 'mantenimiento'
                              ? 'Mantenimiento'
                              : 'En Operación'}
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
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatioDashboard;