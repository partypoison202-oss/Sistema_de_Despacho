import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
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

  // Si se definieron roles permitidos y el usuario no está en ellos, redirigir
  if (allowedRoles && !allowedRoles.includes(user.role.codigo)) {
    // Mapeo de roles a rutas de redirección
    const roleRedirectMap = {
      CAPTURISTA: '/menu',
      RELEVOS: '/menu',
      REVELOS: '/menu',
      GESTOR_OPERADORES: '/operadores',
      ENCIERRO: '/encierro/dashboard',
      GENERAL: '/general',
      CENTRO_CONTROL: '/centro-control',
      TITAN: '/titan/dashboard',
      INFRACCION: '/infraccion/dashboard',
      DESPACHO: '/dashboard',
      PLATAFORMA: '/dashboard',
    };

    const redirectPath = roleRedirectMap[user.role.codigo];
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }

    // Si el rol no está en el mapa, enviar al login (evita loops)
    return <Navigate to="/" replace />;
  }

  // Si el usuario tiene el rol permitido, renderizar los children
  return children;
}