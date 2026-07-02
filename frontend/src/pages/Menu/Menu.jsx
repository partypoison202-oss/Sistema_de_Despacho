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
    id: 'centro',
    redirectTo: '/centro-control',  // <--- CAMBIO AQUÍ
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
    id: 'checklist',
    redirectTo: '/checklist/historial', 
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    label: 'REVISAR CHECK LIST',
    color: 'orange',
  },
];

export default function Menu() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Redirige si no es administrador
  useEffect(() => {
    if (!user || user.role?.codigo !== 'ADMINISTRADOR') {
      navigate('/encierro/dashboard');
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleClick = (item) => {
    if (item.redirectTo) {
      navigate(item.redirectTo);
    } else {
      // Si no tiene redirectTo, mostrar un mensaje o no hacer nada
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
          {menuItems.map((item) => (
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