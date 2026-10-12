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
  const [filtroEstatus, setFiltroEstatus] = useState(null);
  
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

  // Reiniciar a la página 1 cuando cambia la búsqueda o el filtro de estatus
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstatus]);

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

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  };

  const parseDateToTimestamp = (str) => {
    if (!str) return 0;
    const mYmd = String(str).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (mYmd) {
      const [, y, m, d] = mYmd;
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
    }
    const mDmy = String(str).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (mDmy) {
      const [, d, m, y] = mDmy;
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
    }
    const t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
  };

  const getDiaSemana = (str) => {
    const ts = parseDateToTimestamp(str);
    if (!ts) return '';
    const dt = new Date(ts);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[dt.getDay()] || '';
  };

  const formatFechaDMY = (str) => {
    if (!str) return '-';
    const mYmd = String(str).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (mYmd) {
      const [, y, m, d] = mYmd;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    const mDmy = String(str).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (mDmy) {
      const [, d, m, y] = mDmy;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const d = String(dt.getDate()).padStart(2, '0');
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const y = dt.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return str;
  };

  const verAsignacionesFuturas = async (tipo, titulo, color, subtipo = null) => {
    try {
      let dataConductores = Array.isArray(conductores) && conductores.length > 0 ? conductores : [];
      
      if (dataConductores.length === 0) {
        Swal.fire({
          title: 'Cargando...',
          text: `Buscando ${titulo.toLowerCase()} programadas...`,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await fetch(`${API_BASE}/api/conductores`, {
          headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error("Error fetching data");
        dataConductores = await response.json();
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hoyTimestamp = hoy.getTime();

      const parseArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const futuros = [];

      dataConductores.forEach(c => {
        let items = [];

        if (tipo === 'faltas_detalle') {
          // Solo faltas reales (excluir retardos si vienen registrados en faltas)
          const arr = parseArray(c.faltas_detalle);
          items = arr.filter(item => item && item.estado !== 'retardo');
        } else if (tipo === 'retardos_detalle') {
          // Incluir de retardos_detalle y de faltas_detalle con estado=retardo
          const arr1 = parseArray(c.retardos_detalle);
          const arr2 = parseArray(c.faltas_detalle).filter(item => item && item.estado === 'retardo');
          items = [...arr1, ...arr2];
        } else if (tipo === 'permutas_detalle') {
          const arr = parseArray(c.permutas_detalle);
          if (subtipo) {
            items = arr.filter(item => item && item.tipo === subtipo);
          } else {
            items = arr;
          }
        } else {
          items = parseArray(c[tipo]);
        }

        items.forEach(item => {
          if (!item) return;
          const rawFecha = typeof item === 'string' ? item : item.fecha;
          if (!rawFecha) return;

          const ts = parseDateToTimestamp(rawFecha);
          if (ts >= hoyTimestamp) {
            const rawTarjeton = c.tarjeton || c.numero_tarjeton || '';
            const tarjetonLimpio = rawTarjeton ? String(rawTarjeton.split('_BAJA_')[0]).padStart(4, '0') : 'S/T';
            const rawNombre = c.nombre || `${c.nombres || ''} ${c.apellidos || ''}`.trim() || 'Operador';
            const nombreLimpio = toTitleCase(rawNombre);
            const motivoTexto = typeof item === 'object' && item.motivo && item.motivo !== 'Asignación manual' ? item.motivo : '';
            
            futuros.push({
              id: c.id,
              tarjeton: tarjetonLimpio,
              nombre: nombreLimpio,
              fecha: rawFecha,
              timestamp: ts,
              fechaDMY: formatFechaDMY(rawFecha),
              diaSemana: getDiaSemana(rawFecha),
              motivo: motivoTexto
            });
          }
        });
      });

      // Ordenar estrictamente cronológico día/mes/año (timestamp ascendente), y en empate por número de tarjetón
      futuros.sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        return a.tarjeton.localeCompare(b.tarjeton);
      });

      if (futuros.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin Asignaciones',
          text: `No hay ${titulo.toLowerCase()} programadas a futuro (a partir de hoy).`,
          confirmButtonColor: '#6b1d33',
          confirmButtonText: 'Entendido'
        });
        return;
      }

      const tableHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: left;">
          <!-- Barra superior de búsqueda y conteo del modal -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; padding: 4px 2px;">
            <div style="position: relative; flex: 1; min-width: 240px;">
              <svg style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #94a3b8; pointer-events: none;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input 
                id="swal-futuros-search" 
                type="text" 
                placeholder="Filtrar por tarjetón, operador o fecha (dd/mm/aaaa)..." 
                style="width: 100%; box-sizing: border-box; padding: 7px 12px 7px 32px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 12px; outline: none; transition: border-color 0.2s;"
                onfocus="this.style.borderColor='#6b1d33'"
                onblur="this.style.borderColor='#cbd5e1'"
              />
            </div>
            <span id="swal-futuros-count" style="background: ${color}15; color: ${color}; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid ${color}35; white-space: nowrap;">
              ${futuros.length} ${futuros.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <!-- Contenedor con scroll y tabla -->
          <div style="max-height: 440px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px;">
              <thead style="position: sticky; top: 0; z-index: 10; background: #f8fafc;">
                <tr>
                  <th style="padding: 8px 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; color: #475569; border-bottom: 2px solid ${color}; width: 100px; text-align: left;">
                    Fecha
                  </th>
                  <th style="padding: 8px 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; color: #475569; border-bottom: 2px solid ${color}; text-align: left;">
                    Operador
                  </th>
                  <th style="padding: 8px 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; color: #475569; border-bottom: 2px solid ${color}; text-align: left;">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody id="swal-futuros-tbody">
                ${futuros.map((f, idx) => `
                  <tr class="swal-futuros-row" data-search="${f.tarjeton.toLowerCase()} ${f.nombre.toLowerCase()} ${f.fechaDMY.toLowerCase()} ${f.motivo.toLowerCase()}" style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; transition: background 0.15s;">
                    <td style="padding: 7px 12px; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
                      <span style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; font-weight: 700; color: #1e293b;">
                        ${f.fechaDMY}
                      </span>
                    </td>
                    <td style="padding: 7px 12px; border-bottom: 1px solid #f1f5f9;">
                      <div style="display: flex; align-items: center; gap: 7px;">
                        <span style="font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 800; font-size: 11px; background: rgba(107, 29, 51, 0.08); color: #6b1d33; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(107, 29, 51, 0.2); flex-shrink: 0;">
                          ${f.tarjeton}
                        </span>
                        <span style="font-weight: 700; color: #1e293b; font-size: 12px;">
                          ${f.nombre}
                        </span>
                      </div>
                    </td>
                    <td style="padding: 7px 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 11px; line-height: 1.35;">
                      ${f.motivo || '<span style="color: #94a3b8; font-style: italic;">Sin motivo registrado</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div id="swal-futuros-empty" style="display: none; padding: 30px; text-align: center; color: #64748b; font-size: 12px; font-weight: 600;">
              No se encontraron coincidencias para la búsqueda.
            </div>
          </div>
        </div>
      `;

      Swal.fire({
        title: `<div style="display:flex; align-items:center; justify-content:center; gap:8px; font-weight:900; font-size:19px; color:#1e293b;">
          <span>Próximas</span> 
          <span style="color:${color}; text-transform:uppercase; border-bottom: 2px solid ${color}60; padding-bottom: 1px;">${titulo}</span>
        </div>`,
        html: tableHtml,
        width: '720px',
        confirmButtonColor: '#6b1d33',
        confirmButtonText: 'Cerrar',
        customClass: {
          popup: 'rounded-2xl shadow-2xl border border-slate-100',
          confirmButton: 'rounded-xl font-bold px-7 py-2.5 shadow-sm cursor-pointer'
        },
        didOpen: () => {
          const searchInput = document.getElementById('swal-futuros-search');
          const rows = document.querySelectorAll('.swal-futuros-row');
          const countBadge = document.getElementById('swal-futuros-count');
          const emptyMsg = document.getElementById('swal-futuros-empty');

          if (searchInput) {
            searchInput.addEventListener('input', (e) => {
              const term = e.target.value.toLowerCase().trim();
              let visibleCount = 0;
              rows.forEach(row => {
                const text = row.getAttribute('data-search') || '';
                if (!term || text.includes(term)) {
                  row.style.display = '';
                  visibleCount++;
                } else {
                  row.style.display = 'none';
                }
              });
              if (countBadge) {
                countBadge.textContent = `${visibleCount} ${visibleCount === 1 ? 'registro' : 'registros'}`;
              }
              if (emptyMsg) {
                emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
              }
            });
          }
        }
      });

    } catch (error) {
      console.error(error);
      Swal.fire({ 
        icon: 'error', 
        title: 'Error', 
        text: 'No se pudieron cargar las asignaciones.',
        confirmButtonColor: '#6b1d33'
      });
    }
  };

  return (
    <div className="itinerario-container">
      <div className="itinerario-header">
        <div className="itinerario-filters">
          <div className="filter-group">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>Desde:</span>
            </label>
            <AppleDatePicker value={desde} onChange={setDesde} disableFuture={true} />
          </div>
          <div className="filter-group">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>Hasta:</span>
            </label>
            <AppleDatePicker value={hasta} onChange={setHasta} disableFuture={true} minDate={desde} />
          </div>
          <div className="filter-group" style={{ flex: 1, minWidth: '260px' }}>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>
              <span>Buscar Conductor:</span>
            </label>
            <div className="relative flex items-center w-full">
              <input 
                type="text" 
                className="itinerario-search !pl-9 !pr-8" 
                placeholder="Buscar por nombre o número de tarjetón..." 
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {busqueda && (
                <button 
                  type="button" 
                  onClick={() => setBusqueda('')} 
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-sm font-bold p-1 leading-none rounded-full hover:bg-slate-100"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="itinerario-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn-asignar-fechas" 
            onClick={() => generarPDFItinerario(data, desde, hasta)}
            disabled={cargando || !data.fechas || data.fechas.length === 0}
            style={{ backgroundColor: '#1e293b', opacity: (cargando || !data.fechas || data.fechas.length === 0) ? 0.5 : 1 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Imprimir PDF
          </button>
          <button className="btn-asignar-fechas" onClick={() => setModalOpen(true)}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Asignar Fechas (A, V, I, D, F)
          </button>
        </div>
      </div>

      {/* CUADRO DE SIMBOLOGÍA INSTITUCIONAL Y FILTROS RÁPIDOS */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider m-0 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Simbología / Filtros de Estatus
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {/* ASISTENCIA */}
            <div 
              className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
              title="Se registra automáticamente"
            >
              <span className="w-8 h-8 bg-[#a7f3d0] text-[#065f46] font-black text-xs flex items-center justify-center border-r border-slate-300">
                A
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                ASISTENCIA
              </span>
            </div>

            {/* DESCANSO */}
            <div 
              className="group flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:shadow-md hover:border-[#9a3412]/40 hover:-translate-y-0.5 transition-all"
              onClick={() => verAsignacionesFuturas('descansos_detalle', 'DESCANSOS', '#9a3412', 'D')}
              title="Ver Descansos Programados a Futuro (Día/Mes/Año)"
            >
              <span className="w-8 h-8 bg-[#fed7aa] text-[#9a3412] font-black text-xs flex items-center justify-center border-r border-slate-300 group-hover:bg-[#fdba74] transition-colors">
                D
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3 group-hover:text-[#9a3412] transition-colors">
                DESCANSO
              </span>
            </div>

            {/* VACACIONES */}
            <div 
              className="group flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:shadow-md hover:border-[#854d0e]/40 hover:-translate-y-0.5 transition-all"
              onClick={() => verAsignacionesFuturas('vacaciones_detalle', 'VACACIONES', '#854d0e', 'V')}
              title="Ver Vacaciones Programadas a Futuro (Día/Mes/Año)"
            >
              <span className="w-8 h-8 bg-[#fef08a] text-[#854d0e] font-black text-xs flex items-center justify-center border-r border-slate-300 group-hover:bg-[#fde047] transition-colors">
                V
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3 group-hover:text-[#854d0e] transition-colors">
                VACACIONES
              </span>
            </div>

            {/* INCAPACIDAD */}
            <div 
              className="group flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:shadow-md hover:border-[#1e40af]/40 hover:-translate-y-0.5 transition-all"
              onClick={() => verAsignacionesFuturas('incapacidades_detalle', 'INCAPACIDADES', '#1e40af', 'I')}
              title="Ver Incapacidades Programadas a Futuro (Día/Mes/Año)"
            >
              <span className="w-8 h-8 bg-[#bfdbfe] text-[#1e40af] font-black text-xs flex items-center justify-center border-r border-slate-300 group-hover:bg-[#93c5fd] transition-colors">
                I
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3 group-hover:text-[#1e40af] transition-colors">
                INCAPACIDAD
              </span>
            </div>

            {/* FALTA */}
            <div 
              className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
              title="Se registra automáticamente"
            >
              <span className="w-8 h-8 bg-[#c51d23] text-white font-black text-xs flex items-center justify-center border-r border-slate-300">
                F
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2">
                FALTA
              </span>
            </div>

            {/* DESCANSO PERMUTA */}
            <div 
              className="group flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:shadow-md hover:border-[#6d28d9]/40 hover:-translate-y-0.5 transition-all"
              onClick={() => verAsignacionesFuturas('permutas_detalle', 'DESCANSOS (PERMUTA)', '#6d28d9', 'DP')}
              title="Ver Descansos por Permuta Programados a Futuro (Día/Mes/Año)"
            >
              <span className="w-8 h-8 bg-[#ede9fe] text-[#6d28d9] font-black text-xs flex items-center justify-center border-r border-slate-300 group-hover:bg-[#ddd6fe] transition-colors">
                DP
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2 group-hover:text-[#6d28d9] transition-colors">
                DESCANSO (PERMUTA)
              </span>
            </div>

            {/* ASISTENCIA PERMUTA */}
            <div 
              className="group flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs cursor-pointer hover:shadow-md hover:border-[#3730a3]/40 hover:-translate-y-0.5 transition-all"
              onClick={() => verAsignacionesFuturas('permutas_detalle', 'ASISTENCIAS (PERMUTA)', '#3730a3', 'AP')}
              title="Ver Asistencias por Permuta Programadas a Futuro (Día/Mes/Año)"
            >
              <span className="w-8 h-8 bg-[#e0e7ff] text-[#3730a3] font-black text-xs flex items-center justify-center border-r border-slate-300 group-hover:bg-[#c7d2fe] transition-colors">
                AP
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2 group-hover:text-[#3730a3] transition-colors">
                ASISTENCIA (PERMUTA)
              </span>
            </div>

            {/* RETARDO */}
            <div 
              className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs"
              title="Se registra automáticamente"
            >
              <span className="w-8 h-8 bg-[#ffedd5] text-[#ea580c] font-black text-xs flex items-center justify-center border-r border-slate-300">
                R
              </span>
              <span className="text-[10px] font-extrabold text-slate-700 pr-2">
                RETARDO
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 italic font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 max-w-xs shadow-2xs">
          💡 Nota: Las faltas y asistencias son actualizadas automáticamente desde los módulos de Programación, Control de Conductores y Despacho.
        </div>
      </div>

      {/* Controles de Paginación Superior */}
      {!cargando && totalPaginas > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 shadow-2xs gap-3">
          <div className="text-xs sm:text-sm text-slate-600">
            Mostrando <span className="font-bold text-slate-800">{indiceInicio + 1}</span> a <span className="font-bold text-slate-800">{Math.min(indiceInicio + registrosPorPagina, filtrados.length)}</span> de <span className="font-bold text-slate-800">{filtrados.length}</span> conductores
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              Anterior
            </button>
            <span className="text-xs sm:text-sm font-bold text-slate-700 px-1">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <div className="itinerario-grid-wrapper">
        {cargando ? (
          <div className="itinerario-loading">Cargando itinerario...</div>
        ) : (
          <table className="itinerario-table">
            <thead>
              <tr>
                <th className="sticky-col first-col">TARJETÓN</th>
                <th className="sticky-col second-col">OPERADOR</th>
                {[
                  ['A', 'header-a', 'Asistencias'],
                  ['D', 'header-d', 'Descansos'],
                  ['V', 'header-v', 'Vacaciones'],
                  ['I', 'header-i', 'Incapacidades'],
                  ['F', 'header-f', 'Faltas'],
                  ['AP', 'header-ap', 'Asistencias Permuta'],
                  ['DP', 'header-dp', 'Descansos Permuta'],
                  ['R', 'header-r', 'Retardos']
                ].filter(([letra]) => !filtroEstatus || filtroEstatus === letra).map(([letra, clase, nombre]) => (
                  <th
                    key={letra}
                    className={`sum-col ${clase}`}
                    title={filtroEstatus === letra ? `Filtro activo de ${nombre}. Clic para quitar y ver todas` : `Mostrar solo la columna de ${nombre}`}
                    onClick={() => setFiltroEstatus(prev => (prev === letra ? null : letra))}
                    style={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      boxShadow: filtroEstatus === letra ? 'inset 0 -3px 0 currentColor' : undefined
                    }}
                  >
                    {filtroEstatus === letra ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {letra} <span style={{ fontSize: '9px', opacity: 0.8 }}>✕</span>
                      </span>
                    ) : letra}
                  </th>
                ))}
                {data.fechas.map(f => {
                  const [y, m, d] = f.split('-');
                  return <th key={f} className="day-col" title={`Fecha: ${formatFechaDMY(f)}`}>{d}</th>
                })}
              </tr>
            </thead>
            <tbody>
              {registrosPaginados.map(c => (
                <tr key={c.id}>
                  <td className="sticky-col first-col font-mono">{c.tarjeton}</td>
                  <td className="sticky-col second-col conductor-nombre">{c.nombre}</td>
                  {[
                    ['A', 'sum-val-a'],
                    ['D', 'sum-val-d'],
                    ['V', 'sum-val-v'],
                    ['I', 'sum-val-i'],
                    ['F', 'sum-val-f'],
                    ['AP', 'sum-val-ap'],
                    ['DP', 'sum-val-dp'],
                    ['R', 'sum-val-r']
                  ].filter(([letra]) => !filtroEstatus || filtroEstatus === letra).map(([letra, clase]) => (
                    <td key={letra} className={`sum-col ${clase}`}>{c.totales?.[letra] || 0}</td>
                  ))}
                  
                  {data.fechas.map(f => {
                    const estadoReal = c.dias[f];
                    const coincide = !filtroEstatus || estadoReal === filtroEstatus;
                    const estado = coincide ? estadoReal : '';
                    const motivo = coincide && c.motivos && c.motivos[f] ? ` | Motivo: ${c.motivos[f]}` : '';
                    return (
                      <td key={f} className="day-cell">
                        {coincide && estado ? (
                          <div className={`status-bubble ${getCellClass(estado)}`} title={`${formatFechaDMY(f)} - ${getCellLabel(estado)}${motivo}`}>
                            {estado}
                          </div>
                        ) : (
                          <div className="status-bubble" style={{ opacity: 0 }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={(filtroEstatus ? 3 : 10) + data.fechas.length} className="no-results">
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
        origen="Itinerario de Asistencias"
        onSuccess={() => {
          setModalOpen(false);
          fetchItinerario();
        }}
      />
    </div>
  );
}
