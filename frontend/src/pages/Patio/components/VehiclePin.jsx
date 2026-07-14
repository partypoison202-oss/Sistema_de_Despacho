import React from 'react';

const VehiclePin = ({ unit, coords, angle, isHovered, details, onMouseEnter, onMouseLeave }) => {
  if (!coords) return null;

  const opacity = unit.opacity ?? 1;
  const transitionState = unit.transitionState || 'idle';

  return (
    <div
      className={`unit-badge status-${unit.estatus} state-${transitionState} ${isHovered ? 'hover-active' : ''}`}
      style={{
        top: coords.top,
        left: coords.left,
        opacity: opacity,
        transform: `translate(-50%, -50%) rotate(${angle || 0}deg)`,
        transition: 'top 0.8s cubic-bezier(0.25, 0.8, 0.25, 1), left 0.8s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.8s ease, transform 0.5s ease',
      }}
      onMouseEnter={() => onMouseEnter(unit.numero_eco, unit.estatus)}
      onMouseLeave={onMouseLeave}
    >
      <div className="vehicle-shape" />
      <span className="eco-label-bubble shadow-sm">{unit.numero_eco}</span>

      {isHovered && (
        <div className="unit-hover-tooltip shadow-lg">
          {/* ... contenido del tooltip ... */}
        </div>
      )}
    </div>
  );
};

export default VehiclePin;