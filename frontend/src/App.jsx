import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import DetalleUnidad from './pages/Unidades/DetalleUnidad';
import FormularioReporte from './pages/Unidades/FormularioReporte';
import CargaExcel from './pages/CargaExcel/CargaExcel';
import Usuarios from './pages/Usuarios/Usuarios';
import DashboardEncierro from './pages/Encierro/DashboardEncierro';
import DetalleUnidadEncierro from './pages/Encierro/DetalleUnidadEncierro';
import FormularioEncierro from './pages/Encierro/FormularioEncierro';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pantalla de Inicio de Sesión */}
          <Route path="/" element={<Login />} />

          {/* Rutas protegidas genéricas (ADMIN, CENTRO_CONTROL, TITAN) */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL', 'TITAN']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/transporte/:tipoTransporte" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL', 'TITAN']}>
              <DetalleUnidad />
            </ProtectedRoute>
          } />

          <Route path="/transporte/:tipoTransporte/:unidadEco/reporte/:zona" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL', 'TITAN']}>
              <FormularioReporte />
            </ProtectedRoute>
          } />

          {/* Ruta protegida para Excel (ADMIN y CAPTURISTA) */}
          <Route path="/cargar-excel" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CAPTURISTA']}>
              <CargaExcel />
            </ProtectedRoute>
          } />

          {/* Ruta protegida exclusiva para Administrador */}
          <Route path="/usuarios" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
              <Usuarios />
            </ProtectedRoute>
          } />

          {/* ── Rutas protegidas para ENCIERRO ── */}
          <Route path="/encierro/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO']}>
              <DashboardEncierro />
            </ProtectedRoute>
          } />

          <Route path="/encierro/transporte/:tipoTransporte" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO']}>
              <DetalleUnidadEncierro />
            </ProtectedRoute>
          } />

          <Route path="/encierro/transporte/:tipoTransporte/:unidadEco/reporte/:zona" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO']}>
              <FormularioEncierro />
            </ProtectedRoute>
          } />

          {/* Redirección por defecto si no existe la ruta */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;