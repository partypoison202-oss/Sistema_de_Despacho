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
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'MESA_CONTROL', 'MESA_DE_CONTROL', 'PLATAFORMA'],
  },
  {
    id: 'historial-programacion',
    redirectTo: '/historial/programacion',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
      </svg>
    ),
    label: 'HISTORIAL PROGRAMACIÓN Y LOGÍSTICA',
    color: 'emerald',
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'PROGRAMACION', 'CAPTURISTA', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'MESA_CONTROL', 'MESA_DE_CONTROL', 'DESPACHO', 'PLATAFORMA'],
  },
  {
    id: 'historial-programacion-pasteles',
    redirectTo: '/historial/programacion-pasteles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2 1 2 1" />
        <path d="M2 21h20" />
        <path d="M7 8v3" />
        <path d="M12 8v3" />
        <path d="M17 8v3" />
      </svg>
    ),
    label: 'HISTORIAL PROGRAMACIÓN (PASTELES)',
    color: 'teal',
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'PASTELES', 'PROGRAMACION_PASTELES', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'MESA_CONTROL', 'MESA_DE_CONTROL', 'PLATAFORMA'],
  },
  {
    id: 'historial-relevos',
    redirectTo: '/historial/relevos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M7 21.9l-4-4 4-4" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    ),
    label: 'HISTORIAL DE RELEVOS',
    color: 'blue',
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'PROGRAMACION', 'CAPTURISTA', 'RELEVOS', 'PASTELES', 'PROGRAMACION_PASTELES', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'MESA_CONTROL', 'MESA_DE_CONTROL', 'PLATAFORMA'],
  },
  {
    id: 'historial-conductores',
    redirectTo: '/historial/conductores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'HISTORIAL DE CONDUCTORES',
    color: 'maroon',
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'GESTOR_OPERADORES', 'CONTROL_CONDUCTORES', 'PROGRAMACION', 'PASTELES', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'MESA_CONTROL', 'MESA_DE_CONTROL', 'DESPACHO', 'PLATAFORMA'],
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
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'MANTENIMIENTO'],
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
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'DESPACHO'],
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
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'ENCIERRO'],
  },
  {
    id: 'historial-reportes-titanes',
    redirectTo: '/historial/reportes-titanes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
    label: 'HISTORIAL REPORTES TITANES',
    color: 'purple',
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL'],
  },
  {
    id: 'historial-mantenimiento',
    redirectTo: '/historial/mantenimiento',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    label: 'HISTORIAL MANTENIMIENTO',
    color: 'emerald',
    allowedRoles: ['ADMINISTRADOR', 'LECTURA', 'MANTENIMIENTO'],
  }
];

export default function MenuHistorial() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const rol = String(user?.role?.codigo || '').toUpperCase().trim();
  const isSuper = rol === 'ADMINISTRADOR' || rol === 'LECTURA';

  const visibleItems = historialItems.filter((item) => {
    if (isSuper) return true;
    return item.allowedRoles.includes(rol);
  });

  useEffect(() => {
    if (!user) return;
    if (visibleItems.length === 0) {
      navigate('/menu');
    }
  }, [user, visibleItems.length, navigate]);

  return (
    <div className="dashboard-container">
      <Header hideBackButton={false} />

      <main className="dashboard-main">
        <div className="page-header-container">
          <p className="page-eyebrow">SELECCIONE EL MÓDULO</p>
          <h1 className="page-title">HISTÓRICO DE LA OPERACIÓN</h1>
        </div>

        <div className="menu-dashboard-grid">
          {visibleItems.map((item) => (
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
