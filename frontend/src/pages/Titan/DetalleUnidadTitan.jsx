import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import '../CentroControl/CentroControl.css';
import './Titan.css'; // New CSS file for specific Titan forms
import IOSTimePicker from '../Unidades/componentsdetalleunidad/IOSTimePicker';

const DetalleUnidadTitan = ({ model, preselectedUnidad, onCancel, onSuccess }) => {
  const [unidades, setUnidades] = useState(model?.units || []);
  const [selectedUnidad, setSelectedUnidad] = useState(null);
  
  // General Form State
  const [intervalo, setIntervalo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState([]);
  const [previewFotos, setPreviewFotos] = useState([]);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState(''); // 'DESINCORPORACION', 'INCORPORACION', 'ACCIDENTE'
  
  // Event Specific State
  const [corrida, setCorrida] = useState('');
  const [horaEvento, setHoraEvento] = useState('');
  const [dropdownHoraOpen, setDropdownHoraOpen] = useState(false);
  const [ubicacionGPS, setUbicacionGPS] = useState('');
  const [motivoDesincorporacion, setMotivoDesincorporacion] = useState('');
  
  const [accDueno, setAccDueno] = useState('');
  const [accVehiculo, setAccVehiculo] = useState('');
  const [accPlacas, setAccPlacas] = useState('');
  const [accSeguro, setAccSeguro] = useState(false);
  const [accHechos, setAccHechos] = useState('');

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (preselectedUnidad && (!selectedUnidad || selectedUnidad.id !== preselectedUnidad.id)) {
      handleSelectUnidad(preselectedUnidad);
    }
  }, [preselectedUnidad]);

  const handleSelectUnidad = (u) => {
    setSelectedUnidad(u);
    setCorrida(u.corrida || '');
    setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    
    // Clear other states
    setIntervalo('');
    setObservaciones('');
    setFotos([]);
    setPreviewFotos([]);
    setActiveTab('');
    getGPSLocation(); // Automatically get location
    setMotivoDesincorporacion('');
    setAccDueno('');
    setAccVehiculo('');
    setAccPlacas('');
    setAccSeguro(false);
    setAccHechos('');
    setUbicacionGPS('');
  };

  const getGPSLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data && data.display_name) {
              setUbicacionGPS(data.display_name);
            } else {
              setUbicacionGPS(`${lat}, ${lon}`);
            }
          } catch (error) {
            console.error("Error reverse geocoding:", error);
            setUbicacionGPS(`${lat}, ${lon}`);
          }
        },
        (error) => {
          Swal.fire('Error', 'No se pudo obtener la ubicación GPS. Verifica los permisos del navegador.', 'error');
        }
      );
    } else {
      Swal.fire('Error', 'La geolocalización no es soportada por este navegador.', 'error');
    }
  };

  const handleFotoChange = (e) => {
    const maxFotos = activeTab === 'ACCIDENTE' ? 10 : 5;
    const files = Array.from(e.target.files);
    
    if (fotos.length + files.length > maxFotos) {
      Swal.fire('Atención', `Solo puedes subir un máximo de ${maxFotos} fotos para este tipo de reporte.`, 'warning');
      return;
    }

    const newFotos = [...fotos, ...files];
    setFotos(newFotos);

    // Generar previews
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviewFotos([...previewFotos, ...newPreviews]);
  };

  const removeFoto = (index) => {
    const newFotos = fotos.filter((_, i) => i !== index);
    const newPreviews = previewFotos.filter((_, i) => i !== index);
    setFotos(newFotos);
    setPreviewFotos(newPreviews);
  };

  const handleSubmit = async () => {
    if (!selectedUnidad) return;

    if (!activeTab) {
      Swal.fire('Atención', 'Debes seleccionar un tipo de reporte (Desincorporación, Incorporación o Accidente).', 'warning');
      return;
    }

    if (activeTab === 'DESINCORPORACION' && !motivoDesincorporacion.trim()) {
      Swal.fire('Atención', 'El motivo de desincorporación es requerido.', 'warning');
      return;
    }

    setGuardando(true);

    try {
      const formData = new FormData();
      formData.append('unidad_id', selectedUnidad.id);
      formData.append('intervalo', intervalo);
      formData.append('observaciones', observaciones);
      formData.append('tipo_evento', activeTab);
      
      if (activeTab === 'DESINCORPORACION' || activeTab === 'INCORPORACION') {
        formData.append('corrida', corrida);
        formData.append('hora_evento', horaEvento);
        formData.append('ubicacion_gps', ubicacionGPS);
        if (activeTab === 'DESINCORPORACION') formData.append('motivo_desincorporacion', motivoDesincorporacion);
      }

      if (activeTab === 'ACCIDENTE') {
        formData.append('accidente_dueno', accDueno);
        formData.append('accidente_vehiculo', accVehiculo);
        formData.append('accidente_placas', accPlacas);
        formData.append('accidente_seguro', accSeguro);
        formData.append('accidente_hechos', accHechos);
        formData.append('ubicacion_gps', ubicacionGPS);
        formData.append('hora_evento', horaEvento); // ⬅️ CAMPO DE HORA AGREGADO PARA ACCIDENTE
      }

      fotos.forEach((foto, index) => {
        formData.append(`fotos[${index}]`, foto);
      });

      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const response = await fetch(`${API_BASE}/api/titan/reporte`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el reporte');
      }

      Swal.fire({
        icon: 'success',
        title: '¡Reporte Guardado!',
        text: 'La información se ha registrado correctamente.',
        confirmButtonColor: '#601a2a',
      }).then(() => {
        if (onSuccess) onSuccess();
      });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px', width: '100%' }}>
      {!selectedUnidad ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2 className="titan-subtitle">Cargando datos de la unidad...</h2>
          <p style={{ color: 'var(--tw-color-gray-500)' }}>Si la pantalla no carga, por favor intenta seleccionar nuevamente.</p>
        </div>
      ) : (
        <div className="titan-form-container">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button className="titan-btn-cancel" onClick={onCancel}>
              <svg className="titan-btn-cancel-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
              </svg>
              Contraer Formulario
            </button>
          </div>

          {/* Header guinda de la unidad */}
          <div className="titan-header-info">
            <div>
              <h3>Unidad {selectedUnidad.numero_economico}</h3>
              <div className="titan-info-grid">
                <p>
                  <strong>Ruta</strong>
                  <span>{selectedUnidad.ruta || 'N/A'}</span>
                </p>
                <p>
                  <strong>Tarjetón</strong>
                  <span>{selectedUnidad.numero_tarjeton || 'N/A'}</span>
                </p>
                <p>
                  <strong>Conductor</strong>
                  <span>{selectedUnidad.nombre_conductor || 'N/A'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Información General */}
          <div className="titan-section">
            <h4>Información General</h4>
            <div className="form-group">
              <label>Intervalo</label>
              <input type="text" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} placeholder="Ej. 10 min" />
            </div>
            <div className="form-group">
              <label>Observaciones</label>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows="3" placeholder="Detalles de supervisión..."></textarea>
            </div>
          </div>

          {/* Tabs de eventos */}
          <div className="titan-tabs">
            <button 
              className={`titan-tab ${activeTab === 'DESINCORPORACION' ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab('DESINCORPORACION');
                // Si se desea mantener la hora actual al cambiar a esta pestaña, se puede hacer igual
              }}
            >
              Desincorporación
            </button>
            <button 
              className={`titan-tab ${activeTab === 'INCORPORACION' ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab('INCORPORACION');
              }}
            >
              Incorporación
            </button>
            <button 
              className={`titan-tab ${activeTab === 'ACCIDENTE' ? 'active' : ''}`} 
              onClick={() => {
                setActiveTab('ACCIDENTE');
                // Actualizar hora al momento de abrir la pestaña de accidente
                setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
              }}
            >
              Accidente
            </button>
          </div>

          {activeTab && (
            <div className="titan-section active-tab-content">
              {(activeTab === 'DESINCORPORACION' || activeTab === 'INCORPORACION') && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Corrida</label>
                      <input type="text" value={corrida} onChange={(e) => setCorrida(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Hora</label>
                      <button
                        type="button"
                        onClick={() => setDropdownHoraOpen(!dropdownHoraOpen)}
                        className="form-group-time-trigger"
                      >
                        <span>{horaEvento || '--:--'}</span>
                        <svg style={{ width: '12px', height: '12px', transform: dropdownHoraOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--brand-maroon-text)' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                        </svg>
                      </button>
                      
                      {dropdownHoraOpen && (
                        <>
                          <div 
                            style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                            onClick={() => setDropdownHoraOpen(false)}
                          />
                          <IOSTimePicker 
                            value={horaEvento} 
                            onChange={setHoraEvento} 
                            onClose={() => setDropdownHoraOpen(false)}
                            onSave={() => setDropdownHoraOpen(false)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Ubicación</label>
                    <input type="text" value={ubicacionGPS} readOnly placeholder="Obteniendo coordenadas automáticamente..." />
                  </div>

                  {activeTab === 'DESINCORPORACION' && (
                    <div className="form-group">
                      <label>Motivo <span style={{color: 'var(--state-red-text, #dc2626)'}}>*</span></label>
                      <textarea value={motivoDesincorporacion} onChange={(e) => setMotivoDesincorporacion(e.target.value)} rows="4" placeholder="Describe el motivo de la desincorporación..."></textarea>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'ACCIDENTE' && (
                <>
                  <div className="form-group">
                    <label>Dueño del Particular</label>
                    <input type="text" value={accDueno} onChange={(e) => setAccDueno(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Vehículo Particular</label>
                    <input type="text" value={accVehiculo} onChange={(e) => setAccVehiculo(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Placas</label>
                    <input type="text" value={accPlacas} onChange={(e) => setAccPlacas(e.target.value)} />
                  </div>
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" checked={accSeguro} onChange={(e) => setAccSeguro(e.target.checked)} />
                      ¿Cuenta con seguro?
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Hechos <span style={{color: 'var(--state-red-text, #dc2626)'}}>*</span></label>
                    <textarea value={accHechos} onChange={(e) => setAccHechos(e.target.value)} rows="6" placeholder="Describe a detalle los hechos ocurridos..."></textarea>
                  </div>

                  {/* ⬇️ NUEVO CAMPO DE HORA PARA ACCIDENTE */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Hora del accidente</label>
                    <button
                      type="button"
                      onClick={() => setDropdownHoraOpen(!dropdownHoraOpen)}
                      className="form-group-time-trigger"
                    >
                      <span>{horaEvento || '--:--'}</span>
                      <svg style={{ width: '12px', height: '12px', transform: dropdownHoraOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--brand-maroon-text)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                      </svg>
                    </button>

                    {dropdownHoraOpen && (
                      <>
                        <div 
                          style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                          onClick={() => setDropdownHoraOpen(false)}
                        />
                        <IOSTimePicker 
                          value={horaEvento} 
                          onChange={setHoraEvento} 
                          onClose={() => setDropdownHoraOpen(false)}
                          onSave={() => setDropdownHoraOpen(false)}
                        />
                      </>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Ubicación</label>
                    <input type="text" value={ubicacionGPS} readOnly placeholder="Obteniendo coordenadas automáticamente..." />
                  </div>
                </>
              )}

              {/* Evidencia fotográfica */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Evidencia Fotográfica (Máx. {activeTab === 'ACCIDENTE' ? 10 : 5})</label>
                
                <label className="titan-file-upload">
                  <input type="file" multiple accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                  </svg>
                  <span>Haz clic aquí para seleccionar imágenes</span>
                </label>
                
                <div className="titan-fotos-preview">
                  {previewFotos.map((src, idx) => (
                    <div key={idx} className="titan-foto-item">
                      <img src={src} alt="Preview" />
                      <button 
                        type="button" 
                        className="titan-foto-item__remove"
                        onClick={() => removeFoto(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón Reportar */}
              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="centro-btn centro-btn--primary" 
                  onClick={handleSubmit} 
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Reportar Evento'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetalleUnidadTitan;