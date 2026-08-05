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

  if (allowedRoles && !allowedRoles.includes(user.role.codigo)) {
    // Redirigir según el rol del usuario
    if (user.role.codigo === 'CAPTURISTA' || user.role.codigo === 'RELEVOS' || user.role.codigo === 'REVELOS') {
      return <Navigate to="/cargar-excel" replace />;
    }
    if (user.role.codigo === 'GESTOR_OPERADORES') {
      return <Navigate to="/operadores" replace />;
    }
    if (user.role.codigo === 'ENCIERRO') {
      return <Navigate to="/encierro/dashboard" replace />;
    }
    if (rol === 'GENERAL') {
      return <Navigate to="/general" replace />;
    }
    if (rol === 'CENTRO_CONTROL') {
      return <Navigate to="/centro-control" replace />;
    }
    if (rol === 'TITAN') {
      return <Navigate to="/titan/dashboard" replace />;
    }
    if (rol === 'INFRACCION') {
      return <Navigate to="/infraccion/dashboard" replace />;
    }
    if (rol === 'DESPACHO' || rol === 'PLATAFORMA') {
      return <Navigate to="/dashboard" replace />;
    }

    // Rol no reconocido: enviar al login para evitar loops
    return <Navigate to="/" replace />;
  }

  return children;
}