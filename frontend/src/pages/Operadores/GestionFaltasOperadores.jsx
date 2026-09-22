import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';

const getFaltasArray = (conductor) => {
  if (!conductor) return [];
  const val = conductor.faltas_detalle;
  let items = [];
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === 'string' && val.trim() !== '') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }
  }

  // Si el conductor tiene una cantidad de faltas numéricas superior a los items registrados en faltas_detalle,
  // generamos faltas pendientes virtuales para que el usuario pueda seleccionar y justificar cada una.
  const faltasNumericas = Number(conductor.faltas) || 0;
  const pendientesRegistradas = items.filter(f => f.estado !== 'justificada' && !f.justificada).length;
  
  if (faltasNumericas > pendientesRegistradas) {
    const faltasFaltantes = faltasNumericas - pendientesRegistradas;
    for (let i = 0; i < faltasFaltantes; i++) {
      items.push({
        id: `virtual_falta_${conductor.id}_${i}_${Date.now()}`,
        fecha: conductor.updated_at ? String(conductor.updated_at).substring(0, 10) : 'Fecha sin registrar',
        motivo: 'Inasistencia no justificada en sistema',
        estado: 'pendiente',
        justificada: false
      });
    }
  }

  return items;
};

export default function GestionFaltasOperadores({ conductores = [], onRefresh, getAuthHeaders, readOnly = false }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS'); // TODOS, PENDIENTES, JUSTIFICADAS
  const [conductorSeleccionado, setConductorSeleccionado] = useState(null);
  
  // Modal de Subida de Justificante
  const [modalSubidaOpen, setModalSubidaOpen] = useState(false);
  const [faltaAJustificar, setFaltaAJustificar] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [observacionesJustificante, setObservacionesJustificante] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  // Modal para agregar falta manual
  const [modalNuevaFaltaOpen, setModalNuevaFaltaOpen] = useState(false);
  const [nuevaFechaFalta, setNuevaFechaFalta] = useState(new Date().toISOString().substring(0, 10));
  const [nuevoMotivoFalta, setNuevoMotivoFalta] = useState('Inasistencia no justificada');
  const [registrandoFalta, setRegistrandoFalta] = useState(false);

  // Procesar lista de conductores con faltas o historial
  const conductoresConFaltas = useMemo(() => {
    return conductores.map(c => {
      const listaFaltas = getFaltasArray(c);
      const pendientesCount = (Number(c.faltas) || 0);
      const justificadasCount = listaFaltas.filter(f => f.estado === 'justificada' || f.justificada).length;
      const totalHistorico = pendientesCount + justificadasCount;
      const esInhabilitado = c.estatus === 'inhabilitado' || c.info_ventana_faltas?.inhabilitado;

      return {
        ...c,
        listaFaltas,
        pendientesCount,
        justificadasCount,
        totalHistorico,
        esInhabilitado
      };
    }).filter(c => {
      // Filtrar sólo quienes tienen al menos 1 falta (activa o justificada) o están inhabilitados
      if (c.pendientesCount === 0 && c.justificadasCount === 0 && !c.esInhabilitado) return false;

      // Filtro por estatus de falta
      if (filtroEstatus === 'PENDIENTES' && c.pendientesCount === 0) return false;
      if (filtroEstatus === 'JUSTIFICADAS' && c.justificadasCount === 0) return false;
      if (filtroEstatus === 'INHABILITADOS' && !c.esInhabilitado) return false;

      // Filtro por texto de búsqueda
      if (busqueda.trim() !== '') {
        const q = busqueda.toLowerCase().trim();
        const nom = (c.nombre || '').toLowerCase();
        const tarj = (c.tarjeton || '').toLowerCase();
        const tipo = (c.tipo_tarjeton || '').toLowerCase();

        return nom.includes(q) || tarj.includes(q) || tipo.includes(q);
      }

      return true;
    });
  }, [conductores, filtroEstatus, busqueda]);

  // KPIs Resumen
  const kpis = useMemo(() => {
    let totalConductoresConFaltas = 0;
    let totalFaltasPendientes = 0;
    let totalFaltasJustificadas = 0;
    let totalInhabilitados = 0;

    conductores.forEach(c => {
      const lista = getFaltasArray(c);
      const pend = Number(c.faltas) || 0;
      const just = lista.filter(f => f.estado === 'justificada' || f.justificada).length;
      const esInhabilitado = c.estatus === 'inhabilitado' || c.info_ventana_faltas?.inhabilitado;

      if (pend > 0 || just > 0 || esInhabilitado) totalConductoresConFaltas++;
      totalFaltasPendientes += pend;
      totalFaltasJustificadas += just;
      if (esInhabilitado) totalInhabilitados++;
    });

    return { totalConductoresConFaltas, totalFaltasPendientes, totalFaltasJustificadas, totalInhabilitados };
  }, [conductores]);

  // Actualizar conductor seleccionado si la lista cambia
  const conductorActualData = useMemo(() => {
    if (!conductorSeleccionado) return null;
    const actualizado = conductores.find(c => c.id === conductorSeleccionado.id);
    if (!actualizado) return conductorSeleccionado;
    const listaFaltas = getFaltasArray(actualizado);
    const pendientesCount = Number(actualizado.faltas) || 0;
    const justificadasCount = listaFaltas.filter(f => f.estado === 'justificada' || f.justificada).length;

    return {
      ...actualizado,
      listaFaltas,
      pendientesCount,
      justificadasCount
    };
  }, [conductores, conductorSeleccionado]);

  // Handler para subir justificante
  const handleGuardarJustificante = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo requerido',
        text: 'Por favor selecciona un archivo (PDF, PNG, JPG, JPEG o WebP) como justificante.',
        confirmButtonColor: '#6b1d33'
      });
      return;
    }

    if (!conductorActualData || !faltaAJustificar) return;

    setSubiendo(true);

    try {
      const formData = new FormData();
      formData.append('justificante', archivoSeleccionado);
      if (faltaAJustificar.id) formData.append('falta_id', faltaAJustificar.id);
      if (faltaAJustificar.index !== undefined) formData.append('falta_index', faltaAJustificar.index);
      if (observacionesJustificante) formData.append('observaciones', observacionesJustificante);
      if (faltaAJustificar.fecha) formData.append('fecha_falta', faltaAJustificar.fecha);
      if (faltaAJustificar.motivo) formData.append('motivo_falta', faltaAJustificar.motivo);

      const headers = getAuthHeaders ? getAuthHeaders() : {};
      delete headers['Content-Type']; // Dejar que fetch establezca el multipart boundary

      const res = await fetch(`${API_BASE}/api/conductores/${conductorActualData.id}/justificar-falta`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar justificante');

      Swal.fire({
        icon: 'success',
        title: '¡Falta Justificada!',
        text: 'El justificante ha sido guardado exitosamente. La falta fue descontada y ya no contará como activa.',
        confirmButtonColor: '#10b981'
      });

      setModalSubidaOpen(false);
      setArchivoSeleccionado(null);
      setObservacionesJustificante('');
      setFaltaAJustificar(null);

      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Carga',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setSubiendo(false);
    }
  };

  // Handler para agregar una nueva falta manual
  const handleRegistrarNuevaFalta = async (e) => {
    e.preventDefault();
    if (!conductorActualData) return;

    setRegistrandoFalta(true);
    try {
      const headers = getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      headers['Content-Type'] = 'application/json';

      const res = await fetch(`${API_BASE}/api/conductores/${conductorActualData.id}/agregar-falta`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          fecha: nuevaFechaFalta,
          motivo: nuevoMotivoFalta
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar falta');

      Swal.fire({
        icon: 'success',
        title: 'Falta Registrada',
        text: 'La falta se ha registrado al expediente del operador.',
        confirmButtonColor: '#10b981',
        timer: 1500
      });

      setModalNuevaFaltaOpen(false);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setRegistrandoFalta(false);
    }
  };

  return (
    <div className="gestion-faltas-container space-y-6">
      
      {/* TARJETAS RESUMEN DE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#6b1d33]">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Conductores con Faltas</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-800">{kpis.totalConductoresConFaltas}</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Expedientes
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#ef4444]">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Faltas Pendientes (Activas)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-red-600">{kpis.totalFaltasPendientes}</h3>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
              Por Justificar
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#10b981]">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Faltas Justificadas</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-emerald-600">{kpis.totalFaltasJustificadas}</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Con Comprobante
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        
        {/* CHIPS DE FILTRO */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroEstatus('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroEstatus === 'TODOS'
                ? 'bg-[#6b1d33] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({kpis.totalConductoresConFaltas})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstatus('PENDIENTES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroEstatus === 'PENDIENTES'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            Faltas Pendientes ({kpis.totalFaltasPendientes})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstatus('JUSTIFICADAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroEstatus === 'JUSTIFICADAS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            Justificadas ({kpis.totalFaltasJustificadas})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstatus('INHABILITADOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroEstatus === 'INHABILITADOS'
                ? 'bg-[#dc2626] text-white shadow-sm ring-2 ring-red-400'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
          >
            Inhabilitados ({kpis.totalInhabilitados})
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por tarjetón, nombre del conductor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6b1d33]/20 focus:border-[#6b1d33] transition-all"
          />
        </div>
      </div>

      {/* TABLA DE CONDUCTORES CON FALTAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {conductoresConFaltas.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-bold text-slate-700">No se encontraron conductores con faltas</p>
            <p className="text-xs text-slate-500 mt-1">Intenta ajustar los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tarjetón</th>
                  <th className="py-3.5 px-4">Conductor</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4 text-center">Faltas Pendientes</th>
                  <th className="py-3.5 px-4 text-center">Faltas Justificadas</th>
                  <th className="py-3.5 px-4">Estatus Servicio</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {conductoresConFaltas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-[#6b1d33] border border-slate-200">
                        {c.tarjeton}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{c.nombre}</div>
                      {c.telefono && <div className="text-[11px] text-slate-400">Tel: {c.telefono}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {c.tipo_tarjeton ? `Tipo ${c.tipo_tarjeton}` : 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.pendientesCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200">
                          {c.pendientesCount} {c.pendientesCount === 1 ? 'falta activa' : 'faltas activas'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                          0 activas
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.justificadasCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {c.justificadasCount} justificadas
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.esInhabilitado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-sm border border-red-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                          INHABILITADO
                        </span>
                      ) : (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          c.estado_servicio === 'falta' ? 'bg-red-100 text-red-800' :
                          c.estado_servicio === 'en_servicio' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {(c.estado_servicio || 'disponible').toUpperCase().replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setConductorSeleccionado(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6b1d33] hover:bg-[#831843] text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver Faltas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL / DRAWER: DETALLE DE FALTAS DEL CONDUCTOR */}
      {conductorActualData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            
            {/* Header del Modal */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6b1d33]/10 text-[#6b1d33] flex items-center justify-center font-bold text-lg">
                  {conductorActualData.tarjeton || 'T6'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-lg">{conductorActualData.nombre}</h3>
                    {(conductorActualData.estatus === 'inhabilitado' || conductorActualData.info_ventana_faltas?.inhabilitado) && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white uppercase tracking-wider">
                        INHABILITADO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Tarjetón: <strong className="text-[#6b1d33]">{conductorActualData.tarjeton}</strong> &bull; {conductorActualData.tipo_tarjeton ? `Tipo ${conductorActualData.tipo_tarjeton}` : 'General'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConductorSeleccionado(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sub-header de estadísticas rápida */}
            <div className="bg-slate-100/70 px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-red-700 bg-red-100/80 px-3 py-1 rounded-full border border-red-200">
                  Activas por Justificar: {conductorActualData.pendientesCount}
                </span>
                <span className="text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                  Justificadas: {conductorActualData.justificadasCount}
                </span>
              </div>

              {/* Botón Registrar Falta */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setModalNuevaFaltaOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Registrar Falta
                </button>
              )}
            </div>

            {/* Contenido principal del Modal: Lista de Faltas */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Tarjeta Informativa de la Ventana de 30 Días */}
              {(() => {
                const infoV = conductorActualData.info_ventana_faltas || {};
                const esInhab = conductorActualData.estatus === 'inhabilitado' || infoV.inhabilitado;
                const faltasV = infoV.faltas_ventana_activa ?? conductorActualData.pendientesCount;

                return (
                  <div className={`p-4 rounded-xl border ${
                    esInhab ? 'bg-red-50 border-red-300 ring-2 ring-red-400' :
                    faltasV >= 3 ? 'bg-amber-50 border-amber-300' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                            Ventana de Control (30 días naturales)
                          </span>
                          {esInhab ? (
                            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                              INHABILITADO (4/4 FALTAS)
                            </span>
                          ) : faltasV === 3 ? (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              RIESGO ALTO (3/4 FALTAS)
                            </span>
                          ) : (
                            <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              EN SEGUIMIENTO
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          Faltas en ventana activa: <strong className="text-slate-900">{faltasV} de 4 permisibles</strong>
                          {infoV.ventana_inicio && (
                            <span className="text-slate-500"> &bull; Del {infoV.ventana_inicio} al {infoV.ventana_fin} ({infoV.dias_restantes_ventana} días restantes)</span>
                          )}
                        </p>

                        {esInhab && (
                          <div className="mt-2 text-xs font-bold text-red-700 bg-red-100/90 p-2.5 rounded-lg border border-red-200">
                            ⚠️ ATENCIÓN: Este operador acumula 4 faltas no justificadas dentro del periodo de 30 días y ha sido inhabilitado automáticamente. No se puede utilizar en ninguna asignación del sistema hasta justificar las faltas requeridas.
                          </div>
                        )}
                        {!esInhab && faltasV === 3 && (
                          <div className="mt-2 text-xs font-bold text-amber-800 bg-amber-100/90 p-2 rounded-lg border border-amber-200">
                            ⚡ ALERTA: Con 1 falta no justificada más en esta ventana, el operador quedará inhabilitado automáticamente.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {conductorActualData.listaFaltas.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                  Este conductor no tiene faltas registradas en su historial.
                </div>
              ) : (
                conductorActualData.listaFaltas.map((falta, idx) => {
                  const esJustificada = falta.estado === 'justificada' || falta.justificada;

                  return (
                    <div
                      key={falta.id || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        esJustificada
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-red-50/40 border-red-200 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-sm">
                              Fecha: {falta.fecha || 'Sin fecha registrada'}
                            </span>
                            {esJustificada ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                JUSTIFICADA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-300">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="9" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                PENDIENTE POR JUSTIFICAR
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-600 font-medium">
                            Motivo: <strong>{falta.motivo || 'Inasistencia'}</strong>
                          </p>

                          {esJustificada && (
                            <div className="mt-2 text-xs text-emerald-900 bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200/80 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                  </svg>
                                  {falta.justificante_nombre || 'Comprobante adjunto'}
                                </span>
                                {falta.justificante_fecha && (
                                  <span className="text-[10px] text-emerald-700">
                                    Subido: {falta.justificante_fecha}
                                  </span>
                                )}
                              </div>
                              {falta.observaciones_justificacion && (
                                <p className="text-[11px] italic text-emerald-800">
                                  "{falta.observaciones_justificacion}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Botones de acción por falta */}
                        <div className="flex items-center gap-2">
                          {esJustificada ? (() => {
                            const rawUrl = falta.justificante_url || '';
                            let finalUrl = '#';
                            if (rawUrl) {
                              if (rawUrl.includes('/justificantes/')) {
                                const filename = rawUrl.split('/justificantes/').pop();
                                finalUrl = `${API_BASE}/api/justificantes/${filename}`;
                              } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
                                finalUrl = rawUrl;
                              } else {
                                finalUrl = `${API_BASE}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                              }
                            }
                            return (
                              <a
                                href={finalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                Ver Comprobante
                              </a>
                            );
                          })() : (
                            !readOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFaltaAJustificar({ ...falta, index: idx });
                                  setModalSubidaOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                Subir Justificante
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUBIDA DE JUSTIFICANTE */}
      {modalSubidaOpen && faltaAJustificar && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Subir Justificante de Falta
              </h3>
              <button
                type="button"
                onClick={() => setModalSubidaOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarJustificante} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Conductor: {conductorActualData?.nombre}</p>
                <p className="text-slate-500 mt-0.5">Fecha Falta: <strong>{faltaAJustificar.fecha}</strong> &bull; Motivo: {faltaAJustificar.motivo}</p>
              </div>

              {/* Input de archivo */}
              <div>
                <label htmlFor="file-justificante-input" className="block font-bold text-slate-700 mb-1.5">
                  Selecciona el archivo justificante (PDF, PNG, JPG, JPEG, WebP):
                </label>
                <input
                  id="file-justificante-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setArchivoSeleccionado(e.target.files[0] || null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#6b1d33] file:text-white hover:file:bg-[#831843] cursor-pointer"
                  required
                />
                {archivoSeleccionado && (
                  <p className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                    ✓ Archivo seleccionado: {archivoSeleccionado.name} ({Math.round(archivoSeleccionado.size / 1024)} KB)
                  </p>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label htmlFor="textarea-observaciones-justificante" className="block font-bold text-slate-700 mb-1.5">
                  Observaciones / Motivo de Justificación (Opcional):
                </label>
                <textarea
                  id="textarea-observaciones-justificante"
                  rows="3"
                  value={observacionesJustificante}
                  onChange={(e) => setObservacionesJustificante(e.target.value)}
                  placeholder="Ej. Incapacidad expedida por el IMSS por enfermedad general..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#6b1d33]/20 focus:border-[#6b1d33]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setModalSubidaOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subiendo || !archivoSeleccionado}
                  className="px-4 py-2 bg-[#6b1d33] text-white font-bold rounded-lg hover:bg-[#831843] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {subiendo ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    'Guardar y Justificar Falta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR FALTA MANUAL */}
      {modalNuevaFaltaOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <h3 className="font-extrabold text-slate-900 text-base">Registrar Nueva Falta a Operador</h3>
            
            <form onSubmit={handleRegistrarNuevaFalta} className="space-y-4 text-xs">
              <div>
                <label htmlFor="input-fecha-nueva-falta" className="block font-bold text-slate-700 mb-1">Fecha de la Falta:</label>
                <input
                  id="input-fecha-nueva-falta"
                  type="date"
                  value={nuevaFechaFalta}
                  onChange={(e) => setNuevaFechaFalta(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="input-motivo-nueva-falta" className="block font-bold text-slate-700 mb-1">Motivo / Descripción:</label>
                <input
                  id="input-motivo-nueva-falta"
                  type="text"
                  value={nuevoMotivoFalta}
                  onChange={(e) => setNuevoMotivoFalta(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  placeholder="Inasistencia a turno"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaFaltaOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrandoFalta}
                  className="px-4 py-1.5 bg-[#6b1d33] text-white font-bold rounded-lg"
                >
                  {registrandoFalta ? 'Registrando...' : 'Registrar Falta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
