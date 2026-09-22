import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// Paleta de colores Premium
const COLORS = ['#6b1d33', '#c5a059', '#1e293b', '#64748b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const getDetailArray = (conductor, type) => {
  if (!conductor) return [];
  const val = conductor[`${type}_detalle`];
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

export default function EstadisticasOperadores({ conductores = [] }) {
  const [rangoFaltas, setRangoFaltas] = React.useState('TODOS');
  const [minFaltasCustom, setMinFaltasCustom] = React.useState(1);
  const [maxFaltasCustom, setMaxFaltasCustom] = React.useState(10);

  const stats = useMemo(() => {
    let activos = 0;
    let bajas = 0;
    let totalFaltas = 0;
    let totalRetardos = 0;
    let sumaEvaluacion = 0;
    let evaluadosCount = 0;

    const topFaltistas = [];
    const topRetardos = [];
    const topAccidentes = [];
    const tarjetonesCount = {};

    conductores.forEach(c => {
      // Bajas vs Activos
      if (c.estatus === 'baja') {
        bajas++;
      } else {
        activos++;
        
        // Sumar faltas y retardos (solo de activos para no sesgar con gente que ya no está)
        const faltas = Number(c.faltas) || 0;
        const retardos = Number(c.retardos) || 0;
        const accidentes = getDetailArray(c, 'accidentes_siniestros').length;

        totalFaltas += faltas;
        totalRetardos += retardos;
        
        if (c.evaluacion) {
          sumaEvaluacion += Number(c.evaluacion);
          evaluadosCount++;
        }

        // Top listas
        if (faltas > 0) topFaltistas.push({ nombre: c.nombre, tarjeton: c.tarjeton, faltas });
        if (retardos > 0) topRetardos.push({ nombre: c.nombre, retardos });
        if (accidentes > 0) topAccidentes.push({ nombre: c.nombre, accidentes });

        // Tipos de tarjetón
        const tipo = c.tipo_tarjeton || 'No definido';
        tarjetonesCount[tipo] = (tarjetonesCount[tipo] || 0) + 1;
      }
    });

    // Filtrar Top 5 Faltas según el rango seleccionado
    let topFaltistasFiltrados = topFaltistas;
    if (rangoFaltas === '1-2') {
      topFaltistasFiltrados = topFaltistas.filter(f => f.faltas >= 1 && f.faltas <= 2);
    } else if (rangoFaltas === '3-5') {
      topFaltistasFiltrados = topFaltistas.filter(f => f.faltas >= 3 && f.faltas <= 5);
    } else if (rangoFaltas === '6-10') {
      topFaltistasFiltrados = topFaltistas.filter(f => f.faltas >= 6 && f.faltas <= 10);
    } else if (rangoFaltas === '10+') {
      topFaltistasFiltrados = topFaltistas.filter(f => f.faltas >= 10);
    } else if (rangoFaltas === 'CUSTOM') {
      const min = Math.max(0, Number(minFaltasCustom) || 0);
      const max = Math.max(min, Number(maxFaltasCustom) || 999);
      topFaltistasFiltrados = topFaltistas.filter(f => f.faltas >= min && f.faltas <= max);
    }

    // Ordenar y limitar tops
    const top5Faltas = topFaltistasFiltrados.sort((a, b) => b.faltas - a.faltas).slice(0, 5);
    const top5Retardos = topRetardos.sort((a, b) => b.retardos - a.retardos).slice(0, 5);
    const top5Accidentes = topAccidentes.sort((a, b) => b.accidentes - a.accidentes).slice(0, 5);

    // Formato pie chart
    const tarjetonesData = Object.keys(tarjetonesCount).map(key => ({
      name: key,
      value: tarjetonesCount[key]
    }));

    const promEvaluacion = evaluadosCount > 0 ? (sumaEvaluacion / evaluadosCount).toFixed(1) : 0;

    return {
      activos,
      bajas,
      totalFaltas,
      totalRetardos,
      promEvaluacion,
      top5Faltas,
      top5Retardos,
      top5Accidentes,
      tarjetonesData
    };
  }, [conductores, rangoFaltas, minFaltasCustom, maxFaltasCustom]);

  const fechaActualFormateada = useMemo(() => {
    const d = new Date();
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('es-MX', opciones);
  }, []);

  const resumenStats = useMemo(() => {
    let operacion = 0;
    let descansos = 0;
    let incapacidades = 0;
    let maniobristas = 0;
    let encierroOperativo = 0;
    let permisos = 0;
    let reservasIntermedias = 0;
    let yaNoSePresentan = 0;
    let reservasRealesMatutino = 0;
    let reservasRealesVespertino = 0;

    conductores.forEach(c => {
      const estServ = String(c.estado_servicio || '').toLowerCase().trim();
      const estatus = String(c.estatus || '').toLowerCase().trim();
      const tipoTarj = String(c.tipo_tarjeton || '').toLowerCase().trim();
      const turno = String(c.turno || '').toLowerCase().trim();

      // 1. Ya no se presentan (baja, no_se_presenta, inactivo, inhabilitado)
      if (estatus === 'baja' || estServ === 'baja' || estServ === 'ya_no_se_presenta' || estServ === 'inactivo' || estServ === 'inhabilitado') {
        yaNoSePresentan++;
        return;
      }

      // 2. Descansos
      if (estServ.includes('descanso')) {
        descansos++;
        return;
      }

      // 3. Incapacidades
      if (estServ.includes('incapacidad') || estServ.includes('enfermedad') || estServ.includes('salud')) {
        incapacidades++;
        return;
      }

      // 4. Maniobristas
      if (estServ.includes('maniobrista') || tipoTarj.includes('maniobrista')) {
        maniobristas++;
        return;
      }

      // 5. Encierro Operativo
      if (estServ.includes('encierro') || estServ.includes('patio')) {
        encierroOperativo++;
        return;
      }

      // 6. Permisos
      if (estServ.includes('permiso') || (Array.isArray(c.permisos_detalle) && c.permisos_detalle.length > 0 && estServ !== 'en_servicio')) {
        permisos++;
        return;
      }

      // 7. Reservas Intermedias
      if (estServ.includes('intermedia') || tipoTarj.includes('intermedia')) {
        reservasIntermedias++;
        return;
      }

      // 8 & 9. Reservas Reales Matutino / Vespertino
      if (estServ === 'reserva' || estServ === 'disponible' || estServ.includes('reserva')) {
        if (turno.includes('vespertino') || turno === 'v' || estServ.includes('vespertino')) {
          reservasRealesVespertino++;
        } else {
          reservasRealesMatutino++;
        }
        return;
      }

      // 10. Operación (en_servicio) o fallback
      if (estServ === 'en_servicio' || estServ === 'operacion' || estatus === 'activo') {
        operacion++;
      } else {
        operacion++;
      }
    });

    const rows = [
      { concepto: 'OPERACIÓN', cantidad: operacion },
      { concepto: 'DESCANSOS', cantidad: descansos },
      { concepto: 'INCAPACIDADES', cantidad: incapacidades },
      { concepto: 'MANIOBRISTAS', cantidad: maniobristas },
      { concepto: 'ENCIERRO OPERATIVO', cantidad: encierroOperativo },
      { concepto: 'PERMISOS', cantidad: permisos },
      { concepto: 'RESERVAS INTERMEDIAS', cantidad: reservasIntermedias },
      { concepto: 'YA NO SE PRESENTAN', cantidad: yaNoSePresentan },
      { concepto: 'RESERVAS REALES MATUTINO', cantidad: reservasRealesMatutino },
      { concepto: 'RESERVAS REALES VESPERTINO', cantidad: reservasRealesVespertino },
    ];

    const total = rows.reduce((sum, r) => sum + r.cantidad, 0);

    return { rows, total };
  }, [conductores]);

  // Renderizador personalizado para leyenda del PieChart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.8rem">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="estadisticas-operadores" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#10b981]">
          <p className="text-slate-500 text-sm font-medium mb-1">Operadores Activos</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-800">{stats.activos}</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{stats.bajas} Bajas</span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#ef4444]">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Faltas (Activos)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalFaltas}</h3>
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full text-center">Crítico para bonos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#f59e0b]">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Retardos (Activos)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalRetardos}</h3>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-center">Afecta puntualidad</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#3b82f6]">
          <p className="text-slate-500 text-sm font-medium mb-1">Promedio Evaluación</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-800">{stats.promEvaluacion} / 10</h3>
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full text-center">Calidad de servicio</span>
          </div>
        </div>
      </div>

      {/* Grid 1: Resumen General de Conductores + Distribución por Tarjetón */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Card 1: Resumen General de Conductores */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#6b1d33]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  Resumen General de Conductores
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium capitalize">
                  {fechaActualFormateada}
                </p>
              </div>
              <span className="text-xs font-bold text-[#6b1d33] bg-[#6b1d33]/10 px-3 py-1.5 rounded-xl border border-[#6b1d33]/20 self-start sm:self-auto">
                Conteo en Tiempo Real
              </span>
            </div>

            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {resumenStats.rows.map((row, index) => {
                const colorsMap = {
                  'OPERACIÓN': { bg: 'bg-emerald-50/60', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-900 border border-emerald-200' },
                  'DESCANSOS': { bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-800 border border-slate-300' },
                  'INCAPACIDADES': { bg: 'bg-amber-50/60', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-900 border border-amber-200' },
                  'MANIOBRISTAS': { bg: 'bg-purple-50/60', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-900 border border-purple-200' },
                  'ENCIERRO OPERATIVO': { bg: 'bg-blue-50/60', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-900 border border-blue-200' },
                  'PERMISOS': { bg: 'bg-indigo-50/60', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-900 border border-indigo-200' },
                  'RESERVAS INTERMEDIAS': { bg: 'bg-sky-50/60', text: 'text-sky-800', badge: 'bg-sky-100 text-sky-900 border border-sky-200' },
                  'YA NO SE PRESENTAN': { bg: 'bg-red-50/60', text: 'text-red-800', badge: 'bg-red-100 text-red-900 border border-red-200' },
                  'RESERVAS REALES MATUTINO': { bg: 'bg-amber-50/40', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-900 border border-amber-200' },
                  'RESERVAS REALES VESPERTINO': { bg: 'bg-indigo-50/40', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-900 border border-indigo-200' },
                };

                const theme = colorsMap[row.concepto] || { bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-800 border border-slate-300' };

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-100 ${theme.bg} transition-all hover:border-slate-200`}
                  >
                    <span className={`text-xs font-extrabold ${theme.text} uppercase tracking-wider`}>
                      {row.concepto}
                    </span>
                    <span className={`text-xs font-black px-3 py-1 rounded-lg ${theme.badge}`}>
                      {row.cantidad}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between bg-slate-900 text-white p-3 rounded-xl shadow-sm">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              TOTAL OPERADORES
            </span>
            <span className="text-base font-black text-amber-400 bg-slate-800 px-3.5 py-1 rounded-lg border border-slate-700">
              {resumenStats.total}
            </span>
          </div>
        </div>

        {/* Card 2: Gráfica Distribución de Tarjetones */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">Distribución por Tipo de Tarjetón</h3>
            {stats.tarjetonesData.length > 0 ? (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={stats.tarjetonesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.tarjetonesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 italic">Sin información de tarjetones.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Accidentes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg width="24" height="24" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Top 5 T6 con Accidentes/Siniestros
          </h3>
          {stats.top5Accidentes.length > 0 ? (
            <div className="space-y-3">
              {stats.top5Accidentes.map((op, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="font-medium text-slate-700">{op.nombre}</span>
                  <span className="bg-white text-amber-600 font-bold px-3 py-1 rounded-md shadow-sm">{op.accidentes} accidentes</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
              Excelente, no hay accidentes registrados en operadores activos.
            </div>
          )}
        </div>

        {/* Top Retardos */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <svg width="24" height="24" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Top 5 T6 con Retardos
          </h3>
          {stats.top5Retardos.length > 0 ? (
            <div className="space-y-3">
              {stats.top5Retardos.map((op, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="font-medium text-slate-700">{op.nombre}</span>
                  <span className="bg-white text-blue-600 font-bold px-3 py-1 rounded-md shadow-sm">{op.retardos} retardos</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded-lg border border-slate-100">
              No hay retardos registrados en operadores activos.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
