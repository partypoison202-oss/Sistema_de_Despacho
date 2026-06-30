// src/pages/Encierro/FormularioEncierro.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { generarPDFEncierro } from '../../utils/pdfGeneratorEncierro';
import { limpiarTexto } from '../../utils/limpiarTexto';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import '../Unidades/FormularioReporte.css';

// ─── Componentes interiores (aplican a TODAS las zonas) ───────────────────────
const COMPONENTES_INTERIORES = [
  { n: 'i1', area: 'Limpieza',           desc: 'Limpieza general del interior y exterior' },
  { n: 'i2', area: 'Asientos',           desc: 'Verificar el estado del asiento (fijación, desgaste, limpieza)' },
  { n: 'i3', area: 'Extintor y seguridad', desc: 'Verificar existencia y vigencia del extintor y equipo de seguridad' },
  { n: 'i4', area: 'Documentación',      desc: 'Revisar documentación de la unidad (tarjeta de circulación, Póliza de seguro)' },
  { n: 'i5', area: 'Tecnología',         desc: 'Verificar funcionamiento del monitor (Unidad Urbanuss), cámaras, pantallas y bocinas' },
  { n: 'i6', area: 'Alerta en tablero',  desc: 'Verificar qué tipo de alerta está prendida en el tablero' },
];

// ─── Componentes exteriores por zona ─────────────────────────────────────────
const COMPONENTES_POR_ZONA = {
  'Frente': [
    { n: 1,  area: 'Carrocería exterior',    desc: 'Revisar estado general de la carrocería (golpes y abolladuras)' },
    { n: 2,  area: 'Mobitec',               desc: 'Verificar que prenda, funcione correctamente y no esté dañado' },
    { n: 3,  area: 'Torreta',               desc: 'Verificar que prenda, funcione correctamente y no esté dañado' },
    { n: 4,  area: 'Pintura y vinil',       desc: 'Verificar estado de pintura y vinil (desgaste, rayones, desprendimiento)' },
    { n: 5,  area: 'Parabrisas y cristales', desc: 'Revisar limpieza, fisuras o daños en parabrisas y ventanas' },
    { n: 6,  area: 'Luces exteriores',      desc: 'Verificar funcionamiento de faros, direccionales, luces traseras y de frenos' },
    { n: 7,  area: 'Puertas',               desc: 'Revisar apertura, cierre y funcionamiento correcto' },
    { n: 8,  area: 'Llantas',               desc: 'Verificar presión, desgaste y estado general de las llantas' },
    { n: 9,  area: 'Rines',                 desc: 'Revisar estado de rines (golpes, fisuras, corrosión)' },
    { n: 10, area: 'Retrovisores',          desc: 'Verificar estado, limpieza y ajuste de retrovisores' },
  ],
  'Parte Trasera': [
    { n: 1,  area: 'Carrocería exterior',    desc: 'Revisar estado general de la carrocería (golpes y abolladuras)' },
    { n: 2,  area: 'Pintura y vinil',       desc: 'Verificar estado de pintura y vinil (desgaste, rayones, desprendimiento)' },
    { n: 3,  area: 'Parabrisas y cristales', desc: 'Revisar limpieza, fisuras o daños en luna trasera y ventanas' },
    { n: 4,  area: 'Luces exteriores',      desc: 'Verificar funcionamiento de luces traseras, stop y direccionales' },
    { n: 5,  area: 'Puertas',               desc: 'Revisar apertura, cierre y funcionamiento de puerta trasera' },
    { n: 6,  area: 'Llantas',               desc: 'Verificar presión, desgaste y estado general de las llantas traseras' },
    { n: 7,  area: 'Rines',                 desc: 'Revisar estado de rines traseros (golpes, fisuras, corrosión)' },
  ],
  'Costado Izquierdo': [
    { n: 1,  area: 'Carrocería exterior',    desc: 'Revisar estado general de la carrocería (golpes y abolladuras)' },
    { n: 2,  area: 'Pintura y vinil',       desc: 'Verificar estado de pintura y vinil (desgaste, rayones, desprendimiento)' },
    { n: 3,  area: 'Parabrisas y cristales', desc: 'Revisar limpieza, fisuras o daños en ventanas laterales izquierdas' },
    { n: 4,  area: 'Luces exteriores',      desc: 'Verificar funcionamiento de luces y direccionales del costado izquierdo' },
    { n: 5,  area: 'Puertas',               desc: 'Revisar apertura, cierre y funcionamiento de puertas del lado izquierdo' },
    { n: 6,  area: 'Llantas',               desc: 'Verificar presión, desgaste y estado de las llantas izquierdas' },
    { n: 7,  area: 'Rines',                 desc: 'Revisar estado de rines izquierdos (golpes, fisuras, corrosión)' },
    { n: 8,  area: 'Retrovisores',          desc: 'Verificar estado, limpieza y ajuste del retrovisor izquierdo' },
  ],
  'Costado Derecho': [
    { n: 1,  area: 'Carrocería exterior',    desc: 'Revisar estado general de la carrocería (golpes y abolladuras)' },
    { n: 2,  area: 'Pintura y vinil',       desc: 'Verificar estado de pintura y vinil (desgaste, rayones, desprendimiento)' },
    { n: 3,  area: 'Parabrisas y cristales', desc: 'Revisar limpieza, fisuras o daños en ventanas laterales derechas' },
    { n: 4,  area: 'Luces exteriores',      desc: 'Verificar funcionamiento de luces y direccionales del costado derecho' },
    { n: 5,  area: 'Puertas',               desc: 'Revisar apertura, cierre y funcionamiento de puertas del lado derecho' },
    { n: 6,  area: 'Llantas',               desc: 'Verificar presión, desgaste y estado de las llantas derechas' },
    { n: 7,  area: 'Rines',                 desc: 'Revisar estado de rines derechos (golpes, fisuras, corrosión)' },
  ],
};

