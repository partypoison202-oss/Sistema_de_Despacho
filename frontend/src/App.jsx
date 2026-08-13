import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
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

const RootLayout = () => (
  <AuthProvider>
    <GlobalClock />
    <ScrollToTop />
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Login /> },
      {
        path: 'despacho/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GENERAL']}>
            <DetalleUnidadGeneral />
          </ProtectedRoute>
        ),
      },
      {
        path: 'patio/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'PATIO']}>
            <PatioDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'titan/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'TITAN']}>
            <DashboardTitan />
          </ProtectedRoute>
        ),
      },
      {
        path: 'infraccion',
        element: <Navigate to="/infraccion/dashboard" replace />,
      },
      {
        path: 'infraccion/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'INFRACCION']}>
            <InfraccionDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'general',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GENERAL']}>
            <DashboardGeneral />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'PLATAFORMA']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mesa-control',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'PLATAFORMA']}>
            <DashboardMesaControl />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mesa-control/:tipoTransporte',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'PLATAFORMA']}>
            <DetalleUnidadMesaControl />
          </ProtectedRoute>
        ),
      },
      {
        path: 'menu',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL', 'PLATAFORMA', 'TITAN', 'INFRACCION', 'GESTOR_OPERADORES', 'PROGRAMACION', 'CARGA_DE_COMBUSTIBLE']}>
            <Menu />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transporte/:tipoTransporte',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'PLATAFORMA']}>
            <DetalleUnidad />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cargar-excel',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'PROGRAMACION']}>
            <CargaExcel />
          </ProtectedRoute>
        ),
      },
      {
        path: 'operadores',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GESTOR_OPERADORES', 'DESPACHO']}>
            <Operadores />
          </ProtectedRoute>
        ),
      },
      {
        path: 'maniobristas',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GESTOR_OPERADORES', 'DESPACHO']}>
            <Maniobristas />
          </ProtectedRoute>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <Usuarios />
          </ProtectedRoute>
        ),
      },
      {
        path: 'resumen-despacho',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR']}>
            <ResumenDespacho />
          </ProtectedRoute>
        ),
      },
      {
        path: 'historial',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL']}>
            <MenuHistorial />
          </ProtectedRoute>
        ),
      },
      {
        path: 'historial/general',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'PROGRAMACION', 'DESPACHO', 'GENERAL']}>
            <HistorialGeneral />
          </ProtectedRoute>
        ),
      },
      {
        path: 'historial/despacho',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL']}>
            <HistorialDespacho />
          </ProtectedRoute>
        ),
      },
      {
        path: 'historial/encierro',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO', 'GENERAL']}>
            <HistorialEncierro />
          </ProtectedRoute>
        ),
      },
      {
        path: 'historial/mantenimiento',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'GENERAL']}>
            <HistorialMantenimiento />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checklist/menu',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
            <MenuCheckList />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checklist/seleccionar-flota',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
            <FleetSelection />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checklist',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
            <CheckList />
          </ProtectedRoute>
        ),
      },
      {
        path: 'checklist/historial',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'DESPACHO', 'ENCIERRO']}>
            <HistorialCheckList />
          </ProtectedRoute>
        ),
      },
      {
        path: 'encierro/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO', 'CARGA_DE_COMBUSTIBLE']}>
            <DashboardEncierro />
          </ProtectedRoute>
        ),
      },
      {
        path: 'encierro/transporte/:tipoTransporte',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'ENCIERRO', 'CARGA_DE_COMBUSTIBLE']}>
            <DetalleUnidadEncierro />
          </ProtectedRoute>
        ),
      },
      {
        path: 'centro-control',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
            <CentroControl />
          </ProtectedRoute>
        ),
      },
      {
        path: 'centro-control/infracciones',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
            <DashboardInfracciones />
          </ProtectedRoute>
        ),
      },
      {
        path: 'centro-control/bitacoras',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
            <DashboardBitacora />
          </ProtectedRoute>
        ),
      },
      {
        path: 'centro-control/detalle/:tipo',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
            <DetalleUnidades />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plano-patio',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CENTRO_CONTROL']}>
            <PatioDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mantenimiento',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'MANTENIMIENTO', 'CARGA_DE_COMBUSTIBLE']}>
            <Mantenimiento />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mantenimiento/:tipoTransporte',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'MANTENIMIENTO', 'CARGA_DE_COMBUSTIBLE']}>
            <DetalleUnidadMantenimiento />
          </ProtectedRoute>
        ),
      },
      {
        path: 'carga-combustible',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CARGA_DE_COMBUSTIBLE']}>
            <Mantenimiento />
          </ProtectedRoute>
        ),
      },
      {
        path: 'carga-combustible/:tipoTransporte',
        element: (
          <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'CARGA_DE_COMBUSTIBLE']}>
            <DetalleUnidadMantenimiento />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reportestitanes',
        element: <ReportesTitanes />,
      },
      {
        path: 'historial/reportes-titanes',
        element: <HistorialReportesTitanes />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;