import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalClock from './components/GlobalClock/GlobalClock';
import { lazy, Suspense } from 'react';

// Carga perezosa (Lazy Loading) de las pantallas
const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const DetalleUnidad = lazy(() => import('./pages/Unidades/DetalleUnidad'));
const CargaExcel = lazy(() => import('./pages/CargaExcel/CargaExcel'));
const Usuarios = lazy(() => import('./pages/Usuarios/Usuarios'));
const DashboardEncierro = lazy(() => import('./pages/Encierro/DashboardEncierro'));
const DetalleUnidadEncierro = lazy(() => import('./pages/Encierro/DetalleUnidadEncierro'));
const ResumenDespacho = lazy(() => import('./pages/Reportes/ResumenDespacho'));
const Menu = lazy(() => import('./pages/Menu/Menu'));
const MenuCheckList = lazy(() => import('./pages/Menu/MenuCheckList'));
const CheckList = lazy(() => import('./pages/CheckList/CheckList'));
const HistorialCheckList = lazy(() => import('./pages/CheckList/HistorialCheckList'));
const FleetSelection = lazy(() => import('./components/Checklist/FleetSelection'));
const CentroControl = lazy(() => import('./pages/CentroControl/CentroControl'));
const DetalleUnidades = lazy(() => import('./pages/CentroControl/Detalle/DetalleUnidades'));

// Loader sutil para las transiciones
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#121215]">
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-guinda-700 rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Cargando Módulo...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <GlobalClock />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
