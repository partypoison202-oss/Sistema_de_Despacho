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

// Funciones auxiliares para reducir la complejidad cognitiva de useMemo
const calculateFaltasParaTop = (c, rangoFaltas, fechaSeleccionada, faltasGlobales) => {
  if (!['FECHA_DIA', 'FECHA_MES', 'FECHA_AÑO'].includes(rangoFaltas) || !fechaSeleccionada) {
    return faltasGlobales;
  }
  
  const faltasDetalle = getDetailArray(c, 'faltas');
  return faltasDetalle.filter(f => {
    if (!f.fecha) {
      return false;
    }
    const d = f.fecha.split('T')[0];
    if (rangoFaltas === 'FECHA_DIA') {
      return d === fechaSeleccionada;
    }
    if (rangoFaltas === 'FECHA_MES') {
      return d.startsWith(fechaSeleccionada);
    }
    if (rangoFaltas === 'FECHA_AÑO') {
      return d.startsWith(fechaSeleccionada);
    }
    return false;
  }).length;
};

const filterTopFaltistas = (topFaltistas, rangoFaltas, minFaltasCustom, maxFaltasCustom) => {
  if (rangoFaltas === '1-2') {
    return topFaltistas.filter(f => f.faltas >= 1 && f.faltas <= 2);
  }
  if (rangoFaltas === '3-5') {
    return topFaltistas.filter(f => f.faltas >= 3 && f.faltas <= 5);
  }
  if (rangoFaltas === '6-10') {
    return topFaltistas.filter(f => f.faltas >= 6 && f.faltas <= 10);
  }
  if (rangoFaltas === '10+') {
    return topFaltistas.filter(f => f.faltas >= 10);
  }
  if (rangoFaltas === 'CUSTOM') {
    const min = Math.max(0, Number(minFaltasCustom) || 0);
    const max = Math.max(min, Number(maxFaltasCustom) || 999);
    return topFaltistas.filter(f => f.faltas >= min && f.faltas <= max);
  }
  return topFaltistas;
};


