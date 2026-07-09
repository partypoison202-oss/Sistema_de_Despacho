import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import './PatioDashboard.css';

// Coordenadas del portal de entrada/salida (Caseta de Control)
const EXIT_GATE = { top: '67%', left: '40%' };

// --- CONFIGURACIÓN DE LAS 4 ZONAS DE ESTACIONAMIENTO (sin cambios) ---
const slotsZona1 = (() => {
  const slots = [];
  const startTop = 12.2;
  const startLeft = 70.8;
  const endTop = 26.4;
  const endLeft = 86.6;
  const total = 10;
  for (let i = 0; i < total; i++) {
    slots.push({
      top: `${startTop + (i / (total - 1)) * (endTop - startTop)}%`,
      left: `${startLeft + (i / (total - 1)) * (endLeft - startLeft)}%`,
      angle: -55
    });
  }
  return slots;
})();

const slotsZona2 = (() => {
  const slots = [];
  const totalCol = 14;
  const colA = { sTop: 11.7, sLeft: 68.3, eTop: 41.0, eLeft: 57.8 };
  const colB = { sTop: 13.3, sLeft: 70.3, eTop: 42.6, eLeft: 59.7 };
  [colA, colB].forEach((c) => {
    for (let i = 0; i < totalCol; i++) {
      slots.push({
        top: `${c.sTop + (i / (totalCol - 1)) * (c.eTop - c.sTop)}%`,
        left: `${c.sLeft + (i / (totalCol - 1)) * (c.eLeft - c.sLeft)}%`,
        angle: 28
      });
    }
  });
  return slots;
})();

const slotsZona3 = (() => {
  const slots = [];
  const totalCol = 12;
  const colA = { sTop: 19.3, sLeft: 71.4, eTop: 42.6, eLeft: 62.7 };
  const colB = { sTop: 21.3, sLeft: 73.8, eTop: 44.6, eLeft: 65.0 };
  [colA, colB].forEach((c) => {
    for (let i = 0; i < totalCol; i++) {
      slots.push({
        top: `${c.sTop + (i / (totalCol - 1)) * (c.eTop - c.sTop)}%`,
        left: `${c.sLeft + (i / (totalCol - 1)) * (c.eLeft - c.sLeft)}%`,
        angle: 29
      });
    }
  });
  return slots;
})();

const slotsZona4 = (() => {
  const slots = [];
  const totalCol = 13;
  const colA = { sTop: 21.7, sLeft: 76.8, eTop: 47.5, eLeft: 68.5 };
  const colB = { sTop: 23.8, sLeft: 79.8, eTop: 49.7, eLeft: 71.5 };
  [colA, colB].forEach((c) => {
    for (let i = 0; i < totalCol; i++) {
      slots.push({
        top: `${c.sTop + (i / (totalCol - 1)) * (c.eTop - c.sTop)}%`,
        left: `${c.sLeft + (i / (totalCol - 1)) * (c.eLeft - c.sLeft)}%`,
        angle: 26
      });
    }
  });
  return slots;
})();

const getZoneForUnit = (eco) => {
  if (eco === '401') return 2;
  if (eco === '404' || eco === '405') return 3;
  const lastDigit = parseInt(eco.slice(-1)) || 0;
  if (lastDigit === 1 || lastDigit === 2) return 2;
  if (lastDigit === 3 || lastDigit === 4 || lastDigit === 5) return 3;
  if (lastDigit === 6 || lastDigit === 7 || lastDigit === 8) return 4;
  return 1;
};


