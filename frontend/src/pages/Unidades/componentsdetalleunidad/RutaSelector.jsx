// src/pages/Unidades/componentsdetalleunidad/RutaSelector.jsx
import React, { useRef, useEffect } from 'react';

export default function RutaSelector({
  isOpen,
  setIsOpen,
  selectedRuta,
  titulo,
  rutas,
  cargandoRutas,
  configActual,
  onSelectRuta,
}) {
  const toggleDropdown = () => setIsOpen(!isOpen);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isOpen) setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  const displayValue = selectedRuta || titulo;

  return (
    <div className="dropdown-container" ref={dropdownRef} style={{ position: 'relative', overflow: 'visible' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={toggleDropdown}
          className={`dropdown-trigger ${selectedRuta ? 'dropdown-trigger--active' : ''} ${isOpen ? 'dropdown-trigger--open' : ''}`}
        >
          <div className="dropdown-trigger__icon-container">
            <svg className="dropdown-trigger__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="dropdown-trigger__value">{displayValue}</span>
          <span className="dropdown-trigger__label">Rutas · {configActual.title}</span>
          <div className={`dropdown-trigger__arrow ${isOpen ? 'dropdown-trigger__arrow--open' : ''}`}>
            <svg className="arrow-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
            </svg>
          </div>
        </button>

        {!cargandoRutas && (
          <span
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#6b1d33',
              color: 'var(--tw-color-white)',
              borderRadius: '50%',
              padding: rutas.length > 9 ? '2px 5px' : '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              minWidth: '18px',
              textAlign: 'center',
              lineHeight: '1.3',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              border: '2px solid #ffffff',
            }}
          >
            {rutas.length}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-menu__scroll">
            {cargandoRutas ? (
              <div className="p-4 text-center" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="unidad-spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '20px', height: '20px', borderWidth: '3px' }}></span>
                Cargando rutas...
              </div>
            ) : rutas.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No hay rutas alimentadoras disponibles</div>
            ) : (
              rutas.map((ruta) => (
                <button
                  key={ruta}
                  onClick={() => {
                    onSelectRuta(ruta);
                    setIsOpen(false);
                  }}
                  className="dropdown-menu__item"
                  style={{ fontWeight: selectedRuta === ruta ? 'bold' : 'normal' }}
                >
                  {ruta}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}