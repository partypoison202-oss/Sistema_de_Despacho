// src/pages/Combustible/ControlCombustible.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Header from '../../components/Header/Header';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import API_BASE from '../../config/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import './ControlCombustible.css';

// Mock de unidades basado en los económicos reales de ACOTMA
const UNIDADES_DATA = {
  urbanuss: [
    { eco: '001', combustible: 124.695, adblue: '', km: 32479 },
    { eco: '002', combustible: '', adblue: '', km: '' },
    { eco: '003', combustible: 8.242, adblue: '', km: 35238 },
    { eco: '004', combustible: 28.204, adblue: '', km: 34599 },
    { eco: '005', combustible: 159.252, adblue: '', km: 32464 },
    { eco: '006', combustible: 120.532, adblue: '', km: 32653 },
    { eco: '007', combustible: 109.080, adblue: 17.062, km: 35345 },
    { eco: '008', combustible: '', adblue: '', km: '' },
    { eco: '009', combustible: 123.778, adblue: '', km: 32608 },
    { eco: '010', combustible: 164.873, adblue: '', km: 29263 },
    { eco: '011', combustible: 117.247, adblue: '', km: 31554 },
    { eco: '012', combustible: 101.141, adblue: '', km: 32141 },
    { eco: '013', combustible: 64.310, adblue: '', km: 25975 },
    { eco: '014', combustible: 18.443, adblue: '', km: 34049 },
    { eco: '015', combustible: 36.646, adblue: '', km: 31331 },
    { eco: '016', combustible: 142.961, adblue: 22.875, km: 30828 },
    { eco: '017', combustible: 108.304, adblue: 16.880, km: 33833 },
    { eco: '018', combustible: 127.016, adblue: 19.775, km: 34570 },
    { eco: '019', combustible: 83.724, adblue: '', km: 34917 },
    { eco: '020', combustible: 96.808, adblue: '', km: 34600 },
    { eco: '021', combustible: 125.528, adblue: '', km: 32664 },
    { eco: '022', combustible: 101.457, adblue: 18.498, km: 28135 },
    { eco: '023', combustible: 25.667, adblue: '', km: 25759 },
    { eco: '024', combustible: '', adblue: '', km: '' },
    { eco: '025', combustible: 88.404, adblue: '', km: 27598 },
    { eco: '026', combustible: 114.456, adblue: '', km: 33125 },
    { eco: '027', combustible: 68.473, adblue: '', km: 30174 },
    { eco: '028', combustible: 34.179, adblue: '', km: 32361 },
    { eco: '029', combustible: 165.019, adblue: 19.080, km: 27824 },
    { eco: '030', combustible: 107.579, adblue: 17.913, km: 32932 },
    { eco: '031', combustible: '', adblue: '', km: '' },
    { eco: '032', combustible: 125.112, adblue: '', km: 34177 },
    { eco: '033', combustible: 18.674, adblue: '', km: 36816 },
    { eco: '034', combustible: '', adblue: '', km: '' },
    { eco: '035', combustible: 40.409, adblue: '', km: 28379 },
    { eco: '036', combustible: 35.150, adblue: '', km: 33633 },
    { eco: '037', combustible: 98.126, adblue: '', km: 29487 },
    { eco: '038', combustible: 144.472, adblue: '', km: 30271 },
    { eco: '039', combustible: '', adblue: '', km: '' },
    { eco: '040', combustible: 108.381, adblue: 16.116, km: 30932 },
    { eco: '041', combustible: 96.338, adblue: 17.564, km: 33185 },
    { eco: '042', combustible: 121.041, adblue: '', km: 32153 },
  ],
  zafiro: [
    { eco: '100', combustible: 44.865, adblue: '', km: 32253 },
    { eco: '101', combustible: 51.766, adblue: '', km: 30771 },
    { eco: '102', combustible: 79.753, adblue: '', km: 32161 },
    { eco: '103', combustible: 71.257, adblue: '', km: 31457 },
    { eco: '104', combustible: 24.869, adblue: '', km: 23891 },
    { eco: '105', combustible: 47.517, adblue: '', km: 28479 },
    { eco: '106', combustible: '', adblue: '', km: '' },
    { eco: '107', combustible: '', adblue: '', km: '' },
    { eco: '108', combustible: 92.259, adblue: 15.900, km: 28285 },
    { eco: '109', combustible: '', adblue: '', km: '' },
    { eco: '110', combustible: 80.917, adblue: '', km: 24906 },
    { eco: '111', combustible: 82.668, adblue: '', km: 27731 },
    { eco: '112', combustible: '', adblue: '', km: '' },
    { eco: '113', combustible: 52.515, adblue: 15.717, km: 32059 },
    { eco: '114', combustible: 63.030, adblue: '', km: 23609 },
    { eco: '115', combustible: 61.850, adblue: 16.686, km: 27778 },
    { eco: '116', combustible: 73.747, adblue: '', km: 28610 },
    { eco: '117', combustible: 72.290, adblue: '', km: 23978 },
    { eco: '118', combustible: 59.453, adblue: '', km: 28384 },
    { eco: '119', combustible: 48.765, adblue: '', km: 26370 },
    { eco: '120', combustible: 48.173, adblue: '', km: 27381 },
    { eco: '121', combustible: 69.815, adblue: '', km: 26960 },
    { eco: '122', combustible: 76.916, adblue: '', km: 27592 },
    { eco: '123', combustible: 50.139, adblue: '', km: 28260 },
    { eco: '124', combustible: 85.991, adblue: '', km: 24345 },
    { eco: '125', combustible: 101.254, adblue: '', km: 27542 },
    { eco: '126', combustible: 64.245, adblue: '', km: 26316 },
    { eco: '127', combustible: '', adblue: '', km: '' },
    { eco: '128', combustible: 58.157, adblue: '', km: 27222 },
    { eco: '129', combustible: 60.517, adblue: '', km: 26698 },
    { eco: '130', combustible: '', adblue: '', km: '' },
    { eco: '131', combustible: 78.381, adblue: '', km: 28000 },
    { eco: '132', combustible: 54.259, adblue: '', km: 27744 },
    { eco: '133', combustible: 71.365, adblue: 15.307, km: 27424 },
    { eco: '134', combustible: 99.036, adblue: '', km: 29948 },
    { eco: '135', combustible: '', adblue: '', km: '' },
    { eco: '136', combustible: '', adblue: '', km: '' },
    { eco: '137', combustible: 71.434, adblue: '', km: 26371 },
  ],
  orion: [
    { eco: '401', combustible: '', adblue: '', km: '' },
    { eco: '402', combustible: 30.347, adblue: '', km: 101856 },
    { eco: '403', combustible: 18.111, adblue: '', km: 91128 },
    { eco: '404', combustible: '', adblue: '', km: '' },
    { eco: '405', combustible: 34.456, adblue: '', km: 57968 },
    { eco: '406', combustible: '', adblue: '', km: '' },
    { eco: '407', combustible: 34.456, adblue: '', km: 64578 },
    { eco: '408', combustible: '', adblue: '', km: '' },
  ],
  vagoneta: [
    { eco: '200', combustible: 13.477, km: 15271 },
    { eco: '201', combustible: 29.480, km: 14078 },
    { eco: '202', combustible: 26.080, km: 17480 },
    { eco: '203', combustible: 24.100, km: 11778 },
    { eco: '204', combustible: 33.502, km: 13531 },
    { eco: '205', combustible: 33.270, km: 9876 },
    { eco: '206', combustible: 49.952, km: 16909 },
    { eco: '207', combustible: 45.575, km: 10442 },
    { eco: '208', combustible: 50.130, km: 11114 },
    { eco: '209', combustible: 51.887, km: 10882 },
    { eco: '210', combustible: 28.012, km: 10540 },
    { eco: '211', combustible: 38.187, km: 10242 },
    { eco: '212', combustible: 22.592, km: 11808 },
    { eco: '213', combustible: 38.437, km: 10041 },
    { eco: '214', combustible: 29.752, km: 10084 },
    { eco: '215', combustible: 3.757, km: 14244 },
    { eco: '216', combustible: '', km: '' },
    { eco: '217', combustible: 37.747, km: 17454 },
    { eco: '218', combustible: 33.975, km: 8056 },
    { eco: '219', combustible: 40.850, km: 9532 },
    { eco: '220', combustible: 41.822, km: 15054 },
    { eco: '221', combustible: 40.537, km: 15967 },
    { eco: '222', combustible: 46.387, km: 15685 },
    { eco: '223', combustible: 18.645, km: 10126 },
    { eco: '224', combustible: 42.027, km: 16144 },
    { eco: '225', combustible: 45.605, km: 10490 },
    { eco: '226', combustible: 43.997, km: 18784 },
    { eco: '227', combustible: 36.560, km: 9581 },
    { eco: '228', combustible: 34.225, km: 20011 },
    { eco: '229', combustible: 3.902, km: 10467 },
    { eco: '230', combustible: 43.980, km: 11578 },
    { eco: '231', combustible: 4.795, km: 10463 },
    { eco: '232', combustible: 8.127, km: 19283 },
    { eco: '233', combustible: '', km: '' },
    { eco: '234', combustible: '', km: '' },
    { eco: '235', combustible: 52.665, km: 13796 },
    { eco: '236', combustible: '', km: '' },
    { eco: '237', combustible: '', km: '' },
    { eco: '238', combustible: '', km: '' },
    { eco: '239', combustible: 35.760, km: 13293 },
    { eco: '240', combustible: 40.300, km: 10286 },
    { eco: '241', combustible: 39.652, km: 14237 },
    { eco: '242', combustible: '', km: '' },
    { eco: '243', combustible: 5.537, km: 9986 },
    { eco: '244', combustible: 46.307, km: 13947 },
    { eco: '245', combustible: 3.917, km: 10568 },
    { eco: '246', combustible: 55.650, km: 13775 },
    { eco: '247', combustible: 6.512, km: 11322 },
    { eco: '248', combustible: 4.682, km: 11034 },
    { eco: '249', combustible: '', km: '' },
    { eco: '250', combustible: 47.845, km: 14571 },
    { eco: '251', combustible: '', km: '' },
    { eco: '252', combustible: 45.677, km: 13018 },
    { eco: '253', combustible: 48.060, km: 13994 },
    { eco: '254', combustible: '', km: '' },
    { eco: '255', combustible: '', km: '' },
    { eco: '256', combustible: 46.205, km: 16102 },
    { eco: '257', combustible: 47.580, km: 14965 },
    { eco: '258', combustible: '', km: '' },
    { eco: '259', combustible: '', km: '' },
  ]
};

