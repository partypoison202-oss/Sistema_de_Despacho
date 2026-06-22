// src/components/FormularioReporte.js
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generarPDFProfesional } from '../../utils/pdfGenerator';
import { limpiarTexto } from '../../utils/limpiarTexto';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
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

  const handleEstadoChange = (id, valor) => {
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

  const handleEnviar = (e) => {
    e.preventDefault();

    if (!responsable || !kilometraje || Object.keys(estados).length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos obligatorios y al menos un estado de evaluación.',
        confirmButtonColor: '#601a2a'
      });
      return;
    }

    // Llamar a la función separada para generar el PDF
    generarPDFProfesional({
      responsable,
      kilometraje,
      zonaFormateada,
      unidadEco,
      transporteFormateado,
      fechaVisual,
      estados,
      observacionesEspecificas,
      observacionesGenerales,
      componentesEvaluacion,
    });

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

    Swal.fire({
      icon: 'success',
      title: '¡Reporte Generado!',
      text: 'El PDF se ha generado y descargado exitosamente.',
      confirmButtonColor: '#c5a059'
    }).then(() => {
      navigate(`/transporte/${tipoTransporte}`);
    });
  };

  // ... el resto del JSX es idéntico, solo cambia la importación y la llamada
  return (
    <div className="report-layout">
      <Header 
        title={`Check List — ${zonaFormateada}`} 
        eyebrow={`${transporteFormateado} / ${unidadEco} / REPORTE`} 
        hideLogos={true} 
      />

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