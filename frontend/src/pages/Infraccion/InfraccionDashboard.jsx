import React, { useState, useEffect, useContext, useRef } from 'react';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import SignaturePad from '../../components/SignaturePad/SignaturePad';
import IOSTimePicker from '../Unidades/componentsdetalleunidad/IOSTimePicker';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import API_BASE from '../../config/api';
import { AuthContext } from "../../context/AuthContext";
import { generarPDFInfraccion } from "../../utils/generarPDFInfraccion";
import './Infraccion.css';

const UMA_VALOR_2026 = 108.57; // Valor de referencia UMA para cálculo visual en pesos

// CustomSelect Component
const CustomSelect = ({ value, onChange, options, placeholder = "SELECCIONAR", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getOptionLabel = (opt) => typeof opt === 'object' ? opt.label : opt;
  const getOptionValue = (opt) => typeof opt === 'object' ? opt.value : opt;

  const currentLabel = value ? (options.find(opt => getOptionValue(opt) === value) ? getOptionLabel(options.find(opt => getOptionValue(opt) === value)) : value) : placeholder;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 50 : 1 }}>
      <button
        type="button"
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.85rem',
          cursor: 'pointer',
          textAlign: 'left',
          background: '#ffffff',
          border: '1px solid #601a2a',
          borderRadius: '8px',
          height: '2.3rem',
          fontSize: '0.85rem',
          width: '100%',
          fontWeight: 'bold',
          color: '#111827',
          outline: 'none'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentLabel}
        </span>
        <svg
          style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', width: '0.85rem', height: '0.85rem', marginLeft: '0.5rem', flexShrink: 0, color: '#601a2a' }}
          fill="currentColor" viewBox="0 0 24 24"
        >
          <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', width: '100%', top: '100%', left: 0, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginTop: '0.25rem', zIndex: 999, overflow: 'hidden' }}>
          <div style={{ maxHeight: '12rem', overflowY: 'auto' }}>
            {options.map((opt, i) => {
              const optLabel = getOptionLabel(opt);
              const optValue = getOptionValue(opt);
              const isSelected = value === optValue;
              return (
                <button
                  key={i}
                  type="button"
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.85rem', background: '#ffffff', border: 'none', borderBottom: i < options.length - 1 ? '1px solid #f3f4f6' : 'none', color: isSelected ? '#601a2a' : '#4b5563', fontWeight: isSelected ? 'bold' : 'normal', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.target.style.background = '#ffffff'}
                  onClick={() => { onChange(optValue); setIsOpen(false); }}
                >
                  {optLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const InfraccionDashboard = () => {
  const { token, user } = useContext(AuthContext);

  // 1. Verificación de Placa previa (Paso 1)
  const [placas, setPlacas] = useState('');
  const [checkingPlaca, setCheckingPlaca] = useState(false);
  const [placaStatus, setPlacaStatus] = useState(null);
  const [tipoFormulario, setTipoFormulario] = useState(null); // 'amonestacion' | 'infraccion'

  // -------------------------------------------------------------
  // ESTADOS DEL FORMULARIO 1: ACTA DE AMONESTACIÓN (Primera Incursión)
  // -------------------------------------------------------------
  const [fechaAmonestacion, setFechaAmonestacion] = useState(() => new Date().toISOString().split('T')[0]);
  const [lugarAmonestacion, setLugarAmonestacion] = useState('Pachuca de Soto, Estado de Hidalgo');
  const [entidadFederativa, setEntidadFederativa] = useState('Hidalgo');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [color, setColor] = useState('');
  const [conductorNombre, setConductorNombre] = useState('');
  const [conductorIdentificacion, setConductorIdentificacion] = useState('');
  const [inspectorGafete, setInspectorGafete] = useState('');
  const [firmaInspector, setFirmaInspector] = useState('');
  const [conductorNegoFirmar, setConductorNegoFirmar] = useState(false);
  const [recibioNombre, setRecibioNombre] = useState('');
  const [firmaConductor, setFirmaConductor] = useState('');

  // -------------------------------------------------------------
  // ESTADOS DEL FORMULARIO 2: BOLETA DE INFRACCIÓN (Reincidencia)
  // -------------------------------------------------------------
  const [infFechaExpedicion, setInfFechaExpedicion] = useState(() => new Date().toISOString().split('T')[0]);
  const [infHoraIntervencion, setInfHoraIntervencion] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [infMunicipio, setInfMunicipio] = useState('Pachuca de Soto');
  const [infUbicacionExacta, setInfUbicacionExacta] = useState('');
  const [imagenes, setImagenes] = useState([]);

  // Vehículo Infracción
  const [infEntidad, setInfEntidad] = useState('Hidalgo');
  const [infMarca, setInfMarca] = useState('');
  const [infSubmarca, setInfSubmarca] = useState('');
  const [infModelo, setInfModelo] = useState('');
  const [infColor, setInfColor] = useState('');
  const [infNivVin, setInfNivVin] = useState('');
  const [infTipoVehiculo, setInfTipoVehiculo] = useState('Particular');

  // Conductor Infracción
  const [infConductorNombre, setInfConductorNombre] = useState('');
  const [infConductorDomicilio, setInfConductorDomicilio] = useState('');
  const [infLicenciaNumero, setInfLicenciaNumero] = useState('');
  const [infLicenciaTipo, setInfLicenciaTipo] = useState('');
  const [infLicenciaEstado, setInfLicenciaEstado] = useState('Hidalgo');
  const [infCalidadConductor, setInfCalidadConductor] = useState('Conductora');

  // Motivación y Sanción
  const [infMotivacionHecho, setInfMotivacionHecho] = useState('transitaba');
  const [infDescripcionHechos, setInfDescripcionHechos] = useState('');
  const [infSancionUma, setInfSancionUma] = useState('');
  const [infGarantiaRetenida, setInfGarantiaRetenida] = useState(false);
  const [infGarantiaObservaciones, setInfGarantiaObservaciones] = useState('');

  // Inspector y Notificación Infracción
  const [infInspectorGafete, setInfInspectorGafete] = useState('');
  const [infFirmaInspector, setInfFirmaInspector] = useState('');
  const [infNegoFirmar, setInfNegoFirmar] = useState(false);
  const [infRecibioNombre, setInfRecibioNombre] = useState('');
  const [infFirmaConductor, setInfFirmaConductor] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Catálogos
  const ENTIDADES = [
    'Hidalgo',
    'Ciudad de México',
    'Estado de México',
    'Puebla',
    'Querétaro',
    'Tlaxcala',
    'Veracruz',
    'Otra'
  ];

  const TIPOS_VEHICULO = [
    'Particular',
    'Servicio Público',
    'Carga'
  ];

  const GARANTIAS_OPCIONES = [
    'Detención del Vehículo (Grúa / Depósito Vehicular)',
    'Retención de Licencia de Conducir',
    'Retención de Tarjeta de Circulación / Placa',
    'Pago Realizado en el Sitio / Convenio',
    'Otra Garantía / Especificar'
  ];

  // Ejecutar verificación automática al escribir placa
  useEffect(() => {
    if (placas.trim().length >= 4) {
      const timer = setTimeout(() => {
        verificarPlaca(placas);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setPlacaStatus(null);
    }
  }, [placas]);

  
  useEffect(() => {
    if (placaStatus && !checkingPlaca) {
      if (navigator.geolocation) {
        setInfUbicacionExacta('Obteniendo ubicación...');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
              const data = await res.json();
              if (data && data.address) {
                const calle = data.address.road || '';
                const num = data.address.house_number || 'S/N';
                const col = data.address.suburb || data.address.neighbourhood || '';
                const mpo = data.address.city || data.address.town || data.address.municipality || 'Pachuca de Soto';
                
                setInfMunicipio(mpo);
                setInfUbicacionExacta(`${calle} ${num}, ${col}`.trim());
              } else {
                setInfUbicacionExacta('Ubicación no encontrada');
              }
            } catch (err) {
              setInfUbicacionExacta('Error al obtener ubicación');
            }
          },
          (err) => {
            setInfUbicacionExacta('Permiso de ubicación denegado');
          }
        );
      } else {
        setInfUbicacionExacta('Geolocalización no soportada');
      }
    }
  }, [placaStatus, checkingPlaca]);


  const verificarPlaca = async (placaVal) => {
    if (!placaVal.trim()) return;
    setCheckingPlaca(true);
    try {
      const res = await fetch(`${API_BASE}/api/amonestaciones/check/${encodeURIComponent(placaVal)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlacaStatus(data);

        // Auto-llenar campos si ya existen antecedentes en la base de datos
        if (data.latest) {
          const prev = data.latest;
          setEntidadFederativa(prev.entidad_federativa || 'Hidalgo');
          setMarca(prev.marca || '');
          setModelo(prev.modelo || '');
          setColor(prev.color || '');
          setConductorNombre(prev.conductor_nombre || '');
          setRecibioNombre(prev.conductor_nombre || '');
          if (prev.inspector_gafete) setInspectorGafete(prev.inspector_gafete);

          setInfEntidad(prev.entidad_federativa || 'Hidalgo');
          setInfMarca(prev.marca || '');
          setInfModelo(prev.modelo || '');
          setInfColor(prev.color || '');
          setInfConductorNombre(prev.conductor_nombre || '');
          setInfRecibioNombre(prev.conductor_nombre || '');
          if (prev.inspector_gafete) setInfInspectorGafete(prev.inspector_gafete);
        }

        // Sugerir formulario predeterminado pero permitiendo libre selección al usuario
        setTipoFormulario(data.has_amonestacion ? 'infraccion' : 'amonestacion');
      }
    } catch (_err) {
      console.error('Error al verificar placa:', _err);
    } finally {
      setCheckingPlaca(false);
    }
  };

  const handlePlacasChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-\sÑÁÉÍÓÚ]/g, '');
    setPlacas(val);
  };

  // Limpiar formulario completo
  const resetForm = () => {
    setPlacas('');
    setPlacaStatus(null);
    setTipoFormulario(null);

    // Reset Amonestación
    setFechaAmonestacion(new Date().toISOString().split('T')[0]);
    setLugarAmonestacion('Pachuca de Soto, Estado de Hidalgo');
    setEntidadFederativa('Hidalgo');
    setMarca('');
    setModelo('');
    setColor('');
    setConductorNombre('');
    setConductorIdentificacion('');
    setInspectorGafete('');
    setFirmaInspector('');
    setConductorNegoFirmar(false);
    setRecibioNombre('');
    setFirmaConductor('');

    // Reset Infracción
    setInfFechaExpedicion(new Date().toISOString().split('T')[0]);
    setInfHoraIntervencion(() => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    setInfMunicipio('Pachuca de Soto');
    setInfUbicacionExacta('');
    setInfEntidad('Hidalgo');
    setInfMarca('');
    setInfSubmarca('');
    setInfModelo('');
    setInfColor('');
    setInfNivVin('');
    setInfTipoVehiculo('Particular');
    setInfConductorNombre('');
    setInfConductorDomicilio('');
    setInfLicenciaNumero('');
    setInfLicenciaTipo('');
    setInfLicenciaEstado('Hidalgo');
    setInfCalidadConductor('Conductora');
    setInfMotivacionHecho('transitaba');
    setInfDescripcionHechos('');
    setInfSancionUma('');
    setInfGarantiaRetenida(false);
    setInfGarantiaObservaciones('');
    setInfInspectorGafete('');
    setInfFirmaInspector('');
    setInfNegoFirmar(false);
    setInfRecibioNombre('');
    setInfFirmaConductor('');
  };

  // -------------------------------------------------------------
  // GUARDAR BOLETA DE INFRACCIÓN
  // -------------------------------------------------------------
  const handleSubmitInfraccion = async (e) => {
    e.preventDefault();

    if (!infFirmaInspector) {
      Swal.fire({
        icon: 'warning',
        title: 'Firma del inspector requerida',
        text: 'Por favor estampe su firma como inspector autorizado antes de emitir la boleta de infracción.',
        confirmButtonColor: '#601a2a'
      });
      return;
    }

    if (!infNegoFirmar && !infFirmaConductor) {
      Swal.fire({
        icon: 'warning',
        title: 'Firma de la persona infractora pendiente',
        text: 'Por favor recolecte la firma de la persona infractora o marque la casilla de negativa a recibir.',
        confirmButtonColor: '#601a2a'
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        amonestacion_id: placaStatus?.latest?.id || null,
        fecha_expedicion: infFechaExpedicion,
        hora_intervencion: infHoraIntervencion,
        municipio: infMunicipio,
        ubicacion_exacta: infUbicacionExacta,

        placas,
        entidad_federativa: infEntidad,
        marca: infMarca,
        submarca: infSubmarca,
        modelo: infModelo,
        color: infColor,
        niv_vin: infNivVin,
        tipo_vehiculo: infTipoVehiculo,

        conductor_nombre: infConductorNombre,
        conductor_domicilio: infConductorDomicilio,
        licencia_numero: infLicenciaNumero,
        licencia_tipo: infLicenciaTipo,
        licencia_estado: infLicenciaEstado,
        calidad_conductor: infCalidadConductor,

        motivacion_hecho: infMotivacionHecho,
        descripcion_hechos: infDescripcionHechos,

        sancion_uma: parseFloat(infSancionUma) || 0,
        garantia_tipo: infGarantiaRetenida ? 'Detención del Vehículo (Grúa / Depósito Vehicular)' : 'Otra Garantía',
        garantia_observaciones: infGarantiaObservaciones,

        inspector_gafete: infInspectorGafete,
        firma_inspector: infFirmaInspector,

        conductor_nego_firmar: Boolean(infNegoFirmar),
        recibio_nombre: infNegoFirmar ? null : (infRecibioNombre || infConductorNombre),
        firma_conductor: infNegoFirmar ? null : infFirmaConductor,
      };

      const res = await fetch(`${API_BASE}/api/infracciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error al registrar infracción',
          text: data.message || 'No se pudo guardar la boleta de infracción',
          confirmButtonColor: '#601a2a'
        });
        setSubmitting(false);
        return;
      }

      // Preparar datos para el PDF
      const datosParaPDF = {
        folio: data.infraccion?.folio || 'BI-2026-0001',
        fecha: infFechaExpedicion,
        hora: infHoraIntervencion,
        municipio: infMunicipio,
        ubicacion_exacta: infUbicacionExacta,
        lugar: `${infMunicipio}, ${infUbicacionExacta}`.trim(),
        placas,
        entidad_federativa: infEntidad,
        marca: infMarca,
        submarca: infSubmarca,
        modelo: infModelo,
        color: infColor,
        niv_vin: infNivVin,
        tipo_vehiculo: infTipoVehiculo,
        conductor_nombre: infConductorNombre,
        conductor_domicilio: infConductorDomicilio,
        licencia_numero: infLicenciaNumero,
        licencia_tipo: infLicenciaTipo,
        licencia_estado: infLicenciaEstado,
        calidad_conductor: infCalidadConductor,
        motivacion_hecho: infMotivacionHecho,
        descripcion_hechos: infDescripcionHechos,
        sancion_uma: parseFloat(infSancionUma) || 0,
        garantia_tipo: infGarantiaRetenida ? 'Detención del Vehículo (Grúa / Depósito Vehicular)' : 'Otra Garantía',
        garantia_retenida: infGarantiaRetenida,
        garantia_observaciones: infGarantiaObservaciones,
        inspector_nombre: user?.nombre_completo || 'INSPECTOR EN SESIÓN',
        inspector_gafete: infInspectorGafete,
        firma_inspector: infFirmaInspector,
        conductor_nego_firmar: Boolean(infNegoFirmar),
        recibio_nombre: infRecibioNombre || infConductorNombre,
        firma_conductor: infFirmaConductor
      };

      // Generar y descargar PDF automáticamente
      try {
        await generarPDFInfraccion(datosParaPDF, 'download');
      } catch (pdfErr) {
        console.error('Error generando PDF de infracción:', pdfErr);
      }

      Swal.fire({
        icon: 'success',
        title: 'Boleta de Infracción Emitida',
        html: `Se levantó exitosamente la <b>Boleta de Infracción por Reincidencia en Carril Troncal (URBANUSS)</b><br/><br/>Folio Oficial: <h2 style="color: #991b1b; margin-top: 5px;">${data.infraccion?.folio || ''}</h2><br/><span style="font-size: 0.85rem; color: #475569;">El documento PDF oficial ha sido generado y descargado.</span>`,
        showCancelButton: true,
        confirmButtonColor: '#601a2a',
        cancelButtonColor: '#475569',
        confirmButtonText: 'Ver / Imprimir PDF',
        cancelButtonText: 'Cerrar'
      }).then((result) => {
        if (result.isConfirmed) {
          generarPDFInfraccion(datosParaPDF, 'open');
        }
      });

      resetForm();
    } catch (_err) {
      Swal.fire('Error', 'Ocurrió un error de conexión con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="infraccion-page">
      <Header title="Módulo de Infracciones" eyebrow="Inspección y Control de Carril Confinado Troncal (URBANUSS)" />

      <main className="infraccion-main">
        {/* Banner Informativo Troncal URBANUSS */}
        <div className="troncal-header-banner">
          <div className="troncal-banner-icon">
            <img
              src="/images/urbanu-frente.webp"
              alt="URBANUSS"
              style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
          <div className="troncal-banner-text">
            <span className="troncal-banner-eyebrow">SITMAH · Módulo de Inspección</span>
            <h3>INSPECCIÓN Y CONTROL DE CARRIL CONFINADO TRONCAL (URBANUSS)</h3>
            <p>Prevención y sanción por invasión del carril exclusivo de la ruta Troncal • Estado de Hidalgo</p>
          </div>
        </div>

        <div className="form-wrapper">
          {/* TARJETA 1: PASO DE VALIDACIÓN DE PLACAS */}
          <div className="plate-verification-card">
            <div className="plate-verification-header">
              <span className="step-tag">PASO 1</span>
              <h4>BUSCAR VEHÍCULO O INFRACTOR</h4>
            </div>

            <div className="plate-input-wrapper">
              <div className="input-with-button">
                <input
                  type="text"
                  placeholder="Escriba la placa o el nombre del infractor..."
                  value={placas}
                  onChange={handlePlacasChange}
                  className="plate-main-input uppercase-input"
                />
                <button
                  type="button"
                  className="btn-verify-plate"
                  onClick={() => verificarPlaca(placas)}
                  disabled={checkingPlaca || !placas.trim()}
                >
                  {checkingPlaca ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {checkingPlaca && (
              <div className="placa-checking-box">
                <span className="spinner-sm"></span> Consultando expediente de amonestaciones e infracciones...
              </div>
            )}

            {placaStatus && !checkingPlaca && (
              <>
                {/* ── RESULTADO DEL EXPEDIENTE ── */}
                <div className={`placa-status-hero ${placaStatus.has_amonestacion ? 'reincidente' : 'primera-vez'}`}>
                  <div className="status-hero-icon-row">
                    {placaStatus.has_amonestacion ? (
                      /* Icono triángulo de alerta */
                      <svg viewBox="0 0 24 24" className="status-svg-icon red-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    ) : (
                      /* Icono check circle */
                      <svg viewBox="0 0 24 24" className="status-svg-icon green-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    )}
                    <div className="status-hero-content">
                      <div className={`status-hero-badge ${placaStatus.has_amonestacion ? 'red' : 'green'}`}>
                        {placaStatus.has_amonestacion
                          ? `ANTECEDENTES DETECTADOS (${placaStatus.total_amonestaciones} AMONESTACIÓN/ES)`
                          : 'SIN ANTECEDENTES REGISTRADOS'}
                      </div>
                      <h3>
                        {placaStatus.has_amonestacion
                          ? `HISTORIAL REGISTRADO — PLACAS ${placaStatus.placa}`
                          : `VEHÍCULO SIN ANTECEDENTES — PLACAS ${placaStatus.placa}`}
                      </h3>
                      <p>
                        {placaStatus.has_amonestacion
                          ? <>El vehículo cuenta con <b>{placaStatus.total_amonestaciones} amonestación(es) previa(s)</b>. Seleccione el procedimiento a registrar.</>
                          : <>Las placas <b>{placaStatus.placa}</b> no registran sanciones anteriores en carril troncal. Seleccione el tipo de procedimiento a aplicar.</>}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>


          {/* ========================================================================= */}
          {/* CASO B: FORMULARIO DE INFRACCIÓN                                          */}
          {/* ========================================================================= */}
          
            <form className="infraccion-card-form" onSubmit={handleSubmitInfraccion}>
              <div className="infraccion-header-title">
                <h2>BOLETA DE INFRACCIÓN POR REINCIDENCIA</h2>
                <p className="subtitle-legal">
                  Invasión de Carril Exclusivo Troncal (URBANUSS) • Secretaría de Movilidad y Transporte del Estado de Hidalgo
                </p>
              </div>

              {/* 1. LUGAR, FECHA Y HORA DE EMISIÓN */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">1</span>
                  <h3>LUGAR, FECHA Y HORA DE EMISIÓN</h3>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Fecha de Expedición *</label>
                    <AppleDatePicker
                      value={infFechaExpedicion}
                      onChange={(val) => setInfFechaExpedicion(val)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hora de Intervención *</label>
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setShowTimePicker(!showTimePicker)}
                        style={{
                          background: '#fef3c7',
                          border: '1px solid #d97706',
                          borderRadius: '8px',
                          color: '#92400e',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          width: '100%',
                          height: '2.3rem',
                          padding: '0 0.85rem 0 2.2rem',
                          outline: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
                          {infHoraIntervencion || '--:--'}
                        </span>
                        <svg style={{ transition: 'transform 0.2s', transform: showTimePicker ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem', flexShrink: 0, marginLeft: '0.5rem', color: '#92400e' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                        </svg>
                      </button>
                      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#92400e', width: '1rem', height: '1rem' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {showTimePicker && (
                        <>
                          <div
                            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                            onClick={(e) => { e.stopPropagation(); setShowTimePicker(false); }}
                            role="button"
                            tabIndex={-1}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                setShowTimePicker(false);
                              }
                            }}
                          />
                          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 999, width: '100%' }}>
                            <IOSTimePicker
                              value={infHoraIntervencion}
                              onChange={(val) => setInfHoraIntervencion(val)}
                              onClose={() => setShowTimePicker(false)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Municipio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pachuca de Soto"
                      value={infMunicipio}
                      onChange={(e) => setInfMunicipio(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ubicación Exacta *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Av. Revolución esq. Allende, Carril Confinado Troncal"
                      value={infUbicacionExacta}
                      onChange={(e) => setInfUbicacionExacta(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                </div>
              </div>

              {/* 2. DATOS DEL VEHÍCULO INFRACTOR */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">2</span>
                  <h3>DATOS DEL VEHÍCULO INFRACTOR</h3>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Placa de Circulación</label>
                    <input
                      type="text"
                      disabled
                      value={placas}
                      className="infraccion-input uppercase-input highlight-input disabled-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Entidad Federativa *</label>
                    <CustomSelect
                      value={infEntidad}
                      onChange={setInfEntidad}
                      options={ENTIDADES}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Marca *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Nissan"
                      value={infMarca}
                      onChange={(e) => setInfMarca(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Submarca / Líneas</label>
                    <input
                      type="text"
                      placeholder="Ej. Versa / Sedan"
                      value={infSubmarca}
                      onChange={(e) => setInfSubmarca(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Modelo (Año) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 2022"
                      value={infModelo}
                      onChange={(e) => setInfModelo(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Plata / Blanco"
                      value={infColor}
                      onChange={(e) => setInfColor(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Número de Identificación Vehicular (NIV / VIN)</label>
                    <input
                      type="text"
                      placeholder="Ej. 3N1AB7AP0KY123456"
                      value={infNivVin}
                      onChange={(e) => setInfNivVin(e.target.value.toUpperCase())}
                      className="infraccion-input uppercase-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Vehículo *</label>
                    <CustomSelect
                      value={infTipoVehiculo}
                      onChange={setInfTipoVehiculo}
                      options={TIPOS_VEHICULO}
                    />
                  </div>
                </div>
              </div>

              {/* 3. DATOS DE LA PERSONA CONDUCTORA Y/O PROPIETARIA */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">3</span>
                  <h3>DATOS DE LA PERSONA CONDUCTORA Y/O PROPIETARIA</h3>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre de la persona conductora *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nombre completo"
                      value={infConductorNombre}
                      onChange={(e) => {
                        setInfConductorNombre(e.target.value);
                        if (!infNegoFirmar && !infRecibioNombre) {
                          setInfRecibioNombre(e.target.value);
                        }
                      }}
                      className="infraccion-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calidad con la que se ostenta *</label>
                    <CustomSelect
                      value={infCalidadConductor}
                      onChange={setInfCalidadConductor}
                      options={['Conductora', 'Propietaria del Vehículo']}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Domicilio de la persona conductora</label>
                  <input
                    type="text"
                    placeholder="Calle, Número, Colonia, Municipio, Estado"
                    value={infConductorDomicilio}
                    onChange={(e) => setInfConductorDomicilio(e.target.value)}
                    className="infraccion-input"
                  />
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Número de Licencia de Conducir</label>
                    <input
                      type="text"
                      placeholder="Ej. LIC-987654"
                      value={infLicenciaNumero}
                      onChange={(e) => setInfLicenciaNumero(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Licencia</label>
                    <input
                      type="text"
                      placeholder="Ej. Tipo A / Tipo B"
                      value={infLicenciaTipo}
                      onChange={(e) => setInfLicenciaTipo(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado de Expedición Licencia</label>
                    <input
                      type="text"
                      placeholder="Ej. Hidalgo"
                      value={infLicenciaEstado}
                      onChange={(e) => setInfLicenciaEstado(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                </div>
              </div>

              {/* 4. MOTIVACIÓN / DESCRIPCIÓN CIRCUNSTANCIADA DE LOS HECHOS */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">4</span>
                  <h3>MOTIVACIÓN / DESCRIPCIÓN CIRCUNSTANCIADA DE LOS HECHOS</h3>
                </div>

                <div className="form-group">
                  <label className="form-label">Motivación del Hecho *</label>
                  <CustomSelect
                    value={infMotivacionHecho}
                    onChange={setInfMotivacionHecho}
                    options={[
                      { value: 'transitaba', label: 'Transitaba por el carril exclusivo Troncal (URBANUSS)' },
                      { value: 'ingresó', label: 'Ingresó indebidamente al carril exclusivo Troncal (URBANUSS)' },
                      { value: 'maniobró', label: 'Maniobró sin autorización en el carril exclusivo Troncal (URBANUSS)' }
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción circunstanciada de los hechos</label>
                  <textarea
                    rows={3}
                    placeholder="Escriba los detalles o circunstancias observadas durante la intervención..."
                    value={infDescripcionHechos}
                    onChange={(e) => setInfDescripcionHechos(e.target.value)}
                    className="infraccion-textarea"
                  />
                </div>
              </div>

              {/* 5. SANCIÓN IMPUESTA Y GARANTÍA RETENIDA */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">5</span>
                  <h3>SANCIÓN IMPUESTA Y GARANTÍA RETENIDA</h3>
                </div>

                <div className="sancion-uma-card">
                  <div className="form-group">
                    <label className="form-label font-bold">
                      Sanción Impuesta (Multa en UMA - Unidades de Medida y Actualización) *
                    </label>
                    <div className="uma-input-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={infSancionUma}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setInfSancionUma(val);
                        }}
                        className="infraccion-input uma-number-input"
                        placeholder="Ej. 50"
                      />
                      <span className="uma-unit-tag">UMAs</span>
                      <div
                        className="uma-calc-badge"
                        style={{
                          background: infSancionUma ? '#fef2f2' : 'transparent',
                          borderColor: infSancionUma ? '#fca5a5' : 'transparent',
                          color: infSancionUma ? '#7f1d1d' : '#9ca3af'
                        }}
                      >
                        {infSancionUma
                          ? `Equivalente a $${(parseFloat(infSancionUma) * UMA_VALOR_2026).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
                          : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group mt-3" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label font-bold">Garantía retenida (en su caso):</label>
                  <label className="checkbox-custom-container" style={{ margin: '0.75rem 0', display: 'inline-flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={infGarantiaRetenida}
                      onChange={(e) => setInfGarantiaRetenida(e.target.checked)}
                      style={{ margin: 0 }}
                    />
                    <span className="checkbox-text-legal font-semibold text-gray-800" style={{ textTransform: 'uppercase' }}>
                      Detención del Vehículo
                    </span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold">Otro (especificar si se pagó en el momento, acuerdo, observación, etc.):</label>
                  <input
                    type="text"
                    placeholder="Especificar observaciones o acuerdos referentes a la garantía..."
                    value={infGarantiaObservaciones}
                    onChange={(e) => setInfGarantiaObservaciones(e.target.value)}
                    className="infraccion-input"
                  />
                </div>
              </div>

              {/* 6. IDENTIFICACIÓN Y FIRMA DE LA PERSONA INSPECTORA */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">6</span>
                  <h3>IDENTIFICACIÓN Y FIRMA DE LA PERSONA INSPECTORA DE TRANSPORTE AUTORIZADA</h3>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre del Inspector (Usuario en Sesión)</label>
                    <input
                      type="text"
                      disabled
                      value={user?.nombre_completo || 'INSPECTOR EN SESIÓN'}
                      className="infraccion-input disabled-input font-bold"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. Gafete / Credencial Oficial *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. GAF-2026-042"
                      value={infInspectorGafete}
                      onChange={(e) => setInfInspectorGafete(e.target.value)}
                      className="infraccion-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Adscripción</label>
                  <input
                    type="text"
                    disabled
                    value="Dirección Jurídica del SITMAH"
                    className="infraccion-input disabled-input"
                  />
                </div>

                <div className="signature-section-wrapper">
                  <SignaturePad
                    label="Nombre y Firma Autógrafa de la Persona Inspectora *"
                    onSave={(base64) => setInfFirmaInspector(base64)}
                    onClear={() => setInfFirmaInspector('')}
                    height={150}
                  />
                </div>
              </div>

              
                {/* 8. ANEXO FOTOGRÁFICO */}
                <div className="section-block section-infraccion">
                  <div className="section-block-title">
                    <span className="section-number red">8</span>
                    <h3>ANEXO FOTOGRÁFICO DE EVIDENCIA (MÁX 3)</h3>
                  </div>
                  <div className="form-group full-width" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <label style={{ fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem', display: 'block' }}>Subir Fotografías</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*;capture=camera" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        if(files.length > 3) {
                          alert('Máximo 3 imágenes permitidas.');
                          setImagenes(files.slice(0, 3));
                        } else {
                          setImagenes(files);
                        }
                      }}
                      style={{ marginBottom: '1rem' }}
                    />
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {imagenes.map((file, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '120px', height: '120px' }}>
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Preview ${idx}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 7. OBSERVACIONES Y FIRMA DE LA PERSONA INFRACTORA */}
              <div className="section-block section-infraccion">
                <div className="section-block-title">
                  <span className="section-number red">7</span>
                  <h3>OBSERVACIONES Y FIRMA DE LA PERSONA INFRACTORA</h3>
                </div>

                <div className="checkbox-negativa-card">
                  <label className="checkbox-custom-container">
                    <input
                      type="checkbox"
                      checked={infNegoFirmar}
                      onChange={(e) => {
                        const val = Boolean(e.target.checked);
                        setInfNegoFirmar(val);
                        if (val) setInfFirmaConductor('');
                      }}
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-text-legal">
                      <b>La persona conductora se negó a recibir o firmar la boleta de infracción.</b>
                      <br />
                      <small style={{ color: '#6b7280', fontSize: '0.825rem' }}>
                        (Artículos 258 y 260 de la Ley de Movilidad y Transporte para el Estado de Hidalgo y Art. 49 de su Reglamento).
                      </small>
                    </span>
                  </label>
                </div>

                {infNegoFirmar ? (
                  <div className="negativa-notice-box">
                    <span className="notice-icon">ℹ️</span>
                    <div>
                      <strong>Boleta asentada con negativa de recepción / firma</strong>
                      <p>La boleta de infracción conserva plena validez jurídica conforme a los Artículos 258 y 260 de la Ley de Movilidad del Estado de Hidalgo.</p>
                    </div>
                  </div>
                ) : (
                  <div className="driver-signature-block">
                    <div className="form-group">
                      <label className="form-label">Nombre de la persona infractora o conductora</label>
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={infRecibioNombre}
                        onChange={(e) => setInfRecibioNombre(e.target.value)}
                        className="infraccion-input"
                      />
                    </div>

                    <div className="signature-section-wrapper">
                      <SignaturePad
                        label="Firma autógrafa de la persona infractora *"
                        onSave={(base64) => setInfFirmaConductor(base64)}
                        onClear={() => setInfFirmaConductor('')}
                        height={150}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones de Infracción */}
              <div className="amonestacion-form-actions">
                <button
                  type="button"
                  className="btn-cancel-form"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Limpiar Formulario
                </button>
                <button
                  type="submit"
                  className="btn-submit-form btn-submit-red"
                  disabled={submitting}
                >
                  {submitting ? 'Emitiendo Boleta...' : 'Emitir Boleta de Infracción'}
                </button>
              </div>
            </form>
          
        </div>
      </main>
    </div>
  );
};

export default InfraccionDashboard;