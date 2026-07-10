import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialEncierro() {
  const [fechas, setFechas] = useState([]);
  const [selectedFecha, setSelectedFecha] = useState('');
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetchFechas();
  }, []);

  const fetchFechas = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/historial-operativo/fechas`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFechas(data);
        if (data.length > 0) {
          setSelectedFecha(data[0]);
          fetchDatos(data[0]);
        }
      }
    } catch (error) {
      console.error("Error obteniendo fechas:", error);
    }
  };

  const fetchDatos = async (fecha) => {
    if (!fecha) return;
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE}/historial-operativo/encierro/${fecha}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDatos(data);
      } else {
        Swal.fire('Error', 'No se pudo obtener el historial', 'error');
      }
    } catch (error) {
      console.error("Error obteniendo datos:", error);
      Swal.fire('Error', 'Hubo un problema de conexion', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleFechaChange = (e) => {
    const f = e.target.value;
    setSelectedFecha(f);
    fetchDatos(f);
  };

  return (
    <div className="historial-page">
      <Header title="Historial Encierro" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Unidades Fuera de Servicio (Mantenimiento/Reserva)</h2>
          <div className="historial-filter">
            <label>Seleccionar Fecha:</label>
            <select value={selectedFecha} onChange={handleFechaChange}>
              {fechas.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="loading">Cargando datos...</div>
        ) : (
          <div className="table-responsive">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th>ECO</th>
                  <th>ESTATUS</th>
                  <th>MOTIVO DE ESTATUS (BAJA)</th>
                  <th>FALLA REPORTADA</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td>{d.tipo}</td>
                    <td>{d.economico}</td>
                    <td>
                      <span className={`estatus-badge estatus-${d.estatus.toLowerCase()}`}>
                        {d.estatus}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td>{d.falla || '-'}</td>
                  </tr>
                ))}
                {datos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center">No hay unidades en mantenimiento/reserva para esta fecha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
