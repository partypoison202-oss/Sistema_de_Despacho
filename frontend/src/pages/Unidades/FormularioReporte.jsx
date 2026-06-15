import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './FormularioReporte.css';

export default function FormularioReporte() {
  const { tipoTransporte, unidadEco, zona } = useParams();
  const navigate = useNavigate();

  const zonaFormateada = zona ? zona.replace('-', ' ') : '';
  const transporteFormateado = tipoTransporte ? tipoTransporte.toUpperCase() : '';

  const [fechaVisual] = useState(() => new Date().toLocaleString());
  const [fechaISO] = useState(() => new Date().toISOString());

  const componentesEvaluacion = [
    { n: 1, area: 'Carrocería exterior', desc: 'Revisar estado general de la carrocería' },
    { n: 2, area: 'Pintura y gráfica', desc: 'Verificar estado de pintura y grafica' },
    { n: 3, area: 'Luces exteriores', desc: 'Verificar funcionamiento de faros, direccionales, luces traseras, y de freno' },
    { n: 4, area: 'Puertas', desc: 'Revisar apertura, cierre y funcionamiento de puertas' },
    { n: 5, area: 'Llantas', desc: 'Verificar presion, desgaste, y estado general de las llantas' },
    { n: 6, area: 'Rines', desc: 'Revisar estado de rines' },
    { n: 7, area: 'Retrovisores', desc: 'Verificar estado, limpieza y ajuste de retrovisores' },
    { n: 8, area: 'Interior y limpieza', desc: 'Revisar limpieza general del interior' },
    { n: 9, area: 'Asientos', desc: 'Verificar estado de asientos' },
    { n: 10, area: 'Extintor y seguridad', desc: 'Verificar existencia y existencia del extintor' },
    { n: 11, area: 'Documentación', desc: 'Revisar documentacion de la unidad' }
  ];

  const [responsable, setResponsable] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [estados, setEstados] = useState({});
  const [observacionesEspecificas, setObservacionesEspecificas] = useState({});
  const [panelAbierto, setPanelAbierto] = useState({});

  // Función para limpiar caracteres extraños y dejar solo ASCII imprimible
  const limpiarTexto = (texto) => {
    if (!texto) return '';
    // Elimina cualquier carácter que no sea letra A-Z, a-z, número, espacio, punto, coma, guión, barra, paréntesis, etc.
    // También reemplaza acentos comunes por sus equivalentes sin acento
    let limpio = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // elimina acentos
    limpio = limpio.replace(/[^\x20-\x7E\u00E0-\u00FC]/g, ''); // permite ASCII imprimible y algunas letras acentuadas básicas
    // Asegurar que no queden caracteres raros como emojis
    limpio = limpio.replace(/[^a-zA-Z0-9\s\.\,\-\/\(\)\:]/g, '');
    return limpio.trim();
  };

  const handleEstadoChange = (id, valor) => {
    // Sanitizar el valor antes de guardarlo (por si acaso)
    const valorLimpio = limpiarTexto(valor);
    setEstados({ ...estados, [id]: valorLimpio });
    if (valorLimpio === 'N/A') {
      setPanelAbierto({ ...panelAbierto, [id]: true });
    } else {
      if (!observacionesEspecificas[id]) {
        setPanelAbierto({ ...panelAbierto, [id]: false });
      }
    }
  };

  const handleNotaChange = (id, texto) => {
    setObservacionesEspecificas({ ...observacionesEspecificas, [id]: texto });
  };

  const guardarNotaEspecifica = (id) => {
    setPanelAbierto({ ...panelAbierto, [id]: false });
  };

  const editarNotaEspecifica = (id) => {
    setPanelAbierto({ ...panelAbierto, [id]: true });
  };

  // Función para generar PDF profesional con texto limpio
  const generarPDFProfesional = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    let y = margin;

    // Limpiar todos los textos que se usarán
    const responsableLimpio = limpiarTexto(responsable) || 'No especificado';
    const kilometrajeLimpio = limpiarTexto(kilometraje) || 'No especificado';
    const zonaLimpia = limpiarTexto(zonaFormateada);
    const unidadLimpia = limpiarTexto(unidadEco);
    const transporteLimpio = limpiarTexto(transporteFormateado);

    // Encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reporte de Inspeccion - ${transporteLimpio}`, margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Unidad ECO: ${unidadLimpia}`, margin, y);
    y += 6;
    doc.text(`Zona inspeccionada: ${zonaLimpia}`, margin, y);
    y += 6;
    doc.text(`Fecha y hora: ${fechaVisual}`, margin, y);
    y += 10;

    // Datos generales
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos Generales', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Responsable: ${responsableLimpio}`, margin, y);
    y += 5;
    doc.text(`Kilometraje actual: ${kilometrajeLimpio} km`, margin, y);
    y += 10;

    // Tabla de evaluación
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Checklist de Inspeccion', margin, y);
    y += 6;

    const tableData = [];
    componentesEvaluacion.forEach(item => {
      let estadoRaw = estados[item.n] || 'Pendiente';
      // Forzar que el estado sea exactamente uno de los valores esperados, limpiando cualquier basura
      let estadoTexto = 'Pendiente';
      if (estadoRaw === 'OK') estadoTexto = 'OK';
      else if (estadoRaw === 'NO OK') estadoTexto = 'NO OK';
      else if (estadoRaw === 'N/A') estadoTexto = 'N/A';
      else if (typeof estadoRaw === 'string' && estadoRaw.includes('OK')) estadoTexto = 'OK';
      else if (typeof estadoRaw === 'string' && estadoRaw.includes('NO')) estadoTexto = 'NO OK';
      else if (typeof estadoRaw === 'string' && estadoRaw.includes('N/A')) estadoTexto = 'N/A';
      
      tableData.push([
        item.n.toString(),
        limpiarTexto(item.area),
        limpiarTexto(item.desc),
        estadoTexto
      ]);
    });

    autoTable(doc, {
      startY: y,
      head: [['N°', 'Area/Componente', 'Descripcion', 'Estado']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 70 },
        3: { cellWidth: 25 }
      },
      didParseCell: function(data) {
        if (data.column.index === 3 && data.row.index > 0) {
          const estado = data.cell.text[0];
          if (estado === 'OK') data.cell.styles.textColor = [0, 128, 0];
          else if (estado === 'NO OK') data.cell.styles.textColor = [255, 0, 0];
          else if (estado === 'N/A') data.cell.styles.textColor = [128, 128, 128];
        }
      }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Observaciones específicas
    const observacionesEspecificasList = Object.entries(observacionesEspecificas)
      .filter(([_, texto]) => texto && limpiarTexto(texto) !== '');
    if (observacionesEspecificasList.length > 0) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones Especificas', margin, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      observacionesEspecificasList.forEach(([id, texto]) => {
        const componente = componentesEvaluacion.find(c => c.n.toString() === id);
        const nombreArea = componente ? limpiarTexto(componente.area) : `Item ${id}`;
        const textoLimpio = limpiarTexto(texto);
        doc.text(`• ${nombreArea}: ${textoLimpio}`, margin, y);
        y += 5;
        if (y > 280) { doc.addPage(); y = margin; }
      });
      y += 5;
    }

    // Observaciones generales
    const observacionesGeneralesLimpio = limpiarTexto(observacionesGenerales);
    if (observacionesGeneralesLimpio !== '') {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones Generales', margin, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(observacionesGeneralesLimpio, 180);
      doc.text(splitText, margin, y);
      y += splitText.length * 5 + 5;
    }

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Reporte generado automaticamente - ${new Date().toLocaleString()}`,
        margin,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Pagina ${i} de ${pageCount}`,
        doc.internal.pageSize.width - margin - 20,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`reporte_${unidadLimpia}_${zonaLimpia.replace(/\s/g, '_')}.pdf`);
  };

  const handleEnviar = (e) => {
    e.preventDefault();
    
    if (!responsable || !kilometraje || Object.keys(estados).length === 0) {
      alert('Por favor completa todos los campos obligatorios y al menos un estado de evaluación.');
      return;
    }

    generarPDFProfesional();

    const payload = {
      transporte: tipoTransporte,
      unidad: unidadEco,
      zona: zonaFormateada,
      responsable,
      kilometraje,
      fechaHora: fechaISO,
      evaluacion: estados,
      observacionesEspecificas,
      observacionesGenerales
    };
    console.log("Datos del reporte (para backend):", payload);
    
    alert('PDF generado y descargado exitosamente');
    navigate(`/transporte/${tipoTransporte}`);
  };

  return (
    <div className="report-layout">
      <header className="report-header">
        <div className="report-header__left">
          <button type="button" onClick={() => navigate(`/transporte/${tipoTransporte}`)} className="report-back-btn" aria-label="Volver">
            <svg className="report-back-btn__icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <p className="report-header__eyebrow">{transporteFormateado} / {unidadEco} / REPORTE</p>
            <h1 className="report-header__title">Check List — {zonaFormateada}</h1>
          </div>
        </div>
        <div className="report-header__badge">{unidadEco}</div>
      </header>

      <main className="report-container">
        <form onSubmit={handleEnviar}>
          <div className="form-card form-card--grid">
            <div className="input-group">
              <label className="input-group__label">RESPONSABLE</label>
              <input type="text" placeholder="Nombre del responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} required className="input-group__field" />
            </div>
            <div className="input-group">
              <label className="input-group__label">KILOMETRAJE ACTUAL</label>
              <input type="text" placeholder="Ej. 48250" value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} required className="input-group__field" />
            </div>
            <div className="input-group">
              <label className="input-group__label">FECHA Y HORA</label>
              <input type="text" value={fechaVisual} disabled className="input-group__field input-group__field--disabled" />
            </div>
          </div>

          <div className="form-card form-card--no-padding">
            <div className="table-responsive">
              <table className="checklist-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>N°</th>
                    <th style={{ width: '25%' }}>AREA/COMPONENTE</th>
                    <th style={{ width: '40%' }}>DESCRIPCION A EVALUAR</th>
                    <th style={{ width: '30%', textAlign: 'center' }}>ESTADO / OBSERVACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {componentesEvaluacion.map((item) => {
                    const tieneNotaEscrita = observacionesEspecificas[item.n] && observacionesEspecificas[item.n].trim() !== '';
                    const mostrarLapiz = estados[item.n] === 'N/A' && tieneNotaEscrita && !panelAbierto[item.n];

                    return (
                      <React.Fragment key={item.n}>
                        <tr>
                          <td className="text-center font-bold">{item.n}</td>
                          <td className="font-bold">{item.area}</td>
                          <td className="text-muted">{item.desc}</td>
                          <td>
                            <div className="btn-toggle-container">
                              <div className="btn-toggle-group">
                                <button type="button" onClick={() => handleEstadoChange(item.n, 'OK')} className={`btn-toggle btn-toggle--ok ${estados[item.n] === 'OK' ? 'active' : ''}`}>OK</button>
                                <button type="button" onClick={() => handleEstadoChange(item.n, 'NO OK')} className={`btn-toggle btn-toggle--no-ok ${estados[item.n] === 'NO OK' ? 'active' : ''}`}>NO OK</button>
                                <button type="button" onClick={() => handleEstadoChange(item.n, 'N/A')} className={`btn-toggle btn-toggle--na ${estados[item.n] === 'N/A' ? 'active' : ''}`}>N/A</button>
                              </div>
                              {mostrarLapiz && (
                                <button type="button" className="btn-edit-note" onClick={() => editarNotaEspecifica(item.n)} title="Editar observación específica">
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                            {tieneNotaEscrita && !panelAbierto[item.n] && (
                              <div className="specific-note-display">
                                <span className="specific-note-label">Nota:</span> {observacionesEspecificas[item.n]}
                              </div>
                            )}
                          </td>
                        </tr>
                        {estados[item.n] === 'N/A' && panelAbierto[item.n] && (
                          <tr className="row-expanded-note">
                            <td colSpan="4">
                              <div className="specific-note-box">
                                <textarea
                                  placeholder="Describa aquí observaciones específicas del área..."
                                  value={observacionesEspecificas[item.n] || ''}
                                  onChange={(e) => handleNotaChange(item.n, e.target.value)}
                                  className="specific-note-textarea"
                                  rows="3"
                                />
                                <div className="specific-note-actions">
                                  <button type="button" className="btn-save-note" onClick={() => guardarNotaEspecifica(item.n)}>Guardar</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-card">
            <h3 className="observaciones-title">Observaciones Generales</h3>
            <textarea placeholder="Describa aquí cualquier observación adicional sobre el estado de la unidad..." value={observacionesGenerales} onChange={(e) => setObservacionesGenerales(e.target.value)} className="observaciones-textarea" rows="4" />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(`/transporte/${tipoTransporte}`)} className="btn-action btn-action--cancelar">Cancelar</button>
            <button type="submit" className="btn-action btn-action--enviar">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Enviar Reporte (Descargar PDF)
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}