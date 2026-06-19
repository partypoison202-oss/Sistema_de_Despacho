import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
import './Header.css';

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className="app-header__inner">
        
        {/* LOGO 1: Ya no es un link */}
        <div className="app-header__brand">
          <img 
            src={headerConfig.image} 
            alt={headerConfig.alt} 
            className="app-header__brand-logo-1"
          />
        </div>
        
        {/* LOGO 2: Ya no es un link */}
        <div className="app-header__brand">
          <img 
            src="/images/sitmah_logo.png" 
            alt="Logo SITMAH" 
            className="app-header__brand-logo-2" 
          />
        </div>

        {/* Profile Dropdown */}
        {user && (
          <div className="app-header__profile">
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
    </header>
  );
}