import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import '../CentroControl/CentroControl.css';
import './Titan.css';
import '../Dashboard/Dashboard.css';
import '../../components/TransportCard.css';
import DetalleUnidadTitan from './DetalleUnidadTitan';
import TitanHistorico from './TitanHistorico';
import TitanDashboardStats from './TitanDashboardStats';

const modelsConfig = [
  { id: 'urbanuss', label: 'URBANUSS', subtitle: 'UNIDADES TIPO AUTOBÚS', color: 'maroon', image: '/images/urbanu.webp' },
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
          <>
            <p className="page-eyebrow">VISIÓN GENERAL DE LA FLOTA</p>
            <h1 className="page-title">INSPECTORES DE OPERACIÓN</h1>
            <p className="dashboard__subtitle text-gray-500">
              Consulta el total de unidades en operación, su estatus operativo y genera reportes de supervisión rápidamente.
            </p>

            <form className="dashboard__search" onSubmit={handleBuscarUnidad}>
              <input
                type="text"
                value={busquedaEco}
                onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
                placeholder="Buscar por número económico"
                className="dashboard__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <button 
                type="submit" 
                disabled={!busquedaEco || buscandoUnidad || parseInt(busquedaEco, 10) === 0}
                className="dashboard__search-button"
              >
                {buscandoUnidad ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            <div className="dashboard__grid">
              {modelsConfig.map((mc) => {
                const m = modelData.find((x) => x.id === mc.id) || { operacion: 0, units: [] };
                return (
                  <div key={mc.id} style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                    <button
                      type="button"
                      className="transport-card"
                      style={{ opacity: cargando ? 0.6 : 1, cursor: cargando ? 'wait' : 'pointer', width: '100%' }}
                      disabled={cargando}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!cargando) {
                          setExpandedModel(expandedModel === mc.id ? null : mc.id);
                        }
                      }}
                    >
                      <div className="transport-card__badge">
                        {cargando ? (
                          <span className="transport-card__badge-loading">…</span>
                        ) : (
                          <span className="transport-card__badge-number">{m.operacion}</span>
                        )}
                      </div>
                      <div className="transport-card__image-wrap">
                        <img src={mc.image} alt={mc.label} className="transport-card__image" />
                      </div>
                      <h2 className="transport-card__title">{mc.label}</h2>
                      <p className="transport-card__subtitle">{mc.subtitle}</p>
                    </button>

                    {expandedModel === mc.id && (
                      <div
                        className="titan-dropdown-menu"
                        style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 9999 }}
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
            </div>
          </>
        )}

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

      <main className="dashboard__main" style={{ textAlign: 'center' }}>
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
