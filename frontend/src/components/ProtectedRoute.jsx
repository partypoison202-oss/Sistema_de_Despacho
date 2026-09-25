import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext, getDefaultRoute } from '../context/AuthContext';

export const ROLE_DEFAULT_MODULES = {
  DESPACHO: ['despacho', 'historial'],
  PLATAFORMA: ['mesa_control', 'historial'],
  MESA_CONTROL: ['mesa_control', 'relevos', 'centro_control', 'historial'],
  PROGRAMACION: ['capturista', 'relevos', 'historial'],
  PASTELES: ['centro_control', 'mesa_control', 'programacion_pasteles', 'historial'],
  PROGRAMACION_PASTELES: ['centro_control', 'mesa_control', 'programacion_pasteles', 'historial'],
  GESTOR_OPERADORES: ['operadores', 'historial'],
  ENCIERRO: ['encierro', 'historial'],
  CENTRO_CONTROL: ['centro_control', 'historial'],
  TITAN: ['titan'],
  INFRACCION: ['infraccion'],
  GENERAL: ['general', 'historial'],
  MANTENIMIENTO: ['mantenimiento', 'encierro', 'carga_combustible', 'historial'],
  CARGA_DE_COMBUSTIBLE: ['carga_combustible'],
};

export default function ProtectedRoute({ children, allowedRoles, allowedModules }) {
  const { user, token, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader-container">
        <div className="page-loader-spinner"></div>
        <div className="page-loader-text">Cargando...</div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const rol = user.role?.codigo;
  let modulos = (user.modulos && user.modulos.length > 0)
    ? [...user.modulos]
    : [...(ROLE_DEFAULT_MODULES[rol] || [])];

  const rolesConHistorial = ['DESPACHO', 'ENCIERRO', 'MANTENIMIENTO', 'CENTRO_CONTROL', 'CENTRO_DE_CONTROL', 'MESA_CONTROL', 'MESA_DE_CONTROL', 'PLATAFORMA', 'GENERAL', 'PASTELES', 'PROGRAMACION_PASTELES', 'PROGRAMACION', 'CAPTURISTA'];
  if (rolesConHistorial.includes(rol) && !modulos.includes('historial')) {
    modulos.push('historial');
  }

  if (rol === 'PASTELES' || rol === 'PROGRAMACION_PASTELES') {
    ['centro_control', 'mesa_control', 'programacion_pasteles', 'historial'].forEach(m => {
      if (!modulos.includes(m)) modulos.push(m);
    });
  }

  // Los ADMIN y LECTURA tienen acceso universal, a menos que el módulo esté explícitamente bloqueado (usualmente no)
  const isSuper = rol === 'ADMINISTRADOR' || rol === 'LECTURA';

  // Verificación por módulos (nueva lógica)
  if (allowedModules && !isSuper) {
    // Verificar si el usuario tiene al menos uno de los módulos requeridos
    const hasModuleAccess = allowedModules.some(mod => modulos.includes(mod));
    
    if (!hasModuleAccess) {
      let fallbackRoute = getDefaultRoute(user);
      if (fallbackRoute === location.pathname) {
        fallbackRoute = '/menu';
      }
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Verificación por roles
  if (allowedRoles && !isSuper) {
    if (!allowedRoles.includes(rol)) {
      let fallbackRoute = getDefaultRoute(user);
      if (fallbackRoute === location.pathname) {
        fallbackRoute = '/menu';
      }
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Permitido
  return children;
}