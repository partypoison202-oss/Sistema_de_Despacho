// src/pages/Unidades/DetalleUnidad.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import './DetalleUnidad.css';

export default function DetalleUnidad() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...'
  });
  const [cargandoDatos, setCargandoDatos] = useState(false);

  const configActual = transportModules.find(m => m.id === tipoTransporte);
  if (!configActual) {
    return <div className="p-8">Transporte no encontrado. <button onClick={() => navigate('/')}>Volver</button></div>;
  }

  // Genera las unidades con prefijo "ECO" fijo
  const getUnidadesList = () => {
    const PREFIJO_FIJO = 'ECO';

    if (tipoTransporte === 'zafiro') {
      return Array.from({ length: 38 }, (_, i) => `${PREFIJO_FIJO}${100 + i}`); // 100..137
    }
    if (tipoTransporte === 'vagoneta') {
      return Array.from({ length: 60 }, (_, i) => `${PREFIJO_FIJO}${200 + i}`); // 200..259
    }
    // Urbanus y otros
    return Array.from({ length: configActual.totalUnidades }, (_, i) => {
      const numero = String(i + 1).padStart(3, '0');
      return `${PREFIJO_FIJO}${numero}`;
    });
  };

  const unidadesMock = getUnidadesList();

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectUnit = async (unidad) => {
    setSelectedOption(unidad);
    setIsOpen(false);
    setCargandoDatos(true);

    const matchNumeros = unidad.match(/\d+/);
    const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

    try {
      const url = `http://localhost:8000/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      console.log("Consultando URL:", url); // 👈 LOG 1

      const respuesta = await fetch(url);
      const resultado = await respuesta.json();

      console.log("Respuesta completa:", resultado); // 👈 LOG 2

      // Verificar si la respuesta contiene los datos esperados
      if (respuesta.ok && resultado.status === 'success') {
        // Aseguramos que los campos existan, incluso si están vacíos
        const conductorMostrar = resultado.conductor && resultado.conductor !== 'Sin conductor' 
                                  ? resultado.conductor 
                                  : 'No reportado hoy';
        const rutaMostrar = resultado.ruta && resultado.ruta !== 'Sin ruta asignada'
                              ? resultado.ruta
                              : 'Sin ruta';
        
        setDatosOperativos({
          conductor: conductorMostrar,
          ruta: rutaMostrar
        });
      } else {
        // Si el status no es success o hay otro problema
        console.warn("Respuesta con error o status no exitoso:", resultado);
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta'
        });
      }
    } catch (error) {
      console.error("Error en la petición:", error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener'
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleZoneClick = (zonaLimpia) => {
    navigate(`/transporte/${tipoTransporte}/${selectedOption}/reporte/${zonaLimpia.replace(' ', '-')}`);
  };

  return (
    <div className="layout-container">
      <header className="main-header">
        <div className="header__left">
          <button onClick={() => navigate('/')} className="back-button" aria-label="Volver">
            <svg className="back-button__icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <p className="header__eyebrow">{configActual.title} / Detalle de Unidad</p>
            <h1 className="header__title">{selectedOption || "Seleccione Unidad"}</h1>
          </div>
        </div>
        <div className="header__badges">
          <span className="badge badge--gold">{configActual.title}</span>
        </div>
      </header>

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
                  {unidadesMock.map((unidad) => (
                    <button key={unidad} onClick={() => handleSelectUnit(unidad)} className="dropdown-menu__item">
                      {unidad}
                    </button>
                  ))}
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
                <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.5 : 1 }}>
                  {cargandoDatos ? "Buscando..." : datosOperativos.conductor}
                </p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Ruta Asignada</h3>
                <p className="data-item__value" style={{ opacity: cargandoDatos ? 0.5 : 1 }}>
                  {cargandoDatos ? "Buscando..." : datosOperativos.ruta}
                </p>
              </div>
            </div>
          ) : (
            <div className="info-panel__placeholder">
              <p>Despliega el botón "Opción" para seleccionar una unidad y ver los detalles de inspección.</p>
            </div>
          )}
        </div>

        {selectedOption && (
          <div className="zones-section">
            <div className="zones-section__header">
              <h2 className="zones-section__eyebrow">Áreas de Inspección</h2>
              <h1 className="zones-section__title">Seleccione la zona a reportar</h1>
              <p className="zones-section__subtitle">Toque una imagen para abrir el formulario de reporte de esa zona del vehículo</p>
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