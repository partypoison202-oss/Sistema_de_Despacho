import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './FormularioReporte.css';

export default function FormularioReporte() {
  const { tipoTransporte, unidadEco, zona } = useParams();
  const navigate = useNavigate();

  const zonaFormateada = zona ? zona.replace('-', ' ') : '';
  const transporteFormateado = tipoTransporte ? tipoTransporte.toUpperCase() : '';

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

  // Estados principales
  const [responsable, setResponsable] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [estados, setEstados] = useState({});

  // 🚀 NUEVOS ESTADOS: Para las observaciones por componente
  const [observacionesEspecificas, setObservacionesEspecificas] = useState({}); // { 1: "Texto", 2: "" }
  const [panelAbierto, setPanelAbierto] = useState({}); // { 1: true, 2: false } -> Controla si se muestra el textarea

  const handleEstadoChange = (id, valor) => {
    setEstados({ ...estados, [id]: valor });
    
    // Si eligen 'N/A', abrimos automáticamente el panel para forzar/sugerir la nota 📝
    if (valor === 'N/A') {
      setPanelAbierto({ ...panelAbierto, [id]: true });
    } else {
      // Si cambian a OK o NO OK, y no hay texto escrito, cerramos por limpieza
      if (!observacionesEspecificas[id]) {
        setPanelAbierto({ ...panelAbierto, [id]: false });
      }
    }
  };

  const handleNotaChange = (id, texto) => {
    setObservacionesEspecificas({ ...observacionesEspecificas, [id]: texto });
  };

  const guardarNotaEspecifica = (id) => {
    // Cierra el panel al dar clic en "Guardar" para ahorrar espacio 🔒
    setPanelAbierto({ ...panelAbierto, [id]: false });
  };

  const editarNotaEspecifica = (id) => {
    // Vuelve a abrir el panel con el botón del lápiz ✏️
    setPanelAbierto({ ...panelAbierto, [id]: true });
  };

  const handleEnviar = (e) => {
    e.preventDefault();
    
    const payload = {
      transporte: tipoTransporte,
      unidad: unidadEco,
      zona: zonaFormateada,
      responsable,
      kilometraje,
      fechaHora: new Date().toLocaleString(),
      evaluacion: estados,
      observacionesEspecificas, // Se van las notas de cada renglón
      observacionesGenerales
    };
    
    console.log("Generando reporte con la información...", payload);
    alert("Reporte guardado exitosamente");
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
              <input type="text" value="09/06/2026 07:35 p. m." disabled className="input-group__field input-group__field--disabled" />
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
                    <th style={{ width: '30%', textAlign: 'center' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {componentesEvaluacion.map((item) => {
                    const tieneNotaEscrita = observacionesEspecificas[item.n] && observacionesEspecificas[item.n].trim() !== '';
                    const mostrarLapiz = estados[item.n] === 'N/A' && tieneNotaEscrita && !panelAbierto[item.n];

                    return (
                      <React.Fragment key={item.n}>
                        {/* Fila Estándar */}
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

                              {/* Botón Lápiz de Edición ✏️ (Solo aparece al guardar y si hay contenido) */}
                              {mostrarLapiz && (
                                <button type="button" className="btn-edit-note" onClick={() => editarNotaEspecifica(item.n)} title="Editar observación específica">
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Fila Desplegable de Observaciones Específicas 📉 */}
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
                                ></textarea>
                                <div className="specific-note-actions">
                                  <button type="button" className="btn-save-note" onClick={() => guardarNotaEspecifica(item.n)}>
                                    Guardar
                                  </button>
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
            <textarea placeholder="Describa aquí cualquier observación adicional sobre el estado de la unidad..." value={observacionesGenerales} onChange={(e) => setObservacionesGenerales(e.target.value)} className="observaciones-textarea" rows="4"></textarea>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(`/transporte/${tipoTransporte}`)} className="btn-action btn-action--cancelar">Cancelar</button>
            <button type="submit" className="btn-action btn-action--enviar">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Enviar Reporte
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}