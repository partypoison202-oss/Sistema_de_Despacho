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
    return localStorage.getItem('token') || null;
  });
  const [loading, setLoading] = useState(true);

  // El cierre de sesión por inactividad fue removido por solicitud del usuario.
  // La sesión persistirá hasta que el token expire en el backend (ej. días después) o cierren sesión.

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

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    sessionStorage.removeItem('token'); // Limpiamos por si quedó de versiones anteriores
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
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
