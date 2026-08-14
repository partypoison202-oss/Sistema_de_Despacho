import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import '../CentroControl/CentroControl.css';
import './Titan.css';
import DetalleUnidadTitan from './DetalleUnidadTitan';
import TitanHistorico from './TitanHistorico';
import TitanDashboardStats from './TitanDashboardStats';

const modelsConfig = [
  { id: 'urbanus', label: 'URBANUSS', subtitle: 'UNIDADES TIPO AUTOBÚS', color: 'maroon', image: '/images/urbanu.webp' },
  { id: 'zafiro', label: 'ZAFIRO', subtitle: 'UNIDADES TIPO MICROBÚS', color: 'gold', image: '/images/zafiro.webp' },
  { id: 'vagoneta', label: 'VAGONETA', subtitle: 'UNIDADES TIPO VAN', color: 'green', image: '/images/vagoneta.webp' },
  { id: 'orion', label: 'ORION', subtitle: 'UNIDADES TIPO ORION', color: 'blue', image: '/images/orionlateral.webp' },
];

const DashboardTitan = () => {
  const [modelData, setModelData] = useState([]);
  const [cargando, setCargando] = useState(!sessionStorage.getItem('titanModelData'));
  const [expandedModel, setExpandedModel] = useState(null);
  
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);

  // States for unified page
  const [activeModel, setActiveModel] = useState(null);
  const [activeUnidad, setActiveUnidad] = useState(null);

  // View toggle state: 'registro' | 'historico' | 'dashboard'
  const [currentView, setCurrentView] = useState('registro');

  const fetchUnidades = async (silent = false) => {
    try {
      if (!silent) setCargando(true);
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const response = await fetch(`${API_BASE}/api/titan/unidades`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error al obtener datos');
      const data = await response.json();
      setModelData(data);
      sessionStorage.setItem('titanModelData', JSON.stringify(data));
    } catch (error) {
      console.error(error);
      if (!silent) Swal.fire('Error', 'No se pudieron cargar las unidades en operación.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const cachedData = sessionStorage.getItem('titanModelData');
    if (cachedData) {
      setModelData(JSON.parse(cachedData));
      fetchUnidades(true); // background update
    } else {
      fetchUnidades();
    }
  }, []);

  // Aplanar todas las unidades para el buscador global
  const todasLasUnidades = modelData.reduce((acc, m) => {
    const unitsWithModelId = (m.units || []).map(u => ({ ...u, modelId: m.id }));
    return [...acc, ...unitsWithModelId];
  }, []);

  const handleBuscarUnidad = (e) => {
    e.preventDefault();
    if (!busquedaEco) return;

    setBuscandoUnidad(true);
    const ecoFormat = busquedaEco.padStart(3, '0');

    const match = todasLasUnidades.find(u => {
      const status = String(u.estatus || u.estado || 'operacion').toLowerCase().trim();
      return u.numero_economico === ecoFormat && (status === 'operacion' || status === '');
    });
    if (match) {
      const model = modelData.find(m => m.id === match.modelId);
      setActiveModel(model);
      setActiveUnidad(match);
      setBusquedaEco('');
      setExpandedModel(null);
      setBuscandoUnidad(false);
      setCurrentView('registro'); // Ensure it switches to registro view
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No encontrada',
        text: `La unidad ECO${ecoFormat} no se encuentra en operación.`,
        confirmButtonColor: '#6b1d33'
      });
      setBuscandoUnidad(false);
    }
  };

  const renderContent = () => {
    if (currentView === 'historico') {
      return <TitanHistorico />;
    }
    if (currentView === 'dashboard') {
      return <TitanDashboardStats />;
    }
    
    // Default view: Registro
    return (
      <>
        {!activeUnidad && (
          <div className="centro-welcome" style={{ marginBottom: '50px' }}>
            <p className="centro-eyebrow">Visión general de la flota</p>
            <h1 className="centro-title">TITÁN</h1>
            <p className="centro-subtitle">
              Consulta el total de unidades en operación, su estatus operativo y genera reportes de supervisión rápidamente.
            </p>
          </div>
        )}

        <div style={{ 
          display: activeUnidad ? 'flex' : 'block', 
          flexDirection: activeUnidad ? 'row-reverse' : 'column',
          gap: '20px', 
          justifyContent: 'space-between',
          alignItems: activeUnidad ? 'center' : 'stretch',
          marginBottom: '30px',
          maxWidth: activeUnidad ? '850px' : 'none',
          margin: activeUnidad ? '30px auto 30px' : '0',
          transition: 'all 0.3s ease-out'
        }}>
          {/* Buscador global */}
          <section style={{ 
            maxWidth: activeUnidad ? '300px' : '640px', 
            margin: activeUnidad ? '0' : '0 auto 40px auto',
            flexGrow: 1,
            transition: 'all 0.3s ease-out'
          }}>
            <form style={{ display: 'flex', alignItems: 'center', transition: 'all 0.3s ease-out', position: 'relative' }} onSubmit={handleBuscarUnidad}>
              <div style={{ position: 'absolute', left: '18px', color: '#9ca3af', pointerEvents: 'none' }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input
                type="text"
                value={busquedaEco}
                onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
                placeholder="Buscar por número económico..."
                style={{
                  width: '100%',
                  padding: '18px 18px 18px 52px',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#c5a059'; e.target.style.boxShadow = '0 0 0 4px rgba(197, 160, 89, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.05)'; }}
              />
              <button 
                type="submit" 
                disabled={!busquedaEco || buscandoUnidad || parseInt(busquedaEco, 10) === 0}
                className="centro-btn centro-btn--primary"
                style={activeUnidad ? { 
                  position: 'absolute',
                  right: '8px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '44px', 
                  height: '44px',
                  minWidth: '44px',
                  borderRadius: '12px', 
                  padding: 0,
                  flexShrink: 0
                } : { 
                  position: 'absolute', 
                  right: '10px',
                  padding: '12px 28px',
                  borderRadius: '12px',
                  fontSize: '0.95rem'
                }}
              >
                {buscandoUnidad ? (
                  activeUnidad ? <span style={{ fontSize: '1.2rem' }}>…</span> : '...'
                ) : (
                  activeUnidad ? (
                    <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  ) : 'Buscar'
                )}
              </button>
            </form>
          </section>

          {/* Tarjetas de tipos de unidad */}
          <section className="centro-type-grid" style={{ 
            maxWidth: activeUnidad ? '530px' : '900px', 
            margin: activeUnidad ? '0' : '40px auto', 
            display: 'grid', 
            gridTemplateColumns: activeUnidad ? 'repeat(4, 1fr)' : 'repeat(auto-fit, minmax(210px, 1fr))', 
            gap: activeUnidad ? '10px' : '25px', 
            padding: activeUnidad ? '0' : '0 20px',
            flexGrow: 2,
            transition: 'all 0.3s ease-out'
          }}>
            {modelsConfig.map((mc) => {
              const m = modelData.find((x) => x.id === mc.id) || { operacion: 0, units: [] };
              const isSelected = activeModel?.id === mc.id;
              
              return (
                <div
                  key={mc.id}
                  className={`centro-type-card centro-type-card--${mc.color} ${!cargando ? 'centro-type-card--clickable' : ''}`}
                  style={{
                    ...(cargando ? { opacity: 0.8, cursor: 'not-allowed' } : {}),
                    position: 'relative',
                    zIndex: expandedModel === mc.id ? 50 : 1,
                    padding: activeUnidad ? '8px' : '0',
                    border: activeUnidad && isSelected ? '2px solid var(--brand-maroon-text)' : 'none',
                    backgroundColor: activeUnidad && isSelected ? '#f9fafb' : 'transparent',
                    boxShadow: activeUnidad && isSelected ? undefined : 'none',
                    transition: 'all 0.3s ease-out',
                    minHeight: activeUnidad ? '45px' : undefined
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!cargando) {
                      const isClosing = expandedModel === mc.id;
                      setExpandedModel(isClosing ? null : mc.id);
                    }
                  }}
                >
                  {/* Burbuja de unidades en operación */}
                  <div style={{
                    position: 'absolute',
                    top: activeUnidad ? '-5px' : '5px',
                    right: activeUnidad ? '-5px' : '20px',
                    backgroundColor: '#6b1d33', // Guinda
                    color: 'white',
                    borderRadius: '50%',
                    width: activeUnidad ? '20px' : '35px',
                    height: activeUnidad ? '20px' : '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: activeUnidad ? '0.75rem' : '1.1rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 2,
                    border: activeUnidad ? '2px solid white' : '3px solid white',
                    transition: 'all 0.3s ease-out'
                  }}>
                    {cargando ? '—' : m.operacion}
                  </div>

                  <div className="centro-type-card__header" style={{ flexDirection: 'column', alignItems: 'center', gap: activeUnidad ? '0px' : '15px', justifyContent: 'center', transition: 'all 0.3s ease-out' }}>
                    <img src={mc.image} alt={mc.label} className="centro-type-card__image" style={{ width: activeUnidad ? '90px' : '100%', maxWidth: '240px', height: activeUnidad ? '55px' : '120px', objectFit: 'contain', transition: 'all 0.3s ease-out' }} />
                    <div className="centro-type-card__heading" style={{ textAlign: 'center', transition: 'all 0.3s ease-out', display: activeUnidad ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                      <span className="centro-type-card__label" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0b162c', transition: 'all 0.3s ease-out' }}>{mc.label}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c5a059', letterSpacing: '0.5px' }}>{mc.subtitle}</span>
                    </div>
                  </div>

                  {/* Lista de unidades superpuesta que aparece al dar clic a la caja */}
                  {expandedModel === mc.id && (
                    <div 
                      className="titan-dropdown-menu" 
                      style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, width: activeUnidad ? '200%' : '100%', zIndex: 9999 }} 
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="titan-dropdown-menu__scroll" style={{ maxHeight: '200px' }}>
                        {m.units.length === 0 ? (
                          <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>
                            SIN UNIDADES EN OPERACIÓN
                          </div>
                        ) : (
                          m.units.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              className="titan-dropdown-menu__item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveModel(m);
                                setActiveUnidad(u);
                                setExpandedModel(null);
                                setCurrentView('registro');
                              }}
                            >
                              ECO{u.numero_economico}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        {activeUnidad && (
          <div style={{ animation: 'dropdownFadeIn 0.5s ease-out' }}>
            <DetalleUnidadTitan 
              model={activeModel}
              preselectedUnidad={activeUnidad}
              onCancel={() => {
                setActiveUnidad(null);
                setActiveModel(null);
              }}
              onSuccess={() => {
                setActiveUnidad(null);
                setActiveModel(null);
                fetchUnidades(true);
              }}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="centro-control-container" onClick={() => setExpandedModel(null)}>
      <Header title="TITÁN - Unidades en Operación" />

      <main className="centro-control-main">
        {/* Toggle para alternar vistas */}
        <div className="titan-view-toggle">
          <button 
            className={`titan-toggle-btn ${currentView === 'registro' ? 'active' : ''}`}
            onClick={() => setCurrentView('registro')}
          >
            Nuevo Registro
          </button>
          <button 
            className={`titan-toggle-btn ${currentView === 'historico' ? 'active' : ''}`}
            onClick={() => setCurrentView('historico')}
          >
            Histórico
          </button>
          <button 
            className={`titan-toggle-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
        </div>

        <div className="titan-view-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default DashboardTitan;
