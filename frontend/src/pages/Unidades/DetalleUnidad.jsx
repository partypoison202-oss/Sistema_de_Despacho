// src/pages/Unidades/DetalleUnidad.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import Header from '../../components/Header/Header';
import UnitSelector from './componentsdetalleunidad/UnitSelector';
import UnitInfoPanel from './componentsdetalleunidad/UnitInfoPanel';

import './DetalleUnidad.css';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CONDUCTORES from '../../data/conductores';
import Swal from 'sweetalert2';

export default function DetalleUnidad() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  
  const [modalEstatusOpen, setModalEstatusOpen] = useState(false);
  const [modalEstatusNuevo, setModalEstatusNuevo] = useState(null);
  const [modalEstatusConductor, setModalEstatusConductor] = useState('');
  const [modalEstatusRuta, setModalEstatusRuta] = useState('');
  const [modalEstatusConductorDropdown, setModalEstatusConductorDropdown] = useState(false);
  const [modalEstatusRutaDropdown, setModalEstatusRutaDropdown] = useState(false);

  const modalConductorRef = React.useRef(null);
  const modalRutaRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
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

  const queryClient = useQueryClient();

  const configActual = transportModules.find((m) => m.id === tipoTransporte);

  // Utilidades
  const getToken = () => localStorage.getItem('token');
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
    staleTime: 60000,
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

  const unidadesPorEstado = (estado) =>
    unidadesList.filter((u) => u.estado === estado);

  const conductoresDisponibles = dbConductores.filter(c => c.estado_servicio === 'disponible');

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

  if (!configActual) {
    return (
      <div className="p-8">
        Transporte no encontrado. <button onClick={() => navigate('/')}>Volver</button>
      </div>
    );
  }

  // Seleccionar unidad (desde dropdown o búsqueda)
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

    // Cerrar todos los dropdowns
    setOpenDropdown(null);

    const numeroLimpio = String(unidadSeleccionada.eco).padStart(3, '0');

    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      const url = `${API_BASE}/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const resultado = await queryClient.fetchQuery({
        queryKey: ['unidad-detalle', tipoTransporte, numeroLimpio],
        queryFn: async () => {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
          corrida: resultado.corridas || '',
          horaSalida: resultado.hora_salida || '',
          estatus: resultado.estatus || unidadSeleccionada.estado || 'operacion',
          ciclo: resultado.ciclo || '',
          motivo: resultado.motivo || '',
          horaProgramada: resultado.hora_programada || '',
          acople: resultado.acople || '',
        });
        setFallaTexto(resultado.falla || '');
        setSelectedEstado(resultado.estatus || unidadSeleccionada.estado || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
          corrida: '',
          horaSalida: '',
          estatus: unidadSeleccionada?.estado || 'operacion',
          ciclo: '',
          motivo: '',
          horaProgramada: '',
          acople: '',
        });
        setFallaTexto('');
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
        corrida: '',
        horaSalida: '',
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  // Búsqueda por tarjetón (desde el panel de información)
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

  // Guardar falla (solo el campo de fallas)
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

  // Guardar tarjetón y asignar conductor automáticamente
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

  // Guardar ruta
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

  // Guardar Horas
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

  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;
    
    if (datosOperativos.estatus === nuevoEstatus) return;

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
        counter.style.color = '#d1d5db'; // text-gray-300 equivalent
        counter.style.marginTop = '4px';
        counter.style.marginRight = '4px';
        counter.innerText = '0/70';
        
        input.parentNode.insertBefore(counter, input.nextSibling);

        input.addEventListener('input', () => {
          const length = input.value.length;
          counter.innerText = `${length}/70`;
          counter.style.color = length >= 70 ? '#ef4444' : '#d1d5db'; // text-red-500 or text-gray-300
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
    const matchNumeros = selectedOption.match(/\d+/);
    const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

    let payloadUpdate = {
      numero_eco: numeroLimpio,
      tipo: tipoTransporte,
      estatus: nuevoEstatus,
      motivo_estatus: motivoCapturado
    };

    // Si cambia a operacion
    if (nuevoEstatus === 'operacion') {
      const tieneConductor = datosOperativos.conductor && datosOperativos.conductor !== 'No asignado' && datosOperativos.tarjeton;
      const tieneRuta = datosOperativos.ruta && datosOperativos.ruta !== 'Sin ruta';
      
      if (!tieneConductor || !tieneRuta) {
        setModalEstatusNuevo(nuevoEstatus);
        setModalEstatusConductor(tieneConductor ? String(datosOperativos.tarjeton).trim() : '');
        setModalEstatusRuta(tieneRuta ? datosOperativos.ruta : '');
        setModalEstatusConductorDropdown(false);
        setModalEstatusRutaDropdown(false);
        setModalEstatusOpen(true);
        return; // El resto se maneja en el confirm del modal
      } else {
        payloadUpdate.nombre_conductor = datosOperativos.conductor;
        payloadUpdate.numero_tarjeton = datosOperativos.tarjeton;
        payloadUpdate.ruta = datosOperativos.ruta;
      }
    }

    try {
      setCambiandoEstatus(true);
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
          text: `La unidad cambió a ${nuevoEstatus}.`,
          timer: 2000,
          showConfirmButton: false,
        });
        
        setDatosOperativos((prev) => {
          const isReserva = nuevoEstatus === 'reserva';
          return {
            ...prev,
            estatus: nuevoEstatus,
            conductor: isReserva ? 'No reportado hoy' : (data.conductor_asignado || prev.conductor),
            ruta: isReserva ? 'Sin ruta' : (data.ruta_asignada || prev.ruta),
            tarjeton: isReserva ? '' : (data.tarjeton || prev.tarjeton),
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
            conductor: isReserva ? 'No reportado hoy' : (data.conductor_asignado || old.conductor),
            ruta: isReserva ? 'Sin ruta' : (data.ruta_asignada || old.ruta),
            tarjeton: isReserva ? '' : (data.tarjeton || old.tarjeton),
            asignado: true
          };
        });

        queryClient.setQueryData(['unidades-list', tipoTransporte], (old = []) => {
          return old.map(u => {
            if (String(u.eco).padStart(3, '0') === numeroLimpio) {
              const isReserva = nuevoEstatus === 'reserva';
              return {
                ...u,
                estatus: nuevoEstatus,
                nombre_conductor: isReserva ? 'No reportado hoy' : (data.conductor_asignado || u.nombre_conductor),
                ruta: isReserva ? 'Sin ruta' : (data.ruta_asignada || u.ruta),
                tarjeton: isReserva ? '' : (data.tarjeton || u.tarjeton),
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

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || 'Seleccione Unidad'}
        eyebrow={`${configActual.title} / Detalle de Unidad`}
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
              <UnitInfoPanel
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
                handleSaveRuta={handleSaveRuta}
                handleSaveHoras={handleSaveHoras}
                handleCambiarEstatus={handleCambiarEstatus}
                cambiandoEstatus={cambiandoEstatus}
                conductoresDisponibles={conductoresDisponibles}
              />
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para ver los detalles de inspección.</p>
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