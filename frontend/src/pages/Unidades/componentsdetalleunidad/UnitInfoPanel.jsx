// src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx
import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ChecklistForm from '../../CheckList/CheckList';
import CONDUCTORES from '../../../data/conductores';
import { generarPDFChecklist } from '../../../utils/generarPDFChecklist';
import API_BASE from '../../../config/api';
import Swal from 'sweetalert2';

import IOSTimePicker from './IOSTimePicker';
import { AuthContext } from '../../../context/AuthContext';

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
  onUpdate, // <-- IMPORTANTE: asegúrate de pasar esta prop desde el padre
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
  const [formAcople, setFormAcople] = useState('');
  const [dropdownHoraOpen, setDropdownHoraOpen] = useState(false);
  const [dropdownAcopleOpen, setDropdownAcopleOpen] = useState(false);
  const [dropdownTarjetonOpen, setDropdownTarjetonOpen] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  const isReservaOrMantenimiento = datosOperativos.estatus === 'RESERVA' || datosOperativos.estatus === 'MANTENIMIENTO';

  useEffect(() => {
    if (datosOperativos.horaProgramada) setFormHoraProgramada(datosOperativos.horaProgramada);
    if (datosOperativos.acople) setFormAcople(datosOperativos.acople);
  }, [datosOperativos]);
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

  // ************* FUNCIÓN CORREGIDA (con logs para depurar error 500) *************
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
        console.log('📤 Payload INCORPORACION:', payload); // <-- para depurar

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
    } else { // DESINCORPORACION
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
        console.log('📤 Payload DESINCORPORACION:', payload); // <-- para depurar

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
  // ****************************************************************************

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

  // --- JSX (se mantiene exactamente igual al que ya tenías) ---
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
              <span className="info-card__label">Hora Programada</span>
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
                        if (handleSaveHoras) {
                          await handleSaveHoras(formHoraProgramada, formAcople);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Hora de Acople</span>
              <div className="badge-display badge-display--maroon" style={{ padding: 0, overflow: 'visible', position: 'relative', opacity: isReservaOrMantenimiento ? 0.6 : 1 }}>
                <button
                  type="button"
                  disabled={isPlataforma || isReservaOrMantenimiento}
                  onClick={() => { setDropdownAcopleOpen(!dropdownAcopleOpen); setDropdownHoraOpen(false); }}
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
                    {formAcople || '--:--'}
                  </span>
                  <svg className={`arrow-icon ${dropdownAcopleOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownAcopleOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                  </svg>
                </button>
                <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>

                {dropdownAcopleOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                      onClick={(e) => { e.stopPropagation(); setDropdownAcopleOpen(false); }}
                    />
                    <IOSTimePicker 
                      value={formAcople} 
                      onChange={setFormAcople} 
                      onClose={() => setDropdownAcopleOpen(false)}
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
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
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
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
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
                        {['FALTA DE OPERADOR', 'MANTENIMIENTO', 'ACCIDENTE', 'FALTA DE CONBUSTIBLE', 'CONDICIONES CLIMATICAS', 'DESVIO OPERACIONAL'].map((motivo) => (
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

        {/* CARD 3: MOVILIDAD Y ESTATUS */}
        <div className="info-card info-card--double">
          <div className="info-card__header">
            <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="info-card__title">Movilidad y Estatus</h3>
          </div>
          <div className="info-card__body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {[
                { id: 'operacion', label: 'OPERACIÓN', color: 'var(--status-green-text)', bgActive: 'var(--status-green-light)' },
                { id: 'reserva', label: 'RESERVA', color: 'var(--status-blue-text)', bgActive: 'var(--status-blue-light)' },
                { id: 'mantenimiento', label: 'MANTENIMIENTO', color: 'var(--status-yellow-text)', bgActive: 'var(--status-yellow-light)' }
              ].map(st => {
                const isActive = datosOperativos.estatus === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleCambiarEstatus && handleCambiarEstatus(st.id)}
                    disabled={cambiandoEstatus || isPlataforma}
                    style={{
                      padding: '1rem 0.5rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${isActive ? st.color : 'transparent'}`,
                      backgroundColor: isActive ? st.bgActive : 'var(--tw-color-gray-100)',
                      color: isActive ? st.color : 'var(--tw-color-gray-500)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: (cambiandoEstatus || isPlataforma) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      opacity: ((cambiandoEstatus || isPlataforma) && !isActive) ? 0.5 : 1
                    }}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isActive ? '#ffffff' : 'var(--tw-color-gray-300)' }}></div>
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 4: CHECKLIST */}
        <div className="info-card info-card--double" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="info-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="info-card__title">Check List</h3>
            </div>
            {hasCompletedChecklist && (
              <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--state-green-light)', color: 'var(--state-green-text)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Realizado
              </span>
            )}
          </div>
          <div className="info-card__body" style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', flex: 1, paddingBottom: '0.5rem', alignItems: 'stretch' }}>
            {!hasCompletedChecklist ? (
              <button
                onClick={handleHacerCheckList}
                className="interactive-input"
                style={{
                  flex: 1,
                  borderRadius: '0.75rem',
                  border: 'none',
                  backgroundColor: '#6b1d33',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px -2px rgba(107, 29, 51, 0.4)',
                  transition: 'transform 0.1s, background-color 0.2s',
                  padding: '1rem',
                  opacity: 1
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4a1020'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b1d33'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Hacer Check list
              </button>
            ) : (
              <button
                onClick={handleRevisarCheckList}
                className="interactive-input"
                style={{
                  flex: 1,
                  borderRadius: '0.75rem',
                  border: 'none',
                  backgroundColor: '#c29b53',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px -2px rgba(194, 155, 83, 0.4)',
                  transition: 'transform 0.1s, background-color 0.2s',
                  padding: '1rem',
                  opacity: 1
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#a88344'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#c29b53'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Revisar check list
              </button>
            )}
          </div>
          {showChecklist && (
            <div style={{ padding: '0 0.5rem 1rem 0.5rem', marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <ChecklistForm 
                origen="despacho"
                inline={true} 
                editMode={hasCompletedChecklist && showChecklist}
                checklistId={recentChecklist?.id}
                prefillData={{
                  numero_eco: selectedOption ? selectedOption.replace(/\D/g, '') : '',
                  tipoTransporte: configActual.id,
                  conductorNombre: getConductorDisplay() !== 'No asignado' ? getConductorDisplay() : '',
                  servicio: (() => {
                    let r = datosOperativos.ruta || '';
                    if (r === 'Sin ruta') r = '';
                    if (configActual.id === 'URBANUSS') {
                      if (r.includes('T-01')) return 'T01';
                      if (r.includes('T-02')) return 'T02';
                      if (r.includes('T-04')) return 'T04';
                      if (r.includes('T-05')) return 'T05';
                      if (r.includes('ESPECIAL')) return 'SE';
                      if (r.includes('METROPOLITANO')) return 'TM';
                      if (r.includes('POTENCIA')) return 'HP';
                      if (r.includes('MOVILIDAD')) return 'TLM';
                    }
                    return r;
                  })(),
                  puntos: recentChecklist?.puntos,
                  dibujo: recentChecklist?.dibujo
                }}
                onClose={() => setShowChecklist(false)}
                onComplete={(checklist) => {
                  setHasCompletedChecklist(true);
                  setRecentChecklist(checklist);
                  setShowChecklist(false);
                  Swal.fire({
                    icon: 'success',
                    title: '¡Check list completado!',
                    text: 'El check list ha sido guardado correctamente.',
                    confirmButtonColor: '#6b1d33'
                  });
                }}
              />
            </div>
          )}
          {viewingChecklist && recentChecklist && !showChecklist && (() => {
            const pts = typeof recentChecklist.puntos === 'string'
              ? JSON.parse(recentChecklist.puntos)
              : recentChecklist.puntos;

            const entries = pts ? Object.entries(pts) : [];
            const totalPuntos = entries.length;
            const totalBien = entries.filter(([_, val]) => val?.estado === 'bien').length;
            const totalMal = entries.filter(([_, val]) => val?.estado === 'mal').length;
            const totalPendiente = totalPuntos - totalBien - totalMal;

            const PUNTOS_LABEL = {
              carroceria_exterior: 'Carrocería exterior',
              mobitec: 'Mobitec',
              torreta: 'Torreta',
              pintura_vinil: 'Pintura y vinil',
              parabrisas_cristales: 'Parabrisas y cristales',
              luces_exteriores: 'Luces exteriores',
              puertas: 'Puertas',
              llantas: 'Llantas',
              rines: 'Rines',
              retrovisores: 'Retrovisores',
              limpieza: 'Limpieza',
              asientos: 'Asientos',
              extintor_seguridad: 'Extintor y seguridad',
              documentacion: 'Documentación',
              tecnologia: 'Tecnología',
              alerta_tablero: 'Alerta en tablero'
            };

            const getConductorNombre = () => {
              if (recentChecklist.conductor?.nombre) return recentChecklist.conductor.nombre;
              if (recentChecklist.conductor_nombre) return recentChecklist.conductor_nombre;
              if (recentChecklist.conductor_id) {
                const found = CONDUCTORES.find(c => c.id === Number(recentChecklist.conductor_id));
                if (found) return found.nombre;
              }
              return 'No asignado';
            };

            return (
              <div className="animate-fade-in-up mt-6 rounded-2xl border border-rose-900/10 bg-white p-5 shadow-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h4 className="text-base font-extrabold text-rose-950">
                    Puntos Evaluados
                  </h4>
                  <button
                    onClick={async () => {
                      if (descargandoPDF) return;
                      setDescargandoPDF(true);
                      try {
                        await generarPDFChecklist(recentChecklist, 'download');
                      } finally {
                        setDescargandoPDF(false);
                      }
                    }}
                    disabled={descargandoPDF}
                    className="flex items-center gap-2 bg-rose-50 text-rose-900 hover:bg-rose-100 transition-colors px-3 py-1.5 rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Descargar PDF"
                  >
                    {descargandoPDF ? (
                      <svg className="animate-spin h-5 w-5 text-rose-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {descargandoPDF ? 'Descargando...' : 'Descargar'}
                  </button>
                </div>

                {/* Counters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-center">
                  <div className="bg-emerald-50 border border-emerald-100 py-2 rounded-xl">
                    <span className="block text-lg font-extrabold text-emerald-600 leading-none">{totalBien}</span>
                    <span className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider">Bien</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 py-2 rounded-xl">
                    <span className="block text-lg font-extrabold text-rose-600 leading-none">{totalMal}</span>
                    <span className="text-[9px] font-bold uppercase text-rose-700 tracking-wider">Mal</span>
                  </div>
                </div>

                {/* Points List */}
                <div className="mb-4">
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                    {entries.length > 0 ? (
                      entries.map(([key, val], idx) => {
                        const isBien = val?.estado === 'bien';
                        return (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-start gap-2.5">
                            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${isBien ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {isBien ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{PUNTOS_LABEL[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                              {val?.observaciones ? (
                                <p className="mt-1 text-[10px] text-slate-500 break-words">
                                  <span className="font-semibold text-slate-400">Obs:</span> {val.observaciones}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-[9px] italic text-slate-400">Sin observaciones</p>
                              )}

                              {/* Foto de evidencia */}
                              {(val?.foto || (val?.fotos && val.fotos.length > 0)) && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {val.foto && (
                                    <img
                                      src={val.foto}
                                      alt={`Evidencia`}
                                      className="h-12 w-12 rounded-lg object-cover border border-slate-100 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                                      onClick={() => setLightboxDibujo(val.foto)}
                                      title="Clic para ampliar"
                                    />
                                  )}
                                  {val.fotos && val.fotos.map((imgUrl, fIdx) => (
                                    <img
                                      key={fIdx}
                                      src={imgUrl}
                                      alt={`Evidencia ${fIdx + 1}`}
                                      className="h-12 w-12 rounded-lg object-cover border border-slate-100 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                                      onClick={() => setLightboxDibujo(imgUrl)}
                                      title="Clic para ampliar"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic text-center py-4">No hay puntos evaluados.</span>
                    )}
                  </div>
                </div>

                {/* Draw Evidence */}
                {recentChecklist.dibujo && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-700 mb-2">Referencia Visual de Fallas</p>
                    <div className="flex justify-center p-2 border border-slate-100 rounded-xl bg-slate-50/50">
                      <img
                        src={recentChecklist.dibujo}
                        alt="Evidencia de fallas"
                        className="w-full rounded-lg object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                        style={{ aspectRatio: '5/3' }}
                        onClick={() => setLightboxDibujo(recentChecklist.dibujo)}
                        title="Clic para ampliar"
                      />
                    </div>
                  </div>
                )}

                {lightboxDibujo && createPortal(
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setLightboxDibujo(null)}
                  >
                    <button
                      className="absolute top-4 right-4 text-white/70 hover:text-white transition"
                      onClick={() => setLightboxDibujo(null)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                    <img
                      src={lightboxDibujo}
                      alt="Vista ampliada"
                      className="max-w-[92vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>,
                  document.body
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setViewingChecklist(false);
                      setShowChecklist(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-guinda-700 hover:bg-guinda-800 transition-colors shadow-sm"
                  >
                    Editar Check List
                  </button>
                  <button 
                    onClick={() => setViewingChecklist(false)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cerrar Detalles
                  </button>
                </div>
              </div>
            );
          })()}
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