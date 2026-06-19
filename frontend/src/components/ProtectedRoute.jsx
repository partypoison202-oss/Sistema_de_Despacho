import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role.codigo)) {
    // Si es un capturista, regresarlo a cargar-excel, si no, al dashboard general
    if (user.role.codigo === 'CAPTURISTA') {
        return <Navigate to="/cargar-excel" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
