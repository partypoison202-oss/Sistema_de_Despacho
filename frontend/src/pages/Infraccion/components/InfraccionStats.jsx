import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const customIconRojo = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customIconNaranja = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Mock Data para el Dashboard
const MOCK_DATA = [
  { id: 1, tipo: 'INFRACCION', sentido: 'Tellez -> Centro', lat: 20.1169, lng: -98.7332, fecha: '2026-08-10', hora: '08:30', tramo: 'Estación Bicentenario' },
  { id: 2, tipo: 'ACCIDENTE', sentido: 'Centro -> Tellez', lat: 20.0987, lng: -98.7456, fecha: '2026-08-10', hora: '14:15', tramo: 'Estación Téllez' },
  { id: 3, tipo: 'INFRACCION', sentido: 'Tellez -> Centro', lat: 20.1054, lng: -98.7401, fecha: '2026-08-11', hora: '09:00', tramo: 'Hospital General' },
  { id: 4, tipo: 'INFRACCION', sentido: 'Centro -> Tellez', lat: 20.1102, lng: -98.7380, fecha: '2026-08-11', hora: '18:45', tramo: 'Central de Autobuses' },
  { id: 5, tipo: 'ACCIDENTE', sentido: 'Tellez -> Centro', lat: 20.1221, lng: -98.7290, fecha: '2026-08-12', hora: '07:20', tramo: 'Plaza Juárez' },
  { id: 6, tipo: 'INFRACCION', sentido: 'Ambos', lat: 20.1130, lng: -98.7360, fecha: '2026-08-12', hora: '12:00', tramo: 'Revolución' },
  { id: 7, tipo: 'INFRACCION', sentido: 'Tellez -> Centro', lat: 20.1080, lng: -98.7420, fecha: '2026-08-13', hora: '16:30', tramo: 'Prepa 1' },
  { id: 8, tipo: 'ACCIDENTE', sentido: 'Centro -> Tellez', lat: 20.1190, lng: -98.7310, fecha: '2026-08-13', hora: '19:10', tramo: 'Niños Héroes' },
];

const COLORS = ['#6A1B29', '#E63946', '#F4A261', '#E9C46A'];

