// components/PatioStats.js
import React from 'react';

const PatioStats = ({ total, active, maintenance, reserve }) => (
  <section className="patio-info-banner">
    <div className="patio-title-block">
      <span className="patio-breadcrumb">Monitoreo de Patio</span>
      <h1 className="patio-heading">Monitoreo General de Unidades</h1>
      <p className="patio-subheading">Consulta en tiempo real de cajones de resguardo y mantenimiento.</p>
    </div>
    <div className="patio-stats-row">
      <div className="stat-box shadow-sm border-left-total">
        <span className="stat-label">Flota</span>
        <span className="stat-number">{total}</span>
      </div>
      <div className="stat-box shadow-sm border-left-operacion">
        <span className="stat-label">Operación</span>
        <span className="stat-number text-green">{active}</span>
      </div>
      <div className="stat-box shadow-sm border-left-mantenimiento">
        <span className="stat-label">Mantenimiento</span>
        <span className="stat-number text-orange">{maintenance}</span>
      </div>
      <div className="stat-box shadow-sm border-left-reserva">
        <span className="stat-label">Reserva</span>
        <span className="stat-number text-blue">{reserve}</span>
      </div>
    </div>
  </section>
);

export default PatioStats;