import React, { useRef } from 'react';
import PatioFleetTabs from './PatioFleetTabs';
import PatioStatusBadge from './PatioStatusBadge';
import UnitPin from './UnitPin';
import { fleets } from '../config/patioConfig';

const PatioMap = ({
  displayUnits,
  loading,
  selectedFleet,
  onSelectFleet,
  onSync,
  unitDetailsCache,
  hoveredUnitEco,
  handleMouseEnter,
  handleMouseLeave,
  getUnitPosition,
}) => {
  const planoRef = useRef(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && planoRef.current) {
      planoRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="plano-map-wrapper shadow-md" ref={planoRef}>
      {loading && (
        <div className="map-loading-overlay">
          <span className="light-spinner" />
          <p>Cargando información del patio...</p>
        </div>
      )}

      <PatioFleetTabs fleets={fleets} selected={selectedFleet} onSelect={onSelectFleet} />
      <PatioStatusBadge isOffline={false} loading={loading} onSync={onSync} />

      <button className="fullscreen-btn" onClick={toggleFullscreen} aria-label="Pantalla completa">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      <div className="floorplan-canvas">
        <img src="/images/BOCETO PATIO.png" alt="Plano del Patio" className="floorplan-image" />

        {displayUnits.map((u) => {
          const pos = getUnitPosition(u);
          if (!pos) return null;

          // El ángulo ahora viene calculado desde el hook: dirección de la ruta
          // durante entering/exiting, o ángulo fijo de cajón mientras está idle.
          const angle = pos.angle || 0;

          return (
            <UnitPin
              key={u.numero_eco}
              unit={u}
              coords={pos}
              angle={angle}
              details={unitDetailsCache[u.numero_eco]}
              isHovered={hoveredUnitEco === u.numero_eco}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PatioMap;
