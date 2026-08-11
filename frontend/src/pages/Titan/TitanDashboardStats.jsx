import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = {
  'DESINCORPORACION': '#6b7280', 
  'INCORPORACION': '#10b981',
  'ACCIDENTE': '#3b82f6',
  'CHOQUE': '#f59e0b',
  'ATROPELLADO': '#ef4444',
  'CODIGO_AMBAR': '#f59e0b',
  'CODIGO_ROJO': '#dc2626',
  'CODIGO_NARANJA': '#f97316'
};

const TitanDashboardStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    conteos: {}
  });
  const [cargando, setCargando] = useState(true);

  const fetchStats = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      // Fetch historico without filters to get all stats
      const res = await fetch(`${API_BASE}/api/titan/historico`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      const data = await res.json();
      setStats({
        total: data.total || 0,
        conteos: data.conteos || {}
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar las estadísticas.', 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (cargando) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2 className="titan-subtitle">Cargando Estadísticas...</h2>
      </div>
    );
  }

  const { conteos, total } = stats;

  const barData = Object.keys(conteos).map(key => ({
    name: key.replace('_', ' '),
    cantidad: conteos[key]
  })).filter(item => item.cantidad > 0);

  const pieData = [
    { name: 'Código Ámbar', value: conteos['CODIGO_AMBAR'] || 0, color: COLORS['CODIGO_AMBAR'] },
    { name: 'Código Rojo', value: conteos['CODIGO_ROJO'] || 0, color: COLORS['CODIGO_ROJO'] },
    { name: 'Código Naranja', value: conteos['CODIGO_NARANJA'] || 0, color: COLORS['CODIGO_NARANJA'] }
  ].filter(item => item.value > 0);

  return (
    <div className="titan-stats-container">
      <div className="titan-stats-summary" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card" style={{ gridColumn: '1 / -1', borderBottomColor: '#1f2937' }}>
          <div className="stat-card-title" style={{ fontSize: '1rem' }}>Total General de Eventos</div>
          <div className="stat-card-value" style={{ fontSize: '3rem' }}>{total}</div>
        </div>
        
        {/* Códigos Críticos */}
        <div className="stat-card stat-card--ambar">
          <div className="stat-card-title">Código Ámbar</div>
          <div className="stat-card-value">{conteos['CODIGO_AMBAR'] || 0}</div>
        </div>
        <div className="stat-card stat-card--rojo">
          <div className="stat-card-title">Código Rojo</div>
          <div className="stat-card-value">{conteos['CODIGO_ROJO'] || 0}</div>
        </div>
        <div className="stat-card stat-card--naranja">
          <div className="stat-card-title">Código Naranja</div>
          <div className="stat-card-value">{conteos['CODIGO_NARANJA'] || 0}</div>
        </div>

        {/* Otros Eventos */}
        <div className="stat-card" style={{ borderBottomColor: COLORS['ACCIDENTE'] }}>
          <div className="stat-card-title">Accidentes</div>
          <div className="stat-card-value">{conteos['ACCIDENTE'] || 0}</div>
        </div>
        <div className="stat-card" style={{ borderBottomColor: COLORS['CHOQUE'] }}>
          <div className="stat-card-title">Choques</div>
          <div className="stat-card-value">{conteos['CHOQUE'] || 0}</div>
        </div>
        <div className="stat-card" style={{ borderBottomColor: COLORS['ATROPELLADO'] }}>
          <div className="stat-card-title">Atropellados</div>
          <div className="stat-card-value">{conteos['ATROPELLADO'] || 0}</div>
        </div>
        <div className="stat-card" style={{ borderBottomColor: COLORS['DESINCORPORACION'] }}>
          <div className="stat-card-title">Desincorporaciones</div>
          <div className="stat-card-value">{conteos['DESINCORPORACION'] || 0}</div>
        </div>
        <div className="stat-card" style={{ borderBottomColor: COLORS['INCORPORACION'] }}>
          <div className="stat-card-title">Incorporaciones</div>
          <div className="stat-card-value">{conteos['INCORPORACION'] || 0}</div>
        </div>
      </div>

      <div className="titan-charts-grid">
        <div className="titan-chart-card">
          <h3>Eventos por Tipo</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  tick={{ fontSize: 10, fill: '#6b7280' }} 
                  height={60} 
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name.replace(' ', '_')] || '#601a2a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="titan-chart-card">
          <h3>Distribución de Códigos Críticos</h3>
          <div style={{ width: '100%', height: 300 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                No hay datos de códigos críticos aún.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitanDashboardStats;
