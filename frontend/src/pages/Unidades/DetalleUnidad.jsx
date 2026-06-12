// src/pages/Unidades/DetalleUnidad.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import './DetalleUnidad.css'; // Un solo CSS para las tres pantallas

export default function DetalleUnidad() {
  const { tipoTransporte } = useParams(); // 👈 Detecta el ID desde la URL (urbanus, zafiro, vagoneta)
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  // 1. Buscamos la configuración del transporte actual
  const configActual = transportModules.find(m => m.id === tipoTransporte);

  // Si alguien escribe una URL rara, lo mandamos al dashboard
  if (!configActual) {
    return <div className="p-8">Transporte no encontrado. <button onClick={() => navigate('/')}>Volver</button></div>;
  }

  // 2. Genera las unidades dinámicamente según el límite del transporte (ej. ECO042 o VAN020)
  const unidadesMock = Array.from({ length: configActual.totalUnidades }, (_, index) => {
    const numero = String(index + 1).padStart(3, '0');
    return `${configActual.prefijoEco}${numero}`;
  });

  // 3. Simulación de los datos del "Excel" (Esto cambiará cuando importes la librería de lectura de Excel)
  const informacionUnidades = {
    tipo: configActual.title,
    eco: selectedOption,
    conductor: 'Carlos Mendoza Ríos',
    ruta: 'Ruta 12 — Centro / Venta Prieta',
    fecha: '09 de junio de 2026'
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelectUnit = (unidad) => {
    setSelectedOption(unidad);
    setIsOpen(false);
  };

  // 🚀 Función modificada para redirigir dinámicamente al formulario con todo el contexto
  const handleZoneClick = (zonaLimpia) => {
    // Redirige pasando el tipo, el ECO seleccionado y la zona (ej: /transporte/urbanus/ECO001/reporte/Costado-Izquierdo)
    navigate(`/transporte/${tipoTransporte}/${selectedOption}/reporte/${zonaLimpia.replace(' ', '-')}`);
  };

  return (
    <div className="layout-container">
      {/* HEADER PRINCIPAL */}
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
          <span className="badge badge--outline">En Operación</span>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        
        {/* PANEL SUPERIOR */}
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
                <p className="data-item__value">{informacionUnidades.tipo}</p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Número ECO</h3>
                <p className="data-item__value">{informacionUnidades.eco}</p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Conductor Asignado</h3>
                <p className="data-item__value">{informacionUnidades.conductor}</p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Ruta Asignada</h3>
                <p className="data-item__value">{informacionUnidades.ruta}</p>
              </div>
              <div className="data-item">
                <h3 className="data-item__label">Fecha de Inspección</h3>
                <p className="data-item__value">{informacionUnidades.fecha}</p>
              </div>
            </div>
          ) : (
            <div className="info-panel__placeholder">
              <p>Despliega el botón "Opción" para seleccionar una unidad y ver los detalles de inspección.</p>
            </div>
          )}
        </div>

        {/* ÁREAS DE INSPECCIÓN DINÁMICAS */}
        {selectedOption && (
          <div className="zones-section">
            <div className="zones-section__header">
              <h2 className="zones-section__eyebrow">Áreas de Inspección</h2>
              <h1 className="zones-section__title">Seleccione la zona a reportar</h1>
              <p className="zones-section__subtitle">Toque una imagen para abrir el formulario de reporte de esa zona del vehículo</p>
            </div>

            <div className="zones-grid">
              {/* Costado Izquierdo */}
              <button onClick={() => handleZoneClick('Costado Izquierdo')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Izquierdo" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">←</span> Costado Izquierdo</div>
                  <p className="zone-card__description">Vista lateral izquierda del vehículo</p>
                </div>
              </button>

              {/* Costado Derecho (Espejeado) */}
              <button onClick={() => handleZoneClick('Costado Derecho')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.lateral} alt="Costado Derecho" className="zone-card__image zone-card__image--flipped" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">→</span> Costado Derecho</div>
                  <p className="zone-card__description">Vista lateral derecha del vehículo</p>
                </div>
              </button>

              {/* Frente */}
              <button onClick={() => handleZoneClick('Frente')} className="zone-card">
                <div className="zone-card__image-container">
                  <img src={configActual.imagenesZonas.frente} alt="Frente" className="zone-card__image" />
                </div>
                <div className="zone-card__footer">
                  <div className="zone-card__title"><span className="zone-card__arrow">↑</span> Frente</div>
                  <p className="zone-card__description">Vista frontal del vehículo</p>
                </div>
              </button>

              {/* Parte Trasera */}
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