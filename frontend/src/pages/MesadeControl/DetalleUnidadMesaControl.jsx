// src/pages/MesaControl/DetalleUnidadMesaControl.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import Header from '../../components/Header/Header';
import LocalSearchBar from '../../components/LocalSearchBar/LocalSearchBar';
import UnitSelector from '../Unidades/componentsdetalleunidad/UnitSelector';
import UnitInfoPanelMesaControl from './UnitInfoPanelMesaControl';
import ChecklistForm from '../CheckList/CheckList';
import { generarPDFChecklist } from '../../utils/generarPDFChecklist';

import '../Unidades/DetalleUnidad.css';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CONDUCTORES from '../../data/conductores';
import Swal from 'sweetalert2';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { useConfirmAction } from '../../hooks/useConfirmAction';

export default function DetalleUnidadMesaControl() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirmAction } = useConfirmAction();

  // Hooks moved before early return (rules-of-hooks)
  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: '',
    corrida: '',
    horaSalida: '',
  });
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [tarjetonBusqueda, setTarjetonBusqueda] = useState('');
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');
  const [fallaTexto, setFallaTexto] = useState('');
  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);
  const [rutasOpciones, setRutasOpciones] = useState([]);

  // Estados para Checklist
  const [showChecklist, setShowChecklist] = useState(false);
  const [hasCompletedChecklist, setHasCompletedChecklist] = useState(false);
  const [viewingChecklist, setViewingChecklist] = useState(false);
  const [recentChecklist, setRecentChecklist] = useState(null);
  const [lightboxDibujo, setLightboxDibujo] = useState(null);
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  const [modalEstatusOpen, setModalEstatusOpen] = useState(false);
  const [modalEstatusNuevo, setModalEstatusNuevo] = useState(null);
  const [modalEstatusConductor, setModalEstatusConductor] = useState('');
  const [modalEstatusRuta, setModalEstatusRuta] = useState('');
  const [modalEstatusConductorDropdown, setModalEstatusConductorDropdown] = useState(false);
  const [modalEstatusRutaDropdown, setModalEstatusRutaDropdown] = useState(false);
  
  // Estados para cambio de unidad en modal de estatus
  const [cambioUnidadActivo, setCambioUnidadActivo] = useState(false);
  const [unidadReemplazoSeleccionada, setUnidadReemplazoSeleccionada] = useState(null);
  const [dropdownReemplazoEcoOpen, setDropdownReemplazoEcoOpen] = useState(false);
  const [reemplazoForm, setReemplazoForm] = useState({ tarjeton: '', ruta: '', corrida: '' });
  const [dropdownReemplazoTarjetonOpen, setDropdownReemplazoTarjetonOpen] = useState(false);
  const [dropdownReemplazoRutaOpen, setDropdownReemplazoRutaOpen] = useState(false);

  const modalConductorRef = useRef(null);
  const modalRutaRef = useRef(null);
  const ecoReemplazoRef = useRef(null);
  const tarjetonReemplazoRef = useRef(null);
  const rutaReemplazoRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalConductorRef.current && !modalConductorRef.current.contains(e.target)) {
        setModalEstatusConductorDropdown(false);
      }
      if (modalRutaRef.current && !modalRutaRef.current.contains(e.target)) {
        setModalEstatusRutaDropdown(false);
      }
      if (ecoReemplazoRef.current && !ecoReemplazoRef.current.contains(e.target)) {
        setDropdownReemplazoEcoOpen(false);
      }
      if (tarjetonReemplazoRef.current && !tarjetonReemplazoRef.current.contains(e.target)) {
        setDropdownReemplazoTarjetonOpen(false);
      }
      if (rutaReemplazoRef.current && !rutaReemplazoRef.current.contains(e.target)) {
        setDropdownReemplazoRutaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDirty = modalEstatusOpen;
  useUnsavedChanges(isDirty, null);

  const handleCloseModalEstatus = async () => {
    if (isDirty) {
      const confirmed = await confirmAction({
        title: 'Cancelar Cambio',
        text: '¿Seguro que deseas cancelar el cambio de estatus/relevo? La información ingresada se perderá.',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, continuar'
      });
      if (!confirmed) return;
    }
    setModalEstatusOpen(false);
  };

  const queryClient = useQueryClient();

  const configActual = transportModules.find((m) => m.id === tipoTransporte);

  // Utilidades
  const getToken = () => (localStorage.getItem('token') || sessionStorage.getItem('token'));
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;
  const normalizarNumeroEco = (valor) => {
    const digitos = String(valor ?? '').trim().toUpperCase().match(/\d+/)?.[0] ?? '';
    return digitos.padStart(3, '0');
  };

  const fetchUnidades = async () => {
    const token = getToken();
    if (!token) {
      navigate('/login');
      return [];
    }
    const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${tipoTransporte}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (respuesta.status === 401) {
      navigate('/login');
      return [];
    }
    if (!respuesta.ok) throw new Error('Error al obtener lista de unidades');
    const datos = await respuesta.json();
    return (Array.isArray(datos) ? datos : []).map((u) => ({
      eco: String(u.numero_eco ?? '').padStart(3, '0'),
      tarjeton: String(u.tarjeton ?? '').trim(),
      display: formatearEco(u.numero_eco),
      estado: u.estatus || 'operacion',
    }));
  };

  const { data: unidadesList = [], isLoading: cargandoUnidades } = useQuery({
    queryKey: ['unidades-list', tipoTransporte],
    queryFn: fetchUnidades,
    staleTime: 0,
    refetchInterval: 5000,
  });

  const { data: dbConductores = [], isLoading: cargandoConductores, refetch: fetchConductores } = useQuery({
    queryKey: ['conductores-list'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return [];
      const res = await fetch(`${API_BASE}/api/conductores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(c => ({
          id: c.tarjeton,
          tarjeton: c.tarjeton,
          nombre: c.nombre,
          estado_servicio: c.estado_servicio,
          tipo_tarjeton: c.tipo_tarjeton
        }));
      }
      return [];
    },
    staleTime: 0,
    refetchInterval: 5000,
  });

  const { data: dbManiobristas = [] } = useQuery({
    queryKey: ['maniobristas-list'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return [];
      const res = await fetch(`${API_BASE}/api/conductores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filtrar solo conductores con estado_servicio = 'maniobrista'
        return data
          .filter(m => m.estado_servicio === 'maniobrista')
          .map(m => ({
            id: m.tarjeton,
            tarjeton: m.tarjeton,
            nombre: m.nombre,
            estado_servicio: m.estado_servicio,
            tipo_tarjeton: m.tipo_tarjeton
          }));
      }
      return [];
    },
    staleTime: 0,
    refetchInterval: 5000,
  });

  const unidadesPorEstado = (estado) =>
    unidadesList.filter((u) => u.estado === estado);

  const isTroncal = configActual?.id === 'urbanus' || configActual?.id === 'urbanuss';
  const conductoresDisponibles = dbConductores.filter(c => 
    c.estado_servicio === 'disponible' && 
    (!isTroncal || c.tipo_tarjeton === 'C')
  );

  // Mostrar todos los maniobristas (no solo disponibles) para visualización en el panel
  const maniobristasDisponibles = dbManiobristas;

  // Efecto para resetear campos cuando se selecciona una unidad de reemplazo
  useEffect(() => {
    if (unidadReemplazoSeleccionada) {
      setDropdownReemplazoEcoOpen(false);
    }
  }, [unidadReemplazoSeleccionada]);

  const selectedEcoClean = selectedOption ? String(selectedOption.match(/\d+/)?.[0] || '').padStart(3, '0') : '';

  const { data: activeUnitData, refetch: refetchActiveUnit } = useQuery({
    queryKey: ['unidad-detalle', tipoTransporte, selectedEcoClean],
    queryFn: async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token || !selectedEcoClean) return null;
      const url = `${API_BASE}/api/unidades/detalle/${tipoTransporte}/${selectedEcoClean}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error en peticion');
      return res.json();
    },
    enabled: !!selectedEcoClean,
    refetchInterval: 5000, // Poll every 5 seconds for real time!
    staleTime: 0,
  });

  useEffect(() => {
    if (activeUnitData) {
      if (activeUnitData.status === 'success') {
        setDatosOperativos({
          conductor: activeUnitData.conductor || 'No reportado hoy',
          ruta: activeUnitData.ruta || 'Sin ruta',
          tarjeton: activeUnitData.tarjeton || '',
          corrida: activeUnitData.corridas || '',
          horaSalida: activeUnitData.hora_salida || '',
          estatus: activeUnitData.estatus || 'operacion',
          ciclo: activeUnitData.ciclo || '',
          motivo: activeUnitData.motivo_estatus || activeUnitData.motivo || '',
          horaProgramada: activeUnitData.hora_programada || '',
          acople: activeUnitData.acople || '',
        });
        setFallaTexto(activeUnitData.falla || '');
        setSelectedEstado(activeUnitData.estatus || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
          corrida: '',
          horaSalida: '',
          estatus: 'operacion',
          ciclo: '',
          motivo: '',
          horaProgramada: '',
          acople: '',
        });
        setFallaTexto('');
      }
      setCargandoDatos(false);
    }
  }, [activeUnitData]);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
            if (configActual?.id === 'urbanus' || configActual?.id === 'urbanuss') {
              setRutasOpciones(data.troncales || []);
            } else {
              setRutasOpciones(data.alimentadoras || []);
            }
        }
      } catch (err) {
        console.error('Error fetching rutas', err);
      }
    };
    if (configActual) {
      fetchRutas();
    }
  }, [configActual]);

  useEffect(() => {
    const ecoDesdeRuta = searchParams.get('eco');
    if (!ecoDesdeRuta || !unidadesList.length) return;

    const ecoNormalizado = normalizarNumeroEco(ecoDesdeRuta);
    const unidadEncontrada = unidadesList.find(
      (unidad) =>
        unidad.eco === ecoNormalizado ||
        unidad.display === formatearEco(ecoNormalizado)
    );

    if (unidadEncontrada) {
      handleSelectUnit(unidadEncontrada);
    }
  }, [searchParams, unidadesList]);

  // ========== FUNCIONES (COPIADAS EXACTAMENTE DEL DETALLE ORIGINAL) ==========
  const handleSelectUnit = async (unidad) => {
    const unidadSeleccionada =
      typeof unidad === 'object' && unidad !== null
        ? unidad
        : unidadesList.find(
            (item) =>
              item.display === unidad ||
              item.eco === unidad ||
              String(item.tarjeton ?? '').trim() === String(unidad ?? '').trim()
          ) || null;

    if (!unidadSeleccionada) {
      console.warn('Unidad no encontrada:', unidad);
      return;
    }

    const ecoSeleccionado = unidadSeleccionada.display;
    setSelectedOption(ecoSeleccionado);
    setSelectedEstado(unidadSeleccionada.estado);
    setTarjetonBusqueda(unidadSeleccionada.tarjeton || '');
    setCargandoDatos(true);
    setMensajeBusqueda('');
    setOpenDropdown(null);
  };

  const buscarUnidadPorInput = async () => {
    const valor = String(tarjetonBusqueda ?? '').trim();
    setMensajeBusqueda('');
    if (!valor) {
      setMensajeBusqueda('Escribe un número de tarjetón para buscar.');
      return;
    }
    let unidadEncontrada = unidadesList.find(
      (unidad) => String(unidad.tarjeton ?? '').trim() === valor
    );
    if (unidadEncontrada) {
      setTarjetonBusqueda(unidadEncontrada.tarjeton || valor);
      await handleSelectUnit(unidadEncontrada);
      return;
    }
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const respuesta = await fetch(
        `${API_BASE}/api/unidades/buscar-tarjeton/${tipoTransporte}/${encodeURIComponent(valor)}`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado?.status === 'success' && resultado?.unidad) {
        const unidadRemota = {
          eco: String(resultado.unidad.numero_eco ?? '').padStart(3, '0'),
          tarjeton: String(resultado.unidad.tarjeton ?? '').trim(),
          display: formatearEco(resultado.unidad.numero_eco),
          estado: resultado.unidad.estatus || 'operacion',
        };
        queryClient.setQueryData(['unidades-list', tipoTransporte], (prev = []) => {
          if (prev.some((item) => item.eco === unidadRemota.eco)) return prev;
          return [...prev, unidadRemota];
        });
        setTarjetonBusqueda(unidadRemota.tarjeton || valor);
        await handleSelectUnit(unidadRemota);
      } else {
        setMensajeBusqueda('No se encontró una unidad con ese número de tarjetón.');
      }
    } catch (error) {
      console.error('Error al buscar por tarjetón:', error);
      setMensajeBusqueda('No se pudo completar la búsqueda en este momento.');
    }
  };

  const handleSaveFalla = async () => {
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        falla: fallaTexto || null,
      };
      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-adicionales`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'success',
          title: '¡Falla registrada!',
          text: 'El tipo de falla se ha guardado correctamente.',
          confirmButtonColor: '#c29b53',
          timer: 2000,
        });
      } else {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: resultado.message || 'Error al guardar la falla',
          confirmButtonColor: '#601a2a',
        });
      }
    } catch (error) {
      console.error('Error al guardar falla:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error de conexión',
        confirmButtonColor: '#601a2a',
      });
    }
  };

  const handleSaveTarjeton = async (nuevoTarjeton) => {
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
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
        setTarjetonBusqueda(resultado.tarjeton);
        queryClient.invalidateQueries(['conductores-list']);
        fetchConductores();
        queryClient.invalidateQueries(['unidades-list', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);
        
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'success',
          title: '¡Tarjetón Asignado!',
          text: `Se asignó al conductor: ${resultado.conductor}`,
          confirmButtonColor: 'var(--tw-color-gray-300)',
          timer: 2000,
        });
      } else {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Error de Asignación',
          text: resultado.message || 'Error al actualizar el tarjetón',
          confirmButtonColor: '#601a2a',
        });
      }
    } catch (error) {
      console.error('Error al guardar tarjetón:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor',
        confirmButtonColor: '#601a2a',
      });
    }
  };

  const handleSaveTarjetonManiobrista = async (nuevoTarjeton) => {
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        tarjeton: nuevoTarjeton,
      };
      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-tarjeton-maniobrista`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos((prev) => ({
          ...prev,
          tarjeton_maniobrista: resultado.tarjeton,
          nombre_maniobrista: resultado.maniobrista,
        }));
        queryClient.invalidateQueries(['maniobristas-list']);
        queryClient.invalidateQueries(['unidades-list', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);
        
        const Swal = (await import('sweetalert2')).default;
        if (nuevoTarjeton === '') {
            Swal.fire({
                icon: 'success',
                title: '¡Maniobrista Removido!',
                text: 'Se removió el maniobrista de esta unidad.',
                confirmButtonColor: 'var(--tw-color-gray-300)',
                timer: 2000,
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: '¡Maniobrista Asignado!',
                text: `Se asignó al maniobrista: ${resultado.maniobrista}`,
                confirmButtonColor: 'var(--tw-color-gray-300)',
                timer: 2000,
            });
        }
      } else {
        const Swal = (await import('sweetalert2')).default;
        Swal.fire({
          icon: 'error',
          title: 'Error de Asignación',
          text: resultado.message || 'Error al actualizar el tarjetón del maniobrista',
          confirmButtonColor: '#601a2a',
        });
      }
    } catch (error) {
      console.error('Error al guardar tarjetón maniobrista:', error);
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo conectar con el servidor',
        confirmButtonColor: '#601a2a',
      });
    }
  };

  const handleSaveRuta = async (nuevaRuta) => {
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
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

  const handleSaveHoras = async (horaProgramada, acople) => {
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      
      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        hora_programada: horaProgramada,
        acople: acople,
      };

      const respuesta = await fetch(`${API_BASE}/api/despacho/actualizar-horas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resultado = await respuesta.json();
      if (respuesta.ok && resultado.status === 'success') {
        setDatosOperativos((prev) => ({
          ...prev,
          horaProgramada: horaProgramada,
          acople: acople,
        }));
        return { success: true };
      } else {
        throw new Error(resultado.message || 'Error al actualizar las horas.');
      }
    } catch (error) {
      console.error('Error al guardar horas:', error);
      throw error;
    }
  };

  const handleCancelFalla = () => {
    setFallaTexto('');
  };

  // ========== FUNCIONES PARA CHECKLIST ==========
  const getConductorDisplay = () => {
    const val = datosOperativos.conductor;
    if (!val || val === 'Sin conductor' || val === 'No reportado hoy') return 'No asignado';
    const isNum = !isNaN(val) && String(val).trim() !== '';
    if (isNum) {
      const found = CONDUCTORES.find((c) => c.id === Number(val));
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
        headers: { Authorization: `Bearer ${token}` },
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
      console.error('Error al revisar historial', e);
    }
  };

  useEffect(() => {
    setHasCompletedChecklist(false);
    setShowChecklist(false);
    setViewingChecklist(false);

    if (selectedOption) {
      const ecoNum = selectedOption.replace(/\D/g, '');
      if (ecoNum) checkHistory(ecoNum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption]);

  const handleHacerCheckList = () => setShowChecklist(true);
  const handleRevisarCheckList = () => {
    if (recentChecklist) setViewingChecklist(true);
  };

  // ========== FUNCIONES DE CAMBIO DE ESTATUS (ya existentes) ==========
  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;
    
    if (datosOperativos.estatus === nuevoEstatus) return;

    // Ir directo al modal sin Swal intermedio
    setModalEstatusNuevo(nuevoEstatus);
    setModalEstatusConductor(datosOperativos.tarjeton ? String(datosOperativos.tarjeton).trim() : '');
    setModalEstatusRuta(datosOperativos.ruta ? datosOperativos.ruta : '');
    setModalEstatusConductorDropdown(false);
    setModalEstatusRutaDropdown(false);
    // Resetear estados de cambio de unidad
    setCambioUnidadActivo(false);
    setUnidadReemplazoSeleccionada(null);
    setDropdownReemplazoEcoOpen(false);
    setReemplazoForm({ tarjeton: '', ruta: '', corrida: '' });
    setDropdownReemplazoTarjetonOpen(false);
    setDropdownReemplazoRutaOpen(false);
    setModalEstatusOpen(true);
  };

  const handleSelectReemplazoUnit = (unidad) => {
    setUnidadReemplazoSeleccionada(unidad);
  };

  const confirmModalEstatus = async () => {
    // Validación según el tipo de cambio de estatus
    if (modalEstatusNuevo === 'operacion') {
      // Para OPERACIÓN, conductor y ruta son OBLIGATORIOS
      if (!modalEstatusConductor || !modalEstatusRuta) {
        Swal.fire('Error', 'Para cambiar a OPERACIÓN debe asignar conductor y ruta', 'error');
        return;
      }
    }
    
    // Validación para cambio de unidad
    if (cambioUnidadActivo) {
      if (!unidadReemplazoSeleccionada || !reemplazoForm.tarjeton || !reemplazoForm.ruta || !String(reemplazoForm.corrida || '').trim()) {
        Swal.fire('Error', 'Debe completar todos los campos para el cambio de unidad (ECO, Tarjetón, Ruta y Corrida)', 'error');
        return;
      }
    }

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
      ruta: modalEstatusRuta,
      cambio_unidad_activo: cambioUnidadActivo ? 1 : 0,
      eco_reemplazo: cambioUnidadActivo ? unidadReemplazoSeleccionada.eco : null,
      tarjeton_reemplazo: cambioUnidadActivo ? reemplazoForm.tarjeton : null,
      ruta_reemplazo: cambioUnidadActivo ? reemplazoForm.ruta : null,
      corrida_reemplazo: cambioUnidadActivo ? String(reemplazoForm.corrida || '') : null
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
        queryClient.invalidateQueries(['conductores-list']);
        fetchConductores();

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

        queryClient.setQueryData(['unidades-list', tipoTransporte], (old = []) => {
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

        queryClient.invalidateQueries(['unidades-list', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);
        queryClient.invalidateQueries(['unidadesDashboard', tipoTransporte]);
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

  // =========================== JSX ===========================
  return (
    <div className="layout-container">
      <Header
        title={selectedOption || 'Seleccione Unidad'}
        eyebrow={`${configActual.title} / Mesa de Control`}
      />
      <main className="main-content">
        <div className="unit-control-panel">
          <LocalSearchBar 
            unidades={unidadesList} 
            onSelectUnit={handleSelectUnit} 
            moduleName={configActual?.title || 'esta sección'} 
          />
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
            {/* RESERVA T6 (Conductores Disponibles) */}
            <div className="dropdown-container" style={{ position: 'relative', overflow: 'visible' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button 
                  onClick={() => setOpenDropdown(openDropdown === 'reservaT6' ? null : 'reservaT6')} 
                  className={`dropdown-trigger ${openDropdown === 'reservaT6' ? 'dropdown-trigger--open' : ''}`}
                >
                  <div className="dropdown-trigger__icon-container">
                    <svg className="dropdown-trigger__icon" viewBox="0 0 24 24" fill="none" stroke="#6b1d33" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '2rem', height: '2rem' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span className="dropdown-trigger__value">RESERVA T6</span>
                  <div className={`dropdown-trigger__arrow ${openDropdown === 'reservaT6' ? 'dropdown-trigger__arrow--open' : ''}`}>
                    <svg className="arrow-icon" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </div>
                </button>
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#6b1d33',
                    color: 'white',
                    borderRadius: '50%',
                    padding: conductoresDisponibles.length > 9 ? '2px 5px' : '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    border: '2px solid #ffffff',
                  }}
                >
                  {conductoresDisponibles.length}
                </span>
              </div>
              {openDropdown === 'reservaT6' && (
                <div className="dropdown-menu">
                  <div className="dropdown-menu__scroll">
                    {conductoresDisponibles.length > 0 ? (
                      conductoresDisponibles.map((c) => (
                        <div key={c.tarjeton} className="dropdown-menu__item" style={{ cursor: 'default' }}>
                          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                            {c.tarjeton}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-menu__item dropdown-menu__item--empty">Sin reservas disponibles</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MANIOBRISTAS (NUEVO) */}
            <div className="dropdown-container" style={{ position: 'relative', overflow: 'visible' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button 
                  onClick={() => setOpenDropdown(openDropdown === 'maniobristas' ? null : 'maniobristas')} 
                  className={`dropdown-trigger ${openDropdown === 'maniobristas' ? 'dropdown-trigger--open' : ''}`}
                >
                  <div className="dropdown-trigger__icon-container" style={{ background: '#f59e0b20' }}>
                    <svg className="dropdown-trigger__icon" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '2rem', height: '2rem' }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span className="dropdown-trigger__value" style={{ color: '#d97706' }}>MANIOBRISTAS</span>
                  <div className={`dropdown-trigger__arrow ${openDropdown === 'maniobristas' ? 'dropdown-trigger__arrow--open' : ''}`}>
                    <svg className="arrow-icon" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#d97706' }}>
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </div>
                </button>
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#d97706',
                    color: 'white',
                    borderRadius: '50%',
                    padding: maniobristasDisponibles.length > 9 ? '2px 5px' : '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    border: '2px solid #ffffff',
                  }}
                >
                  {maniobristasDisponibles.length}
                </span>
              </div>
              {openDropdown === 'maniobristas' && (
                <div className="dropdown-menu">
                  <div className="dropdown-menu__scroll">
                    {maniobristasDisponibles.length > 0 ? (
                      maniobristasDisponibles.map((m) => (
                        <div key={m.tarjeton} className="dropdown-menu__item" style={{ cursor: 'default' }}>
                          <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#d97706' }}>
                            {m.tarjeton}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                            {m.nombre}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-menu__item dropdown-menu__item--empty">Sin maniobristas asignados</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="info-panel">
            {selectedOption ? (
              <>
                <UnitInfoPanelMesaControl
                  selectedOption={selectedOption}
                  configActual={configActual}
                  datosOperativos={datosOperativos}
                  cargandoDatos={cargandoDatos}
                  tarjetonBusqueda={tarjetonBusqueda}
                  setTarjetonBusqueda={setTarjetonBusqueda}
                  mensajeBusqueda={mensajeBusqueda}
                  buscarUnidadPorInput={buscarUnidadPorInput}
                  fallaTexto={fallaTexto}
                  setFallaTexto={setFallaTexto}
                  handleSaveFalla={handleSaveFalla}
                  handleCancelFalla={handleCancelFalla}
                  handleSaveTarjeton={handleSaveTarjeton}
                  handleSaveTarjetonManiobrista={handleSaveTarjetonManiobrista}
                  handleSaveRuta={handleSaveRuta}
                  handleSaveHoras={handleSaveHoras}
                  handleCambiarEstatus={handleCambiarEstatus}
                  cambiandoEstatus={cambiandoEstatus}
                  conductoresDisponibles={conductoresDisponibles}
                  maniobristasDisponibles={maniobristasDisponibles}
                  unidadesReserva={unidadesPorEstado('reserva')}
                  onUpdate={handleSelectUnit}
                />

                {/* NUEVOS APARTADOS: MOVILIDAD Y ESTATUS + CHECKLIST */}
                <div className="mt-6 space-y-6">
                  {/* Movilidad y Estatus */}
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
                          { id: 'mantenimiento', label: 'MANTENIMIENTO', color: 'var(--status-yellow-text)', bgActive: 'var(--status-yellow-light)' },
                        ].map((st) => {
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
                                opacity: cambiandoEstatus && !isActive ? 0.5 : 1,
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

                  {/* Motivo de Mantenimiento */}
                  {datosOperativos.estatus === 'mantenimiento' && (
                    <div className="info-card">
                      <div className="info-card__header">
                        <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="info-card__title">Motivo de Mantenimiento</h3>
                      </div>
                      <div className="info-card__body">
                        <p style={{ margin: 0, color: 'var(--tw-color-gray-700)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                          {datosOperativos.motivo || 'Sin motivo registrado'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Checklist */}
                  <div className="info-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
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
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4a1020')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6b1d33')}
                          onFocus={(e) => (e.currentTarget.style.backgroundColor = '#4a1020')}
                          onBlur={(e) => (e.currentTarget.style.backgroundColor = '#6b1d33')}
                          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
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
                            backgroundColor: !recentChecklist ? '#9ca3af' : '#c29b53',
                            color: 'white',
                            fontSize: '1.25rem',
                            fontWeight: '800',
                            cursor: !recentChecklist ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px -2px rgba(194, 155, 83, 0.4)',
                            transition: 'transform 0.1s, background-color 0.2s',
                            padding: '1rem',
                            opacity: !recentChecklist ? 0.6 : 1,
                          }}
                          onMouseOver={(e) => !(!recentChecklist) && (e.currentTarget.style.backgroundColor = '#a88344')}
                          onMouseOut={(e) => !(!recentChecklist) && (e.currentTarget.style.backgroundColor = '#c29b53')}
                          onFocus={(e) => !(!recentChecklist) && (e.currentTarget.style.backgroundColor = '#a88344')}
                          onBlur={(e) => !(!recentChecklist) && (e.currentTarget.style.backgroundColor = '#c29b53')}
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
                          origen="mesaControl"
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
                            })(),
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
                              confirmButtonColor: '#6b1d33',
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
                        alerta_tablero: 'Alerta en tablero',
                      };

                      return (
                        <div className="animate-fade-in-up mt-6 rounded-2xl border border-rose-900/10 bg-white p-5 shadow-md">
                          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                            <h4 className="text-base font-extrabold text-rose-950">Puntos Evaluados</h4>
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
                                        <p className="text-xs font-bold text-slate-800 leading-tight">{PUNTOS_LABEL[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</p>
                                        {val?.observaciones ? (
                                          <p className="mt-1 text-[10px] text-slate-500 break-words">
                                            <span className="font-semibold text-slate-400">Obs:</span> {val.observaciones}
                                          </p>
                                        ) : (
                                          <p className="mt-0.5 text-[9px] italic text-slate-400">Sin observaciones</p>
                                        )}

                                        {(val?.foto || (val?.fotos && val.fotos.length > 0)) && (
                                          <div className="mt-2 flex flex-wrap gap-1.5">
                                            {val.foto && (
                                              <img
                                                src={val.foto}
                                                alt="Evidencia"
                                                className="h-12 w-12 rounded-lg object-cover border border-slate-100 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                                                onClick={() => setLightboxDibujo(val.foto)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxDibujo(val.foto); } }}
                                                role="button"
                                                tabIndex={0}
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
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxDibujo(imgUrl); } }}
                                                role="button"
                                                tabIndex={0}
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
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxDibujo(recentChecklist.dibujo); } }}
                                  role="button"
                                  tabIndex={0}
                                  title="Clic para ampliar"
                                />
                              </div>
                            </div>
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
              </>
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para ver los detalles de inspección.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {modalEstatusOpen && (
        <div
          className="custom-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModalEstatus(); }}
          role="button"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') handleCloseModalEstatus(); }}
        >
          <div className="custom-modal-content">
            <h2 className="custom-modal-title">
              {modalEstatusNuevo === 'operacion' ? 'Asignar Conductor y Ruta' : 
               modalEstatusNuevo === 'reserva' ? 'Cambiar a RESERVA' : 
               'Cambiar a MANTENIMIENTO'}
            </h2>
            
            {/* Sección de Información Actual */}
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
              <p style={{ color: '#0b162c', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                <strong>ECO:</strong> {selectedOption}
              </p>
              {datosOperativos.conductor && (
                <p style={{ color: '#0b162c', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  <strong>Conductor:</strong> {datosOperativos.conductor}
                </p>
              )}
              {datosOperativos.tarjeton && (
                <p style={{ color: '#0b162c', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  <strong>Tarjetón:</strong> {datosOperativos.tarjeton}
                </p>
              )}
              {datosOperativos.ruta && (
                <p style={{ color: '#0b162c', fontSize: '0.9rem', fontWeight: 500 }}>
                  <strong>Ruta:</strong> {datosOperativos.ruta}
                </p>
              )}
            </div>
            
            {/* Checkbox para cambiar unidad */}
            {datosOperativos.estatus === 'operacion' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, cursor: 'pointer', marginBottom: '1.5rem', marginTop: '1rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={cambioUnidadActivo}
                  onChange={(e) => {
                    setCambioUnidadActivo(e.target.checked);
                    if (e.target.checked) {
                      setReemplazoForm({ 
                        tarjeton: datosOperativos.tarjeton || '', 
                        ruta: datosOperativos.ruta && datosOperativos.ruta !== 'Sin ruta' ? datosOperativos.ruta : '', 
                        corrida: datosOperativos.corrida || '' 
                      });
                    } else {
                      setUnidadReemplazoSeleccionada(null);
                      setReemplazoForm({ tarjeton: '', ruta: '', corrida: '' });
                      setDropdownReemplazoEcoOpen(false);
                      setDropdownReemplazoTarjetonOpen(false);
                      setDropdownReemplazoRutaOpen(false);
                    }
                  }}
                  style={{ width: '1.25rem', height: '1.25rem', accentColor: '#6b1d33' }}
                />
                <span style={{ color: '#0f172a' }}>Cambiar de unidad</span>
              </label>
            )}

            {!cambioUnidadActivo ? (
              <>
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
                              const found = (dbConductores || []).find(c => c.id.toString() === modalEstatusConductor || c.tarjeton === modalEstatusConductor);
                              return found ? `${found.nombre} (${found.tarjeton})` : 'Seleccione un conductor...';
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
                              onClick={() => { setModalEstatusConductor(c.tarjeton); setModalEstatusConductorDropdown(false); }}
                            >
                              {c.nombre} ({c.tarjeton})
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
              </>
            ) : (
              <div style={{ display: 'grid', gap: '1.25rem', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e5e7eb', background: '#f8fafc', marginBottom: '1.5rem' }}>
                
                {/* Número de ECO - Dropdown */}
                <div style={{ display: 'grid', gap: '0.4rem', position: 'relative' }} ref={ecoReemplazoRef}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Número de ECO</span>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.8rem', fontSize: '0.9rem', width: '100%', border: '1px solid #e5e7eb', borderRadius: '0.75rem'
                    }}
                    onClick={() => setDropdownReemplazoEcoOpen(!dropdownReemplazoEcoOpen)}
                  >
                    <span style={{ fontWeight: 600, color: unidadReemplazoSeleccionada ? '#0b162c' : '#94a3b8', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {unidadReemplazoSeleccionada ? `ECO${String(unidadReemplazoSeleccionada.eco).padStart(3, '0')}` : 'Seleccione una unidad en reserva...'}
                    </span>
                    <svg className={`arrow-icon ${dropdownReemplazoEcoOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownReemplazoEcoOpen ? 'rotate(180deg)' : 'none', width: '1rem', height: '1rem', color: '#6b1d33', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {dropdownReemplazoEcoOpen && (
                    <div className="dropdown-menu shadow-lg border border-slate-100" style={{ width: '100%', minWidth: 'unset', top: 'calc(100% + 4px)', background: 'var(--tw-color-white)', opacity: 1, zIndex: 9999, borderRadius: '0.75rem', position: 'absolute' }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '14rem' }}>
                        {(unidadesList.filter(u => u.estado === 'reserva') || []).map(u => (
                          <button
                            key={u.eco}
                            type="button"
                            className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: unidadReemplazoSeleccionada?.eco === u.eco ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                            onClick={() => handleSelectReemplazoUnit(u)}
                          >
                            ECO{String(u.eco).padStart(3, '0')} {u.tarjeton ? `(${u.tarjeton})` : '(Sin tarjetón)'}
                          </button>
                        ))}
                        {(!unidadesList.filter(u => u.estado === 'reserva') || unidadesList.filter(u => u.estado === 'reserva').length === 0) && (
                          <span style={{ color: '#6b7280', fontSize: '0.9rem', padding: '0.75rem 1rem', display: 'block' }}>No hay unidades en reserva disponibles</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tarjetón - Dropdown */}
                <div style={{ display: 'grid', gap: '0.4rem', position: 'relative' }} ref={tarjetonReemplazoRef}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Número de Tarjetón</span>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.8rem', fontSize: '0.9rem', width: '100%', border: '1px solid #e5e7eb', borderRadius: '0.75rem'
                    }}
                    onClick={() => setDropdownReemplazoTarjetonOpen(!dropdownReemplazoTarjetonOpen)}
                  >
                    <span style={{ fontWeight: 600, color: reemplazoForm.tarjeton ? '#0b162c' : '#94a3b8', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {reemplazoForm.tarjeton || 'Seleccione un tarjetón disponible...'}
                    </span>
                    <svg className={`arrow-icon ${dropdownReemplazoTarjetonOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownReemplazoTarjetonOpen ? 'rotate(180deg)' : 'none', width: '1rem', height: '1rem', color: '#6b1d33', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {dropdownReemplazoTarjetonOpen && (
                    <div className="dropdown-menu shadow-lg border border-slate-100" style={{ width: '100%', minWidth: 'unset', top: 'calc(100% + 4px)', background: 'var(--tw-color-white)', opacity: 1, zIndex: 9999, borderRadius: '0.75rem', position: 'absolute' }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '14rem' }}>
                        {(conductoresDisponibles || []).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: reemplazoForm.tarjeton === c.tarjeton ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                            onClick={() => {
                              setReemplazoForm((prev) => ({ ...prev, tarjeton: c.tarjeton }));
                              setDropdownReemplazoTarjetonOpen(false);
                            }}
                          >
                            {c.tarjeton} — {c.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ruta Asignada - Dropdown */}
                <div style={{ display: 'grid', gap: '0.4rem', position: 'relative' }} ref={rutaReemplazoRef}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Ruta Asignada</span>
                  <button
                    type="button"
                    className="interactive-input"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.85rem', cursor: 'pointer', textAlign: 'left', background: 'var(--tw-color-white)', height: '2.8rem', fontSize: '0.9rem', width: '100%', border: '1px solid #e5e7eb', borderRadius: '0.75rem'
                    }}
                    onClick={() => setDropdownReemplazoRutaOpen(!dropdownReemplazoRutaOpen)}
                  >
                    <span style={{ fontWeight: 600, color: reemplazoForm.ruta ? '#0b162c' : '#94a3b8', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.3, flex: 1, textAlign: 'left' }}>
                      {reemplazoForm.ruta || 'Seleccione una ruta...'}
                    </span>
                    <svg className={`arrow-icon ${dropdownReemplazoRutaOpen ? 'dropdown-trigger__arrow--open' : ''}`} style={{ transition: 'transform 0.2s', transform: dropdownReemplazoRutaOpen ? 'rotate(180deg)' : 'none', width: '1rem', height: '1rem', color: '#6b1d33', flexShrink: 0, marginLeft: '0.5rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                    </svg>
                  </button>
                  {dropdownReemplazoRutaOpen && (
                    <div className="dropdown-menu shadow-lg border border-slate-100" style={{ width: '100%', minWidth: 'unset', top: 'calc(100% + 4px)', background: 'var(--tw-color-white)', opacity: 1, zIndex: 9999, borderRadius: '0.75rem', position: 'absolute' }}>
                      <div className="dropdown-menu__scroll" style={{ maxHeight: '14rem' }}>
                        <button
                          type="button"
                          className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                          style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: !reemplazoForm.ruta ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                          onClick={() => {
                            setReemplazoForm((prev) => ({ ...prev, ruta: '' }));
                            setDropdownReemplazoRutaOpen(false);
                          }}
                        >
                          Seleccione una ruta...
                        </button>
                        {(rutasOpciones || []).map(r => (
                          <button
                            key={r}
                            type="button"
                            className="dropdown-menu__item hover:bg-slate-50 transition-colors"
                            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', background: 'var(--tw-color-white)', color: '#0b162c', fontWeight: reemplazoForm.ruta === r ? 'bold' : '500', textAlign: 'left', width: '100%' }}
                            onClick={() => {
                              setReemplazoForm((prev) => ({ ...prev, ruta: r }));
                              setDropdownReemplazoRutaOpen(false);
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Corrida - Input editable */}
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Corrida</span>
                  <input
                    type="text"
                    value={reemplazoForm.corrida}
                    onChange={(e) => setReemplazoForm((prev) => ({ ...prev, corrida: e.target.value }))}
                    placeholder="Ej. 123"
                    className="interactive-input"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', minWidth: '0', fontSize: '0.9rem' }}
                  />
                </div>

              </div>
            )}

            <div className="custom-modal-actions">
              <button
                type="button"
                className="custom-modal-btn-save"
                onClick={confirmModalEstatus}
                disabled={
                  (modalEstatusNuevo === 'operacion' && (!modalEstatusConductor || !modalEstatusRuta)) ||
                  (cambioUnidadActivo && (!unidadReemplazoSeleccionada || !reemplazoForm.tarjeton || !reemplazoForm.ruta || !String(reemplazoForm.corrida || '').trim()))
                }
                style={{ 
                  opacity: (
                    (modalEstatusNuevo === 'operacion' && (!modalEstatusConductor || !modalEstatusRuta)) ||
                    (cambioUnidadActivo && (!unidadReemplazoSeleccionada || !reemplazoForm.tarjeton || !reemplazoForm.ruta || !String(reemplazoForm.corrida || '').trim()))
                  ) ? 0.5 : 1, 
                  cursor: (
                    (modalEstatusNuevo === 'operacion' && (!modalEstatusConductor || !modalEstatusRuta)) ||
                    (cambioUnidadActivo && (!unidadReemplazoSeleccionada || !reemplazoForm.tarjeton || !reemplazoForm.ruta || !String(reemplazoForm.corrida || '').trim()))
                  ) ? 'not-allowed' : 'pointer' 
                }}
              >
                Guardar
              </button>
              <button
                type="button"
                className="custom-modal-btn-cancel"
                onClick={handleCloseModalEstatus}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox para imágenes del checklist */}
      {lightboxDibujo && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxDibujo(null); }}
          role="button"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') setLightboxDibujo(null); }}
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
          />
        </div>,
        document.body
      )}
    </div>
  );
}