// src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx
import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CONDUCTORES from '../../../src/data/conductores';
import API_BASE from '../../../src/config/api';
import Swal from 'sweetalert2';

import IOSTimePicker from '../Unidades/componentsdetalleunidad/IOSTimePicker';
import { AuthContext } from '../../context/AuthContext';

export default function UnitInfoPanel({
  selectedOption,
  configActual,
  datosOperativos,
  cargandoDatos,
  tarjetonBusqueda,
  setTarjetonBusqueda,
  mensajeBusqueda,
  buscarUnidadPorInput,
  fallaTexto,
  setFallaTexto,
  handleSaveFalla,
  handleCancelFalla,
  handleSaveTarjeton,
  handleSaveRuta,
  handleSaveHoras,
  handleCambiarEstatus,
  cambiandoEstatus,
  conductoresDisponibles,
  unidadesReserva = [],
  onUpdate,
}) {
  const { user } = useContext(AuthContext);
  const isPlataforma = user?.role?.codigo === 'PLATAFORMA' || localStorage.getItem('dashboardMode') === 'PLATAFORMA';

  const [editandoTarjeton, setEditandoTarjeton] = useState(false);
  const [formTarjeton, setFormTarjeton] = useState('');
  const [guardandoTarjeton, setGuardandoTarjeton] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [hasCompletedChecklist, setHasCompletedChecklist] = useState(false);
  const [viewingChecklist, setViewingChecklist] = useState(false);
  const [lightboxDibujo, setLightboxDibujo] = useState(null);
  const [recentChecklist, setRecentChecklist] = useState(null);
  const [perdidaCiclos, setPerdidaCiclos] = useState('');
  const [perdidaMotivo, setPerdidaMotivo] = useState('');
  const [dropdownMotivoOpen, setDropdownMotivoOpen] = useState(false);
  const [dropdownCiclosOpen, setDropdownCiclosOpen] = useState(false);
  const [huboCorridasPerdidas, setHuboCorridasPerdidas] = useState(false);
  const [formHoraProgramada, setFormHoraProgramada] = useState('');
  const [formAcople, setFormAcople] = useState(''); // ⬅️ Se usará para la hora de salida automática
  const [dropdownHoraOpen, setDropdownHoraOpen] = useState(false);
  const [dropdownAcopleOpen, setDropdownAcopleOpen] = useState(false);
  const [dropdownTarjetonOpen, setDropdownTarjetonOpen] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  const isReservaOrMantenimiento = datosOperativos.estatus === 'RESERVA' || datosOperativos.estatus === 'MANTENIMIENTO';

  // Inicializar hora programada desde datosOperativos
  useEffect(() => {
    if (datosOperativos.horaProgramada) setFormHoraProgramada(datosOperativos.horaProgramada);
    // ⚠️ Ya NO inicializamos formAcople desde datosOperativos porque será automático
  }, [datosOperativos]);

  // ✅ AUTOMÁTICO: actualizar la hora de salida al seleccionar una unidad
  useEffect(() => {
    if (selectedOption) {
      const ahora = new Date();
      const horas = String(ahora.getHours()).padStart(2, '0');
      const minutos = String(ahora.getMinutes()).padStart(2, '0');
      setFormAcople(`${horas}:${minutos}`);
    } else {
      setFormAcople('');
    }
  }, [selectedOption]);

  const [rutasOpciones, setRutasOpciones] = useState([]);
  const [rutaOptionsByType, setRutaOptionsByType] = useState({ troncales: [], alimentadoras: [] });
  const [formRuta, setFormRuta] = useState('');
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [dropdownRutaOpen, setDropdownRutaOpen] = useState(false);

  const corridasPerdidasOptions = useMemo(() => [
    '1/2', '1', '1 1/2', '2', '2 1/2', '3', '3 1/2', '4', '4 1/2', '5', '5 1/2', '6', '6 1/2', '7', '7 1/2', '8', '8 1/2', '9', '9 1/2', '10', 'OTRO'
  ], []);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRutaOptionsByType({
            troncales: data.troncales || [],
            alimentadoras: data.alimentadoras || [],
          });
          if (configActual?.id === 'urbanus') {
            setRutasOpciones(data.troncales || []);
          } else {
            setRutasOpciones(data.alimentadoras || []);
          }
        }
      } catch (err) {
        console.error('Error fetching rutas', err);
      }
    };
    fetchRutas();
  }, [configActual]);

  const [guardandoPerdida, setGuardandoPerdida] = useState(false);
  const navigate = useNavigate();

  // Modals de Plataforma
  const [modalPlataformaVisible, setModalPlataformaVisible] = useState(null);
  const [platMotivo, setPlatMotivo] = useState('');
  const [platEstatus, setPlatEstatus] = useState('');
  const [platEstatusDropdown, setPlatEstatusDropdown] = useState(false);
  const [platConductor, setPlatConductor] = useState('');
  const [platConductorDropdown, setPlatConductorDropdown] = useState(false);
  const [platRuta, setPlatRuta] = useState('');
  const [platRutaDropdown, setPlatRutaDropdown] = useState(false);
  const [platError, setPlatError] = useState('');

  const [reemplazoActivo, setReemplazoActivo] = useState(false);
  const [unidadReemplazoSeleccionada, setUnidadReemplazoSeleccionada] = useState(null);
  const [searchReserva, setSearchReserva] = useState('');
  const [rutaTipoSeleccionada, setRutaTipoSeleccionada] = useState(configActual?.id === 'urbanus' || configActual?.id === 'urbanuss' ? 'troncales' : 'alimentadoras');
  const [reemplazoForm, setReemplazoForm] = useState({
    unidadNuevaEco: '',
    tarjeton: '',
    conductorNombre: '',
    ruta: '',
    corrida: '',
    corridaPerdida: '',
    corridaPerdidaOtro: '',
  });

  const unidadesReservaFiltradas = useMemo(() => {
    const filtro = searchReserva.trim().toLowerCase();
    if (!filtro) return unidadesReserva || [];
    return (unidadesReserva || []).filter((u) =>
      `${u.display} ${u.eco} ${u.tarjeton}`.toLowerCase().includes(filtro) ||
      String(u.tarjeton).toLowerCase().includes(filtro)
    );
  }, [searchReserva, unidadesReserva]);

  const ciclosRef = useRef(null);
  const rutaRef = useRef(null);
  const tarjetonRef = useRef(null);
  const motivoRef = useRef(null);

  useEffect(() => {
    setPerdidaCiclos(datosOperativos.ciclo || '');
    setPerdidaMotivo(datosOperativos.motivo || '');
    setHuboCorridasPerdidas(!!datosOperativos.ciclo);
  }, [datosOperativos]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ciclosRef.current && !ciclosRef.current.contains(e.target)) {
        setDropdownCiclosOpen(false);
      }
      if (rutaRef.current && !rutaRef.current.contains(e.target)) {
        setDropdownRutaOpen(false);
      }
      if (tarjetonRef.current && !tarjetonRef.current.contains(e.target)) {
        setDropdownTarjetonOpen(false);
      }
      if (motivoRef.current && !motivoRef.current.contains(e.target)) {
        setDropdownMotivoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ciclosOptions = [
    { value: '0.5', label: '1/2' },
    { value: '1', label: '1' },
    { value: '1.5', label: '1 1/2' },
    { value: '2', label: '2' },
    { value: '2.5', label: '2 1/2' },
    { value: '3', label: '3' },
    { value: '3.5', label: '3 1/2' },
    { value: '4', label: '4' },
    { value: '4.5', label: '4 1/2' },
    { value: '5', label: '5' },
  ];

  const handleToggleCorridasPerdidas = async (valor) => {
    setHuboCorridasPerdidas(valor);
    if (!valor) {
      setPerdidaCiclos('');
      setPerdidaMotivo('');
      setDropdownCiclosOpen(false);
      await handleSavePerdida(null, null);
    }
  };

  const handleSavePerdida = async (cicloVal, motivoVal) => {
    setGuardandoPerdida(true);
    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const ecoNum = selectedOption.replace(/\D/g, '');
      const response = await fetch(`${API_BASE}/api/despacho/actualizar-adicionales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tipo: configActual.id,
          numero_eco: ecoNum,
          ciclo: cicloVal || null,
          motivo: motivoVal || null
        })
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        const Swal = (await import('sweetalert2')).default;
        if (cicloVal) {
          Swal.fire({
            icon: 'success',
            title: 'Registro Actualizado',
            text: 'Corrida perdida guardada correctamente.',
            confirmButtonColor: '#c29b53',
            timer: 2000
          });
        } else if (datosOperativos.ciclo) {
          Swal.fire({
            icon: 'success',
            title: 'Registro Actualizado',
            text: 'Se eliminó el registro de corrida perdida.',
            confirmButtonColor: '#c29b53',
            timer: 2000
          });
        }
        datosOperativos.ciclo = cicloVal || '';
        datosOperativos.motivo = motivoVal || '';
      } else {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: result.message || 'No se pudo guardar la corrida perdida.',
          confirmButtonColor: '#6b1d33'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGuardandoPerdida(false);
    }
  };

  const handlePlataformaMovimiento = (tipoMovimiento) => {
    setModalPlataformaVisible(tipoMovimiento);
    setPlatMotivo('');
    setPlatEstatus('');
    setPlatConductor('');
    setPlatRuta('');
    setPlatError('');
    setReemplazoActivo(false);
    setUnidadReemplazoSeleccionada(null);
    setSearchReserva('');
    setReemplazoForm({
      unidadNuevaEco: '',
      tarjeton: '',
      conductorNombre: '',
      ruta: '',
      corrida: datosOperativos.corrida || '',
      corridaPerdida: datosOperativos.ciclo || '',
      corridaPerdidaOtro: datosOperativos.motivo || '',
    });
  };

  const handleToggleReemplazo = () => {
    const nuevo = !reemplazoActivo;
    setReemplazoActivo(nuevo);
    if (nuevo) {
      setUnidadReemplazoSeleccionada(null);
      setSearchReserva('');
      setReemplazoForm((prev) => ({
        ...prev,
        unidadNuevaEco: '',
        tarjeton: datosOperativos.tarjeton || '',
        conductorNombre: datosOperativos.conductor || '',
        ruta: datosOperativos.ruta || '',
        corrida: datosOperativos.corrida || '',
        corridaPerdida: datosOperativos.ciclo || '',
        corridaPerdidaOtro: datosOperativos.corridaPerdidaOtro || '',
      }));
    }
  };

  const handleSelectReservaUnit = (unidad) => {
    setUnidadReemplazoSeleccionada(unidad);
    const disponible = conductoresDisponibles.find((c) => c.tarjeton === unidad.tarjeton);
    setReemplazoForm((prev) => ({
      ...prev,
      unidadNuevaEco: unidad.display || `ECO${String(unidad.eco).padStart(3, '0')}`,
      tarjeton: disponible ? unidad.tarjeton : '',
      conductorNombre: disponible ? disponible.nombre : prev.conductorNombre,
    }));
  };

  const handleTarjetonSelect = (tarjeton) => {
    const conductor = conductoresDisponibles.find((c) => String(c.tarjeton) === String(tarjeton));
    setReemplazoForm((prev) => ({
      ...prev,
      tarjeton,
      conductorNombre: conductor ? conductor.nombre : prev.conductorNombre,
    }));
  };

  const handleRutaTipoChange = (tipo) => {
    setRutaTipoSeleccionada(tipo);
    setReemplazoForm((prev) => ({ ...prev, ruta: '' }));
  };

  const handleCorridaPerdidaChange = (value) => {
    setReemplazoForm((prev) => ({
      ...prev,
      corridaPerdida: value,
      corridaPerdidaOtro: value === 'OTRO' ? prev.corridaPerdidaOtro : '',
    }));
  };

  const handleConfirmarPlataforma = async () => {
    if (modalPlataformaVisible === 'INCORPORACION') {
      if (!platConductor || !platRuta) {
        setPlatError('Faltan datos de la incorporación.');
        return;
      }
      setPlatError('');
      setGuardandoPerdida(true);
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const ecoNum = selectedOption.replace(/\D/g, '');
        const payload = {
          numero_eco: ecoNum,
          tipo: configActual.id,
          tipo_movimiento: 'INCORPORACION',
          conductor: platConductor,
          ruta: platRuta
        };
        const response = await fetch(`${API_BASE}/api/plataforma/movimiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
          console.error('❌ Error response:', result);
          throw new Error(result.error || result.message || 'Error al incorporar unidad');
        }
        if (typeof onUpdate === 'function') onUpdate();
        setModalPlataformaVisible(null);
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({ icon: 'success', title: 'Éxito', text: `Unidad ECO${ecoNum} en operación.`, confirmButtonColor: '#6b1d33' });
      } catch (error) {
        console.error(error);
        const Swal = (await import('sweetalert2')).default;
        Swal.fire('Error', error.message || 'Ocurrió un error al incorporar la unidad.', 'error');
      } finally {
        setGuardandoPerdida(false);
      }
    } else {
      if (!platMotivo || !platEstatus) {
        setPlatError('Debe ingresar un motivo y seleccionar un destino.');
        return;
      }
      if (reemplazoActivo && (!reemplazoForm.unidadNuevaEco || !reemplazoForm.tarjeton || !reemplazoForm.ruta)) {
        setPlatError('Completa la unidad en reserva, tarjetón disponible y ruta para el reemplazo.');
        return;
      }
      setPlatError('');
      setGuardandoPerdida(true);
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const ecoNum = selectedOption.replace(/\D/g, '');
        const payload = {
          numero_eco: ecoNum,
          tipo: configActual.id,
          tipo_movimiento: 'DESINCORPORACION',
          motivo: platMotivo,
          estatus_nuevo: platEstatus.toUpperCase(),
          reemplazo_activo: reemplazoActivo ? 1 : 0,
          unidad_reemplazo: reemplazoForm.unidadNuevaEco || null,
          tarjeton_reemplazo: reemplazoForm.tarjeton || null,
          conductor_reemplazo: reemplazoForm.conductorNombre || null,
          ruta_reemplazo: reemplazoForm.ruta || null,
          corrida_reemplazo: reemplazoForm.corrida || null,
          corridas_perdidas_reemplazo: reemplazoForm.corridaPerdida || null,
          corrida_perdida_otro: reemplazoForm.corridaPerdidaOtro || null,
        };
        const response = await fetch(`${API_BASE}/api/plataforma/movimiento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
          console.error('❌ Error response:', result);
          throw new Error(result.error || result.message || 'Error al desincorporar unidad');
        }
        if (typeof onUpdate === 'function') onUpdate();
        
        datosOperativos.conductor = null;
        datosOperativos.ruta = null;

        setModalPlataformaVisible(null);
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({ icon: 'success', title: 'Éxito', text: `Unidad ECO${ecoNum} desincorporada a ${platEstatus}.`, confirmButtonColor: '#6b1d33' });
      } catch (error) {
        console.error(error);
        const Swal = (await import('sweetalert2')).default;
        Swal.fire('Error', error.message || 'Ocurrió un error al desincorporar la unidad.', 'error');
      } finally {
        setGuardandoPerdida(false);
      }
    }
  };

  const handleHacerCheckList = () => {
    setShowChecklist(true);
  };

  const getConductorDisplay = () => {
    const val = datosOperativos.conductor;
    if (!val || val === 'Sin conductor') return 'No asignado';
    const isNum = !isNaN(val) && String(val).trim() !== '';
    if (isNum) {
      const found = CONDUCTORES.find(c => c.id === Number(val));
      if (found) return found.nombre;
    }
    return val;
  };

  const handleRevisarCheckList = () => {
    if (recentChecklist) {
      setViewingChecklist(true);
    }
  };

  const checkHistory = async (ecoNumber) => {
    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      if (!token) return;
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/api/checklists?period=daily&date=${today}&economico=${ecoNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checklists && data.checklists.length > 0) {
          const latest = data.checklists[0];
          setHasCompletedChecklist(true);
          setRecentChecklist(latest);
        } else {
          setHasCompletedChecklist(false);
          setRecentChecklist(null);
        }
      }
    } catch (e) {
      console.error("Error al revisar historial", e);
    }
  };

  useEffect(() => {
    setRecentChecklist(null);
    setHasCompletedChecklist(false);
    setShowChecklist(false);
    setViewingChecklist(false);
    if (selectedOption) {
      const ecoNum = selectedOption.replace(/\D/g, '');
      if (ecoNum) {
        checkHistory(ecoNum);
      }
    }
  }, [selectedOption]);

  useEffect(() => {
    setFormTarjeton(datosOperativos.tarjeton || '');
  }, [datosOperativos.tarjeton]);

  const handleConfirmTarjeton = async (overrideValue = null) => {
    const val = typeof overrideValue === 'string' ? overrideValue : formTarjeton;
    if (!val.trim() || val === datosOperativos.tarjeton) {
      setEditandoTarjeton(false);
      return;
    }
    setGuardandoTarjeton(true);
    try {
      await handleSaveTarjeton(val.trim());
      setEditandoTarjeton(false);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoTarjeton(false);
    }
  };

  const handleCancelTarjetonEdit = () => {
    setFormTarjeton(datosOperativos.tarjeton || '');
    setEditandoTarjeton(false);
  };

  const handleConfirmRuta = async (nuevaRutaStr = null) => {
    const rutaAUsar = typeof nuevaRutaStr === 'string' ? nuevaRutaStr.trim() : formRuta.trim();
    if (!rutaAUsar || rutaAUsar === datosOperativos.ruta) {
      setEditandoRuta(false);
      return;
    }
    setGuardandoRuta(true);
    try {
      if (handleSaveRuta) {
        await handleSaveRuta(rutaAUsar);
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'success',
          title: 'Ruta Actualizada',
          text: `La ruta se cambió exitosamente a ${rutaAUsar}.`,
          confirmButtonColor: '#c29b53',
          timer: 2000
        });
      }
      setEditandoRuta(false);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoRuta(false);
    }
  };

  const handleCancelRutaEdit = () => {
    setFormRuta(datosOperativos.ruta || '');
    setEditandoRuta(false);
  };

  // ==================== JSX ====================
  return (
    <div className="unit-dashboard-container animate-fade-in-up">
      {/* CARD ENCABEZADO DE UNIDAD */}
      <div className="dashboard-header-card">
        <div className="dashboard-header-card__left">
          <div className="dashboard-header-card__icon-box">
            <img src={configActual.image} alt={configActual.title} className="dashboard-header-card__image" />
          </div>
          <div>
            <div className="dashboard-header-card__eyebrow">{configActual.title}</div>
            <h2 className="dashboard-header-card__eco">{selectedOption}</h2>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* CARD 1: INFORMACIÓN DE TRABAJO */}
        <div className="info-card">
          <div className="info-card__header">
            <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h3 className="info-card__title">Servicio Activo</h3>
          </div>
          <div className="info-card__body">
            {/* Conductor Asignado */}
            <div className="info-card__item">
              <span className="info-card__label">Conductor Asignado</span>
              <div className="info-card__value-wrapper">
                <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="info-card__value" style={{ fontSize: '0.9rem' }}>
                  {cargandoDatos ? 'Buscando...' : getConductorDisplay()}
                </p>
              </div>
            </div>

            {/* Ruta Asignada */}
            <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
              <span className="info-card__label">Ruta Asignada</span>
              {!isPlataforma && !isReservaOrMantenimiento ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', position: 'relative' }}>
                  <div ref={rutaRef} style={{ position: 'relative', width: '100%', zIndex: dropdownRutaOpen ? 50 : 1 }}>
                    <button
                      type="button"
                      className="interactive-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 0.85rem',
                        cursor: guardandoRuta ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        background: 'var(--tw-color-white)',
                        height: '2.3rem',
                        fontSize: '0.85rem',
                        width: '100%',
                        fontWeight: 'bold',
                        opacity: guardandoRuta ? 0.7 : 1
                      }}
                      onClick={() => !guardandoRuta && setDropdownRutaOpen(!dropdownRutaOpen)}
                    >
                      {guardandoRuta ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--tw-color-gray-600)', margin: 0 }}></span>
                          <span style={{ color: 'var(--tw-color-gray-600)', fontWeight: 'normal' }}>Guardando...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{ overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3 }}>{formRuta || (datosOperativos.ruta || 'SELECCIONAR')}</span>
                          <svg className={`arrow-icon ${dropdownRutaOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownRutaOpen ? 'rotate(180deg)' : 'none', width: '0.85rem', height: '0.85rem', marginLeft: '0.5rem', flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {dropdownRutaOpen && (
                      <div className="dropdown-menu" style={{ width: '100%', minWidth: 'unset', top: '100%', background: 'var(--tw-color-white)', opacity: 1, zIndex: 999 }}>
                        <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                          <button
                            type="button"
                            className="dropdown-menu__item"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)' }}
                            onClick={() => {
                              setFormRuta('');
                              setDropdownRutaOpen(false);
                              handleConfirmRuta('');
                            }}
                          >
                            SELECCIONAR
                          </button>
                          {rutasOpciones.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              className="dropdown-menu__item"
                              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)', fontWeight: formRuta === r ? 'bold' : 'normal' }}
                              onClick={() => {
                                setFormRuta(r);
                                setDropdownRutaOpen(false);
                                handleConfirmRuta(r);
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="info-card__value-wrapper" style={{ justifyContent: 'space-between', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="info-card__value">
                      {cargandoDatos ? 'Buscando...' : (datosOperativos.ruta || 'Sin ruta')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Número de Tarjetón (Editable) */}
            <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
              <span className="info-card__label">Número de Tarjetón</span>
              {!isPlataforma && !isReservaOrMantenimiento ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', position: 'relative' }}>
                  <div ref={tarjetonRef} style={{ position: 'relative', width: '100%', zIndex: dropdownTarjetonOpen ? 50 : 1 }}>
                    <div
                      className="interactive-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 0.85rem',
                        background: 'var(--tw-color-white)',
                        height: '2.3rem',
                        width: '100%',
                        fontWeight: 'bold',
                        opacity: guardandoTarjeton ? 0.7 : 1,
                        borderColor: dropdownTarjetonOpen ? 'var(--brand-maroon-text)' : undefined,
                      }}
                    >
                      {guardandoTarjeton ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--tw-color-gray-600)', margin: 0 }}></span>
                          <span style={{ color: 'var(--tw-color-gray-600)', fontWeight: 'normal', fontSize: '0.85rem' }}>Guardando...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <input
                            type="text"
                            placeholder={datosOperativos.tarjeton ? String(datosOperativos.tarjeton) : "Buscar o escribir tarjetón..."}
                            value={formTarjeton}
                            onChange={(e) => {
                              setFormTarjeton(e.target.value);
                              setDropdownTarjetonOpen(true);
                            }}
                            onFocus={() => setDropdownTarjetonOpen(true)}
                            style={{
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              width: '100%',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              color: dropdownTarjetonOpen ? 'var(--brand-maroon-text)' : 'inherit',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleConfirmTarjeton();
                                setDropdownTarjetonOpen(false);
                              } else if (e.key === 'Escape') {
                                setFormTarjeton('');
                                setDropdownTarjetonOpen(false);
                              }
                            }}
                          />
                          <svg
                            onClick={() => setDropdownTarjetonOpen(!dropdownTarjetonOpen)}
                            className={`arrow-icon ${dropdownTarjetonOpen ? 'dropdown-trigger__arrow--open' : ''}`}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: dropdownTarjetonOpen ? 'rotate(180deg)' : 'none', width: '1.2rem', height: '1.2rem', padding: '0.2rem', color: dropdownTarjetonOpen ? 'var(--brand-maroon-text)' : 'inherit', flexShrink: 0, marginLeft: '0.5rem' }}
                            fill="currentColor" viewBox="0 0 24 24"
                          >
                            <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {dropdownTarjetonOpen && !guardandoTarjeton && (
                      <div className="dropdown-menu" style={{ width: '100%', minWidth: 'unset', top: '100%', background: 'var(--tw-color-white)', opacity: 1, zIndex: 999 }}>
                        <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                          <button
                            type="button"
                            className="dropdown-menu__item"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)' }}
                            onClick={() => {
                              handleCancelTarjetonEdit();
                              setDropdownTarjetonOpen(false);
                            }}
                          >
                            CANCELAR
                          </button>
                          {(conductoresDisponibles || [])
                            .filter(c => {
                              const search = formTarjeton.toLowerCase().trim();
                              const currentTarjeton = String(datosOperativos.tarjeton || '').toLowerCase().trim();
                              if (search === currentTarjeton || search === '') {
                                return true;
                              }
                              return c.nombre.toLowerCase().includes(search) || c.id.toString().includes(search);
                            })
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="dropdown-menu__item"
                                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)', textAlign: 'left', fontWeight: 'normal', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onClick={async () => {
                                  if (c.estado_servicio === 'falta') {
                                    const confirm = await Swal.fire({
                                      title: 'Confirmar asignación',
                                      text: `El operador ${c.nombre} está en estatus de FALTA. ¿Deseas asignarlo a esta unidad y cambiar su estatus a EN SERVICIO?`,
                                      icon: 'warning',
                                      showCancelButton: true,
                                      confirmButtonColor: '#c5a059',
                                      cancelButtonColor: '#6b7280',
                                      confirmButtonText: 'Sí, asignar',
                                      cancelButtonText: 'Cancelar'
                                    });
                                    if (!confirm.isConfirmed) return;
                                  }
                                  setFormTarjeton(c.id.toString());
                                  setDropdownTarjetonOpen(false);
                                  handleConfirmTarjeton(c.id.toString());
                                }}
                              >
                                <span>{c.id} - {c.nombre}</span>
                                {c.estado_servicio === 'falta' && (
                                  <span style={{
                                    fontSize: '0.65rem',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    fontWeight: '700'
                                  }}>
                                    FALTA
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="info-card__value-wrapper" style={{ justifyContent: 'space-between', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.378-1.377 2.622-1.377 4 0" />
                    </svg>
                    <p className="info-card__value">
                      {cargandoDatos ? 'Buscando...' : (datosOperativos.tarjeton || 'No asignado')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: DETALLES DE DESPACHO (EXCEL) */}
        <div className="info-card">
          <div className="info-card__header">
            <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="info-card__title">Despacho</h3>
          </div>
          <div className="info-card__body spec-badges grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="info-card__item">
              <span className="info-card__label">Corrida</span>
              <div className="badge-display badge-display--maroon">
                <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span className="badge-display__text">
                  {cargandoDatos ? '...' : (datosOperativos.corrida || 'No asignada')}
                </span>
              </div>
            </div>

            <div className="info-card__item">
              <span className="info-card__label">Hora de arribo</span>
              <div className="badge-display badge-display--gold" style={{ padding: 0, overflow: 'visible', position: 'relative', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                <button
                  type="button"
                  disabled={isPlataforma || isReservaOrMantenimiento}
                  onClick={() => { setDropdownHoraOpen(!dropdownHoraOpen); setDropdownAcopleOpen(false); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    width: '100%',
                    padding: '0.5rem 0.5rem 0.5rem 2.2rem',
                    outline: 'none',
                    cursor: (isPlataforma || isReservaOrMantenimiento) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                    {formHoraProgramada || '--:--'}
                  </span>
                  <svg className={`arrow-icon ${dropdownHoraOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownHoraOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                  </svg>
                </button>
                <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>

                {dropdownHoraOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                      onClick={(e) => { e.stopPropagation(); setDropdownHoraOpen(false); }}
                      role="button"
                      tabIndex={-1}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setDropdownHoraOpen(false);
                        }
                      }}
                    />
                    <IOSTimePicker
                      value={formHoraProgramada}
                      onChange={setFormHoraProgramada}
                      onClose={() => setDropdownHoraOpen(false)}
                      onSave={async () => {
                        if (handleSaveHoras) {
                          await handleSaveHoras(formHoraProgramada, formAcople);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* ✅ NUEVO: Hora de salida (automática) */}
            <div className="info-card__item">
              <span className="info-card__label">Hora de salida</span>
              <div className="badge-display badge-display--maroon" style={{ padding: '0.5rem 1rem', opacity: 1 }}>
                <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="badge-display__text" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {formAcople || '--:--'}
                </span>
              </div>
              <p style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.2rem', textAlign: 'center' }}>
                (Se actualiza automáticamente al seleccionar la unidad)
              </p>
            </div>

            {/* Toggle: ¿Hubo corridas perdidas? */}
            {!isPlataforma && (
              <div className="info-card__item">
                <span className="info-card__label">¿Hubo Corridas Perdidas?</span>
                <div style={{
                  display: 'flex',
                  width: '100%',
                  marginTop: '0.25rem',
                  height: '2.3rem',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb'
                }}>
                  <button
                    type="button"
                    disabled={isPlataforma || isReservaOrMantenimiento}
                    onClick={() => handleToggleCorridasPerdidas(true)}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: huboCorridasPerdidas ? '#6b1d33' : 'var(--tw-color-gray-100)',
                      color: huboCorridasPerdidas ? 'var(--tw-color-white)' : 'var(--tw-color-gray-600)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: (isPlataforma || isReservaOrMantenimiento) ? 'not-allowed' : 'pointer',
                      opacity: (isPlataforma || isReservaOrMantenimiento) ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    disabled={isPlataforma || isReservaOrMantenimiento}
                    onClick={() => handleToggleCorridasPerdidas(false)}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderLeft: '1px solid #e5e7eb',
                      background: !huboCorridasPerdidas ? '#6b1d33' : 'var(--tw-color-gray-100)',
                      color: !huboCorridasPerdidas ? 'var(--tw-color-white)' : 'var(--tw-color-gray-600)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: (isPlataforma || isReservaOrMantenimiento) ? 'not-allowed' : 'pointer',
                      opacity: (isPlataforma || isReservaOrMantenimiento) ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    NO
                  </button>
                </div>
              </div>
            )}

            {/* Ciclos Perdidos y Motivo */}
            {!isPlataforma && huboCorridasPerdidas && (
              <>
                <div ref={ciclosRef} className="info-card__item animate-fade-in-up" style={{ position: 'relative', zIndex: dropdownCiclosOpen ? 50 : 1 }}>
                  <span className="info-card__label">Ciclos Perdidos</span>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 0.85rem',
                      marginTop: '0.25rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: 'var(--tw-color-white)',
                      height: '2.3rem',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => setDropdownCiclosOpen(!dropdownCiclosOpen)}
                  >
                    <span style={{ overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {perdidaCiclos ? ciclosOptions.find(opt => opt.value === perdidaCiclos)?.label + ' CICLOS' : 'SELECCIONAR'}
                    </span>
                    <svg className={`arrow-icon ${dropdownCiclosOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownCiclosOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>

                  {dropdownCiclosOpen && (
                    <div className="dropdown-menu" style={{ width: '100%', minWidth: 'unset', top: '100%', background: 'var(--tw-color-white)', opacity: 1, zIndex: 999 }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                        <button
                          type="button"
                          className="dropdown-menu__item"
                          style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)' }}
                          onClick={() => {
                            setPerdidaCiclos('');
                            setDropdownCiclosOpen(false);
                            handleSavePerdida('', perdidaMotivo);
                          }}
                        >
                          SELECCIONAR
                        </button>
                        {ciclosOptions.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            className="dropdown-menu__item"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)', fontWeight: perdidaCiclos === opt.value ? 'bold' : 'normal' }}
                            onClick={() => {
                              setPerdidaCiclos(opt.value);
                              setDropdownCiclosOpen(false);
                              handleSavePerdida(opt.value, perdidaMotivo);
                            }}
                          >
                            {opt.label} CICLOS
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div ref={motivoRef} className="info-card__item animate-fade-in-up" style={{ position: 'relative', zIndex: dropdownMotivoOpen ? 50 : 1 }}>
                  <span className="info-card__label">Motivo (Obligatorio)</span>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 0.85rem',
                      marginTop: '0.25rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: 'var(--tw-color-white)',
                      height: '2.3rem',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => setDropdownMotivoOpen(!dropdownMotivoOpen)}
                  >
                    <span style={{ overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {perdidaMotivo || 'SELECCIONAR MOTIVO'}
                    </span>
                    <svg className={`arrow-icon ${dropdownMotivoOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownMotivoOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {dropdownMotivoOpen && (
                    <div className="dropdown-menu" style={{ width: '100%', minWidth: 'unset', top: '100%', background: 'var(--tw-color-white)', opacity: 1, zIndex: 999 }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                        <button
                          type="button"
                          className="dropdown-menu__item"
                          style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)' }}
                          onClick={() => {
                            setPerdidaMotivo('');
                            setDropdownMotivoOpen(false);
                            handleSavePerdida(perdidaCiclos, '');
                          }}
                        >
                          SELECCIONAR MOTIVO
                        </button>
                        {['FALTA DE OPERADOR', 'MANTENIMIENTO', 'ACCIDENTE', 'FALTA DE COMBUSTIBLE', 'CONDICIONES CLIMATICAS', 'DESVIO OPERACIONAL'].map((motivo) => (
                          <button
                            key={motivo}
                            type="button"
                            className="dropdown-menu__item"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)', fontWeight: perdidaMotivo === motivo ? 'bold' : 'normal' }}
                            onClick={() => {
                              setPerdidaMotivo(motivo);
                              setDropdownMotivoOpen(false);
                              handleSavePerdida(perdidaCiclos, motivo);
                            }}
                          >
                            {motivo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* INCORPORAR / DESINCORPORAR para PLATAFORMA */}
            {isPlataforma && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', width: '100%' }}>
                <span className="info-card__label">Movimientos de Plataforma</span>
                <div style={{
                  display: 'flex',
                  width: '100%',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => handlePlataformaMovimiento('INCORPORACION')}
                    disabled={datosOperativos.estatus === 'operacion'}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: datosOperativos.estatus === 'operacion' ? 'var(--tw-color-gray-100)' : '#6b1d33',
                      color: datosOperativos.estatus === 'operacion' ? 'var(--tw-color-gray-400)' : 'white',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: datosOperativos.estatus === 'operacion' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    INCORPORAR
                  </button>
                  <button
                    onClick={() => handlePlataformaMovimiento('DESINCORPORACION')}
                    disabled={datosOperativos.estatus === 'reserva' || datosOperativos.estatus === 'mantenimiento'}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderLeft: '1px solid #e5e7eb',
                      background: (datosOperativos.estatus === 'reserva' || datosOperativos.estatus === 'mantenimiento') ? 'var(--tw-color-gray-100)' : '#6b1d33',
                      color: (datosOperativos.estatus === 'reserva' || datosOperativos.estatus === 'mantenimiento') ? 'var(--tw-color-gray-400)' : 'white',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: (datosOperativos.estatus === 'reserva' || datosOperativos.estatus === 'mantenimiento') ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    DESINCORPORAR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REACT MODAL PARA PLATAFORMA */}
      {modalPlataformaVisible && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalPlataformaVisible(null); }}
          role="button"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') setModalPlataformaVisible(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-fade-in-up" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', overflowX: 'hidden', minWidth: '22rem' }}>
            <h2 className="text-xl font-bold text-slate-800 text-center mb-6">
              {modalPlataformaVisible === 'INCORPORACION' ? 'Incorporar Unidad' : 'Desincorporar Unidad'}
            </h2>

            {modalPlataformaVisible === 'INCORPORACION' && (
              <div className="flex flex-col gap-4">
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.8rem', fontSize: '0.9rem', width: '100%', border: '1px solid #e5e7eb', borderRadius: '0.75rem'
                    }}
                    onClick={() => setPlatConductorDropdown(!platConductorDropdown)}
                  >
                    <span style={{ fontWeight: 600, color: platConductor ? '#0b162c' : '#94a3b8', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {platConductor ? conductoresDisponibles.find(c => c.id == platConductor)?.nombre + ` (${platConductor})` : 'Seleccione un conductor...'}
                    </span>
                    <svg className={`arrow-icon ${platConductorDropdown ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: platConductorDropdown ? 'rotate(180deg)' : 'none', width: '1rem', height: '1rem', color: '#6b1d33', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {platConductorDropdown && (
                    <div className="dropdown-menu shadow-lg border border-slate-100" style={{ width: '100%', minWidth: 'unset', top: 'calc(100% + 4px)', background: 'var(--tw-color-white)', opacity: 1, zIndex: 9999, borderRadius: '0.75rem' }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '14rem' }}>
                        {conductoresDisponibles.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: platConductor == c.id ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                            onClick={() => {
                              setPlatConductor(c.id);
                              setPlatConductorDropdown(false);
                            }}
                          >
                            {c.nombre} ({c.id})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.8rem', fontSize: '0.9rem', width: '100%', border: '1px solid #e5e7eb', borderRadius: '0.75rem'
                    }}
                    onClick={() => setPlatRutaDropdown(!platRutaDropdown)}
                  >
                    <span style={{ fontWeight: 600, color: platRuta ? '#0b162c' : '#94a3b8', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {platRuta || 'Seleccione una ruta...'}
                    </span>
                    <svg className={`arrow-icon ${platRutaDropdown ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: platRutaDropdown ? 'rotate(180deg)' : 'none', width: '1rem', height: '1rem', color: '#6b1d33', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {platRutaDropdown && (
                    <div className="dropdown-menu shadow-lg border border-slate-100" style={{ width: '100%', minWidth: 'unset', top: 'calc(100% + 4px)', background: 'var(--tw-color-white)', opacity: 1, zIndex: 9999, borderRadius: '0.75rem' }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '14rem' }}>
                        {(rutasOpciones || []).map(r => (
                          <button
                            key={r}
                            type="button"
                            className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: platRuta == r ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                            onClick={() => {
                              setPlatRuta(r);
                              setPlatRutaDropdown(false);
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {modalPlataformaVisible === 'DESINCORPORACION' && (
              <div className="flex flex-col gap-4">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={reemplazoActivo}
                    onChange={handleToggleReemplazo}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  Reemplazar unidad original por una unidad en reserva
                </label>

                {reemplazoActivo && (
                  <div style={{ display: 'grid', gap: '1rem', padding: '1rem', borderRadius: '1rem', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                      <span className="info-card__label">Unidad original</span>
                      <div style={{ padding: '0.95rem 1rem', borderRadius: '0.75rem', background: 'white', border: '1px solid #d1d5db', minHeight: '3rem', display: 'flex', alignItems: 'center' }}>
                        <span style={{ overflowWrap: 'anywhere', lineHeight: 1.3, color: '#0b162c' }}>{selectedOption}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                      <span className="info-card__label">Buscar unidad en reserva</span>
                      <input
                        type="text"
                        value={searchReserva}
                        onChange={(e) => setSearchReserva(e.target.value)}
                        placeholder="Buscar ECO o tarjetón en reserva"
                        className="interactive-input"
                        style={{ width: '100%', padding: '1rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', minWidth: '0' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {unidadesReservaFiltradas.length ? (
                        unidadesReservaFiltradas.map((unidad) => (
                          <button
                            key={unidad.eco}
                            type="button"
                            onClick={() => handleSelectReservaUnit(unidad)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '0.95rem 1rem', borderRadius: '0.75rem',
                              border: unidadReemplazoSeleccionada?.eco === unidad.eco ? '2px solid #6b1d33' : '1px solid #e5e7eb',
                              backgroundColor: unidadReemplazoSeleccionada?.eco === unidad.eco ? '#f8eef0' : 'white',
                              cursor: 'pointer',
                              minHeight: '3.1rem',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, overflowWrap: 'anywhere', lineHeight: 1.3, display: 'block', width: '100%' }}>{unidad.display}</span>
                              <span style={{ color: '#6b7280', flexShrink: 0, marginLeft: '0.5rem' }}>{unidad.tarjeton || 'Sin tarjetón'}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>No se encontraron unidades en reserva.</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gap: '0.95rem' }}>
                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <span className="info-card__label">Nuevo ECO</span>
                        <select
                          value={unidadReemplazoSeleccionada?.eco || ''}
                          onChange={(e) => {
                            const unidad = unidadesReserva.find((u) => String(u.eco) === String(e.target.value));
                            if (unidad) handleSelectReservaUnit(unidad);
                          }}
                          className="interactive-input"
                          style={{ width: '100%', minHeight: '3rem', height: 'auto', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: '#f8fafc', minWidth: '0', boxSizing: 'border-box', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                        >
                          <option value="">Seleccione una unidad de reserva</option>
                          {unidadesReservaFiltradas.map((unidad) => (
                            <option key={unidad.eco} value={unidad.eco}>
                              {unidad.display} {unidad.tarjeton ? `(${unidad.tarjeton})` : '(Sin tarjetón)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <span className="info-card__label">Tarjetón (disponible)</span>
                        <select
                          value={reemplazoForm.tarjeton}
                          onChange={(e) => handleTarjetonSelect(e.target.value)}
                          className="interactive-input"
                          style={{ width: '100%', minHeight: '3rem', height: 'auto', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white', boxSizing: 'border-box', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                        >
                          <option value="">Seleccione un tarjetón</option>
                          {conductoresDisponibles.map((c) => (
                            <option key={c.id} value={c.tarjeton}>
                              {c.tarjeton} — {c.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <span className="info-card__label">Conductor</span>
                        <input
                          type="text"
                          value={reemplazoForm.conductorNombre}
                          onChange={(e) => setReemplazoForm((prev) => ({ ...prev, conductorNombre: e.target.value }))}
                          placeholder="Nombre del conductor"
                          className="interactive-input"
                          style={{ width: '100%', minHeight: '3rem', height: 'auto', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: '0.35rem' }}>
                        <span className="info-card__label">Tipo de ruta</span>
                        <select
                          value={rutaTipoSeleccionada}
                          onChange={(e) => handleRutaTipoChange(e.target.value)}
                          className="interactive-input"
                          style={{ width: '100%', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white', minWidth: '0' }}
                        >
                          <option value="troncales">Troncales</option>
                          <option value="alimentadoras">Alimentadoras</option>
                        </select>
                      </div>

                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <span className="info-card__label">Ruta</span>
                        <select
                          value={reemplazoForm.ruta}
                          onChange={(e) => setReemplazoForm((prev) => ({ ...prev, ruta: e.target.value }))}
                          className="interactive-input"
                          style={{ width: '100%', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white', minWidth: '0', whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                        >
                          <option value="">Seleccione una ruta</option>
                          {rutaOptionsByType[rutaTipoSeleccionada].map((ruta) => (
                            <option key={ruta} value={ruta}>{ruta}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <span className="info-card__label">Corrida</span>
                        <input
                          type="text"
                          value={reemplazoForm.corrida}
                          onChange={(e) => setReemplazoForm((prev) => ({ ...prev, corrida: e.target.value }))}
                          placeholder="Ej. 123"
                          className="interactive-input"
                          style={{ width: '100%', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', minWidth: '0' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <span className="info-card__label">Corridas Perdidas</span>
                        <select
                          value={reemplazoForm.corridaPerdida}
                          onChange={(e) => handleCorridaPerdidaChange(e.target.value)}
                          className="interactive-input"
                          style={{ width: '100%', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white', minWidth: '0' }}
                        >
                          <option value="">Seleccione una opción</option>
                          {corridasPerdidasOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      {reemplazoForm.corridaPerdida === 'OTRO' && (
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                          <span className="info-card__label">Especifique corridas perdidas</span>
                          <input
                            type="text"
                            value={reemplazoForm.corridaPerdidaOtro}
                            onChange={(e) => setReemplazoForm((prev) => ({ ...prev, corridaPerdidaOtro: e.target.value }))}
                            placeholder="Escribe aquí"
                            className="interactive-input"
                            style={{ width: '100%', padding: '0.95rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', minWidth: '0' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <textarea
                  className="interactive-input"
                  style={{ width: '100%', height: '100px', resize: 'none', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#0b162c', fontWeight: 500 }}
                  placeholder="Escribe el motivo de la desincorporación aquí..."
                  value={platMotivo}
                  onChange={(e) => setPlatMotivo(e.target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').toUpperCase())}
                />

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.8rem', fontSize: '0.9rem', width: '100%', border: '1px solid #e5e7eb', borderRadius: '0.75rem'
                    }}
                    onClick={() => setPlatEstatusDropdown(!platEstatusDropdown)}
                  >
                    <span style={{ fontWeight: 600, color: platEstatus ? '#0b162c' : '#94a3b8', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {platEstatus || 'Destino de la unidad...'}
                    </span>
                    <svg className={`arrow-icon ${platEstatusDropdown ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: platEstatusDropdown ? 'rotate(180deg)' : 'none', width: '1rem', height: '1rem', color: '#6b1d33', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {platEstatusDropdown && (
                    <div className="dropdown-menu shadow-lg border border-slate-100" style={{ width: '100%', minWidth: 'unset', top: 'calc(100% + 4px)', background: 'var(--tw-color-white)', opacity: 1, zIndex: 9999, borderRadius: '0.75rem' }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '14rem' }}>
                        {['RESERVA', 'MANTENIMIENTO'].map(r => (
                          <button
                            key={r}
                            type="button"
                            className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: platEstatus == r ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                            onClick={() => {
                              setPlatEstatus(r);
                              setPlatEstatusDropdown(false);
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {platError && (
              <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: '500' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{platError}</span>
              </div>
            )}

            <div style={{ display: 'flex', width: '100%', marginTop: '2rem', height: '3rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={handleConfirmarPlataforma}
                disabled={guardandoPerdida}
                style={{
                  flex: 1, border: 'none', background: '#c29b53', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {guardandoPerdida ? 'GUARDANDO...' : modalPlataformaVisible === 'INCORPORACION' ? 'INCORPORAR' : 'DESINCORPORAR'}
              </button>
              <button
                type="button"
                onClick={() => setModalPlataformaVisible(null)}
                style={{
                  flex: 1, border: 'none', borderLeft: '1px solid #e5e7eb', background: '#6b1d33', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}