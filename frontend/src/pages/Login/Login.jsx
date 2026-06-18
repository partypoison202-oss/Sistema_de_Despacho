import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { headerConfig } from '../../config/header';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Todavía no está conectado a la base de datos
    // Solo redirigimos al dashboard
    navigate('/dashboard');
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
