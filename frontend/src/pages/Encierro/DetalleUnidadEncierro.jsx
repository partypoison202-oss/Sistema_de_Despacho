// src/pages/Encierro/DetalleUnidadEncierro.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { encierroModules } from '../../config/encierroModules';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';
import UnitSelector from '../Unidades/componentsdetalleunidad/UnitSelector';
import ChecklistForm from '../CheckList/CheckList';
import CONDUCTORES from '../../data/conductores';
import { generarPDFChecklist } from '../../utils/generarPDFChecklist';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function DetalleUnidadEncierro() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);

  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: '',
    corrida: '',
    horaProgramada: '',
    estatus: 'operacion'
  });

  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // Estados para Tarjetón (edición interactiva al igual que despacho)
  const [editandoTarjeton, setEditandoTarjeton] = useState(false);
  const [formTarjeton, setFormTarjeton] = useState('');
  const [guardandoTarjeton, setGuardandoTarjeton] = useState(false);
  const [dropdownTarjetonOpen, setDropdownTarjetonOpen] = useState(false);

  // Estados para Ruta (edición interactiva)
  const [rutasOpciones, setRutasOpciones] = useState([]);
  const [editandoRuta, setEditandoRuta] = useState(false);
  const [formRuta, setFormRuta] = useState('');
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [dropdownRutaOpen, setDropdownRutaOpen] = useState(false);

  // Check List states
  const [showChecklist, setShowChecklist] = useState(false);
  const [hasCompletedChecklist, setHasCompletedChecklist] = useState(false);
  const [viewingChecklist, setViewingChecklist] = useState(false);
  const [recentChecklist, setRecentChecklist] = useState(null);
  const [lightboxDibujo, setLightboxDibujo] = useState(null);
  const [huboCorridasPerdidas, setHuboCorridasPerdidas] = useState(false);
  const [perdidaCiclos, setPerdidaCiclos] = useState('');
  const [perdidaMotivo, setPerdidaMotivo] = useState('');
  const [dropdownMotivoOpen, setDropdownMotivoOpen] = useState(false);
  const [dropdownCiclosOpen, setDropdownCiclosOpen] = useState(false);
  const [guardandoPerdida, setGuardandoPerdida] = useState(false);

  // Estados para el Modal de Cambio de Estatus a Operación
  const [modalEstatusOpen, setModalEstatusOpen] = useState(false);
  const [modalEstatusNuevo, setModalEstatusNuevo] = useState(null);
  const [modalEstatusConductor, setModalEstatusConductor] = useState('');
  const [modalEstatusRuta, setModalEstatusRuta] = useState('');
  const [modalEstatusConductorDropdown, setModalEstatusConductorDropdown] = useState(false);
  const [modalEstatusRutaDropdown, setModalEstatusRutaDropdown] = useState(false);

  // Estado para capturar la hora en la que se interactuó (Hora de Encierro)
  const [horaEncierroCapturada, setHoraEncierroCapturada] = useState('');

  const corridaRef = useRef(null);
  const ciclosRef = useRef(null);
  const rutaRef = useRef(null);
  const tarjetonRef = useRef(null);
  const motivoRef = useRef(null);
  const modalConductorRef = useRef(null);
  const modalRutaRef = useRef(null);

  useEffect(() => {
    setHuboCorridasPerdidas(!!datosOperativos.ciclo);
    setPerdidaCiclos(datosOperativos.ciclo || '');
    setPerdidaMotivo(datosOperativos.motivo || '');
  }, [datosOperativos]);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           const configActual = encierroModules.find((m) => m.id === tipoTransporte);
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
  }, [tipoTransporte]);

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
      if (modalConductorRef.current && !modalConductorRef.current.contains(e.target)) {
        setModalEstatusConductorDropdown(false);
      }
      if (modalRutaRef.current && !modalRutaRef.current.contains(e.target)) {
        setModalEstatusRutaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMotivoChange = (e) => {
    const val = e.target.value;
    const filteredVal = val.replace(/[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ\s\.,\-\(\)"]/g, '').toUpperCase();
    setPerdidaMotivo(filteredVal);
  };

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
      const token = getToken();
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
      if (response.ok) {
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

  const getToken = () => localStorage.getItem('token');
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;
  const extraerNumeroEco = (valor) => {
    const texto = String(valor ?? '');
    const matchNumeros = texto.match(/\d+/);
    return matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
  };

  const fetchUnidades = async () => {
    const token = getToken();
    if (!token) {
      navigate('/');
      return [];
    }
    const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${tipoTransporte}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (respuesta.status === 401) {
      navigate('/');
      return [];
    }
    if (!respuesta.ok) throw new Error('Error al obtener la lista de unidades');
    const datos = await respuesta.json();
    return (Array.isArray(datos) ? datos : []).map((u) => ({
      eco: String(u.numero_eco ?? '').padStart(3, '0'),
      tarjeton: String(u.tarjeton ?? '').trim(),
      display: `ECO${String(u.numero_eco ?? '').padStart(3, '0')}`,
      estado: String(u.estatus ?? 'operacion').toLowerCase(),
    }));
  };

  const { data: unidadesList = [], isLoading: cargandoUnidades } = useQuery({
    queryKey: ['unidades-list-encierro', tipoTransporte],
    queryFn: fetchUnidades,
    refetchInterval: 30000,
  });

  const [dbConductores, setDbConductores] = useState([]);
  
  const fetchConductores = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/conductores`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(c => ({
          id: c.tarjeton,
          tarjeton: c.tarjeton,
          nombre: c.nombre,
          estado_servicio: c.estado_servicio
        }));
        setDbConductores(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConductores();
  }, []);

  const conductoresDisponibles = dbConductores.filter(c => c.estado_servicio === 'disponible');

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setFormTarjeton(datosOperativos.tarjeton || '');
  }, [datosOperativos.tarjeton]);

  const unidadesPorEstado = (estado) => unidadesList.filter((u) => u.estado === estado);

  useEffect(() => {
    const ecoDesdeRuta = searchParams.get('eco');
    if (!ecoDesdeRuta || !unidadesList.length) return;

    const normalizarNumeroEco = (valor) => {
      const digitos = String(valor ?? '').trim().toUpperCase().match(/\d+/)?.[0] ?? '';
      return digitos.padStart(3, '0');
    };
    const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;

    const ecoNormalizado = normalizarNumeroEco(ecoDesdeRuta);
    const unidadEncontrada = unidadesList.find(
      (unidad) =>
        unidad.eco === ecoNormalizado ||
        unidad.display === formatearEco(ecoNormalizado)
    );

    if (unidadEncontrada && selectedOption !== unidadEncontrada.display) {
      handleSelectUnit(unidadEncontrada);
    }
  }, [searchParams, unidadesList, selectedOption]);

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
      const res = await fetch(`${API_BASE}/api/checklists?period=daily&date=${today}&economico=${ecoNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checklists && data.checklists.length > 0) {
          setHasCompletedChecklist(true);
          setRecentChecklist(data.checklists[0]);
        } else {
          setHasCompletedChecklist(false);
          setRecentChecklist(null);
        }
      }
    } catch (e) {
      console.error("Error al revisar historial", e);
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
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

  if (!configActual) {
    return <div className="p-8">Transporte no encontrado. <button onClick={() => navigate('/encierro/dashboard')}>Volver</button></div>;
  }

  const handleHacerCheckList = () => setShowChecklist(true);

  const handleRevisarCheckList = () => {
    if (recentChecklist) {
      setViewingChecklist(true);
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
    
    // Capturar la hora de interacción
    const now = new Date();
    setHoraEncierroCapturada(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));

    const numeroLimpio = unidadSeleccionada
      ? String(unidadSeleccionada.eco).padStart(3, '0')
      : extraerNumeroEco(ecoSeleccionado);

    try {
      const token = getToken();
      if (!token) { navigate('/'); return; }

      const url = `${API_BASE}/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const resultado = await queryClient.fetchQuery({
        queryKey: ['unidad-detalle', tipoTransporte, numeroLimpio],
        queryFn: async () => {
          const res = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (!res.ok) throw new Error('Error en peticion');
          return res.json();
        },
        staleTime: 60000,
      });

      if (resultado.status === 'success') {
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta',
          tarjeton: resultado.tarjeton || '',
          hora_encierro: resultado.hora_encierro || '',
          estatus: resultado.estatus || unidadSeleccionada?.estado || 'operacion',
          ciclo: resultado.ciclo || '',
          motivo: resultado.motivo || '',
        });
        setSelectedEstado(resultado.estatus || unidadSeleccionada?.estado || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
          hora_encierro: '',
          estatus: 'operacion',
          ciclo: '',
          motivo: '',
        });
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
        hora_encierro: '',
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
      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-tarjeton`, {
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
        fetchConductores();
        queryClient.invalidateQueries(['unidades-list-encierro', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);

        Swal.fire({
          icon: 'success',
          title: '¡Tarjetón Asignado!',
          text: `Se asignó al conductor: ${resultado.conductor}`,
          confirmButtonColor: '#c5a059',
          timer: 2000,
        });

        queryClient.setQueryData(['unidades-list-encierro', tipoTransporte], (prev = []) => prev.map(u => {
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

  const handleConfirmTarjeton = async (overrideValue) => {
    const val = typeof overrideValue === 'string' ? overrideValue : formTarjeton;
    if (!val.trim() || val === datosOperativos.tarjeton) {
      setEditandoTarjeton(false);
      return;
    }
    setFormTarjeton(val.trim());
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

  const handleSaveRuta = async (nuevaRuta) => {
    try {
      const token = getToken();
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        ruta: nuevaRuta,
      };
      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-ruta`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos((prev) => ({
          ...prev,
          ruta: nuevaRuta,
        }));
      } else {
        throw new Error(resultado.message || 'Error al actualizar la ruta.');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleConfirmRuta = async (nuevaRutaStr = null) => {
    const rutaAUsar = typeof nuevaRutaStr === 'string' ? nuevaRutaStr.trim() : formRuta.trim();
    if (!rutaAUsar || rutaAUsar === datosOperativos.ruta) {
      setEditandoRuta(false);
      return;
    }
    setGuardandoRuta(true);
    try {
      await handleSaveRuta(rutaAUsar);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'success',
        title: 'Ruta Actualizada',
        text: `La ruta se cambió exitosamente a ${rutaAUsar}.`,
        confirmButtonColor: '#c29b53',
        timer: 2000
      });
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

  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;

    if (datosOperativos.estatus === nuevoEstatus) return;

    let payloadUpdate = {
      numero_eco: null, // se asigna mas abajo
      tipo: tipoTransporte,
      estatus: nuevoEstatus,
      motivo_estatus: null // se asigna mas abajo
    };

    if (nuevoEstatus === 'operacion') {
      const tieneConductor = datosOperativos.conductor && datosOperativos.conductor !== 'No asignado' && datosOperativos.tarjeton;
      const tieneRuta = datosOperativos.ruta && datosOperativos.ruta !== 'Sin ruta';
      
      if (!tieneConductor || !tieneRuta) {
        setModalEstatusNuevo('operacion');
        setModalEstatusConductor(tieneConductor ? String(datosOperativos.tarjeton).trim() : '');
        setModalEstatusRuta(tieneRuta ? datosOperativos.ruta : '');
        setModalEstatusConductorDropdown(false);
        setModalEstatusRutaDropdown(false);
        setModalEstatusOpen(true);
        return;
      } else {
        payloadUpdate.nombre_conductor = datosOperativos.conductor;
        payloadUpdate.numero_tarjeton = datosOperativos.tarjeton;
        payloadUpdate.ruta = datosOperativos.ruta;
      }
    }

    const Swal = (await import('sweetalert2')).default;

    const requiereMotivo = nuevoEstatus === 'reserva' || nuevoEstatus === 'mantenimiento';

    const swalOptions = {
      title: '¿Cambiar Estatus?',
      text: `¿Seguro que deseas mover la unidad ${selectedOption} a ${nuevoEstatus.toUpperCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    };

    if (requiereMotivo) {
      swalOptions.input = 'textarea';
      swalOptions.inputPlaceholder = 'Escribe el motivo del cambio de estatus...';
      swalOptions.inputAttributes = {
        maxlength: '70'
      };
      swalOptions.didOpen = () => {
        const input = Swal.getInput();
        const counter = document.createElement('div');
        counter.style.textAlign = 'right';
        counter.style.fontSize = '10px';
        counter.style.fontWeight = '500';
        counter.style.color = '#d1d5db';
        counter.style.marginTop = '4px';
        counter.style.marginRight = '4px';
        counter.innerText = '0/70';
        
        input.parentNode.insertBefore(counter, input.nextSibling);

        input.addEventListener('input', () => {
          const length = input.value.length;
          counter.innerText = `${length}/70`;
          counter.style.color = length >= 70 ? '#ef4444' : '#d1d5db';
        });
      };
      swalOptions.inputValidator = (value) => {
        if (!value || !value.trim()) {
          return 'El motivo es obligatorio para este estatus.';
        }
      };
    }

    const confirmacion = await Swal.fire(swalOptions);

    if (!confirmacion.isConfirmed) return;

    const motivoCapturado = requiereMotivo ? (confirmacion.value || null) : null;

    setCambiandoEstatus(true);
    try {
      const token = getToken();
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

      const response = await fetch(`${API_BASE}/api/unidades/cambiar-estatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payloadUpdate,
          numero_eco: numeroLimpio,
          motivo_estatus: motivoCapturado
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
        setDatosOperativos((prev) => {
          const isReserva = nuevoEstatus === 'reserva';
          return {
            ...prev,
            estatus: nuevoEstatus,
            conductor: isReserva ? 'No reportado hoy' : prev.conductor,
            ruta: isReserva ? 'Sin ruta' : prev.ruta,
            tarjeton: isReserva ? '' : prev.tarjeton,
          };
        });
        setSelectedEstado(nuevoEstatus);
        fetchConductores();

        // Sincronizar cache de React Query para evitar condiciones de carrera (race conditions)
        queryClient.setQueryData(['unidad-detalle', tipoTransporte, numeroLimpio], (old) => {
          if (!old) return old;
          const isReserva = nuevoEstatus === 'reserva';
          return {
            ...old,
            estatus: nuevoEstatus,
            conductor: isReserva ? 'No reportado hoy' : old.conductor,
            ruta: isReserva ? 'Sin ruta' : old.ruta,
            tarjeton: isReserva ? '' : old.tarjeton,
            asignado: true
          };
        });

        queryClient.setQueryData(['unidades-list-encierro', tipoTransporte], (old = []) => {
          return old.map(u => {
            if (String(u.eco).padStart(3, '0') === numeroLimpio) {
              const isReserva = nuevoEstatus === 'reserva';
              return {
                ...u,
                estatus: nuevoEstatus,
                nombre_conductor: isReserva ? 'No reportado hoy' : u.nombre_conductor,
                ruta: isReserva ? 'Sin ruta' : u.ruta,
                tarjeton: isReserva ? '' : u.tarjeton,
              };
            }
            return u;
          });
        });

        queryClient.invalidateQueries(['unidades-list-encierro', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo cambiar el estatus', confirmButtonColor: '#601a2a' });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Problema de conexión al servidor', confirmButtonColor: '#601a2a' });
    } finally {
      setCambiandoEstatus(false);
    }
  };

  const confirmModalEstatus = async () => {
    if (!modalEstatusConductor || !modalEstatusRuta) return;

    setModalEstatusOpen(false);
    setCambiandoEstatus(true);
    const matchNumeros = selectedOption.match(/\d+/);
    const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

    const foundConductor = (conductoresDisponibles || dbConductores || []).find(c => c.id.toString() === modalEstatusConductor);

    let payloadUpdate = {
      numero_eco: numeroLimpio,
      tipo: tipoTransporte,
      estatus: modalEstatusNuevo,
      motivo_estatus: null,
      nombre_conductor: foundConductor ? foundConductor.nombre : '',
      numero_tarjeton: modalEstatusConductor,
      ruta: modalEstatusRuta
    };

    try {
      const res = await fetch(`${API_BASE}/api/unidades/cambiar-estatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payloadUpdate),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.status === 'success')) {
        Swal.fire({
          icon: 'success',
          title: 'Estatus Actualizado',
          text: `La unidad cambió a operación.`,
          timer: 2000,
          showConfirmButton: false,
        });
        
        setDatosOperativos((prev) => ({
          ...prev,
          estatus: modalEstatusNuevo,
          conductor: foundConductor ? foundConductor.nombre : (data.conductor_asignado || prev.conductor),
          ruta: modalEstatusRuta || data.ruta_asignada || prev.ruta,
          tarjeton: modalEstatusConductor || data.tarjeton || prev.tarjeton,
        }));
        setSelectedEstado(modalEstatusNuevo);
        fetchConductores();

        // Sincronizar cache de React Query para evitar condiciones de carrera (race conditions)
        queryClient.setQueryData(['unidad-detalle', tipoTransporte, numeroLimpio], (old) => {
          if (!old) return old;
          return {
            ...old,
            estatus: modalEstatusNuevo,
            conductor: foundConductor ? foundConductor.nombre : (data.conductor_asignado || old.conductor),
            ruta: modalEstatusRuta || data.ruta_asignada || old.ruta,
            tarjeton: modalEstatusConductor || data.tarjeton || old.tarjeton,
            asignado: true
          };
        });

        queryClient.setQueryData(['unidades-list-encierro', tipoTransporte], (old = []) => {
          return old.map(u => {
            if (String(u.eco).padStart(3, '0') === numeroLimpio) {
              return {
                ...u,
                estatus: modalEstatusNuevo,
                nombre_conductor: foundConductor ? foundConductor.nombre : (data.conductor_asignado || u.nombre_conductor),
                ruta: modalEstatusRuta || data.ruta_asignada || u.ruta,
                tarjeton: modalEstatusConductor || data.tarjeton || u.tarjeton,
              };
            }
            return u;
          });
        });

        queryClient.invalidateQueries(['unidades-list-encierro', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);
      } else {
        Swal.fire('Error', data.message || 'No se pudo cambiar el estatus', 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Error de red al cambiar estatus', 'error');
    } finally {
      setCambiandoEstatus(false);
    }
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || "Seleccione Unidad"}
        eyebrow={`${configActual.title} / Encierro — Detalle de Unidad`}
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
                  <div className="info-card">
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="info-card__title">Servicio Activo</h3>
                    </div>

                    <div className="info-card__body">
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

                      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
                        <span className="info-card__label">Ruta Asignada</span>
                        {editandoRuta ? (
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
                                  <>
                                    <span>{formRuta || 'SELECCIONAR'}</span>
                                    <svg className={`arrow-icon ${dropdownRutaOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownRutaOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem' }} fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                                    </svg>
                                  </>
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
                          <div className="info-card__value-wrapper" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <p className="info-card__value">
                                {cargandoDatos ? 'Buscando...' : (datosOperativos.ruta || 'Sin ruta')}
                              </p>
                            </div>
                            {!cargandoDatos && (
                              <button
                                onClick={() => {
                                  setFormRuta(datosOperativos.ruta || '');
                                  setEditandoRuta(true);
                                  setDropdownRutaOpen(true);
                                }}
                                title="Modificar Ruta"
                                style={{ background: 'transparent', color: '#c29b53', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                              >
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
                        <span className="info-card__label">Número de Tarjetón</span>
                        {editandoTarjeton ? (
                          <div ref={tarjetonRef} style={{ position: 'relative', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', position: 'relative' }}>
                              {guardandoTarjeton ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
                                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', margin: 0, borderColor: 'rgba(22, 163, 74, 0.2)', borderTopColor: 'var(--state-green-text)', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
                                </div>
                              ) : (
                                <>
                                  <input
                                    autoFocus
                                    type="text"
                                    value={formTarjeton}
                                    placeholder="Buscar conductor..."
                                    className="interactive-input"
                                    onChange={(e) => {
                                      setFormTarjeton(e.target.value);
                                      setDropdownTarjetonOpen(true);
                                    }}
                                  />
                                  <svg
                                    onClick={() => setDropdownTarjetonOpen(!dropdownTarjetonOpen)}
                                    className={`arrow-icon ${dropdownTarjetonOpen ? 'dropdown-trigger__arrow--open' : ''}`}
                                    style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: dropdownTarjetonOpen ? 'rotate(180deg)' : 'none', width: '1.2rem', height: '1.2rem', padding: '0.2rem', color: dropdownTarjetonOpen ? 'var(--brand-maroon-text)' : 'inherit', position: 'absolute', right: '0.5rem', top: '0.5rem' }}
                                    fill="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                                  </svg>
                                </>
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
                                        {c.nombre} <br/><span style={{fontSize: '0.75rem', opacity: 0.7}}>Tarjetón: {c.id}</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
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
                              onClick={() => {
                                setEditandoTarjeton(true);
                                setDropdownTarjetonOpen(true);
                              }}
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

                  <div className="info-card">
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="info-card__title">Despacho Operativo</h3>
                    </div>
                    <div className="info-card__body spec-badges grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="info-card__item">
                        <span className="info-card__label">Hora Encierro</span>
                        <div className="badge-display badge-display--gold">
                          <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="badge-display__text">
                            {cargandoDatos ? '...' : (horaEncierroCapturada || datosOperativos.hora_encierro || '--:--')}
                          </span>
                        </div>
                      </div>

                      <div className="info-card__item">
                        <span className="info-card__label">¿Hubo Corridas Perdidas?</span>
                        <div style={{
                          display: 'flex',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          border: '1px solid #e5e7eb',
                          marginTop: '0.25rem',
                          height: '2.3rem'
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
                            SÍ
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
                            NO
                          </button>
                        </div>
                      </div>

                      {huboCorridasPerdidas && (
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
                              <span>{perdidaCiclos ? ciclosOptions.find(opt => opt.value === perdidaCiclos)?.label + ' CICLOS' : 'SELECCIONAR'}</span>
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
                              <span>{perdidaMotivo || 'SELECCIONAR MOTIVO'}</span>
                              <svg className={`arrow-icon ${dropdownMotivoOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownMotivoOpen ? 'rotate(180deg)' : 'none', width: '0.75rem', height: '0.75rem' }} fill="currentColor" viewBox="0 0 24 24">
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

                      {huboCorridasPerdidas && (perdidaCiclos !== (datosOperativos.ciclo || '') || perdidaMotivo !== (datosOperativos.motivo || '')) && (
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'end', marginTop: '0.5rem' }} className="animate-fade-in-up">
                          <button
                            type="button"
                            disabled={!perdidaCiclos || !perdidaMotivo.trim() || guardandoPerdida}
                            onClick={() => handleSavePerdida(perdidaCiclos, perdidaMotivo.trim())}
                            className="interactive-input"
                            style={{
                              width: 'auto',
                              padding: '0 1.5rem',
                              height: '2.3rem',
                              background: '#6b1d33',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: (!perdidaCiclos || !perdidaMotivo.trim() || guardandoPerdida) ? 'not-allowed' : 'pointer',
                              opacity: (!perdidaCiclos || !perdidaMotivo.trim() || guardandoPerdida) ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            {guardandoPerdida && (
                              <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
                            )}
                            GUARDAR
                          </button>
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
                              onClick={() => handleCambiarEstatus(st.id)}
                              disabled={cambiandoEstatus}
                              style={{
                                padding: '1rem 0.5rem',
                                borderRadius: '0.75rem',
                                border: `2px solid ${isActive ? st.color : 'transparent'}`,
                                backgroundColor: isActive ? st.bgActive : 'var(--tw-color-gray-100)',
                                color: isActive ? st.color : 'var(--tw-color-gray-500)',
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
                </div>

                {/* CARD 4: CHECKLIST */}
                <div className="info-card info-card--double" style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5rem' }}>
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
                    )}
                  </div>
                  {showChecklist && !hasCompletedChecklist && (
                    <div style={{ padding: '0 0.5rem 1rem 0.5rem', marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                      <ChecklistForm
                        origen="encierro"
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-center">
                          <div className="bg-emerald-50 border border-emerald-100 py-2 rounded-xl">
                            <span className="block text-lg font-extrabold text-emerald-600 leading-none">{totalBien}</span>
                            <span className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider">Bien</span>
                          </div>
                          <div className="bg-rose-50 border border-rose-100 py-2 rounded-xl">
                            <span className="block text-lg font-extrabold text-rose-600 leading-none">{totalMal}</span>
                            <span className="text-[9px] font-bold uppercase text-rose-700 tracking-wider">Mal</span>
                          </div>
                          <div className="bg-slate-100 border border-slate-200 py-2 rounded-xl">
                            <span className="block text-lg font-extrabold text-slate-600 leading-none">{totalPendiente}</span>
                            <span className="text-[9px] font-bold uppercase text-slate-700 tracking-wider">Pendientes</span>
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
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para comenzar el registro de encierro.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {modalEstatusOpen && (
        <div className="custom-modal-overlay" onClick={() => setModalEstatusOpen(false)}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="custom-modal-title">Asignar Conductor y Ruta</h2>
            
            <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '5px', color: '#374151' }}>
                Conductor Disponible
              </label>
              <div ref={modalConductorRef} style={{ position: 'relative', width: '100%' }}>
                <button
                  type="button"
                  className="interactive-input"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.5rem', fontSize: '0.9rem', width: '100%', fontWeight: '600', borderRadius: '0.6rem',
                    border: modalEstatusConductorDropdown ? '1.5px solid var(--brand-maroon-text)' : '1.5px solid var(--tw-color-gray-200)',
                    color: modalEstatusConductorDropdown ? 'var(--brand-maroon-text)' : 'var(--tw-color-gray-900)'
                  }}
                  onClick={() => { setModalEstatusConductorDropdown(!modalEstatusConductorDropdown); setModalEstatusRutaDropdown(false); }}
                >
                  <span>
                    {modalEstatusConductor
                      ? (() => {
                          const found = (dbConductores || []).find(c => c.id.toString() === modalEstatusConductor);
                          return found ? `${found.nombre} (${found.id})` : 'Seleccione un conductor...';
                        })()
                      : 'Seleccione un conductor...'}
                  </span>
                  <svg
                    className="arrow-icon"
                    style={{
                      transition: 'transform 0.2s', width: '0.75rem', height: '0.75rem',
                      transform: modalEstatusConductorDropdown ? 'rotate(180deg)' : 'none',
                      color: modalEstatusConductorDropdown ? 'var(--brand-maroon-text)' : 'inherit'
                    }}
                    fill="currentColor" viewBox="0 0 24 24"
                  >
                    <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                  </svg>
                </button>
                {modalEstatusConductorDropdown && (
                  <div className="dropdown-menu" style={{ display: 'block', width: '100%', minWidth: 'unset', top: '100%', background: 'var(--tw-color-white)', zIndex: 9999 }}>
                    <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                      <button
                        type="button"
                        className="dropdown-menu__item"
                        style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--tw-color-gray-900)' }}
                        onClick={() => { setModalEstatusConductor(''); setModalEstatusConductorDropdown(false); }}
                      >
                        Seleccione un conductor...
                      </button>
                      {(conductoresDisponibles || []).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="dropdown-menu__item"
                          style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--tw-color-gray-900)' }}
                          onClick={() => { setModalEstatusConductor(c.id.toString()); setModalEstatusConductorDropdown(false); }}
                        >
                          {c.nombre} ({c.id})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '5px', color: '#374151' }}>
                Ruta
              </label>
              <div ref={modalRutaRef} style={{ position: 'relative', width: '100%' }}>
                <button
                  type="button"
                  className="interactive-input"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.5rem', fontSize: '0.9rem', width: '100%', fontWeight: '600', borderRadius: '0.6rem',
                    border: modalEstatusRutaDropdown ? '1.5px solid var(--brand-maroon-text)' : '1.5px solid var(--tw-color-gray-200)',
                    color: modalEstatusRutaDropdown ? 'var(--brand-maroon-text)' : 'var(--tw-color-gray-900)'
                  }}
                  onClick={() => { setModalEstatusRutaDropdown(!modalEstatusRutaDropdown); setModalEstatusConductorDropdown(false); }}
                >
                  <span>{modalEstatusRuta || 'Seleccione una ruta...'}</span>
                  <svg
                    className="arrow-icon"
                    style={{
                      transition: 'transform 0.2s', width: '0.75rem', height: '0.75rem',
                      transform: modalEstatusRutaDropdown ? 'rotate(180deg)' : 'none',
                      color: modalEstatusRutaDropdown ? 'var(--brand-maroon-text)' : 'inherit'
                    }}
                    fill="currentColor" viewBox="0 0 24 24"
                  >
                    <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                  </svg>
                </button>
                {modalEstatusRutaDropdown && (
                  <div className="dropdown-menu" style={{ display: 'block', width: '100%', minWidth: 'unset', top: '100%', background: 'var(--tw-color-white)', zIndex: 9999 }}>
                    <div className="dropdown-menu__scroll" style={{ maxHeight: '12rem' }}>
                      <button
                        type="button"
                        className="dropdown-menu__item"
                        style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--tw-color-gray-900)' }}
                        onClick={() => { setModalEstatusRuta(''); setModalEstatusRutaDropdown(false); }}
                      >
                        Seleccione una ruta...
                      </button>
                      {(rutasOpciones || []).map(r => (
                        <button
                          key={r}
                          type="button"
                          className="dropdown-menu__item"
                          style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--tw-color-gray-900)' }}
                          onClick={() => { setModalEstatusRuta(r); setModalEstatusRutaDropdown(false); }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="custom-modal-actions">
              <button
                type="button"
                className="custom-modal-btn-save"
                onClick={confirmModalEstatus}
                disabled={!modalEstatusConductor || !modalEstatusRuta}
                style={{ opacity: (!modalEstatusConductor || !modalEstatusRuta) ? 0.5 : 1, cursor: (!modalEstatusConductor || !modalEstatusRuta) ? 'not-allowed' : 'pointer' }}
              >
                Guardar
              </button>
              <button
                type="button"
                className="custom-modal-btn-cancel"
                onClick={() => setModalEstatusOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}