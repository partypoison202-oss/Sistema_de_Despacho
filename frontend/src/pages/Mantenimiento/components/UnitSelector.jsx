// src/pages/Inspeccion/components/UnitSelector.jsx
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

  const displayValue = titulo;

  return (
    <div className="dropdown-container" style={{ position: 'relative', overflow: 'visible' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
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

        {/* Burbuja siempre visible (con 0 si no hay unidades) */}
        {!cargandoUnidades && (
          <span
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#6b1d33',
              color: 'var(--tw-color-white)',
              borderRadius: '50%',
              padding: unidades.length > 9 ? '2px 5px' : '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              minWidth: '18px',
              textAlign: 'center',
              lineHeight: '1.3',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              border: '2px solid #ffffff',
            }}
          >
            {unidades.length}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-menu__scroll">
            {cargandoUnidades ? (
              <div className="p-4 text-center" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '20px', height: '20px', borderWidth: '3px' }}></span>
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