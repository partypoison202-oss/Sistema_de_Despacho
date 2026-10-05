import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import API_BASE from '../../config/api';

// Función para calcular edad
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return 'N/A';
  const hoy = new Date();
  const cumple = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
    edad--;
  }
  return isNaN(edad) ? 'N/A' : `${edad} años`;
};

// Función para calcular antigüedad
const calcularAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return 'N/A';
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);
  let anios = hoy.getFullYear() - ingreso.getFullYear();
  let meses = hoy.getMonth() - ingreso.getMonth();
  if (meses < 0) {
    anios--;
    meses += 12;
  }
  if (isNaN(anios) || isNaN(meses)) return 'N/A';
  return `${anios} años, ${meses} meses`;
};

// Helper para normalizar la URL de la foto del operador
const getFotoUrl = (foto) => {
  if (!foto) return null;
  if (foto.startsWith('http') || foto.startsWith('data:') || foto.startsWith('blob:')) return foto;
  if (foto.startsWith('/storage')) return `${API_BASE}${foto}`;
  return `${API_BASE}/storage/${foto}`;
};

const parseDetalle = (jsonStr) => {
  if (!jsonStr) return [];
  try {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const formatearFechaDetalle = (fechaStr) => {
  if (!fechaStr || fechaStr === 'Fecha sin registrar') return 'Fecha no registrada';
  try {
    const raw = String(fechaStr).substring(0, 10);
    const partes = raw.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
      const [y, m, d] = partes;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    const iso = fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`;
    const dt = new Date(iso);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return fechaStr;
  } catch (e) {
    return fechaStr;
  }
};

const limpiarDescripcion = (motivo, tipo = '') => {
  if (!motivo) return 'Sin observaciones registradas';
  let m = String(motivo).trim();

  // Eliminar prefijos redundantes como "Retardo - ", "Retardo: ", "Falta - ", "Falta (Justificada) - ", etc.
  const regex = new RegExp(`^(${tipo}|Falta|Retardo|Permuta|Vacaciones|Descanso|Incapacidad)(\\s*\\(.*?\\))?(\\s*[-:–—]\\s*)+`, 'i');
  m = m.replace(regex, '').trim();

  const lower = m.toLowerCase();
  const tipoLower = String(tipo).toLowerCase();
  if (!m || lower === tipoLower || lower === 'retardo' || lower === 'falta' || lower === 'permuta') {
    if (tipoLower.includes('retardo')) return 'Retardo registrado en sistema';
    if (tipoLower.includes('falta')) return 'Inasistencia registrada en sistema';
    if (tipoLower.includes('permuta')) return 'Permuta autorizada en sistema';
    if (tipoLower.includes('vacaciones')) return 'Periodo vacacional autorizado';
    if (tipoLower.includes('descanso')) return 'Día de descanso programado';
    if (tipoLower.includes('incapacidad')) return 'Incapacidad médica registrada';
    return 'Registro de incidencia operativa en sistema';
  }

  return m;
};

const obtenerFaltasReales = (conductor) => {
  if (!conductor) return [];
  const raw = parseDetalle(conductor.faltas_detalle);
  return raw.filter(f => f.estado !== 'retardo');
};

const obtenerRetardosConsolidados = (conductor) => {
  if (!conductor) return [];
  const rawRet = parseDetalle(conductor.retardos_detalle);
  const rawFaltas = parseDetalle(conductor.faltas_detalle);
  const retardosEnFaltas = rawFaltas.filter(f => f.estado === 'retardo');
  const items = [...rawRet];
  retardosEnFaltas.forEach(rf => {
    if (!items.some(it => (it.id && it.id === rf.id) || (it.fecha && it.fecha === rf.fecha))) {
      items.push(rf);
    }
  });
  const retNum = Number(conductor.retardos) || 0;
  if (retNum > items.length) {
    const diff = retNum - items.length;
    for (let i = 0; i < diff; i++) {
      items.push({
        id: `virtual_retardo_${conductor.id}_${i}`,
        fecha: conductor.updated_at ? String(conductor.updated_at).substring(0, 10) : 'Fecha sin registrar',
        motivo: 'Retardo registrado en sistema',
        estado: 'retardo'
      });
    }
  }
  return items;
};

const contarFaltas = (conductor) => {
  if (!conductor) return 0;
  if (conductor.faltas !== undefined && conductor.faltas !== null) {
    return Number(conductor.faltas) || 0;
  }
  return obtenerFaltasReales(conductor).length;
};

const contarRetardos = (conductor) => {
  if (!conductor) return 0;
  const consolidados = obtenerRetardosConsolidados(conductor);
  return Math.max(Number(conductor.retardos) || 0, consolidados.length);
};

// Componente para renderizar cada fila/tarjeta de incidencia en el PDF impreso
const IncidenciaItem = ({ item, tipo, badgeColor, subBadge }) => (
  <div 
    className="bg-gray-50/70 border border-gray-200/90 rounded-lg p-2.5 text-xs shadow-xs"
    style={{ breakInside: 'avoid', pageBreakInside: 'avoid', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
  >
    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-gray-200/60">
      <div className="flex items-center gap-1.5">
        <span 
          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${badgeColor}`}
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {tipo}
        </span>
        {subBadge && (
          <span 
            className="px-1.5 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-700 rounded border border-gray-200"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {subBadge}
          </span>
        )}
      </div>

      {/* Fecha destacada con mayor tamaño y contraste, sin emojis */}
      <div 
        className="bg-white border-2 border-gray-400 rounded px-2.5 py-0.5 text-right flex items-center gap-1.5 shadow-2xs"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fecha:</span>
        <span className="text-[13px] font-black text-gray-900 font-mono tracking-tight">
          {formatearFechaDetalle(item.fecha)}
        </span>
      </div>
    </div>

    <div className="text-[11.5px] text-gray-800 leading-snug pl-0.5 pt-0.5 flex items-start gap-1">
      <span className="text-gray-500 font-medium shrink-0">Detalle:</span>
      <span className="font-normal break-words">{limpiarDescripcion(item.motivo || item.descripcion, tipo)}</span>
    </div>
  </div>
);

// Contenedor de categoría para el PDF impreso
const CategoriaIncidenciasCard = ({ titulo, count, colorDot, headerBg, emptyText, children, itemsCount }) => (
  <div 
    className="border border-gray-200/90 rounded-xl overflow-hidden bg-white shadow-xs flex flex-col"
    style={{ breakInside: 'avoid', pageBreakInside: 'avoid', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
  >
    <div 
      className={`px-3.5 py-2 border-b border-gray-200/80 flex items-center justify-between ${headerBg}`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${colorDot} inline-block`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></span>
        <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wide">{titulo}</h4>
      </div>
      <span 
        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 shadow-2xs"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {count} {count === 1 ? 'registro' : 'registros'}
      </span>
    </div>

    <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-start">
      {itemsCount === 0 ? (
        <div className="py-6 px-3 bg-gray-50/60 border border-dashed border-gray-200 rounded-lg text-center my-auto">
          <p className="text-gray-400 text-xs italic">{emptyText}</p>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const PrintableTemplate = ({ conductor, sitmahOrangeUrl }) => {
  const faltas = obtenerFaltasReales(conductor);
  const retardos = obtenerRetardosConsolidados(conductor);
  const descansos = parseDetalle(conductor.descansos_detalle);
  const permutas = parseDetalle(conductor.permutas_detalle);
  const vacaciones = parseDetalle(conductor.vacaciones_detalle);
  const incapacidades = parseDetalle(conductor.incapacidades_detalle);
  const fotoUrl = getFotoUrl(conductor.foto);

  return (
    <div className="bg-white p-4 sm:p-6 print:p-0 w-full max-w-4xl mx-auto text-sm text-gray-800 font-sans" id="printable-pdf-template">
      {/* ===================== HOJA 1: FICHA TÉCNICA DEL OPERADOR ===================== */}
      <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        {/* 1. Membrete Oficial */}
        <div 
          className="bg-[#65002D] py-3 px-6 mb-3 flex items-center justify-between rounded-xl shadow-xs" 
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {/* Left Logo */}
          <img src="/images/sistema_de_tm.webp" alt="Sistema TM" crossOrigin="anonymous" className="h-9 w-auto object-contain brightness-0 invert" />
          
          {/* Center Text */}
          <div className="text-center flex-1 mx-4">
            <h2 className="text-base font-bold text-white tracking-wide uppercase">EXPEDIENTE OPERATIVO DE LA PERSONA CONDUCTORA</h2>
            <p className="text-[10px] text-gray-200 mt-0.5">Fecha de Emisión: {new Date().toLocaleDateString('es-MX')} | Control Operativo SITMAH T6</p>
          </div>

          {/* Right Logo */}
          <img src="/images/sitmah_logo.webp" alt="SITMAH" crossOrigin="anonymous" className="h-8 w-auto object-contain" />
        </div>

        {/* 2. Perfil del Operador (Tarjeta Horizontal Compacta) */}
        <div 
          className="bg-white rounded-xl border border-gray-200/90 p-3.5 mb-3 shadow-xs"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Lado Izquierdo: Avatar + Nombre + ID + Tarjetón */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div 
                className="relative h-14 w-14 shrink-0 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-inner overflow-hidden"
                style={{ backgroundColor: '#65002D', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <span className="absolute inset-0 flex items-center justify-center z-0">
                  {conductor.nombre && conductor.nombre !== '------------------------' ? conductor.nombre.charAt(0).toUpperCase() : 'O'}
                </span>
                {fotoUrl && (
                  <img 
                    src={fotoUrl} 
                    alt={conductor.nombre} 
                    crossOrigin="anonymous" 
                    className="absolute inset-0 w-full h-full object-cover z-10" 
                  />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 truncate tracking-tight uppercase leading-snug">
                  {conductor.nombre}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-600">
                  <span><strong className="text-gray-700">Tarjetón:</strong> {conductor.tarjeton ? conductor.tarjeton.split('_BAJA_')[0] : '---'}</span>
                </div>
              </div>
            </div>

            {/* Lado Derecho: Estatus + Vigencia Licencia */}
            <div className="flex flex-col items-end justify-center gap-1 shrink-0">
              <span 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  conductor.estatus === 'activo' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : (conductor.estatus === '---' 
                        ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                        : 'bg-rose-50 text-rose-800 border border-rose-200')
                }`}
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  conductor.estatus === 'activo' ? 'bg-emerald-500' : (conductor.estatus === '---' ? 'bg-gray-400' : 'bg-rose-500')
                }`}></span>
                {conductor.estatus === 'activo' ? 'ACTIVO' : (conductor.estatus === '---' ? 'SIN DATOS' : 'BAJA')}
              </span>
              <div className="text-[10.5px] text-gray-500 text-right">
                <span className="font-semibold text-gray-600">Vigencia Licencia: </span>
                <span className="font-medium text-gray-800">
                  {conductor.vigencia_licencia ? new Date(conductor.vigencia_licencia).toLocaleDateString('es-MX') : 'No registrada'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Datos Personales + Antigüedad (2 Columnas Equilibradas) */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Datos Personales */}
          <div 
            className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs flex flex-col justify-between"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <h3 className="text-xs font-bold pb-1.5 mb-2 border-b border-gray-100 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: '#65002D' }}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
              Datos Personales
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-0.5 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Sexo:</span>
                <span className="text-gray-900 font-semibold">{conductor.sexo || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Edad:</span>
                <span className="text-gray-900 font-semibold">{conductor.fecha_nacimiento ? calcularEdad(conductor.fecha_nacimiento) : '---'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Teléfono:</span>
                <span className="text-gray-900 font-semibold">{conductor.telefono || 'No registrado'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-gray-50 gap-2">
                <span className="text-gray-500 font-medium shrink-0">Referencia 1:</span>
                <span className="text-gray-900 font-semibold text-right truncate" title={conductor.referencia_1 || 'No registrada'}>
                  {conductor.referencia_1 || 'No registrada'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 gap-2">
                <span className="text-gray-500 font-medium shrink-0">Referencia 2:</span>
                <span className="text-gray-900 font-semibold text-right truncate" title={conductor.referencia_2 || 'No registrada'}>
                  {conductor.referencia_2 || 'No registrada'}
                </span>
              </div>
            </div>
          </div>

          {/* Antigüedad y Fechas */}
          <div 
            className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs flex flex-col justify-between"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <h3 className="text-xs font-bold pb-1.5 mb-2 border-b border-gray-100 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: '#65002D' }}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Antigüedad y Fechas
            </h3>
            <div className="space-y-2.5 my-auto">
              <div 
                className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center justify-between"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div>
                  <span className="text-gray-500 text-[9.5px] uppercase tracking-wider font-bold block">Fecha de Ingreso</span>
                  <span className="text-gray-900 font-bold text-sm mt-0.5 block">
                    {conductor.fecha_ingreso ? new Date(conductor.fecha_ingreso).toLocaleDateString('es-MX') : 'No registrada'}
                  </span>
                </div>
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>

              <div 
                className="bg-[#65002D] text-white p-2.5 rounded-lg flex items-center justify-between shadow-xs"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div>
                  <span className="text-white/80 text-[9.5px] uppercase tracking-wider font-bold block">Antigüedad Total</span>
                  <span className="text-white font-bold text-sm mt-0.5 block">
                    {conductor.fecha_ingreso ? calcularAntiguedad(conductor.fecha_ingreso) : '---'}
                  </span>
                </div>
                <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Historial y Métricas Operativas (Kardex en 1 Fila) */}
        <div 
          className="bg-white rounded-xl border border-gray-200/90 p-3 mb-3 shadow-xs"
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: '#65002D' }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Historial y Métricas Operativas (Kardex)
          </h3>
          <div className="grid grid-cols-4 gap-2.5">
            {/* 1. Accidentes y Siniestros */}
            <div 
              className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 flex flex-col justify-between"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1 rounded-md bg-rose-100 text-rose-700">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </span>
                <span className="text-xl font-black text-rose-900">
                  {conductor.accidentes_siniestros ?? 0}
                </span>
              </div>
              <div className="text-[9.5px] text-rose-800 uppercase font-bold tracking-wider text-left w-full mt-0.5">
                Accidentes y Siniestros
              </div>
            </div>

            {/* 2. Faltas */}
            <div 
              className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex flex-col justify-between"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </span>
                <span className="text-xl font-black text-amber-900">
                  {contarFaltas(conductor)}
                </span>
              </div>
              <div className="text-[9.5px] text-amber-800 uppercase font-bold tracking-wider text-left w-full mt-0.5">
                Faltas
              </div>
            </div>

            {/* 3. Retardos */}
            <div 
              className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-2.5 flex flex-col justify-between"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1 rounded-md bg-sky-100 text-sky-700">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                <span className="text-xl font-black text-sky-900">
                  {contarRetardos(conductor)}
                </span>
              </div>
              <div className="text-[9.5px] text-sky-800 uppercase font-bold tracking-wider text-left w-full mt-0.5">
                Retardos
              </div>
            </div>

            {/* 4. Permutas */}
            <div 
              className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 flex flex-col justify-between"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </span>
                <span className="text-xl font-black text-emerald-900">
                  {conductor.cambios ?? conductor.permutas ?? (conductor.permutas_detalle ? parseDetalle(conductor.permutas_detalle).length : 0)}
                </span>
              </div>
              <div className="text-[9.5px] text-emerald-800 uppercase font-bold tracking-wider text-left w-full mt-0.5">
                Permutas
              </div>
            </div>
          </div>
        </div>

        {/* 5. Información Inferior del Kardex (Grid de 2 Columnas) */}
        <div className="grid grid-cols-2 gap-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          {/* COLUMNA IZQUIERDA: Capacitaciones | Condicionamientos | Evaluación General */}
          <div className="space-y-2.5">
            {/* Capacitaciones (Azul suave) */}
            <div 
              className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Capacitaciones
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50/70 border border-blue-200/70 p-2 rounded-lg" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span className="block text-[9px] uppercase font-bold text-blue-700 opacity-80">Última</span>
                  <span className="font-bold text-blue-950 text-xs mt-0.5 block">
                    {conductor.ultima_capacitacion ? new Date(conductor.ultima_capacitacion).toLocaleDateString('es-MX') : 'N/A'}
                  </span>
                </div>
                <div className="bg-blue-50/70 border border-blue-200/70 p-2 rounded-lg" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span className="block text-[9px] uppercase font-bold text-blue-700 opacity-80">Próxima</span>
                  <span className="font-bold text-blue-950 text-xs mt-0.5 block">
                    {conductor.proxima_capacitacion ? new Date(conductor.proxima_capacitacion).toLocaleDateString('es-MX') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Condicionamientos (Amarillo / Naranja suave) */}
            <div 
              className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Condicionamientos
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="bg-amber-50/70 border border-amber-200/70 p-2 rounded-lg" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span className="text-[9px] uppercase font-bold text-amber-800 block mb-0.5">Médicos:</span>
                  <span className="text-gray-900 font-medium text-[11px]">{conductor.condicionamientos_medicos || 'Sin especificar'}</span>
                </div>
                <div className="bg-amber-50/70 border border-amber-200/70 p-2 rounded-lg" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span className="text-[9px] uppercase font-bold text-amber-800 block mb-0.5">Jurídicos:</span>
                  <span className="text-gray-900 font-medium text-[11px]">{conductor.condicionamientos_juridicos || 'Sin especificar'}</span>
                </div>
              </div>
            </div>

            {/* Evaluación General (Morado suave) */}
            <div 
              className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Evaluación General
              </h4>
              <div className="bg-purple-50/70 border border-purple-200/70 p-2.5 rounded-lg text-xs" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span className="font-bold text-purple-950 text-xs">{conductor.evaluacion || 'Sin evaluar'}</span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Reconocimientos | Amonestaciones | Observaciones Generales */}
          <div className="space-y-2.5">
            {/* Reconocimientos (Verde suave) */}
            <div 
              className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Reconocimientos
                </h4>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {conductor.reconocimientos ?? 0}
                </span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-200/60 p-2 rounded-lg text-xs text-gray-700 max-h-28 overflow-hidden" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                {(conductor.reconocimientos_detalle && conductor.reconocimientos_detalle.length > 0) ? (
                  <ul className="list-disc pl-3.5 space-y-0.5 text-[10.5px]">
                    {conductor.reconocimientos_detalle.map(d => (
                      <li key={d.id}><strong>{formatearFechaDetalle(d.fecha)}:</strong> {d.motivo}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-400 text-center py-1 text-[11px]">Sin reconocimientos registrados</p>
                )}
              </div>
            </div>

            {/* Amonestaciones (Rojo / Rosado suave) */}
            <div 
              className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Amonestaciones
                </h4>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200"
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {conductor.amonestaciones ?? 0}
                </span>
              </div>
              <div className="bg-rose-50/50 border border-rose-200/60 p-2 rounded-lg text-xs text-gray-700 max-h-28 overflow-hidden" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                {(conductor.amonestaciones_detalle && conductor.amonestaciones_detalle.length > 0) ? (
                  <ul className="list-disc pl-3.5 space-y-0.5 text-[10.5px]">
                    {conductor.amonestaciones_detalle.map(d => (
                      <li key={d.id}><strong>{formatearFechaDetalle(d.fecha)}:</strong> {d.motivo}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-400 text-center py-1 text-[11px]">Sin amonestaciones registradas</p>
                )}
              </div>
            </div>

            {/* Observaciones Generales (Gris suave) */}
            <div 
              className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Observaciones Generales
              </h4>
              <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-lg text-[10.5px] text-gray-700 min-h-[46px] whitespace-pre-wrap leading-relaxed" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                {conductor.observaciones || <span className="italic text-gray-400">Sin observaciones registradas...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== HOJA 2: HISTORIAL DETALLADO DE ASIGNACIONES E INCIDENCIAS ===================== */}
      <div className="pt-4" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
        {/* Membrete Oficial Hoja 2 */}
        <div 
          className="bg-[#65002D] py-3 px-6 mb-3.5 flex items-center justify-between rounded-xl shadow-xs" 
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {/* Left Logo */}
          <img src="/images/sistema_de_tm.webp" alt="Sistema TM" crossOrigin="anonymous" className="h-8 w-auto object-contain brightness-0 invert" />
          
          {/* Center Text */}
          <div className="text-center flex-1 mx-4">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">HISTORIAL DETALLADO DE ASIGNACIONES E INCIDENCIAS</h3>
            <p className="text-[10.5px] text-gray-200 mt-0.5">
              Operador: <strong className="text-white uppercase">{conductor.nombre}</strong> &bull; Tarjetón: <strong className="text-white">{conductor.tarjeton ? conductor.tarjeton.split('_BAJA_')[0] : 'N/A'}</strong>
            </p>
          </div>

          {/* Right Badge */}
          <div className="text-right">
            <span 
              className="text-[10px] font-bold uppercase tracking-wider bg-white/15 text-white px-2.5 py-1 rounded border border-white/20"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              Control T6
            </span>
          </div>
        </div>
        
        {/* Cuadrícula de 2 Columnas para las 4 Categorías */}
        <div className="grid grid-cols-2 gap-3.5 text-xs">
          {/* Faltas y Retardos */}
          <CategoriaIncidenciasCard
            titulo="Faltas y Retardos"
            count={faltas.length + retardos.length}
            itemsCount={faltas.length + retardos.length}
            colorDot="bg-rose-500"
            headerBg="bg-rose-50/70"
            emptyText="Sin faltas ni retardos registrados"
          >
            {faltas.map((f, i) => {
              const esJustificada = f.estado === 'justificada' || f.justificada;
              return (
                <IncidenciaItem
                  key={`f-${i}`}
                  item={f}
                  tipo="Falta"
                  subBadge={esJustificada ? 'Justificada' : 'Injustificada'}
                  badgeColor={esJustificada ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-red-100 text-red-900 border border-red-200'}
                />
              );
            })}
            {retardos.map((r, i) => (
              <IncidenciaItem
                key={`r-${i}`}
                item={r}
                tipo="Retardo"
                badgeColor="bg-amber-100 text-amber-900 border border-amber-300"
              />
            ))}
          </CategoriaIncidenciasCard>

          {/* Permutas Realizadas */}
          <CategoriaIncidenciasCard
            titulo="Permutas Realizadas"
            count={permutas.length}
            itemsCount={permutas.length}
            colorDot="bg-blue-500"
            headerBg="bg-blue-50/70"
            emptyText="Sin permutas registradas"
          >
            {permutas.map((p, i) => (
              <IncidenciaItem
                key={`p-${i}`}
                item={p}
                tipo="Permuta"
                badgeColor="bg-blue-100 text-blue-900 border border-blue-200"
              />
            ))}
          </CategoriaIncidenciasCard>

          {/* Descansos y Vacaciones */}
          <CategoriaIncidenciasCard
            titulo="Descansos y Vacaciones"
            count={vacaciones.length + descansos.length}
            itemsCount={vacaciones.length + descansos.length}
            colorDot="bg-emerald-500"
            headerBg="bg-emerald-50/70"
            emptyText="Sin descansos o vacaciones registradas"
          >
            {vacaciones.map((v, i) => (
              <IncidenciaItem
                key={`v-${i}`}
                item={v}
                tipo="Vacaciones"
                badgeColor="bg-emerald-100 text-emerald-900 border border-emerald-200"
              />
            ))}
            {descansos.map((d, i) => (
              <IncidenciaItem
                key={`d-${i}`}
                item={d}
                tipo="Descanso"
                badgeColor="bg-teal-100 text-teal-900 border border-teal-200"
              />
            ))}
          </CategoriaIncidenciasCard>

          {/* Incapacidades (ISSSTE / Otros) */}
          <CategoriaIncidenciasCard
            titulo="Incapacidades (ISSSTE / Otros)"
            count={incapacidades.length}
            itemsCount={incapacidades.length}
            colorDot="bg-purple-500"
            headerBg="bg-purple-50/70"
            emptyText="Sin incapacidades registradas"
          >
            {incapacidades.map((inc, i) => (
              <IncidenciaItem
                key={`inc-${i}`}
                item={inc}
                tipo="Incapacidad"
                badgeColor="bg-purple-100 text-purple-900 border border-purple-200"
              />
            ))}
          </CategoriaIncidenciasCard>
        </div>
      </div>
    </div>
  );
};

export default function InfoGeneralOperador({ conductores }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [sitmahOrangeUrl, setSitmahOrangeUrl] = useState('/images/sitmah_logo.webp');
  const [printMount, setPrintMount] = useState(null);
  const [metricModal, setMetricModal] = useState(null);

  useEffect(() => {
    if (!metricModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMetricModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metricModal]);

  useEffect(() => {
    let div = document.getElementById('print-mount');
    if (!div) {
      div = document.createElement('div');
      div.id = 'print-mount';
      div.className = 'hidden print:block w-full absolute top-0 left-0 bg-white z-[999999] min-h-screen';
      document.body.appendChild(div);
    }
    setPrintMount(div);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = '/images/sitmah_logo.webp';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#e04f00'; // Naranja oficial SITMAH
      ctx.fillRect(0, 0, img.width, img.height);
      setSitmahOrangeUrl(canvas.toDataURL('image/png'));
    };
  }, []);

  // Filtrado del buscador principal
  const filteredConductores = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return conductores.filter(c => 
      String(c.nombre || '').toLowerCase().includes(lower) ||
      String(c.tarjeton || '').toLowerCase().includes(lower)
    );
  }, [conductores, searchTerm]);

  // Selección
  const handleSelect = (conductor) => {
    setSelectedConductor(conductor);
    setSearchTerm(''); // Opcional: limpiar búsqueda o dejarla
  };

  const defaultConductor = {
    nombre: '------------------------', id: '---', tarjeton: '---', estatus: '---', tipo_tarjeton: '---',
    vigencia_licencia: null, sexo: '---', fecha_nacimiento: null,
    telefono: '---', referencia_1: '---', referencia_2: '---',
    fecha_ingreso: null, amonestaciones_detalle: [], reconocimientos_detalle: [],
    accidentes_siniestros: 0, faltas: 0, retardos: 0, amonestaciones: 0,
    reconocimientos: 0, permutas: 0, permisos: 0, condicionamientos_medicos: '---',
    condicionamientos_juridicos: '---', evaluacion: '---', observaciones: '---',
    ultima_capacitacion: null, proxima_capacitacion: null,
    retardos_detalle: [], faltas_detalle: [], permutas_detalle: [], accidentes_siniestros_detalle: []
  };

  const handleOpenMetricModal = (tipo) => {
    let titulo = '';
    let items = [];
    let badgeColor = 'bg-gray-100 text-gray-700';

    if (tipo === 'retardos') {
      titulo = 'Historial de Retardos';
      badgeColor = 'bg-amber-100 text-amber-800';
      items = obtenerRetardosConsolidados(displayConductor);
    } else if (tipo === 'faltas') {
      titulo = 'Historial de Faltas';
      badgeColor = 'bg-red-100 text-red-800';
      items = obtenerFaltasReales(displayConductor);
    } else if (tipo === 'permutas') {
      titulo = 'Historial de Permutas';
      badgeColor = 'bg-blue-100 text-blue-800';
      items = parseDetalle(displayConductor.permutas_detalle);
    } else if (tipo === 'accidentes_siniestros') {
      titulo = 'Historial de Accidentes y Siniestros';
      badgeColor = 'bg-orange-100 text-orange-800';
      items = parseDetalle(displayConductor.accidentes_siniestros_detalle);
    }

    setMetricModal({
      tipo,
      titulo,
      badgeColor,
      items: Array.isArray(items) ? items : []
    });
  };

  const displayConductor = selectedConductor || defaultConductor;

  const handlePrint = () => {
    if (!selectedConductor) return;
    
    const originalTitle = document.title;
    const tarjeton = displayConductor.tarjeton ? displayConductor.tarjeton.split('_BAJA_')[0] : 'Desconocido';
    document.title = `Expediente_Operador_T${tarjeton}`;
    
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  return (
    <>
      <style>{`
        @media print {
          body > :not(#print-mount) {
            display: none !important;
          }
          @page {
            margin: 8mm 10mm;
            size: letter portrait;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Plantilla oculta para PDF y Print (Usando Portal para evitar que herede otros layouts) */}
      {printMount && createPortal(
        <PrintableTemplate conductor={displayConductor} sitmahOrangeUrl={sitmahOrangeUrl} />,
        printMount
      )}

      <div className="info-general-container print:hidden space-y-4">
        {/* ==================== 4. BUSCADOR + BOTÓN PDF (UNIFICADOS EN UNA TARJETA HORIZONTAL) ==================== */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-gray-200/80 print:hidden">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: '#65002D' }}>
              Buscar Operador
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Input de Búsqueda (flex-1) */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D] text-sm transition-all"
                placeholder="Buscar por Nombre o Tarjetón..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Resultados del Buscador Flotantes */}
              {searchTerm && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                  {filteredConductores.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {filteredConductores.map(c => (
                        <li 
                          key={c.id} 
                          className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors"
                          onClick={() => handleSelect(c)}
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">{c.nombre}</p>
                            <p className="text-xs text-gray-500">Tarjetón: {c.tarjeton ? c.tarjeton.split('_BAJA_')[0] : '---'}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${c.estatus === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {c.estatus === 'activo' ? 'Activo' : 'Baja'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-3 text-sm text-gray-500 text-center">No se encontraron operadores.</p>
                  )}
                </div>
              )}
            </div>

            {/* Botón Imprimir / PDF alineado a la derecha */}
            <button 
              type="button"
              onClick={handlePrint}
              disabled={!selectedConductor}
              className={`px-4 py-2.5 bg-[#65002D] rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs ${
                !selectedConductor ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4d0022] hover:shadow-sm cursor-pointer'
              }`}
              title={!selectedConductor ? 'Selecciona un operador primero' : 'Imprimir expediente o guardar como PDF'}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              <span>Imprimir / Guardar como PDF</span>
            </button>
          </div>
        </div>

        {/* ==================== 5. PERFIL DEL OPERADOR (TARJETA HORIZONTAL COMPACTA) ==================== */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Lado Izquierdo: Avatar + Nombre + ID + Tarjetón */}
            <div className="flex items-center gap-4 min-w-0">
              <div 
                className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-inner overflow-hidden"
                style={{ backgroundColor: '#65002D' }}
              >
                <span className="absolute inset-0 flex items-center justify-center z-0">
                  {displayConductor.nombre && displayConductor.nombre !== '------------------------' ? displayConductor.nombre.charAt(0).toUpperCase() : 'O'}
                </span>
                {displayConductor.foto && (
                  <img 
                    src={getFotoUrl(displayConductor.foto)} 
                    alt={displayConductor.nombre} 
                    className="w-full h-full object-cover relative z-10"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate tracking-tight uppercase">
                  {displayConductor.nombre}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 flex-wrap">
                  <span><strong className="text-gray-700">Tarjetón:</strong> {displayConductor.tarjeton ? displayConductor.tarjeton.split('_BAJA_')[0] : '---'}</span>
                </div>
              </div>
            </div>

            {/* Lado Derecho: Estatus + Vigencia Licencia */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                displayConductor.estatus === 'activo' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : (displayConductor.estatus === '---' 
                      ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                      : 'bg-rose-50 text-rose-800 border border-rose-200')
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  displayConductor.estatus === 'activo' ? 'bg-emerald-500' : (displayConductor.estatus === '---' ? 'bg-gray-400' : 'bg-rose-500')
                }`}></span>
                {displayConductor.estatus === 'activo' ? 'ACTIVO' : (displayConductor.estatus === '---' ? 'SIN DATOS' : 'BAJA')}
              </span>
              <div className="text-[11px] text-gray-500 text-right">
                <span className="font-semibold text-gray-600">Vigencia Licencia: </span>
                <span className="font-medium text-gray-800">
                  {displayConductor.vigencia_licencia ? new Date(displayConductor.vigencia_licencia).toLocaleDateString() : 'No registrada'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 6. DATOS PERSONALES + ANTIGÜEDAD (2 COLUMNAS EQUILIBRADAS) ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Datos Personales */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold pb-2 mb-3 border-b border-gray-100 flex items-center gap-2 uppercase tracking-wide" style={{ color: '#65002D' }}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
              Datos Personales
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Sexo</span>
                <span className="text-gray-900 font-semibold">{displayConductor.sexo || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Edad</span>
                <span className="text-gray-900 font-semibold">{displayConductor.fecha_nacimiento === null ? '---' : calcularEdad(displayConductor.fecha_nacimiento)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Teléfono</span>
                <span className="text-gray-900 font-semibold">{displayConductor.telefono || 'No registrado'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50 gap-4">
                <span className="text-gray-500 font-medium shrink-0">Referencia 1</span>
                <span className="text-gray-900 font-semibold text-right truncate" title={displayConductor.referencia_1 || 'No registrada'}>
                  {displayConductor.referencia_1 || 'No registrada'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 gap-4">
                <span className="text-gray-500 font-medium shrink-0">Referencia 2</span>
                <span className="text-gray-900 font-semibold text-right truncate" title={displayConductor.referencia_2 || 'No registrada'}>
                  {displayConductor.referencia_2 || 'No registrada'}
                </span>
              </div>
            </div>
          </div>

          {/* Antigüedad y Fechas */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold pb-2 mb-3 border-b border-gray-100 flex items-center gap-2 uppercase tracking-wide" style={{ color: '#65002D' }}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Antigüedad y Fechas
            </h3>
            <div className="space-y-3 my-auto">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold block">Fecha de Ingreso</span>
                  <span className="text-gray-900 font-bold text-base mt-0.5 block">
                    {displayConductor.fecha_ingreso ? new Date(displayConductor.fecha_ingreso).toLocaleDateString() : 'No registrada'}
                  </span>
                </div>
                <svg className="w-6 h-6 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>

              <div className="bg-[#65002D] text-white p-3 rounded-lg flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-white/80 text-[10px] uppercase tracking-wider font-bold block">Antigüedad Total</span>
                  <span className="text-white font-bold text-base mt-0.5 block">
                    {displayConductor.fecha_ingreso === null ? '---' : calcularAntiguedad(displayConductor.fecha_ingreso)}
                  </span>
                </div>
                <svg className="w-6 h-6 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 7. HISTORIAL Y MÉTRICAS OPERATIVAS (KARDEX EN 1 FILA) ==================== */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2 uppercase tracking-wide" style={{ color: '#65002D' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Historial y Métricas Operativas (Kardex)
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Accidentes y Siniestros (Tono rojo/rosado suave) */}
            <button
              type="button" 
              onClick={() => handleOpenMetricModal('accidentes_siniestros')}
              className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 text-center hover:bg-rose-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver desglose de accidentes y siniestros"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-900">
                  {displayConductor.accidentes_siniestros ?? 0}
                </span>
              </div>
              <div className="text-[11px] text-rose-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Accidentes y Siniestros
              </div>
            </button>

            {/* 2. Faltas (Tono amarillo suave) */}
            <button
              type="button" 
              onClick={() => handleOpenMetricModal('faltas')}
              className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-center hover:bg-amber-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver desglose de faltas"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-900">
                  {contarFaltas(displayConductor)}
                </span>
              </div>
              <div className="text-[11px] text-amber-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Faltas
              </div>
            </button>

            {/* 3. Retardos (Tono azul suave) */}
            <button
              type="button" 
              onClick={() => handleOpenMetricModal('retardos')}
              className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3.5 text-center hover:bg-sky-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver desglose de retardos"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-sky-900">
                  {contarRetardos(displayConductor)}
                </span>
              </div>
              <div className="text-[11px] text-sky-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Retardos
              </div>
            </button>

            {/* 4. Permutas (Tono verde suave) */}
            <button
              type="button" 
              onClick={() => handleOpenMetricModal('permutas')}
              className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 text-center hover:bg-emerald-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver desglose de permutas"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-900">
                  {displayConductor.cambios ?? displayConductor.permutas ?? parseDetalle(displayConductor.permutas_detalle).length ?? 0}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Permutas
              </div>
            </button>
          </div>
        </div>

        {/* ==================== 8. INFORMACIÓN INFERIOR DEL KARDEX (GRID DE 2 COLUMNAS) ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* COLUMNA IZQUIERDA: Capacitaciones | Condicionamientos | Evaluación General */}
          <div className="space-y-4">
            {/* Capacitaciones (Azul suave) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Capacitaciones
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50/70 border border-blue-200/70 p-2.5 rounded-lg">
                  <span className="block text-[10px] uppercase font-bold text-blue-700 opacity-80">Última</span>
                  <span className="font-bold text-blue-950 text-xs mt-0.5 block">
                    {displayConductor.ultima_capacitacion ? new Date(displayConductor.ultima_capacitacion).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="bg-blue-50/70 border border-blue-200/70 p-2.5 rounded-lg">
                  <span className="block text-[10px] uppercase font-bold text-blue-700 opacity-80">Próxima</span>
                  <span className="font-bold text-blue-950 text-xs mt-0.5 block">
                    {displayConductor.proxima_capacitacion ? new Date(displayConductor.proxima_capacitacion).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Condicionamientos (Amarillo / Naranja suave) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Condicionamientos
              </h4>
              <div className="space-y-2 text-xs">
                <div className="bg-amber-50/70 border border-amber-200/70 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block mb-0.5">Médicos:</span>
                  <span className="text-gray-900 font-medium">{displayConductor.condicionamientos_medicos || 'Sin especificar'}</span>
                </div>
                <div className="bg-amber-50/70 border border-amber-200/70 p-2.5 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block mb-0.5">Jurídicos:</span>
                  <span className="text-gray-900 font-medium">{displayConductor.condicionamientos_juridicos || 'Sin especificar'}</span>
                </div>
              </div>
            </div>

            {/* Evaluación General (Morado suave) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Evaluación General
              </h4>
              <div className="bg-purple-50/70 border border-purple-200/70 p-3 rounded-lg text-xs">
                <span className="font-bold text-purple-950 text-sm">{displayConductor.evaluacion || 'Sin evaluar'}</span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Reconocimientos | Amonestaciones | Observaciones Generales */}
          <div className="space-y-4">
            {/* Reconocimientos (Verde suave) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Reconocimientos
                </h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {displayConductor.reconocimientos ?? 0}
                </span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-200/60 p-2.5 rounded-lg max-h-36 overflow-y-auto text-xs text-gray-700">
                {(displayConductor.reconocimientos_detalle && displayConductor.reconocimientos_detalle.length > 0) ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {displayConductor.reconocimientos_detalle.map(d => (
                      <li key={d.id}><strong>{formatearFechaDetalle(d.fecha)}:</strong> {d.motivo}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-400 text-center py-2">Sin reconocimientos registrados...</p>
                )}
              </div>
            </div>

            {/* Amonestaciones (Rojo / Rosado suave) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Amonestaciones
                </h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {displayConductor.amonestaciones ?? 0}
                </span>
              </div>
              <div className="bg-rose-50/50 border border-rose-200/60 p-2.5 rounded-lg max-h-36 overflow-y-auto text-xs text-gray-700">
                {(displayConductor.amonestaciones_detalle && displayConductor.amonestaciones_detalle.length > 0) ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {displayConductor.amonestaciones_detalle.map(d => (
                      <li key={d.id}><strong>{formatearFechaDetalle(d.fecha)}:</strong> {d.motivo}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-400 text-center py-2">Sin amonestaciones registradas...</p>
                )}
              </div>
            </div>

            {/* Observaciones Generales (Gris / Azul grisáceo suave) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Observaciones Generales
              </h4>
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg text-xs text-gray-700 min-h-[72px] max-h-36 overflow-y-auto whitespace-pre-wrap">
                {displayConductor.observaciones || <span className="italic text-gray-400">Sin observaciones registradas...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Métrica Kardex */}
      {metricModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        >
          {/* Backdrop con botón accesible nativo */}
          <button
            type="button"
            aria-label="Cerrar ventana emergente"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm w-full h-full border-0 cursor-default"
            onClick={() => setMetricModal(null)}
          />

          <div 
            className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 z-10"
          >
            <div className="bg-[#6A1B29] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 id="metric-modal-title" className="font-bold text-base">{metricModal.titulo}</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Operador: {displayConductor.nombre} {displayConductor.tarjeton && displayConductor.tarjeton !== '---' ? `(T-${displayConductor.tarjeton.split('_BAJA_')[0]})` : ''}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setMetricModal(null)}
                className="text-white/80 hover:text-white text-2xl leading-none p-1 rounded hover:bg-white/10 transition-colors"
                title="Cerrar"
              >
                &times;
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              {metricModal.items.length === 0 ? (
                <div className="text-center py-6 text-gray-400 italic text-sm">
                  No hay registros detallados para esta métrica.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 space-y-2">
                  {metricModal.items.map((item, idx) => (
                    <li key={item.id || idx} className="pt-2 first:pt-0">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded font-mono text-[11px] shadow-2xs">
                          Fecha: {formatearFechaDetalle(item.fecha)}
                        </span>
                        {item.estado && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${metricModal.badgeColor}`}>
                            {item.estado}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {limpiarDescripcion(item.motivo || item.descripcion, item.estado || metricModal.tipo || '')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setMetricModal(null)}
                className="px-4 py-2 bg-[#6A1B29] text-white text-xs font-bold rounded-lg hover:bg-[#802234] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
