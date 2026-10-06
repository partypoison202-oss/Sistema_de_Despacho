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

const getModelo = (d) =>
  d.TIPO_DE_UNIDAD ??
  d.tipo ??
  d.MODELO ??
  d.__modelInfo?.label ??
  '—';

const getCorrida = (d) => {
  const val = d.CORRIDAS ?? d.CORRIDA ?? d.corrida ?? d.corridas ?? d.MANTENIMIENTO_CORRIDA ?? d.mantenimiento_corrida;
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    return String(val).trim();
  }
  return '—';
};

const getConductor = (d) => {
  const rel = d.RELEVO_CONDUCTOR || d.relevo_conductor;
  if (rel && String(rel).trim() !== '') {
    const cleanRel = String(rel).replace(/\s*\(\d+\)$/, '').trim();
    return `${cleanRel} (Relevo)`;
  }
  return d.CONDUCTOR ??
    d.NOMBRE_CONDUCTOR ??
    d.CHOFER ??
    d.NOMBRE_CHOFER ??
    d.OPERADOR ??
    'Sin persona conductora asignada';
};

const getTarjeton = (d) => {
  const relCond = d.RELEVO_CONDUCTOR || d.relevo_conductor;
  const relTarj = d.RELEVO_TARJETON || d.relevo_tarjeton;
  if (relCond && String(relCond).trim() !== '') {
    return relTarj || '—';
  }
  return d.TARJETON ??
    d.TARJETON_CONDUCTOR ??
    d.NO_TARJETON ??
    '—';
};

const STATUS_TABS = [
  { key: 'unidadesOperacion', label: 'Operación', color: 'operacion' },
  { key: 'unidadesCirculando', label: 'Circulando', color: 'circulando' },
  { key: 'unidadesReserva', label: 'Reserva', color: 'reserva' },
  { key: 'unidadesMantenimiento', label: 'Mantenimiento', color: 'mantenimiento' },
  { key: 'unidadesPercance', label: 'Percance', color: 'percance' },
];

