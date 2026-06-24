// src/pages/Encierro/DetalleUnidadEncierro.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { encierroModules } from '../../config/encierroModules';
import Header from '../../components/Header/Header';
import '../Unidades/DetalleUnidad.css';

export default function DetalleUnidadEncierro() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...'
  });
  const [cargandoDatos, setCargandoDatos] = useState(false);

  const configActual = encierroModules.find(m => m.id === tipoTransporte);
  if (!configActual) {
    return <div className="p-8">Transporte no encontrado. <button onClick={() => navigate('/encierro/dashboard')}>Volver</button></div>;
  }

  const [unidadesList, setUnidadesList] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchUnidades = async () => {
      const token = getToken();
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const respuesta = await fetch(
          `http://127.0.0.1:8000/api/unidades/listar/${tipoTransporte}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();
          const unidadesFormateadas = datos.map(u =>
            `ECO${String(u.numero_eco).padStart(3, '0')}`
          );
          setUnidadesList(unidadesFormateadas);
        } else if (respuesta.status === 401) {
          navigate('/');
        } else {
          const errorText = await respuesta.text();
          console.error('Error al obtener la lista de unidades:', respuesta.status, errorText);
        }
      } catch (error) {
        console.error('Error de conexión al obtener la lista de unidades', error);
      } finally {
        setCargandoUnidades(false);
      }
    };

    fetchUnidades();
  }, [tipoTransporte, navigate]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectUnit = async (unidad) => {
    setSelectedOption(unidad);
    setIsOpen(false);
    setCargandoDatos(true);

    const matchNumeros = unidad.match(/\d+/);
    const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

    try {
      const token = getToken();
      if (!token) { navigate('/'); return; }

      const url = `http://127.0.0.1:8000/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const respuesta = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const resultado = await respuesta.json();

      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta'
        });
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta'
        });
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener'
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleZoneClick = (zonaLimpia) => {
    navigate(`/encierro/transporte/${tipoTransporte}/${selectedOption}/reporte/${zonaLimpia.replace(' ', '-')}`);
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || "Seleccione Unidad"}
        eyebrow={`${configActual.title} / Encierro — Detalle de Unidad`}
        hideLogos={true}
      />

      <main className="main-content">
        <div className="info-panel">
          <div className="dropdown-container">
            <button onClick={toggleDropdown} className="dropdown-trigger">
              <div className="dropdown-trigger__icon-container">
                <img src={configActual.image} alt={configActual.title} className="dropdown-trigger__icon" />
              </div>
              <span className="dropdown-trigger__value">{selectedOption || "Opción"}</span>
              <span className="dropdown-trigger__label">{configActual.title}</span>
              <div className={`dropdown-trigger__arrow ${isOpen ? 'dropdown-trigger__arrow--open' : ''}`}>
                <svg className="arrow-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-menu__scroll">
                  {cargandoUnidades ? (
                    <div className="p-4 text-center" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)' }}></span>
                      Cargando unidades...
                    </div>
                  ) : unidadesList.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No hay unidades disponibles</div>
                  ) : (
                    unidadesList.map((unidad) => (
                      <button
                        key={unidad}
                        onClick={() => handleSelectUnit(unidad)}
                        className="dropdown-menu__item"
                      >
                        {unidad}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedOption ? (
            <div className="data-grid">
              <div className="data-item">
                <h3 className="data-item__label">Tipo de Transporte</h3>
                <p className="data-item__value">{configActual.title}</p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Número ECO</h3>
                <p className="data-item__value">{selectedOption}</p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Conductor Asignado</h3>
                <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center' }}>
                  {cargandoDatos ? <><span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span> Buscando...</> : datosOperativos.conductor}
                </p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Ruta Asignada</h3>
                <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.8 : 1, display: 'flex', alignItems: 'center' }}>
                  {cargandoDatos ? <><span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '0.875rem', height: '0.875rem' }}></span> Buscando...</> : datosOperativos.ruta}
                </p>
              </div>
            </div>
          ) : (
            <div className="info-panel__placeholder">
              <p>Despliega el botón "Opción" para seleccionar una unidad y comenzar el registro de encierro.</p>
            </div>
          )}
        </div>

        {selectedOption && (
          <div className="zones-section">
            <div className="zones-section__header">
              <h2 className="zones-section__eyebrow">Áreas de Inspección — Encierro</h2>
              <h1 className="zones-section__title">Seleccione la zona a reportar</h1>
              <p className="zones-section__subtitle">Toque una imagen para abrir el formulario de encierro de esa zona del vehículo</p>
            </div>

            <div className="zones-grid">
              <button onClick={() => handleZoneClick('Costado Izquierdo')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Izquierdo" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">←</span> Costado Izquierdo</div>
                  <p className="zone-card__description">Vista lateral izquierda del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Costado Derecho')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Derecho" className="zone-card__image zone-card__image--flipped" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">→</span> Costado Derecho</div>
                  <p className="zone-card__description">Vista lateral derecha del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Frente')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.frente} alt="Frente" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">↑</span> Frente</div>
                  <p className="zone-card__description">Vista frontal del vehículo</p>
                </div>
              </button>

              <button onClick={() => handleZoneClick('Parte Trasera')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.trasera} alt="Parte Trasera" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">↓</span> Parte Trasera</div>
                  <p className="zone-card__description">Vista trasera del vehículo</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
