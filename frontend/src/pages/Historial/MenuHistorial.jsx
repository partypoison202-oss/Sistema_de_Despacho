import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Header from '../../components/Header/Header';
import '../Menu/Menu.css';

const historialItems = [
  {
    id: 'historial-general',
    redirectTo: '/historial/general',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14v-8" />
        <path d="M15 9h6" />
      </svg>
    ),
    label: 'HISTORIAL GENERAL',
    color: 'blue',
  },
  {
    id: 'historial-checklist',
    redirectTo: '/checklist/historial',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    label: 'HISTORIAL CHECK LIST',
    color: 'orange',
  },
  {
    id: 'historial-despacho',
    redirectTo: '/historial/despacho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: 'HISTORIAL DESPACHO',
    color: 'maroon',
  },
  {
    id: 'historial-encierro',
    redirectTo: '/historial/encierro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    label: 'HISTORIAL ENCIERRO',
    color: 'gold',
  }
];

export default function MenuHistorial() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    if (!['ADMINISTRADOR', 'DESPACHO', 'GENERAL'].includes(user.role?.codigo)) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="dashboard-container">
      <Header hideBackButton={false} />

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2 className="dashboard-heading">Seleccione un <span className="text-highlight">Historial</span></h2>
        </div>

        <div className="dashboard-grid">
          {historialItems.map((item) => (
            <button
              key={item.id}
              className={`dashboard-card dashboard-card--${item.color}`}
              onClick={() => navigate(item.redirectTo)}
            >
              <div className="dashboard-card__icon">
                {item.icon}
              </div>
              <div className="dashboard-card__body">
                <span className="dashboard-card__label">{item.label}</span>
              </div>
              <div className="dashboard-card__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
