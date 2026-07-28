// src/pages/ReportesTitanes/ReportesTitanes.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../../../components/Header/Header';
import UserAvatar from '../../../components/UserAvatar/UserAvatar';
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

// Trae TODOS los reportes (de cualquier titán) que aún no han sido vistos por el panel de control
const fetchNotificacionesPendientes = async () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/titan/notificaciones-pendientes`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Error de conexión al obtener notificaciones');
  return res.json();
};

// Marca una lista de reportes como vistos
const marcarVistos = async (ids) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  await fetch(`${API_BASE}/api/titan/reportes/marcar-vistos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });
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

// Determina si un texto de ubicación tiene formato de coordenadas "lat, lng"
// para poder generar un link directo a Google Maps
const esCoordenada = (texto) => {
  if (!texto) return false;
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(texto.trim());
};

// Cache simple en memoria para no repetir peticiones de la misma coordenada
// durante la sesión (persiste mientras el componente esté montado en el navegador)
const cacheDirecciones = new Map();

// Convierte "lat, lng" a una dirección legible usando Nominatim (OpenStreetMap).
const obtenerDireccion = async (coordenadas) => {
  if (cacheDirecciones.has(coordenadas)) {
    return cacheDirecciones.get(coordenadas);
  }

  const [lat, lng] = coordenadas.split(',').map((v) => v.trim());
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'es',
    },
  });
  if (!res.ok) throw new Error('No se pudo obtener la dirección');

  const data = await res.json();
  const direccion = data?.display_name || null;

  cacheDirecciones.set(coordenadas, direccion);
  return direccion;
};

