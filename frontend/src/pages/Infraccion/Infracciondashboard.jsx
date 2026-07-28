// src/pages/Infraccion/InfraccionDashboard.jsx
import React from 'react';
import Header from '../../components/Header/Header';
import './Infraccion.css';

const InfraccionDashboard = () => {
  return (
    <div className="infraccion-page">
      <Header title="Infracción" />

      <main className="infraccion-main">
        <div className="infraccion-welcome">
          <p className="infraccion-eyebrow">Módulo nuevo</p>
          <h1 className="infraccion-title">INFRACCIÓN</h1>
          <p className="infraccion-subtitle">
            Este módulo está en construcción. Aquí se agregará el formulario
            de registro de infracciones.
          </p>
        </div>
      </main>
    </div>
  );
};

export default InfraccionDashboard;