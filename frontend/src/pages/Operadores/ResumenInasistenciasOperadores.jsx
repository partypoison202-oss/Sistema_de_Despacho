import React, { useState, useEffect, useMemo } from 'react';
import API_BASE from '../../config/api';

export default function ResumenInasistenciasOperadores({ getAuthHeaders }) {
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });

  const [loading, setLoading] = useState(false);
  const [dataResumen, setDataResumen] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const fetchResumen = async (mes) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders ? getAuthHeaders() : {};
      const res = await fetch(`${API_BASE}/api/conductores/resumen-inasistencias?mes=${mes}`, {
        headers
      });

      if (!res.ok) throw new Error('Error al obtener resumen de inasistencias');
      const data = await res.json();
      setDataResumen(data);
    } catch (err) {
      console.error('Error cargando resumen inasistencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumen(mesSeleccionado);
  }, [mesSeleccionado]);

  // Cambiar mes (anterior / siguiente)
  const handleCambiarMes = (delta) => {
    const [ano, mes] = mesSeleccionado.split('-').map(Number);
    const date = new Date(ano, mes - 1 + delta, 1);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setMesSeleccionado(`${date.getFullYear()}-${m}`);
  };

  // Filtrar conductores por texto de búsqueda
  const conductoresFiltrados = useMemo(() => {
    if (!dataResumen?.conductores) return [];
    if (!busqueda.trim()) return dataResumen.conductores;

    const q = busqueda.toLowerCase().trim();
    return dataResumen.conductores.filter(c => {
      const nom = (c.nombre || '').toLowerCase();
      const tarj = (c.tarjeton || '').toLowerCase();
      return nom.includes(q) || tarj.includes(q);
    });
  }, [dataResumen, busqueda]);

  const diasCount = dataResumen?.dias_mes || 30;
  const listaDias = Array.from({ length: diasCount }, (_, i) => String(i + 1).padStart(2, '0'));

  return (
    <div className="resumen-inasistencias-container bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mt-8 space-y-6">
      
      {/* ENCABEZADO INSTITUCIONAL */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#6b1d33] text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
              SITMAH &bull; MOVILIDAD
            </span>
            <span className="text-slate-400 text-xs font-semibold">Secretaría de Movilidad y Transporte</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
            RESUMEN DE INASISTENCIAS OPERADORES
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Matriz mensual de control de asistencias y faltas por persona conductora
          </p>
        </div>

        {/* NAVEGACIÓN Y BUSCADOR */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Mes */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => handleCambiarMes(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors font-bold text-xs"
              title="Mes Anterior"
            >
              ◀
            </button>
            <span className="px-3 font-extrabold text-xs text-slate-800 uppercase tracking-wider min-w-[140px] text-center">
              {dataResumen?.nombre_mes || mesSeleccionado}
            </span>
            <button
              type="button"
              onClick={() => handleCambiarMes(1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors font-bold text-xs"
              title="Mes Siguiente"
            >
              ▶
            </button>
          </div>

          {/* Input Buscador */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <input
              type="text"
              placeholder="Buscar por tarjetón o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6b1d33]/20"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* TABLA DE RESUMEN Y DÍAS */}
      <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-inner max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">
            <div className="w-8 h-8 border-3 border-[#6b1d33] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando matriz de inasistencias...
          </div>
        ) : (
          <table className="w-full border-collapse text-[11px] text-slate-800 select-none">
            <thead>
              {/* FILA ENCABEZADO PRINCIPAL */}
              <tr className="bg-slate-800 text-white font-extrabold text-center uppercase tracking-wider">
                <th className="py-2.5 px-3 bg-[#501323] text-white border-r border-b border-[#6b1d33] min-w-[70px] sticky left-0 z-20">
                  TRJ.
                </th>
                <th className="py-2.5 px-3 bg-[#501323] text-white border-r border-b border-[#6b1d33] text-left min-w-[220px] sticky left-[70px] z-20">
                  OPERADOR
                </th>
                
                {/* SUB-ENCABEZADO RESÚMEN */}
                <th colSpan="5" className="py-2.5 px-2 bg-slate-700 border-r border-b border-slate-600 text-center">
                  RESÚMEN
                </th>

                {/* MES ENCABEZADO */}
                <th colSpan={diasCount} className="py-2.5 px-2 bg-slate-900 border-b border-slate-700 text-center tracking-widest">
                  {dataResumen?.nombre_mes || 'SEPTIEMBRE 2026'}
                </th>
              </tr>

              {/* FILA SUB-ENCABEZADO DE COLUMNAS A D V I F Y DÍAS */}
              <tr className="bg-slate-100 text-slate-700 font-black text-center border-b border-slate-300 text-[10px]">
                <th className="py-1 px-1 bg-slate-200 border-r border-slate-300 sticky left-0 z-20"></th>
                <th className="py-1 px-1 bg-slate-200 border-r border-slate-300 sticky left-[70px] z-20"></th>

                {/* COLUMNAS DE RESUMEN */}
                <th className="py-1.5 px-2 bg-[#a7f3d0] text-[#065f46] border-r border-slate-300 font-extrabold">A</th>
                <th className="py-1.5 px-2 bg-[#fed7aa] text-[#9a3412] border-r border-slate-300 font-extrabold">D</th>
                <th className="py-1.5 px-2 bg-[#fef08a] text-[#854d0e] border-r border-slate-300 font-extrabold">V</th>
                <th className="py-1.5 px-2 bg-[#bfdbfe] text-[#1e40af] border-r border-slate-300 font-extrabold">I</th>
                <th className="py-1.5 px-2 bg-[#dc2626] text-white border-r border-slate-400 font-extrabold">F</th>

                {/* DÍAS DEL MES 01 AL 30/31 */}
                {listaDias.map((d) => (
                  <th key={d} className="py-1 px-1.5 bg-slate-800 text-white border-r border-slate-700 font-bold min-w-[26px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>

            {/* CUERPO DE LA TABLA */}
            <tbody className="divide-y divide-slate-200 font-medium bg-white">
              {conductoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7 + diasCount} className="py-8 text-center text-slate-400 italic">
                    No se encontraron registros de conductores para este filtro.
                  </td>
                </tr>
              ) : (
                conductoresFiltrados.map((c, rowIdx) => {
                  const bgFila = rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

                  return (
                    <tr key={c.id} className={`${bgFila} hover:bg-amber-50/30 transition-colors`}>
                      {/* TARJETÓN */}
                      <td className="py-2 px-3 font-extrabold text-[#6b1d33] border-r border-slate-200 text-center sticky left-0 bg-white z-10">
                        {c.tarjeton?.replace(/_BAJA_.*/, '') || '-'}
                      </td>

                      {/* NOMBRE OPERADOR */}
                      <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200 truncate max-w-[240px] sticky left-[70px] bg-white z-10">
                        {c.nombre}
                      </td>

                      {/* TOTALES RESÚMEN */}
                      <td className="py-2 px-2 text-center font-black text-emerald-800 bg-emerald-50/60 border-r border-slate-200">
                        {c.resumen?.A || 0}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-amber-800 bg-amber-50/60 border-r border-slate-200">
                        {c.resumen?.D || 0}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-yellow-800 bg-yellow-50/60 border-r border-slate-200">
                        {c.resumen?.V || 0}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-blue-800 bg-blue-50/60 border-r border-slate-200">
                        {c.resumen?.I || 0}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-red-700 bg-red-50/80 border-r border-slate-300">
                        {c.resumen?.F || 0}
                      </td>

                      {/* DÍAS INDIVIDUALES */}
                      {listaDias.map((dKey) => {
                        const val = c.dias ? c.dias[dKey] : null;

                        let styleCls = 'bg-slate-50/40 text-slate-300';
                        if (val === 'A') {
                          styleCls = 'bg-[#a7f3d0] text-[#065f46] font-black'; // Asistencia Verde
                        } else if (val === 'F') {
                          styleCls = 'bg-[#c51d23] text-white font-black'; // Falta Rojo
                        } else if (val === 'D') {
                          styleCls = 'bg-[#fed7aa] text-[#9a3412] font-black'; // Descanso Naranja
                        } else if (val === 'V') {
                          styleCls = 'bg-[#fef08a] text-[#854d0e] font-black'; // Vacaciones Amarillo
                        } else if (val === 'I') {
                          styleCls = 'bg-[#bfdbfe] text-[#1e40af] font-black'; // Incapacidad Azul
                        }

                        return (
                          <td
                            key={dKey}
                            className={`py-1 px-1 text-center border-r border-slate-200 ${styleCls}`}
                          >
                            {val || ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* CUADRO DE SIMBOLOGÍA (REPRODUCCIÓN DE IMAGEN 2) */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Simbología / Leyenda de Estatus
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <span className="w-8 h-8 bg-[#fed7aa] text-[#9a3412] font-black text-xs flex items-center justify-center border-r border-slate-300">
                D
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                DESCANSO
              </span>
            </div>

            {/* VACACIONES */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <span className="w-8 h-8 bg-[#fef08a] text-[#854d0e] font-black text-xs flex items-center justify-center border-r border-slate-300">
                V
              </span>
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                VACACIONES
              </span>
            </div>

            {/* INCAPACIDAD */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
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
              <span className="text-[11px] font-extrabold text-slate-700 pr-3">
                FALTA
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 italic font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 max-w-xs">
          💡 Nota: Las faltas y asistencias son actualizadas automáticamente desde los módulos de Programación, Control de Conductores y Despacho.
        </div>
      </div>

    </div>
  );
}
