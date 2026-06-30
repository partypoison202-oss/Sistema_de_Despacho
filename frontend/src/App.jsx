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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Pantalla de Inicio de Sesión */}
          <Route path="/" element={<Login />} />

          {/* Rutas protegidas genéricas (ADMIN, CENTRO_CONTROL, DESPACHO) */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL', 'DESPACHO']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* ruta para ingresar al menu de admin */}
          <Route path="/menu" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL', 'DESPACHO']}>
              <Menu />
            </ProtectedRoute>
          } />
          <Route path="/transporte/:tipoTransporte" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL', 'DESPACHO']}>
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

          {/* Ruta temporal para Resumen Despacho */}
          <Route path="/resumen-despacho" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
              <ResumenDespacho />
            </ProtectedRoute>
          } />

          {/* Ruta para el nuevo Checklist Menu */}
          <Route path="/checklist/menu" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
              <MenuCheckList />
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



          {/* Redirección por defecto si no existe la ruta */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
