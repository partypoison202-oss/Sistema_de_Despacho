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
    modulo: 'despacho',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
    label: 'MESA DE CONTROL DASHBOARD',
    color: 'maroon',
  },
  {
    id: 'general',
    redirectTo: '/general',
    modulo: 'general',
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
    modulo: 'encierro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21v-8h6v8" />
      </svg>
    ),
    label: 'MANTENIMIENTO DASHBOARD',
    color: 'gold',
  },
  {
    id: 'capturista',
    redirectTo: '/cargar-excel', 
    modulo: 'capturista',
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
    modulo: 'relevos',
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
    modulo: 'mantenimiento',
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
    modulo: 'centro_control',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    label: 'CENTRO DE CONTROL',
    color: 'blue',
  },
  {
    id: 'historial',
    redirectTo: '/historial', 
    modulo: 'historial',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
    label: 'HISTORIAL',
    color: 'orange',
  },
  {
    id: 'titan',
    redirectTo: '/titan/dashboard', 
    modulo: 'titan',
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
    modulo: 'infraccion',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    ),
    label: 'INFRACCIÓN',
    color: 'red',
  },
  // ========== CAMBIO: PLATAFORMA → MESA DE CONTROL ==========
  {
    id: 'mesa-control',          // antes 'plataforma'
    redirectTo: '/mesa-control', // antes '/dashboard'
    modulo: 'mesa_control',
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
    modulo: 'operadores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M13 14c-2.7 0-4 1.3-4 1.3v1.7h8v-1.7s-1.3-1.3-4-1.3z" />
        <line x1="15" y1="9" x2="19" y2="9" />
        <line x1="15" y1="11" x2="19" y2="11" />
      </svg>
    ),
    label: 'GESTIÓN DE T6',
    color: 'gold',
  },
  {
    id: 'maniobristas',
    redirectTo: '/maniobristas',
    modulo: 'maniobristas',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <circle cx="19" cy="11" r="2" />
        <path d="M19 6v3" />
        <path d="M19 13v3" />
        <path d="M22 11h-1" />
        <path d="M17 11h-1" />
        <path d="M16.9 8.9l.7.7" />
        <path d="M21.4 13.4l-.7-.7" />
        <path d="M21.4 8.9l-.7.7" />
        <path d="M16.9 13.4l.7-.7" />
      </svg>
    ),
    label: 'GESTIÓN DE MANIOBRISTAS',
    color: 'orange',
  },
  {
    id: 'carga-combustible',
    redirectTo: '/carga-combustible',
    modulo: 'carga_combustible',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="22" x2="21" y2="22" />
        <line x1="4" y1="9" x2="14" y2="9" />
        <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
        <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
      </svg>
    ),
    label: 'CARGA DE COMBUSTIBLE',
    color: 'teal',
  }
];

const MENU_MODULES_CONFIG = {
  'MESA DE CONTROL DASHBOARD': 'MESA DE CONTROL',
  'GENERAL': 'MONITOR OPERATIVO',
  'MANTENIMIENTO DASHBOARD': 'MANTENIMIENTO PARQUE VEHICULAR',
  'CAPTURISTA': 'PROGRAMACIÓN Y LOGÍSTICA',
  'RELEVOS': 'RELEVOS DE T6',
  'MANTENIMIENTO': 'MANTENIMIENTO PARQUE VEHICULAR',
  'CENTRO DE CONTROL': 'MONITOREO DE LA OPERACIÓN',
  'HISTORIAL': 'HISTÓRICO DE LA OPERACIÓN',
  'TITÁN': 'INSPECTORES DE OPERACIÓN',
  'MESA DE CONTROL': 'MESA DE CONTROL',
  'GESTIÓN DE T6': 'CONTROL DE PERSONAS CONDUCTORAS',
  'GESTIÓN DE MANIOBRISTAS': 'GESTIÓN DE MANIOBRISTAS',
  'CARGA DE COMBUSTIBLE': 'CONTROL DE COMBUSTIBLE',
  'INFRACCIÓN': 'INFRACCIÓN'
};

export default function Menu() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    
    const rol = user.role?.codigo;
    const modulos = user.modulos || [];
    
    // Si no es admin/lectura y no tiene modulos, kick
    if (rol !== 'ADMINISTRADOR' && rol !== 'LECTURA' && modulos.length === 0) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  const rol = user.role?.codigo;
  const modulos = user.modulos || [];
  const isSuper = rol === 'ADMINISTRADOR' || rol === 'LECTURA';

  const visibleMenuItems = menuItems.filter((item) => {
    if (isSuper) return true;
    if (!item.modulo) return true;
    return modulos.includes(item.modulo);
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
          <h2 className="dashboard-heading">
            {user?.role?.codigo === 'ADMINISTRADOR'
              ? 'Menú administrativo'
              : user?.role?.codigo === 'CARGA_DE_COMBUSTIBLE'
                ? 'Menú de carga de combustible'
                : 'Menú de programación'}
          </h2>
        </div>

        <div className="menu-dashboard-grid">
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
                <span className="dashboard-card__label">{MENU_MODULES_CONFIG[item.label] || item.label}</span>
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