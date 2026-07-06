// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import API_BASE from '../../config/api';
import './DashboardGeneral.css';

export default function Dashboard() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchConteos = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setConteos(data);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchConteos();
  }, []);

  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard__main">
        <p className="dashboard__eyebrow">Seleccione el tipo de transporte</p>
        <h1 className="dashboard__title">Flota de Unidades</h1>
        <p className="dashboard__subtitle">
          Toque la imagen del transporte para ver la información de despacho
        </p>

        <div className="dashboard__grid">
          {transportModules.map((modulo) => (
            <TransportCard
              key={modulo.id}
              title={modulo.title}
              subtitle={modulo.subtitle}
              image={modulo.image}
              route={`/despacho/${modulo.id}`}
              cantidad={conteos[modulo.id] || 0}
              cargando={cargando}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
