import { createContext, useState, useEffect, useRef } from 'react';
import API_BASE from '../config/api';
import Swal from 'sweetalert2';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

// ── Mapa: código de módulo → ruta frontend ────────────────────────────────
export const MODULO_RUTAS = {
  despacho        : '/dashboard',
  encierro        : '/encierro/dashboard',
  capturista      : '/cargar-excel',
  relevos         : '/cargar-excel',
  mantenimiento   : '/mantenimiento',
  centro_control  : '/centro-control',
  historial       : '/historial',
  titan           : '/titan/dashboard',
  infraccion      : '/infraccion/dashboard',
  mesa_control    : '/mesa-control',
  operadores      : '/operadores',
  maniobristas    : '/maniobristas',
  carga_combustible: '/carga-combustible',
  general         : '/general',
};

/**
 * Decide la ruta a la que debe ir el usuario tras el login:
 *  - 1 módulo único → va directo a ese módulo (bypass del menú)
 *  - 2+ módulos o admin/lectura → va al /menu
 */
export function getDefaultRoute(user) {
  const rol     = user?.role?.codigo;
  const modulos = user?.modulos ?? [];

  if (rol === 'ADMINISTRADOR' || rol === 'LECTURA') return '/menu';

  if (modulos.length === 1) {
    return MODULO_RUTAS[modulos[0]] ?? '/menu';
  }

  if (modulos.length > 1) return '/menu';

  // Fallback por rol (compatibilidad con cuentas sin módulos asignados)
  const fallback = {
    PROGRAMACION      : '/menu',
    CARGA_DE_COMBUSTIBLE: '/menu',
    GESTOR_OPERADORES : '/operadores',
    ENCIERRO          : '/encierro/dashboard',
    CENTRO_CONTROL    : '/centro-control',
    TITAN             : '/titan/dashboard',
    INFRACCION        : '/infraccion/dashboard',
    GENERAL           : '/general',
    DESPACHO          : '/dashboard',
    PLATAFORMA        : '/dashboard',
    MANTENIMIENTO     : '/mantenimiento',
  };
  return fallback[rol] ?? '/menu';
}

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
    if (!rememberMe && token) {
      inactivityTimerRef.current = setTimeout(logoutDueToInactivity, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();

    if (!rememberMe && token) {
      events.forEach(event => document.addEventListener(event, handleActivity));
      resetTimer();
    }

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [rememberMe, token]);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Authorization': `Bearer ${token}` }
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
