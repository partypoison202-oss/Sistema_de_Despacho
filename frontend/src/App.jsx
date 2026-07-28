import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import DetalleUnidad from './pages/Unidades/DetalleUnidad';
import DashboardGeneral from './pages/General/DashboardGeneral';
import DetalleUnidadGeneral from './pages/General/DetalleUnidad';
import CargaExcel from './pages/CargaExcel/CargaExcel';
import Usuarios from './pages/Usuarios/Usuarios';
import DashboardEncierro from './pages/Encierro/DashboardEncierro';
import DetalleUnidadEncierro from './pages/Encierro/DetalleUnidadEncierro';
import ResumenDespacho from './pages/Reportes/ResumenDespacho';
import Menu from './pages/Menu/Menu';
import MenuCheckList from './pages/Menu/MenuCheckList';
import CheckList from './pages/CheckList/CheckList';
import HistorialCheckList from './pages/CheckList/HistorialCheckList';
import MenuHistorial from './pages/Historial/MenuHistorial';
import HistorialGeneral from './pages/Historial/HistorialGeneral';
import HistorialDespacho from './pages/Historial/HistorialDespacho';
import HistorialEncierro from './pages/Historial/HistorialEncierro';
import HistorialMantenimiento from './pages/Historial/HistorialMantenimiento';
import FleetSelection from './components/Checklist/FleetSelection';
import CentroControl from './pages/CentroControl/CentroControl';
import GlobalClock from './components/GlobalClock/GlobalClock';
import DetalleUnidades from './pages/CentroControl/Detalle/DetalleUnidades';
import PatioDashboard from './pages/Patio/PatioDashboard';
import DashboardTitan from './pages/Titan/DashboardTitan';
import DetalleUnidadTitan from './pages/Titan/DetalleUnidadTitan';
import Mantenimiento from './pages/Mantenimiento/Mantenimiento';
import DetalleUnidadMantenimiento from './pages/Mantenimiento/DetalleUnidadMantenimiento';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import ReportesTitanes from './pages/CentroControl/ReporteTitanes/ReporteTitanes';
import HistorialReportesTitanes from './pages/Historial/HistorialReportesTitanes';
import Operadores from './pages/Operadores/Operadores';

function App() {
  return (
    <AuthProvider>
      <GlobalClock />
      <ScrollToTop />
      <BrowserRouter>
        <Routes>
          {/* Pantalla de Inicio de Sesión */}
          <Route path="/" element={<Login />} />

          

          {/* Ruta protegida de detalle de despacho (pantalla "General" nueva) */}
          <Route path="/despacho/:id" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GENERAL']}>
              <DetalleUnidadGeneral />
            </ProtectedRoute>
          } />

          {/* Rutas protegidas para ADMIN y DESPACHO (NO para CENTRO_CONTROL) */}
          <Route path="/patio/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'PATIO']}>
              <PatioDashboard />
            </ProtectedRoute>
          } />

          {/* TITAN Module */}
          <Route path="/titan/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'TITAN']}>
              <DashboardTitan />
            </ProtectedRoute>
          } />

          {/* Rutas de CheckList para USUARIO_GENERAL y ADMINISTRADOR */}
          {/* Dashboard General (nuevo) - tarjetas que llevan a /despacho/:id */}
          <Route path="/general" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GENERAL']}>
              <DashboardGeneral />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'PLATAFORMA']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/menu" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL', 'PLATAFORMA']}>
              <Menu />
            </ProtectedRoute>
          } />

          {/* Ruta protegida existente de registro por unidad (tipoTransporte) */}
          <Route path="/transporte/:tipoTransporte" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'PLATAFORMA']}>
              <DetalleUnidad />
            </ProtectedRoute>
          } />

          {/* Ruta protegida para Excel (ADMIN y CAPTURISTA) */}
          <Route path="/cargar-excel" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CAPTURISTA']}>
              <CargaExcel />
            </ProtectedRoute>
          } />

          {/* Ruta protegida para Operadores (ADMIN, CAPTURISTA, DESPACHO) */}
          <Route path="/operadores" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CAPTURISTA', 'DESPACHO']}>
              <Operadores />
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

          {/* Rutas para Historial General (ADMIN, DESPACHO, ENCIERRO, GENERAL) */}
          <Route path="/historial" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL']}>
              <MenuHistorial />
            </ProtectedRoute>
          } />

          <Route path="/historial/general" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CAPTURISTA', 'DESPACHO', 'GENERAL']}>
              <HistorialGeneral />
            </ProtectedRoute>
          } />

          <Route path="/historial/despacho" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL']}>
              <HistorialDespacho />
            </ProtectedRoute>
          } />

          <Route path="/historial/encierro" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO', 'GENERAL']}>
              <HistorialEncierro />
            </ProtectedRoute>
          } />

          <Route path="/historial/mantenimiento" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL']}>
              <HistorialMantenimiento />
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

          {/* Ruta protegida para el dashboard de Patio (solo ADMIN y CENTRO_CONTROL) */}
          <Route path="/plano-patio" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
              <PatioDashboard />
            </ProtectedRoute>
          } />

          {/* Rutas protegidas para MANTENIMIENTO (solo ADMIN y MANTENIMIENTO) */}
          <Route path="/mantenimiento" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'MANTENIMIENTO']}>
              <Mantenimiento />
            </ProtectedRoute>
          } />

          <Route path="/mantenimiento/:tipoTransporte" element={
            <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'MANTENIMIENTO']}>
              <DetalleUnidadMantenimiento />
            </ProtectedRoute>
          } />

          {/* ruta para reporte de titane */}
          <Route path="/reportestitanes" element={<ReportesTitanes />} />


          {/* ruta de historial de reportes de titanes */}
          <Route path="/historial/reportes-titanes" element={<HistorialReportesTitanes />} />

          {/* Redirección por defecto si no existe la ruta */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;