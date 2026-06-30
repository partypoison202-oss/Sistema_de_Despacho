// src/pages/Encierro/components/detalleunidadenciero/UnitSelector.jsx
import React from 'react';

export default function UnitSelector({
  isOpen,
  setIsOpen,
  selectedOption,
  selectedEstado,
  estado,
  titulo,
  unidades,
  cargandoUnidades,
  configActual,
  onSelectUnit,
}) {
  const toggleDropdown = () => setIsOpen(!isOpen);

  const displayValue = (selectedEstado === estado && selectedOption) ? selectedOption : titulo;

  return (
    <div className="dropdown-container">
      <button onClick={toggleDropdown} className="dropdown-trigger">
        <div className="dropdown-trigger__icon-container">
          <img src={configActual.image} alt={configActual.title} className="dropdown-trigger__icon" />
        </div>
        <span className="dropdown-trigger__value">{displayValue}</span>
        <span className="dropdown-trigger__label">{configActual.title}</span>
        <div className={`dropdown-trigger__arrow ${isOpen ? 'dropdown-trigger__arrow--open' : ''}`}>
          <svg className="arrow-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-menu__scroll">
            {cargandoUnidades ? (
              <div className="p-4 text-center" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)' }}></span>
                Cargando unidades...
              </div>
            ) : unidades.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No hay unidades en {titulo}</div>
            ) : (
              unidades.map((unidad) => (
                <button
                  key={unidad.display}
                  onClick={() => onSelectUnit(unidad)}
                  className="dropdown-menu__item"
                >
                  {unidad.display}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}