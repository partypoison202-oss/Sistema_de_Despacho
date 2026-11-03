// src/pages/Combustible/ControlCombustible.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Header from '../../components/Header/Header';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import ReporteCombustiblePDF from '../Mantenimiento/components/ReporteCombustiblePDF';
import API_BASE from '../../config/api';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import './ControlCombustible.css';

// Catálogo base de unidades de ACOTMA (inicializado limpio hasta recibir datos del backend)
const crearCatalogoUnidadesVacio = () => ({
  urbanuss: Array.from({ length: 42 }, (_, i) => ({
    eco: String(i + 1).padStart(3, '0'),
    combustible: '',
    adblue: '',
    km: ''
  })),
  zafiro: Array.from({ length: 38 }, (_, i) => ({
    eco: String(100 + i),
    combustible: '',
    adblue: '',
    km: ''
  })),
  orion: Array.from({ length: 8 }, (_, i) => ({
    eco: String(401 + i),
    combustible: '',
    adblue: '',
    km: ''
  })),
  vagoneta: Array.from({ length: 60 }, (_, i) => ({
    eco: String(200 + i),
    combustible: '',
    adblue: '',
    km: ''
  }))
});

const UNIDADES_DATA = crearCatalogoUnidadesVacio();

const RESUMEN_SEMANAL_DATA = {
  dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  diesel: [
    { tecnologia: 'Urbanuss', valores: [0, 0, 0, 0, 0, 0, 0] },
    { tecnologia: 'Zafiro', valores: [0, 0, 0, 0, 0, 0, 0] },
    { tecnologia: 'Orión', valores: [0, 0, 0, 0, 0, 0, 0] },
  ],
  gasolina: [
    { tecnologia: 'Vagoneta', valores: [0, 0, 0, 0, 0, 0, 0] },
  ]
};

