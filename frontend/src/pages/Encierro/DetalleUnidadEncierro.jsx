// src/pages/Encierro/DetalleUnidadEncierro.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { encierroModules } from '../../config/encierroModules';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';
import UnitSelector from '../Unidades/componentsdetalleunidad/UnitSelector';
import ChecklistForm from '../CheckList/CheckList';
import CONDUCTORES from '../../data/conductores';
import { generarPDFChecklist } from '../../utils/generarPDFChecklist';

export default function DetalleUnidadEncierro() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);

  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: '',
    corrida: '',
    horaSalida: '',
    estatus: 'operacion'
  });
  
  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  
  // Estados para Tarjetón (edición interactiva al igual que despacho)
  const [editandoTarjeton, setEditandoTarjeton] = useState(false);
  const [formTarjeton, setFormTarjeton] = useState('');
  const [guardandoTarjeton, setGuardandoTarjeton] = useState(false);

  // Check List states
  const [showChecklist, setShowChecklist] = useState(false);
  const [hasCompletedChecklist, setHasCompletedChecklist] = useState(false);
  const [recentChecklist, setRecentChecklist] = useState(null);

  const [perdidaCorrida, setPerdidaCorrida] = useState('');
  const [perdidaCiclos, setPerdidaCiclos] = useState('');
  const [perdidaMotivo, setPerdidaMotivo] = useState('');

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

  const configActual = encierroModules.find(m => m.id === tipoTransporte);
  if (!configActual) {
    return <div className="p-8">Transporte no encontrado. <button onClick={() => navigate('/encierro/dashboard')}>Volver</button></div>;
  }

  const [unidadesList, setUnidadesList] = useState([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(true);

  const getToken = () => localStorage.getItem('token');
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;
  const extraerNumeroEco = (valor) => {
    const texto = String(valor ?? '');
    const matchNumeros = texto.match(/\d+/);
    return matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
  };

  useEffect(() => {
    const fetchUnidades = async () => {
      const token = getToken();
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const respuesta = await fetch(
          `http://localhost:8000/api/unidades/listar/${tipoTransporte}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();
          const unidadesCatalogo = (Array.isArray(datos) ? datos : []).map((u) => ({
            eco: String(u.numero_eco ?? '').padStart(3, '0'),
            tarjeton: String(u.tarjeton ?? '').trim(),
            display: `ECO${String(u.numero_eco ?? '').padStart(3, '0')}`,
            estado: String(u.estatus ?? 'operacion').toLowerCase(),
          }));
          setUnidadesList(unidadesCatalogo);
        } else if (respuesta.status === 401) {
          navigate('/');
        } else {
          const errorText = await respuesta.text();
          console.error('Error al obtener la lista de unidades:', respuesta.status, errorText);
        }
      } catch (error) {
        console.error('Error de conexión al obtener la lista de unidades', error);
      } finally {
        setCargandoUnidades(false);
      }
    };

    fetchUnidades();
  }, [tipoTransporte, navigate]);

  useEffect(() => {
    setFormTarjeton(datosOperativos.tarjeton || '');
  }, [datosOperativos.tarjeton]);

  const unidadesPorEstado = (estado) => unidadesList.filter((u) => u.estado === estado);

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

  const checkHistory = async (ecoNumber) => {
    try {
      const token = getToken();
      if (!token) return;
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://localhost:8000/api/checklists?period=daily&date=${today}&economico=${ecoNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasCompletedChecklist(data.length > 0);
      }
    } catch (e) {
      console.error("Error al revisar historial", e);
    }
  };

  useEffect(() => {
    setRecentChecklist(null);
    setHasCompletedChecklist(false);
    setShowChecklist(false);

    if (selectedOption) {
      const ecoNum = selectedOption.replace(/\D/g, '');
      if (ecoNum) {
        checkHistory(ecoNum);
      }
    }
  }, [selectedOption]);

  const handleHacerCheckList = () => setShowChecklist(true);

  const handleRevisarCheckList = () => {
    if (recentChecklist) {
      generarPDFChecklist(recentChecklist, 'print');
    }
  };

  const handleSelectUnit = async (unidad) => {
    const unidadSeleccionada =
      typeof unidad === 'object' && unidad !== null
        ? unidad
        : unidadesList.find((item) => item.display === unidad || item.eco === unidad || String(item.tarjeton ?? '').trim() === String(unidad ?? '').trim()) || null;

    const ecoSeleccionado = unidadSeleccionada
      ? formatearEco(unidadSeleccionada.eco)
      : formatearEco(extraerNumeroEco(unidad));

    setSelectedOption(ecoSeleccionado);
    setSelectedEstado(unidadSeleccionada ? unidadSeleccionada.estado : null);
    setOpenDropdown(null);
    setCargandoDatos(true);

    const numeroLimpio = unidadSeleccionada
      ? String(unidadSeleccionada.eco).padStart(3, '0')
      : extraerNumeroEco(ecoSeleccionado);

    try {
      const token = getToken();
      if (!token) { navigate('/'); return; }

      const url = `http://localhost:8000/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const respuesta = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const resultado = await respuesta.json();

      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta',
          tarjeton: resultado.tarjeton || '',
          corrida: resultado.corridas || '',
          horaSalida: resultado.hora_salida || '',
          estatus: resultado.estatus || unidadSeleccionada?.estado || 'operacion'
        });
        setSelectedEstado(resultado.estatus || unidadSeleccionada?.estado || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
          corrida: '',
          horaSalida: '',
          estatus: 'operacion'
        });
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
        corrida: '',
        horaSalida: '',
        estatus: 'operacion'
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleSaveTarjeton = async (nuevoTarjeton) => {
    try {
      const token = getToken();
      if (!token) {
        navigate('/');
        return;
      }
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        tarjeton: nuevoTarjeton,
      };
      const respuesta = await fetch('http://localhost:8000/api/despacho/actualizar-tarjeton', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos((prev) => ({
          ...prev,
          tarjeton: resultado.tarjeton,
          conductor: resultado.conductor,
        }));
        
        Swal.fire({
          icon: 'success',
          title: '¡Tarjetón Asignado!',
          text: `Se asignó al conductor: ${resultado.conductor}`,
          confirmButtonColor: '#c5a059',
          timer: 2000,
        });

        // Actualizar tarjeton en la lista local para búsquedas futuras
        setUnidadesList(prev => prev.map(u => {
          if (String(u.eco).padStart(3, '0') === numeroLimpio) {
            return { ...u, tarjeton: String(resultado.tarjeton).trim() };
          }
          return u;
        }));
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de Asignación',
          text: resultado.message || 'Error al actualizar el tarjetón',
          confirmButtonColor: '#601a2a',
        });
      }
    } catch (error) {
      console.error('Error al guardar tarjetón:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor',
        confirmButtonColor: '#601a2a',
      });
    }
  };

  const handleConfirmTarjeton = async () => {
    if (!formTarjeton.trim()) return;
    setFormTarjeton(formTarjeton.trim());
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

  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;
    
    if (datosOperativos.estatus === nuevoEstatus) return;

    const confirmacion = await Swal.fire({
      title: '¿Cambiar Estatus?',
      text: `¿Seguro que deseas mover la unidad ${selectedOption} a ${nuevoEstatus.toUpperCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    setCambiandoEstatus(true);
    try {
      const token = getToken();
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

      const response = await fetch(`http://localhost:8000/api/unidades/cambiar-estatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          numero_eco: numeroLimpio,
          tipo: tipoTransporte,
          estatus: nuevoEstatus
        })
      });

      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Estatus Actualizado',
          text: `La unidad ${selectedOption} ahora está en ${nuevoEstatus.toUpperCase()}`,
          confirmButtonColor: '#c5a059',
          timer: 2000,
          showConfirmButton: false
        });
        setDatosOperativos(prev => ({ ...prev, estatus: nuevoEstatus }));
        setSelectedEstado(nuevoEstatus);
        
        // Actualizar la lista en memoria para mantener colores sincronizados y cambiar de lista
        setUnidadesList(prev => prev.map(u => {
          if (String(u.eco).padStart(3, '0') === numeroLimpio) {
            return { ...u, estado: nuevoEstatus.toLowerCase() };
          }
          return u;
        }));
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo cambiar el estatus', confirmButtonColor: '#601a2a' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión al servidor', confirmButtonColor: '#601a2a' });
    } finally {
      setCambiandoEstatus(false);
    }
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || "Seleccione Unidad"}
        eyebrow={`${configActual.title} / Encierro — Detalle de Unidad`}
        hideLogos={true}
      />

      <main className="main-content">
        <div className="unit-control-panel">
          <div className="unit-control-panel__selectors">
            <UnitSelector
              isOpen={openDropdown === 'operacion'}
              setIsOpen={(open) => setOpenDropdown(open ? 'operacion' : null)}
              selectedOption={selectedOption}
              selectedEstado={selectedEstado}
              estado="operacion"
              titulo="Operación"
              unidades={unidadesPorEstado('operacion')}
              cargandoUnidades={cargandoUnidades}
              configActual={configActual}
              onSelectUnit={handleSelectUnit}
            />
            <UnitSelector
              isOpen={openDropdown === 'mantenimiento'}
              setIsOpen={(open) => setOpenDropdown(open ? 'mantenimiento' : null)}
              selectedOption={selectedOption}
              selectedEstado={selectedEstado}
              estado="mantenimiento"
              titulo="Mantenimiento"
              unidades={unidadesPorEstado('mantenimiento')}
              cargandoUnidades={cargandoUnidades}
              configActual={configActual}
              onSelectUnit={handleSelectUnit}
            />
            <UnitSelector
              isOpen={openDropdown === 'reserva'}
              setIsOpen={(open) => setOpenDropdown(open ? 'reserva' : null)}
              selectedOption={selectedOption}
              selectedEstado={selectedEstado}
              estado="reserva"
              titulo="Reserva"
              unidades={unidadesPorEstado('reserva')}
              cargandoUnidades={cargandoUnidades}
              configActual={configActual}
              onSelectUnit={handleSelectUnit}
            />
          </div>

          <div className="info-panel">
            {selectedOption ? (
              <div className="unit-dashboard-container animate-fade-in-up">
                {/* CABEZERA DE LA FICHA */}
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

                {/* CUADRÍCULA DE TARJETAS */}
                <div className="dashboard-grid">
                  {/* CARD 1: SERVICIO ACTIVO */}
                  <div className="info-card">
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="info-card__title">Servicio Activo</h3>
                    </div>
                    
                    <div className="info-card__body">
                      {/* Conductor (Solo Lectura) */}
                      <div className="info-card__item">
                        <span className="info-card__label">Conductor Asignado</span>
                        <div className="info-card__value-wrapper">
                          <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="info-card__value" style={{ fontSize: '0.9rem' }}>
                            {cargandoDatos ? 'Buscando...' : (datosOperativos.conductor || 'No asignado')}
                          </p>
                        </div>
                      </div>

                      {/* Ruta (Solo Lectura) */}
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

                      {/* Tarjetón (Editable) */}
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

                  {/* CARD 2: DESPACHO OPERATIVO */}
                  <div className="info-card">
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="info-card__title">Despacho Operativo</h3>
                    </div>
                    <div className="info-card__body spec-badges">
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
                      <div className="info-card__item" style={{ marginTop: '1.25rem' }}>
                        <span className="info-card__label">Hora de Salida</span>
                        <div className="badge-display badge-display--gold">
                          <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="badge-display__text">
                            {cargandoDatos ? '...' : (datosOperativos.horaSalida || 'No asignada')}
                          </span>
                        </div>
                      </div>

                      <div className="info-card__item" style={{ marginTop: '1.25rem' }}>
                        <span className="info-card__label">Corridas Perdidas</span>
                        <select
                          className="interactive-input"
                          style={{ padding: '0 0.85rem', marginTop: '0.25rem' }}
                          value={perdidaCorrida}
                          onChange={(e) => {
                            setPerdidaCorrida(e.target.value);
                            if (!e.target.value) {
                              setPerdidaCiclos('');
                              setPerdidaMotivo('');
                            }
                          }}
                        >
                          <option value="">— Seleccionar —</option>
                          {[...Array(14)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>Corrida {i + 1}</option>
                          ))}
                        </select>
                      </div>

                      {perdidaCorrida && (
                        <div className="animate-fade-in-up">
                          <div className="info-card__item" style={{ marginTop: '1rem' }}>
                            <span className="info-card__label">Ciclos Perdidos</span>
                            <select
                              className="interactive-input"
                              style={{ padding: '0 0.85rem', marginTop: '0.25rem' }}
                              value={perdidaCiclos}
                              onChange={(e) => setPerdidaCiclos(e.target.value)}
                            >
                              <option value="">— Seleccionar —</option>
                              {ciclosOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label} ciclo{opt.value !== '1' && opt.value !== '0.5' ? 's' : ''}</option>
                              ))}
                            </select>
                          </div>
                          <div className="info-card__item" style={{ marginTop: '1rem' }}>
                            <span className="info-card__label">Motivo (Obligatorio)</span>
                            <input
                              type="text"
                              className="interactive-input"
                              style={{ padding: '0 0.85rem', marginTop: '0.25rem' }}
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
                              onClick={() => handleCambiarEstatus(st.id)}
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
                  </div>

                  {/* CARD 4: CHECKLIST */}
                  <div className="info-card info-card--double" style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5rem' }}>
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="info-card__title">Check List</h3>
                    </div>
                    <div className="info-card__body" style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', flex: 1, paddingBottom: '0.5rem', alignItems: 'stretch' }}>
                      <button
                        onClick={handleHacerCheckList}
                        disabled={hasCompletedChecklist}
                        className="interactive-input"
                        style={{
                          flex: 1,
                          borderRadius: '0.75rem',
                          border: 'none',
                          backgroundColor: hasCompletedChecklist ? '#9ca3af' : '#6b1d33',
                          color: 'white',
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          cursor: hasCompletedChecklist ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 10px -2px rgba(107, 29, 51, 0.4)',
                          transition: 'transform 0.1s, background-color 0.2s',
                          padding: '1rem',
                          opacity: hasCompletedChecklist ? 0.6 : 1
                        }}
                        onMouseOver={(e) => !hasCompletedChecklist && (e.currentTarget.style.backgroundColor = '#4a1020')}
                        onMouseOut={(e) => !hasCompletedChecklist && (e.currentTarget.style.backgroundColor = '#6b1d33')}
                        onMouseDown={(e) => !hasCompletedChecklist && (e.currentTarget.style.transform = 'scale(0.98)')}
                        onMouseUp={(e) => !hasCompletedChecklist && (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        Hacer Check list
                      </button>
                      <button
                        onClick={handleRevisarCheckList}
                        disabled={!recentChecklist}
                        className="interactive-input"
                        style={{
                          flex: 1,
                          borderRadius: '0.75rem',
                          border: 'none',
                          backgroundColor: (!recentChecklist) ? '#9ca3af' : '#c29b53',
                          color: 'white',
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          cursor: (!recentChecklist) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 10px -2px rgba(194, 155, 83, 0.4)',
                          transition: 'transform 0.1s, background-color 0.2s',
                          padding: '1rem',
                          opacity: (!recentChecklist) ? 0.6 : 1
                        }}
                        onMouseOver={(e) => !(!recentChecklist) && (e.currentTarget.style.backgroundColor = '#a88344')}
                        onMouseOut={(e) => !(!recentChecklist) && (e.currentTarget.style.backgroundColor = '#c29b53')}
                        onMouseDown={(e) => !(!recentChecklist) && (e.currentTarget.style.transform = 'scale(0.98)')}
                        onMouseUp={(e) => !(!recentChecklist) && (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        Revisar check list
                      </button>
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
                  </div>
                </div>
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para comenzar el registro de encierro.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}