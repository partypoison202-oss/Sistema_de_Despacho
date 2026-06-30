// src/pages/Encierro/components/detalleunidadenciero/UnitInfoPanel.jsx
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
  editandoConductor,
  setEditandoConductor,
  editandoRuta,
  setEditandoRuta,
  formEditar,
  setFormEditar,
  guardando,
  onGuardarEdicion,
  onCancelarEdicion,
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
        {editandoConductor ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="text"
              className="input-group__field"
              style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0 }}
              value={formEditar.conductor}
              onChange={(e) => setFormEditar({ ...formEditar, conductor: e.target.value })}
            />
            <button
              onClick={() => onGuardarEdicion('conductor')}
              disabled={guardando}
              title="Guardar"
              style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: guardando ? 'wait' : 'pointer', padding: 0, display: 'flex' }}
            >
              {guardando ? (
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: '#16a34a' }}></span>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
            </button>
            <button
              onClick={() => onCancelarEdicion('conductor')}
              disabled={guardando}
              title="Cancelar"
              style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center', margin: 0 }}>
              {cargandoDatos ? <><span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span> Buscando...</> : datosOperativos.conductor}
            </p>
            <button onClick={() => setEditandoConductor(true)} title="Editar Conductor" style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          </div>
        )}
      </div>
      <div className="data-item">
        <h3 className="data-item__label">Ruta Asignada</h3>
        {editandoRuta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <input
              type="text"
              className="input-group__field"
              style={{ padding: '0.25rem 0.5rem', flex: 1, margin: 0 }}
              value={formEditar.ruta}
              onChange={(e) => setFormEditar({ ...formEditar, ruta: e.target.value })}
            />
            <button
              onClick={() => onGuardarEdicion('ruta')}
              disabled={guardando}
              title="Guardar"
              style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: guardando ? 'wait' : 'pointer', padding: 0, display: 'flex' }}
            >
              {guardando ? (
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: '#16a34a' }}></span>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
            </button>
            <button
              onClick={() => onCancelarEdicion('ruta')}
              disabled={guardando}
              title="Cancelar"
              style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center', margin: 0 }}>
              {cargandoDatos ? <><span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span> Buscando...</> : datosOperativos.ruta}
            </p>
            <button onClick={() => setEditandoRuta(true)} title="Editar Ruta" style={{ background: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          </div>
        )}
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
        <p
          style={{
            marginTop: '0.35rem',
            fontSize: '0.8rem',
            color: mensajeBusqueda ? '#6b1d33' : '#6b7280',
            opacity: cargandoDatos ? 0.8 : 1,
          }}
        >
          {mensajeBusqueda ? mensajeBusqueda : cargandoDatos ? 'Buscando unidad...' : datosOperativos.tarjeton ? `Tarjetón actual: ${datosOperativos.tarjeton}` : 'No asignado'}
        </p>
      </div>
    </div>
  );
}