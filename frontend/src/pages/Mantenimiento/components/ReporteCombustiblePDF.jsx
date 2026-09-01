import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

// ── Logo STM — T abstracta oficial (Sitmah-Flotilla) ──
function LogoSTM({ className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <rect x="130" y="20" width="270" height="110" fill="#c2a165" />
            <rect x="30" y="130" width="100" height="100" fill="#c2a165" />
            <path
                d="M 130 230 L 130 400 A 150 150 0 0 0 280 550 L 400 550 L 400 430 L 280 430 A 30 30 0 0 1 250 400 L 250 230 Z"
                fill="#c2a165"
            />
        </svg>
    );
}

/**
 * Componente que se renderiza oculto en pantalla para ser capturado por html2canvas.
 * Su diseño imita el mock "REPORTE DE COMBUSTIBLE".
 */
const ReporteCombustiblePDF = React.forwardRef(({ data, totales }, ref) => {
  if (!data || !totales) return null;

  const todayStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const folio = totales.folio || "S/F"; 

  // Helper para formatear números
  const formatNum = (num) => Number(num || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Datos para gráficas
  const chartData = data.map(d => ({
    name: d.tipo_unidad,
    litros: Number(d.litros_cargados) || 0,
    cargaron: Number(d.unidades_cargaron) || 0,
    sincargar: Number(d.unidades_sin_cargar) || 0,
  }));

  const darkRed = "#5b1626"; // Vino oscuro
  const cellRed = "#f8696b";
  const cellGreen = "#63b37b";
  const bgLight = "#fffdf7"; // Fondo amarillento ligero
  
  return (
    <div 
      ref={ref} 
      style={{
        width: '1200px', // Ancho fijo para mantener proporciones landscape
        padding: '20px',
        background: '#fff',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        zIndex: -1
      }}
    >
      {/* HEADER */}
      <div style={{ background: darkRed, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px 20px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LogoSTM style={{ height: '40px' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>SISTEMA DE TRANSPORTE METROPOLITANO</h2>
      </div>
      <div style={{ background: '#7e2439', color: '#fff', textAlign: 'center', padding: '10px 0', borderBottom: '4px solid #fff' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>REPORTE DE COMBUSTIBLE</h1>
      </div>

      {/* FECHA Y FOLIO */}
      <div style={{ display: 'flex', borderBottom: '2px solid ' + darkRed, fontSize: '14px', fontWeight: 'bold' }}>
        <div style={{ flex: 1, padding: '8px', borderRight: '1px solid ' + darkRed }}>
          Fecha del reporte &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
          <span style={{ background: '#fff2cc', padding: '2px 20px', border: '1px solid ' + darkRed, color: darkRed }}>
            {todayStr}
          </span>
        </div>
        <div style={{ flex: 1, padding: '8px', textAlign: 'right' }}>
          Folio &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
          <span style={{ background: '#fff2cc', padding: '2px 40px', border: '1px solid ' + darkRed, color: darkRed }}>
            {folio}
          </span>
        </div>
      </div>

      {/* TOTALES */}
      <div style={{ display: 'flex', textAlign: 'center', borderBottom: '2px solid ' + darkRed, marginTop: '10px' }}>
        <div style={{ flex: 1, borderRight: '2px solid ' + darkRed }}>
          <div style={{ background: darkRed, color: '#fff', padding: '5px', fontSize: '12px', fontWeight: 'bold' }}>LITROS TOTALES</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkRed, padding: '10px 0' }}>
            {formatNum(totales.litros_totales)} L
          </div>
        </div>
        <div style={{ flex: 1, borderRight: '2px solid ' + darkRed }}>
          <div style={{ background: darkRed, color: '#fff', padding: '5px', fontSize: '12px', fontWeight: 'bold' }}>UNIDADES QUE CARGARON</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkRed, padding: '10px 0' }}>
            {totales.unidades_cargaron}
          </div>
        </div>
        <div style={{ flex: 1, borderRight: '2px solid ' + darkRed }}>
          <div style={{ background: darkRed, color: '#fff', padding: '5px', fontSize: '12px', fontWeight: 'bold' }}>UNIDADES SIN CARGAR</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkRed, padding: '10px 0' }}>
            {totales.unidades_sin_cargar}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: darkRed, color: '#fff', padding: '5px', fontSize: '12px', fontWeight: 'bold' }}>% ABASTECIMIENTO</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: darkRed, padding: '10px 0' }}>
            {totales.porcentaje}%
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div style={{ background: darkRed, color: '#fff', textAlign: 'center', padding: '5px', fontSize: '14px', fontWeight: 'bold', marginTop: '15px' }}>
        CAPTURA DIARIA POR TIPO DE UNIDAD
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px', marginTop: '5px' }}>
        <thead>
          <tr style={{ background: darkRed, color: '#fff' }}>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Tipo de unidad</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Combustible</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Parque</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Litros cargados</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Unidades que cargaron</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Unidades sin cargar</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>% abastecimiento</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Motivo de no carga</th>
            <th style={{ padding: '8px', border: '1px solid #fff' }}>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} style={{ background: bgLight, fontWeight: 'bold' }}>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{row.tipo_unidad}</td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{row.combustible}</td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{row.parque}</td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{formatNum(row.litros_cargados)}</td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{row.unidades_cargaron || ''}</td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed, color: row.unidades_sin_cargar > 0 ? 'red' : 'inherit' }}>
                {row.unidades_sin_cargar}
              </td>
              <td style={{ 
                padding: '8px', 
                border: '1px solid ' + darkRed, 
                background: row.porcentaje >= 90 ? cellGreen : (row.porcentaje < 50 ? cellRed : '#f3c258'),
                color: row.porcentaje < 50 ? '#fff' : '#000'
              }}>
                {row.porcentaje}%
              </td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{row.motivo_no_carga}</td>
              <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{row.observaciones}</td>
            </tr>
          ))}
          {/* TOTAL GENERAL */}
          <tr style={{ background: darkRed, color: '#fff', fontWeight: 'bold' }}>
            <td colSpan={2} style={{ padding: '8px', border: '1px solid ' + darkRed }}>TOTAL GENERAL</td>
            <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{totales.parqueTotal || data.reduce((a,b)=>a+b.parque,0)}</td>
            <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{formatNum(totales.litros_totales)}</td>
            <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{totales.unidades_cargaron}</td>
            <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{totales.unidades_sin_cargar}</td>
            <td style={{ padding: '8px', border: '1px solid ' + darkRed }}>{totales.porcentaje}%</td>
            <td colSpan={2} style={{ padding: '8px', border: '1px solid ' + darkRed }}></td>
          </tr>
        </tbody>
      </table>

      {/* GRÁFICAS */}
      <div style={{ background: darkRed, color: '#fff', textAlign: 'center', padding: '5px', fontSize: '14px', fontWeight: 'bold', marginTop: '20px' }}>
        LECTURA VISUAL DEL DÍA
      </div>
      <div style={{ display: 'flex', height: '350px', marginTop: '10px', padding: '10px', gap: '20px' }}>
        {/* Gráfica 1 */}
        <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
          <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'normal', margin: '0 0 10px 0' }}>Litros cargados por tipo de unidad</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fill: '#000', fontSize: 12}} axisLine={{stroke: '#000'}} tickLine={false} />
              <YAxis tick={{fill: '#000', fontSize: 12}} axisLine={{stroke: '#000'}} tickLine={false} />
              <Bar dataKey="litros" fill="#fdf5cc" stroke="#d5b565" strokeWidth={1} barSize={40} isAnimationActive={false}>
                <LabelList dataKey="litros" position="top" style={{fill: '#000', fontSize: 12, fontWeight: 'bold'}} formatter={(val) => formatNum(val)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfica 2 */}
        <div style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'normal', margin: '0 0 10px 0' }}>Unidades abastecidas vs. sin cargar</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fill: '#000', fontSize: 12}} axisLine={{stroke: '#000'}} tickLine={false} />
              <YAxis tick={{fill: '#000', fontSize: 12}} axisLine={{stroke: '#000'}} tickLine={false} />
              <Legend iconType="square" wrapperStyle={{fontSize: '12px', bottom: -10}} />
              <Bar dataKey="cargaron" name="Unidades que cargaron" fill="#6b1d33" barSize={30} isAnimationActive={false}>
                <LabelList dataKey="cargaron" position="top" style={{fill: '#000', fontSize: 12, fontWeight: 'bold'}} />
              </Bar>
              <Bar dataKey="sincargar" name="Unidades sin cargar" fill="#cccccc" stroke="#888" strokeWidth={1} barSize={30} isAnimationActive={false}>
                <LabelList dataKey="sincargar" position="top" style={{fill: '#000', fontSize: 12, fontWeight: 'bold'}} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
});

export default ReporteCombustiblePDF;