export default function DetalleUnidades() {
  const navigate = useNavigate();
  const { tipo } = useParams();
  const location = useLocation();
  const model = location.state?.model;

  const [activeTab, setActiveTab] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Si se entra directo a la URL sin pasar por Centro de Control, no hay datos en el state
  if (!model) {
    return (
      <div className="detalle-page">
        <Header title="Detalle de Unidades" eyebrow="Panel administrativo" />
        <main className="detalle-main">
          <div className="detalle-empty-state">
            <p>No se encontró información para mostrar.</p>
            <p className="detalle-empty-state__hint">
              Vuelve al Centro de Control y selecciona una tarjeta de tipo de unidad o ruta.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const groups = STATUS_TABS.map((tab) => ({
    ...tab,
    units: model[tab.key] || [],
  }));

  const totalCount = model.units ? model.units.length : (model.total || groups.reduce((acc, g) => g.key !== 'unidadesCirculando' ? acc + g.units.length : acc, 0));

  const getUnitStatusInfo = (u, group) => {
    const est = (u.ESTATUS || u.estatus || '').toUpperCase().trim();
    const horaSalida = (u.HORA_REAL_SALIDA_PATIO || u.HORA_SALIDA || '').trim();
    const isEncerrada = Boolean(u.YA_ENCERRADA || u.ya_encerrada);

    if (group && group.key === 'unidadesCirculando') {
      return { color: 'circulando', label: 'Operación (Circulando)' };
    }

    if (est.includes('OPERACI')) {
      if (horaSalida !== '' && !isEncerrada) return { color: 'circulando', label: 'Operación (Circulando)' };
      return { color: 'operacion', label: 'Operación' };
    }
    if (est.includes('MANTENIMIENTO')) return { color: 'mantenimiento', label: 'Mantenimiento' };
    if (est.includes('PERCANCE')) return { color: 'percance', label: 'Percance' };
    if (est.includes('RESERVA')) return { color: 'reserva', label: 'Reserva' };
    return { color: 'reserva', label: est || 'Registrado' };
  };

  let allUnits =
    activeTab === 'todas'
      ? (model.units && model.units.length > 0 ? model.units : groups.flatMap((g) => g.key !== 'unidadesCirculando' ? g.units : [])).map((u) => {
          const info = getUnitStatusInfo(u);
          return { ...u, __statusColor: info.color, __statusLabel: info.label };
        })
      : (groups.find((g) => g.key === activeTab)?.units || []).map((u) => {
          const g = groups.find((grp) => grp.key === activeTab);
          const info = getUnitStatusInfo(u, g);
          return { ...u, __statusColor: info.color, __statusLabel: info.label };
        });

  // Aplicar filtro de buscador general
  if (searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase();
    allUnits = allUnits.filter(u => 
      getNumeroEconomico(u).toString().toLowerCase().includes(term) ||
      getRuta(u).toLowerCase().includes(term) ||
      getModelo(u).toLowerCase().includes(term) ||
      getCorrida(u).toLowerCase().includes(term) ||
      getConductor(u).toLowerCase().includes(term) ||
      getTarjeton(u).toString().toLowerCase().includes(term) ||
      u.__statusLabel.toLowerCase().includes(term)
    );
  }

  return (
    <div className="detalle-page">
      <Header
        title={model.isRoute ? `Detalle · Ruta ${model.label}` : `Detalle · ${model.label}`}
        eyebrow={model.isRoute ? "Monitoreo de Rutas" : "Panel administrativo"}
      />

      <main className="detalle-main">
        <div className="detalle-hero">
          {model.image ? (
            <img src={model.image} alt={model.label} className="detalle-hero__image" />
          ) : (
            <div className={`detalle-hero__route-badge detalle-hero__route-badge--${model.tipo === 'troncal' ? 'troncal' : 'alimentadora'}`}>
              <span className="route-code">{model.label}</span>
              <span className="route-type">{model.tipo === 'troncal' ? 'TRONCAL' : 'ALIMENTADORA'}</span>
            </div>
          )}
          <div>
            <h1 className="detalle-hero__title">
              {model.isRoute ? `Ruta ${model.label}` : model.label}
              {model.desc && model.desc !== model.label ? ` — ${model.desc}` : ''}
            </h1>
            <p className="detalle-hero__subtitle">
              {model.isRoute
                ? `${model.tipo === 'troncal' ? 'Ruta Troncal' : 'Ruta Alimentadora'} · ${totalCount} ${totalCount === 1 ? 'unidad en total' : 'unidades en total'} (${model.operacion ?? model.programadas ?? 0} en operación · ${model.circulando ?? 0} circulando)`
                : `${totalCount} ${totalCount === 1 ? 'unidad en total' : 'unidades en total'} (${model.operacion ?? model.programadas ?? 0} en operación · ${model.circulando ?? 0} circulando)`}
            </p>
          </div>
        </div>

        {/* ---- KPIs por estatus ---- */}
        <section className="detalle-kpis">
          <div className="detalle-kpi detalle-kpi--operacion">
            <span className="detalle-kpi__value">{model.operacion ?? model.programadas ?? 0}</span>
            <span className="detalle-kpi__label">Operación</span>
          </div>
          <div className="detalle-kpi detalle-kpi--circulando">
            <span className="detalle-kpi__value">{model.circulando ?? 0}</span>
            <span className="detalle-kpi__label">Circulando</span>
          </div>
          <div className="detalle-kpi detalle-kpi--reserva">
            <span className="detalle-kpi__value">{model.reserva ?? 0}</span>
            <span className="detalle-kpi__label">Reserva</span>
          </div>
          <div className="detalle-kpi detalle-kpi--mantenimiento">
            <span className="detalle-kpi__value">{model.mantenimiento ?? 0}</span>
            <span className="detalle-kpi__label">Mantenimiento</span>
          </div>
        </section>

        {/* ---- Tabs de filtro por estatus y Buscador ---- */}
        <div className="detalle-filters-container">
          <div className="detalle-tabs">
            <button
              className={`detalle-tab ${activeTab === 'todas' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('todas')}
            >
              Todas ({totalCount})
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

          <div className="detalle-search">
            <svg className="detalle-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Buscar unidad, ruta, corrida..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="detalle-search__input"
            />
          </div>
        </div>

        {/* ---- Tabla / listado de unidades ---- */}
        {allUnits.length > 0 ? (
          <section className="detalle-table">
            <div className="detalle-table__head">
              <span>Unidad</span>
              {model.isRoute ? <span>Modelo</span> : <span>Estatus</span>}
              {model.isRoute ? <span>Estatus</span> : <span>Ruta</span>}
              <span>Corrida</span>
              <span>Tarjetón</span>
              <span>Conductor</span>
            </div>
            <div className="detalle-table__body">
              {allUnits.map((u, i) => (
                <div className="detalle-table__row" key={i}>
                  <span className="detalle-table__cell detalle-table__cell--unidad">
                    {getNumeroEconomico(u)}
                  </span>
                  {model.isRoute ? (
                    <span className="detalle-table__cell detalle-table__cell--modelo" style={{ fontWeight: 600 }}>
                      {getModelo(u)}
                    </span>
                  ) : (
                    <span className={`detalle-table__cell detalle-table__status detalle-table__status--${u.__statusColor}`}>
                      {u.__statusLabel}
                    </span>
                  )}
                  {model.isRoute ? (
                    <span className={`detalle-table__cell detalle-table__status detalle-table__status--${u.__statusColor}`}>
                      {u.__statusLabel}
                    </span>
                  ) : (
                    <span className="detalle-table__cell">{getRuta(u)}</span>
                  )}
                  <span className="detalle-table__cell detalle-table__cell--corrida">{getCorrida(u)}</span>
                  <span className="detalle-table__cell">{getTarjeton(u)}</span>
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