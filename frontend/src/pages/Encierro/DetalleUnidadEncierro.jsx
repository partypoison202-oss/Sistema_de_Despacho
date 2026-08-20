// src/pages/Encierro/DetalleUnidadEncierro.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

const LiveClockAcople = ({ horaCongelada }) => {
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    // Si ya hay hora congelada, no iniciamos el reloj
    if (horaCongelada) return;

    const t = setInterval(() => setAhora(new Date()), 1000);
    // Limpieza siempre: si horaCongelada llega después del mount, este cleanup corre
    return () => clearInterval(t);
  }, [horaCongelada]); // Cuando horaCongelada cambia de null a un valor, el efecto se re-ejecuta y limpia el interval anterior

  let horas12, minutos, segundos, ampm, separador;

  if (horaCongelada) {
    const partes = horaCongelada.split(':');
    const h24 = parseInt(partes[0], 10);
    ampm = h24 >= 12 ? 'P.M.' : 'A.M.';
    horas12 = String(h24 % 12 || 12).padStart(2, '0');
    minutos = partes[1] || '00';
    segundos = partes[2] ? partes[2].substring(0, 2) : '00';
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

  return (
    <div className="info-card__item">
      <span className="info-card__label">Hora de Desincorporación</span>
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
        <div className="badge-display badge-display--gold" style={{ flex: 1 }}>
          <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="badge-display__text">
            {horaMostrada}
          </span>
        </div>
      </div>
    </div>
  );
};

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { encierroModules } from '../../config/encierroModules';
import Header from '../../components/Header/Header';
import LocalSearchBar from '../../components/LocalSearchBar/LocalSearchBar';
import Swal from 'sweetalert2';
import '../Unidades/DetalleUnidad.css';
import UnitSelector from '../Unidades/componentsdetalleunidad/UnitSelector';
import RutaSelector from '../../components/RutaSelector/RutaSelectorUnified'; // ✅ IMPORTADO
import CONDUCTORES from '../../data/conductores';
import API_BASE from '../../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeRuta, normalizeRutaClave } from '../../utils/rutaUtils';

