import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.role.codigo === 'CAPTURISTA') {
        navigate('/cargar-excel');
      } else if (user.role.codigo === 'ENCIERRO') {
        navigate('/encierro/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://192.168.1.174:8000/api/login', {
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

      login(data.user, data.access_token);
      
      if (data.user.role.codigo === 'CAPTURISTA') {
        navigate('/cargar-excel');
      } else if (data.user.role.codigo === 'ENCIERRO') {
        navigate('/encierro/dashboard');
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor'
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login">
      <main className="login__main">
        <div className="login__card">
          <img
            src={headerConfig.image}
            alt={headerConfig.alt}
            className="login__brand-image"
          />
          <h1 className="login__title">Iniciar Sesión</h1>
          <p className="login__subtitle">Ingrese sus credenciales para continuar</p>

          <form className="login__form" onSubmit={handleLogin}>
            <div className="login__field">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="login__field">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" className="login__submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner"></span> Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
