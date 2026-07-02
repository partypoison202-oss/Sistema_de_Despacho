// src/pages/DetalleUnidades/DetalleUnidades.jsx
import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '../../../components/Header/Header';
import './DetalleUnidades.css';

// ---- Helpers para leer campos con distintos nombres posibles ----
// Ajusta/agrega el nombre real del campo de tu API si es distinto.
const getNumeroEconomico = (d) =>
  d.NUMERO_ECONOMICO ??
  d.NO_ECONOMICO ??
  d.NUM_ECONOMICO ??
  d.ECONOMICO ??
  d.UNIDAD ??
  d.NO_UNIDAD ??
  'S/N';

const getRuta = (d) =>
  d.RUTA ??
  d.NOMBRE_RUTA ??
  d.NO_RUTA ??
  d.RUTA_ASIGNADA ??
  'Sin ruta asignada';

const getConductor = (d) =>
  d.CONDUCTOR ??
  d.NOMBRE_CONDUCTOR ??
  d.CHOFER ??
  d.NOMBRE_CHOFER ??
  d.OPERADOR ??
  'Sin conductor asignado';

const STATUS_TABS = [
  { key: 'unidadesOperacion', label: 'Operación', color: 'operacion' },
  { key: 'unidadesReserva', label: 'Reserva', color: 'reserva' },
  { key: 'unidadesMantenimiento', label: 'Mantenimiento', color: 'mantenimiento' },
  { key: 'unidadesOtros', label: 'Otro estatus', color: 'otros' },
];

export default function DetalleUnidades() {
  const navigate = useNavigate();
  const { tipo } = useParams();
  const location = useLocation();
  const model = location.state?.model;

  const [activeTab, setActiveTab] = useState('todas');

  // Si se entra directo a la URL sin pasar por Centro de Control, no hay datos en el state
  if (!model) {
    return (
      <div className="detalle-page">
        <Header title="Detalle de Unidades" eyebrow="Panel administrativo" />
        <main className="detalle-main">
          <div className="detalle-empty-state">
            <p>No se encontró información para mostrar.</p>
            <p className="detalle-empty-state__hint">
              Vuelve al Centro de Control y selecciona una tarjeta de tipo de unidad.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const groups = STATUS_TABS.map((tab) => ({
    ...tab,
    units: model[tab.key] || [],
  })).filter((g) => g.units.length > 0 || g.key !== 'unidadesOtros');

  const allUnits =
    activeTab === 'todas'
      ? groups.flatMap((g) => g.units.map((u) => ({ ...u, __statusColor: g.color, __statusLabel: g.label })))
      : (groups.find((g) => g.key === activeTab)?.units || []).map((u) => ({
          ...u,
          __statusColor: groups.find((g) => g.key === activeTab)?.color,
          __statusLabel: groups.find((g) => g.key === activeTab)?.label,
        }));

  return (
    <div className="detalle-page">
      <Header title={`Detalle · ${model.label}`} eyebrow="Panel administrativo" />

      <main className="detalle-main">
        <div className="detalle-hero">
          <img src={model.image} alt={model.label} className="detalle-hero__image" />
          <div>
            <h1 className="detalle-hero__title">{model.label}</h1>
            <p className="detalle-hero__subtitle">{model.programadas} unidades programadas en total</p>
          </div>
        </div>

        {/* ---- KPIs por estatus ---- */}
        <section className="detalle-kpis">
          <div className="detalle-kpi detalle-kpi--operacion">
            <span className="detalle-kpi__value">{model.operacion}</span>
            <span className="detalle-kpi__label">Operación</span>
          </div>
          <div className="detalle-kpi detalle-kpi--reserva">
            <span className="detalle-kpi__value">{model.reserva}</span>
            <span className="detalle-kpi__label">Reserva</span>
          </div>
          <div className="detalle-kpi detalle-kpi--mantenimiento">
            <span className="detalle-kpi__value">{model.mantenimiento}</span>
            <span className="detalle-kpi__label">Mantenimiento</span>
          </div>
        </section>

        {/* ---- Tabs de filtro por estatus ---- */}
        <div className="detalle-tabs">
          <button
            className={`detalle-tab ${activeTab === 'todas' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('todas')}
          >
            Todas ({model.programadas})
          </button>
          {groups.map((g) => (
            <button
              key={g.key}
              className={`detalle-tab detalle-tab--${g.color} ${activeTab === g.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(g.key)}
            >
              {g.label} ({g.units.length})
            </button>
          ))}
        </div>

        {/* ---- Tabla / listado de unidades ---- */}
        {allUnits.length > 0 ? (
          <section className="detalle-table">
            <div className="detalle-table__head">
              <span>Unidad</span>
              <span>Estatus</span>
              <span>Ruta</span>
              <span>Conductor</span>
            </div>
            <div className="detalle-table__body">
              {allUnits.map((u, i) => (
                <div className="detalle-table__row" key={i}>
                  <span className="detalle-table__cell detalle-table__cell--unidad">
                    {getNumeroEconomico(u)}
                  </span>
                  <span className={`detalle-table__cell detalle-table__status detalle-table__status--${u.__statusColor}`}>
                    {u.__statusLabel}
                  </span>
                  <span className="detalle-table__cell">{getRuta(u)}</span>
                  <span className="detalle-table__cell">{getConductor(u)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="detalle-empty">No hay unidades para este filtro.</p>
        )}
      </main>
    </div>
  );
}