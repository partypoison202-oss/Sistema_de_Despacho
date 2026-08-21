import { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
import AjustesModal from './AjustesModal';
import UserAvatar from '../UserAvatar/UserAvatar';
import Swal from 'sweetalert2';
import './Header.css';

export default function Header({ title, eyebrow, hideLogos, hideBackButton = false, hasUnsavedChanges = false, onSaveAndExit = null }) {
  const { user, logout } = useContext(AuthContext);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAjustes, setShowAjustes] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmExit = (onConfirm) => {
    if (hasUnsavedChanges) {
      Swal.fire({
        title: 'Cambios sin guardar',
        text: 'Tienes cambios pendientes en la programación operativa. ¿Qué deseas hacer antes de salir?',
        icon: 'warning',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: '#1e7145',
        denyButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Guardar y salir',
        denyButtonText: 'Descartar y salir',
        cancelButtonText: 'Permanecer aquí'
      }).then(async (result) => {
        if (result.isConfirmed) {
          if (onSaveAndExit) {
            const saved = await onSaveAndExit();
            if (saved) onConfirm();
          } else {
            onConfirm();
          }
        } else if (result.isDenied) {
          onConfirm();
        }
      });
    } else {
      onConfirm();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackClick = () => {
    if (location.pathname === '/general') {
      navigate(user?.role?.codigo === 'ADMINISTRADOR' ? '/menu' : '/general');
      return;
    }

    if (location.pathname.startsWith('/despacho/')) {
      navigate('/general');
      return;
    }

    if (location.pathname === '/cargar-excel') {
      navigate('/menu');
      return;
    }

    if (location.pathname === '/mantenimiento' || location.pathname === '/encierro/dashboard' || location.pathname === '/carga-combustible') {
      navigate('/menu');
      return;
    }

    navigate(-1);
  };

  const handleHomeClick = () => {
    if (!user) {
      navigate('/');
      return;
    }
    const role = user.role?.codigo;
    if (role === 'ADMINISTRADOR' || role === 'PROGRAMACION' || role === 'CARGA_DE_COMBUSTIBLE') {
      navigate('/menu');
    } else if (role === 'SISTEMAS') {
      navigate('/cargar-excel');
    } else if (role === 'ENCIERRO') {
      navigate('/encierro/dashboard');
    } else if (role === 'CENTRO_CONTROL') {
      navigate('/centro-control');
    } else if (role === 'GENERAL') {
      navigate('/general');
    } else if (role === 'TITAN') {
      navigate('/titan/dashboard');
    } else if (role === 'INFRACCION') {
      navigate('/infraccion/dashboard');
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
    if (user.role?.codigo === 'ADMINISTRADOR' || user.role?.codigo === 'PROGRAMACION' || user.role?.codigo === 'CARGA_DE_COMBUSTIBLE') {
      showBackButton = location.pathname !== '/menu';
    } else {
      const isDashboard = location.pathname === '/dashboard' ||
                          location.pathname === '/encierro/dashboard' ||
                          location.pathname === '/centro-control' ||
                          location.pathname === '/cargar-excel' ||
                          location.pathname === '/general' ||
                          location.pathname === '/titan/dashboard' ||
                          location.pathname === '/infraccion/dashboard' ||
                          location.pathname === '/mantenimiento' ||
                          location.pathname === '/carga-combustible';
      showBackButton = !isDashboard;
    }
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        
        {/* Left Section: Back Button */}
        <div className="app-header__left">
          {showBackButton && (
            <button
              type="button"
              className="app-header__back-btn"
              onClick={() => handleConfirmExit(handleBackClick)}
              title="Regresar"
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          {!hideLogos && (
            <button
              type="button"
              className="app-header__brand"
              onClick={() => handleConfirmExit(handleHomeClick)}
              aria-label="Ir al inicio"
              style={{ cursor: 'pointer' }}
            >
              <img
                src={headerConfig.image}
                alt={headerConfig.alt}
                className="app-header__brand-logo-1"
              />
            </button>
          )}
        </div>
        
        {/* Center Section: Logo SITMAH */}
        <div className="app-header__center">
          <button
            type="button"
            className="app-header__brand"
            onClick={() => handleConfirmExit(handleHomeClick)}
            aria-label="Ir al inicio"
            style={{ cursor: 'pointer' }}
          >
            <img
              src="/images/sitmah_logo.webp"
              alt="Logo SITMAH"
              className="app-header__brand-logo-2"
            />
          </button>
        </div>

        {/* Right Section: Profile Dropdown */}
        <div className="app-header__right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <div className="app-header__profile" ref={profileRef}>
              <button 
                className="app-header__profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <UserAvatar fotoUrl={user.foto_url} nombre={user.nombre_completo} size={40} />
              </button>

              {showProfileMenu && (
                <div className="app-header__profile-menu">
                  <div className="profile-info">
                    <span className="profile-name">{user.nombre_completo}</span>
                    <span className="profile-username">@{user.usuario}</span>
                    <span className="profile-role">{user.role.nombre}</span>
                  </div>
                  <hr />
                  <button className="profile-menu-btn" onClick={() => {
                    setShowProfileMenu(false);
                    setShowAjustes(true);
                  }}>
                    Ajustes
                  </button>
                  {['ADMINISTRADOR', 'GESTOR_OPERADORES', 'DESPACHO'].includes(user.role.codigo) && (
                    <>
                      <button className="profile-menu-btn" onClick={() => {
                        handleConfirmExit(() => {
                          setShowProfileMenu(false);
                          navigate('/operadores');
                        });
                      }}>
                        Gestión de T6
                      </button>
                      <button className="profile-menu-btn" onClick={() => {
                        handleConfirmExit(() => {
                          setShowProfileMenu(false);
                          navigate('/maniobristas');
                        });
                      }}>
                        Gestión de Maniobristas
                      </button>
                    </>
                  )}
                  {user.role.codigo === 'ADMINISTRADOR' && (
                    <button className="profile-menu-btn" onClick={() => {
                      handleConfirmExit(() => {
                        setShowProfileMenu(false);
                        navigate('/usuarios');
                      });
                    }}>
                      Gestión de Usuarios
                    </button>
                  )}
                  <button className="profile-menu-btn logout-btn" onClick={() => handleConfirmExit(handleLogout)}>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
      </div>
      
      {showAjustes && <AjustesModal onClose={() => setShowAjustes(false)} />}
    </header>
  );
}