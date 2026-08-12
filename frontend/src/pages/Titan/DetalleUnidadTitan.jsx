import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import './Titan.css';
import IOSTimePicker from '../Unidades/componentsdetalleunidad/IOSTimePicker';

/* ─────────────────────────────────────────────────────────────
   Constantes / catálogos
   ───────────────────────────────────────────────────────────── */
const ACCIDENT_TYPES   = ['ACCIDENTE', 'CHOQUE', 'ATROPELLADO', 'CODIGO_AMBAR', 'CODIGO_ROJO'];
const PERSONAL_TYPES   = ['ATROPELLADO', 'CODIGO_AMBAR', 'CODIGO_ROJO'];   // víctima personal
const CODIGO_MED       = ['CODIGO_AMBAR', 'CODIGO_ROJO'];                  // requieren campos médicos extendidos
const DESINC_INC       = ['DESINCORPORACION', 'INCORPORACION'];
const NARANJA_TYPES    = ['CODIGO_NARANJA'];

const GENDER_OPTIONS   = ['Masculino', 'Femenino', 'No binario', 'Prefiero no especificar'];
const UBI_OPTS         = ['TALLER', 'BASE SUR', 'BASE NORTE', 'VÍA PÚBLICA', 'OTRO'];
const AUTORIDADES      = [
  'POLICÍA ESTATAL', 'POLICÍA MUNICIPAL', 'POLICÍA VIOLETA', 'POLICÍA FEDERAL',
  'MINISTERIO PÚBLICO', 'OTRA',
];
const ASISTENCIA_OPTS  = ['AMBULANCIA', 'POLICÍA', 'BOMBEROS', 'PROTECCIÓN CIVIL', 'CRUZ ROJA'];
const ESTATUS_LEGAL    = ['CHOQUE', 'CORRALÓN', 'LIBERADO', 'EN PROCESO'];
const ESTACIONES       = [
  'TERMINAL NORTE', 'CENTRAL DE AUTOBUSES', 'MUNICIPIO LIBRE', 'ESTADIO HIDALGO',
  'MERCADO BENITO JUÁREZ', 'PLAZA DE LA PAZ', 'PRESIDENCIA MUNICIPAL',
  'UAEH - CIUDAD UNIVERSITARIA', 'HOSPITAL GENERAL', 'CLÍNICA IMSS',
  'PARQUE HIDALGO', 'TERMINAL SUR', 'OTRA',
];

/* ─────────────────────────────────────────────────────────────
   Componente principal
   ───────────────────────────────────────────────────────────── */
