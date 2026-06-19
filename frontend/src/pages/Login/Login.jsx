import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:8000/api/login', {
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
        return;
      }

      login(data.user, data.access_token);
      
      if (data.user.role.codigo === 'CAPTURISTA') {
        navigate('/cargar-excel');
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor'
      });
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
              />
            </div>

            <button type="submit" className="login__submit-btn">
              Ingresar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

