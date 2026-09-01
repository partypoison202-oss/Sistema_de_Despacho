import React, { useState, useMemo, useEffect, useRef } from 'react';
import './PatioNorteModal.css';

export default function PatioNorteModal({ previewData, onClose, onSelectUnidad }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Personas que van a Patio Norte
  const personasPatioNorte = useMemo(() => {
    const personas = [];
    previewData.forEach((fila) => {
      const vaAPatioNorte = fila.PATIO_NORTE === true || fila.PATIO_NORTE === 'true' || fila.PATIO_NORTE === 1;
      if (vaAPatioNorte) {
        if (fila.NOMBRE_CONDUCTOR && fila.NOMBRE_CONDUCTOR.trim() !== '') {
          personas.push({
            rol: 'Conductor',
            nombre: fila.NOMBRE_CONDUCTOR,
            unidad: fila.ECONOMICO
          });
        }
        if (fila.NOMBRE_MANIOBRISTA && fila.NOMBRE_MANIOBRISTA.trim() !== '') {
          personas.push({
            rol: 'Maniobrista',
            nombre: fila.NOMBRE_MANIOBRISTA,
            unidad: fila.ECONOMICO
          });
        }
      }
    });
    return personas;
  }, [previewData]);

  // Unidades disponibles para transporte (sin MANTENIMIENTO)
  const unidadesDisponibles = useMemo(() => {
    return previewData.filter(f => {
      const estatus = (f.ESTATUS || '').toLowerCase();
      return estatus !== 'mantenimiento' && f.ECONOMICO;
    });
  }, [previewData]);

  // Unidad actualmente seleccionada como transporte
  const unidadTransporteActual = useMemo(() => {
    return previewData.find(f => f.TRANSPORTE_PATIO_NORTE === true || f.TRANSPORTE_PATIO_NORTE === 'true' || f.TRANSPORTE_PATIO_NORTE === 1);
  }, [previewData]);

  // Filtrado por búsqueda en el dropdown
  const unidadesFiltradas = useMemo(() => {
    if (!busqueda) return unidadesDisponibles;
    const lowerBusqueda = busqueda.toLowerCase();
    return unidadesDisponibles.filter(u => 
      (u.ECONOMICO && u.ECONOMICO.toLowerCase().includes(lowerBusqueda)) ||
      (u.NOMBRE_CONDUCTOR && u.NOMBRE_CONDUCTOR.toLowerCase().includes(lowerBusqueda))
    );
  }, [busqueda, unidadesDisponibles]);

  const handleSeleccionar = (economico) => {
    if (onSelectUnidad) {
      onSelectUnidad(economico);
    }
    setIsDropdownOpen(false);
  };

  return (
    <div 
      className="patio-custom-modal-overlay" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="patio-custom-modal-content">
        <h2 className="patio-custom-modal-title">Asignar Transporte a Patio Norte</h2>

        {/* Sección de Personas */}
        <div style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '5px', color: '#374151' }}>
            Personal a trasladar ({personasPatioNorte.length})
          </label>
        </div>
        <div className="patio-person-list-container">
          {personasPatioNorte.length > 0 ? (
            personasPatioNorte.map((p, idx) => {
              const iniciales = p.nombre.substring(0, 2).toUpperCase();
              return (
                <div key={idx} className="patio-person-card">
                  <div className="patio-person-avatar">
                    {iniciales}
                  </div>
                  <div className="patio-person-info">
                    <div className="patio-person-name">{p.nombre}</div>
                    <div className="patio-person-details">
                      <span className="patio-person-role">{p.rol}</span>
                      <span className="patio-person-eco">• ECO {p.unidad}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '10px' }}>
              No hay personal marcado para Patio Norte.
            </div>
          )}
        </div>

        {/* Sección de Selección de Unidad */}
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '5px', color: '#374151' }}>
            Unidad para Transporte
          </label>
          <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <button
              type="button"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', 
                background: '#ffffff', height: '2.5rem', fontSize: '0.9rem', width: '100%', 
                fontWeight: '600', borderRadius: '0.5rem',
                border: isDropdownOpen ? '1.5px solid #6b1d33' : '1.5px solid #d1d5db',
                color: isDropdownOpen ? '#6b1d33' : '#111827'
              }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>
                {unidadTransporteActual 
                  ? `ECO ${unidadTransporteActual.ECONOMICO} - ${unidadTransporteActual.NOMBRE_CONDUCTOR || 'Sin conductor'}` 
                  : 'Seleccione una unidad...'}
              </span>
              <svg
                style={{
                  transition: 'transform 0.2s', width: '0.75rem', height: '0.75rem',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                }}
                fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div className="patio-dropdown-menu">
                <div className="patio-dropdown-search-wrapper">
                  <input
                    type="text"
                    placeholder="Buscar ECO o conductor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="patio-dropdown-search"
                    autoFocus
                  />
                </div>
                <div>
                  <button
                    type="button"
                    className="patio-dropdown-item"
                    style={{ fontStyle: 'italic', color: '#64748b' }}
                    onClick={() => handleSeleccionar('')}
                  >
                    -- Quitar transporte --
                  </button>
                  {unidadesFiltradas.length > 0 ? (
                    unidadesFiltradas.map((u) => (
                      <button
                        key={u.ECONOMICO}
                        type="button"
                        className="patio-dropdown-item"
                        onClick={() => handleSeleccionar(u.ECONOMICO)}
                      >
                        <strong>ECO {u.ECONOMICO}</strong> - {u.NOMBRE_CONDUCTOR || 'Sin conductor'}
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      No se encontraron unidades.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="patio-custom-modal-actions">
          <button className="patio-custom-modal-btn-cancel" onClick={onClose}>Cerrar</button>
          <button className="patio-custom-modal-btn-save" onClick={onClose}>Aceptar</button>
        </div>
      </div>
    </div>
  );
}
