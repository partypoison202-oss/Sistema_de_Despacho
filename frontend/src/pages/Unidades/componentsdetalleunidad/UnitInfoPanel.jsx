// src/pages/Unidades/components/detalleunidad/UnitInfoPanel.jsx
import React, { useState } from 'react';

const CustomDropdown = ({ options, value, onChange, placeholder, disabled, width = '100%' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        width: width,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className="input-group__field"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        style={{
          padding: '0.25rem 0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          margin: 0,
          height: '32px',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          backgroundColor: '#fff',
        }}
      >
        <span style={{ color: value ? '#000' : '#6b7280', fontSize: '0.875rem' }}>
          {value || placeholder}
        </span>
        <svg
          className="arrow-icon"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            width: '0.75rem',
            height: '0.75rem',
            color: '#6b1d33',
          }}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            width: '100%',
            left: 0,
            top: '100%',
            marginTop: '0.25rem',
            zIndex: 60,
          }}
        >
          <div className="dropdown-menu__scroll" style={{ maxHeight: '10rem' }}>
            <button
              type="button"
              className="dropdown-menu__item"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {placeholder}
            </button>
            {options.map((opt, i) => (
              <button
                type="button"
                key={i}
                className="dropdown-menu__item"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function UnitInfoPanel({
  selectedOption,
  configActual,
  datosOperativos,
  cargandoDatos,
  tarjetonBusqueda,
  setTarjetonBusqueda,
  mensajeBusqueda,
  buscarUnidadPorInput,
  fallaTexto,
  setFallaTexto,
  corridasSeleccionadas,
  setCorridasSeleccionadas,
  cicloSeleccionado,
  setCicloSeleccionado,
  motivoTexto,
  setMotivoTexto,
  handleSaveAdicional,
  handleCancelAdicional,
}) {
  return (
    <div className="data-grid">
      <div className="data-item">
        <h3 className="data-item__label">Tipo de Transporte</h3>
        <p className="data-item__value">{configActual.title}</p>
      </div>
      <div className="data-item">
        <h3 className="data-item__label">Número ECO</h3>
        <p className="data-item__value">{selectedOption}</p>
      </div>
      <div className="data-item">
        <h3 className="data-item__label">Conductor Asignado</h3>
        <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center' }}>
          {cargandoDatos ? (
            <>
              <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span>
              Buscando...
            </>
          ) : (
            datosOperativos.conductor
          )}
        </p>
      </div>
      <div className="data-item">
        <h3 className="data-item__label">Ruta Asignada</h3>
        <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center' }}>
          {cargandoDatos ? (
            <>
              <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span>
              Buscando...
            </>
          ) : (
            datosOperativos.ruta
          )}
        </p>
      </div>

      <div className="data-item data-item--compact">
        <h3 className="data-item__label">Número de Tarjetón</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
          <input
            type="text"
            className="input-group__field"
            value={tarjetonBusqueda}
            onChange={(e) => {
              setTarjetonBusqueda(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscarUnidadPorInput();
              }
            }}
            placeholder="Escribe el número de tarjetón"
            style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px', width: '55%' }}
          />
          <button
            type="button"
            onClick={buscarUnidadPorInput}
            style={{
              backgroundColor: '#6b1d33',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Buscar
          </button>
        </div>
        <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: mensajeBusqueda ? '#6b1d33' : '#6b7280', opacity: cargandoDatos ? 0.8 : 1 }}>
          {mensajeBusqueda ? mensajeBusqueda : cargandoDatos ? 'Buscando unidad...' : datosOperativos.tarjeton ? `Tarjetón actual: ${datosOperativos.tarjeton}` : 'No asignado'}
        </p>
      </div>

      {corridasSeleccionadas === '' && (
        <div className="data-item">
          <h3 className="data-item__label">Fallas (tipo)</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="text"
              className="input-group__field"
              maxLength="50"
              placeholder="Escribe el tipo de falla..."
              value={fallaTexto}
              onChange={(e) => setFallaTexto(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px' }}
            />
            {fallaTexto !== '' && (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={handleSaveAdicional} title="Guardar" style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button onClick={handleCancelAdicional} title="Cancelar" style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {fallaTexto === '' && (
        <div className="data-item data-item--compact" style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h3 className="data-item__label">Corridas</h3>
            <div style={{ marginTop: '0.25rem' }}>
              <CustomDropdown
                options={[...Array(14)].map((_, i) => i + 1)}
                value={corridasSeleccionadas}
                onChange={setCorridasSeleccionadas}
                placeholder="Seleccione..."
              />
            </div>
          </div>
          {corridasSeleccionadas !== '' && (
            <div style={{ flex: 1 }}>
              <h3 className="data-item__label">Ciclo</h3>
              <div style={{ marginTop: '0.25rem' }}>
                <CustomDropdown
                  options={Array.from({ length: 10 }, (_, i) => {
                    const val = 0.5 + i * 0.5;
                    const whole = Math.floor(val);
                    if (val === whole) return whole.toString();
                    if (whole === 0) return '1/2';
                    return `${whole} 1/2`;
                  })}
                  value={cicloSeleccionado}
                  onChange={setCicloSeleccionado}
                  placeholder="N/A"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {corridasSeleccionadas !== '' && (
        <div className="data-item">
          <h3 className="data-item__label">Motivo *</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="text"
              className="input-group__field"
              maxLength="25"
              placeholder="Obligatorio..."
              value={motivoTexto}
              onChange={(e) => setMotivoTexto(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px' }}
            />
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={handleSaveAdicional}
                disabled={!motivoTexto.trim()}
                title="Guardar"
                style={{
                  background: 'transparent',
                  color: !motivoTexto.trim() ? '#9ca3af' : '#16a34a',
                  border: 'none',
                  cursor: !motivoTexto.trim() ? 'not-allowed' : 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button onClick={handleCancelAdicional} title="Cancelar" style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}