export default function DetalleUnidadEncierro() {
  const { tipoTransporte } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [selectedRuta, setSelectedRuta] = useState(null); // ✅ NUEVO
  const [selectedTroncal, setSelectedTroncal] = useState(null); // ✅ NUEVO

  const [datosOperativos, setDatosOperativos] = useState({
    conductor: 'Seleccione una unidad...',
    ruta: 'Seleccione una unidad...',
    tarjeton: '',
    corrida: '',
    horaProgramada: '',
    estatus: 'operacion'
  });

  const getUnitStatusVisual = (u) => {
    // En encierro, si el estado no es operacion, se considera "Encerrada"
    const isEncerrada = u.estado !== 'operacion' && u.estado !== 'en_servicio';
    return isEncerrada ? 'validated_ontime' : 'pending';
  };

  const getUnitColor = (unidad, isSelected) => {
    const status = getUnitStatusVisual(unidad);
    let base = { bg: 'var(--tw-color-white)', text: '#374151', border: '#e5e7eb' };
    
    if (status === 'validated_ontime') {
      base = { bg: '#dcfce7', text: '#166534', border: '#86efac' }; // Verde claro
    } else {
      base = { bg: '#ffffff', text: '#374151', border: '#d1d5db' }; // Blanco neutral
    }

    if (isSelected) {
      if (status === 'pending') {
          return { bg: '#6b1d33', text: '#ffffff', border: '#6b1d33', scale: 1.05 }; 
      } else {
          return { bg: '#14532d', text: '#ffffff', border: '#14532d', scale: 1.05 }; 
      }
    }

    return { ...base, scale: 1 };
  };

  const [cambiandoEstatus, setCambiandoEstatus] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // Estados para Tarjetón (edición interactiva al igual que despacho)
  const [editandoTarjeton, setEditandoTarjeton] = useState(false);
  const [formTarjeton, setFormTarjeton] = useState('');
  const [guardandoTarjeton, setGuardandoTarjeton] = useState(false);
  const [dropdownTarjetonOpen, setDropdownTarjetonOpen] = useState(false);

  // Estados para Ruta (edición interactiva)
  const [rutasOpciones, setRutasOpciones] = useState([]);
  const [troncalesOpciones] = useState(['T01', 'T02', 'T04', 'T05']);
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
  const [observaciones, setObservaciones] = useState('');
  
  const [acopleCongelado, setAcopleCongelado] = useState(null);
  const [guardandoAcople, setGuardandoAcople] = useState(false);

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
  const observacionesRef = useRef(null);
  const observacionesInputRef = useRef(null);
  const [obsDropdownPos, setObsDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [observacionesCatalogo, setObservacionesCatalogo] = useState([]);
  const [dropdownObservacionesOpen, setDropdownObservacionesOpen] = useState(false);
  const [formObservaciones, setFormObservaciones] = useState('');

  useEffect(() => {
    setObservaciones(datosOperativos.observaciones || '');
    setFormObservaciones(datosOperativos.observaciones || '');
  }, [datosOperativos]);

  

  useEffect(() => {
    const fetchObservacionesCatalogo = async () => {
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const res = await fetch(`${API_BASE}/api/observaciones-catalogo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setObservacionesCatalogo(data || []);
        }
      } catch (err) {
        console.error('Error fetching observaciones catalogo', err);
      }
    };
    fetchObservacionesCatalogo();
  }, []);

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
      setDropdownMotivoOpen(false);
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
  const getToken = () => (localStorage.getItem('token') || sessionStorage.getItem('token'));
  const formatearEco = (valor) => `ECO${String(valor ?? '').padStart(3, '0')}`;
  const extraerNumeroEco = (valor) => {
    const texto = String(valor ?? '');
    const matchNumeros = texto.match(/\d+/);
    return matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
  };

  const formatObservacionClave = (clave) => {
    const claveStr = String(clave ?? '');
    return /^\d$/.test(claveStr) ? claveStr.padStart(2, '0') : claveStr;
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
    console.debug('[Encierro] fetchUnidades: muestra ejemplo de datos:', Array.isArray(datos) ? datos.slice(0,5) : datos);
    return (Array.isArray(datos) ? datos : []).map((u) => ({
      eco: String(u.numero_eco ?? '').padStart(3, '0'),
      tarjeton: String(u.tarjeton ?? '').trim(),
      display: `ECO${String(u.numero_eco ?? '').padStart(3, '0')}`,
      estado: String(u.estatus ?? 'operacion').toLowerCase(),
      ruta: u.ruta || null,
      acople: Boolean(u.acople && String(u.acople).trim() !== '' && String(u.acople).trim() !== '0'),
      horaSalida: String(u.hora_salida ?? '').trim(),
    }));
  };

  const { data: unidadesList = [], isLoading: cargandoUnidades } = useQuery({
    queryKey: ['unidades-list-encierro', tipoTransporte],
    queryFn: fetchUnidades,
    staleTime: 60000,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const configActual = encierroModules.find((m) => m.id === tipoTransporte);
        if (configActual?.id === 'urbanuss') {
          setRutasOpciones(troncalesOpciones);
          return;
        }
        const res = await fetch(`${API_BASE}/api/despacho/rutas`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const alimentadorasFromApi = data.alimentadoras && data.alimentadoras.length ? data.alimentadoras : [];
          if (alimentadorasFromApi.length) {
            setRutasOpciones(alimentadorasFromApi);
          } else {
            // derive from unidadesList if API empty
            const derived = Array.from(new Set(unidadesList.map(u => normalizeRuta(u.ruta)).filter(Boolean)));
            setRutasOpciones(derived);
          }
        }
      } catch (err) {
        console.error('Error fetching rutas', err);
      }
    };
    fetchRutas();
  }, [tipoTransporte, troncalesOpciones, unidadesList]);

  const esAlimentadora = configActual && configActual.id !== 'urbanuss';
  const isTroncal = configActual?.id === 'urbanuss';
  // ✅ NUEVO: unidades de la ruta seleccionada derivadas localmente
  const unidadesPorRutaList = useMemo(() => {
    if (!selectedRuta) return [];
    const rutaSeleccionada = normalizeRutaClave(selectedRuta);
    return unidadesList.filter((u) => {
      const rutaUnidad = normalizeRutaClave(u.ruta);
      return rutaUnidad && rutaUnidad === rutaSeleccionada && !u.acople;
    });
  }, [unidadesList, selectedRuta]);
  const unidadesPorTroncalList = useMemo(() => {
    if (!selectedTroncal) return [];
    const rutaSeleccionada = normalizeRutaClave(selectedTroncal);
    return unidadesList.filter((u) => {
      const rutaUnidad = normalizeRutaClave(u.ruta);
      return rutaUnidad && rutaUnidad === rutaSeleccionada && !u.acople;
    });
  }, [unidadesList, selectedTroncal]);
  const cargandoUnidadesPorRuta = false;

  // ✅ NUEVO: función para seleccionar ruta
  const handleSelectRuta = (ruta) => {
    setSelectedRuta(ruta);
    setSelectedTroncal(null);
    setOpenDropdown(null);
  };
  const handleSelectTroncal = (ruta) => {
    setSelectedTroncal(ruta);
    setSelectedRuta(null);
    setOpenDropdown(null);
  };
  const totalProgramadasOperacion = useMemo(
    () => unidadesList.filter((u) => u.estado === 'operacion').length,
    [unidadesList]
  );


  const unidadesPorEstado = (estado) => {
    let filtradas = unidadesList.filter((u) => u.estado === estado && !u.acople);
    if (selectedRuta && esAlimentadora) {
      const ecosEnRuta = unidadesPorRutaList.map((u) => u.eco);
      filtradas = filtradas.filter((u) => ecosEnRuta.includes(u.eco));
    }
    if (selectedTroncal && isTroncal) {
      const ecosEnTroncal = unidadesPorTroncalList.map((u) => u.eco);
      filtradas = filtradas.filter((u) => ecosEnTroncal.includes(u.eco));
    }
    return filtradas;
  };

  const [dbConductores, setDbConductores] = useState([]);

  const fetchConductores = async () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
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

  const conductoresDisponibles = dbConductores.filter(c => c.estado_servicio === 'disponible' || c.estado_servicio === 'falta');

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setFormTarjeton(datosOperativos.tarjeton || '');
  }, [datosOperativos.tarjeton]);

  // useEffect para capturar eco desde URL
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

    if (unidadEncontrada && unidadEncontrada.acople) {
      return;
    }

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

  const handleGuardarAcople = async (horaCapturada, observaciones = null) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const matchNumeros = selectedOption ? selectedOption.match(/\d+/) : null;
      const numeroLimpio = matchNumeros ? String(matchNumeros[0]).padStart(3, '0') : '';
      if (!numeroLimpio) return;
      
      const payload = {
        tipo: tipoTransporte,
        numero_eco: numeroLimpio,
        hora_programada: datosOperativos.hora_programada || null,
        acople: horaCapturada
      };
      if (observaciones !== null) {
          payload.observaciones = observaciones;
      }
      
      const res = await fetch(`${API_BASE}/api/despacho/actualizar-horas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setDatosOperativos(prev => ({ ...prev, acople: horaCapturada }));
          queryClient.setQueryData(['unidades-list-encierro', tipoTransporte], (oldUnidades = []) => {
            const ecoNum = String(numeroLimpio).padStart(3, '0');
            return oldUnidades.map((u) =>
              u.eco === ecoNum ? { ...u, acople: horaCapturada } : u
            );
          });
          const Swal = (await import('sweetalert2')).default;
          Swal.fire({
            icon: 'success', title: 'Guardado', text: 'Hora de desincorporación registrada.', confirmButtonColor: '#601a2a', timer: 1500, showConfirmButton: false
          });
        }
      }
    } catch (error) {
      console.error(error);
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

    if (unidadSeleccionada?.acople) {
      Swal.fire({
        icon: 'info',
        title: 'Unidad ya validada',
        text: `${ecoSeleccionado} ya fue validada y no está disponible en el selector.`,
        confirmButtonColor: '#601a2a',
      });
      return;
    }

    setSelectedOption(ecoSeleccionado);
    setSelectedEstado(unidadSeleccionada ? unidadSeleccionada.estado : null);
    setOpenDropdown(null);
    setCargandoDatos(true);
    setAcopleCongelado(null);
    setGuardandoAcople(false);

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
          corrida: resultado.corridas || '',
          acople: resultado.acople || '',
          hora_programada: resultado.hora_programada || '',
        });
        setSelectedEstado(resultado.estatus || unidadSeleccionada?.estado || 'operacion');
        setAcopleCongelado(resultado.acople || null);
      } else {
        setDatosOperativos({
          conductor: 'No reportado hoy',
          ruta: 'Sin ruta',
          tarjeton: '',
          hora_encierro: '',
          estatus: 'operacion',
          ciclo: '',
          motivo: '',
          corrida: '',
          acople: '',
          hora_programada: '',
        });
        setAcopleCongelado(null);
      }
    } catch (error) {
      console.error('Error en la petición:', error);
      setDatosOperativos({
        conductor: 'Error de conexión',
        ruta: 'No se pudo obtener',
        tarjeton: '',
        hora_encierro: '',
        estatus: 'operacion',
        corrida: '',
        acople: '',
        hora_programada: ''
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
      const motivosPredefinidos = [
        'FALTA DE OPERADOR',
        'MANTENIMIENTO',
        'ACCIDENTE',
        'FALTA DE COMBUSTIBLE',
        'CONDICIONES CLIMATICAS',
        'DESVIO OPERACIONAL',
        'OTRO'
      ];

      swalOptions.html = `
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
      `;

      swalOptions.didOpen = () => {
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
      };

      swalOptions.preConfirm = () => {
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
          const isClearFields = nuevoEstatus === 'reserva' || nuevoEstatus === 'mantenimiento';
          return {
            ...prev,
            estatus: nuevoEstatus,
            conductor: isClearFields ? 'No reportado hoy' : prev.conductor,
            ruta: isClearFields ? 'Sin ruta' : prev.ruta,
            tarjeton: isClearFields ? '' : prev.tarjeton,
          };
        });
        setSelectedEstado(nuevoEstatus);
        fetchConductores();

        // Sincronizar cache de React Query para evitar condiciones de carrera (race conditions)
        queryClient.setQueryData(['unidad-detalle', tipoTransporte, numeroLimpio], (old) => {
          if (!old) return old;
          const isClearFields = nuevoEstatus === 'reserva' || nuevoEstatus === 'mantenimiento';
          return {
            ...old,
            estatus: nuevoEstatus,
            conductor: isClearFields ? 'No reportado hoy' : old.conductor,
            ruta: isClearFields ? 'Sin ruta' : old.ruta,
            tarjeton: isClearFields ? '' : old.tarjeton,
            asignado: true
          };
        });

        queryClient.setQueryData(['unidades-list-encierro', tipoTransporte], (old = []) => {
          return old.map(u => {
            if (String(u.eco).padStart(3, '0') === numeroLimpio) {
              const isClearFields = nuevoEstatus === 'reserva' || nuevoEstatus === 'mantenimiento';
              return {
                ...u,
                estatus: nuevoEstatus,
                nombre_conductor: isClearFields ? 'No reportado hoy' : u.nombre_conductor,
                ruta: isClearFields ? 'Sin ruta' : u.ruta,
                tarjeton: isClearFields ? '' : u.tarjeton,
              };
            }
            return u;
          });
        });

        queryClient.invalidateQueries(['unidades-list-encierro', tipoTransporte]);
        queryClient.invalidateQueries(['unidad-detalle', tipoTransporte, numeroLimpio]);
        // ✅ NUEVO: invalidar también el filtro por ruta
        queryClient.invalidateQueries(['unidades-por-ruta-encierro', tipoTransporte]);
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
        queryClient.invalidateQueries(['unidades-por-ruta-encierro', tipoTransporte]);
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
          <LocalSearchBar 
            unidades={unidadesList} 
            onSelectUnit={handleSelectUnit} 
            moduleName={configActual?.title || 'esta sección'} 
          />
          <div className="unit-control-panel__selectors">
            {/* ✅ NUEVO: contenedor con flex y gap para los dos selectores */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <UnitSelector
                isOpen={openDropdown === 'operacion'}
                setIsOpen={(open) => setOpenDropdown(open ? 'operacion' : null)}
                selectedOption={selectedOption}
                selectedEstado={selectedEstado}
                estado="operacion"
                titulo="Operación"
                unidades={unidadesPorEstado('operacion')}
                totalProgramadas={totalProgramadasOperacion}
                cargandoUnidades={cargandoUnidades}
                configActual={configActual}
                onSelectUnit={handleSelectUnit}
              />

              {/* ✅ NUEVO: selector de rutas alimentadoras */}
              {esAlimentadora && (
                <RutaSelector
                  isOpen={openDropdown === 'rutas'}
                  setIsOpen={(open) => setOpenDropdown(open ? 'rutas' : null)}
                  selectedRuta={selectedRuta}
                  titulo="RA"
                  rutas={rutasOpciones}
                  cargandoRutas={false}
                  configActual={configActual}
                  onSelectRuta={handleSelectRuta}
                />
              )}

              {/* ✅ NUEVO: selector TRONCAL para URBANUSS */}
              {isTroncal && (
                <RutaSelector
                  isOpen={openDropdown === 'troncal'}
                  setIsOpen={(open) => setOpenDropdown(open ? 'troncal' : null)}
                  selectedRuta={selectedTroncal}
                  titulo="TRONCAL"
                  rutas={troncalesOpciones}
                  cargandoRutas={false}
                  configActual={configActual}
                  onSelectRuta={handleSelectTroncal}
                />
              )}
            </div>

            {/* ✅ NUEVO: lista de unidades de la ruta seleccionada */}
            {esAlimentadora && selectedRuta && (
              <div className="ruta-unidades-panel" style={{ width: '100%', marginTop: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>
                    Unidades por encerrar en ruta {selectedRuta}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRuta(null)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#6b1d33',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Limpiar filtro
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', border: '1px solid #d1d5db' }}></span> Pendiente de Encierro</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dcfce7', border: '1px solid #86efac' }}></span> Unidad Encerrada</div>
                </div>

                {cargandoUnidadesPorRuta ? (
                  <div className="p-4 text-center" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span className="unidad-spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '20px', height: '20px', borderWidth: '3px' }}></span>
                    Cargando unidades de la ruta...
                  </div>
                ) : unidadesPorRutaList.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No hay unidades para la ruta {selectedRuta}</div>
                ) : (
                  <div className="dispatch-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                    {/* SECCIÓN: PENDIENTES */}
                    <div className="dispatch-section dispatch-section--pending" style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                          Pendientes por Encerrar
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, background: '#f3f4f6', padding: '0.2rem 0.75rem', borderRadius: '999px' }}>
                          {unidadesPorRutaList.filter(u => getUnitStatusVisual(u) === 'pending').length}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                        {unidadesPorRutaList.filter(u => getUnitStatusVisual(u) === 'pending').map((unidad) => {
                          const colors = getUnitColor(unidad, selectedOption === unidad.display);
                          return (
                            <button
                              key={unidad.display}
                              type="button"
                              onClick={() => handleSelectUnit(unidad)}
                              className="unit-button"
                              style={{
                                border: `1px solid ${colors.border}`,
                                borderRadius: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: colors.bg,
                                color: colors.text,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                transform: `scale(${colors.scale || 1})`,
                                zIndex: colors.scale > 1 ? 10 : 1,
                                boxShadow: colors.scale > 1 ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                              }}
                            >
                              {unidad.display}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* SECCIÓN: ENCERRADAS */}
                    {unidadesPorRutaList.some(u => getUnitStatusVisual(u) !== 'pending') && (
                      <div className="dispatch-section dispatch-section--dispatched" style={{ background: '#f9fafb', borderRadius: '12px', padding: '1rem', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                            Unidades Encerradas
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, background: '#e5e7eb', padding: '0.2rem 0.75rem', borderRadius: '999px' }}>
                            {unidadesPorRutaList.filter(u => getUnitStatusVisual(u) !== 'pending').length}
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                          {unidadesPorRutaList.filter(u => getUnitStatusVisual(u) !== 'pending').map((unidad) => {
                            const colors = getUnitColor(unidad, selectedOption === unidad.display);
                            return (
                              <button
                                key={unidad.display}
                                type="button"
                                onClick={() => handleSelectUnit(unidad)}
                                className="unit-button"
                                style={{
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  background: colors.bg,
                                  color: colors.text,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  transform: `scale(${colors.scale || 1})`,
                                  zIndex: colors.scale > 1 ? 10 : 1,
                                  boxShadow: colors.scale > 1 ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                }}
                              >
                                {unidad.display}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isTroncal && selectedTroncal && (
              <div className="ruta-unidades-panel" style={{ width: '100%', marginTop: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>
                    Unidades por encerrar en troncal {selectedTroncal}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTroncal(null)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#6b1d33',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Limpiar filtro
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', border: '1px solid #d1d5db' }}></span> Pendiente de Encierro</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dcfce7', border: '1px solid #86efac' }}></span> Unidad Encerrada</div>
                </div>

                {unidadesPorTroncalList.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No hay unidades para la troncal {selectedTroncal}</div>
                ) : (
                  <div className="dispatch-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                    {/* SECCIÓN: PENDIENTES */}
                    <div className="dispatch-section dispatch-section--pending" style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                          Pendientes por Encerrar
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, background: '#f3f4f6', padding: '0.2rem 0.75rem', borderRadius: '999px' }}>
                          {unidadesPorTroncalList.filter(u => getUnitStatusVisual(u) === 'pending').length}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                        {unidadesPorTroncalList.filter(u => getUnitStatusVisual(u) === 'pending').map((unidad) => {
                          const colors = getUnitColor(unidad, selectedOption === unidad.display);
                          return (
                            <button
                              key={unidad.display}
                              type="button"
                              onClick={() => handleSelectUnit(unidad)}
                              className="unit-button"
                              style={{
                                border: `1px solid ${colors.border}`,
                                borderRadius: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: colors.bg,
                                color: colors.text,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                transform: `scale(${colors.scale || 1})`,
                                zIndex: colors.scale > 1 ? 10 : 1,
                                boxShadow: colors.scale > 1 ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                              }}
                            >
                              {unidad.display}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* SECCIÓN: ENCERRADAS */}
                    {unidadesPorTroncalList.some(u => getUnitStatusVisual(u) !== 'pending') && (
                      <div className="dispatch-section dispatch-section--dispatched" style={{ background: '#f9fafb', borderRadius: '12px', padding: '1rem', border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                            Unidades Encerradas
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, background: '#e5e7eb', padding: '0.2rem 0.75rem', borderRadius: '999px' }}>
                            {unidadesPorTroncalList.filter(u => getUnitStatusVisual(u) !== 'pending').length}
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                          {unidadesPorTroncalList.filter(u => getUnitStatusVisual(u) !== 'pending').map((unidad) => {
                            const colors = getUnitColor(unidad, selectedOption === unidad.display);
                            return (
                              <button
                                key={unidad.display}
                                type="button"
                                onClick={() => handleSelectUnit(unidad)}
                                className="unit-button"
                                style={{
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  background: colors.bg,
                                  color: colors.text,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  transform: `scale(${colors.scale || 1})`,
                                  zIndex: colors.scale > 1 ? 10 : 1,
                                  boxShadow: colors.scale > 1 ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                }}
                              >
                                {unidad.display}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

                <div className="detalle-dashboard-grid">
                  <div className="info-card">
                    <div className="info-card__header">
                      <svg className="info-card__header-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h3 className="info-card__title">Servicio Activo</h3>
                    </div>

                    <div className="info-card__body">
                      <div className="info-card__item" >
                        <span className="info-card__label">Número de Tarjetón</span>
                        {false ? (
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
                                        <div>
                                          {c.nombre} <br /><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Tarjetón: {c.id}</span>
                                        </div>
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
                          </div>
                        )}
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
                        {false ? (
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

                          </div>
                        )}
                      </div>

                      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
                        <span className="info-card__label">Corrida</span>
                        <div className="info-card__value-wrapper">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg className="info-card__item-icon" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <p className="info-card__value">
                              {cargandoDatos ? 'Buscando...' : (datosOperativos.corrida || 'Sin corrida')}
                            </p>
                          </div>
                        </div>
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
                        <span className="info-card__label">Hora de Salida Programada</span>
                        <div className="badge-display badge-display--gold">
                          <svg className="badge-display__icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="badge-display__text">
                            {cargandoDatos ? '...' : (datosOperativos.hora_programada || '--:--')}
                          </span>
                        </div>
                      </div>

                      <LiveClockAcople 
                        key={selectedOption || 'none'}
                        horaCongelada={acopleCongelado}
                      />

                      <div className="info-card__item" ref={observacionesRef} style={{ position: 'relative' }}>
                        <span className="info-card__label">Observaciones</span>
                        <div
                          ref={observacionesInputRef}
                          className="interactive-input"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 0.85rem',
                            background: 'var(--tw-color-white)',
                            height: '2.3rem',
                            width: '100%',
                            marginTop: '0.25rem',
                            fontWeight: 'normal',
                            borderColor: dropdownObservacionesOpen ? 'var(--brand-maroon-text)' : undefined,
                            opacity: (cargandoDatos || !selectedOption || !!acopleCongelado) ? 0.6 : 1,
                            pointerEvents: (cargandoDatos || !selectedOption || !!acopleCongelado) ? 'none' : 'auto'
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Buscar observación..."
                            value={formObservaciones}
                            onChange={(e) => {
                              setFormObservaciones(e.target.value);
                              const rect = observacionesInputRef.current?.getBoundingClientRect();
                              if (rect) setObsDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
                              setDropdownObservacionesOpen(true);
                            }}
                            onFocus={() => {
                              const rect = observacionesInputRef.current?.getBoundingClientRect();
                              if (rect) setObsDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
                              setDropdownObservacionesOpen(true);
                            }}
                            onBlur={() => setTimeout(() => {
                              setDropdownObservacionesOpen(false);
                              setFormObservaciones(observaciones);
                            }, 150)}
                            style={{
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              width: '100%',
                              fontSize: '0.85rem',
                              color: dropdownObservacionesOpen ? 'var(--brand-maroon-text)' : 'inherit',
                            }}
                          />
                          <svg
                            onClick={() => {
                              const next = !dropdownObservacionesOpen;
                              if (next) {
                                const rect = observacionesInputRef.current?.getBoundingClientRect();
                                if (rect) setObsDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
                              }
                              setDropdownObservacionesOpen(next);
                            }}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: dropdownObservacionesOpen ? 'rotate(180deg)' : 'none', width: '1.2rem', height: '1.2rem', padding: '0.2rem', color: dropdownObservacionesOpen ? 'var(--brand-maroon-text)' : 'inherit', flexShrink: 0, marginLeft: '0.5rem' }}
                            fill="currentColor" viewBox="0 0 24 24"
                          >
                            <path d="M24 22h-24l12-20z" transform="rotate(180 12 12)" />
                          </svg>
                        </div>
                        {dropdownObservacionesOpen && createPortal(
                          <div
                            style={{
                              position: 'absolute',
                              top: obsDropdownPos.top,
                              left: obsDropdownPos.left,
                              width: obsDropdownPos.width,
                              background: 'white',
                              border: '1px solid rgba(226, 232, 240, 0.8)',
                              borderRadius: '0.875rem',
                              boxShadow: '0 12px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                              zIndex: 9999,
                              overflow: 'hidden',
                              maxHeight: '8rem',
                              overflowY: 'auto',
                            }}
                          >
                            {observacionesCatalogo
                              .filter(obs => {
                                const label = `${formatObservacionClave(obs.clave)} - ${obs.descripcion}`;
                                if (formObservaciones === observaciones) return true;
                                return label.toLowerCase().includes(formObservaciones.toLowerCase());
                              })
                              .map(obs => {
                                const label = `${formatObservacionClave(obs.clave)} - ${obs.descripcion}`;
                                return (
                                  <button
                                    key={obs.clave}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setFormObservaciones(label);
                                      setObservaciones(label);
                                      setDropdownObservacionesOpen(false);
                                    }}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      textAlign: 'left',
                                      padding: '0.6rem 1rem',
                                      fontSize: '0.85rem',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#374151',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                          </div>,
                          document.body
                        )}
                      </div>

                      <div style={{ gridColumn: '1 / -1', display: 'flex', marginTop: '1rem' }} className="animate-fade-in-up">
                        <button
                          type="button"
                          disabled={cargandoDatos || !selectedOption || guardandoAcople || !!acopleCongelado}
                          onClick={async () => {
                            setGuardandoAcople(true);
                            const now = new Date();
                            const horas24 = String(now.getHours()).padStart(2, '0');
                            const minutos = String(now.getMinutes()).padStart(2, '0');
                            const segundos = String(now.getSeconds()).padStart(2, '0');
                            
                            const ampm = parseInt(horas24, 10) >= 12 ? 'P.M.' : 'A.M.';
                            const horas12 = String(parseInt(horas24, 10) % 12 || 12).padStart(2, '0');
                            
                            const horaParaGuardar = `${horas24}:${minutos}:${segundos}`;
                            const stringCongelado = `${horas24}:${minutos}:${segundos}`; // LiveClock parses 24h
                            
                            await handleGuardarAcople(horaParaGuardar, observaciones);
                            setAcopleCongelado(stringCongelado);
                            setGuardandoAcople(false);
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
                            cursor: (cargandoDatos || !selectedOption || guardandoAcople || !!acopleCongelado) ? 'not-allowed' : 'pointer',
                            opacity: (cargandoDatos || !selectedOption || guardandoAcople || !!acopleCongelado) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {guardandoAcople && (
                            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff', flexShrink: 0, aspectRatio: '1', boxSizing: 'border-box' }}></span>
                          )}
                          {acopleCongelado ? 'VALIDADO' : 'VALIDAR'}
                        </button>
                      </div>

                    </div>
                  </div>


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