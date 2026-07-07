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
    if (user.role.codigo === 'CAPTURISTA') {
      return <Navigate to="/cargar-excel" replace />;
    }
    if (user.role.codigo === 'ENCIERRO') {
      return <Navigate to="/encierro/dashboard" replace />;
    }
    if (user.role.codigo === 'GENERAL') {
      return <Navigate to="/general" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