const InfraccionStats = () => {
  const [filtroSentido, setFiltroSentido] = useState('TODOS');

  const filteredData = useMemo(() => {
    if (filtroSentido === 'TODOS') return MOCK_DATA;
    return MOCK_DATA.filter(item => item.sentido === filtroSentido || item.sentido === 'Ambos');
  }, [filtroSentido]);

  // Cálculos de KPIs
  const totalInfracciones = filteredData.filter(d => d.tipo === 'INFRACCION').length;
  const totalAccidentes = filteredData.filter(d => d.tipo === 'ACCIDENTE').length;
  
  const sentidoData = [
    { name: 'Téllez -> Centro', value: filteredData.filter(d => d.sentido === 'Tellez -> Centro').length },
    { name: 'Centro -> Téllez', value: filteredData.filter(d => d.sentido === 'Centro -> Tellez').length },
  ];

  // Agrupar por fecha
  const tendenciasData = Object.values(filteredData.reduce((acc, curr) => {
    if (!acc[curr.fecha]) {
      acc[curr.fecha] = { fecha: curr.fecha, Infracciones: 0, Accidentes: 0 };
    }
    if (curr.tipo === 'INFRACCION') acc[curr.fecha].Infracciones += 1;
    if (curr.tipo === 'ACCIDENTE') acc[curr.fecha].Accidentes += 1;
    return acc;
  }, {}));

  // Agrupar por tramo (Top 5)
  const tramosData = Object.values(filteredData.reduce((acc, curr) => {
    if (!acc[curr.tramo]) acc[curr.tramo] = { tramo: curr.tramo, total: 0 };
    acc[curr.tramo].total += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#6A1B29] uppercase tracking-wide">DASHBOARD</h2>
          <p className="text-gray-500 text-sm">Estadísticas de invasión de carril y accidentes en Troncal</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <label className="text-sm font-bold text-gray-700 uppercase">Sentido de Circulación:</label>
          <select 
            className="border border-[#6A1B29] text-[#6A1B29] rounded-lg px-4 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#6A1B29]/50"
            value={filtroSentido}
            onChange={(e) => setFiltroSentido(e.target.value)}
          >
            <option value="TODOS">AMBOS SENTIDOS</option>
            <option value="Tellez -> Centro">TÉLLEZ ➔ CENTRO</option>
            <option value="Centro -> Tellez">CENTRO ➔ TÉLLEZ</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[#6A1B29] flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Boletas Emitidas</span>
          <span className="text-3xl font-extrabold text-gray-800">{totalInfracciones}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[#E63946] flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Accidentes Registrados</span>
          <span className="text-3xl font-extrabold text-gray-800">{totalAccidentes}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[#F4A261] flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Punto Más Crítico</span>
          <span className="text-lg font-bold text-gray-800 leading-tight mt-auto">{tramosData[0]?.tramo || 'N/A'}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[#264653] flex flex-col">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Sentido Principal</span>
          <span className="text-lg font-bold text-gray-800 leading-tight mt-auto">
            {sentidoData[0].value > sentidoData[1].value ? 'Téllez -> Centro' : 
             sentidoData[1].value > sentidoData[0].value ? 'Centro -> Téllez' : 'Equilibrado'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* MAPA INTERACTIVO */}
        <div className="bg-white rounded-xl shadow-sm p-4 lg:col-span-2 border border-gray-100 flex flex-col">
          <h3 className="text-[#6A1B29] font-bold uppercase mb-4 text-sm flex items-center gap-2">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
            Mapa de Incidencias Georreferenciadas
          </h3>
          <div className="flex-1 w-full min-h-[350px] rounded-lg overflow-hidden border border-gray-200" style={{ zIndex: 0 }}>
            <MapContainer center={[20.1169, -98.7332]} zoom={13} style={{ height: '350px', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <MarkerClusterGroup chunkedLoading>
                {filteredData.map(event => (
                  <Marker 
                    key={event.id} 
                    position={[event.lat, event.lng]}
                    icon={event.tipo === 'ACCIDENTE' ? customIconRojo : customIconNaranja}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong className={`block uppercase ${event.tipo === 'ACCIDENTE' ? 'text-[#E63946]' : 'text-[#F4A261]'}`}>
                          {event.tipo}
                        </strong>
                        <span className="text-gray-600 text-xs block">{event.fecha} - {event.hora}</span>
                        <span className="font-bold text-gray-800 block mt-1">{event.tramo}</span>
                        <span className="text-xs text-gray-500 block">Sentido: {event.sentido}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#F4A261]"></span> Infracción</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#E63946]"></span> Accidente</span>
          </div>
        </div>

        {/* COMPARATIVA POR SENTIDO */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col">
          <h3 className="text-[#6A1B29] font-bold uppercase mb-4 text-sm flex items-center gap-2">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"/></svg>
            Proporción por Sentido
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentidoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                >
                  {sentidoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TENDENCIA DIARIA */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-[#6A1B29] font-bold uppercase mb-4 text-sm flex items-center gap-2">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
            Tendencia de Eventos (Últimos Días)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tendenciasData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                <Bar dataKey="Infracciones" fill="#6A1B29" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Accidentes" fill="#E63946" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLA DE TRAMOS */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col">
          <h3 className="text-[#6A1B29] font-bold uppercase mb-4 text-sm flex items-center gap-2">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
            Tramos con Mayor Incidencia
          </h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tramo / Estación</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Eventos Totales</th>
                </tr>
              </thead>
              <tbody>
                {tramosData.map((t, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-800">{t.tramo}</td>
                    <td className="py-3 px-4 text-sm font-bold text-[#6A1B29] text-right">
                      <span className="bg-[#6A1B29]/10 py-1 px-3 rounded-full">{t.total}</span>
                    </td>
                  </tr>
                ))}
                {tramosData.length === 0 && (
                  <tr>
                    <td colSpan="2" className="py-8 text-center text-gray-400 text-sm italic">No hay datos para el filtro actual</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InfraccionStats;
