// src/pages/Unidades/componentsdetalleunidad/UnitInfoPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChecklistForm from '../../CheckList/CheckList';
import CONDUCTORES from '../../../data/conductores';
import { generarPDFChecklist } from '../../../utils/generarPDFChecklist';

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
      const res = await fetch(`http://localhost:8000/api/checklists?period=daily&date=${today}&economico=${ecoNumber}`, {
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
                      style={{ background: 'transparent', color: '#16a34a', border: 'none', cursor: guardandoTarjeton ? 'wait' : 'pointer', padding: '0.2rem', display: 'flex' }}
                    >
                      {guardandoTarjeton ? (
                        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: '#16a34a', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
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
                    style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
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
          <div className="info-card__body spec-badges" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                    background: huboCorridasPerdidas ? '#6b1d33' : '#f3f4f6',
                    color: huboCorridasPerdidas ? '#ffffff' : '#4a5568',
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
                    background: !huboCorridasPerdidas ? '#6b1d33' : '#f3f4f6',
                    color: !huboCorridasPerdidas ? '#ffffff' : '#4a5568',
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
              <div className="animate-fade-in-up" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                      background: '#ffffff',
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
                    <div className="dropdown-menu" style={{ width: '100%', minWidth: 'unset', top: '100%', background: '#ffffff', opacity: 1, zIndex: 999 }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                        <button
                          type="button"
                          className="dropdown-menu__item"
                          style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: '#ffffff', color: '#4a5568' }}
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
                            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: '#ffffff', color: '#4a5568', fontWeight: perdidaCiclos === opt.value ? 'bold' : 'normal' }}
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
                { id: 'operacion', label: 'OPERACIÓN', color: '#16a34a', bgActive: '#f0fdf4' },
                { id: 'reserva', label: 'RESERVA', color: '#d97706', bgActive: '#fffbeb' },
                { id: 'mantenimiento', label: 'MANTENIMIENTO', color: '#dc2626', bgActive: '#fef2f2' }
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
                      border: `2px solid ${isActive ? st.color : '#e2e8f0'}`,
                      backgroundColor: isActive ? st.bgActive : '#f8fafc',
                      color: isActive ? st.color : '#94a3b8',
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
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isActive ? st.color : '#cbd5e1' }}></div>
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 4: CHECKLIST */}
        <div className="info-card info-card--double" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="info-card__header">
            <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="info-card__title">Check List</h3>
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
                }}
              />
            </div>
          )}
          {viewingChecklist && recentChecklist && (
            <div className="animate-fade-in-up" style={{ padding: '0 0.5rem 1rem 0.5rem', marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 'bold', color: '#6b1d33', margin: 0 }}>Detalles del Checklist</h4>
                <button 
                  onClick={() => generarPDFChecklist(recentChecklist, 'download')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b1d33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Descargar PDF"
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem', color: '#4a5568' }}>
                <div><strong>Fecha:</strong> {new Date(recentChecklist.fecha_hora || recentChecklist.created_at).toLocaleString('es-MX')}</div>
                <div><strong>Unidad:</strong> {recentChecklist.economico}</div>
                <div><strong>Servicio:</strong> {recentChecklist.servicio}</div>
                <div><strong>Conductor:</strong> {recentChecklist.conductor?.nombre || recentChecklist.conductor_nombre || 'No asignado'}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.5rem', background: '#f8fafc' }}>
                {(() => {
                  const pts = typeof recentChecklist.puntos === 'string'
                    ? JSON.parse(recentChecklist.puntos)
                    : recentChecklist.puntos;
                  
                  if (!pts) return <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No hay puntos registrados.</span>;
                  
                  const entries = Object.entries(pts);
                  if (entries.length === 0) return <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No hay puntos registrados.</span>;
                  
                  const formatKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return entries.map(([key, val], idx) => {
                    const estadoVal = val?.estado || 'N/A';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>{formatKey(key)}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: estadoVal === 'bien' ? '#16a34a' : '#ef4444' }}>
                          {estadoVal.toUpperCase()}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {recentChecklist.dibujo && (
                 <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#4a5568' }}>Evidencia / Dibujo:</p>
                    <img src={recentChecklist.dibujo} alt="Evidencia" style={{ maxWidth: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
                 </div>
              )}

              <button 
                onClick={() => setViewingChecklist(false)}
                style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#e2e8f0', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#475569', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e1'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                Cerrar Detalles
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
