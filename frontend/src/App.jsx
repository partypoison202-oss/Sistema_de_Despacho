import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard/Dashboard';
import DetalleUnidad from './pages/Unidades/DetalleUnidad';
import FormularioReporte from './pages/Unidades/FormularioReporte';
import CargaExcel from './pages/CargaExcel/CargaExcel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Vista principal con las 3 flotas */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Panel de control de la unidad seleccionada (urbanus, zafiro, vagoneta) */}
        <Route path="/transporte/:tipoTransporte" element={<DetalleUnidad />} />

        {/* 🚀 RUTA ARREGLADA: Enlaza la URL de inspección con el Formulario */}
        {/* Captura dinámicamente el tipo de transporte, el ECO y la zona (frente, lateral, etc.) */}
        <Route 
          path="/transporte/:tipoTransporte/:unidadEco/reporte/:zona" 
          element={<FormularioReporte />} 
        />

        {/* 📊 NUEVA RUTA INTEGRADA PARA EL EXCEL */}
        {/* Coincide perfectamente con el navigate('/cargar-excel') en minúsculas del Header */}
        <Route path="/cargar-excel" element={<CargaExcel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;