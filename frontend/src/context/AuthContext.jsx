import { createContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import API_BASE from '../config/api';
import Swal from 'sweetalert2';
import PantallaCargaAcotma from '../components/PantallaCarga/PantallaCargaAcotma';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext({
  user: null,
  token: null,
  logout: () => {},
  login: () => {},
  loading: false,
  setUser: () => {},
  canEditModulo: () => false,
  pantallaCargaActiva: false,
  activarPantallaCarga: () => {},
  finalizarPantallaCarga: () => {},
});

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
  const [pantallaCargaActiva, setPantallaCargaActiva] = useState(() => {
    return localStorage.getItem('acotma_pantalla_carga_activa') === 'true';
  });
  const sessionExpiredModalRef = useRef(false);

  const sincronizarPantallaCarga = useCallback((activa) => {
    const estado = Boolean(activa);
    setPantallaCargaActiva(estado);
    if (estado) {
      localStorage.setItem('acotma_pantalla_carga_activa', 'true');
    } else {
      localStorage.removeItem('acotma_pantalla_carga_activa');
    }
  }, []);

  const cambiarEstadoPantallaCarga = useCallback(async (activa) => {
    const estado = Boolean(activa);
    sincronizarPantallaCarga(estado);
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/sistema/pantalla-carga`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activa: estado }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.pantalla_carga_activa === 'boolean') {
          sincronizarPantallaCarga(data.pantalla_carga_activa);
        }
      }
    } catch {
      // Mantiene el estado local y el próximo heartbeat lo sincronizará
    }
  }, [token, sincronizarPantallaCarga]);

  const handleSessionExpired = () => {
    // Si ya estamos en la pantalla de acceso, no mostrar modal
    if (window.location.pathname === '/' || window.location.pathname === '/login') {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      return;
    }

    if (sessionExpiredModalRef.current) return;
    sessionExpiredModalRef.current = true;

    // Limpiar sesión local inmediatamente
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');

    Swal.fire({
      icon: 'info',
      title: 'Sesión expirada',
      text: 'Tu sesión ha finalizado. Por favor, inicia sesión nuevamente para continuar.',
      confirmButtonText: 'Iniciar Sesión',
      confirmButtonColor: '#6b1d33',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      sessionExpiredModalRef.current = false;
      window.location.href = '/';
    });
  };

  useEffect(() => {
    const handleGlobalSessionExpired = () => {
      handleSessionExpired();
    };
    window.addEventListener('auth:session_expired', handleGlobalSessionExpired);
    return () => {
      window.removeEventListener('auth:session_expired', handleGlobalSessionExpired);
    };
  }, []);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.status === 401) {
          handleSessionExpired();
          throw new Error('Token invalido');
        }
        if (!res.ok) throw new Error('Token invalido');
        return res.json();
      })
      .then(data => {
        setUser(data);
        const esAdmin =
          String(data?.role?.codigo || '').toUpperCase().trim() === 'ADMINISTRADOR' ||
          String(data?.role?.nombre || '').toUpperCase().trim() === 'ADMINISTRADOR';
        localStorage.setItem('acotma_es_admin', esAdmin ? 'true' : 'false');
        if (typeof data?.pantalla_carga_activa === 'boolean') {
          sincronizarPantallaCarga(data.pantalla_carga_activa);
        }
      })
      .catch(() => {
        if (!sessionExpiredModalRef.current) {
          logout();
        }
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  // Heartbeat periódico para presencia en línea (punto verde en tiempo real) y chequeo de sesión
  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = () => {
      fetch(`${API_BASE}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        if (res.status === 401) {
          handleSessionExpired();
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data && typeof data.pantalla_carga_activa === 'boolean') {
          sincronizarPantallaCarga(data.pantalla_carga_activa);
        }
      })
      .catch(() => {});
    };

    sendHeartbeat();

    // Comprobación periódica cada 3 segundos para detección rápida entre equipos
    const timer = setInterval(sendHeartbeat, 3000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    sessionStorage.removeItem('token'); // Limpiamos por si quedó de versiones anteriores
    const esAdmin =
      String(userData?.role?.codigo || '').toUpperCase().trim() === 'ADMINISTRADOR' ||
      String(userData?.role?.nombre || '').toUpperCase().trim() === 'ADMINISTRADOR';
    localStorage.setItem('acotma_es_admin', esAdmin ? 'true' : 'false');
    if (typeof userData?.pantalla_carga_activa === 'boolean') {
      sincronizarPantallaCarga(userData.pantalla_carga_activa);
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
    localStorage.removeItem('token');
    localStorage.removeItem('acotma_es_admin');
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

  const esAdministradorActual = user
    ? (String(user.role?.codigo || '').toUpperCase().trim() === 'ADMINISTRADOR' ||
       String(user.role?.nombre || '').toUpperCase().trim() === 'ADMINISTRADOR')
    : localStorage.getItem('acotma_es_admin') === 'true';

  const contextValue = useMemo(() => ({
    user,
    token,
    login,
    logout,
    loading,
    setUser,
    canEditModulo,
    pantallaCargaActiva,
    activarPantallaCarga: () => cambiarEstadoPantallaCarga(true),
    finalizarPantallaCarga: () => cambiarEstadoPantallaCarga(false),
  }), [user, token, loading, pantallaCargaActiva, cambiarEstadoPantallaCarga]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <PantallaCargaAcotma
        visible={Boolean(token && pantallaCargaActiva)}
        debajoHeader={true}
        mensaje="Cargando..."
        subtitulo="APLICACIÓN DE CONTROL DE TRANSPORTE MASIVO"
        mostrarFinalizar={esAdministradorActual}
        onFinalizar={() => cambiarEstadoPantallaCarga(false)}
      />
    </AuthContext.Provider>
  );
};
