import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
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

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const { login, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirección automática si ya hay sesión
  useEffect(() => {
    if (!loading && user) {
      redirigirPorRol(user, navigate);
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
          title: 'Error de autenticación',
          text: data.message || 'Credenciales incorrectas'
        });
        setIsSubmitting(false);
        return;
      }

      // Guardar sesión
      login(data.user, data.access_token);
      
      // Redirigir según rol
      redirigirPorRol(data.user, navigate);
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor'
      });
      setIsSubmitting(false);
    }
  };

  // Función auxiliar para centralizar la redirección por rol
  const redirigirPorRol = (user, navigate) => {
    const rol = user.role?.codigo;
    if (rol === 'ADMINISTRADOR') {
      navigate('/menu');
    } else if (rol === 'CAPTURISTA') {
      navigate('/cargar-excel');
    } else if (rol === 'ENCIERRO') {
      navigate('/encierro/dashboard');
    } else if (rol === 'CENTRO_CONTROL') {
      navigate('/centro-control');
    } else if (rol === 'DESPACHO') {
      navigate('/dashboard');
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
                Gestión de Flotillas · Sitmah
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
                  <p className="login__subtitle">Ingresa tus credenciales para continuar</p>
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
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorPassword) setErrorPassword('');
                    }}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className={errorPassword ? "border-red-500" : ""}
                  />
                  {errorPassword && <span className="text-red-500 text-xs font-semibold mt-1">{errorPassword}</span>}
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
                  Sitmah · Gestión de Flotillas &copy; {new Date().getFullYear()}
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}