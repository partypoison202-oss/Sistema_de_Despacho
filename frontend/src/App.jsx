import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalClock from './components/GlobalClock/GlobalClock';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { lazy, Suspense } from 'react';

// ── Carga inmediata (siempre necesarios) ──────────────────────────────────────
import Login from './pages/Login/Login';


// ── Función para evitar ChunkLoadError en actualizaciones de Vite ─────────────
const lazyRetry = function(componentImport) {
  return new Promise((resolve, reject) => {
    const hasRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    );
    componentImport().then((component) => {
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
      resolve(component);
    }).catch((error) => {
      if (!hasRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
        return window.location.reload();
      }
      reject(error);
    });
  });
};

// ── Carga diferida (se descargan solo cuando el usuario navega a esa ruta) ───
const Dashboard              = lazy(() => lazyRetry(() => import('./pages/Dashboard/Dashboard')));
const DetalleUnidad          = lazy(() => lazyRetry(() => import('./pages/Unidades/DetalleUnidad')));
const DashboardGeneral       = lazy(() => lazyRetry(() => import('./pages/General/DashboardGeneral')));
const DetalleUnidadGeneral   = lazy(() => lazyRetry(() => import('./pages/General/DetalleUnidad')));
const CargaExcel             = lazy(() => lazyRetry(() => import('./pages/CargaExcel/CargaExcel')));
const Usuarios               = lazy(() => lazyRetry(() => import('./pages/Usuarios/Usuarios')));
const DashboardEncierro      = lazy(() => lazyRetry(() => import('./pages/Encierro/DashboardEncierro')));
const DetalleUnidadEncierro  = lazy(() => lazyRetry(() => import('./pages/Encierro/DetalleUnidadEncierro')));
const ResumenDespacho        = lazy(() => lazyRetry(() => import('./pages/Reportes/ResumenDespacho')));
const Menu                   = lazy(() => lazyRetry(() => import('./pages/Menu/Menu')));
const MenuCheckList          = lazy(() => lazyRetry(() => import('./pages/Menu/MenuCheckList')));
const CheckList              = lazy(() => lazyRetry(() => import('./pages/CheckList/CheckList')));
const HistorialCheckList     = lazy(() => lazyRetry(() => import('./pages/CheckList/HistorialCheckList')));
const MenuHistorial          = lazy(() => lazyRetry(() => import('./pages/Historial/MenuHistorial')));
const HistorialGeneral       = lazy(() => lazyRetry(() => import('./pages/Historial/HistorialGeneral')));
const HistorialDespacho      = lazy(() => lazyRetry(() => import('./pages/Historial/HistorialDespacho')));
const HistorialEncierro      = lazy(() => lazyRetry(() => import('./pages/Historial/HistorialEncierro')));
const HistorialMantenimiento = lazy(() => lazyRetry(() => import('./pages/Historial/HistorialMantenimiento')));
const FleetSelection         = lazy(() => lazyRetry(() => import('./components/Checklist/FleetSelection')));
const CentroControl          = lazy(() => lazyRetry(() => import('./pages/CentroControl/CentroControl')));
const DashboardInfracciones  = lazy(() => lazyRetry(() => import('./pages/CentroControl/DashboardInfracciones')));
const DetalleUnidades        = lazy(() => lazyRetry(() => import('./pages/CentroControl/Detalle/DetalleUnidades')));
const DashboardBitacora      = lazy(() => lazyRetry(() => import('./pages/CentroControl/DashboardBitacora')));
const PatioDashboard         = lazy(() => lazyRetry(() => import('./pages/Patio/PatioDashboard')));
const DashboardTitan         = lazy(() => lazyRetry(() => import('./pages/Titan/DashboardTitan')));
const DetalleUnidadTitan     = lazy(() => lazyRetry(() => import('./pages/Titan/DetalleUnidadTitan')));
const Mantenimiento          = lazy(() => lazyRetry(() => import('./pages/Mantenimiento/Mantenimiento')));
const DetalleUnidadMantenimiento = lazy(() => lazyRetry(() => import('./pages/Mantenimiento/DetalleUnidadMantenimiento')));
const ReportesTitanes        = lazy(() => lazyRetry(() => import('./pages/CentroControl/ReporteTitanes/ReporteTitanes')));
const HistorialReportesTitanes = lazy(() => lazyRetry(() => import('./pages/Historial/HistorialReportesTitanes')));
const Operadores             = lazy(() => lazyRetry(() => import('./pages/Operadores/Operadores')));
const Maniobristas           = lazy(() => lazyRetry(() => import('./pages/Maniobristas/Maniobristas')));
const InfraccionDashboard    = lazy(() => lazyRetry(() => import('./pages/Infraccion/InfraccionDashboard')));
const DashboardMesaControl   = lazy(() => lazyRetry(() => import('./pages/MesadeControl/DashboardMesaControl')));
const DetalleUnidadMesaControl = lazy(() => lazyRetry(() => import('./pages/MesadeControl/DetalleUnidadMesaControl')));

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