import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import './ResumenDespacho.css';
import API_BASE from '../../config/api';


const modelsConfig = [
  { id: 'URBANUSS', label: 'URBANUSS', image: '/images/urbanu-frente.webp' },
  { id: 'ZAFIRO', label: 'ZAFIRO', image: '/images/zafiro delante.webp' },
  { id: 'VAGONETA', label: 'VAGONETA', image: '/images/vagoneta frente.webp' },
  { id: 'ORION', label: 'ORIÓN', image: '/images/orionfrente.webp' }
];

const COLORS = ['#601a2a', '#c5a059', '#78350f', '#eab308']; // Colores de la dona

export default function ResumenDespacho() {
  const [modelData, setModelData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const res = await fetch(`${API_BASE}/api/despacho/hoy`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        const apiData = await res.json();
        
        const aggregated = modelsConfig.map(mc => {
          const units = apiData.filter(d => d.TIPO_DE_UNIDAD?.toUpperCase().includes(mc.id));
          const prog = units.length;
          const oper = units.filter(d => {
            const status = (d.ESTATUS || '').toUpperCase().trim();
            return status.includes('OPERACI');
          }).length;
          const mantUnits = units.filter(d => {
            const status = (d.ESTATUS || '').toUpperCase().trim();
            return status.includes('MANTENIMIENTO');
          });
          const mant = mantUnits.length;
          const efi = prog > 0 ? Math.round((oper / prog) * 100) : 0;
          
          const fallasPorTipo = {};
          mantUnits.forEach(u => {
            let motivo = u.MOTIVO_ESTATUS ? u.MOTIVO_ESTATUS.trim() : (u.FALLA ? u.FALLA.trim() : '');
            if (motivo !== '') {
              if (!fallasPorTipo[motivo]) {
                fallasPorTipo[motivo] = [];
              }
              const ecoNum = u.ECONOMICO ? String(u.ECONOMICO).padStart(3, '0') : '';
              if (ecoNum && !fallasPorTipo[motivo].includes(ecoNum)) {
                fallasPorTipo[motivo].push(ecoNum);
              }
            }
          });
          
          const fallasFormatted = Object.entries(fallasPorTipo)
            .map(([falla, ecos]) => `${ecos.join(', ')} (${falla})`)
            .join('\n');

          return {
            ...mc,
            programadas: prog,
            operacion: oper,
            mantenimiento: mant,
            eficiencia: efi,
            fallasText: fallasFormatted
          };
        });
        setModelData(aggregated);
        setRawData(apiData);
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    fetchData();
  }, []);

  const totales = modelData.reduce((acc, curr) => ({
    programadas: acc.programadas + curr.programadas,
    operacion: acc.operacion + curr.operacion,
    mantenimiento: acc.mantenimiento + curr.mantenimiento
  }), { programadas: 0, operacion: 0, mantenimiento: 0 });
  
  const eficienciaTotal = totales.programadas > 0 ? Math.round((totales.operacion / totales.programadas) * 100) : 0;

  const dataDona = modelData.map(m => ({
    name: m.label,
    value: m.mantenimiento
  })).filter(d => d.value > 0);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const el = document.getElementById('reporte-pdf');
      const canvas = await html2canvas(el, {
        scale: 4, // Incrementar la escala para mayor definición
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 0; // Sin márgenes para usar toda la hoja
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Tolerancia de 2mm para evitar páginas adicionales en blanco por errores de redondeo
      while (heightLeft > 2) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`Resumen_Despacho_${new Date().toISOString().slice(0, 10)}.pdf`);

      Swal.fire({
        icon: 'success',
        title: '¡Generado!',
        text: 'El reporte en PDF se ha generado y descargado correctamente.',
        confirmButtonColor: '#c29b53',
        timer: 2500
      });

    } catch (error) {
      console.error('Error al generar PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al generar el PDF.',
        confirmButtonColor: '#601a2a'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const fechaFormateada = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="resumen-page">
      <Header title="Resumen de Despacho" eyebrow="Reportes" hideLogos={true} />

      <main className="resumen-container">

        <div style={{ width: '100%', maxWidth: '816px', display: 'flex', justifyContent: 'flex-end', position: 'sticky', top: '10px', zIndex: 100, marginBottom: '10px' }}>
          <button 
            className="btn-pdf-top"
            onClick={handleGeneratePDF} 
            disabled={isGenerating}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--brand-gold-text)', color: 'var(--brand-maroon-text)', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            {isGenerating ? (
              <>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', margin: 0, borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: '#601a2a' }}></span>
                Generando PDF...
              </>
            ) : 'DESCARGAR PDF'}
          </button>
        </div>

        <div className="table-responsive-wrapper" style={{ width: '100%', maxWidth: '816px', overflowX: 'auto', margin: '0 auto' }}>
        <div className="resumen-pdf-wrapper" id="reporte-pdf">
        
        {/* ENCABEZADO TIPO BANNER */}
        <div className="resumen-header-wrapper">
          <div className="resumen-header-banner" style={{ position: 'relative', overflow: 'hidden' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Franja dorada diagonal */}
              <polygon points="45,0 60,0 50,100 35,100" fill="rgba(210, 180, 120, 0.4)" />
              {/* Forma guinda derecha */}
              <polygon points="78,0 100,0 100,100 70,100" fill="#601a2a" />
            </svg>
            <div className="banner-left" style={{ zIndex: 2, position: 'relative' }}>
              <h1>RESUMEN DE DESPACHO</h1>
              <h2>Sistema Integrado de Transporte Masivo de Hidalgo</h2>
            </div>
            <div className="banner-right" style={{ zIndex: 2, position: 'relative' }}>
              <img src="/images/sistema_de_tm.webp" alt="Sistema de Transporte Metropolitano" className="logo-derecha" />
            </div>
          </div>
          <div className="resumen-date">
            {fechaFormateada}
          </div>
        </div>

        {/* GRILLA SUPERIOR: Tabla y Barras */}
        <div className="resumen-grid-top">
          
          {/* TABLA 1 */}
          <div className="table-responsive">
            <table className="resumen-table">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Unidades<br/>Programadas</th>
                  <th>En Operación</th>
                  <th>Porcentaje<br/>Eficiencia</th>
                  <th className="gold-bg">Unidades en<br/>Mantenimiento</th>
                  <th className="gold-bg">Tipo de Falla</th>
                </tr>
              </thead>
              <tbody>
                {modelData.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="modelo-cell">
                        <span>{row.label}</span>
                        <img src={row.image} alt={row.label} />
                      </div>
                    </td>
                    <td>{row.programadas}</td>
                    <td>{row.operacion}</td>
                    <td>{row.eficiencia}%</td>
                    <td>{row.mantenimiento}</td>
                    <td style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{row.fallasText}</td>
                  </tr>
                ))}
                <tr className="totales-row">
                  <td>TOTALES</td>
                  <td className="gold-text">{totales.programadas}</td>
                  <td className="gold-text">{totales.operacion}</td>
                  <td className="gold-text">{eficienciaTotal}%</td>
                  <td className="gold-text">{totales.mantenimiento}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* GRÁFICA DE BARRAS + LÍNEA */}
          <div className="chart-container">
            <div className="chart-header">Porcentaje de Eficiencia</div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={modelData} margin={{ top: 15, right: 15, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis hide={true} />
                <Tooltip />
                <Bar isAnimationActive={false} dataKey="programadas" fill="#601a2a" barSize={20} name="Unidades Programadas">
                  <LabelList dataKey="programadas" position="top" style={{ fontSize: 10, fill: '#601a2a' }} />
                </Bar>
                <Bar isAnimationActive={false} dataKey="operacion" fill="#c5a059" barSize={20} name="En Operación">
                  <LabelList dataKey="operacion" position="top" style={{ fontSize: 10, fill: '#c5a059' }} />
                </Bar>
                <Line isAnimationActive={false} type="monotone" dataKey="eficiencia" stroke="#fbbf24" strokeWidth={3} name="Porcentaje Eficiencia">
                  <LabelList dataKey="eficiencia" position="bottom" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#fbbf24' }} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="custom-legend">
              <div className="custom-legend-item">
                <div className="legend-color-box" style={{ background: '#601a2a' }}></div>
                <span>UNIDADES PROGRAMADAS</span>
              </div>
              <div className="custom-legend-item">
                <div className="legend-color-box" style={{ background: '#c5a059' }}></div>
                <span>EN OPERACIÓN</span>
              </div>
              <div className="custom-legend-item">
                <div className="legend-color-box" style={{ background: '#fbbf24', height: '3px', marginTop: '3px' }}></div>
                <span>PORCENTAJE EFICIENCIA</span>
              </div>
            </div>
          </div>
        </div>

        {/* GRILLA INFERIOR: Tabla Falsa y Dona */}
        <div className="resumen-grid-bottom">
          
          {/* TABLA 2 (PLACEHOLDER) */}
          <div className="table-responsive">
            <table className="resumen-table-bottom">
              <thead>
                <tr>
                  <th colSpan="6">Corridas y Ciclos Faltantes</th>
                </tr>
                <tr>
                  <th>No.</th>
                  <th>Eco</th>
                  <th>Ruta</th>
                  <th>Corrida</th>
                  <th>Ciclo</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {rawData.filter(d => d.CICLO !== null && d.CICLO !== undefined && d.CICLO !== '').map((item, index) => {
                  let cicloFormatted = item.CICLO || '';
                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.ECONOMICO ? String(item.ECONOMICO).padStart(3, '0') : ''}</td>
                      <td>{item.RUTA}</td>
                      <td>{item.CORRIDAS}</td>
                      <td>{cicloFormatted}</td>
                      <td>{item.MOTIVO}</td>
                    </tr>
                  );
                })}
                {rawData.filter(d => d.CICLO !== null && d.CICLO !== undefined && d.CICLO !== '').length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>Sin registros</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* GRÁFICA DE DONA */}
          <div className="chart-container">
            <div className="chart-header">Porcentaje de Unidades en Mantenimiento</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 15, right: 15, bottom: 15, left: 15 }}>
                <Pie
                  isAnimationActive={false}
                  data={dataDona}
                  innerRadius={35}
                  outerRadius={55}
                  dataKey="value"
                  label={({ name, percent, value }) => `${value}, ${(percent * 100).toFixed(0)}%`}
                >
                  {dataDona.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="custom-legend">
              {modelData.map((m, i) => (
                <div className="custom-legend-item" key={m.id}>
                  <div className="legend-color-box" style={{ background: COLORS[i % COLORS.length] }}></div>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
        </div>
      </div>
      


      </main>
    </div>
  );
}
