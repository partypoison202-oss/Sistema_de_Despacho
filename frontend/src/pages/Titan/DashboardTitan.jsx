import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import '../CentroControl/CentroControl.css';
import './Titan.css';

const modelsConfig = [
  { id: 'urbanus', label: 'URBANUSS', color: 'maroon', image: '/images/urbanu.webp' },
  { id: 'zafiro', label: 'ZAFIRO', color: 'gold', image: '/images/zafiro.webp' },
  { id: 'vagoneta', label: 'VAGONETA', color: 'green', image: '/images/vagoneta.webp' },
  { id: 'orion', label: 'ORIÓN', color: 'blue', image: '/images/orionlateral.webp' },
];

const DashboardTitan = () => {
  const navigate = useNavigate();
  const [modelData, setModelData] = useState([]);
  const [cargando, setCargando] = useState(!sessionStorage.getItem('titanModelData'));
  const [expandedModel, setExpandedModel] = useState(null);
  const [selectedEco, setSelectedEco] = useState('');
  const [busquedaEco, setBusquedaEco] = useState('');
  const [buscandoUnidad, setBuscandoUnidad] = useState(false);

  const fetchUnidades = async (silent = false) => {
    try {
      if (!silent) setCargando(true);
      const token = localStorage.getItem('token');
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

  const totalOperacion = modelData.reduce((acc, m) => acc + (m.operacion || 0), 0);
  
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

    const match = todasLasUnidades.find(u => u.numero_economico === ecoFormat);
    if (match) {
      const model = modelData.find(m => m.id === match.modelId);
      navigate(`/titan/detalle/${match.modelId}`, { state: { model: model, preselectedUnidad: match } });
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

  return (
    <div className="centro-control-container" onClick={() => setExpandedModel(null)}>
      <Header title="TITAN - Unidades en Operación" />

      <main className="centro-control-main">
        {/* Intro Section */}
        <div className="centro-welcome">
          <p className="centro-eyebrow">Visión general de la flota</p>
          <h1 className="centro-title">TITAN</h1>
          <p className="centro-subtitle">
            Consulta el total de unidades en operación, su estatus operativo y genera reportes de supervisión rápidamente.
          </p>
        </div>

        {/* Buscador global (Estilo Encierro) */}
        <section style={{ maxWidth: '640px', margin: '0 auto 40px auto' }}>
          <form className="dashboard__search" onSubmit={handleBuscarUnidad}>
            <input
              type="text"
              value={busquedaEco}
              onChange={(event) => setBusquedaEco(event.target.value.replace(/\D/g, '').substring(0, 3))}
              placeholder="Buscar por número económico"
              className="dashboard__search-input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <button type="submit" className="dashboard__search-button" disabled={!busquedaEco || buscandoUnidad}>
              {buscandoUnidad ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </section>

        <section className="centro-type-grid" style={{ maxWidth: '900px', margin: '40px auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', padding: '0 20px' }}>
          {modelsConfig.map((mc) => {
            const m = modelData.find((x) => x.id === mc.id) || { operacion: 0, units: [] };
            return (
              <div
                key={mc.id}
                className={`centro-type-card centro-type-card--${mc.color} ${!cargando ? 'centro-type-card--clickable' : ''}`}
                style={{
                  ...(cargando ? { opacity: 0.8, cursor: 'not-allowed' } : {}),
                  position: 'relative',
                  zIndex: expandedModel === mc.id ? 50 : 1
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!cargando) {
                    const isClosing = expandedModel === mc.id;
                    setExpandedModel(isClosing ? null : mc.id);
                    setSelectedEco('');
                  }
                }}
              >
                {/* Burbuja de unidades en operación */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  backgroundColor: '#059669', // Verde para indicar operación
                  color: 'white',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 2,
                  border: '3px solid white'
                }}>
                  {cargando ? '—' : m.operacion}
                </div>

                <div className="centro-type-card__header">
                  <img src={mc.image} alt={mc.label} className="centro-type-card__image" style={{ width: '110px', height: '60px', objectFit: 'contain' }} />
                  <div className="centro-type-card__heading">
                    <span className="centro-type-card__label" style={{ fontSize: '1.4rem' }}>{mc.label}</span>
                  </div>
                </div>

                {/* Lista de unidades superpuesta que aparece al dar clic a la caja */}
                {expandedModel === mc.id && (
                  <div 
                    className="titan-dropdown-menu" 
                    style={{ position: 'absolute', top: 'calc(100% + 5px)', left: 0, width: '100%', zIndex: 9999 }} 
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
                              setSelectedEco(u.numero_economico);
                              setExpandedModel(null);
                              navigate(`/titan/detalle/${mc.id}`, { state: { model: m, preselectedUnidad: u } });
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
      </main>
    </div>
  );
};

export default DashboardTitan;
