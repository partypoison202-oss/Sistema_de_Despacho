import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext, getDefaultRoute } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles, allowedModules }) {
  const { user, token, loading } = useContext(AuthContext);

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
  const modulos = user.modulos || [];

  // Los ADMIN y LECTURA tienen acceso universal, a menos que el módulo esté explícitamente bloqueado (usualmente no)
  const isSuper = rol === 'ADMINISTRADOR' || rol === 'LECTURA';

  // Verificación por módulos (nueva lógica)
  if (allowedModules && !isSuper) {
    // Verificar si el usuario tiene al menos uno de los módulos requeridos
    const hasModuleAccess = allowedModules.some(mod => modulos.includes(mod));
    
    if (!hasModuleAccess) {
      const fallbackRoute = getDefaultRoute(user);
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Verificación por roles (lógica antigua como fallback)
  if (allowedRoles && !isSuper && !allowedModules) {
    if (!allowedRoles.includes(rol)) {
      const fallbackRoute = getDefaultRoute(user);
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Permitido
  return children;
}