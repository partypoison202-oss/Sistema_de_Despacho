import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard/Dashboard';
import DetalleUnidad from './pages/Unidades/DetalleUnidad';
import FormularioReporte from './pages/Unidades/FormularioReporte';

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;