export default function ReportesTitanes() {
  const queryClient = useQueryClient();

  const [titanSeleccionadoId, setTitanSeleccionadoId] = useState('');
  const [tipoModal, setTipoModal] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const { data: usuarios = [], isLoading: cargandoUsuarios, isError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios,
  });

  const { data: notificacionesData = [] } = useQuery({
    queryKey: ['titan-notificaciones-pendientes'],
    queryFn: fetchNotificacionesPendientes,
    refetchInterval: 15000,
  });

  // Filtramos solo usuarios activos con rol TITAN y guardamos también foto_url
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
        foto_url: u.foto_url || null,
      }));
  }, [usuarios]);

  const titanActual = useMemo(
    () => titanes.find((t) => String(t.id) === String(titanSeleccionadoId)) || null,
    [titanes, titanSeleccionadoId]
  );

  const hayTitanSeleccionado = !!titanSeleccionadoId;

  const notifPorTitan = useMemo(() => {
    const map = {};
    (Array.isArray(notificacionesData) ? notificacionesData : []).forEach((n) => {
      if (!map[n.usuario_id]) map[n.usuario_id] = [];
      map[n.usuario_id].push(n);
    });
    return map;
  }, [notificacionesData]);

  const notifTitanActual = notifPorTitan[titanSeleccionadoId] || [];
  const notifPorTipo = useMemo(() => {
    const map = { INCORPORACION: [], DESINCORPORACION: [], ACCIDENTE: [] };
    notifTitanActual.forEach((n) => {
      if (map[n.tipo_evento]) map[n.tipo_evento].push(n);
    });
    return map;
  }, [notifTitanActual]);

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

  // Ubicación: tomamos el reporte más reciente que traiga ubicacion_gps
  const ultimoReporteConUbicacion = useMemo(() => {
    const reportes = reporteTitan?.reportes ?? [];
    if (reportes.length === 0) return null;

    const conUbicacion = reportes.filter((r) => r.ubicacion_gps);
    if (conUbicacion.length === 0) return null;

    return conUbicacion.reduce((masReciente, actual) =>
      new Date(actual.created_at) > new Date(masReciente.created_at) ? actual : masReciente
    );
  }, [reporteTitan]);

  const ubicacion = ultimoReporteConUbicacion?.ubicacion_gps ?? null;
  const ubicacionEsCoordenada = esCoordenada(ubicacion);

  const { data: direccionUbicacion, isLoading: cargandoDireccion } = useQuery({
    queryKey: ['direccion-titan', ubicacion],
    queryFn: () => obtenerDireccion(ubicacion),
    enabled: !!ubicacion && ubicacionEsCoordenada,
    staleTime: Infinity,
    retry: 1,
  });

  const reportesFiltrados = useMemo(() => {
    if (!tipoModal || !reporteTitan?.reportes) return [];
    return reporteTitan.reportes.filter((r) => r.tipo_evento === tipoModal);
  }, [tipoModal, reporteTitan]);

  const abrirModal = async (tipo) => {
    if (!hayTitanSeleccionado) return;
    setTipoModal(tipo);

    const idsAMarcar = (notifPorTipo[tipo] || []).map((n) => n.id);
    if (idsAMarcar.length > 0) {
      try {
        await marcarVistos(idsAMarcar);
        queryClient.invalidateQueries({ queryKey: ['titan-notificaciones-pendientes'] });
      } catch (err) {
        console.error('Error al marcar reportes como vistos:', err);
      }
    }
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
            <label className="rt-panel__label">Titán</label>
            {/* Contenedor interno que posiciona el dropdown relativo al botón */}
            <div style={{ position: 'relative', width: '100%' }}>
              <button
                type="button"
                className="rt-select"
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  cursor: cargandoUsuarios ? 'not-allowed' : 'pointer',
                  margin: 0, // elimina márgenes por defecto
                }}
                onClick={() => !cargandoUsuarios && setSelectorAbierto((v) => !v)}
                disabled={cargandoUsuarios}
              >
                <span>
                  {cargandoUsuarios
                    ? 'Cargando titanes...'
                    : isError
                    ? 'Error al cargar titanes'
                    : titanActual
                    ? titanActual.nombre
                    : titanes.length === 0
                    ? 'No hay titanes activos'
                    : 'Selecciona un titán'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>▾</span>
              </button>

              {selectorAbierto && !cargandoUsuarios && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                  }}
                >
                  {titanes.length === 0 && (
                    <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#6b7280' }}>
                      No hay titanes activos
                    </div>
                  )}
                  {titanes.map((t) => {
                    const notifs = notifPorTitan[t.id] || [];
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setTitanSeleccionadoId(String(t.id));
                          setTipoModal(null);
                          setSelectorAbierto(false);
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span>{t.nombre}</span>
                        {notifs.length > 0 && (
                          <span
                            title={`${notifs.length} reporte(s) nuevo(s)`}
                            style={{
                              minWidth: '20px',
                              height: '20px',
                              padding: '0 5px',
                              borderRadius: '999px',
                              backgroundColor: '#dc2626',
                              color: '#fff',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
                            }}
                          >
                            {notifs.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ---------- Panel de información (reorganizado) ---------- */}
          <div className="rt-panel__info">
            {/* Fila superior: avatar + nombre */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              {titanActual ? (
                <>
                  <UserAvatar fotoUrl={titanActual.foto_url} nombre={titanActual.nombre} size={56} style={{ marginRight: '14px', border: '2px solid #c29b53' }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {titanActual.nombre}
                  </span>
                </>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '1rem' }}>
                  Selecciona un titán para ver su información
                </span>
              )}
            </div>

            {/* Cuadrícula de datos (2 columnas) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px 20px',
              }}
            >
              <div className="rt-info-item">
                <span className="rt-info-item__label">Ubicación</span>
                <span className="rt-info-item__value">
                  {!hayTitanSeleccionado ? (
                    '—'
                  ) : cargandoInfo ? (
                    '...'
                  ) : !ubicacion ? (
                    'Sin ubicación registrada'
                  ) : ubicacionEsCoordenada ? (
                    <a
                      href={`https://www.google.com/maps?q=${ubicacion}`}
                      target="_blank"
                      rel="noreferrer"
                      title={`Registrada el ${formatFecha(ultimoReporteConUbicacion.created_at)}\nCoordenadas: ${ubicacion}`}
                    >
                      {cargandoDireccion
                        ? 'Buscando dirección...'
                        : direccionUbicacion || 'Ver en mapa'}
                    </a>
                  ) : (
                    <span
                      title={`Registrada el ${formatFecha(ultimoReporteConUbicacion.created_at)}`}
                    >
                      {ubicacion}
                    </span>
                  )}
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
          </div>
        </section>

        {/* ---------- Tarjetas de reportes ---------- */}
        <section className="rt-cards">
          <div
            className={`rt-card rt-card--incorporacion ${!hayTitanSeleccionado ? 'rt-card--disabled' : ''}`}
            onClick={() => abrirModal('INCORPORACION')}
            role="button"
            tabIndex={hayTitanSeleccionado ? 0 : -1}
            style={{ position: 'relative' }}
          >
            {notifPorTipo.INCORPORACION.length > 0 && (
              <span
                title={`${notifPorTipo.INCORPORACION.length} reporte(s) nuevo(s)`}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
                }}
              >
                {notifPorTipo.INCORPORACION.length}
              </span>
            )}
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
            style={{ position: 'relative' }}
          >
            {notifPorTipo.DESINCORPORACION.length > 0 && (
              <span
                title={`${notifPorTipo.DESINCORPORACION.length} reporte(s) nuevo(s)`}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
                }}
              >
                {notifPorTipo.DESINCORPORACION.length}
              </span>
            )}
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
            style={{ position: 'relative' }}
          >
            {notifPorTipo.ACCIDENTE.length > 0 && (
              <span
                title={`${notifPorTipo.ACCIDENTE.length} reporte(s) nuevo(s)`}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
                }}
              >
                {notifPorTipo.ACCIDENTE.length}
              </span>
            )}
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

              {!cargandoInfo &&
                reportesFiltrados.map((r) => (
                  <div key={r.id} className="rt-reporte-item">
                    <div className="rt-reporte-item__head">
                      <span>
                        <strong>Unidad:</strong> {r.numero_economico || 'N/A'}
                      </span>
                      <span>{formatFecha(r.created_at)}</span>
                    </div>

                    {r.ruta && (
                      <p>
                        <strong>Ruta:</strong> {r.ruta}
                      </p>
                    )}
                    {r.corrida && (
                      <p>
                        <strong>Corrida:</strong> {r.corrida}
                      </p>
                    )}
                    {r.intervalo && (
                      <p>
                        <strong>Intervalo:</strong> {r.intervalo}
                      </p>
                    )}
                    {r.hora_evento && (
                      <p>
                        <strong>Hora del evento:</strong> {r.hora_evento}
                      </p>
                    )}
                    {r.ubicacion_gps && (
                      <p>
                        <strong>Ubicación:</strong> {r.ubicacion_gps}
                      </p>
                    )}
                    {r.observaciones && (
                      <p>
                        <strong>Observaciones:</strong> {r.observaciones}
                      </p>
                    )}

                    {tipoModal === 'DESINCORPORACION' && r.motivo_desincorporacion && (
                      <p>
                        <strong>Motivo:</strong> {r.motivo_desincorporacion}
                      </p>
                    )}

                    {tipoModal === 'ACCIDENTE' && (
                      <>
                        <p>
                          <strong>Dueño del particular:</strong> {r.accidente_dueno || 'N/A'}
                        </p>
                        <p>
                          <strong>Vehículo:</strong> {r.accidente_vehiculo || 'N/A'}
                        </p>
                        <p>
                          <strong>Placas:</strong> {r.accidente_placas || 'N/A'}
                        </p>
                        <p>
                          <strong>¿Cuenta con seguro?:</strong>{' '}
                          {r.accidente_seguro === 'true' ? 'Sí' : 'No'}
                        </p>
                        <p>
                          <strong>Hechos:</strong> {r.accidente_hechos || 'N/A'}
                        </p>
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