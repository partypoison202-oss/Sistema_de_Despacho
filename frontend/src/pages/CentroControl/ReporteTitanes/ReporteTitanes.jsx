// src/pages/ReportesTitanes/ReportesTitanes.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../../components/Header/Header';
import './ReporteTitanes.css';
import API_BASE from '../../../config/api';

// Nombre del rol tal como está guardado en la tabla `roles`
const ROL_TITAN = 'TITAN';

const fetchUsuarios = async () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/users`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Error de conexión al obtener usuarios');
  return res.json();
};

// Trae los reportes (incorporaciones, desincorporaciones, accidentes) de un titán específico
const fetchReportesTitan = async (usuarioId) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/titan/${usuarioId}/reportes`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Error de conexión al obtener los reportes del titán');
  return res.json();
};

const formatFecha = (fecha) => {
  if (!fecha) return 'N/A';
  try {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fecha;
  }
};

export default function ReportesTitanes() {
  const [titanSeleccionadoId, setTitanSeleccionadoId] = useState('');
  const [tipoModal, setTipoModal] = useState(null); // 'INCORPORACION' | 'DESINCORPORACION' | 'ACCIDENTE' | null

  const { data: usuarios = [], isLoading: cargandoUsuarios, isError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios,
  });

  // Filtramos solo usuarios activos con rol TITAN
  const titanes = useMemo(() => {
    return (Array.isArray(usuarios) ? usuarios : [])
      .filter((u) => {
        const rolNombre = (u.role?.nombre || u.role?.name || '').toUpperCase().trim();
        const esTitan = rolNombre === ROL_TITAN;
        const estaActivo = u.activo === true || u.activo === 'true' || u.activo === 1 || u.activo === undefined;
        return esTitan && estaActivo;
      })
      .map((u) => ({
        id: u.id,
        nombre: u.nombre_completo || u.usuario,
      }));
  }, [usuarios]);

  const titanActual = useMemo(
    () => titanes.find((t) => String(t.id) === String(titanSeleccionadoId)) || null,
    [titanes, titanSeleccionadoId]
  );

  const hayTitanSeleccionado = !!titanSeleccionadoId;

  const {
    data: reporteTitan,
    isLoading: cargandoReporte,
    isFetching: actualizandoReporte,
  } = useQuery({
    queryKey: ['reportes-titan', titanSeleccionadoId],
    queryFn: () => fetchReportesTitan(titanSeleccionadoId),
    enabled: hayTitanSeleccionado,
  });

  const cargandoInfo = cargandoReporte || actualizandoReporte;

  const incorporaciones = reporteTitan?.incorporaciones ?? 0;
  const desincorporaciones = reporteTitan?.desincorporaciones ?? 0;
  const accidentes = reporteTitan?.accidentes ?? 0;
  // TODO: la ubicación aún no se guarda de forma independiente; pendiente de
  // agregar el componente de geolocalización general del titán.
  const ubicacion = 'Pendiente de implementar';

  const reportesFiltrados = useMemo(() => {
    if (!tipoModal || !reporteTitan?.reportes) return [];
    return reporteTitan.reportes.filter((r) => r.tipo_evento === tipoModal);
  }, [tipoModal, reporteTitan]);

  const abrirModal = (tipo) => {
    if (!hayTitanSeleccionado) return;
    setTipoModal(tipo);
  };
  const cerrarModal = () => setTipoModal(null);

  const tituloModal = {
    INCORPORACION: 'Incorporaciones',
    DESINCORPORACION: 'Desincorporaciones',
    ACCIDENTE: 'Accidentes',
  }[tipoModal];

  return (
    <div className="reportes-titanes-page">
      <Header title="Reportes de Titanes" eyebrow="Panel administrativo" />

      <main className="reportes-titanes-main">
        <div className="rt-welcome">
          <p className="rt-eyebrow">Seguimiento de actividad</p>
          <h1 className="rt-title">Reportes de Titanes</h1>
          <p className="rt-subtitle">
            Selecciona un titán activo para consultar su ubicación y los
            reportes de incorporación, desincorporación y accidentes.
          </p>
        </div>

        {/* ---------- Panel de selección e información ---------- */}
        <section className="rt-panel">
          <div className="rt-panel__selector">
            <label htmlFor="titan-select" className="rt-panel__label">
              Titán
            </label>
            <select
              id="titan-select"
              className="rt-select"
              value={titanSeleccionadoId}
              onChange={(e) => {
                setTitanSeleccionadoId(e.target.value);
                setTipoModal(null);
              }}
              disabled={cargandoUsuarios}
            >
              <option value="">
                {cargandoUsuarios
                  ? 'Cargando titanes...'
                  : isError
                  ? 'Error al cargar titanes'
                  : titanes.length === 0
                  ? 'No hay titanes activos'
                  : 'Selecciona un titán'}
              </option>
              {titanes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="rt-panel__info">
            <div className="rt-info-item">
              <span className="rt-info-item__label">Ubicación</span>
              <span className="rt-info-item__value">
                {!hayTitanSeleccionado ? '—' : ubicacion}
              </span>
            </div>
            <div className="rt-info-item">
              <span className="rt-info-item__label">Incorporaciones</span>
              <span className="rt-info-item__value">
                {!hayTitanSeleccionado ? '—' : cargandoInfo ? '...' : incorporaciones}
              </span>
            </div>
            <div className="rt-info-item">
              <span className="rt-info-item__label">Desincorporaciones</span>
              <span className="rt-info-item__value">
                {!hayTitanSeleccionado ? '—' : cargandoInfo ? '...' : desincorporaciones}
              </span>
            </div>
            <div className="rt-info-item">
              <span className="rt-info-item__label">Accidentes</span>
              <span className="rt-info-item__value">
                {!hayTitanSeleccionado ? '—' : cargandoInfo ? '...' : accidentes}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Tarjetas de reportes ---------- */}
        <section className="rt-cards">
          <div
            className={`rt-card rt-card--incorporacion ${!hayTitanSeleccionado ? 'rt-card--disabled' : ''}`}
            onClick={() => abrirModal('INCORPORACION')}
            role="button"
            tabIndex={hayTitanSeleccionado ? 0 : -1}
          >
            <div className="rt-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            </div>
            <span className="rt-card__title">Incorporación</span>
            <span className="rt-card__value">
              {!hayTitanSeleccionado ? '—' : cargandoInfo ? '...' : incorporaciones}
            </span>
            <span className="rt-card__hint">
              {!hayTitanSeleccionado ? 'Selecciona un titán' : 'Ver reportes'}
            </span>
          </div>

          <div
            className={`rt-card rt-card--desincorporacion ${!hayTitanSeleccionado ? 'rt-card--disabled' : ''}`}
            onClick={() => abrirModal('DESINCORPORACION')}
            role="button"
            tabIndex={hayTitanSeleccionado ? 0 : -1}
          >
            <div className="rt-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
            </div>
            <span className="rt-card__title">Desincorporación</span>
            <span className="rt-card__value">
              {!hayTitanSeleccionado ? '—' : cargandoInfo ? '...' : desincorporaciones}
            </span>
            <span className="rt-card__hint">
              {!hayTitanSeleccionado ? 'Selecciona un titán' : 'Ver reportes'}
            </span>
          </div>

          <div
            className={`rt-card rt-card--accidentes ${!hayTitanSeleccionado ? 'rt-card--disabled' : ''}`}
            onClick={() => abrirModal('ACCIDENTE')}
            role="button"
            tabIndex={hayTitanSeleccionado ? 0 : -1}
          >
            <div className="rt-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className="rt-card__title">Accidentes</span>
            <span className="rt-card__value">
              {!hayTitanSeleccionado ? '—' : cargandoInfo ? '...' : accidentes}
            </span>
            <span className="rt-card__hint">
              {!hayTitanSeleccionado ? 'Selecciona un titán' : 'Ver reportes'}
            </span>
          </div>
        </section>
      </main>

      {/* ---------- Modal de detalle ---------- */}
      {tipoModal && (
        <div className="rt-modal-overlay" onClick={cerrarModal}>
          <div className="rt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rt-modal__header">
              <h3>
                {tituloModal} — {titanActual?.nombre}
              </h3>
              <button className="rt-modal__close" onClick={cerrarModal} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div className="rt-modal__body">
              {cargandoInfo && <p className="rt-modal__empty">Cargando reportes...</p>}

              {!cargandoInfo && reportesFiltrados.length === 0 && (
                <p className="rt-modal__empty">No hay reportes de este tipo.</p>
              )}

              {!cargandoInfo && reportesFiltrados.map((r) => (
                <div key={r.id} className="rt-reporte-item">
                  <div className="rt-reporte-item__head">
                    <span><strong>Unidad:</strong> {r.numero_economico || 'N/A'}</span>
                    <span>{formatFecha(r.created_at)}</span>
                  </div>

                  {r.ruta && <p><strong>Ruta:</strong> {r.ruta}</p>}
                  {r.corrida && <p><strong>Corrida:</strong> {r.corrida}</p>}
                  {r.intervalo && <p><strong>Intervalo:</strong> {r.intervalo}</p>}
                  {r.hora_evento && <p><strong>Hora del evento:</strong> {r.hora_evento}</p>}
                  {r.ubicacion_gps && <p><strong>Ubicación:</strong> {r.ubicacion_gps}</p>}
                  {r.observaciones && <p><strong>Observaciones:</strong> {r.observaciones}</p>}

                  {tipoModal === 'DESINCORPORACION' && r.motivo_desincorporacion && (
                    <p><strong>Motivo:</strong> {r.motivo_desincorporacion}</p>
                  )}

                  {tipoModal === 'ACCIDENTE' && (
                    <>
                      <p><strong>Dueño del particular:</strong> {r.accidente_dueno || 'N/A'}</p>
                      <p><strong>Vehículo:</strong> {r.accidente_vehiculo || 'N/A'}</p>
                      <p><strong>Placas:</strong> {r.accidente_placas || 'N/A'}</p>
                      <p><strong>¿Cuenta con seguro?:</strong> {r.accidente_seguro === 'true' ? 'Sí' : 'No'}</p>
                      <p><strong>Hechos:</strong> {r.accidente_hechos || 'N/A'}</p>
                      {r.firma_particular_url && (
                        <div className="rt-reporte-item__firma">
                          <strong>Firma del particular:</strong>
                          <img src={r.firma_particular_url} alt="Firma del particular" />
                        </div>
                      )}
                    </>
                  )}

                  {r.fotos?.length > 0 && (
                    <div className="rt-reporte-item__fotos">
                      {r.fotos.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={`Evidencia ${idx + 1}`} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}