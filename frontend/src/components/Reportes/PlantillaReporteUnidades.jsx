import React from 'react';
import './PlantillaReporteUnidades.css';

/* ── Iconos SVG inline ─────────────────────────────────────── */
const IconCalendario = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
    stroke="#5d1033" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
  </svg>
);

const IconChecklist = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="1.8" strokeLinecap="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="8"  x2="16" y2="8"  />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
    <circle cx="17" cy="17" r="3.5" fill="#5d1033" stroke="white" strokeWidth="1.4" />
    <path d="M15.5 17l1.1 1.1 1.9-1.9" stroke="white" strokeWidth="1.3" />
  </svg>
);

const IconBus = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="1.8" strokeLinecap="round">
    <rect x="2" y="5" width="20" height="13" rx="2" />
    <line x1="2"  y1="10" x2="22" y2="10" />
    <line x1="7"  y1="5"  x2="7"  y2="10" />
    <line x1="12" y1="5"  x2="12" y2="10" />
    <line x1="17" y1="5"  x2="17" y2="10" />
    <circle cx="6.5"  cy="19.5" r="1.5" />
    <circle cx="17.5" cy="19.5" r="1.5" />
    <line x1="2" y1="18" x2="22" y2="18" />
  </svg>
);

/* ── Logo STM (Actualizado con imagen) ─────────────────────── */
const LogoSTM = () => (
  <div className="rpu-logo-wrap">
    <img src="/images/sistema de tm.png" alt="Logo STM" className="rpu-logo-img" />
    <div className="rpu-logo-label">
      <span className="rpu-logo-small">Sistema de</span>
      <span className="rpu-logo-big">Transporte</span>
      <span className="rpu-logo-big">Metropolitano</span>
    </div>
  </div>
);

/* ── Imagen de vehículo ─────────────────────────────────────── */
const VehicleImage = ({ src, tipo }) => {
  if (src) {
    return (
      <img
        src={`/images/${src}`}
        alt={tipo}
        className="rpu-vehicle-img"
      />
    );
  }
  return (
    <div className="rpu-vehicle-placeholder">
      {tipo}
    </div>
  );
};

/* ── Fila de unidad (vertical) ─────────────────────────────── */
const UnidadRow = ({ tipo, programadas, en_servicio, imagen }) => (
  <div className="rpu-row">
    <div className="rpu-row-img">
      <VehicleImage src={imagen} tipo={tipo} />
    </div>
    <div className="rpu-row-stats">
      <div className="rpu-stat">
        <span className="rpu-stat-label">PROGRAMADAS</span>
        <span className="rpu-stat-num">{programadas}</span>
      </div>
      <div className="rpu-stat">
        <span className="rpu-stat-label">EN SERVICIO</span>
        <span className="rpu-stat-num">{en_servicio}</span>
      </div>
    </div>
  </div>
);

/* ── Componente principal ──────────────────────────────────── */
const PlantillaReporteUnidades = ({ data }) => {
  const { tipos, totales } = data;

  const fecha =
    data.fecha ||
    new Date()
      .toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      .toUpperCase();

  return (
    <div id="reporte-unidades" className="rpu-root">

      {/* HEADER */}
      <div className="rpu-header">
        <LogoSTM />
        <div className="rpu-header-title">
          <p>INICIO DE OPERACIÓN</p>
          <p>TRANSPORTE METROPOLITANO</p>
        </div>
      </div>

      {/* FECHA */}
      <div className="rpu-fecha-wrap">
        <div className="rpu-fecha-box">
          <IconCalendario />
          <span className="rpu-fecha-text">{fecha}</span>
        </div>
      </div>

      {/* CUERPO – Tabla de filas */}
      <div className="rpu-body">
        {tipos.map((item) => (
          <UnidadRow
            key={item.tipo}
            tipo={item.tipo}
            programadas={item.programadas}
            en_servicio={item.en_servicio}
            imagen={item.imagen}
          />
        ))}
      </div>

      {/* FOOTER TOTALES */}
      <div className="rpu-footer">
        <div className="rpu-total-block">
          <div className="rpu-icon-box">
            <IconChecklist />
          </div>
          <div>
            <div className="rpu-total-label">
              TOTAL DE UNIDADES<br />PROGRAMADAS
            </div>
            <div className="rpu-total-num">{totales.programadas}</div>
          </div>
        </div>

        <div className="rpu-divider" />

        <div className="rpu-total-block">
          <div className="rpu-icon-box">
            <IconBus />
          </div>
          <div>
            <div className="rpu-total-label">
              TOTAL DE UNIDADES<br />EN SERVICIO
            </div>
            <div className="rpu-total-num">{totales.en_servicio}</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PlantillaReporteUnidades;