// src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ChecklistForm from '../../CheckList/CheckList';
import CONDUCTORES from '../../../data/conductores';
import { generarPDFChecklist } from '../../../utils/generarPDFChecklist';
import API_BASE from '../../../config/api';
import Swal from 'sweetalert2';


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
  handleCambiarEstatus,
  cambiandoEstatus,
}) {
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
  const [dropdownCiclosOpen, setDropdownCiclosOpen] = useState(false);
  const [huboCorridasPerdidas, setHuboCorridasPerdidas] = useState(false);
  const navigate = useNavigate();

  const ciclosRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ciclosRef.current && !ciclosRef.current.contains(e.target)) {
        setDropdownCiclosOpen(false);
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

  // Maneja el toggle Sí/No de "¿Hubo corridas perdidas?"
  const handleToggleCorridasPerdidas = (valor) => {
    setHuboCorridasPerdidas(valor);
    if (!valor) {
      // Si se selecciona "No", limpiamos los campos dependientes
      setPerdidaCiclos('');
      setPerdidaMotivo('');
      setDropdownCiclosOpen(false);
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
      const token = localStorage.getItem('token');
      if (!token) return;
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/api/checklists?period=daily&date=${today}&economico=${ecoNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasCompletedChecklist(data.length > 0);
        if (data.length > 0) {
          setRecentChecklist(data[0]);
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

  const handleConfirmTarjeton = async () => {
    if (!formTarjeton.trim()) {
      return;
    }
    setGuardandoTarjeton(true);
    try {
      await handleSaveTarjeton(formTarjeton.trim());
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
        <div className="dashboard-header-card__status">
          <span className="pulse-indicator"></span>
          Activo en Turno
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
              <div className="info-card__value-wrapper">
                <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="info-card__value">
                  {cargandoDatos ? 'Buscando...' : (datosOperativos.ruta || 'Sin ruta')}
                </p>
              </div>
            </div>

            {/* Número de Tarjetón (Editable) */}
            <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
              <span className="info-card__label">Número de Tarjetón</span>
              {editandoTarjeton ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', position: 'relative' }}>
                  <input
                    type="text"
                    className="interactive-input"
                    style={{ padding: '0 0.5rem', height: '2.3rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                    value={formTarjeton}
                    onChange={(e) => setFormTarjeton(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmTarjeton();
                      } else if (e.key === 'Escape') {
                        handleCancelTarjetonEdit();
                      }
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      onClick={handleConfirmTarjeton}
                      disabled={guardandoTarjeton}
                      title="Guardar"
                      style={{ background: 'transparent', color: 'var(--state-green-text)', border: 'none', cursor: guardandoTarjeton ? 'wait' : 'pointer', padding: '0.2rem', display: 'flex' }}
                    >
                      {guardandoTarjeton ? (
                        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: 'var(--state-green-text)', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
                      ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>

                    <button
                      onClick={handleCancelTarjetonEdit}
                      disabled={guardandoTarjeton}
                      title="Cancelar"
                      style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-card__value-wrapper" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.378-1.377 2.622-1.377 4 0" />
                    </svg>
                    <p className="info-card__value">
                      {cargandoDatos ? 'Buscando...' : (datosOperativos.tarjeton || 'No asignado')}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditandoTarjeton(true)}
                    title="Asignar Conductor por Tarjetón"
                    style={{ background: 'transparent', color: 'var(--tw-color-gray-400)', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
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
            <h3 className="info-card__title">Despacho Operativo</h3>
          </div>
          <div className="info-card__body spec-badges" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
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
              <div className="badge-display badge-display--gold">
                <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="badge-display__text">
                  {cargandoDatos ? '...' : (datosOperativos.horaProgramada || 'No asignada')}
                </span>
              </div>
            </div>
            <div className="info-card__item">
              <span className="info-card__label">Hora de Acople</span>
              <div className="badge-display badge-display--maroon">
                <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="badge-display__text">
                  {cargandoDatos ? '...' : 'No asignada'}
                </span>
              </div>
            </div>

            {/* Toggle: ¿Hubo corridas perdidas? */}
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
                  onClick={() => handleToggleCorridasPerdidas(true)}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: huboCorridasPerdidas ? '#6b1d33' : 'var(--tw-color-gray-100)',
                    color: huboCorridasPerdidas ? 'var(--tw-color-white)' : 'var(--tw-color-gray-600)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCorridasPerdidas(false)}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderLeft: '1px solid #e5e7eb',
                    background: !huboCorridasPerdidas ? '#6b1d33' : 'var(--tw-color-gray-100)',
                    color: !huboCorridasPerdidas ? 'var(--tw-color-white)' : 'var(--tw-color-gray-600)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  No
                </button>
              </div>
            </div>

            {/* Ciclos Perdidos + Motivo: sólo se muestran si el botón "Sí" está activo */}
            {huboCorridasPerdidas && (
              <div className="animate-fade-in-up" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div ref={ciclosRef} className="info-card__item" style={{ position: 'relative' }}>
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
                    <span>{perdidaCiclos ? ciclosOptions.find(opt => opt.value === perdidaCiclos)?.label + ' ciclo' + (perdidaCiclos !== '1' && perdidaCiclos !== '0.5' ? 's' : '') : 'Seleccionar'}</span>
                    <svg className={`arrow-icon ${dropdownCiclosOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownCiclosOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem' }} fill="currentColor" viewBox="0 0 24 24">
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
                          }}
                        >
                          Seleccionar
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
                            }}
                          >
                            {opt.label} ciclo{opt.value !== '1' && opt.value !== '0.5' ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="info-card__item">
                  <span className="info-card__label">Motivo (Obligatorio)</span>
                  <input
                    type="text"
                    className="interactive-input"
                    style={{ padding: '0 0.85rem', marginTop: '0.25rem', height: '2.3rem', fontSize: '0.85rem' }}
                    maxLength={40}
                    value={perdidaMotivo}
                    onChange={(e) => setPerdidaMotivo(e.target.value)}
                    placeholder="Escribe el motivo de la pérdida..."
                  />
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
              {[
                { id: 'operacion', label: 'OPERACIÓN', color: 'var(--state-green-text)', bgActive: '#f0fdf4' },
                { id: 'reserva', label: 'RESERVA', color: 'var(--state-orange-text)', bgActive: 'var(--state-orange-light)' },
                { id: 'mantenimiento', label: 'MANTENIMIENTO', color: 'var(--state-red-text)', bgActive: 'var(--state-red-light)' }
              ].map(st => {
                const isActive = datosOperativos.estatus === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleCambiarEstatus && handleCambiarEstatus(st.id)}
                    disabled={cambiandoEstatus}
                    style={{
                      padding: '1rem 0.5rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${isActive ? st.color : 'var(--tw-color-gray-200)'}`,
                      backgroundColor: isActive ? st.bgActive : 'var(--tw-color-gray-50)',
                      color: isActive ? st.color : 'var(--tw-color-gray-400)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: cambiandoEstatus ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      opacity: (cambiandoEstatus && !isActive) ? 0.5 : 1
                    }}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isActive ? st.color : 'var(--tw-color-gray-300)' }}></div>
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
          {showChecklist && !hasCompletedChecklist && (
            <div style={{ padding: '0 0.5rem 1rem 0.5rem', marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <ChecklistForm
                inline={true}
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
                  })()
                }}
                onClose={() => setShowChecklist(false)}
                onComplete={(checklist) => {
                  setHasCompletedChecklist(true);
                  setShowChecklist(false);
                  setRecentChecklist(checklist);
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
          {viewingChecklist && recentChecklist && (() => {
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
                    onClick={() => generarPDFChecklist(recentChecklist, 'download')}
                    className="flex items-center gap-2 bg-rose-50 text-rose-900 hover:bg-rose-100 transition-colors px-3 py-1.5 rounded-xl font-bold shadow-sm"
                    title="Descargar PDF"
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar
                  </button>
                </div>

                {/* Counters */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-center">
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
                                      className="h-12 w-12 rounded-lg object-cover border border-slate-100 shadow-sm"
                                    />
                                  )}
                                  {val.fotos && val.fotos.map((imgUrl, fIdx) => (
                                    <img
                                      key={fIdx}
                                      src={imgUrl}
                                      alt={`Evidencia ${fIdx + 1}`}
                                      className="h-12 w-12 rounded-lg object-cover border border-slate-100 shadow-sm"
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
                        className="max-h-48 rounded-lg object-contain border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
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

                <button
                  onClick={() => setViewingChecklist(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cerrar Detalles
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
