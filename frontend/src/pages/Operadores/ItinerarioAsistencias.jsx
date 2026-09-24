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
    return d.toISOString().split('T')[0];
  });
  
  const [data, setData] = useState({ fechas: [], matriz: [] });
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // Paginación para mejor rendimiento
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 50;
  
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

  const totalPaginas = Math.ceil(filtrados.length / registrosPorPagina);
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const registrosPaginados = filtrados.slice(indiceInicio, indiceInicio + registrosPorPagina);

  // Reiniciar a la página 1 cuando cambia la búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const getCellClass = (estado) => {
    switch(estado) {
      case 'A': return 'cell-a';
      case 'F': return 'cell-f';
      case 'D': return 'cell-d';
      case 'V': return 'cell-v';
      case 'I': return 'cell-i';
      case 'AP': return 'cell-ap';
      case 'DP': return 'cell-dp';
      case 'R': return 'cell-r';
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
      case 'AP': return 'Asistencia (Permuta)';
      case 'DP': return 'Descanso (Permuta)';
      case 'R': return 'Retardo';
      case '-': return 'Sin Registro (Día Futuro)';
      default: return estado;
    }
  };

  const verAsignacionesFuturas = async (tipo, titulo, color) => {
    try {
      Swal.fire({
        title: 'Cargando...',
        text: `Buscando ${titulo.toLowerCase()} futuras...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`${API_BASE}/api/conductores`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("Error fetching data");
      const data = await response.json();
      
      const hoy = new Date();
      const hoyStr = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const futuros = [];
      data.forEach(c => {
        if (c[tipo]) {
          const detalles = typeof c[tipo] === 'string' ? JSON.parse(c[tipo]) : c[tipo];
          if (Array.isArray(detalles)) {
            detalles.forEach(item => {
              if (item.fecha && item.fecha >= hoyStr) {
                futuros.push({ 
                  nombre: c.nombre || c.nombres || 'Operador', 
                  tarjeton: c.numero_tarjeton || c.tarjeton || 'S/T', 
                  fecha: item.fecha, 
                  motivo: (item.motivo === 'Asignación manual' || !item.motivo) ? '' : item.motivo 
                });
              }
            });
          }
        }
      });

      futuros.sort((a, b) => a.fecha.localeCompare(b.fecha));

      if (futuros.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin Asignaciones',
          text: `No hay ${titulo.toLowerCase()} programadas a futuro.`
        });
        return;
      }

      let tableHtml = `
        <div style="max-height: 400px; overflow-y: auto; text-align: left; font-size: 0.9rem;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="position: sticky; top: 0; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <th style="padding: 8px; border-bottom: 2px solid ${color}; color: ${color};">Fecha</th>
                <th style="padding: 8px; border-bottom: 2px solid ${color}; color: ${color};">Operador</th>
                <th style="padding: 8px; border-bottom: 2px solid ${color}; color: ${color};">Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${futuros.map(f => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; font-weight: bold;">${f.fecha}</td>
                  <td style="padding: 8px;">[${f.tarjeton}] ${f.nombre}</td>
                  <td style="padding: 8px; color: #64748b;">${f.motivo || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      Swal.fire({
        title: `Próximas ${titulo}`,
        html: tableHtml,
        width: '600px',
        confirmButtonColor: color,
        confirmButtonText: 'Cerrar'
      });

    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las asignaciones.' });
    }
  };

  return (
    <div className="itinerario-container">
      <div className="itinerario-header">
        <div className="itinerario-filters">
          <div className="filter-group">
            <label>Desde:</label>
            <AppleDatePicker value={desde} onChange={setDesde} disableFuture={true} />
          </div>
          <div className="filter-group">
            <label>Hasta:</label>
            <AppleDatePicker value={hasta} onChange={setHasta} disableFuture={true} minDate={desde} />
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

      {/* CUADRO DE SIMBOLOGÍA INSTITUCIONAL */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-4">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Simbología / Leyenda de Estatus
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {/* ASISTENCIA */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <span className="w-8 h-8 bg-[#a7f3d0] text-[#065f46] font-black text-xs flex items-center justify-center border-r border-slate-300">
                A
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                ASISTENCIA
              </span>
            </div>

            {/* DESCANSO */}
            <div 
              className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:scale-105 transition-transform"
              onClick={() => verAsignacionesFuturas('descansos_detalle', 'DESCANSOS', '#9a3412')}
              title="Ver Descansos Futuros"
            >
              <span className="w-8 h-8 bg-[#fed7aa] text-[#9a3412] font-black text-xs flex items-center justify-center border-r border-slate-300">
                D
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                DESCANSO
              </span>
            </div>

            {/* VACACIONES */}
            <div 
              className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:scale-105 transition-transform"
              onClick={() => verAsignacionesFuturas('vacaciones_detalle', 'VACACIONES', '#854d0e')}
              title="Ver Vacaciones Futuras"
            >
              <span className="w-8 h-8 bg-[#fef08a] text-[#854d0e] font-black text-xs flex items-center justify-center border-r border-slate-300">
                V
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                VACACIONES
              </span>
            </div>

            {/* INCAPACIDAD */}
            <div 
              className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:scale-105 transition-transform"
              onClick={() => verAsignacionesFuturas('incapacidades_detalle', 'INCAPACIDADES', '#1e40af')}
              title="Ver Incapacidades Futuras"
            >
              <span className="w-8 h-8 bg-[#bfdbfe] text-[#1e40af] font-black text-xs flex items-center justify-center border-r border-slate-300">
                I
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                INCAPACIDAD
              </span>
            </div>

            {/* FALTA */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <span className="w-8 h-8 bg-[#c51d23] text-white font-black text-xs flex items-center justify-center border-r border-slate-300">
                F
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2">
                FALTA
              </span>
            </div>

            {/* DESCANSO PERMUTA */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs" title="Descanso por Permuta">
              <span className="w-8 h-8 bg-[#ede9fe] text-[#6d28d9] font-black text-xs flex items-center justify-center border-r border-slate-300">
                DP
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2">
                DESCANSO (PERMUTA)
              </span>
            </div>

            {/* ASISTENCIA PERMUTA */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs" title="Asistencia por Permuta">
              <span className="w-8 h-8 bg-[#e0e7ff] text-[#3730a3] font-black text-xs flex items-center justify-center border-r border-slate-300">
                AP
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2">
                ASISTENCIA (PERMUTA)
              </span>
            </div>

            {/* RETARDO */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <span className="w-8 h-8 bg-[#ffedd5] text-[#ea580c] font-black text-xs flex items-center justify-center border-r border-slate-300">
                R
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2">
                RETARDO
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 italic font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 max-w-xs">
          💡 Nota: Las faltas y asistencias son actualizadas automáticamente desde los módulos de Programación, Control de Conductores y Despacho.
        </div>
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
                <th className="sticky-col sum-col header-ap" title="Total Asistencias Permuta">AP</th>
                <th className="sticky-col sum-col header-dp" title="Total Descansos Permuta">DP</th>
                <th className="sticky-col sum-col header-r" title="Total Retardos">R</th>
                {data.fechas.map(f => {
                  const [y, m, d] = f.split('-');
                  return <th key={f} className="day-col" title={f}>{d}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {registrosPaginados.map(c => (
                <tr key={c.id}>
                  <td className="sticky-col first-col font-mono">{c.tarjeton}</td>
                  <td className="sticky-col second-col conductor-nombre">{c.nombre}</td>
                  <td className="sticky-col sum-col sum-val-a">{c.totales?.A || 0}</td>
                  <td className="sticky-col sum-col sum-val-d">{c.totales?.D || 0}</td>
                  <td className="sticky-col sum-col sum-val-v">{c.totales?.V || 0}</td>
                  <td className="sticky-col sum-col sum-val-i">{c.totales?.I || 0}</td>
                  <td className="sticky-col sum-col sum-val-f">{c.totales?.F || 0}</td>
                  <td className="sticky-col sum-col sum-val-ap">{c.totales?.AP || 0}</td>
                  <td className="sticky-col sum-col sum-val-dp">{c.totales?.DP || 0}</td>
                  <td className="sticky-col sum-col sum-val-r">{c.totales?.R || 0}</td>
                  
                  {data.fechas.map(f => {
                    const estado = c.dias[f];
                    const motivo = c.motivos && c.motivos[f] ? ` | Motivo: ${c.motivos[f]}` : '';
                    return (
                      <td key={f} className="day-cell">
                        <div className={`status-bubble ${getCellClass(estado)}`} title={`${f} - ${getCellLabel(estado)}${motivo}`}>
                          {estado}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={10 + data.fechas.length} className="no-results">
                    No se encontraron conductores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Controles de Paginación */}
      {!cargando && totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 mt-2 rounded-xl">
          <div className="text-sm text-slate-500">
            Mostrando <span className="font-medium">{indiceInicio + 1}</span> a <span className="font-medium">{Math.min(indiceInicio + registrosPorPagina, filtrados.length)}</span> de <span className="font-medium">{filtrados.length}</span> conductores
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-slate-700">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

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