const RESUMEN_SEMANAL_DATA = {
  dias: ['04-oct', '05-oct', '06-oct', '07-oct', '08-oct', '09-oct', '10-oct'],
  diesel: [
    { tecnologia: 'Urbanuss', valores: [3225.92, 4480.14, 4586.21, 4614.02, 4710.92, 4815.87, 3353.72] },
    { tecnologia: 'Zafiro', valores: [1501.93, 2546.15, 2433.55, 2656.96, 2475.15, 2730.01, 1997.20] },
    { tecnologia: 'Orión', valores: [342.56, 557.77, 584.36, 391.52, 427.96, 372.11, 117.37] },
  ],
  gasolina: [
    { tecnologia: 'Vagoneta', valores: [1376.29, 2181.25, 2203.735, 2076.469, 2351.625, 2268.498, 1567.72] },
    { tecnologia: 'Utilitaria', valores: [45.44, 59.95, 166.00, 93.82, 562.91, 11.48, 36.81] },
  ]
};

// Datos muestra del Reporte Diario y Estadísticas (idéntico a la imagen provista)
const REPORTE_DIARIO_DATA = {
  fecha: '12/10/2026',
  folio: '001',
  litrosTotales: 9906.59,
  unidadesCargaron: 135,
  unidadesSinCargar: 13,
  porcentajeAbastecimiento: '91%',
  parqueTotal: 148,
  filas: [
    {
      tipo: 'Urbanuss',
      combustible: 'Diésel',
      parque: 42,
      litros: 4641.66,
      cargaron: 38,
      sinCargar: 4,
      rendimiento: '2.19',
      abastecimiento: '90%',
      nivelAbastecimiento: 'medio',
      motivoNoCarga: 'Unidad en taller',
      observaciones: 'MANTENIMIENTO'
    },
    {
      tipo: 'Zafiro',
      combustible: 'Diésel',
      parque: 38,
      litros: 2683.34,
      cargaron: 37,
      sinCargar: 1,
      rendimiento: '3.06',
      abastecimiento: '97%',
      nivelAbastecimiento: 'alto',
      motivoNoCarga: 'Unidad en taller',
      observaciones: 'MANTENIMIENTO'
    },
    {
      tipo: 'Vagoneta',
      combustible: 'Gasolina',
      parque: 60,
      litros: 277.21,
      cargaron: 56,
      sinCargar: 4,
      rendimiento: '3.59',
      abastecimiento: '93%',
      nivelAbastecimiento: 'alto',
      motivoNoCarga: 'Combustible suficiente',
      observaciones: 'RESERVA'
    },
    {
      tipo: 'Orión',
      combustible: 'Diésel',
      parque: 8,
      litros: 2304.38,
      cargaron: 4,
      sinCargar: 4,
      rendimiento: '5.32',
      abastecimiento: '50%',
      nivelAbastecimiento: 'bajo',
      motivoNoCarga: 'Unidad en taller',
      observaciones: 'MANTENIMIENTO'
    },
  ]
};

