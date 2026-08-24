import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalClock from './components/GlobalClock/GlobalClock';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { lazy, Suspense } from 'react';

// ── Carga inmediata (siempre necesarios) ──────────────────────────────────────
import Login from './pages/Login/Login';

// ── Carga diferida (se descargan solo cuando el usuario navega a esa ruta) ───
const Dashboard              = lazy(() => import('./pages/Dashboard/Dashboard'));
const DetalleUnidad          = lazy(() => import('./pages/Unidades/DetalleUnidad'));
const DashboardGeneral       = lazy(() => import('./pages/General/DashboardGeneral'));
const DetalleUnidadGeneral   = lazy(() => import('./pages/General/DetalleUnidad'));
const CargaExcel             = lazy(() => import('./pages/CargaExcel/CargaExcel'));
const Usuarios               = lazy(() => import('./pages/Usuarios/Usuarios'));
const DashboardEncierro      = lazy(() => import('./pages/Encierro/DashboardEncierro'));
const DetalleUnidadEncierro  = lazy(() => import('./pages/Encierro/DetalleUnidadEncierro'));
const ResumenDespacho        = lazy(() => import('./pages/Reportes/ResumenDespacho'));
const Menu                   = lazy(() => import('./pages/Menu/Menu'));
const MenuCheckList          = lazy(() => import('./pages/Menu/MenuCheckList'));
const CheckList              = lazy(() => import('./pages/CheckList/CheckList'));
const HistorialCheckList     = lazy(() => import('./pages/CheckList/HistorialCheckList'));
const MenuHistorial          = lazy(() => import('./pages/Historial/MenuHistorial'));
const HistorialGeneral       = lazy(() => import('./pages/Historial/HistorialGeneral'));
const HistorialDespacho      = lazy(() => import('./pages/Historial/HistorialDespacho'));
const HistorialEncierro      = lazy(() => import('./pages/Historial/HistorialEncierro'));
const HistorialMantenimiento = lazy(() => import('./pages/Historial/HistorialMantenimiento'));
const FleetSelection         = lazy(() => import('./components/Checklist/FleetSelection'));
const CentroControl          = lazy(() => import('./pages/CentroControl/CentroControl'));
const DashboardInfracciones  = lazy(() => import('./pages/CentroControl/DashboardInfracciones'));
const DetalleUnidades        = lazy(() => import('./pages/CentroControl/Detalle/DetalleUnidades'));
const DashboardBitacora      = lazy(() => import('./pages/CentroControl/DashboardBitacora'));
const PatioDashboard         = lazy(() => import('./pages/Patio/PatioDashboard'));
const DashboardTitan         = lazy(() => import('./pages/Titan/DashboardTitan'));
const DetalleUnidadTitan     = lazy(() => import('./pages/Titan/DetalleUnidadTitan'));
const Mantenimiento          = lazy(() => import('./pages/Mantenimiento/Mantenimiento'));
const DetalleUnidadMantenimiento = lazy(() => import('./pages/Mantenimiento/DetalleUnidadMantenimiento'));
const ReportesTitanes        = lazy(() => import('./pages/CentroControl/ReporteTitanes/ReporteTitanes'));
const HistorialReportesTitanes = lazy(() => import('./pages/Historial/HistorialReportesTitanes'));
const Operadores             = lazy(() => import('./pages/Operadores/Operadores'));
const Maniobristas           = lazy(() => import('./pages/Maniobristas/Maniobristas'));
const InfraccionDashboard    = lazy(() => import('./pages/Infraccion/InfraccionDashboard'));
const DashboardMesaControl   = lazy(() => import('./pages/MesadeControl/DashboardMesaControl'));
const DetalleUnidadMesaControl = lazy(() => import('./pages/MesadeControl/DetalleUnidadMesaControl'));

