import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import './ItinerarioAsistencias.css';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import ModalAsignarFechas from './ModalAsignarFechas';
import { generarPDFItinerario } from '../../utils/generarPDFItinerario';

export default function ItinerarioAsistencias({ getAuthHeaders, conductores }) {
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    if (d.getDate() <= 15) {
      d.setDate(1);
    } else {
      d.setDate(16);
    }
    return d.toISOString().split('T')[0];
  });
  
  const [hasta, setHasta] = useState(() => {
    const d = new Date();
    if (d.getDate() <= 15) {
      d.setDate(15);
    } else {
      // Último día del mes actual
      d.setMonth(d.getMonth() + 1);
      d.setDate(0);
    }
    return d.toISOString().split('T')[0];
  });
  
  const [data, setData] = useState({ fechas: [], matriz: [] });
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);

  const fetchItinerario = async () => {
    if (!desde || !hasta) return;
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE}/api/operadores/itinerario?desde=${desde}&hasta=${hasta}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al cargar el itinerario');
      }
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchItinerario();
  }, [desde, hasta]);

  const filtrados = data.matriz.filter(c => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    return c.nombre.toLowerCase().includes(term) || c.tarjeton.toLowerCase().includes(term);
  });

  const getCellClass = (estado) => {
    switch(estado) {
      case 'A': return 'cell-a';
      case 'F': return 'cell-f';
      case 'D': return 'cell-d';
      case 'V': return 'cell-v';
      case 'I': return 'cell-i';
      case '-': return 'cell-empty';
      default: return '';
    }
  };

  const getCellLabel = (estado) => {
    switch(estado) {
      case 'A': return 'Asistencia';
      case 'F': return 'Falta';
      case 'D': return 'Descanso';
      case 'V': return 'Vacaciones';
      case 'I': return 'Incapacidad';
      case '-': return 'Sin Registro (Día Futuro)';
      default: return estado;
    }
  };

  return (
    <div className="itinerario-container">
      <div className="itinerario-header">
        <div className="itinerario-filters">
          <div className="filter-group">
            <label>Desde:</label>
            <AppleDatePicker value={desde} onChange={setDesde} />
          </div>
          <div className="filter-group">
            <label>Hasta:</label>
            <AppleDatePicker value={hasta} onChange={setHasta} />
          </div>
          <div className="filter-group" style={{ flex: 1, minWidth: '250px' }}>
            <label>Buscar Conductor:</label>
            <input 
              type="text" 
              className="itinerario-search" 
              placeholder="Buscar por nombre o tarjetón..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="itinerario-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-asignar-fechas" 
            onClick={() => generarPDFItinerario(data, desde, hasta)}
            disabled={cargando || !data.fechas || data.fechas.length === 0}
            style={{ backgroundColor: '#1e293b', opacity: (cargando || !data.fechas || data.fechas.length === 0) ? 0.5 : 1 }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Imprimir PDF
          </button>
          <button className="btn-asignar-fechas" onClick={() => setModalOpen(true)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Asignar Fechas (V, I, D, F)
          </button>
        </div>
      </div>

      <div className="itinerario-leyenda">
        <div className="leyenda-item"><span className="leyenda-color cell-a">A</span> Asistencia</div>
        <div className="leyenda-item"><span className="leyenda-color cell-d">D</span> Descanso</div>
        <div className="leyenda-item"><span className="leyenda-color cell-v">V</span> Vacaciones</div>
        <div className="leyenda-item"><span className="leyenda-color cell-i">I</span> Incapacidad</div>
        <div className="leyenda-item"><span className="leyenda-color cell-f">F</span> Falta</div>
      </div>

      <div className="itinerario-grid-wrapper">
        {cargando ? (
          <div className="itinerario-loading">Cargando itinerario...</div>
        ) : (
          <table className="itinerario-table">
            <thead>
              <tr>
                <th className="sticky-col first-col">TARJETÓN</th>
                <th className="sticky-col second-col">OPERADOR</th>
                <th className="sticky-col sum-col header-a" title="Total Asistencias">A</th>
                <th className="sticky-col sum-col header-d" title="Total Descansos">D</th>
                <th className="sticky-col sum-col header-v" title="Total Vacaciones">V</th>
                <th className="sticky-col sum-col header-i" title="Total Incapacidades">I</th>
                <th className="sticky-col sum-col header-f" title="Total Faltas">F</th>
                {data.fechas.map(f => {
                  const [y, m, d] = f.split('-');
                  return <th key={f} className="day-col" title={f}>{d}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id}>
                  <td className="sticky-col first-col font-mono">{c.tarjeton}</td>
                  <td className="sticky-col second-col conductor-nombre">{c.nombre}</td>
                  <td className="sticky-col sum-col sum-val-a">{c.totales.A}</td>
                  <td className="sticky-col sum-col sum-val-d">{c.totales.D}</td>
                  <td className="sticky-col sum-col sum-val-v">{c.totales.V}</td>
                  <td className="sticky-col sum-col sum-val-i">{c.totales.I}</td>
                  <td className="sticky-col sum-col sum-val-f">{c.totales.F}</td>
                  
                  {data.fechas.map(f => {
                    const estado = c.dias[f];
                    const motivo = c.motivos && c.motivos[f] ? ` | Motivo: ${c.motivos[f]}` : '';
                    return (
                      <td key={f} className="day-cell">
                        <div className={`status-bubble ${getCellClass(estado)}`} data-tooltip={`${f} - ${getCellLabel(estado)}${motivo}`}>
                          {estado}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7 + data.fechas.length} className="no-results">
                    No se encontraron conductores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ModalAsignarFechas 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        conductores={conductores}
        getAuthHeaders={getAuthHeaders}
        onSuccess={() => {
          setModalOpen(false);
          fetchItinerario();
        }}
      />
    </div>
  );
}