const DetalleUnidadTitan = ({ model, preselectedUnidad, onCancel, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ── Unidad ─────────────────────────────────── */
  const [selectedUnidad, setSelectedUnidad] = useState(null);

  /* ── Estado general ─────────────────────────── */
  const [activeTab,     setActiveTab]     = useState('');
  const [intervalo,     setIntervalo]     = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [ubicacionGPS,  setUbicacionGPS]  = useState('');
  const [horaEvento,    setHoraEvento]    = useState('');
  const [horaFinEvento, setHoraFinEvento] = useState('');
  const [dropdownHoraOpen, setDropdownHoraOpen] = useState(false);

  /* ── Desincorporación / Incorporación ───────── */
  const [corrida,               setCorrida]               = useState('');
  const [ubicacionEvento,       setUbicacionEvento]       = useState('');
  const [motivoDesincorporacion,setMotivoDesincorporacion]= useState('');

  /* ── Accidente / Choque (vehículo particular) ── */
  const [accDueno,   setAccDueno]   = useState('');
  const [accVehiculo,setAccVehiculo]= useState('');
  const [accPlacas,  setAccPlacas]  = useState('');
  const [accSeguro,  setAccSeguro]  = useState(false);

  /* ── Campos comunes: víctima + hechos ────────── */
  const [accVictima, setAccVictima] = useState('');
  const [accEdad,    setAccEdad]    = useState('');
  const [accGenero,  setAccGenero]  = useState('');
  const [accHechos,  setAccHechos]  = useState('');
  
  /* ── Campos extendidos de Accidentes (origin/main) ── */
  const [accHechoTipo, setAccHechoTipo] = useState('');
  const [accFavorDeQuien, setAccFavorDeQuien] = useState('');
  const [accCantidadesDinero, setAccCantidadesDinero] = useState('');
  const [accTipoChoque, setAccTipoChoque] = useState('');
  const [accApoyo, setAccApoyo] = useState('');
  const [accPaseMedicoPaciente, setAccPaseMedicoPaciente] = useState('');
  const [accPaseMedicoNumero, setAccPaseMedicoNumero] = useState('');
  const [accPaseMedicoObservaciones, setAccPaseMedicoObservaciones] = useState('');
  const [accHuboFallecidos, setAccHuboFallecidos] = useState('');
  const [accFallecidosCantidad, setAccFallecidosCantidad] = useState('1');
  const [accFallecidosNombres, setAccFallecidosNombres] = useState(['']);
  const [accHoraFallecimiento, setAccHoraFallecimiento] = useState('');
  const [accHoraAsistenciaCemefo, setAccHoraAsistenciaCemefo] = useState('');
  
  const ACCIDENT_HECHO_OPTIONS = ['CONVENIO', 'PAGO EN EFECTIVO', 'ORDEN REPARACION'];
  const TIPO_CHOQUE_OPTIONS = ['ALCANCE', 'CHOQUE FRONTAL', 'CHOQUE LATERAL', 'ROCE', 'CHOQUE MULTIPLE'];
  const APOYO_OPTIONS = ['SSV (SECRETARIA DE SEGURIDAD PUBLICA)', 'POLICIA ESTATAL', 'CRUZ ROJA', 'BOMBEROS', 'BOMBEROS VOLUNTARIOS', 'CLINICA', 'PASES MEDICOS'];

  const handleFallecidoNombreChange = useCallback((index, value) => {
    setAccFallecidosNombres((prev) => {
      const updated = Array.isArray(prev) ? [...prev] : [''];
      updated[index] = value;
      return updated;
    });
  }, []);

  /* ── Código Ámbar / Rojo — campos médicos ────── */
  const [lesionadosCantidad,   setLesionadosCantidad]   = useState('');
  const [nombresAfectados,     setNombresAfectados]     = useState('');
  const [asistenciaSitio,      setAsistenciaSitio]      = useState([]);  // array
  const [diagnosticoPreliminar,setDiagnosticoPreliminar]= useState('');
  const [ameritaTraslado,      setAmeritaTraslado]      = useState(null); // true | false | null
  const [estatusLegal,         setEstatusLegal]         = useState('');

  /* ── Código Naranja (Acoso) ──────────────────── */
  const [narNombre,           setNarNombre]           = useState('');
  const [narAnonimo,          setNarAnonimo]          = useState(false);
  const [narEdad,             setNarEdad]             = useState('');
  const [narGenero,           setNarGenero]           = useState('');
  const [narEstacion,         setNarEstacion]         = useState('');
  const [narRuta,             setNarRuta]             = useState('');
  const [narRelato,           setNarRelato]           = useState('');
  const [narAutoridad,        setNarAutoridad]        = useState('');
  const [narPuestoDisposicion,setNarPuestoDisposicion]= useState(null);
  const [narMotivo,           setNarMotivo]           = useState('');

  /* ── Fotos + Firma ───────────────────────────── */
  const [fotos,       setFotos]       = useState([]);
  const [previewFotos,setPreviewFotos]= useState([]);
  const firmaCanvasRef  = useRef(null);
  const firmaCtxRef     = useRef(null);
  const isDrawingRef    = useRef(false);
  const [firmaVacia, setFirmaVacia]   = useState(true);

  /* ── UI ──────────────────────────────────────── */
  const [guardando, setGuardando] = useState(false);

  /* ─── Firma helpers ─── */
  const getFirmaCoords = useCallback((e) => {
    const canvas = firmaCanvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const cx = e.touches?.length > 0 ? e.touches[0].clientX : e.clientX;
    const cy = e.touches?.length > 0 ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - rect.left) * (canvas.width  / rect.width),
      y: (cy - rect.top)  * (canvas.height / rect.height),
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
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width  = Math.round(rect.width  * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth   = 2 * ratio;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#1f1f1f';
    firmaCtxRef.current = ctx;
  }, []);

  const limpiarFirma = useCallback(() => {
    const canvas = firmaCanvasRef.current;
    const ctx    = firmaCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaVacia(true);
  }, []);

  const getFirmaBlob = useCallback(() => new Promise((resolve) => {
    const canvas = firmaCanvasRef.current;
    if (!canvas || firmaVacia) { resolve(null); return; }
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  }), [firmaVacia]);

  /* ─── Effect: canvas táctil ─── */
  const needsFirma = [...ACCIDENT_TYPES, ...NARANJA_TYPES].includes(activeTab);
  useEffect(() => {
    if (!needsFirma) return;
    const canvas = firmaCanvasRef.current;
    if (!canvas) return;
    initFirmaCanvas();
    canvas.addEventListener('touchstart', handleFirmaStart, { passive: false });
    canvas.addEventListener('touchmove',  handleFirmaMove,  { passive: false });
    canvas.addEventListener('touchend',   handleFirmaEnd,   { passive: false });
    const ro = new ResizeObserver(initFirmaCanvas);
    ro.observe(canvas);
    return () => {
      canvas.removeEventListener('touchstart', handleFirmaStart);
      canvas.removeEventListener('touchmove',  handleFirmaMove);
      canvas.removeEventListener('touchend',   handleFirmaEnd);
      ro.disconnect();
    };
  }, [activeTab, needsFirma, initFirmaCanvas, handleFirmaStart, handleFirmaMove, handleFirmaEnd]);

  /* ─── Preselect unidad ─── */
  useEffect(() => {
    if (preselectedUnidad && (!selectedUnidad || selectedUnidad.id !== preselectedUnidad.id)) {
      handleSelectUnidad(preselectedUnidad);
    }
  }, [preselectedUnidad]);

  const resetForm = () => {
    setIntervalo('');  setObservaciones(''); setFotos([]); setPreviewFotos([]);
    setActiveTab(''); setHoraEvento('');
    setCorrida(''); setUbicacionEvento(''); setMotivoDesincorporacion('');
    setAccDueno(''); setAccVehiculo(''); setAccPlacas(''); setAccSeguro(false);
    setAccVictima('');
    setAccEdad('');
    setAccGenero('');
    setAccHechos('');
    setUbicacionGPS('');
    setFirmaVacia(true);

    // Nuevos campos origin/main
    setAccHechoTipo('');
    setAccFavorDeQuien('');
    setAccCantidadesDinero('');
    setAccTipoChoque('');
    setAccApoyo('');
    setAccPaseMedicoPaciente('');
    setAccPaseMedicoNumero('');
    setAccPaseMedicoObservaciones('');
    setAccHuboFallecidos('');
    setAccFallecidosCantidad('1');
    setAccFallecidosNombres(['']);
    setAccHoraFallecimiento('');
    setAccHoraAsistenciaCemefo('');
    setLesionadosCantidad(''); setNombresAfectados('');
    setAsistenciaSitio([]); setDiagnosticoPreliminar('');
    setAmeritaTraslado(null); setEstatusLegal('');
    setNarNombre(''); setNarAnonimo(false); setNarEdad(''); setNarGenero('');
    setNarEstacion(''); setNarRuta(''); setNarRelato('');
    setNarAutoridad(''); setNarPuestoDisposicion(null); setNarMotivo('');
    setUbicacionGPS(''); setFirmaVacia(true);
  };

  const handleSelectUnidad = (u) => {
    setSelectedUnidad(u);
    setCorrida(u.corrida || '');
    setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    resetForm();
    getGPSLocation();
  };

  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      setUbicacionGPS('GPS no disponible en este navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latLng = `${coords.latitude},${coords.longitude}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
          const d = await r.json();
          setUbicacionGPS(d?.display_name ? `${d.display_name}|${latLng}` : latLng);
        } catch {
          setUbicacionGPS(latLng);
        }
      },
      () => setUbicacionGPS('No se pudo obtener ubicación GPS')
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if ([...ACCIDENT_TYPES, ...NARANJA_TYPES].includes(tab)) {
      setHoraEvento(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleFotoChange = (e) => {
    const maxFotos = 10;
    const files    = Array.from(e.target.files);
    if (fotos.length + files.length > maxFotos) {
      Swal.fire('Atención', `Máximo ${maxFotos} fotos por reporte.`, 'warning');
      return;
    }
    setFotos([...fotos, ...files]);
    setPreviewFotos([...previewFotos, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeFoto = (i) => {
    setFotos(fotos.filter((_, idx) => idx !== i));
    setPreviewFotos(previewFotos.filter((_, idx) => idx !== i));
  };

  const toggleAsistencia = (op) => {
    setAsistenciaSitio((prev) =>
      prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]
    );
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!selectedUnidad) return;
    if (!activeTab) { Swal.fire('Atención', 'Selecciona un tipo de reporte.', 'warning'); return; }

    if (activeTab === 'DESINCORPORACION' && !motivoDesincorporacion.trim()) {
      Swal.fire('Atención', 'El motivo de desincorporación es requerido.', 'warning'); return;
    }
    if (DESINC_INC.includes(activeTab) && !ubicacionEvento) {
      Swal.fire('Atención', 'Selecciona la ubicación del evento.', 'warning'); return;
    }
    if (NARANJA_TYPES.includes(activeTab)) {
      if (!narRelato.trim()) {
        Swal.fire('Atención', 'El relato de los hechos es requerido.', 'warning'); return;
      }
      if (narPuestoDisposicion === false && !narMotivo.trim()) {
        Swal.fire('Atención', 'El motivo de no puesta a disposición es requerido.', 'warning'); return;
      }
    }

    setGuardando(true);
    try {
      const fd = new FormData();
      fd.append('unidad_id',   selectedUnidad.id);
      fd.append('intervalo',   intervalo);
      fd.append('observaciones', observaciones);
      fd.append('tipo_evento', activeTab);
      fd.append('ubicacion_gps', ubicacionGPS);
      fd.append('hora_evento', horaEvento);

      if (DESINC_INC.includes(activeTab)) {
        fd.append('corrida',          corrida);
        fd.append('ubicacion_evento', ubicacionEvento);
        if (activeTab === 'DESINCORPORACION') fd.append('motivo_desincorporacion', motivoDesincorporacion);
      }

      if (ACCIDENT_TYPES.includes(activeTab)) {
        if (PERSONAL_TYPES.includes(activeTab)) {
          fd.append('accidente_dueno',  accVictima);
          fd.append('accidente_edad',   accEdad);
          fd.append('accidente_genero', accGenero);
        } else {
          fd.append('accidente_dueno',    accDueno);
          fd.append('accidente_vehiculo', accVehiculo);
          fd.append('accidente_placas',   accPlacas);
          fd.append('accidente_seguro',   accSeguro ? 'true' : 'false');
        }
        fd.append('accidente_hechos', accHechos);

        fd.append('accidente_hecho_tipo', accHechoTipo);
        fd.append('accidente_favor_de_quien', accFavorDeQuien);
        fd.append('accidente_cantidades_dinero', accCantidadesDinero);
        fd.append('accidente_tipo_choque', accTipoChoque);
        fd.append('accidente_apoyo', accApoyo);
        fd.append('accidente_pase_medico_paciente', accPaseMedicoPaciente);
        fd.append('accidente_pase_medico_numero', accPaseMedicoNumero);
        fd.append('accidente_pase_medico_observaciones', accPaseMedicoObservaciones);
        fd.append('accidente_hubo_fallecidos', accHuboFallecidos);
        fd.append('accidente_fallecidos_cantidad', accFallecidosCantidad);
        fd.append('accidente_fallecidos_nombres', Array.isArray(accFallecidosNombres) ? accFallecidosNombres.filter(Boolean).join('; ') : accFallecidosNombres);
        fd.append('accidente_hora_fallecimiento', accHoraFallecimiento);
        fd.append('accidente_hora_asistencia_cemefo', accHoraAsistenciaCemefo);
        fd.append('hora_fin_accidente', horaFinEvento);

        if (CODIGO_MED.includes(activeTab)) {
          fd.append('lesionados_cantidad',    lesionadosCantidad);
          fd.append('nombres_afectados',      nombresAfectados);
          fd.append('asistencia_sitio',       JSON.stringify(asistenciaSitio));
          fd.append('diagnostico_preliminar', diagnosticoPreliminar);
          if (ameritaTraslado !== null) fd.append('amerita_traslado', ameritaTraslado ? 'true' : 'false');
          fd.append('estatus_legal', estatusLegal);
        }

        const firmaBlob = await getFirmaBlob();
        if (firmaBlob) fd.append('firma_particular', firmaBlob, 'firma_particular.png');
      }

      if (NARANJA_TYPES.includes(activeTab)) {
        fd.append('usuario_anonimo',          narAnonimo ? 'true' : 'false');
        fd.append('accidente_dueno',          narAnonimo ? 'USUARIO/USUARIA NO IDENTIFICADO/A' : narNombre);
        fd.append('accidente_edad',           narEdad);
        fd.append('accidente_genero',         narGenero);
        fd.append('accidente_hechos',         narRelato);
        fd.append('estacion_hecho',           narEstacion);
        fd.append('ruta_hecho',               narRuta);
        fd.append('autoridad_interviniente',  narAutoridad);
        if (narPuestoDisposicion !== null) fd.append('puesto_disposicion', narPuestoDisposicion ? 'true' : 'false');
        if (narPuestoDisposicion === false)  fd.append('motivo_no_disposicion', narMotivo);
        const firmaBlob = await getFirmaBlob();
        if (firmaBlob) fd.append('firma_particular', firmaBlob, 'firma_particular.png');
      }

      fotos.forEach((f) => fd.append('fotos[]', f));

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res   = await fetch(`${API_BASE}/api/titan/reporte`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar el reporte');
      }

      await Swal.fire({ icon: 'success', title: '¡Reporte Guardado!', text: 'La información se registró correctamente.', confirmButtonColor: '#601a2a' });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     JSX
     ───────────────────────────────────────────────────────────── */
  if (!selectedUnidad) {
    return (
      <div style={{ textAlign: 'center', marginTop: 50 }}>
        <h2 className="titan-subtitle">Cargando datos de la unidad...</h2>
        <p style={{ color: '#6b7280' }}>Si la pantalla no carga, intenta seleccionar nuevamente.</p>
      </div>
    );
  }

  const needsAccidentFirma = ACCIDENT_TYPES.includes(activeTab) || NARANJA_TYPES.includes(activeTab);

  return (
    <div style={{ paddingBottom: 80, width: '100%' }}>
      <div className="titan-form-container">
        {/* Contraer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="titan-btn-cancel" onClick={onCancel}>
            <svg className="titan-btn-cancel-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
            Contraer Formulario
          </button>
        </div>

        {/* Saludo GPS */}
        <div className="titan-saludo-wrapper">
          <p className="titan-saludo-texto">Hola, {user?.nombre_completo || 'Usuario'}</p>
          <div className="titan-saludo-ubicacion">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
              {ubicacionGPS ? ubicacionGPS.split('|')[0] : 'Obteniendo ubicación...'}
            </p>
          </div>
        </div>

        {/* Card unidad */}
        <div className="titan-header-info">
          <div>
            <h3>Unidad {selectedUnidad.numero_economico}</h3>
            <div className="titan-info-grid">
              <p><strong>Ruta</strong><span>{selectedUnidad.ruta || 'N/A'}</span></p>
              <p><strong>Tarjetón</strong><span>{selectedUnidad.numero_tarjeton || 'N/A'}</span></p>
              <p><strong>Conductor</strong><span>{selectedUnidad.nombre_conductor || 'N/A'}</span></p>
            </div>
          </div>
        </div>

        {/* Información general */}
        <div className="titan-section">
          <h4>Información General</h4>
          <div className="form-group">
            <label>Intervalo</label>
            <input type="text" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} placeholder="Ej. 10 min" />
          </div>
          <div className="form-group">
            <label>Observaciones generales</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows="3" placeholder="Detalles de supervisión..." />
          </div>
        </div>

        {/* Pestañas */}
        <div className="titan-tabs" style={{ flexWrap: 'wrap', gap: 6 }}>
          {[
            { key: 'DESINCORPORACION', label: 'Desincorporación' },
            { key: 'INCORPORACION',    label: 'Incorporación' },
            { key: 'ACCIDENTE',        label: 'Accidente' },
            { key: 'CHOQUE',           label: 'Choque' },
            { key: 'ATROPELLADO',      label: 'Atropellado' },
            { key: 'CODIGO_AMBAR',     label: 'Código Ámbar' },
            { key: 'CODIGO_ROJO',      label: 'Código Rojo' },
            { key: 'CODIGO_NARANJA',   label: 'Código Naranja' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`titan-tab ${activeTab === key ? 'active' : ''} titan-tab--${key.toLowerCase().replace('_', '-')}`}
              onClick={() => handleTabChange(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contenido dinámico según tab */}
        {activeTab && (
          <div className="titan-section active-tab-content">

            {/* ── Desincorporación / Incorporación ── */}
            {DESINC_INC.includes(activeTab) && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Corrida</label>
                    <input type="text" value={corrida} onChange={(e) => setCorrida(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Hora</label>
                    <button type="button" onClick={() => setDropdownHoraOpen(!dropdownHoraOpen)} className="form-group-time-trigger">
                      <span>{horaEvento || '--:--'}</span>
                      <svg style={{ width: 12, height: 12 }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                      </svg>
                    </button>
                    {dropdownHoraOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setDropdownHoraOpen(false)} />
                        <IOSTimePicker value={horaEvento} onChange={setHoraEvento} onClose={() => setDropdownHoraOpen(false)} onSave={() => setDropdownHoraOpen(false)} />
                      </>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Ubicación <span style={{ color: '#dc2626' }}>*</span></label>
                  <select value={ubicacionEvento} onChange={(e) => setUbicacionEvento(e.target.value)} className="form-group-select">
                    <option value="">Selecciona una ubicación...</option>
                    {UBI_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {activeTab === 'DESINCORPORACION' && (
                  <div className="form-group">
                    <label>Motivo <span style={{ color: '#dc2626' }}>*</span></label>
                    <textarea value={motivoDesincorporacion} onChange={(e) => setMotivoDesincorporacion(e.target.value)} rows="4" placeholder="Describe el motivo..." />
                  </div>
                )}
              </>
            )}

            {/* ── Accidente / Choque (vehículo particular) ── */}
            {['ACCIDENTE', 'CHOQUE'].includes(activeTab) && (
              <>
                <div className="form-group">
                  <label>Dueño del Particular</label>
                  <input type="text" value={accDueno} onChange={(e) => setAccDueno(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tipo de Vehículo</label>
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
              </>
            )}

            {/* ── Personal: víctima (ATROPELLADO, CÓDIGO ÁMBAR, CÓDIGO ROJO) ── */}
            {PERSONAL_TYPES.includes(activeTab) && (
              <>
                <div className="form-group">
                  <label>Nombre de la Víctima</label>
                  <input type="text" value={accVictima} onChange={(e) => setAccVictima(e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Edad</label>
                    <input type="number" min="0" value={accEdad} onChange={(e) => setAccEdad(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Género</label>
                    <select value={accGenero} onChange={(e) => setAccGenero(e.target.value)} className="form-group-select">
                      <option value="">Selecciona...</option>
                      {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── Hechos (todos los tipos de accidente) ── */}
            {ACCIDENT_TYPES.includes(activeTab) && (
              <>
                <div className="form-group">
                  <label>Hechos / Descripción <span style={{ color: '#dc2626' }}>*</span></label>
                  <textarea value={accHechos} onChange={(e) => setAccHechos(e.target.value)} rows="5" placeholder="Describe a detalle los hechos..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Hecho (Opcional)</label>
                    <select value={accHechoTipo} onChange={(e) => setAccHechoTipo(e.target.value)} className="form-group-select">
                      <option value="">Selecciona...</option>
                      {ACCIDENT_HECHO_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  {accHechoTipo && (
                    <div className="form-group">
                      <label>A favor de quién</label>
                      <input type="text" value={accFavorDeQuien} onChange={(e) => setAccFavorDeQuien(e.target.value)} placeholder="Beneficiario" />
                    </div>
                  )}
                </div>

                {accHechoTipo && (
                  <div className="form-group">
                    <label>Cantidades / Dinero Involucrado</label>
                    <input type="text" value={accCantidadesDinero} onChange={(e) => setAccCantidadesDinero(e.target.value)} placeholder="Ej. $1000 / $500" />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Choque</label>
                    <select value={accTipoChoque} onChange={(e) => setAccTipoChoque(e.target.value)} className="form-group-select">
                      <option value="">Selecciona...</option>
                      {TIPO_CHOQUE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Apoyo al lugar</label>
                    <select value={accApoyo} onChange={(e) => setAccApoyo(e.target.value)} className="form-group-select">
                      <option value="">Selecciona...</option>
                      {APOYO_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                {accApoyo === 'PASES MEDICOS' && (
                  <div className="titan-sub-section">
                    <h4>Información de Pases Médicos</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nombre del Paciente</label>
                        <input type="text" value={accPaseMedicoPaciente} onChange={(e) => setAccPaseMedicoPaciente(e.target.value)} placeholder="Paciente" />
                      </div>
                      <div className="form-group">
                        <label>Número/Folio del Pase</label>
                        <input type="text" value={accPaseMedicoNumero} onChange={(e) => setAccPaseMedicoNumero(e.target.value)} placeholder="Folio" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Observaciones del Pase</label>
                      <textarea value={accPaseMedicoObservaciones} onChange={(e) => setAccPaseMedicoObservaciones(e.target.value)} rows="3" placeholder="Notas" />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>¿Hubo Fallecidos?</label>
                  <select value={accHuboFallecidos} onChange={(e) => setAccHuboFallecidos(e.target.value)} className="form-group-select">
                    <option value="">Selecciona...</option>
                    <option value="NO">NO</option>
                    <option value="SI">SÍ</option>
                  </select>
                </div>

                {accHuboFallecidos === 'SI' && (
                  <div className="titan-sub-section" style={{ borderLeft: '4px solid #111827', paddingLeft: 12 }}>
                    <div className="form-group">
                      <label>Cantidad de Fallecidos</label>
                      <input type="number" min="1" value={accFallecidosCantidad} onChange={(e) => setAccFallecidosCantidad(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Nombres de los Fallecidos</label>
                      {Array.from({ length: Math.max(1, Number(accFallecidosCantidad) || 1) }).map((_, index) => (
                        <input key={index} type="text" value={accFallecidosNombres[index] || ''} onChange={(e) => handleFallecidoNombreChange(index, e.target.value)} placeholder={`Nombre completo del fallecido ${index + 1}`} style={{ marginBottom: 8 }} />
                      ))}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hora de Fallecimiento</label>
                        <input type="time" value={accHoraFallecimiento} onChange={(e) => setAccHoraFallecimiento(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Hora Asistencia CEMEFO</label>
                        <input type="time" value={accHoraAsistenciaCemefo} onChange={(e) => setAccHoraAsistenciaCemefo(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hora del accidente */}
                <div className="form-row">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Hora del accidente</label>
                    <button type="button" onClick={() => setDropdownHoraOpen(!dropdownHoraOpen)} className="form-group-time-trigger">
                      <span>{horaEvento || '--:--'}</span>
                      <svg style={{ width: 12, height: 12 }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                      </svg>
                    </button>
                    {dropdownHoraOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setDropdownHoraOpen(false)} />
                        <IOSTimePicker value={horaEvento} onChange={setHoraEvento} onClose={() => setDropdownHoraOpen(false)} onSave={() => setDropdownHoraOpen(false)} />
                      </>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Hora de fin</label>
                    <input type="time" value={horaFinEvento} onChange={(e) => setHoraFinEvento(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* ── Código Ámbar / Rojo: campos médicos extendidos ── */}
            {CODIGO_MED.includes(activeTab) && (
              <div className="titan-seccion-medica">
                <h4 className="titan-seccion-medica__titulo">
                  Información Médica y Legal
                </h4>

                <div className="form-row">
                  <div className="form-group">
                    <label>Número de Lesionados</label>
                    <input type="number" min="0" value={lesionadosCantidad} onChange={(e) => setLesionadosCantidad(e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Estatus Legal</label>
                    <select value={estatusLegal} onChange={(e) => setEstatusLegal(e.target.value)} className="form-group-select">
                      <option value="">Selecciona...</option>
                      {ESTATUS_LEGAL.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Nombres de los Afectados</label>
                  <textarea value={nombresAfectados} onChange={(e) => setNombresAfectados(e.target.value)} rows="2" placeholder="Escribe los nombres separados por coma..." />
                </div>

                <div className="form-group">
                  <label>Asistencia en Sitio</label>
                  <div className="titan-checkboxes-grid">
                    {ASISTENCIA_OPTS.map((op) => (
                      <label key={op} className="titan-checkbox-item">
                        <input
                          type="checkbox"
                          checked={asistenciaSitio.includes(op)}
                          onChange={() => toggleAsistencia(op)}
                        />
                        {op}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Diagnóstico Preliminar</label>
                  <textarea value={diagnosticoPreliminar} onChange={(e) => setDiagnosticoPreliminar(e.target.value)} rows="3" placeholder="Diagnóstico médico preliminar en sitio..." />
                </div>

                <div className="form-group">
                  <label>Amerita Traslado</label>
                  <div className="titan-radio-group">
                    {[{ val: true, label: 'Sí' }, { val: false, label: 'No' }].map(({ val, label }) => (
                      <label key={label} className="titan-radio-item">
                        <input
                          type="radio"
                          name="amerita_traslado"
                          checked={ameritaTraslado === val}
                          onChange={() => setAmeritaTraslado(val)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Código Naranja (Acoso) ── */}
            {NARANJA_TYPES.includes(activeTab) && (
              <div className="titan-seccion-naranja">
                <h4 className="titan-seccion-naranja__titulo">REPORTE DE ACOSO / CÓDIGO NARANJA</h4>

                {/* Usuario afectado */}
                <div className="form-group checkbox-group" style={{ marginBottom: 8 }}>
                  <label>
                    <input type="checkbox" checked={narAnonimo} onChange={(e) => setNarAnonimo(e.target.checked)} />
                    Usuario/Usuaria no identificado/a (anónimo)
                  </label>
                </div>

                {!narAnonimo && (
                  <div className="form-group">
                    <label>Nombre del Usuario Afectado</label>
                    <input type="text" value={narNombre} onChange={(e) => setNarNombre(e.target.value)} placeholder="Nombre completo..." />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Edad</label>
                    <input type="number" min="0" value={narEdad} onChange={(e) => setNarEdad(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Género</label>
                    <select value={narGenero} onChange={(e) => setNarGenero(e.target.value)} className="form-group-select">
                      <option value="">Selecciona...</option>
                      {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* Ubicación del hecho */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Estación del Hecho</label>
                    <select value={narEstacion} onChange={(e) => setNarEstacion(e.target.value)} className="form-group-select">
                      <option value="">Selecciona estación...</option>
                      {ESTACIONES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ruta</label>
                    <input type="text" value={narRuta} onChange={(e) => setNarRuta(e.target.value)} placeholder="Ej. RA1, TRONCAL..." />
                  </div>
                </div>

                {/* Relato */}
                <div className="form-group">
                  <label>Relato de Hechos <span style={{ color: '#dc2626' }}>*</span></label>
                  <textarea value={narRelato} onChange={(e) => setNarRelato(e.target.value)} rows="5" placeholder="Describe detalladamente los hechos ocurridos..." />
                </div>

                {/* Autoridad */}
                <div className="form-group">
                  <label>Autoridad Interviniente</label>
                  <select value={narAutoridad} onChange={(e) => setNarAutoridad(e.target.value)} className="form-group-select">
                    <option value="">Selecciona...</option>
                    {AUTORIDADES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Puesto a Disposición */}
                <div className="form-group">
                  <label>Puesto a Disposición</label>
                  <div className="titan-radio-group">
                    {[{ val: true, label: 'Sí' }, { val: false, label: 'No' }].map(({ val, label }) => (
                      <label key={label} className="titan-radio-item">
                        <input
                          type="radio"
                          name="puesto_disposicion"
                          checked={narPuestoDisposicion === val}
                          onChange={() => setNarPuestoDisposicion(val)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {narPuestoDisposicion === false && (
                  <div className="form-group">
                    <label>Motivo de no puesta a disposición <span style={{ color: '#dc2626' }}>*</span></label>
                    <textarea value={narMotivo} onChange={(e) => setNarMotivo(e.target.value)} rows="3" placeholder="Explica el motivo..." />
                  </div>
                )}

                {/* Hora del evento */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Hora del evento</label>
                  <button type="button" onClick={() => setDropdownHoraOpen(!dropdownHoraOpen)} className="form-group-time-trigger">
                    <span>{horaEvento || '--:--'}</span>
                    <svg style={{ width: 12, height: 12 }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {dropdownHoraOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setDropdownHoraOpen(false)} />
                      <IOSTimePicker value={horaEvento} onChange={setHoraEvento} onClose={() => setDropdownHoraOpen(false)} onSave={() => setDropdownHoraOpen(false)} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Firma (accidentes + naranja) ── */}
            {needsAccidentFirma && (
              <div className="form-group" style={{ marginTop: 20 }}>
                <label>Firma del Particular / Afectado (opcional)</label>
                <div className="titan-firma-wrapper">
                  <canvas
                    ref={firmaCanvasRef}
                    style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                    onMouseDown={handleFirmaStart}
                    onMouseMove={handleFirmaMove}
                    onMouseUp={handleFirmaEnd}
                    onMouseLeave={handleFirmaEnd}
                  />
                  {firmaVacia && (
                    <span className="titan-firma-placeholder">Firma aquí con el dedo o el mouse</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="titan-btn-cancel" onClick={limpiarFirma}>Limpiar firma</button>
                </div>
              </div>
            )}

            {/* ── Evidencia fotográfica ── */}
            <div className="form-group" style={{ marginTop: 20 }}>
              <label>Evidencia Fotográfica (Máx. 10)</label>
              <label className="titan-file-upload">
                <input type="file" multiple accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Haz clic aquí para seleccionar imágenes</span>
              </label>
              <div className="titan-fotos-preview">
                {previewFotos.map((src, idx) => (
                  <div key={idx} className="titan-foto-item">
                    <img src={src} alt="Preview" />
                    <button type="button" className="titan-foto-item__remove" onClick={() => removeFoto(idx)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Botón reportar ── */}
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="centro-btn centro-btn--primary" onClick={handleSubmit} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Reportar Evento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleUnidadTitan;