import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import './Historial.css';

export default function HistorialEncierro() {
  const [selectedFecha, setSelectedFecha] = useState('');

  // 1. Obtener listado de fechas únicas registradas en el historial (Cacheado por 5 minutos)
  const { data: fechas = [], isLoading: isLoadingFechas } = useQuery({
    queryKey: ['historial-fechas'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/fechas`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener fechas');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Autoseleccionar la fecha más reciente al cargar las fechas
  useEffect(() => {
    if (fechas.length > 0 && !selectedFecha) {
      setSelectedFecha(fechas[0]);
    }
  }, [fechas, selectedFecha]);

  // 2. Obtener el historial para la fecha seleccionada (Cacheado por 5 minutos)
  const { data: datos = [], isLoading: isLoadingDatos } = useQuery({
    queryKey: ['historial-encierro', selectedFecha],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/historial-operativo/encierro/${selectedFecha}`, {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('token') || sessionStorage.getItem('token'))}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error al obtener el historial');
      return response.json();
    },
    enabled: !!selectedFecha,
    staleTime: 1000 * 60 * 5,
  });

  const cargando = isLoadingFechas || (isLoadingDatos && !!selectedFecha);

  const handleFechaChange = (e) => {
    setSelectedFecha(e.target.value);
  };

  return (
    <div className="historial-page">
      <Header title="Historial Encierro" hideBackButton={false} />

      <main className="historial-content">
        <div className="historial-header">
          <h2>Unidades Fuera de Servicio (Mantenimiento/Reserva)</h2>
          <div className="historial-filter">
            <label>Seleccionar Fecha:</label>
            <select value={selectedFecha} onChange={handleFechaChange} disabled={cargando}>
              {fechas.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ marginBottom: '1.25rem' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Cargando datos del historial...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.85rem' }}>Buscando registros en base de datos</p>
          </div>
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
                      <span className={`estatus-badge estatus-${String(d.estatus || 'operacion').toLowerCase()}`}>
                        {d.estatus}
                      </span>
                    </td>
                    <td>{d.motivo_estatus || '-'}</td>
                    <td>{d.falla || '-'}</td>
                  </tr>
                ))}
                {datos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem', color: '#9ca3af' }}>No hay unidades en mantenimiento/reserva para esta fecha.</td>
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
