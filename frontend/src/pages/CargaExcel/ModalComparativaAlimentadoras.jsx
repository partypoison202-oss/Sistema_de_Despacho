import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { compareRutas } from '../../utils/rutaUtils';
import './CargaExcel.css';

const fetchHistorialAlimentadoras = async () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/historial-operativo/alimentadoras-ayer`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Error al obtener el historial de alimentadoras');
  }
  return response.json();
};

const normalizeTarjeton = (t) => {
  const n = parseInt(String(t || '').trim(), 10);
  return Number.isNaN(n) ? String(t || '').trim() : String(n);
};

const displayTarjeton = (t) => {
  const raw = String(t || '').trim();
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return raw;
  return String(n).padStart(4, '0');
};

const ModalComparativaAlimentadoras = ({
  isOpen,
  onClose,
  previewData = [],
  catalogConductores = [],
  catalogRutasObj = {},
  onUpdateRecord,
  onOpenCambioUnidad,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowEco, setEditingRowEco] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'conductor' | 'ruta' | null
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Tarjetones que ya están asignados en la tabla actual de hoy
  const tarjetonesEnUso = useMemo(() => {
    return new Set(
      (previewData || [])
        .flatMap((f) =>
          f ? [f['TARJETON'], f['RELEVO_TARJETON'], f['TARJETON_MANIOBRISTA']] : []
        )
        .filter((t) => t != null && String(t).trim() !== '')
        .map(normalizeTarjeton)
    );
  }, [previewData]);

  const getEstadoEfectivo = (conductor) => {
    if (!conductor) return 'disponible';
    if (conductor.estatus === 'inhabilitado') return 'inhabilitado';
    const tarjNorm = normalizeTarjeton(conductor.tarjeton);
    if (tarjetonesEnUso.has(tarjNorm)) return 'en_servicio';
    return conductor.estado_servicio || 'disponible';
  };

  // Bloquear scroll de fondo cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['historialAlimentadorasAyer'],
    queryFn: fetchHistorialAlimentadoras,
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  const historialAyer = data?.rutas || {};
  const fechaAyer = data?.fecha || '';

  // Catálogo exclusivo de rutas alimentadoras para el selector en modo edición ordenadas de 1A a 20B
  const availableRoutesAll = useMemo(() => {
    const list = catalogRutasObj?.alimentadoras || [];
    return Array.from(new Set(list.filter(Boolean))).sort(compareRutas);
  }, [catalogRutasObj]);

  // Lista filtrada de conductores para el dropdown custom
  const filteredConductores = useMemo(() => {
    if (!dropdownSearch) return catalogConductores || [];
    const s = dropdownSearch.toLowerCase().trim();
    return (catalogConductores || [])
      .filter((c) => {
        const tarj = String(c.tarjeton || '').toLowerCase();
        const nom = String(c.nombre || '').toLowerCase();
        return tarj.includes(s) || nom.includes(s);
      })
      .sort((a, b) => {
        const tA = String(a.tarjeton || '').toLowerCase();
        const tB = String(b.tarjeton || '').toLowerCase();
        const scoreA = tA === s ? 2 : tA.startsWith(s) ? 1 : 0;
        const scoreB = tB === s ? 2 : tB.startsWith(s) ? 1 : 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return tA.localeCompare(tB, undefined, { numeric: true });
      });
  }, [catalogConductores, dropdownSearch]);

  // Lista filtrada de rutas para el dropdown custom ordenadas de menor a mayor
  const filteredRoutes = useMemo(() => {
    if (!dropdownSearch) return availableRoutesAll;
    const s = dropdownSearch.toLowerCase().trim();
    return (availableRoutesAll || []).filter((r) => r.toLowerCase().includes(s)).sort(compareRutas);
  }, [availableRoutesAll, dropdownSearch]);

  // Agrupación dinámica de AYER por ruta (Solo Lectura) ordenada de 1A a 20B
  const ayerAgrupado = useMemo(() => {
    if (!historialAyer) return [];
    const lowerSearch = searchTerm.toLowerCase().trim();
    const map = {};

    Object.entries(historialAyer).forEach(([ruta, unidades]) => {
      const cleanRuta = String(ruta || '').trim();
      if (!cleanRuta || cleanRuta.toUpperCase() === 'SIN ASIGNAR' || cleanRuta === '-') {
        return;
      }

      const matchRuta = cleanRuta.toLowerCase().includes(lowerSearch);
      const unidadesFiltradas = (unidades || []).filter((u) => {
        if (!lowerSearch) return true;
        const eco = String(u.economico || '').toLowerCase();
        const cond = String(u.conductor || '').toLowerCase();
        const tarj = String(u.tarjeton || '').toLowerCase();
        return matchRuta || eco.includes(lowerSearch) || cond.includes(lowerSearch) || tarj.includes(lowerSearch);
      });

      if (unidadesFiltradas.length > 0) {
        map[cleanRuta] = unidadesFiltradas.sort((a, b) => (parseInt(a.economico, 10) || 0) - (parseInt(b.economico, 10) || 0));
      }
    });

    const sortedKeys = Object.keys(map).sort(compareRutas);
    return sortedKeys.map((ruta) => ({
      ruta,
      unidades: map[ruta],
    }));
  }, [historialAyer, searchTerm]);

  // Agrupación dinámica de HOY por ruta (Editable) - Alimentadoras ordenadas de 1A a 20B
  const hoyAgrupado = useMemo(() => {
    if (!previewData || previewData.length === 0) return [];
    const lowerSearch = searchTerm.toLowerCase().trim();
    const map = {};

    previewData.forEach((item, index) => {
      // Excluir troncales Urbanuss para concentrarse exclusivamente en Alimentadoras
      const tipo = String(item.TIPO_UNIDAD || item.TIPO_DE_UNIDAD || '').toLowerCase().trim();
      if (tipo === 'urbanuss' || tipo === 'urbanus') {
        return;
      }

      const ruta = String(item.RUTA || '').trim();
      // Excluir unidades sin ruta asignada
      if (!ruta || ruta.toUpperCase() === 'SIN ASIGNAR' || ruta === '-') {
        return;
      }

      const eco = String(item.ECONOMICO || '').trim();
      const conductor = String(item.NOMBRE_CONDUCTOR || '').trim();
      const tarjeton = String(item.TARJETON || '').trim();

      if (lowerSearch) {
        const matchRuta = ruta.toLowerCase().includes(lowerSearch);
        const matchEco = eco.toLowerCase().includes(lowerSearch);
        const matchCond = conductor.toLowerCase().includes(lowerSearch);
        const matchTarj = tarjeton.toLowerCase().includes(lowerSearch);
        if (!matchRuta && !matchEco && !matchCond && !matchTarj) {
          return;
        }
      }

      if (!map[ruta]) {
        map[ruta] = [];
      }
      map[ruta].push({ ...item, __originalIndex: index });
    });

    const sortedKeys = Object.keys(map).sort(compareRutas);
    return sortedKeys.map((ruta) => ({
      ruta,
      unidades: map[ruta].sort((a, b) => (parseInt(a.ECONOMICO, 10) || 0) - (parseInt(b.ECONOMICO, 10) || 0)),
    }));
  }, [previewData, searchTerm]);

  if (!isOpen) return null;

  const totalUnidadesHoy = hoyAgrupado.reduce((acc, g) => acc + g.unidades.length, 0);
  const totalUnidadesAyer = ayerAgrupado.reduce((acc, g) => acc + g.unidades.length, 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '1360px',
          maxWidth: '96vw',
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '1.1rem 1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(96, 26, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-maroon, #601a2a)',
              }}
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ color: 'var(--color-maroon, #601a2a)', margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                  Historial de Alimentadoras
                </h2>
                <span
                  style={{
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Comparativa y Asignación
                </span>
              </div>
              <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.84rem' }}>
                Referencia operativa del día <strong style={{ color: '#1e293b' }}>{fechaAyer || 'Anterior'}</strong> vs asignación activa de hoy
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '700',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            ✕
          </button>
        </div>

        {/* Barra de Filtro / Búsqueda */}
        <div
          style={{
            padding: '0.75rem 1.75rem',
            background: '#fafafa',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por número económico, conductor o ruta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 2.2rem 0.6rem 2.4rem',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.88rem',
                fontWeight: '500',
                color: '#1e293b',
                outline: 'none',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-maroon, #601a2a)';
                e.target.style.boxShadow = '0 0 0 3px rgba(96, 26, 42, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
              }}
            >
              Histórico: <strong style={{ color: '#1e293b' }}>{totalUnidadesAyer}</strong>
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#854d0e',
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
              }}
            >
              Hoy: <strong style={{ color: '#713f12' }}>{totalUnidadesHoy}</strong>
            </span>
          </div>
        </div>

        {/* Cuadrícula Split View (2 columnas con scroll independiente) */}
        <div style={{ flex: 1, minHeight: 0, padding: '1rem 1.75rem 1.25rem 1.75rem', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.25rem',
              height: '100%',
              minHeight: 0,
            }}
          >
            {/* COLUMNA IZQUIERDA: AYER (HISTÓRICO - SOLO LECTURA) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {/* Encabezado de Columna Ayer */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1.5px solid #e2e8f0',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    AYER
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Histórico de Operación</strong>
                  {fechaAyer && <span style={{ fontSize: '0.78rem', color: '#64748b' }}>({fechaAyer})</span>}
                </div>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                  }}
                >
                  {totalUnidadesAyer} unidades
                </span>
              </div>

              {/* Contenido con scroll independiente para Ayer */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: 0,
                }}
              >
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <span
                      className="spinner"
                      style={{
                        borderColor: 'rgba(96, 26, 42, 0.2)',
                        borderTopColor: 'var(--color-maroon, #601a2a)',
                        width: '2.2rem',
                        height: '2.2rem',
                        display: 'inline-block',
                      }}
                    ></span>
                    <p style={{ color: '#64748b', marginTop: '0.85rem', fontWeight: '500', fontSize: '0.88rem' }}>
                      Cargando historial operativo...
                    </p>
                  </div>
                ) : isError ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#ef4444' }}>
                    <p style={{ fontWeight: '600', fontSize: '0.88rem' }}>Error al obtener el historial.</p>
                  </div>
                ) : ayerAgrupado.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.88rem' }}>
                    No se encontraron unidades históricas para este filtro.
                  </div>
                ) : (
                  ayerAgrupado.map(({ ruta, unidades }) => (
                    <div
                      key={`ayer-card-ruta-${ruta}`}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                        flexShrink: 0,
                      }}
                    >
                      {/* Header de la Tarjeta de Ruta */}
                      <div
                        style={{
                          background: 'var(--color-maroon, #601a2a)',
                          color: '#ffffff',
                          padding: '0.55rem 0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', letterSpacing: '0.02em' }}>RUTA {ruta}</span>
                        <span
                          style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                          }}
                        >
                          {unidades.length} {unidades.length === 1 ? 'unidad' : 'unidades'}
                        </span>
                      </div>

                      {/* Lista de Unidades en la tarjeta */}
                      <div style={{ padding: '0.2rem 0.4rem' }}>
                        {unidades.map((u, idx) => (
                          <div
                            key={`ayer-u-${ruta}-${u.economico}-${idx}`}
                            style={{
                              padding: '0.55rem 0.65rem',
                              borderBottom: idx < unidades.length - 1 ? '1px solid #f1f5f9' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>ECO</span>
                                {u.economico}
                              </span>
                              {u.tarjeton ? (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    border: '1px solid #fde68a',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                  }}
                                >
                                  T-{displayTarjeton(u.tarjeton)}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontStyle: 'italic' }}>Sin tarjetón</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.82rem' }}>
                              <svg width="13" height="13" fill="none" stroke="#94a3b8" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                                {u.conductor || 'Sin registro de conductor'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: HOY (OPERACIÓN ACTUAL - EDITABLE) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                background: 'linear-gradient(180deg, #fffcf6 0%, #faf5ea 100%)',
                borderRadius: '12px',
                border: '1.5px solid #f0debe',
                boxShadow: '0 2px 10px rgba(197, 160, 89, 0.08)',
                overflow: 'hidden',
              }}
            >
              {/* Encabezado de Columna Hoy */}
              <div
                style={{
                  background: '#fdf9f2',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1.5px solid #ebd9b8',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <span
                    style={{
                      background: 'var(--color-gold, #c5a059)',
                      color: '#ffffff',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                    }}
                  >
                    HOY
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>Programación Activa</strong>
                  <span style={{ fontSize: '0.74rem', color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '0.08rem 0.45rem', borderRadius: '4px', fontWeight: '600' }}>Editable</span>
                </div>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                  }}
                >
                  {totalUnidadesHoy} unidades
                </span>
              </div>

              {/* Contenido con scroll independiente para Hoy */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  minHeight: 0,
                }}
              >
                {hoyAgrupado.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.88rem' }}>
                    No se encontraron unidades de alimentadoras programadas para hoy.
                  </div>
                ) : (
                  hoyAgrupado.map(({ ruta, unidades }) => (
                    <div
                      key={`hoy-card-ruta-${ruta}`}
                      style={{
                        border: '1px solid #ebd9b8',
                        borderLeft: '5px solid #c5a059',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 2px 6px rgba(197, 160, 89, 0.08)',
                        flexShrink: 0,
                      }}
                    >
                      {/* Header de la Tarjeta de Ruta */}
                      <div
                        style={{
                          background: 'var(--color-maroon, #601a2a)',
                          color: '#ffffff',
                          padding: '0.55rem 0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', letterSpacing: '0.02em' }}>RUTA {ruta}</span>
                        <span
                          style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                          }}
                        >
                          {unidades.length} {unidades.length === 1 ? 'unidad' : 'unidades'}
                        </span>
                      </div>

                      {/* Lista de Unidades en la tarjeta de Hoy */}
                      <div style={{ padding: '0.2rem 0.4rem', background: '#fffefb' }}>
                        {unidades.map((item, idx) => {
                          const isEditing = editingRowEco === item.ECONOMICO;
                          const originalIndex = item.__originalIndex;

                          return (
                            <div
                              key={`hoy-u-${ruta}-${item.ECONOMICO}-${originalIndex}`}
                              style={{
                                padding: '0.6rem 0.65rem',
                                borderBottom: idx < unidades.length - 1 ? '1px solid #f7eedb' : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.3rem',
                                background: isEditing ? '#fef3c7' : 'transparent',
                                borderRadius: isEditing ? '6px' : '0px',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              {!isEditing ? (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>ECO</span>
                                        {item.ECONOMICO}
                                      </span>
                                      {item.HORARIO && (
                                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500' }}>({item.HORARIO})</span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      {item.TARJETON ? (
                                        <span
                                          style={{
                                            fontSize: '0.72rem',
                                            background: '#fef3c7',
                                            color: '#92400e',
                                            border: '1px solid #fde68a',
                                            padding: '0.12rem 0.45rem',
                                            borderRadius: '4px',
                                            fontWeight: '700',
                                          }}
                                        >
                                          T-{displayTarjeton(item.TARJETON)}
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontStyle: 'italic' }}>Sin tarjetón</span>
                                      )}

                                      {/* Botón Editar */}
                                      <button
                                        type="button"
                                        onClick={() => setEditingRowEco(item.ECONOMICO)}
                                        title="Editar operador o ruta"
                                        style={{
                                          background: '#f8fafc',
                                          border: '1px solid #cbd5e1',
                                          color: '#475569',
                                          borderRadius: '4px',
                                          padding: '2px 7px',
                                          fontSize: '0.72rem',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          lineHeight: 1,
                                          transition: 'all 0.15s ease',
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.background = '#e2e8f0';
                                          e.currentTarget.style.color = '#1e293b';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.background = '#f8fafc';
                                          e.currentTarget.style.color = '#475569';
                                        }}
                                      >
                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        <span>Editar</span>
                                      </button>

                                      {/* Botón Cambio */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (onOpenCambioUnidad) {
                                            onOpenCambioUnidad(item, originalIndex);
                                          }
                                        }}
                                        title="Sustituir unidad por reserva"
                                        style={{
                                          background: 'rgba(197, 160, 89, 0.15)',
                                          border: '1px solid rgba(197, 160, 89, 0.4)',
                                          color: '#8c6d23',
                                          borderRadius: '4px',
                                          padding: '2px 7px',
                                          fontSize: '0.72rem',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          lineHeight: 1,
                                          transition: 'all 0.15s ease',
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.background = '#c5a059';
                                          e.currentTarget.style.color = '#ffffff';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.background = 'rgba(197, 160, 89, 0.15)';
                                          e.currentTarget.style.color = '#8c6d23';
                                        }}
                                      >
                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        <span>Cambio</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.84rem' }}>
                                    <svg width="13" height="13" fill="none" stroke="#94a3b8" strokeWidth="2.2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                                      {item.NOMBRE_CONDUCTOR || 'Sin conductor asignado'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                /* Modo Edición Inline dentro de la tarjeta */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', padding: '0.2rem 0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '800', color: 'var(--color-maroon, #601a2a)', fontSize: '0.88rem' }}>
                                      Editando Eco #{item.ECONOMICO}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRowEco(null);
                                        setActiveDropdown(null);
                                      }}
                                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', padding: '2px' }}
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Custom Dropdown Operador / Tarjetón */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '0.2rem' }}>
                                      Operador / Tarjetón:
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdown(activeDropdown === 'conductor' ? null : 'conductor');
                                        setDropdownSearch('');
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.45rem 0.65rem',
                                        borderRadius: '6px',
                                        border: activeDropdown === 'conductor' ? '1.5px solid var(--color-maroon, #601a2a)' : '1.5px solid #cbd5e1',
                                        background: '#ffffff',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        fontSize: '0.84rem',
                                        fontWeight: '600',
                                        color: item.TARJETON ? '#1e293b' : '#94a3b8',
                                        boxSizing: 'border-box',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.TARJETON ? (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ fontWeight: '800', color: 'var(--color-maroon, #601a2a)' }}>{displayTarjeton(item.TARJETON)}</span>
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                              {item.NOMBRE_CONDUCTOR ? `- ${item.NOMBRE_CONDUCTOR}` : ''}
                                            </span>
                                          </span>
                                        ) : (
                                          'Selecciona conductor...'
                                        )}
                                      </span>
                                      <svg
                                        width="13"
                                        height="13"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                        style={{
                                          transform: activeDropdown === 'conductor' ? 'rotate(180deg)' : 'none',
                                          transition: 'transform 0.2s',
                                          color: '#64748b',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>

                                    {activeDropdown === 'conductor' && (
                                      <div
                                        style={{
                                          marginTop: '0.35rem',
                                          backgroundColor: '#ffffff',
                                          border: '1.5px solid #e2e8f0',
                                          borderRadius: '8px',
                                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <div style={{ padding: '0.4rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                          <input
                                            type="text"
                                            placeholder="Buscar conductor o tarjetón..."
                                            value={dropdownSearch}
                                            onChange={(e) => setDropdownSearch(e.target.value)}
                                            autoFocus
                                            style={{
                                              width: '100%',
                                              padding: '0.35rem 0.5rem',
                                              fontSize: '0.8rem',
                                              border: '1px solid #cbd5e1',
                                              borderRadius: '4px',
                                              outline: 'none',
                                              boxSizing: 'border-box',
                                            }}
                                          />
                                        </div>
                                        <div style={{ maxHeight: '11rem', overflowY: 'auto' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onUpdateRecord) onUpdateRecord(originalIndex, 'TARJETON', '');
                                              setActiveDropdown(null);
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '0.5rem 0.85rem',
                                              textAlign: 'center',
                                              border: 'none',
                                              borderBottom: '1px solid #f1f5f9',
                                              background: 'transparent',
                                              color: '#ef4444',
                                              fontWeight: '700',
                                              fontSize: '0.78rem',
                                              letterSpacing: '0.04em',
                                              cursor: 'pointer',
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                          >
                                            NINGUNO
                                          </button>
                                          {filteredConductores.length === 0 ? (
                                            <div style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                                              Sin coincidencias
                                            </div>
                                          ) : (
                                            filteredConductores.map((c, cIdx) => {
                                              const estadoEfectivo = getEstadoEfectivo(c);
                                              const isSelected = normalizeTarjeton(item.TARJETON) === normalizeTarjeton(c.tarjeton);

                                              return (
                                                <button
                                                  key={`cond-opt-${cIdx}`}
                                                  type="button"
                                                  disabled={estadoEfectivo === 'falta'}
                                                  onClick={() => {
                                                    if (estadoEfectivo === 'falta') return;
                                                    if (estadoEfectivo === 'en_servicio') {
                                                      setActiveDropdown(null);
                                                      const prevAssignment = previewData.find(
                                                        (f) =>
                                                          normalizeTarjeton(f['TARJETON']) === normalizeTarjeton(c.tarjeton) ||
                                                          normalizeTarjeton(f['RELEVO_TARJETON']) === normalizeTarjeton(c.tarjeton)
                                                      );
                                                      let asigText = '';
                                                      if (prevAssignment) {
                                                        const eco = prevAssignment['ECONOMICO'] || prevAssignment['ECONÓMICO'] || 'N/A';
                                                        const ruta = prevAssignment['RUTA'] || 'N/A';
                                                        asigText = `\n\nActualmente está asignado a la unidad ECO: ${eco} (Ruta: ${ruta}).`;
                                                      }
                                                      Swal.fire({
                                                        title: 'Conductor en Servicio',
                                                        text: `El conductor ${c.nombre} (Tarjetón: ${c.tarjeton}) ya se encuentra en servicio.${asigText}\n\n¿Estás seguro de que deseas reasignarlo a esta unidad?`,
                                                        icon: 'warning',
                                                        showCancelButton: true,
                                                        confirmButtonColor: '#c29b53',
                                                        cancelButtonColor: '#6b1d33',
                                                        confirmButtonText: 'Sí, reasignar',
                                                        cancelButtonText: 'Cancelar',
                                                      }).then((result) => {
                                                        if (result.isConfirmed && onUpdateRecord) {
                                                          onUpdateRecord(originalIndex, 'TARJETON', displayTarjeton(c.tarjeton));
                                                        }
                                                      });
                                                      return;
                                                    }
                                                    if (onUpdateRecord) {
                                                      onUpdateRecord(originalIndex, 'TARJETON', displayTarjeton(c.tarjeton));
                                                    }
                                                    setActiveDropdown(null);
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.5rem 0.75rem',
                                                    border: 'none',
                                                    borderBottom: '1px solid #f8fafc',
                                                    background: isSelected ? 'rgba(96, 26, 42, 0.06)' : 'transparent',
                                                    cursor: estadoEfectivo === 'falta' ? 'not-allowed' : 'pointer',
                                                    opacity: estadoEfectivo === 'falta' ? 0.5 : 1,
                                                    boxSizing: 'border-box',
                                                  }}
                                                  onMouseOver={(e) => {
                                                    if (estadoEfectivo !== 'falta') e.currentTarget.style.background = '#f8fafc';
                                                  }}
                                                  onMouseOut={(e) => {
                                                    e.currentTarget.style.background = isSelected ? 'rgba(96, 26, 42, 0.06)' : 'transparent';
                                                  }}
                                                >
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '0.84rem', color: '#1e293b' }}>
                                                      {displayTarjeton(c.tarjeton)}
                                                    </span>
                                                    <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                      {c.nombre}
                                                    </span>
                                                  </div>
                                                  <span
                                                    style={{
                                                      fontSize: '0.62rem',
                                                      padding: '0.12rem 0.4rem',
                                                      borderRadius: '1rem',
                                                      backgroundColor:
                                                        estadoEfectivo === 'en_servicio'
                                                          ? 'rgba(239, 68, 68, 0.1)'
                                                          : estadoEfectivo === 'falta'
                                                          ? 'rgba(220, 38, 38, 0.15)'
                                                          : 'rgba(34, 197, 94, 0.1)',
                                                      color:
                                                        estadoEfectivo === 'en_servicio'
                                                          ? '#ef4444'
                                                          : estadoEfectivo === 'falta'
                                                          ? '#dc2626'
                                                          : '#16a34a',
                                                      fontWeight: '700',
                                                      textTransform: 'uppercase',
                                                      letterSpacing: '0.02em',
                                                      lineHeight: '1',
                                                      flexShrink: 0,
                                                    }}
                                                  >
                                                    {estadoEfectivo === 'en_servicio'
                                                      ? 'Servicio'
                                                      : estadoEfectivo === 'falta'
                                                      ? 'Falta'
                                                      : 'Disponible'}
                                                  </span>
                                                </button>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Custom Dropdown Ruta */}
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '0.2rem' }}>
                                      Ruta:
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdown(activeDropdown === 'ruta' ? null : 'ruta');
                                        setDropdownSearch('');
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '0.45rem 0.65rem',
                                        borderRadius: '6px',
                                        border: activeDropdown === 'ruta' ? '1.5px solid var(--color-maroon, #601a2a)' : '1.5px solid #cbd5e1',
                                        background: '#ffffff',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        fontSize: '0.84rem',
                                        fontWeight: '600',
                                        color: item.RUTA ? '#1e293b' : '#94a3b8',
                                        boxSizing: 'border-box',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <span>{item.RUTA || 'Selecciona ruta...'}</span>
                                      <svg
                                        width="13"
                                        height="13"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                        style={{
                                          transform: activeDropdown === 'ruta' ? 'rotate(180deg)' : 'none',
                                          transition: 'transform 0.2s',
                                          color: '#64748b',
                                        }}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>

                                    {activeDropdown === 'ruta' && (
                                      <div
                                        style={{
                                          marginTop: '0.35rem',
                                          backgroundColor: '#ffffff',
                                          border: '1.5px solid #e2e8f0',
                                          borderRadius: '8px',
                                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <div style={{ padding: '0.4rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                          <input
                                            type="text"
                                            placeholder="Buscar ruta..."
                                            value={dropdownSearch}
                                            onChange={(e) => setDropdownSearch(e.target.value)}
                                            autoFocus
                                            style={{
                                              width: '100%',
                                              padding: '0.35rem 0.5rem',
                                              fontSize: '0.8rem',
                                              border: '1px solid #cbd5e1',
                                              borderRadius: '4px',
                                              outline: 'none',
                                              boxSizing: 'border-box',
                                            }}
                                          />
                                        </div>
                                        <div style={{ maxHeight: '11rem', overflowY: 'auto' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onUpdateRecord) onUpdateRecord(originalIndex, 'RUTA', '');
                                              setActiveDropdown(null);
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '0.5rem 0.85rem',
                                              textAlign: 'center',
                                              border: 'none',
                                              borderBottom: '1px solid #f1f5f9',
                                              background: 'transparent',
                                              color: '#ef4444',
                                              fontWeight: '700',
                                              fontSize: '0.78rem',
                                              letterSpacing: '0.04em',
                                              cursor: 'pointer',
                                            }}
                                            onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                          >
                                            NINGUNA
                                          </button>
                                          {filteredRoutes.length === 0 ? (
                                            <div style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                                              Sin coincidencias
                                            </div>
                                          ) : (
                                            filteredRoutes.map((r, rIdx) => {
                                              const isSelected = item.RUTA === r;
                                              return (
                                                <button
                                                  key={`ruta-opt-${rIdx}`}
                                                  type="button"
                                                  onClick={() => {
                                                    if (onUpdateRecord) onUpdateRecord(originalIndex, 'RUTA', r);
                                                    setActiveDropdown(null);
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.5rem 0.75rem',
                                                    border: 'none',
                                                    borderBottom: '1px solid #f8fafc',
                                                    background: isSelected ? 'rgba(96, 26, 42, 0.06)' : 'transparent',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    fontSize: '0.82rem',
                                                    color: '#334155',
                                                    boxSizing: 'border-box',
                                                  }}
                                                  onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                                  onMouseOut={(e) => {
                                                    e.currentTarget.style.background = isSelected ? 'rgba(96, 26, 42, 0.06)' : 'transparent';
                                                  }}
                                                >
                                                  <span>{r}</span>
                                                  {isSelected && (
                                                    <svg width="13" height="13" fill="none" stroke="var(--color-maroon, #601a2a)" strokeWidth="3" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  )}
                                                </button>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Botones de acción dentro del form */}
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.35rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onOpenCambioUnidad) {
                                          onOpenCambioUnidad(item, originalIndex);
                                        }
                                      }}
                                      style={{
                                        background: 'rgba(197, 160, 89, 0.15)',
                                        border: '1px solid rgba(197, 160, 89, 0.4)',
                                        color: '#8c6d23',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M16 3h5v5" />
                                        <path d="M4 20L21 3" />
                                        <path d="M21 16v5h-5" />
                                        <path d="M15 15l6 6" />
                                        <path d="M4 4l5 5" />
                                      </svg>
                                      <span>Sustituir Eco</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRowEco(null);
                                        setActiveDropdown(null);
                                      }}
                                      style={{
                                        background: 'var(--color-maroon, #601a2a)',
                                        border: 'none',
                                        color: '#ffffff',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Listo
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalComparativaAlimentadoras;
