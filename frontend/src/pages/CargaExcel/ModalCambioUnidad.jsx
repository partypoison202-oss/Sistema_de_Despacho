// src/pages/CargaExcel/ModalCambioUnidad.jsx
import React, { useState, useMemo } from 'react';
import './ModalCambioUnidad.css';

export default function ModalCambioUnidad({
  isOpen,
  onClose,
  unidadSaliente,
  nuevoEstatus = 'mantenimiento',
  unidadesDisponibles = [],
  onConfirmarCambio,
  onContinuarSinCambio,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [selectedEco, setSelectedEco] = useState('');

  // Unidades en reserva disponibles filtradas por búsqueda
  const unidadesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const list = (unidadesDisponibles || []).filter((u) => {
      const eco = String(u.ECONOMICO || '').trim();
      if (!eco) return false;
      if (unidadSaliente && String(unidadSaliente.ECONOMICO).trim() === eco) return false;
      return true;
    });

    if (!q) {
      return list.sort((a, b) =>
        String(a.ECONOMICO).localeCompare(String(b.ECONOMICO), undefined, { numeric: true })
      );
    }

    return list
      .filter((u) => {
        const eco = String(u.ECONOMICO || '').toLowerCase();
        const tipo = String(u.TIPO_DE_UNIDAD || '').toLowerCase();
        return eco.includes(q) || tipo.includes(q);
      })
      .sort((a, b) =>
        String(a.ECONOMICO).localeCompare(String(b.ECONOMICO), undefined, { numeric: true })
      );
  }, [unidadesDisponibles, busqueda, unidadSaliente]);

  if (!isOpen || !unidadSaliente) return null;

  const handleSeleccionar = (eco) => {
    setSelectedEco(selectedEco === eco ? '' : eco);
  };

  const handleConfirmar = () => {
    if (!selectedEco) return;
    const reserveUnit = unidadesDisponibles.find(
      (u) => String(u.ECONOMICO).trim() === String(selectedEco).trim()
    );
    if (reserveUnit) {
      onConfirmarCambio(reserveUnit, nuevoEstatus);
    }
  };

  const handleSinCambio = () => {
    onContinuarSinCambio(nuevoEstatus);
  };

  const targetLabel = nuevoEstatus === 'mantenimiento' ? 'Mantenimiento' : 'Reserva';
  const targetClass = nuevoEstatus === 'mantenimiento' ? 'mantenimiento' : 'reserva';

  return (
    <div className="modal-cambio-overlay" onClick={onClose}>
      <div className="modal-cambio-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-cambio-header">
          <div className="modal-cambio-title-box">
            <div className="modal-cambio-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5" />
                <path d="M4 20L21 3" />
                <path d="M21 16v5h-5" />
                <path d="M15 15l6 6" />
                <path d="M4 4l5 5" />
              </svg>
            </div>
            <div>
              <h2 className="modal-cambio-title">Sustitución de Unidad Operativa</h2>
              <p className="modal-cambio-subtitle">
                ¿Deseas sustituir la unidad por otra disponible en reserva?
              </p>
            </div>
          </div>
          <button type="button" className="modal-cambio-close" onClick={onClose} title="Cerrar ventana">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-cambio-body">
          {/* Ficha informativa de la unidad saliente */}
          <div className="unidad-saliente-card">
            <div className="unidad-saliente-top">
              <div className="unidad-badge-eco">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Eco #{unidadSaliente.ECONOMICO}</span>
                {unidadSaliente.TIPO_DE_UNIDAD && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>
                    ({unidadSaliente.TIPO_DE_UNIDAD})
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '0.4rem' }}>
                  Pasa a:
                </span>
                <span className={`status-badge-target ${targetClass}`}>
                  {targetLabel}
                </span>
              </div>
            </div>

            <div className="unidad-saliente-grid">
              <div className="saliente-field">
                <span className="saliente-label">Ruta</span>
                <span className="saliente-value">{unidadSaliente.RUTA || 'Sin ruta'}</span>
              </div>
              <div className="saliente-field">
                <span className="saliente-label">Corrida</span>
                <span className="saliente-value">{unidadSaliente.CORRIDAS ?? '-'}</span>
              </div>
              <div className="saliente-field" style={{ gridColumn: 'span 2' }}>
                <span className="saliente-label">Conductor Titular</span>
                <span className="saliente-value">
                  {unidadSaliente.NOMBRE_CONDUCTOR || 'Sin conductor'}
                  {unidadSaliente.TARJETON ? ` (${unidadSaliente.TARJETON})` : ''}
                </span>
              </div>
              {unidadSaliente.RELEVO_CONDUCTOR && (
                <div className="saliente-field" style={{ gridColumn: 'span 2' }}>
                  <span className="saliente-label">Relevo</span>
                  <span className="saliente-value">
                    {unidadSaliente.RELEVO_CONDUCTOR}
                    {unidadSaliente.RELEVO_TARJETON ? ` (${unidadSaliente.RELEVO_TARJETON})` : ''}
                  </span>
                </div>
              )}
              <div className="saliente-field">
                <span className="saliente-label">Acople / Salida</span>
                <span className="saliente-value">
                  {unidadSaliente.HORA_DE_ACOPLE || unidadSaliente.ACOPLE || '00:00'} / {unidadSaliente.HORA_SALIDA || '00:00'}
                </span>
              </div>
            </div>
          </div>

          {/* Selector y buscador de unidades en reserva */}
          <div className="buscador-reserva-wrapper">
            <div className="buscador-reserva-label">
              <span>Selecciona una unidad en reserva para operar este servicio:</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                {unidadesFiltradas.length} disponible{unidadesFiltradas.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="buscador-reserva-input-container">
              <svg className="buscador-reserva-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="buscador-reserva-input"
                placeholder="Buscar por número económico o tipo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
              />
              {busqueda && (
                <button
                  type="button"
                  className="buscador-reserva-clear"
                  onClick={() => setBusqueda('')}
                  title="Limpiar búsqueda"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="lista-unidades-reserva">
              {unidadesFiltradas.length === 0 ? (
                <div className="empty-reserva-message">
                  {busqueda
                    ? `No se encontraron unidades en reserva con el criterio "${busqueda}".`
                    : 'No hay unidades en reserva disponibles actualmente.'}
                </div>
              ) : (
                unidadesFiltradas.map((u) => {
                  const isSelected = String(selectedEco).trim() === String(u.ECONOMICO).trim();
                  return (
                    <div
                      key={u.ECONOMICO}
                      className={`item-unidad-reserva ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSeleccionar(u.ECONOMICO)}
                    >
                      <div className="item-reserva-left">
                        <div className="item-reserva-radio">
                          {isSelected && <div className="item-reserva-radio-inner" />}
                        </div>
                        <span className="item-reserva-eco">Eco #{u.ECONOMICO}</span>
                        {u.TIPO_DE_UNIDAD && (
                          <span className="item-reserva-tipo">{u.TIPO_DE_UNIDAD}</span>
                        )}
                      </div>
                      <div className="item-reserva-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Reserva</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-cambio-footer">
          <div>
            <button
              type="button"
              className="footer-btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="footer-btn btn-solo-estatus"
              onClick={handleSinCambio}
              title={`No sustituir por otra unidad y solo asignar a ${targetLabel}`}
            >
              Solo mandar a {targetLabel}
            </button>
            <button
              type="button"
              className="footer-btn btn-confirmar-cambio"
              disabled={!selectedEco}
              onClick={handleConfirmar}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>
                {selectedEco
                  ? `Sustituir por Eco #${selectedEco}`
                  : 'Selecciona una unidad'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
