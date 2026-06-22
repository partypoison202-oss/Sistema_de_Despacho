// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import { transportModules } from '../../config/transportModules';
import './Dashboard.css';

export default function Dashboard() {
  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchConteos = async () => {
      // Obtenemos el token del localStorage
      const token = localStorage.getItem('token');

      try {
        const response = await fetch('http://127.0.0.1:8000/api/despacho/conteo-unidades', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // <--- AGREGADO: Autenticación necesaria
          }
        });

        if (response.ok) {
          const data = await response.json();
          setConteos(data);
        } else {
          console.error('Error al obtener conteos:', response.status);
          // Si es 401, el usuario probablemente perdió la sesión
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
          Toque la imagen del transporte para comenzar el registro
        </p>

        <div className="dashboard__grid">
          {transportModules.map((module) => {
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