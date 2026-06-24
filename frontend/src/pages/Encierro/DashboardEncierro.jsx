// src/pages/Encierro/DashboardEncierro.jsx
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { encierroModules } from '../../config/encierroModules';
import '../Dashboard/Dashboard.css';

export default function DashboardEncierro() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchConteos = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('http://127.0.0.1:8000/api/despacho/conteo-unidades', {
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
          Toque la imagen del transporte para comenzar el registro de encierro
        </p>

        <div className="dashboard__grid">
          {encierroModules.map((module) => {
            const cantidad = conteos[module.id] || 0;
            return (
              <TransportCard
                key={module.id}
                title={module.title}
                subtitle={module.subtitle}
                image={module.image}
                route={module.route}
                cantidad={cantidad}
                cargando={cargando}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
