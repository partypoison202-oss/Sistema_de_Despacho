// src/pages/Unidades/components/detalleunidad/ZoneSelector.jsx
import React from 'react';

export default function ZoneSelector({ configActual, onZoneClick }) {
  return (
    <div className="zones-section">
      <div className="zones-section__header">
        <h2 className="zones-section__eyebrow">Áreas de Inspección</h2>
        <h1 className="zones-section__title">Seleccione la zona a reportar</h1>
        <p className="zones-section__subtitle">Toque una imagen para abrir el formulario de reporte de esa zona del vehículo</p>
      </div>

      <div className="zones-grid">
        <button onClick={() => onZoneClick('Costado Izquierdo')} className="zone-card">
          <div className="zone-card__image-container">
            <img src={configActual.imagenesZonas.lateral} alt="Costado Izquierdo" className="zone-card__image" />
          </div>
          <div className="zone-card__footer">
            <div className="zone-card__title">
              <span className="zone-card__arrow">←</span> Costado Izquierdo
            </div>
            <p className="zone-card__description">Vista lateral izquierda del vehículo</p>
          </div>
        </button>

        <button onClick={() => onZoneClick('Costado Derecho')} className="zone-card">
          <div className="zone-card__image-container">
            <img src={configActual.imagenesZonas.lateral} alt="Costado Derecho" className="zone-card__image zone-card__image--flipped" />
          </div>
          <div className="zone-card__footer">
            <div className="zone-card__title">
              <span className="zone-card__arrow">→</span> Costado Derecho
            </div>
            <p className="zone-card__description">Vista lateral derecha del vehículo</p>
          </div>
        </button>

        <button onClick={() => onZoneClick('Frente')} className="zone-card">
          <div className="zone-card__image-container">
            <img src={configActual.imagenesZonas.frente} alt="Frente" className="zone-card__image" />
          </div>
          <div className="zone-card__footer">
            <div className="zone-card__title">
              <span className="zone-card__arrow">↑</span> Frente
            </div>
            <p className="zone-card__description">Vista frontal del vehículo</p>
          </div>
        </button>

        <button onClick={() => onZoneClick('Parte Trasera')} className="zone-card">
          <div className="zone-card__image-container">
            <img src={configActual.imagenesZonas.trasera} alt="Parte Trasera" className="zone-card__image" />
          </div>
          <div className="zone-card__footer">
            <div className="zone-card__title">
              <span className="zone-card__arrow">↓</span> Parte Trasera
            </div>
            <p className="zone-card__description">Vista trasera del vehículo</p>
          </div>
        </button>
      </div>
    </div>
  );
}