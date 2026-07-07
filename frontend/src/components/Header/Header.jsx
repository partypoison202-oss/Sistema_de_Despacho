import { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
import GlobalClock from '../GlobalClock/GlobalClock';
import './Header.css';

export default function Header({ title, eyebrow, hideLogos, hideBackButton = false }) {
  const { user, logout } = useContext(AuthContext);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  
  // Lógica para mostrar/ocultar el menú al hacer scroll
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Ocultar si bajamos más de 80px, mostrar si subimos
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('dark', 'light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleHomeClick = () => {
    if (!user) {
      navigate('/');
      return;
    }
    const role = user.role?.codigo;
    if (role === 'ADMINISTRADOR') {
      navigate('/menu');
    } else if (role === 'SISTEMAS') {
      navigate('/cargar-excel');
    } else if (role === 'ENCIERRO') {
      navigate('/encierro/dashboard');
    } else if (role === 'CENTRO_CONTROL') {
      navigate('/centro-control');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileRef]);

  let showBackButton = false;
  if (!hideBackButton && user && location.pathname !== '/') {
    if (user.role?.codigo === 'ADMINISTRADOR') {
      showBackButton = location.pathname !== '/menu';
    } else {
      const isDashboard = location.pathname === '/dashboard' || 
                          location.pathname === '/encierro/dashboard' || 
                          location.pathname === '/centro-control/dashboard' ||
                          location.pathname === '/cargar-excel';
      showBackButton = !isDashboard;
    }
  }

  return (
    <header className={`app-header ${!isVisible ? 'app-header--hidden' : ''}`}>
      <div className="app-header__inner">
        
        {/* Left Section: Back Button & Logo 1 */}
        <div className="app-header__left">
          {showBackButton && (
            <button 
              className="app-header__back-btn" 
              onClick={() => navigate(-1)}
              title="Regresar"
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          {hideLogos ? (
            <div className="app-header__text">
              {eyebrow && <p className="app-header__eyebrow">{eyebrow}</p>}
              {title && <h1 className="app-header__title">{title}</h1>}
            </div>
          ) : (
            <div className="app-header__brand" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
              <img 
                src={headerConfig.image} 
                alt={headerConfig.alt} 
                className="app-header__brand-logo-1"
              />
            </div>
          )}
        </div>
        
        {/* Center Section: Logo 2 */}
        {!hideLogos && (
          <div className="app-header__center">
            <div className="app-header__brand" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
              <img 
                src="/images/sitmah_logo.webp" 
                alt="Logo SITMAH" 
                className="app-header__brand-logo-2" 
              />
            </div>
          </div>
        )}

        {/* Right Section: Profile Dropdown */}
        <div className="app-header__right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <GlobalClock className="hidden lg:flex" />
          {user && (
            <div className="app-header__profile" ref={profileRef}>
              <button 
                className="app-header__profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="profile-icon">
                  {user.nombre_completo.charAt(0).toUpperCase()}
                </div>
              </button>

              {showProfileMenu && (
                <div className="app-header__profile-menu">
                  <div className="profile-info">
                    <span className="profile-name">{user.nombre_completo}</span>
                    <span className="profile-username">@{user.usuario}</span>
                    <span className="profile-role">{user.role.nombre}</span>
                  </div>
                  <hr />
                  {user.role.codigo === 'ADMINISTRADOR' && (
                    <button className="profile-menu-btn" onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/usuarios');
                    }}>
                      Gestión de Usuarios
                    </button>
                  )}
                  <button className="profile-menu-btn" onClick={() => {
                    setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');
                  }}>
                    Modo Oscuro: {theme === 'dark' ? 'Forzado' : theme === 'light' ? 'Apagado' : 'Automático'}
                  </button>
                  <button className="profile-menu-btn logout-btn" onClick={handleLogout}>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
      </div>
    </header>
  );
}