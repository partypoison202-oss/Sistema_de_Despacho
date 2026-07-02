import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import DetalleUnidad from './pages/Unidades/DetalleUnidad';
import CargaExcel from './pages/CargaExcel/CargaExcel';
import Usuarios from './pages/Usuarios/Usuarios';
import DashboardEncierro from './pages/Encierro/DashboardEncierro';
import DetalleUnidadEncierro from './pages/Encierro/DetalleUnidadEncierro';
import ResumenDespacho from './pages/Reportes/ResumenDespacho';
import Menu from './pages/Menu/Menu';
import MenuCheckList from './pages/Menu/MenuCheckList';
import CheckList from './pages/CheckList/CheckList';
import HistorialCheckList from './pages/CheckList/HistorialCheckList';
import FleetSelection from './components/Checklist/FleetSelection';
import CentroControl from './pages/CentroControl/CentroControl';
import DetalleUnidades from './pages/CentroControl/Detalle/DetalleUnidades';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pantalla de Inicio de Sesión */}
          <Route path="/" element={<Login />} />

          {/* Rutas protegidas para ADMIN y DESPACHO (NO para CENTRO_CONTROL) */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/menu" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO']}>
              <Menu />
            </ProtectedRoute>
          } />

          <Route path="/transporte/:tipoTransporte" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO']}>
              <DetalleUnidad />
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

          <Route path="/resumen-despacho" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
              <ResumenDespacho />
            </ProtectedRoute>
          } />

          {/* Rutas para Checklist (ADMIN, DESPACHO, ENCIERRO) */}
          <Route path="/checklist/menu" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
              <MenuCheckList />
            </ProtectedRoute>
          } />

          <Route path="/checklist/seleccionar-flota" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
              <FleetSelection />
            </ProtectedRoute>
          } />
          
          <Route path="/checklist" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
              <CheckList />
            </ProtectedRoute>
          } />

          <Route path="/checklist/historial" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
              <HistorialCheckList />
            </ProtectedRoute>
          } />

          {/* Rutas protegidas para ENCIERRO */}
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

          {/* Ruta protegida para CENTRO DE CONTROL (solo ADMIN y CENTRO_CONTROL) */}
          <Route path="/centro-control" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
              <CentroControl />
            </ProtectedRoute>
          } />

          {/* Ruta protegida para el detalle de unidades por tipo (solo ADMIN y CENTRO_CONTROL) */}
          <Route path="/centro-control/detalle/:tipo" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
              <DetalleUnidades />
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