export default function FormularioEncierro() {
  const { tipoTransporte, unidadEco, zona } = useParams();
  const navigate = useNavigate();

  const zonaFormateada     = zona ? zona.replace('-', ' ') : '';
  const transporteFormateado = tipoTransporte ? tipoTransporte.toUpperCase() : '';

  const [fechaVisual] = useState(() => new Date().toLocaleString());
  const [fechaISO]    = useState(() => new Date().toISOString());

  // Armar la lista final de componentes: exteriores de la zona + interiores
  const exteriorZona    = COMPONENTES_POR_ZONA[zonaFormateada] || [];
  const componentesEvaluacion = [
    ...exteriorZona,
    ...COMPONENTES_INTERIORES,
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

    generarPDFEncierro({
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
      tipo_formulario: 'ENCIERRO',
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
    console.log('Datos de encierro (para backend):', payload);

    Swal.fire({
      icon: 'success',
      title: '¡Reporte de Encierro Generado!',
      text: 'El PDF se ha generado y descargado exitosamente.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    navigate(`/encierro/transporte/${tipoTransporte}`);
  };

  return (
    <div className="report-layout">
      <Header
        title={`Encierro — ${zonaFormateada}`}
        eyebrow={`${transporteFormateado} / ${unidadEco} / ENCIERRO`}
        hideLogos={true}
      />

      <main className="report-container">
        <form onSubmit={handleEnviar}>
          {/* ── Datos Generales ── */}
          <div className="form-card form-card--grid">
            <div className="input-group">
              <label className="input-group__label">RESPONSABLE</label>
              <input
                type="text"
                placeholder="Nombre del responsable"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                required
                className="input-group__field"
              />
            </div>
            <div className="input-group">
              <label className="input-group__label">KILOMETRAJE ACTUAL</label>
              <input
                type="text"
                placeholder="Ej. 48250"
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value)}
                required
                className="input-group__field"
              />
            </div>
            <div className="input-group">
              <label className="input-group__label">FECHA Y HORA</label>
              <input
                type="text"
                value={fechaVisual}
                disabled
                className="input-group__field input-group__field--disabled"
              />
            </div>
          </div>

          {/* ── Sección: Componentes Exteriores ── */}
          {exteriorZona.length > 0 && (
            <div className="form-card form-card--no-padding">
              <table className="checklist-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th colSpan="4" style={{ backgroundColor: '#4a1520', textAlign: 'left', fontSize: '11px', letterSpacing: '0.06em' }}>
                      EXTERIOR — {zonaFormateada.toUpperCase()}
                    </th>
                  </tr>
                  <tr>
                    <th style={{ width: '5%' }}>N°</th>
                    <th style={{ width: '25%' }}>ÁREA/COMPONENTE</th>
                    <th style={{ width: '40%' }}>DESCRIPCIÓN A EVALUAR</th>
                    <th style={{ width: '30%', textAlign: 'center' }}>ESTADO / OBSERVACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {exteriorZona.map((item) => {
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
          )}

          {/* ── Sección: Componentes Interiores ── */}
          <div className="form-card form-card--no-padding">
            <table className="checklist-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th colSpan="4" style={{ backgroundColor: '#2d4a2d', textAlign: 'left', fontSize: '11px', letterSpacing: '0.06em' }}>
                    INTERIOR — TODAS LAS ZONAS
                  </th>
                </tr>
                <tr>
                  <th style={{ width: '5%' }}>N°</th>
                  <th style={{ width: '25%' }}>ÁREA/COMPONENTE</th>
                  <th style={{ width: '40%' }}>DESCRIPCIÓN A EVALUAR</th>
                  <th style={{ width: '30%', textAlign: 'center' }}>ESTADO / OBSERVACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENTES_INTERIORES.map((item) => {
                  const tieneNotaEscrita = observacionesEspecificas[item.n] && observacionesEspecificas[item.n].trim() !== '';
                  const mostrarLapiz = estados[item.n] === 'N/A' && tieneNotaEscrita && !panelAbierto[item.n];

                  return (
                    <React.Fragment key={item.n}>
                      <tr>
                        <td className="text-center font-bold" style={{ color: '#2d4a2d' }}>
                          {item.n.replace('i', '')}
                        </td>
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

          {/* ── Observaciones Generales ── */}
          <div className="form-card">
            <h3 className="observaciones-title">Observaciones Generales</h3>
            <textarea
              placeholder="Describa aquí cualquier observación adicional sobre el estado de la unidad..."
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              className="observaciones-textarea"
              rows="4"
            />
          </div>

          {/* ── Botones de Acción ── */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(`/encierro/transporte/${tipoTransporte}`)}
              className="btn-action btn-action--cancelar"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-action btn-action--enviar">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Enviar Encierro (Descargar PDF)
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
