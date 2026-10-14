import { createContext, useState, useEffect, useRef, useMemo } from 'react';
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
  programacion_pasteles: '/programacion-pasteles',
};

/**
 * Decide la ruta a la que debe ir el usuario tras el login:
 * Todos los usuarios van al /menu donde ven los módulos permitidos para su rol.
 */
export function getDefaultRoute(user) {
  return '/menu';
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

  const canEditModulo = (moduloCodigo) => {
    if (!user) return false;
    const roleCode = String(user.role?.codigo || '').toUpperCase().trim();
    if (roleCode === 'ADMINISTRADOR') return true;
    if (roleCode === 'LECTURA') return false;

    const norm = (s) => String(s || '').toLowerCase().replace(/[-_\s]/g, '');
    const targetNorm = norm(moduloCodigo);

    // Permisos directos por rol para operaciones de Mesa de Control / Plataforma / Pasteles
    if (
      (roleCode === 'MESA_CONTROL' || roleCode === 'MESA_DE_CONTROL' || roleCode === 'PLATAFORMA' || roleCode === 'PASTELES' || roleCode === 'CENTRO_CONTROL' || roleCode === 'CENTRO_DE_CONTROL') &&
      (targetNorm === 'mesacontrol' || targetNorm === 'centrocontrol')
    ) {
      return true;
    }

    if (!user.modulos) return false;

    const mod = user.modulos.find((m) => {
      const code = typeof m === 'object' ? m.modulo_codigo : m;
      return norm(code) === targetNorm;
    });

    if (!mod) return false;
    if (typeof mod === 'object') {
      return !mod.solo_lectura;
    }
    return true;
  };

  const contextValue = useMemo(() => ({
    user, token, login, logout, loading, setUser, canEditModulo
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
