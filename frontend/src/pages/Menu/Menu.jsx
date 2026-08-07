// src/pages/Menu/Menu.jsx
import { useNavigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Header from '../../components/Header/Header';
import './Menu.css';

const menuItems = [
  {
    id: 'despacho',
    redirectTo: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: 'DESPACHO DASHBOARD',
    color: 'maroon',
  },
  {
    id: 'general',
    redirectTo: '/general',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 8h10" />
        <path d="M7 12h10" />
        <path d="M7 16h6" />
      </svg>
    ),
    label: 'GENERAL',
    color: 'orange',
  },
  {
    id: 'encierro',
    redirectTo: '/encierro/dashboard', 
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    label: 'ENCIERRO DASHBOARD',
    color: 'gold',
  },
  {
    id: 'capturista',
    redirectTo: '/cargar-excel', 
    roles: ['ADMINISTRADOR', 'CAPTURISTA', 'RELEVOS'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    label: 'CAPTURISTA',
    color: 'green',
  },
  {
    id: 'relevos',
    redirectTo: '/cargar-excel',
    roles: ['ADMINISTRADOR', 'CAPTURISTA', 'RELEVOS'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M7 21.9l-4-4 4-4" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    ),
    label: 'RELEVOS',
    color: 'teal',
  },
  {
    id: 'mantenimiento',
    redirectTo: '/mantenimiento',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
      </svg>
    ),
    label: 'MANTENIMIENTO',
    color: 'brown',
  },
  {
    id: 'centro',
    redirectTo: '/centro-control',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'CENTRO DE CONTROL',
    color: 'blue',
  },
  {
    id: 'historial',
    redirectTo: '/historial', 
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    label: 'HISTORIAL',
    color: 'orange',
  },
  {
    id: 'titan',
    redirectTo: '/titan/dashboard', 
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
    label: 'TITÁN',
    color: 'maroon',
  },
  {
    id: 'infraccion',
    redirectTo: '/infraccion/dashboard',
    roles: ['ADMINISTRADOR', 'INFRACCION'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
    label: 'INFRACCIÓN',
    color: 'red',
  },
  // ========== CAMBIO: PLATAFORMA → MESA DE CONTROL ==========
  {
    id: 'mesa-control',          // antes 'plataforma'
    redirectTo: '/mesa-control', // antes '/dashboard'
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    ),
    label: 'MESA DE CONTROL',   // antes 'PLATAFORMA DASHBOARD'
    color: 'blue',
  },
  // ========================================================
  {
    id: 'operadores',
    redirectTo: '/operadores',
    roles: ['ADMINISTRADOR', 'GESTOR_OPERADORES', 'DESPACHO'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'GESTIÓN DE OPERADORES',
    color: 'gold',
  }
];

export default function Menu() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    if (!['ADMINISTRADOR', 'DESPACHO', 'GENERAL', 'TITAN', 'PLATAFORMA', 'INFRACCION', 'GESTOR_OPERADORES', 'RELEVOS', 'REVELOS', 'CAPTURISTA'].includes(user.role?.codigo)) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role?.codigo);
  });

  const handleClick = (item) => {
    // Ya no necesitamos setear dashboardMode para plataforma, pero mantenemos la lógica para despacho
    if (item.id === 'despacho') {
      localStorage.setItem('dashboardMode', 'DESPACHO');
    } else if (item.id === 'mesa-control') {
      localStorage.setItem('dashboardMode', 'PLATAFORMA'); // opcional
    }

    // Vista previa de rol: RELEVOS y CAPTURISTA
    if (item.id === 'relevos') {
      sessionStorage.setItem('vistaPreview', 'RELEVOS');
    } else if (item.id === 'capturista') {
      sessionStorage.removeItem('vistaPreview');
    }

    if (item.redirectTo) {
      navigate(item.redirectTo);
    } else {
      console.warn('Ítem sin redirección:', item.label);
    }
  };

  return (
    <div className="menu-page">
      <Header hideBackButton={true} />

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2 className="dashboard-heading">Menú administrativo</h2>
        </div>

        <div className="dashboard-grid">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              className={`dashboard-card dashboard-card--${item.color}`}
              onClick={() => handleClick(item)}
            >
              <div className="dashboard-card__icon" aria-hidden="true">
                {item.icon}
              </div>
              <div className="dashboard-card__body">
                <span className="dashboard-card__label">{item.label}</span>
                <span className="dashboard-card__desc">{item.description}</span>
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