const PatioDashboard = () => {
  const fleets = [
    { id: 'urbanus', label: 'URBANUSS' },
    { id: 'vagoneta', label: 'VAGONETA' },
    { id: 'zafiro', label: 'ZAFIRO' },
    { id: 'orion', label: 'ORION' }
  ];
  const [selectedFleet, setSelectedFleet] = useState('urbanus');

  const [apiUnits, setApiUnits] = useState([]);
  const [displayUnits, setDisplayUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitDetailsCache, setUnitDetailsCache] = useState({});
  const [hoveredUnitEco, setHoveredUnitEco] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const planoRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && planoRef.current) {
      planoRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const fetchUnits = async (fleetId, silent = false) => {
    if (!silent) setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/api/unidades/listar/${fleetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setApiUnits(data);
          setIsOffline(false);
        } else {
          setApiUnits(mockUnitsData[fleetId]);
          setIsOffline(true);
        }
      } else {
        throw new Error('API server error');
      }
    } catch (error) {
      console.warn('API error, loading mock fleet:', error);
      setApiUnits(mockUnitsData[fleetId]);
      setIsOffline(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(selectedFleet);
  }, [selectedFleet]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnits(selectedFleet, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedFleet]);

  useEffect(() => {
    if (!isOffline) return;
    const interval = setInterval(() => {
      setApiUnits((prev) => {
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
  }, [isOffline]);

  // Lógica de transiciones (sin cambios)
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
            nextDisplay.push({
              ...incoming,
              transitionState: 'entering',
              opacity: 0,
              posOverride: EXIT_GATE
            });
          }
        } else {
          const prevInBase = prev.estatus === 'reserva' || prev.estatus === 'mantenimiento';

          if (prevInBase && !inBase) {
            nextDisplay.push({
              ...prev,
              estatus: 'operacion',
              transitionState: 'exiting',
              opacity: 0,
              posOverride: EXIT_GATE
            });
          } else if (!prevInBase && inBase) {
            nextDisplay.push({
              ...incoming,
              transitionState: 'entering',
              opacity: 0,
              posOverride: EXIT_GATE
            });
          } else if (inBase) {
            nextDisplay.push({
              ...incoming,
              transitionState: prev.transitionState === 'entering' ? 'entering' : 'idle',
              opacity: prev.transitionState === 'entering' ? 0 : 1,
              posOverride: prev.transitionState === 'entering' ? EXIT_GATE : null
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

  useEffect(() => {
    const entering = displayUnits.filter((u) => u.transitionState === 'entering');
    if (entering.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) =>
          prev.map((u) =>
            u.transitionState === 'entering'
              ? { ...u, transitionState: 'idle', opacity: 1, posOverride: null }
              : u
          )
        );
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  useEffect(() => {
    const exiting = displayUnits.filter((u) => u.transitionState === 'exiting');
    if (exiting.length > 0) {
      const timer = setTimeout(() => {
        setDisplayUnits((prev) => prev.filter((u) => u.transitionState !== 'exiting'));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [displayUnits]);

  const handleMouseEnterUnit = async (eco, status) => {
    setHoveredUnitEco(eco);
    if (unitDetailsCache[eco]) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/api/unidades/detalle/${selectedFleet}/${eco}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnitDetailsCache((prev) => ({ ...prev, [eco]: data }));
      } else {
        throw new Error('API Details Error');
      }
    } catch (error) {
      setUnitDetailsCache((prev) => ({
        ...prev,
        [eco]: getMockDetails(eco, status)
      }));
    }
  };

  const handleMouseLeaveUnit = () => {
    setHoveredUnitEco(null);
  };

  // Agrupación en zonas
  const parkedUnits = displayUnits.filter(
    (u) => (u.estatus === 'reserva' || u.estatus === 'mantenimiento') && u.transitionState !== 'exiting'
  );

  const unitsZona1 = [];
  const unitsZona2 = [];
  const unitsZona3 = [];
  const unitsZona4 = [];

  parkedUnits.forEach((u) => {
    const zone = getZoneForUnit(u.numero_eco);
    if (zone === 1) unitsZona1.push(u);
    else if (zone === 2) unitsZona2.push(u);
    else if (zone === 3) unitsZona3.push(u);
    else if (zone === 4) unitsZona4.push(u);
  });

  unitsZona1.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
  unitsZona2.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
  unitsZona3.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));
  unitsZona4.sort((a, b) => a.numero_eco.localeCompare(b.numero_eco));

  const unitCoordinates = new Map();
  unitsZona1.forEach((u, i) => unitCoordinates.set(u.numero_eco, slotsZona1[i % slotsZona1.length]));
  unitsZona2.forEach((u, i) => unitCoordinates.set(u.numero_eco, slotsZona2[i % slotsZona2.length]));
  unitsZona3.forEach((u, i) => unitCoordinates.set(u.numero_eco, slotsZona3[i % slotsZona3.length]));
  unitsZona4.forEach((u, i) => unitCoordinates.set(u.numero_eco, slotsZona4[i % slotsZona4.length]));

  const totalFleetCount = apiUnits.length;
  const activeCount = apiUnits.filter((u) => u.estatus === 'operacion').length;
  const maintenanceCount = apiUnits.filter((u) => u.estatus === 'mantenimiento').length;
  const reserveCount = apiUnits.filter((u) => u.estatus === 'reserva').length;

  return (
    <div className="patio-dashboard light-theme-base">
      <Header />

      <main className="patio-main-container">
        {/* Encabezado y estadísticas */}
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

        {/* Contenedor del plano (ocupa el resto del espacio) */}
        <div className="patio-viewport-centered">
          <div className="plano-map-wrapper shadow-md" ref={planoRef}>
            {loading && (
              <div className="map-loading-overlay">
                <span className="light-spinner"></span>
                <p>Cargando información del patio...</p>
              </div>
            )}

            {/* Botones flotantes: selección de flota (izquierda) */}
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

            {/* Badge de estado + botón refrescar (derecha) */}
            <div className="floating-status-badge">
              {isOffline ? (
                <span className="offline-badge pulse-orange-dot">Simulación (Offline)</span>
              ) : (
                <span className="online-badge pulse-green-dot"></span>
              )}
              <button className="sync-btn-icon" onClick={() => fetchUnits(selectedFleet)} disabled={loading}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>

            {/* Botón de pantalla completa (abajo derecha) */}
            <button className="fullscreen-btn" onClick={toggleFullscreen} aria-label="Pantalla completa">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              {/* Render de pines de unidades */}
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
                      opacity: u.opacity ?? 1
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