// ── Spinner de carga mientras se descarga el chunk de la ruta ─────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0b162c',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid rgba(106,27,51,0.3)',
        borderTopColor: '#6A1B33',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <GlobalClock />
      <ScrollToTop />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Pantalla de Inicio de Sesión */}
            <Route path="/" element={<Login />} />

            {/* Ruta protegida de detalle de despacho (pantalla "General" nueva) */}
            <Route path="/despacho/:id" element={
              <ProtectedRoute allowedModules={['general']}>
                <DetalleUnidadGeneral />
              </ProtectedRoute>
            } />

            {/* Rutas protegidas para ADMIN y DESPACHO (NO para CENTRO_CONTROL) */}
            <Route path="/patio/dashboard" element={
              <ProtectedRoute allowedModules={['patio']}>
                <PatioDashboard />
              </ProtectedRoute>
            } />

            {/* TITAN Module */}
            <Route path="/titan/dashboard" element={
              <ProtectedRoute allowedModules={['titan']}>
                <DashboardTitan />
              </ProtectedRoute>
            } />

            {/* INFRACCION Module */}
            <Route path="/infraccion" element={<Navigate to="/infraccion/dashboard" replace />} />
            <Route path="/infraccion/dashboard" element={
              <ProtectedRoute allowedModules={['infraccion']}>
                <InfraccionDashboard />
              </ProtectedRoute>
            } />

            {/* Dashboard General */}
            <Route path="/general" element={
              <ProtectedRoute allowedModules={['general']}>
                <DashboardGeneral />
              </ProtectedRoute>
            } />

            {/* DESPACHO DASHBOARD */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedModules={['despacho']}>
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* MESA DE CONTROL */}
            <Route path="/mesa-control" element={
              <ProtectedRoute allowedModules={['mesa_control']}>
                <DashboardMesaControl />
              </ProtectedRoute>
            } />
            <Route path="/mesa-control/:tipoTransporte" element={
              <ProtectedRoute allowedModules={['mesa_control']}>
                <DetalleUnidadMesaControl />
              </ProtectedRoute>
            } />

            <Route path="/menu" element={
              <ProtectedRoute>
                <Menu />
              </ProtectedRoute>
            } />

            {/* Detalle por unidad (tipoTransporte) */}
            <Route path="/transporte/:tipoTransporte" element={
              <ProtectedRoute allowedModules={['despacho', 'mesa_control']}>
                <DetalleUnidad />
              </ProtectedRoute>
            } />

            {/* Excel */}
            <Route path="/cargar-excel" element={
              <ProtectedRoute allowedModules={['capturista', 'relevos']}>
                <CargaExcel />
              </ProtectedRoute>
            } />

            {/* Operadores */}
            <Route path="/operadores" element={
              <ProtectedRoute allowedModules={['operadores', 'maniobristas', 'despacho', 'centro_control', 'general', 'mantenimiento', 'carga_combustible']}>
                <Operadores />
              </ProtectedRoute>
            } />
            <Route path="/maniobristas" element={
              <ProtectedRoute allowedModules={['operadores', 'maniobristas', 'despacho', 'centro_control', 'general', 'mantenimiento', 'carga_combustible']}>
                <Maniobristas />
              </ProtectedRoute>
            } />

            {/* Usuarios (solo ADMIN) */}
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

            {/* Historial */}
            <Route path="/historial" element={
              <ProtectedRoute allowedModules={['historial']}>
                <MenuHistorial />
              </ProtectedRoute>
            } />
            <Route path="/historial/general" element={
              <ProtectedRoute allowedModules={['historial']}>
                <HistorialGeneral />
              </ProtectedRoute>
            } />
            <Route path="/historial/despacho" element={
              <ProtectedRoute allowedModules={['historial']}>
                <HistorialDespacho />
              </ProtectedRoute>
            } />
            <Route path="/historial/encierro" element={
              <ProtectedRoute allowedModules={['historial']}>
                <HistorialEncierro />
              </ProtectedRoute>
            } />
            <Route path="/historial/mantenimiento" element={
              <ProtectedRoute allowedModules={['historial']}>
                <HistorialMantenimiento />
              </ProtectedRoute>
            } />

            {/* CheckList */}
            <Route path="/checklist/menu" element={
              <ProtectedRoute allowedModules={['despacho', 'encierro']}>
                <MenuCheckList />
              </ProtectedRoute>
            } />
            <Route path="/checklist/seleccionar-flota" element={
              <ProtectedRoute allowedModules={['despacho', 'encierro']}>
                <FleetSelection />
              </ProtectedRoute>
            } />
            <Route path="/checklist" element={
              <ProtectedRoute allowedModules={['despacho', 'encierro']}>
                <CheckList />
              </ProtectedRoute>
            } />
            <Route path="/checklist/historial" element={
              <ProtectedRoute allowedModules={['historial']}>
                <HistorialCheckList />
              </ProtectedRoute>
            } />

            {/* Encierro */}
            <Route path="/encierro/dashboard" element={
              <ProtectedRoute allowedModules={['encierro']}>
                <DashboardEncierro />
              </ProtectedRoute>
            } />
            <Route path="/encierro/transporte/:tipoTransporte" element={
              <ProtectedRoute allowedModules={['encierro']}>
                <DetalleUnidadEncierro />
              </ProtectedRoute>
            } />

            {/* Centro de Control */}
            <Route path="/centro-control" element={
              <ProtectedRoute allowedModules={['centro_control']}>
                <CentroControl />
              </ProtectedRoute>
            } />
            <Route path="/centro-control/infracciones" element={
              <ProtectedRoute allowedModules={['centro_control']}>
                <DashboardInfracciones />
              </ProtectedRoute>
            } />
            <Route path="/centro-control/bitacoras" element={
              <ProtectedRoute allowedModules={['centro_control']}>
                <DashboardBitacora />
              </ProtectedRoute>
            } />
            <Route path="/centro-control/detalle/:tipo" element={
              <ProtectedRoute allowedModules={['centro_control']}>
                <DetalleUnidades />
              </ProtectedRoute>
            } />
            <Route path="/plano-patio" element={
              <ProtectedRoute allowedModules={['centro_control']}>
                <PatioDashboard />
              </ProtectedRoute>
            } />

            {/* Mantenimiento */}
            <Route path="/mantenimiento" element={
              <ProtectedRoute allowedModules={['mantenimiento']}>
                <Mantenimiento />
              </ProtectedRoute>
            } />
            <Route path="/mantenimiento/:tipoTransporte" element={
              <ProtectedRoute allowedModules={['mantenimiento']}>
                <DetalleUnidadMantenimiento />
              </ProtectedRoute>
            } />

            {/* Carga de Combustible */}
            <Route path="/carga-combustible" element={
              <ProtectedRoute allowedModules={['carga_combustible']}>
                <Mantenimiento />
              </ProtectedRoute>
            } />
            <Route path="/carga-combustible/:tipoTransporte" element={
              <ProtectedRoute allowedModules={['carga_combustible']}>
                <DetalleUnidadMantenimiento />
              </ProtectedRoute>
            } />

            {/* Reportes Titanes */}
            <Route path="/reportestitanes" element={<ReportesTitanes />} />
            <Route path="/historial/reportes-titanes" element={<HistorialReportesTitanes />} />

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;