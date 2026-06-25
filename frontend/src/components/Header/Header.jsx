import { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
import './Header.css';

export default function Header({ title, eyebrow, hideLogos, hideBackButton = false }) {
  const { user, logout } = useContext(AuthContext);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
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

  // Determine if we should show the back button
  const showBackButton = !hideBackButton && user && !['/', '/dashboard', '/encierro/dashboard', '/cargar-excel'].includes(location.pathname);

  return (
    <header className="app-header">
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
            <div className="app-header__brand">
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
            <div className="app-header__brand">
              <img 
                src="/images/sitmah_logo.png" 
                alt="Logo SITMAH" 
                className="app-header__brand-logo-2" 
              />
            </div>
          </div>
        )}

        {/* Right Section: Profile Dropdown */}
        <div className="app-header__right">
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
