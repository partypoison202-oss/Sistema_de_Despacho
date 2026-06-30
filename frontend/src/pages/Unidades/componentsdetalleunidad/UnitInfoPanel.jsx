// src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx
import React from 'react';

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
  handleSaveFalla,
  handleCancelFalla,
}) {
  return (
    <div className="data-grid">
      {/* Campos fijos de la unidad */}
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

      {/* NUEVOS CAMPOS: Corrida y Hora de Salida (desde el Excel) */}
      <div className="data-item">
        <h3 className="data-item__label">Corrida</h3>
        <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1 }}>
          {cargandoDatos ? 'Cargando...' : (datosOperativos.corrida || 'No asignada')}
        </p>
      </div>
      <div className="data-item">
        <h3 className="data-item__label">Hora de Salida</h3>
        <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1 }}>
          {cargandoDatos ? 'Cargando...' : (datosOperativos.horaSalida || 'No asignada')}
        </p>
      </div>

      {/* Buscador por tarjetón */}
      <div className="data-item data-item--compact">
        <h3 className="data-item__label">Número de Tarjetón</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
          <input
            type="text"
            className="input-group__field"
            value={tarjetonBusqueda}
            onChange={(e) => setTarjetonBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                buscarUnidadPorInput();
              }
            }}
            placeholder="Escribe el número de tarjetón"
            style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0, height: '32px' }}
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

      {/* Campo de Fallas (tipo) - se mantiene independiente */}
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
              <button onClick={handleSaveFalla} title="Guardar" style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button onClick={handleCancelFalla} title="Cancelar" style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}