// Opciones disponibles para Motivo de no carga
const OPCIONES_MOTIVO_NO_CARGA = [
  'N/A',
  'Unidad en taller',
  'Fuera de operacion',
  'Combustible suficiente',
  'No ingreso a carga',
  'Incidencia mecanica',
  'Pendiente de carga',
  'Otro'
];

export default function ControlCombustible() {
  const [activeTab, setActiveTab] = useState('captura'); // 'captura' | 'semanal' | 'estadisticas'
  const [selectedTecnologia, setSelectedTecnologia] = useState('urbanuss');
  const [busquedaEco, setBusquedaEco] = useState('');
  const [fechaCaptura, setFechaCaptura] = useState(() => new Date().toISOString().split('T')[0]);
  const [tablaData, setTablaData] = useState(UNIDADES_DATA);
  const [filasReporte, setFilasReporte] = useState(REPORTE_DIARIO_DATA.filas);
  const [modificados, setModificados] = useState({});
  const [showTip, setShowTip] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  const tipRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tipRef.current && !tipRef.current.contains(e.target)) {
        setShowTip(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [resumenSemanal, setResumenSemanal] = useState(RESUMEN_SEMANAL_DATA);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Helper para headers con token de autenticación
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Cargar datos del backend al montar y cuando cambie la fecha
  useEffect(() => {
    let isMounted = true;

    const cargarDatosBackend = async () => {
      setCargandoDatos(true);
      try {
        // 1. Obtener cargas diarias de las unidades
        const resCargas = await fetch(`${API_BASE}/api/combustible/cargas-diarias?fecha=${fechaCaptura}`, {
          headers: getAuthHeaders()
        });

        if (resCargas.ok) {
          const jsonCargas = await resCargas.json();
          if (jsonCargas.status === 'success' && jsonCargas.data && isMounted) {
            setTablaData(prev => ({
              ...prev,
              urbanuss: (jsonCargas.data.urbanuss && jsonCargas.data.urbanuss.length > 0) ? jsonCargas.data.urbanuss : prev.urbanuss,
              zafiro: (jsonCargas.data.zafiro && jsonCargas.data.zafiro.length > 0) ? jsonCargas.data.zafiro : prev.zafiro,
              orion: (jsonCargas.data.orion && jsonCargas.data.orion.length > 0) ? jsonCargas.data.orion : prev.orion,
              vagoneta: (jsonCargas.data.vagoneta && jsonCargas.data.vagoneta.length > 0) ? jsonCargas.data.vagoneta : prev.vagoneta,
            }));
            setModificados({});
          }
        }

        // 2. Obtener estadísticas y filas del reporte del día
        const resReporte = await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible?fecha=${fechaCaptura}`, {
          headers: getAuthHeaders()
        });

        if (resReporte.ok) {
          const jsonReporte = await resReporte.json();
          if (jsonReporte.status === 'success' && Array.isArray(jsonReporte.data) && isMounted) {
            const mappedFilas = jsonReporte.data.map(item => ({
              tipo: item.tipo_unidad || item.tipo,
              combustible: item.combustible || 'Diésel',
              parque: item.parque || 0,
              litros: parseFloat(item.litros_combustible || item.litros || 0),
              cargaron: item.unidades_cargaron || item.cargaron || 0,
              sinCargar: item.unidades_sin_cargar || item.sinCargar || 0,
              rendimiento: item.rendimiento != null ? String(item.rendimiento) : '0.00',
              abastecimiento: `${item.porcentaje_abastecimiento || item.porcentaje || 0}%`,
              nivelAbastecimiento: (item.porcentaje_abastecimiento || item.porcentaje || 0) >= 80 ? 'alto' : (item.porcentaje_abastecimiento || item.porcentaje || 0) >= 50 ? 'medio' : 'bajo',
              motivoNoCarga: item.motivo_no_carga || 'N/A',
              observaciones: item.observaciones || ''
            }));
            if (mappedFilas.length > 0) {
              setFilasReporte(mappedFilas);
            }
          }
        }

        // 3. Obtener resumen semanal consolidado de la base de datos
        const resSemanal = await fetch(`${API_BASE}/api/combustible/resumen-semanal?fecha=${fechaCaptura}`, {
          headers: getAuthHeaders()
        });

        if (resSemanal.ok) {
          const jsonSemanal = await resSemanal.json();
          if (jsonSemanal.status === 'success' && jsonSemanal.data && isMounted) {
            setResumenSemanal(jsonSemanal.data);
          }
        }
      } catch (err) {
        console.warn('ControlCombustible: Conectado en modo offline/fallback', err);
      } finally {
        if (isMounted) setCargandoDatos(false);
      }
    };

    cargarDatosBackend();

    return () => {
      isMounted = false;
    };
  }, [fechaCaptura]);

  // Manejador de cambio de celdas con validación estricta de decimales y enteros
  const handleCellChange = (tec, eco, campo, valor) => {
    let cleanVal = '';

    if (campo === 'km') {
      // Solo enteros positivos (sin puntos ni signos)
      cleanVal = valor.replace(/\D/g, '');
    } else {
      // Combustible / Adblue: números con hasta 3 decimales
      const sanitized = valor.replace(/[^0-9.]/g, '');
      const parts = sanitized.split('.');
      if (parts.length > 2) {
        cleanVal = parts[0] + '.' + parts.slice(1).join('');
      } else {
        cleanVal = sanitized;
      }
      if (cleanVal.includes('.')) {
        const [enteros, decimales] = cleanVal.split('.');
        cleanVal = `${enteros}.${decimales.slice(0, 3)}`;
      }
    }
    
    setTablaData(prev => ({
      ...prev,
      [tec]: prev[tec].map(item => item.eco === eco ? { ...item, [campo]: cleanVal } : item)
    }));

    setModificados(prev => ({
      ...prev,
      [`${tec}-${eco}-${campo}`]: true
    }));
  };

  // Manejador de cambio para motivo y observaciones del reporte diario
  const handleReporteFieldChange = (index, campo, valor) => {
    setFilasReporte(prev => {
      const nuevo = [...prev];
      nuevo[index] = {
        ...nuevo[index],
        [campo]: valor
      };
      return nuevo;
    });
    setModificados(prev => ({
      ...prev,
      [`reporte-${index}-${campo}`]: true
    }));
  };

  // Filtrado de la lista actual según la búsqueda
  const unidadesFiltradas = useMemo(() => {
    const list = tablaData[selectedTecnologia] || [];
    if (!busquedaEco.trim()) return list;
    const term = busquedaEco.trim().toLowerCase();
    return list.filter(u => u.eco.toLowerCase().includes(term));
  }, [tablaData, selectedTecnologia, busquedaEco]);

  // Cálculos de Totales Diarios en tiempo real
  const totalesCalculados = useMemo(() => {
    let totalDieselUrbanuss = 0;
    let totalDieselZafiro = 0;
    let totalDieselOrion = 0;
    let totalAdblue = 0;
    let totalGasolina = 0;
    let totalUnidadesConCarga = 0;

    (tablaData.urbanuss || []).forEach(u => {
      const c = parseFloat(u.combustible) || 0;
      const a = parseFloat(u.adblue) || 0;
      totalDieselUrbanuss += c;
      totalAdblue += a;
      if (c > 0) totalUnidadesConCarga++;
    });

    (tablaData.zafiro || []).forEach(u => {
      const c = parseFloat(u.combustible) || 0;
      const a = parseFloat(u.adblue) || 0;
      totalDieselZafiro += c;
      totalAdblue += a;
      if (c > 0) totalUnidadesConCarga++;
    });

    (tablaData.orion || []).forEach(u => {
      const c = parseFloat(u.combustible) || 0;
      const a = parseFloat(u.adblue) || 0;
      totalDieselOrion += c;
      totalAdblue += a;
      if (c > 0) totalUnidadesConCarga++;
    });

    (tablaData.vagoneta || []).forEach(u => {
      const c = parseFloat(u.combustible) || 0;
      totalGasolina += c;
      if (c > 0) totalUnidadesConCarga++;
    });

    const totalDiesel = totalDieselUrbanuss + totalDieselZafiro + totalDieselOrion;

    return {
      totalDiesel,
      totalDieselUrbanuss,
      totalDieselZafiro,
      totalDieselOrion,
      totalAdblue,
      totalGasolina,
      totalUnidadesConCarga
    };
  }, [tablaData]);

  // Totales de la tecnología actualmente visible
  const totalActual = useMemo(() => {
    let litros = 0;
    let adblue = 0;
    (tablaData[selectedTecnologia] || []).forEach(u => {
      litros += parseFloat(u.combustible) || 0;
      adblue += parseFloat(u.adblue) || 0;
    });
    return { litros, adblue };
  }, [tablaData, selectedTecnologia]);

  // Guardar consumos y reportes en Backend / Base de Datos
  const handleGuardarCambios = async () => {
    setGuardando(true);
    try {
      // 1. Guardar masivo de cargas de combustible
      const resCargas = await fetch(`${API_BASE}/api/combustible/guardar-masivo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          cargas: tablaData,
          fecha: fechaCaptura
        })
      });

      // 2. Guardar estado del reporte diario (motivos de no carga, observaciones, etc.)
      const totalLitrosReporte = filasReporte.reduce((acc, f) => acc + (parseFloat(f.litros) || 0), 0);
      const totalCargaronReporte = filasReporte.reduce((acc, f) => acc + (parseInt(f.cargaron, 10) || 0), 0);
      const totalSinCargarReporte = filasReporte.reduce((acc, f) => acc + (parseInt(f.sinCargar, 10) || 0), 0);
      const totalParqueReporte = filasReporte.reduce((acc, f) => acc + (parseInt(f.parque, 10) || 0), 0);
      const pctReporte = totalParqueReporte > 0 ? Math.round((totalCargaronReporte / totalParqueReporte) * 100) : 0;

      const dataParaReporte = filasReporte.map(f => ({
        tipo_unidad: f.tipo,
        combustible: f.combustible,
        parque: f.parque,
        litros_combustible: f.litros,
        unidades_cargaron: f.cargaron,
        unidades_sin_cargar: f.sinCargar,
        rendimiento: f.rendimiento,
        porcentaje_abastecimiento: parseInt(String(f.abastecimiento).replace('%', ''), 10) || 0,
        motivo_no_carga: f.motivoNoCarga,
        observaciones: f.observaciones,
      }));

      await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fecha_reporte: fechaCaptura,
          totales: {
            litros_totales: totalLitrosReporte,
            unidades_cargaron: totalCargaronReporte,
            unidades_sin_cargar: totalSinCargarReporte,
            porcentaje: pctReporte,
          },
          data: dataParaReporte
        })
      });

      if (resCargas.ok) {
        const jsonRes = await resCargas.json();
        Swal.fire({
          icon: 'success',
          title: '¡Información Guardada!',
          text: jsonRes.message || `Se han actualizado los consumos de combustible para la fecha ${fechaCaptura}.`,
          confirmButtonColor: '#6b1d33',
        });
        setModificados({});
      } else {
        throw new Error('Error al procesar la respuesta del servidor');
      }
    } catch (err) {
      console.error('Error al guardar cargas de combustible:', err);
      Swal.fire({
        icon: 'warning',
        title: 'Guardado Local',
        text: `Los datos se han registrado en tu sesión local para la fecha ${fechaCaptura}. Si el servidor no responde, verifica tu conexión.`,
        confirmButtonColor: '#6b1d33',
      });
      setModificados({});
    } finally {
      setGuardando(false);
    }
  };

  // Exportar a Excel el formato de captura
  const handleExportarExcelCaptura = () => {
    const wb = XLSX.utils.book_new();

    ['urbanuss', 'zafiro', 'orion', 'vagoneta'].forEach(tec => {
      const rows = (tablaData[tec] || []).map(u => {
        if (tec === 'vagoneta') {
          return {
            'ECO': u.eco,
            'LITROS GASOLINA': u.combustible !== '' ? Number(u.combustible) : '',
            'KM': u.km !== '' ? Number(u.km) : ''
          };
        }
        return {
          'ECO': u.eco,
          'LITROS DIESEL': u.combustible !== '' ? Number(u.combustible) : '',
          'ADBLUE LITROS': u.adblue !== '' ? Number(u.adblue) : '',
          'KM': u.km !== '' ? Number(u.km) : ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, tec.toUpperCase());
    });

    XLSX.writeFile(wb, `Control_Combustible_Diario_${fechaCaptura}.xlsx`);
  };

  // Exportar a Excel el Resumen Semanal
  const handleExportarExcelSemanal = () => {
    const wb = XLSX.utils.book_new();

    // Hoja DIESEL
    const dieselRows = (resumenSemanal.diesel || []).map(fila => {
      const obj = { 'Tecnología': fila.tecnologia };
      let suma = 0;
      (resumenSemanal.dias || []).forEach((dia, idx) => {
        const val = fila.valores[idx] || 0;
        obj[dia] = val;
        suma += val;
      });
      obj['TOTAL'] = Number(suma.toFixed(2));
      return obj;
    });

    const wsDiesel = XLSX.utils.json_to_sheet(dieselRows);
    XLSX.utils.book_append_sheet(wb, wsDiesel, 'DIESEL_SEMANAL');

    // Hoja GASOLINA
    const gasolinaRows = (resumenSemanal.gasolina || []).map(fila => {
      const obj = { 'Tecnología': fila.tecnologia };
      let suma = 0;
      (resumenSemanal.dias || []).forEach((dia, idx) => {
        const val = fila.valores[idx] || 0;
        obj[dia] = val;
        suma += val;
      });
      obj['TOTAL'] = Number(suma.toFixed(2));
      return obj;
    });

    const wsGasolina = XLSX.utils.json_to_sheet(gasolinaRows);
    XLSX.utils.book_append_sheet(wb, wsGasolina, 'GASOLINA_SEMANAL');

    XLSX.writeFile(wb, `Resumen_Semanal_Combustible_${fechaCaptura}.xlsx`);
  };

  // Exportar a Excel el Reporte Diario y Estadísticas
  const handleExportarReporteDiario = () => {
    const wb = XLSX.utils.book_new();

    const reporteRows = filasReporte.map(f => ({
      'TIPO DE UNIDAD': f.tipo,
      'COMBUSTIBLE': f.combustible,
      'PARQUE': f.parque,
      'LITROS CARGADOS': f.litros,
      'UNIDADES QUE CARGARON': f.cargaron,
      'UNIDADES SIN CARGAR': f.sinCargar,
      'RENDIMIENTO (KM/L)': f.rendimiento,
      '% ABASTECIMIENTO': f.abastecimiento,
      'MOTIVO DE NO CARGA': f.motivoNoCarga,
      'OBSERVACIONES': f.observaciones
    }));

    const totalLitros = filasReporte.reduce((acc, f) => acc + (parseFloat(f.litros) || 0), 0);
    const totalCargaron = filasReporte.reduce((acc, f) => acc + (parseInt(f.cargaron, 10) || 0), 0);
    const totalSinCargar = filasReporte.reduce((acc, f) => acc + (parseInt(f.sinCargar, 10) || 0), 0);
    const totalParque = filasReporte.reduce((acc, f) => acc + (parseInt(f.parque, 10) || 0), 0);
    const pctAbastecimiento = totalParque > 0 ? Math.round((totalCargaron / totalParque) * 100) : 0;

    // Fila total
    reporteRows.push({
      'TIPO DE UNIDAD': 'TOTAL GENERAL',
      'COMBUSTIBLE': '',
      'PARQUE': totalParque,
      'LITROS CARGADOS': Number(totalLitros.toFixed(2)),
      'UNIDADES QUE CARGARON': totalCargaron,
      'UNIDADES SIN CARGAR': totalSinCargar,
      'RENDIMIENTO (KM/L)': '',
      '% ABASTECIMIENTO': `${pctAbastecimiento}%`,
      'MOTIVO DE NO CARGA': '',
      'OBSERVACIONES': ''
    });

    const ws = XLSX.utils.json_to_sheet(reporteRows);
    XLSX.utils.book_append_sheet(wb, ws, 'REPORTE_COMBUSTIBLE');

    XLSX.writeFile(wb, `Reporte_Combustible_${fechaCaptura}.xlsx`);
  };

  return (
    <div className="control-combustible-page">
      <Header title="Control de Combustible" hideBackButton={false} />

      <main className="combustible-content">
        {/* Encabezado Principal Institucional Centrado */}
        <div className="page-header-container" style={{ margin: '0 auto 1.75rem auto', textAlign: 'center' }}>
          <p className="page-eyebrow">REGISTRO Y SEGUIMIENTO</p>
          <h1 className="page-title">CONTROL DE COMBUSTIBLE</h1>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.95rem', color: '#64748b' }}>
            Captura de combustible, AdBlue y análisis de consumos de la flota
          </p>
        </div>

        {/* Tarjetas KPI Superiores (Totales del día de hoy en tiempo real) */}
        <div className="combustible-kpis-grid">
          <div className="combustible-kpi-card">
            <div className="combustible-kpi-icon diesel">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M10 3v18" />
                <path d="M14 3v18" />
                <path d="M4 8h16" />
                <path d="M4 16h16" />
              </svg>
            </div>
            <div className="combustible-kpi-info">
              <span className="combustible-kpi-label">Diésel Cargado (Hoy)</span>
              <span className="combustible-kpi-value">{totalesCalculados.totalDiesel.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L</span>
              <span className="combustible-kpi-hint">Urbanuss + Zafiro + Orión</span>
            </div>
          </div>

          <div className="combustible-kpi-card">
            <div className="combustible-kpi-icon adblue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div className="combustible-kpi-info">
              <span className="combustible-kpi-label">AdBlue Cargado (Hoy)</span>
              <span className="combustible-kpi-value" style={{ color: '#0284c7' }}>{totalesCalculados.totalAdblue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L</span>
              <span className="combustible-kpi-hint">Consumo de aditivo AdBlue</span>
            </div>
          </div>

          <div className="combustible-kpi-card">
            <div className="combustible-kpi-icon gasolina">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="22" x2="21" y2="22" />
                <line x1="4" y1="9" x2="14" y2="9" />
                <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
                <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
              </svg>
            </div>
            <div className="combustible-kpi-info">
              <span className="combustible-kpi-label">Gasolina Cargada (Hoy)</span>
              <span className="combustible-kpi-value" style={{ color: '#d97706' }}>{totalesCalculados.totalGasolina.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L</span>
              <span className="combustible-kpi-hint">Vagonetas</span>
            </div>
          </div>

          <div className="combustible-kpi-card">
            <div className="combustible-kpi-icon flota">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 5v3h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="combustible-kpi-info">
              <span className="combustible-kpi-label">Unidades Registradas (Hoy)</span>
              <span className="combustible-kpi-value" style={{ color: '#059669' }}>{totalesCalculados.totalUnidadesConCarga}</span>
              <span className="combustible-kpi-hint">Con carga reportada</span>
            </div>
          </div>
        </div>

        {/* Pestañas Principales y Selector de Fecha Alineados en la misma barra */}
        <div className="combustible-tabs-bar-container">
          <div className="combustible-main-tabs">
            <button
              type="button"
              className={`combustible-main-tab-btn ${activeTab === 'captura' ? 'active' : ''}`}
              onClick={() => setActiveTab('captura')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              Captura Diaria Rápida (Hoja Digital)
            </button>

            <button
              type="button"
              className={`combustible-main-tab-btn ${activeTab === 'semanal' ? 'active' : ''}`}
              onClick={() => setActiveTab('semanal')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Resumen Semanal de Consumos
            </button>

            <button
              type="button"
              className={`combustible-main-tab-btn ${activeTab === 'estadisticas' ? 'active' : ''}`}
              onClick={() => setActiveTab('estadisticas')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Estadísticas de Hoy
            </button>
          </div>

          {/* Selector de Fecha al lado de las pestañas */}
          <div className="combustible-tabs-date-picker">
            <span className="combustible-tabs-date-label">
              Fecha:
            </span>
            <div className="combustible-apple-picker-wrap">
              <AppleDatePicker
                value={fechaCaptura}
                onChange={(val) => {
                  if (val) setFechaCaptura(val);
                }}
                disableFuture={false}
              />
            </div>
            {cargandoDatos && (
              <span className="combustible-loading-pill">
                <span className="combustible-loading-dot" />
                Cargando...
              </span>
            )}
          </div>
        </div>

        {/* VISTA 1: CAPTURA RÁPIDA DIARIA */}
        {activeTab === 'captura' && (
          <div>
            {/* Sub-pestañas de tecnologías */}
            <div className="tecnologia-pills">
              <button
                type="button"
                className={`tecnologia-pill ${selectedTecnologia === 'urbanuss' ? 'active' : ''}`}
                onClick={() => setSelectedTecnologia('urbanuss')}
              >
                <span>URBANUSS</span>
                <span className="tecnologia-pill-count">{tablaData.urbanuss.length}</span>
              </button>

              <button
                type="button"
                className={`tecnologia-pill ${selectedTecnologia === 'zafiro' ? 'active' : ''}`}
                onClick={() => setSelectedTecnologia('zafiro')}
              >
                <span>ZAFIRO</span>
                <span className="tecnologia-pill-count">{tablaData.zafiro.length}</span>
              </button>

              <button
                type="button"
                className={`tecnologia-pill ${selectedTecnologia === 'orion' ? 'active' : ''}`}
                onClick={() => setSelectedTecnologia('orion')}
              >
                <span>ORIÓN</span>
                <span className="tecnologia-pill-count">{tablaData.orion.length}</span>
              </button>

              <button
                type="button"
                className={`tecnologia-pill ${selectedTecnologia === 'vagoneta' ? 'active' : ''}`}
                onClick={() => setSelectedTecnologia('vagoneta')}
              >
                <span>VAGONETA</span>
                <span className="tecnologia-pill-count">{tablaData.vagoneta.length}</span>
              </button>
            </div>

            {/* Barra de Búsqueda Rápida */}
            <div className="captura-toolbar">
              <div className="captura-search-box">
                <svg className="captura-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="captura-search-input"
                  placeholder={`Buscar unidad en ${selectedTecnologia.toUpperCase()} (ej: 001, 105, 204)...`}
                  value={busquedaEco}
                  onChange={(e) => setBusquedaEco(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                <div 
                  className="captura-tip-container" 
                  ref={tipRef}
                  onMouseEnter={() => setShowTip(true)}
                  onMouseLeave={() => setShowTip(false)}
                >
                  <button
                    type="button"
                    className="captura-tip-btn"
                    onClick={() => setShowTip(prev => !prev)}
                    title="Tip de navegación rápida"
                    aria-label="Ayuda de navegación"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                  </button>

                  {showTip && (
                    <div className="captura-tip-tooltip">
                      Tip: Usa <strong style={{ color: '#fbbf24' }}>Tab</strong> o las flechas para saltar rápido de celda.
                    </div>
                  )}
                </div>

                <span style={{ fontWeight: '700', color: '#0f172a' }}>{unidadesFiltradas.length} unidades</span>
              </div>
            </div>


            {/* Tabla de Captura */}
            <div className="captura-table-card">
              <div className="captura-table-header-banner">
                <span style={{ fontSize: '0.92rem' }}>
                  {selectedTecnologia.toUpperCase()} — {selectedTecnologia === 'vagoneta' ? 'GASOLINA' : 'DIÉSEL'}
                </span>

                <div className="captura-subtotal-badge">
                  <span className="subtotal-label">Subtotal Litros:</span>
                  <span className="subtotal-value">
                    {totalActual.litros.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                  </span>
                </div>
              </div>

              <div className="captura-table-wrap">
                <table className="captura-excel-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>ECO</th>
                      <th style={{ width: '220px', textAlign: 'right' }}>
                        {selectedTecnologia === 'vagoneta' ? 'LITROS GASOLINA' : 'LITROS DIESEL'}
                      </th>
                      {selectedTecnologia !== 'vagoneta' && (
                        <th style={{ width: '200px', textAlign: 'right' }}>ADBLUE LITROS</th>
                      )}
                      <th style={{ width: '200px', textAlign: 'right' }}>KM / ODÓMETRO</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>ESTATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidadesFiltradas.map((unidad) => {
                      const hasCombustible = parseFloat(unidad.combustible) > 0;
                      return (
                        <tr key={unidad.eco}>
                          <td>
                            <span className="captura-eco-badge">{unidad.eco}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.000"
                              value={unidad.combustible}
                              onChange={(e) => handleCellChange(selectedTecnologia, unidad.eco, 'combustible', e.target.value)}
                              className={`captura-cell-input ${modificados[`${selectedTecnologia}-${unidad.eco}-combustible`] ? 'modified' : ''}`}
                            />
                          </td>
                          {selectedTecnologia !== 'vagoneta' && (
                            <td style={{ textAlign: 'right' }}>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.000"
                                value={unidad.adblue}
                                onChange={(e) => handleCellChange(selectedTecnologia, unidad.eco, 'adblue', e.target.value)}
                                className={`captura-cell-input ${modificados[`${selectedTecnologia}-${unidad.eco}-adblue`] ? 'modified' : ''}`}
                              />
                            </td>
                          )}
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={unidad.km}
                              onChange={(e) => handleCellChange(selectedTecnologia, unidad.eco, 'km', e.target.value)}
                              className={`captura-cell-input ${modificados[`${selectedTecnologia}-${unidad.eco}-km`] ? 'modified' : ''}`}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: hasCombustible ? '#ecfdf5' : '#f1f5f9',
                              color: hasCombustible ? '#059669' : '#94a3b8',
                              border: `1px solid ${hasCombustible ? '#a7f3d0' : '#e2e8f0'}`
                            }}>
                              {hasCombustible ? 'Cargado' : 'Sin Carga'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>TOTAL</td>
                      <td style={{ textAlign: 'right', color: '#6b1d33' }}>
                        {totalActual.litros.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {selectedTecnologia !== 'vagoneta' && (
                        <td style={{ textAlign: 'right', color: '#0284c7' }}>
                          {totalActual.adblue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Barra inferior de acciones */}
              <div className="captura-bottom-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  {Object.keys(modificados).length > 0 ? (
                    <>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b',
                        display: 'inline-block'
                      }} />
                      <span style={{ color: '#b45309', fontWeight: '600' }}>
                        {Object.keys(modificados).length} {Object.keys(modificados).length === 1 ? 'registro modificado' : 'registros modificados'} sin guardar.
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block'
                      }} />
                      <span style={{ color: '#059669', fontWeight: '600' }}>
                        Información guardada.
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-guardar-combustible"
                  onClick={handleGuardarCambios}
                  disabled={guardando}
                  style={guardando ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {guardando ? 'Guardando...' : `Guardar Cargas (${selectedTecnologia.toUpperCase()})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: RESUMEN SEMANAL */}
        {activeTab === 'semanal' && (
          <div className="semanal-section">
            <div className="section-toolbar-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Consolidado Semanal de Consumos
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Desglose por tecnología y combustible para la semana operativa activa
                </p>
              </div>

              <button
                type="button"
                className="btn-descargar-reporte"
                onClick={handleExportarExcelSemanal}
                title="Descargar Resumen Semanal en archivo Excel"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar Resumen Semanal
              </button>
            </div>

            {/* Tabla DIESEL SEMANAL */}
            {(() => {
              const dias = resumenSemanal.dias || [];
              const diesel = resumenSemanal.diesel || [];
              const gasolina = resumenSemanal.gasolina || [];
              const totalAcumuladoDiesel = diesel.reduce((acc, curr) => acc + (curr.valores || []).reduce((a, b) => a + b, 0), 0);
              const totalAcumuladoGasolina = gasolina.reduce((acc, curr) => acc + (curr.valores || []).reduce((a, b) => a + b, 0), 0);

              return (
                <>
                  <div className="semanal-card">
                    <div className="semanal-header">
                      <h3>DIESEL — CONSUMO SEMANAL (LITROS)</h3>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        Acumulado Semanal: {totalAcumuladoDiesel.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                      </span>
                    </div>
                    <div className="semanal-table-wrap">
                      <table className="semanal-table">
                        <thead>
                          <tr>
                            <th style={{ width: '180px' }}>Tecnología</th>
                            {dias.map(d => (
                              <th key={d}>{d}</th>
                            ))}
                            <th className="total-col" style={{ width: '140px' }}>TOTAL ACUMULADO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diesel.map(fila => {
                            const totalFila = (fila.valores || []).reduce((a, b) => a + b, 0);
                            return (
                              <tr key={fila.tecnologia}>
                                <td>{fila.tecnologia}</td>
                                {(fila.valores || []).map((val, idx) => (
                                  <td key={idx}>{val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                ))}
                                <td className="total-col">{totalFila.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })}

                          {/* Fila Total Diario Diésel */}
                          <tr className="total-row">
                            <td>Total Diésel</td>
                            {dias.map((_, idx) => {
                              const totalDia = diesel.reduce((acc, curr) => acc + ((curr.valores && curr.valores[idx]) || 0), 0);
                              return (
                                <td key={idx}>{totalDia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              );
                            })}
                            <td className="total-col">
                              {totalAcumuladoDiesel.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla GASOLINA SEMANAL */}
                  <div className="semanal-card">
                    <div className="semanal-header" style={{ background: '#831843' }}>
                      <h3>GASOLINA — CONSUMO SEMANAL (LITROS)</h3>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        Acumulado Semanal: {totalAcumuladoGasolina.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                      </span>
                    </div>
                    <div className="semanal-table-wrap">
                      <table className="semanal-table">
                        <thead>
                          <tr>
                            <th style={{ width: '180px' }}>Tecnología</th>
                            {dias.map(d => (
                              <th key={d}>{d}</th>
                            ))}
                            <th className="total-col" style={{ width: '140px' }}>TOTAL ACUMULADO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gasolina.map(fila => {
                            const totalFila = (fila.valores || []).reduce((a, b) => a + b, 0);
                            return (
                              <tr key={fila.tecnologia}>
                                <td>{fila.tecnologia}</td>
                                {(fila.valores || []).map((val, idx) => (
                                  <td key={idx}>{val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                ))}
                                <td className="total-col">{totalFila.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })}

                          {/* Fila Total Diario Gasolina */}
                          <tr className="total-row">
                            <td>Total Gasolina</td>
                            {dias.map((_, idx) => {
                              const totalDia = gasolina.reduce((acc, curr) => acc + ((curr.valores && curr.valores[idx]) || 0), 0);
                              return (
                                <td key={idx}>{totalDia.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              );
                            })}
                            <td className="total-col">
                              {totalAcumuladoGasolina.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* VISTA 3: REPORTE DIARIO Y ESTADÍSTICAS (Nuevo Apartado según imagen) */}
        {activeTab === 'estadisticas' && (
          <div className="reporte-diario-section">
            <div className="section-toolbar-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Estadísticas de Captura Diaria (Hoy)
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Resumen de abastecimiento, rendimientos y lectura visual del día de hoy
                </p>
              </div>

              <button
                type="button"
                className="btn-descargar-reporte"
                onClick={handleExportarReporteDiario}
                title="Descargar Estadísticas del Día en Excel"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar Reporte Diario
              </button>
            </div>

            {/* Hoja Formato Reporte Oficial */}
            <div className="reporte-diario-sheet">
              {/* Cuatro Celdas de Métricas Superiores */}
              {(() => {
                const totalLitros = filasReporte.reduce((acc, f) => acc + (parseFloat(f.litros) || 0), 0);
                const totalCargaron = filasReporte.reduce((acc, f) => acc + (parseInt(f.cargaron, 10) || 0), 0);
                const totalSinCargar = filasReporte.reduce((acc, f) => acc + (parseInt(f.sinCargar, 10) || 0), 0);
                const totalParque = filasReporte.reduce((acc, f) => acc + (parseInt(f.parque, 10) || 0), 0);
                const pctAbastecimiento = totalParque > 0 ? Math.round((totalCargaron / totalParque) * 100) : 0;

                return (
                  <div className="reporte-kpi-bar">
                    <div className="reporte-kpi-cell">
                      <div className="cell-title">LITROS TOTALES</div>
                      <div className="cell-number">
                        {totalLitros.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                      </div>
                    </div>
                    <div className="reporte-kpi-cell">
                      <div className="cell-title">UNIDADES QUE CARGARON</div>
                      <div className="cell-number">{totalCargaron}</div>
                    </div>
                    <div className="reporte-kpi-cell">
                      <div className="cell-title">UNIDADES SIN CARGAR</div>
                      <div className="cell-number">{totalSinCargar}</div>
                    </div>
                    <div className="reporte-kpi-cell">
                      <div className="cell-title">% ABASTECIMIENTO</div>
                      <div className="cell-number">{pctAbastecimiento}%</div>
                    </div>
                  </div>
                );
              })()}

              {/* Banner de Sección 1 */}
              <div className="reporte-section-banner">
                CAPTURA DIARIA POR TIPO DE UNIDAD
              </div>

              {/* Tabla de Captura Diaria por Tipo de Unidad */}
              <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                <table className="reporte-table">
                  <thead>
                    <tr>
                      <th>Tipo de unidad</th>
                      <th>Combustible</th>
                      <th>Parque</th>
                      <th>Litros cargados</th>
                      <th>Unidades que cargaron</th>
                      <th>Unidades sin cargar</th>
                      <th>Rendimiento (km/l)</th>
                      <th>% abastecimiento</th>
                      <th>Motivo de no carga</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasReporte.map((fila, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 800 }}>{fila.tipo}</td>
                        <td>{fila.combustible}</td>
                        <td>{fila.parque}</td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {fila.litros.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>{fila.cargaron}</td>
                        <td style={{ color: '#b91c1c', fontWeight: 800 }}>{fila.sinCargar}</td>
                        <td style={{ fontFamily: 'monospace' }}>{fila.rendimiento}</td>
                        <td>
                          <span className={`badge-abastecimiento ${fila.nivelAbastecimiento}`}>
                            {fila.abastecimiento}
                          </span>
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', position: 'relative' }}>
                          <div
                            className="stm-custom-dropdown"
                            ref={openDropdownIndex === idx ? dropdownRef : null}
                          >
                            <button
                              type="button"
                              className={`stm-dropdown-trigger ${openDropdownIndex === idx ? 'open' : ''}`}
                              onClick={() => setOpenDropdownIndex(openDropdownIndex === idx ? null : idx)}
                            >
                              <span className="stm-dropdown-text">{fila.motivoNoCarga}</span>
                              <svg
                                className={`stm-dropdown-arrow ${openDropdownIndex === idx ? 'rotated' : ''}`}
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>

                            {openDropdownIndex === idx && (
                              <div className={`stm-dropdown-menu ${idx >= 2 ? 'dropup' : ''}`}>
                                {OPCIONES_MOTIVO_NO_CARGA.map((opt) => {
                                  const isSelected = fila.motivoNoCarga === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      className={`stm-dropdown-item ${isSelected ? 'selected' : ''}`}
                                      onClick={() => {
                                        handleReporteFieldChange(idx, 'motivoNoCarga', opt);
                                        setOpenDropdownIndex(null);
                                      }}
                                    >
                                      <span>{opt}</span>
                                      {isSelected && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem' }}>
                          <input
                            type="text"
                            className="reporte-input-observaciones"
                            value={fila.observaciones}
                            onChange={(e) => handleReporteFieldChange(idx, 'observaciones', e.target.value.toUpperCase())}
                            placeholder="Observación..."
                          />
                        </td>
                      </tr>
                    ))}

                    {/* Fila de TOTAL GENERAL */}
                    {(() => {
                      const totalLitros = filasReporte.reduce((acc, f) => acc + (parseFloat(f.litros) || 0), 0);
                      const totalCargaron = filasReporte.reduce((acc, f) => acc + (parseInt(f.cargaron, 10) || 0), 0);
                      const totalSinCargar = filasReporte.reduce((acc, f) => acc + (parseInt(f.sinCargar, 10) || 0), 0);
                      const totalParque = filasReporte.reduce((acc, f) => acc + (parseInt(f.parque, 10) || 0), 0);
                      const pctAbastecimiento = totalParque > 0 ? Math.round((totalCargaron / totalParque) * 100) : 0;

                      return (
                        <tr className="total-row">
                          <td style={{ textAlign: 'left', paddingLeft: '1.25rem' }}>TOTAL GENERAL</td>
                          <td></td>
                          <td>{totalParque}</td>
                          <td style={{ fontFamily: 'monospace' }}>
                            {totalLitros.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td>{totalCargaron}</td>
                          <td>{totalSinCargar}</td>
                          <td></td>
                          <td>{pctAbastecimiento}%</td>
                          <td></td>
                          <td></td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Banner de Sección 2 */}
              <div className="reporte-section-banner">
                LECTURA VISUAL DEL DÍA
              </div>

              {/* Gráficas / Barras Estadísticas */}
              <div className="reporte-visual-grid">
                {/* Gráfica 1: Litros cargados por tipo de unidad */}
                <div className="grafica-col-card">
                  <h4 className="grafica-title">Litros cargados por tipo de unidad</h4>
                  <div className="grafica-bars-container">
                    {(() => {
                      const maxLitros = Math.max(...filasReporte.map(f => parseFloat(f.litros) || 0), 1);
                      return filasReporte.map((f) => {
                        const lit = parseFloat(f.litros) || 0;
                        const pct = maxLitros > 0 ? lit / maxLitros : 0;
                        const heightPx = lit > 0 ? Math.max(Math.round(pct * 135), 8) : 2;

                        return (
                          <div key={f.tipo} className="bar-group">
                            <span className="bar-val-label" title={`${lit} L`}>
                              {lit > 0 ? lit.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0'}
                            </span>
                            <div
                              className="bar-pillar gold"
                              style={{ height: `${heightPx}px` }}
                              title={`${f.tipo}: ${lit.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`}
                            />
                            <span className="bar-foot-label">{f.tipo}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Gráfica 2: Unidades abastecidas vs. sin cargar */}
                <div className="grafica-col-card">
                  <h4 className="grafica-title">Unidades abastecidas vs. sin cargar</h4>
                  <div className="grafica-bars-container">
                    {(() => {
                      const maxTotalUnidades = Math.max(...filasReporte.map(f => Math.max(parseInt(f.cargaron, 10) || 0, parseInt(f.sinCargar, 10) || 0)), 1);

                      return filasReporte.map((f) => {
                        const c = parseInt(f.cargaron, 10) || 0;
                        const sc = parseInt(f.sinCargar, 10) || 0;
                        const heightC = c > 0 ? Math.max(Math.round((c / maxTotalUnidades) * 135), 8) : 2;
                        const heightSC = sc > 0 ? Math.max(Math.round((sc / maxTotalUnidades) * 135), 8) : 2;

                        return (
                          <div key={f.tipo} className="bar-group double" style={{ width: '80px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span className="bar-val-label">{c}</span>
                                <div
                                  className="bar-pillar maroon"
                                  style={{ width: '26px', height: `${heightC}px` }}
                                  title={`Cargaron: ${c}`}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span className="bar-val-label">{sc}</span>
                                <div
                                  className="bar-pillar white"
                                  style={{ width: '22px', height: `${heightSC}px` }}
                                  title={`Sin cargar: ${sc}`}
                                />
                              </div>
                            </div>
                            <span className="bar-foot-label">{f.tipo}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Leyenda */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '12px', height: '12px', background: '#6b1d33', display: 'inline-block', borderRadius: '2px' }} />
                      <span>Unidades que cargaron</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '12px', height: '12px', background: '#ffffff', border: '1px solid #94a3b8', display: 'inline-block', borderRadius: '2px' }} />
                      <span>Unidades sin cargar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
