// src/pages/Mantenimiento/DetalleUnidadMantenimiento.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { transportModules } from '../../config/transportModules';
import Header from '../../components/Header/Header';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';
import UnitSelector from './components/UnitSelector';
import FuelInspection from './components/FuelInspection';
import ChecklistForm from '../CheckList/CheckList';
import LocalSearchBar from '../../components/LocalSearchBar/LocalSearchBar';
import CONDUCTORES from '../../data/conductores';
import { generarPDFChecklist } from '../../utils/generarPDFChecklist';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function DetalleUnidadMantenimiento() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isInspeccion = location.pathname.startsWith('/carga-combustible');
  const queryClient = useQueryClient();

  // ── Migración de localStorage: limpiar datos con esquema viejo ──
  useEffect(() => {
    try {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mantenimiento_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if ('kilometraje' in parsed || 'fechaUltimaCarga' in parsed) {
              keysToDelete.push(key);
            }
          }
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));
      if (keysToDelete.length > 0) {
        console.log(`[Mantenimiento] Limpieza de ${keysToDelete.length} entradas con esquema viejo.`);
      }
    } catch (e) {
      console.warn('[Mantenimiento] Error en migración de localStorage', e);
    }
  }, []);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);

  // <-- NUEVO: agregamos motivo_estatus al estado
  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    corrida: '',
    corridasPerdidas: '',
    corridaPerdidaOtro: '',
    tarjeton: '',
    estatus: 'operacion',
    motivo_estatus: null, // <-- NUEVO
    horaSalida: null,
    horaProgramada: null,
    horaDespacho: null,
  });

  const [reemplazoActivo, setReemplazoActivo] = useState(false);
  const [unidadReemplazoSeleccionada, setUnidadReemplazoSeleccionada] = useState(null);
  const [searchReserva, setSearchReserva] = useState('');
  const [rutaTipoSeleccionada, setRutaTipoSeleccionada] = useState('troncales');
  const [reemplazoForm, setReemplazoForm] = useState({
    unidadNuevaEco: '',
    tarjeton: '',
    conductorNombre: '',
    ruta: '',
    corrida: '',
    corridaPerdida: '',
    corridaPerdidaOtro: '',
  });

  // Check List states
  const [showChecklist, setShowChecklist] = useState(false);
  const [hasCompletedChecklist, setHasCompletedChecklist] = useState(false);
  const [viewingChecklist, setViewingChecklist] = useState(false);
  const [recentChecklist, setRecentChecklist] = useState(null);
  const [lightboxDibujo, setLightboxDibujo] = useState(null);
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  // Modal de asignación
  const [modalEstatusOpen, setModalEstatusOpen] = useState(false);
  const [modalEstatusNuevo, setModalEstatusNuevo] = useState(null);
  const [modalEstatusConductor, setModalEstatusConductor] = useState('');
  const [modalEstatusRuta, setModalEstatusRuta] = useState('');
  const [modalEstatusConductorDropdown, setModalEstatusConductorDropdown] = useState(false);
  const [modalEstatusRutaDropdown, setModalEstatusRutaDropdown] = useState(false);
  const [rutasOpciones, setRutasOpciones] = useState([]);

  const modalConductorRef = useRef(null);
  const modalRutaRef = useRef(null);

  const configActual = transportModules.find((m) => m.id === tipoTransporte);

  const getToken = () => (localStorage.getItem('token') || sessionStorage.getItem('token'));
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;
  const extraerNumeroEco = (valor) => {
    const texto = String(valor ?? '');
    const matchNumeros = texto.match(/\d+/);
    return matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
  };

  // Cerrar dropdowns del modal
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

  // ── Conductores (React Query) ──
  const { data: dbConductores = [] } = useQuery({
    queryKey: ['mantenimiento-conductores'],
    queryFn: async () => {
      const token = getToken();
      if (!token) return [];
      const res = await fetch(`${API_BASE}/api/conductores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data)
        ? data.map((c) => ({
            id: c.tarjeton,
            tarjeton: c.tarjeton,
            nombre: c.nombre,
            estado_servicio: c.estado_servicio,
          }))
        : [];
    },
    staleTime: 30 * 60 * 1000,
  });

  // ── Rutas ──
  const { data: _rutasData } = useQuery({
    queryKey: ['mantenimiento-rutas'],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { troncales: [], alimentadoras: [] };
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!configActual,
  });

  useEffect(() => {
    if (!_rutasData) return;
    if (configActual?.id === 'urbanuss') {
      setRutasOpciones(_rutasData.troncales || []);
    } else {
      setRutasOpciones(_rutasData.alimentadoras || []);
    }
  }, [_rutasData, configActual]);

  const conductoresDisponibles = dbConductores.filter(
    (c) => c.estado_servicio === 'disponible' || c.estado_servicio === 'falta'
  );

  const conductoresSoloDisponibles = dbConductores.filter(
    (c) => c.estado_servicio === 'disponible'
  );

  const rutaOptionsByType = useMemo(() => ({
    troncales: _rutasData?.troncales || [],
    alimentadoras: _rutasData?.alimentadoras || [],
  }), [_rutasData]);

  const corridasPerdidasOptions = useMemo(() => [
    '1/2', '1', '1 1/2', '2', '2 1/2', '3', '3 1/2', '4', '4 1/2', '5', '5 1/2', '6', '6 1/2', '7', '7 1/2', '8', '8 1/2', '9', '9 1/2', '10', 'OTRO'
  ], []);



  const mostrarReemplazo = selectedOption && ['mantenimiento', 'reserva'].includes(selectedEstado);

  // ── Lista de unidades ──
  const fetchUnidades = async () => {
    const token = getToken();
    if (!token) {
      navigate('/');
      return [];
    }
    const respuesta = await fetch(`${API_BASE}/api/unidades/listar/${tipoTransporte}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
    queryKey: ['unidades-list', tipoTransporte],
    queryFn: fetchUnidades,
    staleTime: 60 * 1000,
    refetchInterval: 30000,
  });

  // ── Prefetch de detalles ──
  useEffect(() => {
    if (!unidadesList.length) return;
    const token = getToken();
    if (!token) return;
    const unidadesAPrecalentar = unidadesList.slice(0, 30);
    unidadesAPrecalentar.forEach((u) => {
      queryClient.prefetchQuery({
        queryKey: ['unidad-detalle-mantenimiento', tipoTransporte, u.eco],
        queryFn: async () => {
          const res = await fetch(
            `${API_BASE}/api/unidades/detalle/${tipoTransporte}/${u.eco}`,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
          );
          if (!res.ok) return null;
          return res.json();
        },
        staleTime: 30 * 1000,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadesList, tipoTransporte]);

  const unidadesPorEstado = (estado) => (unidadesList || []).filter((u) => u.estado === estado);
  const unidadesReserva = unidadesPorEstado('reserva');

  const unidadesReservaFiltradas = useMemo(() => {
    const filtro = searchReserva.trim().toLowerCase();
    if (!filtro) return unidadesReserva;
    return unidadesReserva.filter((u) =>
      `${u.display} ${u.eco} ${u.tarjeton}`.toLowerCase().includes(filtro) || u.tarjeton.toLowerCase().includes(filtro)
    );
  }, [searchReserva, unidadesReserva]);


  const getConductorDisplay = () => {
    const val = datosOperativos.conductor;
    if (!val || val === 'Sin conductor') return 'No asignado';
    const isNum = !isNaN(val) && String(val).trim() !== '';
    if (isNum) {
      const found = CONDUCTORES.find((c) => c.id === Number(val));
      if (found) return found.nombre;
    }
    return val;
  };

  const handleToggleReemplazo = () => {
    const nuevoEstado = !reemplazoActivo;
    setReemplazoActivo(nuevoEstado);
    if (nuevoEstado) {
      setRutaTipoSeleccionada(configActual?.id === 'urbanuss' ? 'troncales' : 'alimentadoras');
      setReemplazoForm((prev) => ({
        ...prev,
        unidadNuevaEco: '',
        tarjeton: datosOperativos.tarjeton || '',
        conductorNombre: getConductorDisplay() || '',
        ruta: datosOperativos.ruta || '',
        corrida: datosOperativos.corrida || '',
        corridaPerdida: datosOperativos.corridasPerdidas || '',
        corridaPerdidaOtro: datosOperativos.corridaPerdidaOtro || '',
      }));
    }
  };

  const handleSelectReservaUnit = (unidad) => {
    setUnidadReemplazoSeleccionada(unidad);
    setReemplazoForm((prev) => ({
      ...prev,
      unidadNuevaEco: unidad.display || `ECO${String(unidad.eco).padStart(3, '0')}`,
    }));
  };

  const handleTarjetonSelect = (tarjeton) => {
    const conductor = conductoresSoloDisponibles.find((c) => c.tarjeton === tarjeton);
    setReemplazoForm((prev) => ({
      ...prev,
      tarjeton,
      conductorNombre: conductor ? conductor.nombre : prev.conductorNombre,
    }));
  };

  const handleApplyReplacement = () => {
    if (!reemplazoForm.unidadNuevaEco || !reemplazoForm.tarjeton || !reemplazoForm.ruta) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Selecciona unidad en reserva, tarjetón disponible y ruta.',
        confirmButtonColor: '#601a2a',
      });
      return;
    }

    setDatosOperativos((prev) => ({
      ...prev,
      conductor: reemplazoForm.conductorNombre || prev.conductor,
      tarjeton: reemplazoForm.tarjeton,
      ruta: reemplazoForm.ruta,
      corrida: reemplazoForm.corrida,
      corridasPerdidas: reemplazoForm.corridaPerdida,
      corridaPerdidaOtro: reemplazoForm.corridaPerdidaOtro,
    }));
    setSelectedOption(reemplazoForm.unidadNuevaEco);
    setUnidadReemplazoSeleccionada(null);
    setReemplazoActivo(false);
    Swal.fire({
      icon: 'success',
      title: 'Reemplazo aplicado',
      text: `La unidad original se reemplazó por ${reemplazoForm.unidadNuevaEco}.`,
      confirmButtonColor: '#6b1d33',
    });
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

  // ── Seleccionar unidad ──
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
      if (!token) {
        navigate('/');
        return;
      }

      const url = `${API_BASE}/api/unidades/detalle/${tipoTransporte}/${numeroLimpio}`;
      const resultado = await queryClient.fetchQuery({
        queryKey: ['unidad-detalle-mantenimiento', tipoTransporte, numeroLimpio],
        queryFn: async () => {
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (!res.ok) throw new Error('Error en peticion');
          return res.json();
        },
        staleTime: 0,
        cacheTime: 0,
      });

      if (resultado.status === 'success') {
        const horaDespacho = resultado.hora_salida || resultado.hora_programada || resultado.acople || null;
        setDatosOperativos({
          conductor: resultado.conductor || 'No reportado hoy',
          ruta: resultado.ruta || 'Sin ruta',
          corrida: resultado.corrida || resultado.corridas || '',
          tarjeton: resultado.tarjeton || '',
          estatus: resultado.estatus || unidadSeleccionada?.estado || 'operacion',
          motivo_estatus: resultado.motivo_estatus || null, // <-- NUEVO: obtener motivo
          horaSalida: resultado.hora_salida || null,
          horaProgramada: resultado.hora_programada || null,
          horaDespacho,
        });
        setSelectedEstado(resultado.estatus || unidadSeleccionada?.estado || 'operacion');
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          corrida: '',
          tarjeton: '',
          estatus: 'operacion',
          motivo_estatus: null,
          horaSalida: null,
          horaProgramada: null,
          horaDespacho: null,
        });
      }
    } catch (error) {
      console.error('Error detallado en la petición:', error.message, error.stack);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
        estatus: 'operacion',
        motivo_estatus: null,
        horaSalida: null,
      });
    } finally {
      setCargandoDatos(false);
    }
  };

  // ── Efecto para eco desde query string ──
  useEffect(() => {
    const ecoDesdeRuta = searchParams.get('eco');
    if (!ecoDesdeRuta || !unidadesList.length) return;

    const normalizarNumeroEco = (valor) => {
      const digitos = String(valor ?? '').trim().toUpperCase().match(/\d+/)?.[0] ?? '';
      return digitos.padStart(3, '0');
    };

    const ecoNormalizado = normalizarNumeroEco(ecoDesdeRuta);
    const unidadEncontrada = unidadesList.find(
      (unidad) => unidad.eco === ecoNormalizado || unidad.display === formatearEco(ecoNormalizado)
    );

    if (unidadEncontrada && selectedOption !== unidadEncontrada.display) {
      handleSelectUnit(unidadEncontrada);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, unidadesList]);

  // ── Cambio de estatus (Movilidad y Estatus) ──
  const handleCambiarEstatus = async (nuevoEstatus) => {
    if (!selectedOption) return;

    // <-- MODIFICADO: Si ya está en el mismo estado y no es mantenimiento, no hacer nada
    if (datosOperativos.estatus === nuevoEstatus && nuevoEstatus !== 'mantenimiento') {
      return;
    }

    // <-- NUEVO: detectar si es el mismo estatus (para mantenimiento)
    const esMismoEstatus = datosOperativos.estatus === nuevoEstatus;

    let payloadUpdate = {
      numero_eco: null,
      tipo: tipoTransporte,
      estatus: nuevoEstatus,
      motivo_estatus: null,
    };

    // Si es operación, se requiere asignación
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

    // Determinar si requiere motivo (reserva, mantenimiento o actualización de motivo en mantenimiento)
    const requiereMotivo = nuevoEstatus === 'reserva' || nuevoEstatus === 'mantenimiento' || esMismoEstatus;

    let motivoCapturado = null;

    if (requiereMotivo) {
      // Configurar el Swal para seleccionar motivo (el mismo código existente)
      const motivosPredefinidos = [
        'FALTA DE OPERADOR',
        'MANTENIMIENTO',
        'ACCIDENTE',
        'FALTA DE COMBUSTIBLE',
        'CONDICIONES CLIMATICAS',
        'DESVIO OPERACIONAL',
        'OTRO'
      ];

      const swalOptions = {
        title: esMismoEstatus ? 'Actualizar motivo de Mantenimiento' : '¿Cambiar Estatus?',
        text: esMismoEstatus
          ? `La unidad ${selectedOption} ya está en MANTENIMIENTO. Puedes actualizar el motivo.`
          : `¿Seguro que deseas mover la unidad ${selectedOption} a ${nuevoEstatus.toUpperCase()}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#6b1d33',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar',
        html: `
          <div style="text-align: left; margin-top: 0.5rem; position: relative;">
            <label style="display: block; font-weight: 600; font-size: 0.88rem; color: #374151; margin-bottom: 0.5rem;">
              Seleccione el motivo de ${nuevoEstatus.toUpperCase()}:
            </label>
            
            <div style="position: relative;">
              <button type="button" id="swal-motivo-trigger" style="display: flex; align-items: center; justify-content: space-between; width: 100%; height: 44px; padding: 0 1rem; background: #ffffff; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.88rem; font-weight: 700; color: #1f2937; cursor: pointer; outline: none; transition: all 0.2s ease;">
                <span id="swal-motivo-trigger-text" style="text-transform: uppercase; color: #6b7280;">Seleccionar motivo</span>
                <svg id="swal-motivo-arrow" style="width: 16px; height: 16px; color: #6b1d33; transition: transform 0.2s ease;" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>

              <div id="swal-motivo-menu" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #ffffff; border: 1.5px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); z-index: 9999; max-height: 180px; overflow-y: auto;">
                ${motivosPredefinidos.map(m => `
                  <div class="swal-motivo-item" data-value="${m}" style="padding: 0.75rem 1rem; font-size: 0.88rem; font-weight: 600; color: #4b5563; cursor: pointer; border-bottom: 1px solid #f3f4f6; transition: background-color 0.2s ease, color 0.2s ease;">
                    ${m}
                  </div>
                `).join('')}
              </div>
            </div>
            <input type="hidden" id="swal-motivo-hidden" value="" />

            <div id="swal-motivo-custom-container" style="display: none; margin-top: 0.75rem;">
              <textarea id="swal-motivo-textarea" class="swal2-textarea" placeholder="Escribe el motivo detallado..." maxlength="70" style="width: 100%; height: 60px; margin: 0; border-radius: 8px; font-size: 0.88rem; resize: none; border: 1.5px solid #e5e7eb; padding: 0.6rem 0.8rem;"></textarea>
              <div id="swal-motivo-counter" style="text-align: right; font-size: 10px; font-weight: 500; color: #9ca3af; margin-top: 4px;">0/70</div>
            </div>
          </div>
        `,
        didOpen: () => {
          const popup = Swal.getPopup();
          if (popup) popup.style.overflow = 'visible';

          const htmlContainer = Swal.getHtmlContainer();
          if (htmlContainer) {
            htmlContainer.style.overflow = 'visible';
            htmlContainer.style.position = 'relative';
            htmlContainer.style.zIndex = '100';
          }

          const actions = Swal.getActions();
          if (actions) {
            actions.style.position = 'relative';
            actions.style.zIndex = '1';
          }

          const trigger = document.getElementById('swal-motivo-trigger');
          const triggerText = document.getElementById('swal-motivo-trigger-text');
          const arrow = document.getElementById('swal-motivo-arrow');
          const menu = document.getElementById('swal-motivo-menu');
          const hiddenInput = document.getElementById('swal-motivo-hidden');
          const customContainer = document.getElementById('swal-motivo-custom-container');
          const textarea = document.getElementById('swal-motivo-textarea');
          const counter = document.getElementById('swal-motivo-counter');

          let isOpen = false;

          const toggleMenu = () => {
            isOpen = !isOpen;
            if (menu) menu.style.display = isOpen ? 'block' : 'none';
            if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            if (trigger) trigger.style.borderColor = isOpen ? '#6b1d33' : '#e5e7eb';
          };

          if (trigger) {
            trigger.addEventListener('click', (e) => {
              e.stopPropagation();
              toggleMenu();
            });
          }

          const items = document.querySelectorAll('.swal-motivo-item');
          items.forEach(item => {
            item.addEventListener('mouseenter', () => {
              item.style.background = '#f9fafb';
              item.style.color = '#1f2937';
            });
            item.addEventListener('mouseleave', () => {
              item.style.background = 'none';
              item.style.color = '#4b5563';
            });
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              const val = item.getAttribute('data-value');
              if (hiddenInput) hiddenInput.value = val;
              if (triggerText) {
                triggerText.innerText = val;
                triggerText.style.color = '#1f2937';
              }
              
              toggleMenu();

              if (val === 'OTRO') {
                if (customContainer) customContainer.style.display = 'block';
                if (textarea) textarea.focus();
              } else {
                if (customContainer) customContainer.style.display = 'none';
                if (textarea) textarea.value = '';
              }
            });
          });

          document.addEventListener('click', (e) => {
            if (isOpen && menu && trigger && !menu.contains(e.target) && !trigger.contains(e.target)) {
              isOpen = false;
              menu.style.display = 'none';
              if (arrow) arrow.style.transform = 'rotate(0deg)';
              if (trigger) trigger.style.borderColor = '#e5e7eb';
            }
          });

          if (textarea) {
            textarea.addEventListener('input', () => {
              const len = textarea.value.length;
              if (counter) {
                counter.innerText = `${len}/70`;
                counter.style.color = len >= 70 ? '#ef4444' : '#9ca3af';
              }
            });
          }
        },
        preConfirm: () => {
          const hiddenInput = document.getElementById('swal-motivo-hidden');
          const textarea = document.getElementById('swal-motivo-textarea');

          const val = hiddenInput ? hiddenInput.value : '';
          if (!val) {
            Swal.showValidationMessage('Debe seleccionar un motivo.');
            return false;
          }

          if (val === 'OTRO') {
            const customVal = textarea ? textarea.value.trim() : '';
            if (!customVal) {
              Swal.showValidationMessage('Por favor escriba el motivo en el cuadro de texto.');
              return false;
            }
            return customVal;
          }

          return val;
        }
      };

      const confirmacion = await Swal.fire(swalOptions);
      if (!confirmacion.isConfirmed) return;
      motivoCapturado = confirmacion.value || null;
    }

    // Si es mismo estatus, mantener el estatus actual en el payload
    if (esMismoEstatus) {
      payloadUpdate.estatus = datosOperativos.estatus;
    }
    payloadUpdate.motivo_estatus = motivoCapturado;

    setCambiandoEstatus(true);
    try {
      const token = getToken();
      const matchNumeros = selectedOption.match(/\d+/);
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';

      const response = await fetch(`${API_BASE}/api/unidades/cambiar-estatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payloadUpdate,
          numero_eco: numeroLimpio,
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Estatus Actualizado',
          text: `La unidad ${selectedOption} ahora está en ${payloadUpdate.estatus.toUpperCase()}${payloadUpdate.motivo_estatus ? ` (Motivo: ${payloadUpdate.motivo_estatus})` : ''}`,
          confirmButtonColor: '#c5a059',
          timer: 2000,
          showConfirmButton: false,
        });

        setDatosOperativos((prev) => {
          const isClearFields = payloadUpdate.estatus === 'reserva' || payloadUpdate.estatus === 'mantenimiento';
          return {
            ...prev,
            estatus: payloadUpdate.estatus,
            motivo_estatus: payloadUpdate.motivo_estatus || null, // <-- NUEVO: actualizar motivo
            conductor: isClearFields ? 'No reportado hoy' : prev.conductor,
            ruta: isClearFields ? 'Sin ruta' : prev.ruta,
            tarjeton: isClearFields ? '' : prev.tarjeton,
          };
        });
        setSelectedEstado(payloadUpdate.estatus);
        // fetchConductores(); // si es necesario

        // Actualizar cachés
        queryClient.setQueryData(['unidad-detalle-mantenimiento', tipoTransporte, numeroLimpio], (old) => {
          if (!old) return old;
          const isClearFields = payloadUpdate.estatus === 'reserva' || payloadUpdate.estatus === 'mantenimiento';
          return {
            ...old,
            estatus: payloadUpdate.estatus,
            motivo_estatus: payloadUpdate.motivo_estatus || null,
            conductor: isClearFields ? 'No reportado hoy' : old.conductor,
            ruta: isClearFields ? 'Sin ruta' : old.ruta,
            tarjeton: isClearFields ? '' : old.tarjeton,
            asignado: true,
          };
        });

        queryClient.setQueryData(['unidades-list-mantenimiento', tipoTransporte], (old = []) =>
          old.map((u) => {
            if (String(u.eco).padStart(3, '0') === numeroLimpio) {
              const isClearFields = payloadUpdate.estatus === 'reserva' || payloadUpdate.estatus === 'mantenimiento';
              return {
                ...u,
                estado: payloadUpdate.estatus,
                motivo_estatus: payloadUpdate.motivo_estatus || null,
                nombre_conductor: isClearFields ? 'No reportado hoy' : u.nombre_conductor,
                ruta: isClearFields ? 'Sin ruta' : u.ruta,
                tarjeton: isClearFields ? '' : u.tarjeton,
              };
            }
            return u;
          })
        );

        queryClient.invalidateQueries({ queryKey: ['unidades-list-mantenimiento', tipoTransporte] });
        queryClient.invalidateQueries({ queryKey: ['unidad-detalle-mantenimiento', tipoTransporte, numeroLimpio] });
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

    const foundConductor = (conductoresDisponibles || dbConductores || []).find((c) => c.id.toString() === modalEstatusConductor);

    let payloadUpdate = {
      numero_eco: numeroLimpio,
      tipo: tipoTransporte,
      estatus: modalEstatusNuevo,
      motivo_estatus: null,
      nombre_conductor: foundConductor ? foundConductor.nombre : '',
      numero_tarjeton: modalEstatusConductor,
      ruta: modalEstatusRuta,
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
          text: 'La unidad cambió a operación.',
          timer: 2000,
          showConfirmButton: false,
        });

        setDatosOperativos((prev) => ({
          ...prev,
          estatus: modalEstatusNuevo,
          conductor: foundConductor ? foundConductor.nombre : (data.conductor_asignado || prev.conductor),
          ruta: modalEstatusRuta || data.ruta_asignada || prev.ruta,
          tarjeton: modalEstatusConductor || data.tarjeton || prev.tarjeton,
          motivo_estatus: null, // <-- NUEVO: al pasar a operación, limpiar motivo
        }));
        setSelectedEstado(modalEstatusNuevo);
        // fetchConductores();

        queryClient.setQueryData(['unidad-detalle-mantenimiento', tipoTransporte, numeroLimpio], (old) => {
          if (!old) return old;
          return {
            ...old,
            estatus: modalEstatusNuevo,
            motivo_estatus: null,
            conductor: foundConductor ? foundConductor.nombre : (data.conductor_asignado || old.conductor),
            ruta: modalEstatusRuta || data.ruta_asignada || old.ruta,
            tarjeton: modalEstatusConductor || data.tarjeton || old.tarjeton,
            asignado: true,
          };
        });

        queryClient.setQueryData(['unidades-list-mantenimiento', tipoTransporte], (old = []) =>
          old.map((u) => {
            if (String(u.eco).padStart(3, '0') === numeroLimpio) {
              return {
                ...u,
                estado: modalEstatusNuevo,
                motivo_estatus: null,
                nombre_conductor: foundConductor ? foundConductor.nombre : (data.conductor_asignado || u.nombre_conductor),
                ruta: modalEstatusRuta || data.ruta_asignada || u.ruta,
                tarjeton: modalEstatusConductor || data.tarjeton || u.tarjeton,
              };
            }
            return u;
          })
        );

        queryClient.invalidateQueries({ queryKey: ['unidades-list-mantenimiento', tipoTransporte] });
        queryClient.invalidateQueries({ queryKey: ['unidad-detalle-mantenimiento', tipoTransporte, numeroLimpio] });
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

  if (!configActual) {
    return (
      <div className="p-8">
        Transporte no encontrado. <button onClick={() => navigate(isInspeccion ? '/carga-combustible' : '/mantenimiento')}>Volver</button>
      </div>
    );
  }

  const renderAlertaDias = (fecha) => {
    if (!fecha) return null;
    const dias = Math.floor((Date.now() - new Date(fecha)) / 86400000);
    const alerta = dias > 3;
    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          marginTop: '0.35rem',
          display: 'block',
          color: alerta ? '#ef4444' : '#10b981',
        }}
      >
        {dias === 0 ? 'Hoy' : `Hace ${dias} día${dias > 1 ? 's' : ''}`} {alerta && '⚠️ revisar carga'}
      </span>
    );
  };

  return (
    <div className="layout-container">
      <Header
        title={selectedOption || 'Seleccione Unidad'}
        eyebrow={isInspeccion 
          ? `${configActual.title} / Carga de Combustible — Detalle de Unidad` 
          : `${configActual.title} / Mantenimiento — Detalle de Unidad`}
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
          </div>

          <div className="info-panel">
            {selectedOption ? (
              <div className="unit-dashboard-container animate-fade-in-up">
                {/* Banner con ECO */}
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

                <div className="detalle-dashboard-grid">
                  {/* CARD: SERVICIO ACTIVO */}
                  <div className="info-card info-card--double">
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="info-card__title">Servicio Activo</h3>
                    </div>

                    <div className="info-card__body">
                      <div className="info-card__item">
                        <span className="info-card__label">Número de Tarjetón</span>
                        <div className="info-card__value-wrapper">
                          <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.378-1.377 2.622-1.377 4 0" />
                          </svg>
                          <p className="info-card__value">
                            {cargandoDatos ? 'Buscando...' : (datosOperativos.tarjeton || 'No asignado')}
                          </p>
                        </div>
                      </div>

                      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
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

                      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
                        <span className="info-card__label">Corrida</span>
                        <div className="info-card__value-wrapper">
                          <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v3.375l2.25 1.125" />
                          </svg>
                          <p className="info-card__value">
                            {cargandoDatos ? 'Buscando...' : (datosOperativos.corrida || 'No asignada')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {mostrarReemplazo && (
                    <div className="info-card info-card--double" style={{ paddingBottom: '1.5rem' }}>
                      <div className="info-card__header" style={{ alignItems: 'flex-start' }}>
                        <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <h3 className="info-card__title">Reemplazo de unidad</h3>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                            Si desincorporas esta unidad, selecciona una unidad en reserva y ajusta los datos.
                          </p>
                        </div>
                      </div>
                      <div className="info-card__body" style={{ display: 'grid', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={reemplazoActivo}
                            onChange={handleToggleReemplazo}
                            style={{ width: '1rem', height: '1rem' }}
                          />
                          Reemplazar unidad original por otra en reserva
                        </label>

                        {reemplazoActivo && (
                          <>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <span className="info-card__label">Unidad original</span>
                                <div style={{ padding: '0.9rem 1rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                                  {selectedOption}
                                </div>
                              </div>

                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <span className="info-card__label">Buscar unidad en reserva</span>
                                <input
                                  type="text"
                                  value={searchReserva}
                                  onChange={(e) => setSearchReserva(e.target.value)}
                                  placeholder="Buscar ECO o tarjetón en reserva"
                                  className="interactive-input"
                                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db' }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', padding: '0.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb', background: '#ffffff' }}>
                              {unidadesReservaFiltradas.length ? (
                                unidadesReservaFiltradas.slice(0, 10).map((unidad) => (
                                  <button
                                    key={unidad.eco}
                                    type="button"
                                    onClick={() => handleSelectReservaUnit(unidad)}
                                    style={{
                                      width: '100%', textAlign: 'left', padding: '0.85rem 0.9rem', borderRadius: '0.75rem', border: unidadReemplazoSeleccionada?.eco === unidad.eco ? '2px solid #6b1d33' : '1px solid #e5e7eb',
                                      backgroundColor: unidadReemplazoSeleccionada?.eco === unidad.eco ? '#f8eef0' : 'white',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                      <span style={{ fontWeight: 700 }}>{unidad.display}</span>
                                      <span style={{ color: '#6b7280' }}>{unidad.tarjeton}</span>
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>No se encontraron unidades en reserva.</span>
                              )}
                            </div>

                            <div style={{ display: 'grid', gap: '0.95rem' }}>
                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <span className="info-card__label">Nuevo eco</span>
                                <input
                                  type="text"
                                  value={reemplazoForm.unidadNuevaEco}
                                  readOnly
                                  placeholder="Seleccione una unidad de reserva"
                                  className="interactive-input"
                                  style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: '#f8fafc' }}
                                />
                              </div>

                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <span className="info-card__label">Tarjetón (disponible)</span>
                                <select
                                  value={reemplazoForm.tarjeton}
                                  onChange={(e) => handleTarjetonSelect(e.target.value)}
                                  className="interactive-input"
                                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white' }}
                                >
                                  <option value="">Seleccione un tarjetón</option>
                                  {conductoresSoloDisponibles.map((c) => (
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
                                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db' }}
                                />
                              </div>

                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <span className="info-card__label">Tipo de ruta</span>
                                <select
                                  value={rutaTipoSeleccionada}
                                  onChange={(e) => handleRutaTipoChange(e.target.value)}
                                  className="interactive-input"
                                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white' }}
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
                                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white' }}
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
                                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db' }}
                                />
                              </div>

                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <span className="info-card__label">Corridas Perdidas</span>
                                <select
                                  value={reemplazoForm.corridaPerdida}
                                  onChange={(e) => handleCorridaPerdidaChange(e.target.value)}
                                  className="interactive-input"
                                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', background: 'white' }}
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
                                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db' }}
                                  />
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleApplyReplacement}
                              disabled={!reemplazoForm.unidadNuevaEco || !reemplazoForm.tarjeton || !reemplazoForm.ruta}
                              style={{
                                width: '100%', padding: '0.95rem 1rem', borderRadius: '0.85rem', backgroundColor: reemplazoForm.unidadNuevaEco && reemplazoForm.tarjeton && reemplazoForm.ruta ? '#6b1d33' : '#9ca3af',
                                color: 'white', border: 'none', cursor: reemplazoForm.unidadNuevaEco && reemplazoForm.tarjeton && reemplazoForm.ruta ? 'pointer' : 'not-allowed', fontWeight: 700,
                              }}
                            >
                              Aplicar reemplazo
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CARD: INSPECCIÓN */}
                  {isInspeccion && (
                    <div className="info-card info-card--double">
                      <div className="info-card__header">
                        <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="info-card__title">Carga de Combustible</h3>
                      </div>
                      <FuelInspection
                        eco={selectedOption}
                        tipoTransporte={tipoTransporte}
                        token={getToken()}
                      />
                    </div>
                  )}

                  {/* CARD: MOVILIDAD Y ESTATUS */}
                  {!isInspeccion && (
                    <div className="info-card info-card--double">
                      <div className="info-card__header">
                        <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <h3 className="info-card__title">Encierro Operativo</h3>
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

                        {/* <-- NUEVO: Mostrar motivo si está en mantenimiento */}
                        {datosOperativos.estatus === 'mantenimiento' && datosOperativos.motivo_estatus && (
                          <div style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#fef3c7',
                            border: '1px solid #f59e0b',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#92400e',
                          }}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Motivo: <span style={{ textTransform: 'capitalize' }}>{datosOperativos.motivo_estatus}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CARD: CHECKLIST - (sin cambios relevantes) */}
                  {!isInspeccion && (
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
                        origen="mantenimiento"
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
                  )}
                </div>
              </div>
            ) : (
              <div className="info-panel__placeholder">
                <p>Selecciona una unidad desde cualquiera de los botones de estado para ver su información.</p>
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
                    color: modalEstatusConductorDropdown ? 'var(--brand-maroon-text)' : 'var(--tw-color-gray-900)',
                  }}
                  onClick={() => { setModalEstatusConductorDropdown(!modalEstatusConductorDropdown); setModalEstatusRutaDropdown(false); }}
                >
                  <span>
                    {modalEstatusConductor
                      ? (() => {
                          const found = (dbConductores || []).find((c) => c.id.toString() === modalEstatusConductor);
                          return found ? `${found.nombre} (${found.id})` : 'Seleccione un conductor...';
                        })()
                      : 'Seleccione un conductor...'}
                  </span>
                  <svg
                    className="arrow-icon"
                    style={{
                      transition: 'transform 0.2s', width: '0.75rem', height: '0.75rem',
                      transform: modalEstatusConductorDropdown ? 'rotate(180deg)' : 'none',
                      color: modalEstatusConductorDropdown ? 'var(--brand-maroon-text)' : 'inherit',
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
                      {(conductoresDisponibles || []).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="dropdown-menu__item"
                          style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--tw-color-gray-900)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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
                            setModalEstatusConductor(c.id.toString());
                            setModalEstatusConductorDropdown(false);
                          }}
                        >
                          <span>{c.nombre} ({c.id})</span>
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
                    color: modalEstatusRutaDropdown ? 'var(--brand-maroon-text)' : 'var(--tw-color-gray-900)',
                  }}
                  onClick={() => { setModalEstatusRutaDropdown(!modalEstatusRutaDropdown); setModalEstatusConductorDropdown(false); }}
                >
                  <span>{modalEstatusRuta || 'Seleccione una ruta...'}</span>
                  <svg
                    className="arrow-icon"
                    style={{
                      transition: 'transform 0.2s', width: '0.75rem', height: '0.75rem',
                      transform: modalEstatusRutaDropdown ? 'rotate(180deg)' : 'none',
                      color: modalEstatusRutaDropdown ? 'var(--brand-maroon-text)' : 'inherit',
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
                      {(rutasOpciones || []).map((r) => (
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
                style={{ opacity: !modalEstatusConductor || !modalEstatusRuta ? 0.5 : 1, cursor: !modalEstatusConductor || !modalEstatusRuta ? 'not-allowed' : 'pointer' }}
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