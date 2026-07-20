import { createContext, useState, useEffect, useRef } from 'react';
import API_BASE from '../config/api';
import Swal from 'sweetalert2';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('token') !== null;
  });
  const [loading, setLoading] = useState(true);

  const inactivityTimerRef = useRef(null);
  const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

  // Función para cerrar sesión por inactividad
  const logoutDueToInactivity = () => {
    console.log("Sesión expirada por inactividad");
    logout();
    Swal.fire({
      icon: 'info',
      title: 'Sesión expirada',
      text: 'Por tu seguridad, hemos cerrado la sesión debido a un periodo prolongado de inactividad.',
      confirmButtonColor: '#c5a059',
      confirmButtonText: 'Volver a iniciar sesión',
      allowOutsideClick: false
    });
  };

  const resetTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Solo activar el temporizador si NO está activo el "remember me" y hay token
    if (!rememberMe && token) {
      inactivityTimerRef.current = setTimeout(logoutDueToInactivity, TIMEOUT_MS);
    }
  };

  // Efecto para escuchar la inactividad
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    if (!rememberMe && token) {
      events.forEach(event => document.addEventListener(event, handleActivity));
      resetTimer(); // Iniciar la primera vez
    }

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [rememberMe, token]);

  useEffect(() => {
    if (token) {
      // Validate token and get user info
      fetch(`${API_BASE}/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error('Token invalido');
        return res.json();
      })
      .then(data => {
        setUser(data);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, authToken, isRememberMe = false) => {
    setUser(userData);
    setToken(authToken);
    setRememberMe(isRememberMe);
    
    if (isRememberMe) {
      localStorage.setItem('token', authToken);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', authToken);
      localStorage.removeItem('token');
    }
  };

  const logout = () => {
    if (token) {
      fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error(err));
    }
    setUser(null);
    setToken(null);
    setRememberMe(false);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
