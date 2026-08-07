// src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx
import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CONDUCTORES from '../../../data/conductores';
import API_BASE from '../../../config/api';
import Swal from 'sweetalert2';

import IOSTimePicker from './IOSTimePicker';
import { AuthContext } from '../../../context/AuthContext';

const LiveClockSalida = ({ horaCongelada, onGuardar, disabled }) => {
  const [ahora, setAhora] = useState(new Date());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (horaCongelada) return;
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, [horaCongelada]);

  let horas12, minutos, segundos, ampm, separador;

  if (horaCongelada) {
    const partes = horaCongelada.split(':');
    const h24 = parseInt(partes[0] || '0', 10);
    ampm = h24 >= 12 ? 'P.M.' : 'A.M.';
    horas12 = String(h24 % 12 || 12).padStart(2, '0');
    minutos = String(partes[1] || '00').padStart(2, '0');
    segundos = String(partes[2] || '00').padStart(2, '0');
    separador = ':';
  } else {
    const horas24 = ahora.getHours();
    ampm = horas24 >= 12 ? 'P.M.' : 'A.M.';
    horas12 = String(horas24 % 12 || 12).padStart(2, '0');
    minutos = String(ahora.getMinutes()).padStart(2, '0');
    segundos = String(ahora.getSeconds()).padStart(2, '0');
    const parpadeo = ahora.getSeconds() % 2 === 0;
    separador = parpadeo ? ':' : ' ';
  }
  
  const horaMostrada = `${horas12}${separador}${minutos}${separador}${segundos} ${ampm}`;
  
  const horas24Save = String(ahora.getHours()).padStart(2, '0');
  const minutosSave = String(ahora.getMinutes()).padStart(2, '0');
  const segundosSave = String(ahora.getSeconds()).padStart(2, '0');
  const horaParaGuardar = `${horas24Save}:${minutosSave}:${segundosSave}`;

  return (
    <div className="info-card__item">
      <span className="info-card__label">Hora de Salida</span>
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
        <div className="badge-display badge-display--maroon" style={{ flex: 1, padding: '0.5rem 1rem' }}>
          <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="badge-display__text" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
            {horaMostrada}
          </span>
        </div>
      </div>
    </div>
  );
};

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
  const [salidaCongelada, setSalidaCongelada] = useState(null);

  const [formHoraProgramada, setFormHoraProgramada] = useState('');
  const [dropdownHoraOpen, setDropdownHoraOpen] = useState(false);
  const [dropdownTarjetonOpen, setDropdownTarjetonOpen] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [guardandoSalida, setGuardandoSalida] = useState(false);

  const isReservaOrMantenimiento = datosOperativos.estatus === 'RESERVA' || datosOperativos.estatus === 'MANTENIMIENTO';

  // Inicializar hora programada y observaciones desde datosOperativos
  useEffect(() => {
    if (datosOperativos.horaProgramada) setFormHoraProgramada(datosOperativos.horaProgramada);
    setObservaciones(datosOperativos.observaciones || '');
  }, [datosOperativos]);

  useEffect(() => {
    setSalidaCongelada(datosOperativos.hora_salida || null);
  }, [datosOperativos.hora_salida, selectedOption]);

  const calculateAcople = (timeStr) => {
    if (!timeStr) return '--:--';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return '--:--';
    const totalMins = h * 60 + m + 30;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const calculatedAcople = calculateAcople(formHoraProgramada);


  const [rutasOpciones, setRutasOpciones] = useState([]);
  const [formRuta, setFormRuta] = useState('');
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [dropdownRutaOpen, setDropdownRutaOpen] = useState(false);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
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
  };

  const handleConfirmarPlataforma = async () => {
    if (modalPlataformaVisible === 'INCORPORACION') {
      if (!platConductor || !platRuta) {
        const Swal = (await import('sweetalert2')).default;
        return Swal.fire('Error', 'Faltan datos de la incorporación.', 'error');
      }
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
        const Swal = (await import('sweetalert2')).default;
        return Swal.fire('Error', 'Debe ingresar un motivo y seleccionar un destino.', 'error');
      }
      setGuardandoPerdida(true);
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const ecoNum = selectedOption.replace(/\D/g, '');
        const payload = {
          numero_eco: ecoNum,
          tipo: configActual.id,
          tipo_movimiento: 'DESINCORPORACION',
          motivo: platMotivo,
          estatus_nuevo: platEstatus.toUpperCase()
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
            {/* 1. Número de Tarjetón (Editable) */}
            <div className="info-card__item">
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
                                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'var(--tw-color-white)', color: 'var(--tw-color-gray-600)', textAlign: 'left', fontWeight: 'normal' }}
                                onClick={() => {
                                  setFormTarjeton(c.id.toString());
                                  setDropdownTarjetonOpen(false);
                                  handleConfirmTarjeton(c.id.toString());
                                }}
                              >
                                {c.id}
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

            {/* 2. Conductor Asignado */}
            <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
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

            {/* 3. Ruta Asignada */}
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
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formRuta || (datosOperativos.ruta || 'SELECCIONAR')}</span>
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

            {/* 4. Corrida */}
            <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
              <span className="info-card__label">Corrida</span>
              <div className="info-card__value-wrapper">
                <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <p className="info-card__value" style={{ fontSize: '0.9rem' }}>
                  {cargandoDatos ? 'Buscando...' : (datosOperativos.corrida || 'No asignada')}
                </p>
              </div>
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

            {/* 4. Hora Programada */}
            <div className="info-card__item">
              <span className="info-card__label">Hora Programada</span>
              <div className="badge-display badge-display--gold" style={{ padding: 0, overflow: 'visible', position: 'relative', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                <button
                  type="button"
                  disabled={isPlataforma || isReservaOrMantenimiento}
                  onClick={() => { setDropdownHoraOpen(!dropdownHoraOpen); }}
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
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
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
                    />
                    <IOSTimePicker
                      value={formHoraProgramada}
                      onChange={setFormHoraProgramada}
                      onClose={() => setDropdownHoraOpen(false)}
                      onSave={async () => {
                        // Al guardar la hora programada no guardamos acople al backend, o si es necesario se le pasa calculatedAcople
                        if (handleSaveHoras) {
                          await handleSaveHoras(formHoraProgramada, calculatedAcople);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* 5. Hora de Acople (+30 min) */}
            <div className="info-card__item">
              <span className="info-card__label">Hora de Acople (+30m)</span>
              <div className="badge-display badge-display--gray" style={{ padding: '0.5rem 1rem', opacity: 1, border: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <svg className="badge-display__icon" style={{ color: '#6b7280' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="badge-display__text" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>
                  {calculatedAcople}
                </span>
              </div>
            </div>

            {/* 6. Hora de Salida (Manual confirm) */}
            <LiveClockSalida
              key={selectedOption || 'none'}
              horaCongelada={salidaCongelada}
              disabled={isPlataforma || isReservaOrMantenimiento}
            />

            {/* Observaciones (Replaces Corridas Perdidas) */}
            {!isPlataforma && (
              <div className="info-card__item">
                <span className="info-card__label">Observaciones</span>
                <textarea
                  className="interactive-input"
                  maxLength={120}
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={isPlataforma || isReservaOrMantenimiento || !!salidaCongelada}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    marginTop: '0.25rem',
                    resize: 'none',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                  }}
                  placeholder="Escribe alguna observación (opcional)..."
                />
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', marginTop: '1rem' }} className="animate-fade-in-up">
               <button
                  type="button"
                  disabled={isPlataforma || isReservaOrMantenimiento || guardandoSalida || !!salidaCongelada}
                  onClick={async () => {
                    setGuardandoSalida(true);
                    const now = new Date();
                    const horas24 = String(now.getHours()).padStart(2, '0');
                    const minutos = String(now.getMinutes()).padStart(2, '0');
                    const segundos = String(now.getSeconds()).padStart(2, '0');
                    const horaParaGuardar = `${horas24}:${minutos}:${segundos}`;
                    
                    try {
                      if (handleSaveHoras) {
                        await handleSaveHoras(formHoraProgramada, calculatedAcople, horaParaGuardar, observaciones);
                        setSalidaCongelada(horaParaGuardar);
                        const Swal = (await import('sweetalert2')).default;
                        Swal.fire({
                          icon: 'success',
                          title: 'Registro Guardado',
                          text: `Se registró la salida a las ${horaParaGuardar}`,
                          confirmButtonColor: '#601a2a',
                          timer: 2000,
                          showConfirmButton: false,
                        });
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setGuardandoSalida(false);
                    }
                  }}
                  className="interactive-input"
                  style={{
                    width: '100%',
                    padding: '0 1.5rem',
                    height: '2.5rem',
                    background: '#601a2a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: (isPlataforma || isReservaOrMantenimiento || guardandoSalida || !!salidaCongelada) ? 'not-allowed' : 'pointer',
                    opacity: (isPlataforma || isReservaOrMantenimiento || guardandoSalida || !!salidaCongelada) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {guardandoSalida && (
                    <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
                  )}
                  {salidaCongelada ? 'VALIDADO' : 'VALIDAR'}
                </button>
            </div>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setModalPlataformaVisible(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
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
                    <span style={{ fontWeight: 600, color: platConductor ? '#0b162c' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
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
                    <span style={{ fontWeight: 600, color: platRuta ? '#0b162c' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
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
                    <span style={{ fontWeight: 600, color: platEstatus ? '#0b162c' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
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

            <div style={{ display: 'flex', width: '100%', marginTop: '2rem', height: '3rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={handleConfirmarPlataforma}
                disabled={guardandoPerdida}
                style={{
                  flex: 1, border: 'none', background: modalPlataformaVisible === 'INCORPORACION' ? '#c29b53' : '#c29b53', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
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