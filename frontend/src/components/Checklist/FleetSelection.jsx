import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import Header from '../../components/Header/Header';
import '../../pages/Menu/Menu.css';
import API_BASE from '../../config/api';




const colors = ['maroon', 'gold', 'blue', 'green', 'orange'];

export default function FleetSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const action = queryParams.get('action') || 'revisar';

  const [conteos, setConteos] = useState({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchConteos = async () => {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      if (!token) {
        navigate('/login');
        return;
      }
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
  }, [navigate]);

  return (
    <div className="dashboard-page">
      <Header hideBackButton={false} />
      
      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2 className="dashboard-heading">Selección de Económico</h2>
          <p className="dashboard-subheading">
            {action === 'hacer' 
              ? 'Elige el tipo de transporte para comenzar tu checklist'
              : 'Elige el tipo de transporte para revisar el historial'}
          </p>
        </div>

        <div className="dashboard-grid">
          {transportModules.map((modulo, index) => {
            const route = action === 'hacer' 
              ? `/checklist?tipoTransporte=${modulo.id}` 
              : `/checklist/historial?tipoTransporte=${modulo.id}`;
            const isCargando = cargando;
            const conteo = conteos?.[modulo.id] || 0;
            const colorClass = colors[index % colors.length];

            return (
              <button
                key={modulo.id}
                className={`dashboard-card dashboard-card--${colorClass}`}
                onClick={() => navigate(route)}
              >
                <div className="dashboard-card__icon" aria-hidden="true" style={{ background: 'transparent', width: '80px', height: '60px' }}>
                  <img 
                    src={modulo.image} 
                    alt={modulo.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                </div>
                
                <div className="dashboard-card__body">
                  <span className="dashboard-card__label">{modulo.title}</span>
                  <span className="dashboard-card__desc">
                    {modulo.subtitle} <br/>
                    <strong style={{ color: 'var(--color-maroon)' }}>
                      {isCargando ? '...' : `${conteo} unidades`}
                    </strong>
                  </span>
                </div>
                
                <div className="dashboard-card__arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
