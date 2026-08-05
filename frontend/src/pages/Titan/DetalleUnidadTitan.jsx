import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import '../CentroControl/CentroControl.css';
import './Titan.css';
import IOSTimePicker from '../Unidades/componentsdetalleunidad/IOSTimePicker';

const DetalleUnidadTitan = ({ model, preselectedUnidad, onCancel, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [unidades, setUnidades] = useState(model?.units || []);
  const [selectedUnidad, setSelectedUnidad] = useState(null);

  // General Form State
  const [intervalo, setIntervalo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState([]);
  const [previewFotos, setPreviewFotos] = useState([]);

  // Tabs State
  const [activeTab, setActiveTab] = useState('');
  const ACCIDENT_TYPES = ['ACCIDENTE', 'CHOQUE', 'ATROPELLADO', 'CODIGO_AMBAR', 'CODIGO_ROJO'];

  // Event Specific State
  const [corrida, setCorrida] = useState('');
  const [horaEvento, setHoraEvento] = useState('');
  const [dropdownHoraOpen, setDropdownHoraOpen] = useState(false);
  const [ubicacionGPS, setUbicacionGPS] = useState('');
  const [ubicacionEvento, setUbicacionEvento] = useState('');
  const [motivoDesincorporacion, setMotivoDesincorporacion] = useState('');

  const [accDueno, setAccDueno] = useState('');
  const [accVehiculo, setAccVehiculo] = useState('');
  const [accPlacas, setAccPlacas] = useState('');
  const [accSeguro, setAccSeguro] = useState(false);
  const [accHechos, setAccHechos] = useState('');

  // Firma del particular (canvas)
  const firmaCanvasRef = useRef(null);
  const firmaCtxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [firmaVacia, setFirmaVacia] = useState(true);

  const [guardando, setGuardando] = useState(false);

  // ---------- Funciones de firma (con useCallback para estabilidad) ----------
  const getFirmaCoords = useCallback((e) => {
    const canvas = firmaCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleFirmaStart = useCallback((e) => {
    e.preventDefault();
    const ctx = firmaCtxRef.current;
    if (!ctx) return;
    const { x, y } = getFirmaCoords(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getFirmaCoords]);

  const handleFirmaMove = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = firmaCtxRef.current;
    if (!ctx) return;
    const { x, y } = getFirmaCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (firmaVacia) setFirmaVacia(false);
  }, [getFirmaCoords, firmaVacia]);

  const handleFirmaEnd = useCallback((e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
  }, []);

  const initFirmaCanvas = useCallback(() => {
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 2 * ratio;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1f1f1f';
    firmaCtxRef.current = ctx;
  }, []);

  // Limpiar firma
  const limpiarFirma = useCallback(() => {
    const canvas = firmaCanvasRef.current;
    const ctx = firmaCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaVacia(true);
  }, []);

  // Obtener blob de la firma
  const getFirmaBlob = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = firmaCanvasRef.current;
      if (!canvas || firmaVacia) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, [firmaVacia]);

  // ---------- Effect para inicializar canvas y eventos táctiles ----------
  useEffect(() => {
    if (!ACCIDENT_TYPES.includes(activeTab)) return;

    const canvas = firmaCanvasRef.current;
    if (!canvas) return;

    initFirmaCanvas();

    canvas.addEventListener('touchstart', handleFirmaStart, { passive: false });
    canvas.addEventListener('touchmove', handleFirmaMove, { passive: false });
    canvas.addEventListener('touchend', handleFirmaEnd, { passive: false });

    const resizeObserver = new ResizeObserver(() => {
      initFirmaCanvas();
    });
    resizeObserver.observe(canvas);

    return () => {
      canvas.removeEventListener('touchstart', handleFirmaStart);
      canvas.removeEventListener('touchmove', handleFirmaMove);
      canvas.removeEventListener('touchend', handleFirmaEnd);
      resizeObserver.disconnect();
    };
  }, [activeTab, initFirmaCanvas, handleFirmaStart, handleFirmaMove, handleFirmaEnd]);

  // ---------- Resto del componente ----------
  useEffect(() => {
    if (preselectedUnidad && (!selectedUnidad || selectedUnidad.id !== preselectedUnidad.id)) {
      handleSelectUnidad(preselectedUnidad);
    }
  }, [preselectedUnidad]);

  const handleSelectUnidad = (u) => {
    setSelectedUnidad(u);
    setCorrida(u.corrida || '');
    setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    setIntervalo('');
    setObservaciones('');
    setFotos([]);
    setPreviewFotos([]);
    setActiveTab('');
    getGPSLocation();
    setMotivoDesincorporacion('');
    setAccDueno('');
    setAccVehiculo('');
    setAccPlacas('');
    setAccSeguro(false);
    setAccHechos('');
    setUbicacionGPS('');
    setFirmaVacia(true);
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
            console.error('Error reverse geocoding:', error);
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
    const maxFotos = ACCIDENT_TYPES.includes(activeTab) ? 10 : 5;
    const files = Array.from(e.target.files);

    if (fotos.length + files.length > maxFotos) {
      Swal.fire('Atención', `Solo puedes subir un máximo de ${maxFotos} fotos para este tipo de reporte.`, 'warning');
      return;
    }

    const newFotos = [...fotos, ...files];
    setFotos(newFotos);

    const newPreviews = files.map((f) => URL.createObjectURL(f));
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
      Swal.fire('Atención', 'Debes seleccionar un tipo de reporte válido.', 'warning');
      return;
    }

    if (activeTab === 'DESINCORPORACION' && !motivoDesincorporacion.trim()) {
      Swal.fire('Atención', 'El motivo de desincorporación es requerido.', 'warning');
      return;
    }

    if ((activeTab === 'DESINCORPORACION' || activeTab === 'INCORPORACION') && !ubicacionEvento) {
      Swal.fire('Atención', 'Debes seleccionar la ubicación del evento.', 'warning');
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
        formData.append('ubicacion_evento', ubicacionEvento);
        if (activeTab === 'DESINCORPORACION') formData.append('motivo_desincorporacion', motivoDesincorporacion);
      }

      if (ACCIDENT_TYPES.includes(activeTab)) {
        formData.append('accidente_dueno', accDueno);
        formData.append('accidente_vehiculo', accVehiculo);
        formData.append('accidente_placas', accPlacas);
        formData.append('accidente_seguro', accSeguro ? 'true' : 'false');
        formData.append('accidente_hechos', accHechos);
        formData.append('ubicacion_gps', ubicacionGPS);
        formData.append('hora_evento', horaEvento);

        const firmaBlob = await getFirmaBlob();
        if (firmaBlob) {
          formData.append('firma_particular', firmaBlob, 'firma_particular.png');
        }
      }

      // IMPORTANTE: usar 'fotos[]' (no 'fotos[0]', 'fotos[1]'...) para que
      // Laravel arme correctamente el array y la validación 'fotos.*' funcione.
      fotos.forEach((foto) => {
        formData.append('fotos[]', foto);
      });

      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const response = await fetch(`${API_BASE}/api/titan/reporte`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
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

          {/* Saludo y ubicación del Titan */}
          <div
            className="titan-saludo-wrapper"
            style={{
              marginBottom: '16px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #601a2a 0%, #7a2439 100%)',
              boxShadow: '0 2px 8px rgba(96, 26, 42, 0.25)',
            }}
          >
            <p
              className="titan-saludo-texto"
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: '17px',
                color: '#ffffff',
                letterSpacing: '0.2px',
              }}
            >
              Hola, {user?.nombre_completo || 'Usuario'} 
            </p>
            <div
              className="titan-saludo-ubicacion"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f0d9de"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#f0d9de',
                  lineHeight: 1.4,
                }}
              >
                {ubicacionGPS || 'Obteniendo ubicación...'}
              </p>
            </div>
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
          <div className="titan-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              className={`titan-tab ${activeTab === 'DESINCORPORACION' ? 'active' : ''}`}
              onClick={() => setActiveTab('DESINCORPORACION')}
            >
              Desincorporación
            </button>
            <button
              className={`titan-tab ${activeTab === 'INCORPORACION' ? 'active' : ''}`}
              onClick={() => setActiveTab('INCORPORACION')}
            >
              Incorporación
            </button>
            <button
              className={`titan-tab ${activeTab === 'ACCIDENTE' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('ACCIDENTE');
                setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
              }}
            >
              Accidente
            </button>
            <button
              className={`titan-tab ${activeTab === 'CHOQUE' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('CHOQUE');
                setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
              }}
            >
              Choque
            </button>
            <button
              className={`titan-tab ${activeTab === 'ATROPELLADO' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('ATROPELLADO');
                setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
              }}
            >
              Atropellado
            </button>
            <button
              className={`titan-tab ${activeTab === 'CODIGO_AMBAR' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('CODIGO_AMBAR');
                setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
              }}
            >
              Código Ámbar
            </button>
            <button
              className={`titan-tab ${activeTab === 'CODIGO_ROJO' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('CODIGO_ROJO');
                setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
              }}
            >
              Código Rojo
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
                    <label>Ubicación <span style={{ color: 'var(--state-red-text, #dc2626)' }}>*</span></label>
                    <select
                      value={ubicacionEvento}
                      onChange={(e) => setUbicacionEvento(e.target.value)}
                      className="form-group-select"
                    >
                      <option value="">Selecciona una ubicación...</option>
                      {opcionesUbicacionEvento.map((opcion) => (
                        <option key={opcion} value={opcion}>{opcion}</option>
                      ))}
                    </select>
                  </div>

                  {activeTab === 'DESINCORPORACION' && (
                    <div className="form-group">
                      <label>Motivo <span style={{ color: 'var(--state-red-text, #dc2626)' }}>*</span></label>
                      <textarea value={motivoDesincorporacion} onChange={(e) => setMotivoDesincorporacion(e.target.value)} rows="4" placeholder="Describe el motivo de la desincorporación..."></textarea>
                    </div>
                  )}
                </>
              )}

              {ACCIDENT_TYPES.includes(activeTab) && (
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
                    <label>Hechos <span style={{ color: 'var(--state-red-text, #dc2626)' }}>*</span></label>
                    <textarea value={accHechos} onChange={(e) => setAccHechos(e.target.value)} rows="6" placeholder="Describe a detalle los hechos ocurridos..."></textarea>
                  </div>

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
                    <label>Firma de particular</label>
                    <div
                      className="titan-firma-wrapper"
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '180px',
                        border: '2px dashed var(--brand-maroon-text, #601a2a)',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        overflow: 'hidden',
                      }}
                    >
                      <canvas
                        ref={firmaCanvasRef}
                        className="titan-firma-canvas"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'block',
                          cursor: 'crosshair',
                          touchAction: 'none',
                        }}
                        onMouseDown={handleFirmaStart}
                        onMouseMove={handleFirmaMove}
                        onMouseUp={handleFirmaEnd}
                        onMouseLeave={handleFirmaEnd}
                      />
                      {firmaVacia && (
                        <span
                          className="titan-firma-placeholder"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#9ca3af',
                            fontSize: '14px',
                            pointerEvents: 'none',
                            userSelect: 'none',
                          }}
                        >
                          Firma aquí con el dedo o el mouse
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="titan-btn-cancel"
                        onClick={limpiarFirma}
                      >
                        Limpiar firma
                      </button>
                    </div>
                  </div>

                  {/* FIRMA DE PARTICULAR */}
                  <div className="form-group">
                    <label>Firma de particular</label>
                    <div
                      className="titan-firma-wrapper"
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '180px',
                        border: '2px dashed var(--brand-maroon-text, #601a2a)',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        overflow: 'hidden',
                      }}
                    >
                      <canvas
                        ref={firmaCanvasRef}
                        className="titan-firma-canvas"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'block',
                          cursor: 'crosshair',
                          touchAction: 'none',
                        }}
                        onMouseDown={handleFirmaStart}
                        onMouseMove={handleFirmaMove}
                        onMouseUp={handleFirmaEnd}
                        onMouseLeave={handleFirmaEnd}
                      />
                      {firmaVacia && (
                        <span
                          className="titan-firma-placeholder"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#9ca3af',
                            fontSize: '14px',
                            pointerEvents: 'none',
                            userSelect: 'none',
                          }}
                        >
                          Firma aquí con el dedo o el mouse
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="titan-btn-cancel"
                        onClick={limpiarFirma}
                      >
                        Limpiar firma
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Evidencia fotográfica */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Evidencia Fotográfica (Máx. {ACCIDENT_TYPES.includes(activeTab) ? 10 : 5})</label>

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