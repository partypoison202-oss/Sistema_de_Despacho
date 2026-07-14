// components/UnitPin.jsx
import React from 'react';

const UnitPin = ({ unit, coords, angle, details, isHovered, onMouseEnter, onMouseLeave }) => {
  if (!coords) return null;
  const { top, left } = coords;

  let scale = 1;
  let opacity = unit.opacity ?? 1;
  const isMoving = unit.transitionState === 'entering' || unit.transitionState === 'exiting';

  if (unit.transitionState === 'entering') {
    scale = 0.3;
    opacity = 0;
  } else if (unit.transitionState === 'exiting') {
    scale = 0.3;
    opacity = 0;
  }

  const rotation = angle || 0;
  const transformStyle = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`;

  const transitionStyle = isMoving
    ? `top 0.05s linear, left 0.05s linear, opacity 0.8s ease` // sin transform: la rotación ya viene suavizada del hook
    : `top 1.2s cubic-bezier(0.25, 0.8, 0.25, 1),
       left 1.2s cubic-bezier(0.25, 0.8, 0.25, 1),
       transform 1.2s cubic-bezier(0.25, 0.8, 0.25, 1),
       opacity 1.2s ease`;

  return (
    <div
      className={`unit-badge status-${unit.estatus} state-${unit.transitionState} ${isHovered ? 'hover-active' : ''}`}
      style={{
        top: top,
        left: left,
        transform: transformStyle,
        transformOrigin: 'center center',
        opacity: opacity,
        transition: transitionStyle,
        willChange: 'transform, top, left, opacity',
      }}
      onMouseEnter={() => onMouseEnter(unit.numero_eco, unit.estatus)}
      onMouseLeave={onMouseLeave}
    >
      <div className="vehicle-shape" />
      <span className="eco-label-bubble shadow-sm">{unit.numero_eco}</span>

      {isHovered && (
        <div className="unit-hover-tooltip shadow-lg">
          <div className="tooltip-header-row">
            <span className="tooltip-eco-title">Eco {unit.numero_eco}</span>
            <span className={`tooltip-status-pill badge-${unit.estatus}`}>
              {unit.estatus === 'reserva' ? 'En Base' :
               unit.estatus === 'mantenimiento' ? 'Mantenimiento' : 'En Operación'}
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

export default UnitPin;