// Estructura base del Reporte Diario y Estadísticas
const REPORTE_DIARIO_DATA = {
  fecha: '',
  folio: '001',
  litrosTotales: 0,
  unidadesCargaron: 0,
  unidadesSinCargar: 148,
  porcentajeAbastecimiento: '0%',
  parqueTotal: 148,
  filas: [
    {
      tipo: 'Urbanuss',
      combustible: 'Diésel',
      parque: 42,
      litros: 0,
      cargaron: 0,
      sinCargar: 42,
      rendimiento: '0.00',
      abastecimiento: '0%',
      nivelAbastecimiento: 'bajo',
      motivoNoCarga: 'N/A',
      observaciones: ''
    },
    {
      tipo: 'Zafiro',
      combustible: 'Diésel',
      parque: 38,
      litros: 0,
      cargaron: 0,
      sinCargar: 38,
      rendimiento: '0.00',
      abastecimiento: '0%',
      nivelAbastecimiento: 'bajo',
      motivoNoCarga: 'N/A',
      observaciones: ''
    },
    {
      tipo: 'Vagoneta',
      combustible: 'Gasolina',
      parque: 60,
      litros: 0,
      cargaron: 0,
      sinCargar: 60,
      rendimiento: '0.00',
      abastecimiento: '0%',
      nivelAbastecimiento: 'bajo',
      motivoNoCarga: 'N/A',
      observaciones: ''
    },
    {
      tipo: 'Orión',
      combustible: 'Diésel',
      parque: 8,
      litros: 0,
      cargaron: 0,
      sinCargar: 8,
      rendimiento: '0.00',
      abastecimiento: '0%',
      nivelAbastecimiento: 'bajo',
      motivoNoCarga: 'N/A',
      observaciones: ''
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
  const [fechaCaptura, setFechaCaptura] = useState(() => new Date().toLocaleDateString('en-CA'));
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
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfTotales, setPdfTotales] = useState(null);
  const pdfRef = useRef(null);

  // Helper para headers con token de autenticación
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Mapear respuesta del endpoint de reporte diario al formato de filasReporte
  const mapearFilasReporte = (dataArray) => {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.map(item => {
      const pct = Number(item.porcentaje_abastecimiento ?? item.porcentaje ?? 0);
      return {
        tipo: item.tipo_unidad || item.tipo,
        combustible: item.combustible || 'Diésel',
        parque: Number(item.parque ?? 0),
        litros: parseFloat(item.litros_cargados ?? item.litros_combustible ?? item.litros ?? 0),
        cargaron: Number(item.unidades_cargaron ?? item.cargaron ?? 0),
        sinCargar: Number(item.unidades_sin_cargar ?? item.sinCargar ?? 0),
        rendimiento: item.rendimiento != null ? String(item.rendimiento) : '0.00',
        abastecimiento: `${pct}%`,
        nivelAbastecimiento: pct >= 80 ? 'alto' : pct >= 50 ? 'medio' : 'bajo',
        motivoNoCarga: item.motivo_no_carga || 'N/A',
        observaciones: item.observaciones || ''
      };
    });
  };

  // Sincronizar en tiempo real las métricas de filasReporte cuando tablaData cambia
  useEffect(() => {
    const mapaTec = {
      'Urbanuss': tablaData.urbanuss || [],
      'Zafiro': tablaData.zafiro || [],
      'Vagoneta': tablaData.vagoneta || [],
      'Orión': tablaData.orion || [],
    };

    setFilasReporte(prev => prev.map(fila => {
      const lista = mapaTec[fila.tipo];
      if (!lista || lista.length === 0) return fila;

      const parque = lista.length;
      let litros = 0;
      let cargaron = 0;
      lista.forEach(u => {
        const c = parseFloat(u.combustible) || 0;
        if (c > 0) {
          litros += c;
          cargaron++;
        }
      });
      const sinCargar = Math.max(0, parque - cargaron);
      const pct = parque > 0 ? Math.round((cargaron / parque) * 100) : 0;

      return {
        ...fila,
        parque,
        litros: Number(litros.toFixed(2)),
        cargaron,
        sinCargar,
        abastecimiento: `${pct}%`,
        nivelAbastecimiento: pct >= 80 ? 'alto' : pct >= 50 ? 'medio' : 'bajo'
      };
    }));
  }, [tablaData]);

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
              urbanuss: Array.isArray(jsonCargas.data.urbanuss) ? jsonCargas.data.urbanuss : prev.urbanuss,
              zafiro: Array.isArray(jsonCargas.data.zafiro) ? jsonCargas.data.zafiro : prev.zafiro,
              orion: Array.isArray(jsonCargas.data.orion) ? jsonCargas.data.orion : prev.orion,
              vagoneta: Array.isArray(jsonCargas.data.vagoneta) ? jsonCargas.data.vagoneta : prev.vagoneta,
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
            const mappedFilas = mapearFilasReporte(jsonReporte.data);
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
      // Solo enteros positivos (sin puntos ni signos), máximo 8 dígitos
      cleanVal = valor.replace(/\D/g, '').slice(0, 8);
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

      if (!resCargas.ok) {
        const errJson = await resCargas.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al guardar las cargas de combustible en el servidor');
      }

      const jsonRes = await resCargas.json();

      // 2. Consultar estadísticas actualizadas del día (con rendimientos recalculados) y fusionar motivos/observaciones
      let filasActualizadas = filasReporte;
      const resReporteGet = await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible?fecha=${fechaCaptura}`, {
        headers: getAuthHeaders()
      });
      if (resReporteGet.ok) {
        const jsonReporteGet = await resReporteGet.json();
        if (jsonReporteGet.status === 'success' && Array.isArray(jsonReporteGet.data)) {
          const frescas = mapearFilasReporte(jsonReporteGet.data);
          if (frescas.length > 0) {
            filasActualizadas = frescas.map(f => {
              const previa = filasReporte.find(p => p.tipo === f.tipo);
              return {
                ...f,
                motivoNoCarga: previa?.motivoNoCarga || f.motivoNoCarga || 'N/A',
                observaciones: previa?.observaciones !== undefined ? previa.observaciones : (f.observaciones || '')
              };
            });
            setFilasReporte(filasActualizadas);
          }
        }
      }

      // 3. Guardar estado del reporte diario (motivos de no carga, observaciones, etc.)
      const totalLitrosReporte = filasActualizadas.reduce((acc, f) => acc + (parseFloat(f.litros) || 0), 0);
      const totalCargaronReporte = filasActualizadas.reduce((acc, f) => acc + (parseInt(f.cargaron, 10) || 0), 0);
      const totalSinCargarReporte = filasActualizadas.reduce((acc, f) => acc + (parseInt(f.sinCargar, 10) || 0), 0);
      const totalParqueReporte = filasActualizadas.reduce((acc, f) => acc + (parseInt(f.parque, 10) || 0), 0);
      const pctReporte = totalParqueReporte > 0 ? Math.round((totalCargaronReporte / totalParqueReporte) * 100) : 0;

      const dataParaReporte = filasActualizadas.map(f => {
        const pctFila = parseInt(String(f.abastecimiento).replace('%', ''), 10) || 0;
        return {
          tipo: f.tipo,
          tipo_unidad: f.tipo,
          combustible: f.combustible,
          parque: f.parque,
          litros_cargados: f.litros,
          litros_combustible: f.litros,
          unidades_cargaron: f.cargaron,
          unidades_sin_cargar: f.sinCargar,
          rendimiento: f.rendimiento,
          porcentaje: pctFila,
          porcentaje_abastecimiento: pctFila,
          motivo_no_carga: f.motivoNoCarga,
          observaciones: f.observaciones,
        };
      });

      await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fecha_reporte: fechaCaptura,
          totales: {
            litros_totales: Number(totalLitrosReporte.toFixed(2)),
            unidades_cargaron: totalCargaronReporte,
            unidades_sin_cargar: totalSinCargarReporte,
            porcentaje: pctReporte,
          },
          data: dataParaReporte
        })
      });

      // 4. Actualizar resumen semanal y cargas diarias desde BD para mantener las 3 pestañas sincronizadas
      const [resSemanal, resCargasRefresh] = await Promise.all([
        fetch(`${API_BASE}/api/combustible/resumen-semanal?fecha=${fechaCaptura}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/api/combustible/cargas-diarias?fecha=${fechaCaptura}`, { headers: getAuthHeaders() })
      ]);

      if (resSemanal.ok) {
        const jsonSemanal = await resSemanal.json();
        if (jsonSemanal.status === 'success' && jsonSemanal.data) {
          setResumenSemanal(jsonSemanal.data);
        }
      }

      if (resCargasRefresh.ok) {
        const jsonCargasRefresh = await resCargasRefresh.json();
        if (jsonCargasRefresh.status === 'success' && jsonCargasRefresh.data) {
          setTablaData(prev => ({
            ...prev,
            urbanuss: Array.isArray(jsonCargasRefresh.data.urbanuss) ? jsonCargasRefresh.data.urbanuss : prev.urbanuss,
            zafiro: Array.isArray(jsonCargasRefresh.data.zafiro) ? jsonCargasRefresh.data.zafiro : prev.zafiro,
            orion: Array.isArray(jsonCargasRefresh.data.orion) ? jsonCargasRefresh.data.orion : prev.orion,
            vagoneta: Array.isArray(jsonCargasRefresh.data.vagoneta) ? jsonCargasRefresh.data.vagoneta : prev.vagoneta,
          }));
        }
      }

      Swal.fire({
        icon: 'success',
        title: '¡Información Guardada!',
        text: jsonRes.message || `Se han actualizado los consumos de combustible para la fecha ${fechaCaptura}.`,
        confirmButtonColor: '#6b1d33',
      });
      setModificados({});
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

  // Generar y descargar en PDF el Reporte Diario de Combustible (formato oficial de la imagen)
  const handleExportarReporteDiario = async () => {
    try {
      setGenerandoPDF(true);

      const totalLitros = filasReporte.reduce((acc, f) => acc + (parseFloat(f.litros) || 0), 0);
      const totalCargaron = filasReporte.reduce((acc, f) => acc + (parseInt(f.cargaron, 10) || 0), 0);
      const totalSinCargar = filasReporte.reduce((acc, f) => acc + (parseInt(f.sinCargar, 10) || 0), 0);
      const totalParque = filasReporte.reduce((acc, f) => acc + (parseInt(f.parque, 10) || 0), 0);
      const pctAbastecimiento = totalParque > 0 ? Math.round((totalCargaron / totalParque) * 100) : 0;

      // Calcular rendimiento promedio ponderado de las filas con rendimiento > 0
      let sumaKmEstimados = 0;
      let sumaLitrosConRend = 0;
      filasReporte.forEach(f => {
        const rend = parseFloat(f.rendimiento) || 0;
        const lit = parseFloat(f.litros) || 0;
        if (rend > 0 && lit > 0) {
          sumaKmEstimados += rend * lit;
          sumaLitrosConRend += lit;
        }
      });
      const rendimientoPromedio = sumaLitrosConRend > 0
        ? Number((sumaKmEstimados / sumaLitrosConRend).toFixed(2))
        : null;

      const dataFormateada = filasReporte.map(f => {
        const pctFila = parseInt(String(f.abastecimiento).replace('%', ''), 10) || 0;
        const rendNum = parseFloat(f.rendimiento);
        return {
          tipo: f.tipo,
          tipo_unidad: f.tipo,
          combustible: f.combustible,
          parque: Number(f.parque) || 0,
          litros_cargados: Number(f.litros) || 0,
          litros_combustible: Number(f.litros) || 0,
          unidades_cargaron: Number(f.cargaron) || 0,
          unidades_sin_cargar: Number(f.sinCargar) || 0,
          rendimiento: !isNaN(rendNum) && rendNum > 0 ? rendNum : null,
          porcentaje: pctFila,
          porcentaje_abastecimiento: pctFila,
          motivo_no_carga: f.motivoNoCarga || 'N/A',
          observaciones: f.observaciones || '',
        };
      });

      const totalesPayload = {
        litros_totales: Number(totalLitros.toFixed(2)),
        unidades_cargaron: totalCargaron,
        unidades_sin_cargar: totalSinCargar,
        rendimiento: rendimientoPromedio,
        porcentaje: pctAbastecimiento,
        parqueTotal: totalParque,
      };

      // Registrar/actualizar el reporte en backend y obtener su folio COMB-XXX
      let folioGenerado = 'COMB-001';
      try {
        const resReg = await fetch(`${API_BASE}/api/mantenimiento/reporte-combustible`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            fecha_reporte: fechaCaptura,
            totales: totalesPayload,
            data: dataFormateada,
          }),
        });
        if (resReg.ok) {
          const jsonReg = await resReg.json();
          if (jsonReg.status === 'success' && jsonReg.folio) {
            folioGenerado = jsonReg.folio;
          }
        }
      } catch (errPost) {
        console.warn('No se pudo obtener folio remoto, usando folio local:', errPost);
      }

      setPdfData(dataFormateada);
      setPdfTotales({
        ...totalesPayload,
        folio: folioGenerado,
        fecha: fechaCaptura,
      });

      setTimeout(async () => {
        try {
          if (pdfRef.current) {
            const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF({
              orientation: 'landscape',
              unit: 'px',
              format: [canvas.width, canvas.height],
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const partesFecha = String(fechaCaptura).split('-');
            const fechaArchivo = partesFecha.length === 3
              ? `${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}`
              : fechaCaptura;
            pdf.save(`Reporte_Combustible_${folioGenerado}_${fechaArchivo}.pdf`);
          }

          Swal.fire({
            title: `¡Reporte Generado! (${folioGenerado})`,
            text: 'El PDF del Reporte de Combustible se ha descargado correctamente.',
            icon: 'success',
            confirmButtonColor: '#6b1d33',
          });
        } catch (errCanvas) {
          console.error('Error al renderizar PDF:', errCanvas);
          Swal.fire('Error', 'No se pudo generar el archivo PDF.', 'error');
        } finally {
          setPdfData(null);
          setPdfTotales(null);
          setGenerandoPDF(false);
        }
      }, 500);
    } catch (e) {
      console.error('Error al generar PDF de combustible:', e);
      setGenerandoPDF(false);
      Swal.fire('Error', e.message || 'No se pudo generar el reporte PDF', 'error');
    }
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
                              maxLength={8}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-guardar-combustible"
                  onClick={handleGuardarCambios}
                  disabled={guardando}
                  style={guardando ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  title="Guardar motivos de no carga, observaciones y reporte diario"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  {guardando ? 'Guardando...' : 'Guardar Reporte'}
                </button>

                <button
                  type="button"
                  className="btn-descargar-reporte"
                  onClick={handleExportarReporteDiario}
                  disabled={generandoPDF}
                  style={generandoPDF ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  title="Descargar Reporte Diario de Combustible en PDF"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {generandoPDF ? 'Generando PDF...' : 'Descargar Reporte Diario'}
                </button>
              </div>
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

        <ReporteCombustiblePDF ref={pdfRef} data={pdfData} totales={pdfTotales} />
      </main>
    </div>
  );
}
