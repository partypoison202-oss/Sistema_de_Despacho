import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext, getDefaultRoute } from '../../context/AuthContext';
import GlobalClock from '../../components/GlobalClock/GlobalClock';
import Swal from 'sweetalert2';
import './Login.css';
import API_BASE from '../../config/api';

// ── Logo STM — T abstracta oficial (Sitmah-Flotilla) ──
function LogoSTM({ className = '' }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 400 600"
            className={className}
        >
            {/* Barra horizontal (parte superior-derecha) */}
            <rect x="130" y="20" width="270" height="110" fill="#c2a165" />
            {/* Cuadrado izquierdo */}
            <rect x="30" y="130" width="100" height="100" fill="#c2a165" />
            {/* Tronco + arco inferior */}
            <path
                d="M 130 230
                   L 130 400
                   A 150 150 0 0 0 280 550
                   L 400 550
                   L 400 430
                   L 280 430
                   A 30 30 0 0 1 250 400
                   L 250 230
                   Z"
                fill="#c2a165"
            />
        </svg>
    );
}

// ── Ícono: ojo abierto (mostrar contraseña) ──
function IconEye({ className = '' }) {
    return (
        <svg
            className={className}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

// ── Ícono: ojo tachado (ocultar contraseña) ──
function IconEyeOff({ className = '' }) {
    return (
        <svg
            className={className}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A11 11 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-3.19 4.19M6.61 6.61A13.5 13.5 0 0 0 1 12s4 7 11 7a10.7 10.7 0 0 0 5.39-1.61" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirección automática si ya hay sesión
  useEffect(() => {
    if (!loading && user) {
      navigate(getDefaultRoute(user));
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Usuario requerido',
        text: 'Por favor, debes poner tu nombre de usuario.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    if (!password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña requerida',
        text: 'Por favor, debes poner tu contraseña.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          usuario: username,
          contrasena: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error de acceso',
          text: data.message || 'Usuario o contraseña incorrectos',
          confirmButtonColor: '#c5a059'
        });
        setIsSubmitting(false);
        return;
      }

      // Guardar sesión
      login(data.user, data.access_token, rememberMe);
      
      // Redirigir según módulos o rol
      const route = getDefaultRoute(data.user);
      navigate(route);
      
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor'
      });
      setIsSubmitting(false);
    }
  };
  // Detecta si Bloq Mayús está activado durante el tecleo
  const checkCapsLock = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="login-wrapper">
      <GlobalClock className="absolute top-4 right-4 hidden lg:flex" />
      <div className="login-split">
        {/* PANEL IZQUIERDO (Branding de Sitmah) - Visible solo en Desktop */}
        <div className="login-split__left">
            <LogoSTM className="login-split__logo" />
            <h1 className="login-split__brand-title">
                Sistema de Transporte<br />Metropolitano
            </h1>
            <div className="login-split__brand-divider" />
            <p className="login-split__brand-subtitle">
                SITMAH
            </p>
        </div>

        {/* PANEL DERECHO (Formulario y Tarjeta Móvil) */}
        <div className="login-split__right">
          <main className="login__main">
            <div className="login__card">
              
              {/* Imagen que solo se muestra en móvil para conservar el diseño actual */}
              <img
                src={headerConfig.image}
                alt={headerConfig.alt}
                className="login__mobile-brand-image"
              />

              <div className="login__header">
                  <h2 className="login__title">Bienvenido</h2>
                  <p className="login__subtitle">Ingresa tu usuario y contraseña para continuar</p>
              </div>

              <form className="login__form" onSubmit={handleLogin}>
                <div className="login__field">
                  <label htmlFor="username">Usuario</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        if (errorUsuario) setErrorUsuario('');
                    }}
                    placeholder="Ingrese su usuario"
                    disabled={isSubmitting}
                    className={errorUsuario ? "border-red-500" : ""}
                  />
                  {errorUsuario && <span className="text-red-500 text-xs font-semibold mt-1">{errorUsuario}</span>}
                </div>

                <div className="login__field">
                  <div className="login__field-header">
                      <label htmlFor="password">Contraseña</label>
                  </div>

                  <div className="login__password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorPassword) setErrorPassword('');
                      }}
                      onKeyUp={checkCapsLock}
                      onKeyDown={checkCapsLock}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      className={errorPassword ? "border-red-500" : ""}
                    />
                    <button
                      type="button"
                      className="login__password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>

                  {errorPassword && <span className="text-red-500 text-xs font-semibold mt-1">{errorPassword}</span>}
                  {capsLockOn && (
                    <span className="login__caps-warning">
                      ⚠ Bloq Mayús está activado
                    </span>
                  )}
                </div>

                <div className="login__remember">
                  <label className="login__remember-label">
                    <input 
                      type="checkbox" 
                      className="login__remember-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span>Mantener sesión activa</span>
                  </label>
                </div>

                <button type="submit" className="login__submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="login__spinner"></span> Ingresando...
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>
              
              <p className="login__footer-text">
                  SITMAH &copy; {new Date().getFullYear()}
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}