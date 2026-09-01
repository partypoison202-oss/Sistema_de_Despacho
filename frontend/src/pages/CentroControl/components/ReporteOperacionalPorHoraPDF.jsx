import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const COLOR_GUINDA     = '#601a2a'; 
const COLOR_GOLD       = '#c5a059';
const COLOR_BEIGE      = '#e0d3bb';
const COLOR_LIGHT_GRAY = '#f3f4f6';

const ReporteOperacionalPorHoraPDF = React.forwardRef(({ data }, ref) => {
  if (!data || !data.length) return null;

  // Clasificar datos
  const getEstatus = (d) => (d.ESTATUS || '').toUpperCase().trim();
  const getTipo = (d) => (d.TIPO_DE_UNIDAD || '').toUpperCase().trim();

  const techNames = ['URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORION'];
  const unidadesPorTecnologia = {
      'URBANUSS': { flota: 0, taller: [], reserva: [], desincorporada: [] },
      'ZAFIRO': { flota: 0, taller: [], reserva: [], desincorporada: [] },
      'VAGONETA': { flota: 0, taller: [], reserva: [], desincorporada: [] },
      'ORION': { flota: 0, taller: [], reserva: [], desincorporada: [] }
  };

  let totalFlota = 0;
  
  data.forEach(unit => {
      const tipo = getTipo(unit);
      let techKey = null;
      if (tipo.includes('URBANUS')) techKey = 'URBANUSS';
      else if (tipo.includes('ZAFIRO')) techKey = 'ZAFIRO';
      else if (tipo.includes('VAGONETA')) techKey = 'VAGONETA';
      else if (tipo.includes('ORION') || tipo.includes('ORIÓN')) techKey = 'ORION';

      if (techKey) {
          unidadesPorTecnologia[techKey].flota++;
          totalFlota++;

          const estatus = getEstatus(unit);
          if (estatus.includes('MANTENIMIENTO')) {
              unidadesPorTecnologia[techKey].taller.push(unit);
          } else if (estatus.includes('RESERVA')) {
              unidadesPorTecnologia[techKey].reserva.push(unit);
          } else if (estatus.includes('DESINCORPORADA')) {
              unidadesPorTecnologia[techKey].desincorporada.push(unit);
          }
      }
  });

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).replace('.', '');

  let totalPatio = 0, totalTaller = 0, totalReserva = 0, totalDesinc = 0;
  techNames.forEach(t => {
      const d = unidadesPorTecnologia[t];
      const patio = d.taller.length + d.reserva.length + d.desincorporada.length;
      totalPatio += patio;
      totalTaller += d.taller.length;
      totalReserva += d.reserva.length;
      totalDesinc += d.desincorporada.length;
  });

  const getPct = (val, tot) => tot > 0 ? ((val / tot) * 100).toFixed(1) : '0.0';

  // Helper para celdas con barras de progreso
  const PctCell = ({ pct }) => {
    const p = parseFloat(pct);
    const colorTexto = p > 50 ? '#fff' : '#000';
    return (
      <td style={{ position: 'relative', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold', padding: 0 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${p}%`, backgroundColor: COLOR_GUINDA, zIndex: 1 }}></div>
        <div style={{ position: 'relative', zIndex: 2, color: colorTexto, padding: '4px' }}>{pct}%</div>
      </td>
    );
  };

  const getFalla = (u) => {
    const text = u.FALLA_REPORTADA || u.FALLA || u.MOTIVO_ESTATUS || u.MOTIVO || 'SIN DETALLE';
    return String(text).toUpperCase();
  };
  const getEco = (u) => u.ECONOMICO || u.numero_eco || '';

  const maxTallerRows = Math.max(...techNames.map(t => unidadesPorTecnologia[t].taller.length)) || 1;

  return (
    <div 
      ref={ref} 
      style={{
        width: '1200px', 
        padding: '0',
        background: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#000',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        zIndex: -1,
        border: '1px solid #ccc' 
      }}
    >
      {/* 1. BANNER INSTITUCIONAL Y ENCABEZADOS */}
      <div style={{ background: COLOR_GUINDA, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', height: '60px' }}>
        <img src="/images/sistema_de_tm.webp" alt="STM" style={{ height: '40px' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '1px' }}>ESTATUS OPERATIVO POR HORA</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <img src="/images/sitmah-logo.png" alt="SITMAH" style={{ height: '35px' }} onError={(e) => e.target.style.display = 'none'} />
          <img src="/images/stmhidalgo.png" alt="Hidalgo" style={{ height: '35px' }} onError={(e) => e.target.style.display = 'none'} />
        </div>
      </div>

      <div style={{ background: COLOR_GOLD, color: COLOR_GUINDA, textAlign: 'center', padding: '4px 0', fontSize: '13px', fontWeight: 'bold' }}>
        Seguimiento de parque vehicular — Patio | Taller | Reserva | Desincorporadas
      </div>

      {/* FECHA, HORA, FLOTA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div style={{ background: COLOR_GUINDA, color: '#fff', textAlign: 'center', padding: '6px', fontSize: '11px', fontWeight: 'bold' }}>FECHA</div>
        <div style={{ background: COLOR_GUINDA, color: '#fff', textAlign: 'center', padding: '6px', fontSize: '11px', fontWeight: 'bold', borderLeft: '1px solid #fff', borderRight: '1px solid #fff' }}>HORA DE CORTE</div>
        <div style={{ background: COLOR_GUINDA, color: '#fff', textAlign: 'center', padding: '6px', fontSize: '11px', fontWeight: 'bold' }}>FLOTA TOTAL</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: COLOR_LIGHT_GRAY }}>
        <div style={{ textAlign: 'center', padding: '6px', fontSize: '13px', fontWeight: 'bold' }}>{fechaStr}</div>
        <div style={{ textAlign: 'center', padding: '6px', fontSize: '13px', fontWeight: 'bold' }}>{horaStr}</div>
        <div style={{ textAlign: 'center', padding: '6px', fontSize: '13px', fontWeight: 'bold' }}>{totalFlota}</div>
      </div>

      {/* 2. TABLAS RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '15px', padding: '15px 10px', alignItems: 'start' }}>
        
        {/* Tabla Patio */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr><th colSpan="4" style={{ background: COLOR_GUINDA, color: '#fff', padding: '6px', border: '1px solid '+COLOR_GUINDA }}>UNIDADES EN PATIO POR TECNOLOGÍA</th></tr>
            <tr style={{ background: COLOR_LIGHT_GRAY }}>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Tecnología</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Flota</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>En patio</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '60px' }}>% Patio</th>
            </tr>
          </thead>
          <tbody>
            {techNames.map(t => {
              const d = unidadesPorTecnologia[t];
              const patio = d.taller.length + d.reserva.length + d.desincorporada.length;
              return (
                <tr key={t}>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>{t}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{d.flota}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{patio}</td>
                  <PctCell pct={getPct(patio, d.flota)} />
                </tr>
              );
            })}
            <tr style={{ background: COLOR_BEIGE, color: COLOR_GUINDA, fontWeight: 'bold' }}>
              <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>TOTAL</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{totalFlota}</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{totalPatio}</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{getPct(totalPatio, totalFlota)}%</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Taller */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr><th colSpan="3" style={{ background: COLOR_GUINDA, color: '#fff', padding: '6px', border: '1px solid '+COLOR_GUINDA }}>UNIDADES EN TALLER</th></tr>
            <tr style={{ background: COLOR_LIGHT_GRAY }}>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Clasificación</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Cantidad</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '60px' }}>% Flota</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: '4px', border: '1px solid #d1d5db' }}>Preventivo</td><td style={{ textAlign: 'center', border: '1px solid #d1d5db' }}>0</td><PctCell pct="0.0" /></tr>
            <tr><td style={{ padding: '4px', border: '1px solid #d1d5db' }}>Correctivo</td><td style={{ textAlign: 'center', border: '1px solid #d1d5db' }}>{totalTaller}</td><PctCell pct={getPct(totalTaller, totalFlota)} /></tr>
            <tr><td style={{ padding: '4px', border: '1px solid #d1d5db' }}>En diagnóstico</td><td style={{ textAlign: 'center', border: '1px solid #d1d5db' }}>0</td><PctCell pct="0.0" /></tr>
            <tr style={{ background: COLOR_BEIGE, color: COLOR_GUINDA, fontWeight: 'bold' }}>
              <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>TOTAL</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{totalTaller}</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{getPct(totalTaller, totalFlota)}%</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Reserva */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr><th colSpan="3" style={{ background: COLOR_GUINDA, color: '#fff', padding: '6px', border: '1px solid '+COLOR_GUINDA }}>UNIDADES DE RESERVA</th></tr>
            <tr style={{ background: COLOR_LIGHT_GRAY }}>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Tecnología</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Cantidad</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '60px' }}>% Flota</th>
            </tr>
          </thead>
          <tbody>
            {techNames.map(t => {
              const d = unidadesPorTecnologia[t];
              return (
                <tr key={t}>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>{t}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{d.reserva.length}</td>
                  <PctCell pct={getPct(d.reserva.length, d.flota)} />
                </tr>
              );
            })}
            <tr style={{ background: COLOR_BEIGE, color: COLOR_GUINDA, fontWeight: 'bold' }}>
              <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>TOTAL</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{totalReserva}</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{getPct(totalReserva, totalFlota)}%</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Desincorporadas */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr><th colSpan="3" style={{ background: COLOR_GUINDA, color: '#fff', padding: '6px', border: '1px solid '+COLOR_GUINDA }}>DESINCORPORADAS POR ITINERARIO</th></tr>
            <tr style={{ background: COLOR_LIGHT_GRAY }}>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Tecnología</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db' }}>Cantidad</th>
              <th style={{ padding: '6px', border: '1px solid #d1d5db', width: '60px' }}>% Flota</th>
            </tr>
          </thead>
          <tbody>
            {techNames.map(t => {
              const d = unidadesPorTecnologia[t];
              return (
                <tr key={t}>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>{t}</td>
                  <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{d.desincorporada.length}</td>
                  <PctCell pct={getPct(d.desincorporada.length, d.flota)} />
                </tr>
              );
            })}
            <tr style={{ background: COLOR_BEIGE, color: COLOR_GUINDA, fontWeight: 'bold' }}>
              <td style={{ padding: '4px', border: '1px solid #d1d5db' }}>TOTAL</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{totalDesinc}</td>
              <td style={{ padding: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>{getPct(totalDesinc, totalFlota)}%</td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* 3. CAJAS INDICADORES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', padding: '0 10px' }}>
        {[
          { name: 'UNIDADES EN PATIO', count: totalPatio, pct: getPct(totalPatio, totalFlota) },
          { name: 'UNIDADES EN TALLER', count: totalTaller, pct: getPct(totalTaller, totalFlota) },
          { name: 'RESERVA', count: totalReserva, pct: getPct(totalReserva, totalFlota) },
          { name: 'DESINCORPORADAS', count: totalDesinc, pct: getPct(totalDesinc, totalFlota) },
        ].map((box, i) => (
          <div key={i} style={{ border: '1px solid #d1d5db', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ background: COLOR_GUINDA, color: '#fff', textAlign: 'center', padding: '6px', fontSize: '13px', fontWeight: 'bold' }}>{box.name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px', gap: '30px', background: '#fff' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: COLOR_GUINDA }}>{box.count}</span>
              <span style={{ fontSize: '24px', fontWeight: '800', color: COLOR_GOLD }}>{box.pct}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. DETALLES */}
      <div style={{ padding: '15px 10px' }}>
        
        {/* Detalle Taller */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '10px' }}>
          <thead>
            <tr><th colSpan="8" style={{ background: COLOR_GUINDA, color: '#fff', padding: '6px', border: '1px solid #000' }}>UNIDADES EN TALLER</th></tr>
            <tr style={{ background: COLOR_LIGHT_GRAY }}>
              {techNames.map(t => (
                <th key={t} colSpan="2" style={{ padding: '4px', border: '1px solid #000', color: '#000' }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxTallerRows }).map((_, i) => (
              <tr key={i}>
                {techNames.map(t => {
                  const unit = unidadesPorTecnologia[t].taller[i];
                  return (
                    <React.Fragment key={t}>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>{unit ? getEco(unit) : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>{unit ? getFalla(unit) : ''}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Detalle Reserva */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', background: COLOR_GOLD }}>
          <thead>
            <tr><th colSpan="4" style={{ color: '#fff', padding: '6px', border: '1px solid #000', background: COLOR_GOLD }}>UNIDADES EN RESERVA</th></tr>
          </thead>
          <tbody style={{ background: '#fff' }}>
             <tr>
                {techNames.map(t => {
                  const ecos = unidadesPorTecnologia[t].reserva.map(u => getEco(u));
                  return (
                    <td key={t} style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'top', width: '25%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {ecos.map(eco => (
                           <span key={eco} style={{ textAlign: 'center' }}>{eco}</span>
                        ))}
                      </div>
                    </td>
                  )
                })}
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ReporteOperacionalPorHoraPDF;