export default function EstadisticasOperadores({ conductores = [] }) {
  const [rangoFaltas, setRangoFaltas] = React.useState('TODOS');
  const [minFaltasCustom, setMinFaltasCustom] = React.useState(1);
  const [maxFaltasCustom, setMaxFaltasCustom] = React.useState(10);
  
  const [tipoFiltroFaltas, setTipoFiltroFaltas] = React.useState('RANGO'); // RANGO, FECHA
  const [fechaSeleccionada, setFechaSeleccionada] = React.useState('');

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

    let resumenOperacion = 0;
    let resumenDescansos = 0;
    let resumenIncapacidades = 0;
    let resumenManiobristas = 0;

    conductores.forEach(c => {
      // Bajas vs Activos
      if (c.estatus === 'baja') {
        bajas++;
      } else {
        activos++;
        
        // Sumar faltas y retardos (solo de activos para no sesgar con gente que ya no está)
        const faltasGlobales = Number(c.faltas) || 0;
        const retardos = Number(c.retardos) || 0;
        const accidentes = getDetailArray(c, 'accidentes_siniestros').length;

        totalFaltas += faltasGlobales;
        totalRetardos += retardos;
        
        let faltasParaTop = calculateFaltasParaTop(c, rangoFaltas, fechaSeleccionada, faltasGlobales);

        if (c.evaluacion) {
          sumaEvaluacion += Number(c.evaluacion);
          evaluadosCount++;
        }

        // Top listas
        if (faltasParaTop > 0) topFaltistas.push({ nombre: c.nombre, tarjeton: c.tarjeton, faltas: faltasParaTop });
        if (retardos > 0) topRetardos.push({ nombre: c.nombre, retardos });
        if (accidentes > 0) topAccidentes.push({ nombre: c.nombre, accidentes });

        // Tipos de tarjetón
        const tipo = c.tipo_tarjeton || 'No definido';
        tarjetonesCount[tipo] = (tarjetonesCount[tipo] || 0) + 1;

        // Resumen de conductores
        const estado = String(c.estado_servicio || 'disponible').toLowerCase();
        if (estado === 'disponible' || estado === 'en_servicio') {
          resumenOperacion++;
        } else if (estado === 'descanso') {
          resumenDescansos++;
        } else if (estado === 'incapacidad') {
          resumenIncapacidades++;
        } else if (estado === 'maniobrista' || c.estatus === 'maniobrista') {
          resumenManiobristas++;
        }
      }
    });

    // Filtrar Top 5 Faltas según el rango seleccionado
    let topFaltistasFiltrados = filterTopFaltistas(topFaltistas, rangoFaltas, minFaltasCustom, maxFaltasCustom);

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
      tarjetonesData,
      resumen: {
        operacion: resumenOperacion,
        descansos: resumenDescansos,
        incapacidades: resumenIncapacidades,
        maniobristas: resumenManiobristas,
      }
    };
  }, [conductores, rangoFaltas, minFaltasCustom, maxFaltasCustom, fechaSeleccionada]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-[#3b82f6]">
          <p className="text-slate-500 text-sm font-medium mb-1">Promedio Evaluación</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-slate-800">{stats.promEvaluacion} / 10</h3>
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full text-center">Calidad de servicio</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Gráfica Top Faltas con Filtro por Rango */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg width="22" height="22" fill="none" stroke="#ef4444" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Top 5 T6 con Faltas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {['TODOS', '1-2', '3-5', '6-10', '10+', 'CUSTOM'].includes(rangoFaltas) 
                  ? (rangoFaltas === 'TODOS' ? 'Vista General' : `Filtrado por rango de faltas`) 
                  : 'Filtrado por fecha específica'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label htmlFor="select-rango-faltas" className="text-xs font-bold text-slate-500">Filtrar por:</label>
                <select
                  id="select-rango-faltas"
                  value={rangoFaltas}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRangoFaltas(val);
                    if (['FECHA_DIA', 'FECHA_MES', 'FECHA_AÑO'].includes(val)) {
                      const d = new Date();
                      if (val === 'FECHA_DIA') setFechaSeleccionada(d.toISOString().split('T')[0]);
                      if (val === 'FECHA_MES') setFechaSeleccionada(d.toISOString().slice(0, 7));
                      if (val === 'FECHA_AÑO') setFechaSeleccionada(d.getFullYear().toString());
                    } else {
                      setFechaSeleccionada('');
                    }
                  }}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
                >
                  <optgroup label="Cantidad Total">
                    <option value="TODOS">General (Todas)</option>
                    <option value="1-2">1 a 2 Faltas</option>
                    <option value="3-5">3 a 5 Faltas</option>
                    <option value="6-10">6 a 10 Faltas</option>
                    <option value="10+">10+ Faltas</option>
                    <option value="CUSTOM">Rango Personalizado...</option>
                  </optgroup>
                  <optgroup label="Fecha Específica">
                    <option value="FECHA_DIA">Por Día Específico</option>
                    <option value="FECHA_MES">Por Mes Específico</option>
                    <option value="FECHA_AÑO">Por Año Específico</option>
                  </optgroup>
                </select>
              </div>

              {rangoFaltas === 'CUSTOM' && (
                <div className="flex items-center gap-1 bg-red-50/50 p-1 rounded-lg border border-red-100">
                  <input
                    type="number"
                    min="0"
                    value={minFaltasCustom}
                    onChange={(e) => setMinFaltasCustom(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 text-center text-xs font-bold bg-white border border-red-200 rounded py-1 text-slate-800 outline-none"
                    placeholder="Mín"
                    title="Faltas Mínimas"
                  />
                  <span className="text-xs text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    value={maxFaltasCustom}
                    onChange={(e) => setMaxFaltasCustom(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 text-center text-xs font-bold bg-white border border-red-200 rounded py-1 text-slate-800 outline-none"
                    placeholder="Máx"
                    title="Faltas Máximas"
                  />
                </div>
              )}

              {['FECHA_DIA', 'FECHA_MES', 'FECHA_AÑO'].includes(rangoFaltas) && (
                <div className="flex items-center">
                  {rangoFaltas === 'FECHA_DIA' && (
                    <input 
                      type="date" 
                      value={fechaSeleccionada} 
                      onChange={e => setFechaSeleccionada(e.target.value)} 
                      className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-red-500 text-slate-700" 
                    />
                  )}
                  {rangoFaltas === 'FECHA_MES' && (
                    <input 
                      type="month" 
                      value={fechaSeleccionada} 
                      onChange={e => setFechaSeleccionada(e.target.value)} 
                      className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-red-500 text-slate-700" 
                    />
                  )}
                  {rangoFaltas === 'FECHA_AÑO' && (
                    <input 
                      type="number" 
                      min="2020" max="2100" 
                      placeholder="YYYY" 
                      value={fechaSeleccionada} 
                      onChange={e => setFechaSeleccionada(e.target.value)} 
                      className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-red-500 text-slate-700 w-20 text-center" 
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {stats.top5Faltas.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={stats.top5Faltas} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" width={120} tick={{fontSize: 12}} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="faltas" fill="#ef4444" radius={[0, 4, 4, 0]} name="Faltas" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 italic gap-2 text-sm text-center px-4">
               <span>No hay operadores registradas con faltas bajo los filtros seleccionados.</span>
               {rangoFaltas !== 'TODOS' && (
                 <button
                   type="button"
                   onClick={() => setRangoFaltas('TODOS')}
                   className="text-xs text-red-600 font-bold underline not-italic hover:text-red-700 mt-2"
                 >
                   Restablecer a vista General
                 </button>
               )}
             </div>
          )}
        </div>

        {/* Gráfica Distribución de Tarjetones */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Distribución por Tipo de Tarjetón</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-8">
        {/* Resúmen de Conductores */}
        <div className="bg-white rounded-2xl p-0 shadow-sm border border-slate-200 overflow-hidden lg:col-span-1">
          <div className="bg-[#591024] text-white p-3 text-center">
            <h3 className="text-xl font-bold uppercase tracking-wide">Resumen de conductores</h3>
            <p className="text-sm font-light opacity-90 capitalize">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr className="hover:bg-slate-50 transition-colors">
                  <th scope="row" className="p-3 px-6 font-semibold uppercase text-left">OPERACIÓN</th>
                  <td className="p-3 px-6 text-right font-bold text-xl">{stats.resumen.operacion}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th scope="row" className="p-3 px-6 font-semibold uppercase text-left">DESCANSOS</th>
                  <td className="p-3 px-6 text-right font-bold text-xl">{stats.resumen.descansos}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th scope="row" className="p-3 px-6 font-semibold uppercase text-left">INCAPACIDADES</th>
                  <td className="p-3 px-6 text-right font-bold text-xl">{stats.resumen.incapacidades}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th scope="row" className="p-3 px-6 font-semibold uppercase text-left">MANIOBRISTAS</th>
                  <td className="p-3 px-6 text-right font-bold text-xl">{stats.resumen.maniobristas}</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <th scope="row" className="p-3 px-6 font-semibold text-slate-400 uppercase text-left">PERMISOS</th>
                  <td className="p-3 px-6 text-right font-bold text-xl text-slate-400">-</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <th scope="row" className="p-3 px-6 font-semibold uppercase text-left">YA NO SE PRESENTAN <span className="text-xs text-slate-400 normal-case ml-2">(Bajas)</span></th>
                  <td className="p-3 px-6 text-right font-bold text-xl">{stats.bajas}</td>
                </tr>
                <tr className="bg-[#591024] text-white">
                  <th scope="row" className="p-4 px-6 font-bold text-xl uppercase tracking-wider text-left">TOTAL OPERADORES</th>
                  <td className="p-4 px-6 text-right font-bold text-3xl">{stats.activos}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
