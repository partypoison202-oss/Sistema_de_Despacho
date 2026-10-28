import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';

const TIPOS_UNIDAD = ['TODOS', 'URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORION'];

const BUS_IMAGES = {
  'URBANUS': '/images/urbanussfrenterealista.webp',
  'URBANUSS': '/images/urbanussfrenterealista.webp',
  'ZAFIRO': '/images/zafirofrenterealista.webp',
  'VAGONETA': '/images/vagoneta frente.webp',
  'ORION': '/images/orionfrente.webp',
  'ORIÓN': '/images/orionfrente.webp',
};

const ROUTE_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#c026d3', // Fuchsia
  '#ea580c', // Orange
];

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
};

const formatMinutesToHours = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
};

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return 'Fecha no registrada';
  try {
    const raw = String(fechaStr).substring(0, 10);
    const partes = raw.split('-');
    if (partes.length === 3) {
      const [y, m, d] = partes;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    return fechaStr;
  } catch {
    return fechaStr;
  }
};

export default function HistorialUnidades() {
  // 1. Estados Principales de Selección
  const [selectedEco, setSelectedEco] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('ficha'); // 'ficha' | 'tabla'

  // 2. Rango de Fechas
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [presetFecha, setPresetFecha] = useState('30_DIAS');

  // 3. Filtros Operativos
  const [tipoUnidadFiltro, setTipoUnidadFiltro] = useState('TODOS');
  const [estatusFiltro, setEstatusFiltro] = useState('todos');
  const [incidenciaFiltro, setIncidenciaFiltro] = useState('todas');
  const [conductorFiltro, setConductorFiltro] = useState('');
  const [rutaFiltro, setRutaFiltro] = useState('');
  const [corridaFiltro, setCorridaFiltro] = useState('');
  const [motivoFallaFiltro, setMotivoFallaFiltro] = useState('');
  const [showFiltrosAvanzados, setShowFiltrosAvanzados] = useState(false);

  // 4. Estado del Calendario / Mapa de Calor Mensual
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null); // 'YYYY-MM-DD' o null

  // 5. Modal de Métricas y Pestaña del Panel Derecho
  const [metricModal, setMetricModal] = useState(null);
  const [panelDerechoTab, setPanelDerechoTab] = useState('asignaciones'); // 'asignaciones' | 'fallas' | 'movimientos' | 'todo'

  // Sincronizar mes del calendario si cambia la fecha final
  useEffect(() => {
    if (hasta) {
      const partes = hasta.split('-').map(Number);
      if (partes.length === 3 && partes[0] && partes[1]) {
        setCalendarDate(new Date(partes[0], partes[1] - 1, 1));
      }
    }
  }, [hasta]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!metricModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMetricModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metricModal]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  };

  // Atajos rápidos de fecha
  const aplicarAtajoFecha = (tipo) => {
    setPresetFecha(tipo);
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    setHasta(hoyStr);

    if (tipo === 'HOY') {
      setDesde(hoyStr);
    } else if (tipo === '7_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDesde(d.toISOString().split('T')[0]);
    } else if (tipo === '15_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      setDesde(d.toISOString().split('T')[0]);
    } else if (tipo === '30_DIAS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDesde(d.toISOString().split('T')[0]);
    } else if (tipo === 'ESTE_MES') {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setDesde(inicioMes.toISOString().split('T')[0]);
    } else if (tipo === 'MES_ANTERIOR') {
      const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      setDesde(inicioMesAnt.toISOString().split('T')[0]);
      setHasta(finMesAnt.toISOString().split('T')[0]);
    }
  };

  // Restablecer Filtros
  const handleLimpiarFiltros = () => {
    setTipoUnidadFiltro('TODOS');
    setEstatusFiltro('todos');
    setIncidenciaFiltro('todas');
    setConductorFiltro('');
    setRutaFiltro('');
    setCorridaFiltro('');
    setMotivoFallaFiltro('');
    setSelectedCalendarDay(null);
    aplicarAtajoFecha('30_DIAS');
  };

  // Consulta Principal a la API
  const {
    data: serverData,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: [
      'historial-unidades-info-general',
      selectedEco,
      tipoUnidadFiltro,
      estatusFiltro,
      incidenciaFiltro,
      conductorFiltro,
      rutaFiltro,
      corridaFiltro,
      motivoFallaFiltro,
      desde,
      hasta,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        desde,
        hasta,
        estatus: estatusFiltro,
      });

      if (selectedEco && selectedEco !== 'TODAS') {
        params.append('economico', selectedEco);
      }
      if (tipoUnidadFiltro && tipoUnidadFiltro !== 'TODOS') {
        params.append('tipo_unidad', tipoUnidadFiltro);
      }
      if (conductorFiltro.trim()) params.append('conductor', conductorFiltro.trim());
      if (rutaFiltro.trim()) params.append('ruta', rutaFiltro.trim());
      if (corridaFiltro.trim()) params.append('corrida', corridaFiltro.trim());
      if (motivoFallaFiltro.trim()) params.append('motivo_falla', motivoFallaFiltro.trim());
      if (incidenciaFiltro !== 'todas') params.append('incidencia', incidenciaFiltro);

      const res = await fetch(`${API_BASE}/api/historial-operativo/unidades?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Error al cargar historial de unidades');
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const unidadesCatalogo = serverData?.unidades_catalogo || [];
  const registros = serverData?.registros || [];

  // Autoseleccionar la primera unidad si aún no hay seleccionada
  useEffect(() => {
    if (unidadesCatalogo.length > 0 && !selectedEco) {
      setSelectedEco(String(unidadesCatalogo[0].economico));
    }
  }, [unidadesCatalogo, selectedEco]);

  // Filtrado de unidades en el buscador flotante
  const filteredUnidadesDropdown = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase().trim();
    return unidadesCatalogo.filter((u) => {
      const ecoStr = String(u.economico || '').toLowerCase();
      const tipoStr = String(u.tipo || u.tipo_unidad || '').toLowerCase();
      return ecoStr.includes(q) || tipoStr.includes(q);
    });
  }, [unidadesCatalogo, searchTerm]);

  // Datos de la unidad seleccionada
  const unidadActualObj = useMemo(() => {
    if (!selectedEco || selectedEco === 'TODAS') {
      return {
        economico: selectedEco || 'TODAS',
        tipo_unidad: tipoUnidadFiltro !== 'TODOS' ? tipoUnidadFiltro : 'Flota ACOTMA',
        estatus: 'activo',
      };
    }
    const found = unidadesCatalogo.find((u) => String(u.economico) === String(selectedEco));
    if (found) return found;
    return {
      economico: selectedEco,
      tipo_unidad: 'URBANUSS',
      estatus: 'activo',
    };
  }, [unidadesCatalogo, selectedEco, tipoUnidadFiltro]);

  // Imagen del modelo de autobús
  const busModelImg = useMemo(() => {
    const raw = String(unidadActualObj.tipo_unidad || unidadActualObj.tipo || 'URBANUSS').toUpperCase();
    for (const key of Object.keys(BUS_IMAGES)) {
      if (raw.includes(key)) {
        return BUS_IMAGES[key];
      }
    }
    return BUS_IMAGES['URBANUSS'];
  }, [unidadActualObj]);

  // Mapa rápido de registros por fecha YYYY-MM-DD
  const registrosPorFecha = useMemo(() => {
    const map = {};
    registros.forEach((r) => {
      if (r.fecha) {
        const fKey = r.fecha.substring(0, 10);
        map[fKey] = r;
      }
    });
    return map;
  }, [registros]);

  // Cálculos y Métricas Operativas para la unidad seleccionada
  const metricas = useMemo(() => {
    const list = registros;
    const diasOperacion = list.filter((r) => r.estatus === 'operacion');
    const diasFalla = list.filter((r) => r.estatus === 'mantenimiento' || Boolean(r.falla));
    const diasReserva = list.filter((r) => r.estatus === 'reserva');
    const todosMovimientos = [];
    const mapaConductores = {};
    const mapaRutas = {};
    let totalJornadasConRuta = 0;

    list.forEach((r) => {
      if (r.movimientos && Array.isArray(r.movimientos)) {
        r.movimientos.forEach((m) => {
          todosMovimientos.push({
            ...m,
            fecha: r.fecha,
            economico: r.economico,
          });
        });
      }

      if (r.nombre_conductor) {
        const nom = r.nombre_conductor.trim();
        if (!mapaConductores[nom]) {
          mapaConductores[nom] = {
            nombre: nom,
            tarjeton: r.numero_tarjeton || 'S/N',
            dias: 0,
            tipo: 'Titular',
          };
        }
        mapaConductores[nom].dias++;
      }

      if (r.relevo_conductor) {
        const relNom = r.relevo_conductor.trim();
        if (!mapaConductores[relNom]) {
          mapaConductores[relNom] = {
            nombre: relNom,
            tarjeton: r.relevo_tarjeton || 'S/N',
            dias: 0,
            tipo: 'Relevo',
          };
        }
        mapaConductores[relNom].dias++;
      }

      if (r.ruta && r.estatus === 'operacion') {
        const rutaNorm = r.ruta.trim().toUpperCase();
        mapaRutas[rutaNorm] = (mapaRutas[rutaNorm] || 0) + 1;
        totalJornadasConRuta++;
      }
    });

    const listaConductores = Object.values(mapaConductores).sort((a, b) => b.dias - a.dias);

    const distribucionRutas = Object.entries(mapaRutas)
      .map(([ruta, count], index) => ({
        ruta,
        dias: count,
        porcentaje: totalJornadasConRuta > 0 ? Math.round((count / totalJornadasConRuta) * 100) : 0,
        color: ROUTE_COLORS[index % ROUTE_COLORS.length],
      }))
      .sort((a, b) => b.dias - a.dias);

    const totalDias = list.length;
    const uptimePct = totalDias > 0 ? Math.round((diasOperacion.length / totalDias) * 100) : 0;
    const fallaPct = totalDias > 0 ? Math.round((diasFalla.length / totalDias) * 100) : 0;
    const reservaPct = Math.max(0, 100 - uptimePct - fallaPct);

    return {
      totalDias,
      diasOperacion: diasOperacion.length,
      diasFalla: diasFalla.length,
      diasReserva: diasReserva.length,
      uptimePct,
      fallaPct,
      reservaPct,
      distribucionRutas,
      totalMovimientos: todosMovimientos.length,
      totalConductores: listaConductores.length,
      listaDiasOperacion: diasOperacion,
      listaFallas: diasFalla,
      listaMovimientos: todosMovimientos,
      listaConductores,
    };
  }, [registros]);

  // Días del Mes para el Calendario / Mapa de Calor (Lunes a Domingo)
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();

    // 0 = Domingo, 1 = Lunes, etc. Convertir a Lunes = 0, Domingo = 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days = [];

    // Celdas vacías del mes anterior
    for (let i = 0; i < startingDay; i++) {
      days.push({ dayNumber: null, dateStr: null, isCurrentMonth: false });
    }

    // Días del mes activo
    for (let d = 1; d <= totalDays; d++) {
      const yStr = String(year);
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        data: registrosPorFecha[dateStr] || null,
      });
    }

    return days;
  }, [calendarDate, registrosPorFecha]);

  const monthName = calendarDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filtrado del Panel Derecho: si hay un día seleccionado en el calendario o una ruta seleccionada
  const registrosFiltradosColumna = useMemo(() => {
    let list = registros;
    if (selectedCalendarDay) {
      list = list.filter((r) => r.fecha && r.fecha.substring(0, 10) === selectedCalendarDay);
    }
    if (rutaFiltro) {
      list = list.filter((r) => r.ruta && r.ruta.toLowerCase().includes(rutaFiltro.toLowerCase()));
    }
    return list;
  }, [registros, selectedCalendarDay, rutaFiltro]);

  const fallasFiltradasPanel = useMemo(() => {
    let list = metricas.listaFallas;
    if (selectedCalendarDay) {
      list = list.filter((f) => f.fecha && f.fecha.substring(0, 10) === selectedCalendarDay);
    }
    return list;
  }, [metricas.listaFallas, selectedCalendarDay]);

  const movimientosFiltradosPanel = useMemo(() => {
    let list = metricas.listaMovimientos;
    if (selectedCalendarDay) {
      list = list.filter((m) => m.fecha && m.fecha.substring(0, 10) === selectedCalendarDay);
    }
    return list;
  }, [metricas.listaMovimientos, selectedCalendarDay]);

  // Abrir Modal de Métricas
  const handleOpenMetricModal = (tipo) => {
    let titulo = '';
    let items = [];
    let badgeColor = 'bg-gray-100 text-gray-700';

    if (tipo === 'operacion') {
      titulo = 'Jornadas en Operación / Ruta';
      badgeColor = 'bg-emerald-100 text-emerald-800';
      items = metricas.listaDiasOperacion;
      setPanelDerechoTab('asignaciones');
    } else if (tipo === 'fallas') {
      titulo = 'Historial de Fallas Mecánicas y Taller';
      badgeColor = 'bg-rose-100 text-rose-800';
      items = metricas.listaFallas;
      setPanelDerechoTab('fallas');
    } else if (tipo === 'movimientos') {
      titulo = 'Historial de Movimientos en Mesa de Control';
      badgeColor = 'bg-amber-100 text-amber-800';
      items = metricas.listaMovimientos;
      setPanelDerechoTab('movimientos');
    } else if (tipo === 'conductores') {
      titulo = 'Operadores que han Conducido la Unidad';
      badgeColor = 'bg-sky-100 text-sky-800';
      items = metricas.listaConductores;
    }

    setMetricModal({
      tipo,
      titulo,
      badgeColor,
      items: Array.isArray(items) ? items : [],
    });
  };

  // Exportar a Excel
  const handleExportarExcel = () => {
    if (!registros || registros.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos para exportar',
        text: 'No hay jornadas registradas para los filtros seleccionados.',
        confirmButtonColor: '#65002D',
      });
      return;
    }

    const worksheetData = registros.map((r) => ({
      'FECHA': r.fecha,
      'ECONÓMICO': r.economico,
      'TIPO DE UNIDAD': r.tipo_unidad || 'URBANUSS',
      'ESTATUS OPERATIVO': String(r.estatus || '').toUpperCase(),
      'CONDUCTOR TITULAR': r.nombre_conductor || 'No asignado',
      'TARJETÓN TITULAR': r.numero_tarjeton || 'S/N',
      'CONDUCTOR RELEVO': r.relevo_conductor || 'Sin relevo',
      'TARJETÓN RELEVO': r.relevo_tarjeton || 'S/N',
      'HORA RELEVO': r.relevo_hora || '—',
      'RUTA ASIGNADA': r.ruta || 'Sin Ruta',
      'CORRIDA': r.corridas || '—',
      'SALIDA DE PATIO': r.hora_salida_patio || r.hora_real_salida_patio || '—',
      'HORA ENCIERRO': r.hora_encierro || '—',
      'FALLA MECÁNICA / REPORTE': r.falla || 'Sin falla',
      'MOTIVO ESTATUS / TALLER': r.motivo_estatus || r.motivo || '—',
      'TOTAL MOVIMIENTOS MESA': r.movimientos ? r.movimientos.length : 0,
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const colWidths = Object.keys(worksheetData[0] || {}).map((k) => ({
      wch: Math.max(k.length, ...worksheetData.map((row) => String(row[k] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Unidades');

    const nombre = selectedEco && selectedEco !== 'TODAS'
      ? `Historial_Eco_${selectedEco}_${desde}_al_${hasta}.xlsx`
      : `Historial_General_Unidades_${desde}_al_${hasta}.xlsx`;

    XLSX.writeFile(wb, nombre);
  };

  const handlePrint = () => {
    window.print();
  };

  const hoyStr = new Date().toISOString().split('T')[0];

  // Renderizador del Timeline Gráfico de Turno de 24h (Limpio y sin ruido de texto)
  const renderShiftTimeline = (item) => {
    if (item.estatus === 'mantenimiento' || Boolean(item.falla)) {
      return (
        <div className="mt-2 pt-1.5 border-t border-rose-100 flex items-center gap-2 text-xs text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-200">
          <span className="text-sm">⚠️</span>
          <span className="font-semibold truncate">
            {item.falla || item.motivo_estatus || item.motivo || 'Avería mecánica reportada'}
          </span>
        </div>
      );
    }

    const salidaStr = item.hora_salida_patio || item.hora_real_salida_patio || '';
    const relevoStr = item.relevo_hora || '';
    const encierroStr = item.hora_encierro || '';

    const salidaMin = parseTimeToMinutes(salidaStr);
    const relevoMin = parseTimeToMinutes(relevoStr);
    let encierroMin = parseTimeToMinutes(encierroStr);

    if (salidaMin != null && encierroMin != null && encierroMin < salidaMin) {
      encierroMin += 1440;
    }

    const windowStart = 240; // 04:00 AM
    const windowEnd = 1440;  // 24:00 (Medianoche)
    const windowSpan = windowEnd - windowStart;

    const clampPct = (val) => {
      if (val == null) return null;
      const clamped = Math.max(windowStart, Math.min(windowEnd, val));
      return ((clamped - windowStart) / windowSpan) * 100;
    };

    const salidaPct = clampPct(salidaMin);
    const relevoPct = clampPct(relevoMin);
    const encierroPct = clampPct(encierroMin);

    if (salidaMin == null && encierroMin == null) {
      return null;
    }

    const startPct = salidaPct != null ? salidaPct : 8;
    const endPct = encierroPct != null ? encierroPct : 94;
    const splitPct = relevoPct != null ? Math.min(Math.max(relevoPct, startPct), endPct) : null;

    let horasTotal = '';
    if (salidaMin != null && encierroMin != null && encierroMin > salidaMin) {
      horasTotal = formatMinutesToHours(encierroMin - salidaMin);
    }

    return (
      <div className="mt-2 pt-1.5 border-t border-gray-100">
        {/* Pista Gráfica Horizontal de 24h */}
        <div className="relative w-full h-3 bg-slate-200/70 rounded-full overflow-hidden shadow-inner my-1">
          <div className="absolute left-[16.6%] top-0 bottom-0 w-[1px] bg-slate-300 pointer-events-none"></div>
          <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-slate-300 pointer-events-none"></div>
          <div className="absolute left-[83.3%] top-0 bottom-0 w-[1px] bg-slate-300 pointer-events-none"></div>

          {splitPct != null ? (
            <>
              <div
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(2, splitPct - startPct)}%`,
                }}
                className="absolute top-0 bottom-0 bg-emerald-500 rounded-l-full"
                title={`Turno Titular: ${salidaStr} a ${relevoStr}`}
              />
              <div
                style={{
                  left: `${splitPct}%`,
                  width: `${Math.max(2, endPct - splitPct)}%`,
                }}
                className="absolute top-0 bottom-0 bg-blue-600 rounded-r-full"
                title={`Turno Relevo: ${relevoStr} a ${encierroStr}`}
              />
            </>
          ) : (
            <div
              style={{
                left: `${startPct}%`,
                width: `${Math.max(3, endPct - startPct)}%`,
              }}
              className="absolute top-0 bottom-0 bg-emerald-500 rounded-full"
              title={`Jornada: ${salidaStr} a ${encierroStr}`}
            />
          )}
        </div>

        {/* Fila única de hitos horarios (Limpia y espaciosa) */}
        <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-600">
          <span className="text-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {salidaStr || '—'} Salida
          </span>

          {relevoStr && (
            <span className="text-blue-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              {relevoStr} Relevo
            </span>
          )}

          <span className="text-slate-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            {encierroStr || '—'} Encierro
          </span>

          {horasTotal && (
            <span className="font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              ⏱ {horasTotal}
            </span>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16">
      <Header title="Historial Operativo de Unidades" hideBackButton={false} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* ==================== 1. BUSCADOR DE UNIDAD + ACCIONES (TARJETA HORIZONTAL) ==================== */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-gray-200/80">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: '#65002D' }}>
              Buscar Unidad / Económico
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'ficha' ? 'tabla' : 'ficha')}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Cambiar vista entre Ficha Detallada y Tabla General"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {viewMode === 'ficha' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  )}
                </svg>
                <span>{viewMode === 'ficha' ? 'Ver Tabla General' : 'Ver Ficha de Unidad'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFiltrosAvanzados(!showFiltrosAvanzados)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  showFiltrosAvanzados ? 'bg-[#65002D] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filtros {showFiltrosAvanzados ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Input de Búsqueda de Unidad */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D] text-sm transition-all"
                placeholder="Escribe el número económico o modelo (ej. 107, 045, Zafiro)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Menú Flotante de Resultados */}
              {searchTerm && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                  {filteredUnidadesDropdown.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {filteredUnidadesDropdown.map((u) => (
                        <li
                          key={u.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors"
                          onClick={() => {
                            setSelectedEco(String(u.economico));
                            setSearchTerm('');
                          }}
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">Unidad Eco {u.economico}</p>
                            <p className="text-xs text-gray-500">Modelo: {u.tipo_unidad || u.tipo || 'URBANUSS'}</p>
                          </div>
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-[#65002D] border border-slate-200">
                            Eco {u.economico}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-3 text-sm text-gray-500 text-center">No se encontraron unidades.</p>
                  )}
                </div>
              )}
            </div>

            {/* Selector Desplegable Directo de Unidad */}
            <div className="w-full sm:w-56 shrink-0">
              <select
                value={selectedEco}
                onChange={(e) => setSelectedEco(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
              >
                <option value="TODAS">-- Todas las Unidades --</option>
                {unidadesCatalogo.map((u) => (
                  <option key={u.id} value={String(u.economico)}>
                    Eco {u.economico} ({u.tipo_unidad || u.tipo || 'Unidad'})
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Excel */}
            <button
              type="button"
              onClick={handleExportarExcel}
              disabled={isLoading || registros.length === 0}
              className={`px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer ${
                isLoading || registros.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Descargar reporte completo en Excel"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar Excel</span>
            </button>

            {/* Botón Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-[#65002D] hover:bg-[#4d0022] rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shrink-0 shadow-xs cursor-pointer"
              title="Imprimir expediente o guardar como PDF"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir</span>
            </button>
          </div>

          {/* ==================== PANEL DE FILTROS AVANZADOS (COLAPSABLE) ==================== */}
          {showFiltrosAvanzados && (
            <div className="mt-4 pt-4 border-t border-gray-200/80 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Rango Desde */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Fecha Desde:</label>
                  <AppleDatePicker value={desde} onChange={setDesde} disableFuture={false} />
                </div>

                {/* Rango Hasta */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Fecha Hasta:</label>
                  <AppleDatePicker value={hasta} onChange={setHasta} minDate={desde} disableFuture={false} />
                </div>

                {/* Tipo de Unidad */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Tipo de Transporte:</label>
                  <select
                    value={tipoUnidadFiltro}
                    onChange={(e) => setTipoUnidadFiltro(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
                  >
                    {TIPOS_UNIDAD.map((t) => (
                      <option key={t} value={t}>
                        {t === 'TODOS' ? 'Todos los tipos' : t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estatus */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Estatus Operativo:</label>
                  <select
                    value={estatusFiltro}
                    onChange={(e) => setEstatusFiltro(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
                  >
                    <option value="todos">Todos los estatus</option>
                    <option value="operacion">En Operación</option>
                    <option value="mantenimiento">Mantenimiento / Taller</option>
                    <option value="reserva">En Reserva</option>
                  </select>
                </div>

                {/* Incidencias */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Incidencia:</label>
                  <select
                    value={incidenciaFiltro}
                    onChange={(e) => setIncidenciaFiltro(e.target.value)}
                    className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
                  >
                    <option value="todas">Todas las jornadas</option>
                    <option value="fallas">Solo con Fallas / Taller</option>
                    <option value="movimientos">Solo con Movimientos Mesa</option>
                    <option value="relevos">Solo con Relevos</option>
                  </select>
                </div>

                {/* Conductor */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Conductor / Tarjetón:</label>
                  <input
                    type="text"
                    placeholder="Tarjetón o nombre..."
                    value={conductorFiltro}
                    onChange={(e) => setConductorFiltro(e.target.value)}
                    className="w-full py-1.5 px-3 border border-gray-300 rounded-lg bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
                  />
                </div>

                {/* Ruta */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Ruta Asignada:</label>
                  <input
                    type="text"
                    placeholder="Ej. T-01, 1, 8..."
                    value={rutaFiltro}
                    onChange={(e) => setRutaFiltro(e.target.value)}
                    className="w-full py-1.5 px-3 border border-gray-300 rounded-lg bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
                  />
                </div>

                {/* Motivo de Falla */}
                <div>
                  <label className="block text-gray-500 font-bold uppercase mb-1">Motivo Falla / Avería:</label>
                  <input
                    type="text"
                    placeholder="Frenos, motor, fuga, aire..."
                    value={motivoFallaFiltro}
                    onChange={(e) => setMotivoFallaFiltro(e.target.value)}
                    className="w-full py-1.5 px-3 border border-gray-300 rounded-lg bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#65002D]/20 focus:border-[#65002D]"
                  />
                </div>
              </div>

              {/* Fila de Atajos de Fechas y Botón Limpiar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-gray-500 uppercase mr-1">Atajos:</span>
                  {[
                    { id: 'HOY', label: 'Hoy' },
                    { id: '7_DIAS', label: '7 días' },
                    { id: '15_DIAS', label: '15 días' },
                    { id: '30_DIAS', label: '30 días' },
                    { id: 'ESTE_MES', label: 'Este Mes' },
                    { id: 'MES_ANTERIOR', label: 'Mes Anterior' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => aplicarAtajoFecha(r.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        presetFecha === r.id
                          ? 'bg-[#65002D] text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="px-3 py-1 rounded-md text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Limpiar Filtros</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================== 2. PERFIL DE LA UNIDAD SELECCIONADA CON RENDER VISUAL ==================== */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Lado Izquierdo: Render del Autobús + Número Económico + Tipo */}
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl flex items-center justify-center bg-slate-100 border border-slate-200 shadow-inner overflow-hidden p-1"
              >
                {selectedEco && selectedEco !== 'TODAS' && busModelImg ? (
                  <img
                    src={busModelImg}
                    alt={unidadActualObj.tipo_unidad || 'Unidad'}
                    className="w-full h-full object-contain filter drop-shadow-sm"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-[#65002D] text-white flex items-center justify-center font-black text-xs">
                    FLOTA
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate tracking-tight uppercase">
                    {selectedEco && selectedEco !== 'TODAS' ? `Unidad ${selectedEco}` : 'Flota Global'}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#65002D] border border-slate-200 uppercase">
                    {unidadActualObj.tipo_unidad || unidadActualObj.tipo || 'TRANSPORTE'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{formatearFecha(desde)} – {formatearFecha(hasta)}</span>
                  <span>•</span>
                  <span>{metricas.totalDias} {metricas.totalDias === 1 ? 'jornada' : 'jornadas'}</span>
                </div>
              </div>
            </div>

            {/* CENTRO: BARRA VISUAL DE DISPONIBILIDAD OPERATIVA (UPTIME / SALUD) */}
            <div className="flex-1 max-w-md px-4 py-2 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      metricas.uptimePct >= 85
                        ? 'bg-emerald-500'
                        : metricas.uptimePct >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  Disponibilidad Operativa
                </span>
                <span className="font-black text-xs text-slate-800">
                  {metricas.uptimePct}%
                </span>
              </div>

              {/* Barra Segmentada de Uptime */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                {metricas.uptimePct > 0 && (
                  <div
                    style={{ width: `${metricas.uptimePct}%` }}
                    className="bg-emerald-500 h-full"
                    title={`En Ruta: ${metricas.diasOperacion} días (${metricas.uptimePct}%)`}
                  />
                )}
                {metricas.fallaPct > 0 && (
                  <div
                    style={{ width: `${metricas.fallaPct}%` }}
                    className="bg-rose-500 h-full"
                    title={`Fallas / Taller: ${metricas.diasFalla} días (${metricas.fallaPct}%)`}
                  />
                )}
                {metricas.reservaPct > 0 && (
                  <div
                    style={{ width: `${metricas.reservaPct}%` }}
                    className="bg-amber-400 h-full"
                    title={`Reserva: ${metricas.diasReserva} días (${metricas.reservaPct}%)`}
                  />
                )}
              </div>

              {/* Desglose Limpio */}
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium mt-1">
                <span>{metricas.diasOperacion}d en ruta</span>
                <span>•</span>
                <span>{metricas.diasFalla}d en taller</span>
                <span>•</span>
                <span>{metricas.diasReserva}d reserva</span>
              </div>
            </div>

            {/* Lado Derecho: Botón Actualizar */}
            <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isLoading || isFetching}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <svg
                  className={`w-3.5 h-3.5 text-gray-500 ${isFetching ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isFetching ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================== 3. RESUMEN OPERATIVO DEL PERIODO ==================== */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
          <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5 uppercase tracking-wide text-gray-700">
            <svg className="w-4 h-4 shrink-0 text-[#65002D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Resumen Operativo
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Días en Operación */}
            <button
              type="button"
              onClick={() => handleOpenMetricModal('operacion')}
              className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-center hover:bg-emerald-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver detalle de jornadas en operación"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-900">
                  {metricas.diasOperacion}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                En Operación
              </div>
            </button>

            {/* 2. Fallas y Taller */}
            <button
              type="button"
              onClick={() => handleOpenMetricModal('fallas')}
              className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 text-center hover:bg-rose-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver detalle de fallas mecánicas y taller"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-rose-900">
                  {metricas.diasFalla}
                </span>
              </div>
              <div className="text-[11px] text-rose-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Fallas / Taller
              </div>
            </button>

            {/* 3. Movimientos en Mesa de Control */}
            <button
              type="button"
              onClick={() => handleOpenMetricModal('movimientos')}
              className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-center hover:bg-amber-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver detalle de movimientos de mesa de control"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-900">
                  {metricas.totalMovimientos}
                </span>
              </div>
              <div className="text-[11px] text-amber-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Mesa de Control
              </div>
            </button>

            {/* 4. Operadores Asignados */}
            <button
              type="button"
              onClick={() => handleOpenMetricModal('conductores')}
              className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3 text-center hover:bg-sky-100/60 hover:shadow-xs transition-all cursor-pointer group flex flex-col items-center justify-between"
              title="Clic para ver la lista de operadores que han conducido esta unidad"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="text-2xl sm:text-3xl font-black text-sky-900">
                  {metricas.totalConductores}
                </span>
              </div>
              <div className="text-[11px] text-sky-800 uppercase font-bold tracking-wider text-left w-full mt-1">
                Operadores
              </div>
            </button>
          </div>
        </div>

        {/* ==================== VISTA PRINCIPAL: 2 PANELES DIVIDIDOS ==================== */}
        {viewMode === 'ficha' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* ==================== PANEL IZQUIERDO (5 cols): ANALÍTICA VISUAL (CALENDARIO + RUTAS) ==================== */}
            <div className="xl:col-span-5 space-y-4">
              {/* 1. Calendario y Mapa de Calor Mensual Interactivo */}
              <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5">
                {/* Cabecera del Calendario */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#65002D]/10 text-[#65002D]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-900">
                        Calendario Operativo
                      </h3>
                    </div>
                  </div>

                  {/* Controles de Navegación del Mes */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Mes anterior"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <span className="text-[11px] font-extrabold uppercase text-[#65002D] px-1 text-center min-w-[105px]">
                      {monthName}
                    </span>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Mes siguiente"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Cuadrícula de 7 Días de la Semana */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                  <span>Lun</span>
                  <span>Mar</span>
                  <span>Mié</span>
                  <span>Jue</span>
                  <span>Vie</span>
                  <span>Sáb</span>
                  <span>Dom</span>
                </div>

                {/* Matriz del Calendario (Limpia y sin saturación de texto) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.isCurrentMonth) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="h-11 sm:h-12 rounded-lg bg-slate-50/40 border border-transparent"
                        />
                      );
                    }

                    const isSelected = selectedCalendarDay === cell.dateStr;
                    const isToday = cell.dateStr === hoyStr;
                    const d = cell.data;

                    const esOperacion = d && d.estatus === 'operacion';
                    const esFalla = d && (d.estatus === 'mantenimiento' || Boolean(d.falla));
                    const esReserva = d && d.estatus === 'reserva';
                    const tieneRelevo = d && (Boolean(d.relevo_conductor) || Boolean(d.relevo_tarjeton));

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          setSelectedCalendarDay(isSelected ? null : cell.dateStr);
                        }}
                        className={`h-11 sm:h-12 p-1 rounded-lg border flex flex-col justify-between transition-all select-none cursor-pointer relative ${
                          isSelected
                            ? 'ring-2 ring-[#65002D] border-[#65002D] shadow-md scale-102 z-10 bg-white'
                            : esFalla
                            ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/70 hover:border-rose-300'
                            : esOperacion
                            ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300'
                            : esReserva
                            ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300'
                            : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 text-gray-400'
                        }`}
                        title={
                          d
                            ? `${formatearFecha(cell.dateStr)}: ${d.estatus?.toUpperCase()} ${d.ruta ? `- Ruta ${d.ruta}` : ''} ${d.nombre_conductor ? `- ${d.nombre_conductor}` : ''} ${d.falla ? `- Falla: ${d.falla}` : ''}`
                            : `${formatearFecha(cell.dateStr)}: Sin registro operativo`
                        }
                      >
                        {/* Fila Superior: Número del Día + Punto indicador */}
                        <div className="flex items-center justify-between leading-none">
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-[#65002D]' : 'text-gray-800'}`}>
                            {cell.dayNumber}
                          </span>

                          {isToday ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#65002D]" title="Hoy"></span>
                          ) : tieneRelevo ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Con relevo"></span>
                          ) : null}
                        </div>

                        {/* Centro: Solo badge visual de Ruta o Alerta (Sin micro-textos redundantes) */}
                        <div className="flex items-center justify-center">
                          {esFalla ? (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-rose-500 text-white leading-none">
                              ⚠️ Taller
                            </span>
                          ) : esOperacion ? (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-600 text-white leading-none truncate max-w-full">
                              {d.ruta ? `R-${d.ruta}` : 'Ruta'}
                            </span>
                          ) : esReserva ? (
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-500 text-white leading-none">
                              Reserva
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Leyenda Compacta */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2.5 mt-2.5 border-t border-gray-100 text-[10px] font-bold">
                  <div className="flex items-center gap-1 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>En Ruta ({metricas.diasOperacion})</span>
                  </div>
                  <div className="flex items-center gap-1 text-rose-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Taller ({metricas.diasFalla})</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Reserva ({metricas.diasReserva})</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Con Relevo</span>
                  </div>
                </div>
              </div>

              {/* 2. Distribución Visual de Rutas Asignadas (Chips Horizontales) */}
              {metricas.distribucionRutas && metricas.distribucionRutas.length > 0 && (
                <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-indigo-50 text-indigo-700">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-800">
                        Distribución de Rutas
                      </h3>
                    </div>

                    {rutaFiltro && (
                      <button
                        type="button"
                        onClick={() => setRutaFiltro('')}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-900 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{rutaFiltro}</span>
                        <span className="text-xs">&times;</span>
                      </button>
                    )}
                  </div>

                  {/* Barra Multirruta Stacked */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner mb-2.5">
                    {metricas.distribucionRutas.map((r) => (
                      <div
                        key={r.ruta}
                        style={{ width: `${r.porcentaje}%`, backgroundColor: r.color }}
                        className="h-full transition-all duration-300 hover:brightness-110 cursor-pointer"
                        onClick={() => setRutaFiltro(rutaFiltro.toLowerCase() === r.ruta.toLowerCase() ? '' : r.ruta)}
                        title={`Ruta ${r.ruta}: ${r.dias} días (${r.porcentaje}%)`}
                      />
                    ))}
                  </div>

                  {/* Pills Horizontales Compactas (Sin cajas amontonadas) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {metricas.distribucionRutas.map((r) => {
                      const isSelected = rutaFiltro.toLowerCase() === r.ruta.toLowerCase();
                      return (
                        <button
                          key={r.ruta}
                          type="button"
                          onClick={() => setRutaFiltro(isSelected ? '' : r.ruta)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'ring-2 ring-indigo-600 bg-indigo-50 border-indigo-400 text-indigo-950 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }}></span>
                          <span>Ruta {r.ruta}</span>
                          <span className="font-bold text-slate-900">{r.porcentaje}%</span>
                          <span className="text-[10px] text-slate-400">({r.dias}d)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ==================== PANEL DERECHO (7 cols): HISTORIAL DE JORNADAS Y BITÁCORA ==================== */}
            <div className="xl:col-span-7 bg-white rounded-xl shadow-xs border border-gray-200/80 p-4 sm:p-5 flex flex-col">
              {/* Cabecera del Panel Derecho */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide" style={{ color: '#65002D' }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {selectedCalendarDay
                      ? `Expediente del ${formatearFecha(selectedCalendarDay)}`
                      : `Expediente Operativo (${registrosFiltradosColumna.length} jornadas)`}
                  </h3>

                  {selectedCalendarDay && (
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDay(null)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#65002D] text-white hover:bg-[#4d0022] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver todas las jornadas</span>
                      <span className="text-xs">&times;</span>
                    </button>
                  )}

                  {rutaFiltro && (
                    <button
                      type="button"
                      onClick={() => setRutaFiltro('')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 hover:bg-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ruta: {rutaFiltro}</span>
                      <span className="text-xs">&times;</span>
                    </button>
                  )}
                </div>

                {/* Sub-Pestañas Operativas del Panel Derecho */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPanelDerechoTab('asignaciones')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      panelDerechoTab === 'asignaciones'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Asignaciones</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                      {registrosFiltradosColumna.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPanelDerechoTab('fallas')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      panelDerechoTab === 'fallas'
                        ? 'bg-white text-rose-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-rose-900'
                    }`}
                  >
                    <span>Fallas / Taller</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
                      {fallasFiltradasPanel.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPanelDerechoTab('movimientos')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      panelDerechoTab === 'movimientos'
                        ? 'bg-white text-amber-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-amber-900'
                    }`}
                  >
                    <span>Mesa Control</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                      {movimientosFiltradosPanel.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPanelDerechoTab('todo')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      panelDerechoTab === 'todo'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todo
                  </button>
                </div>
              </div>

              {/* Contenido del Panel Derecho */}
              <div className="space-y-3 max-h-[660px] overflow-y-auto pr-1">
                {/* 1. VISTA ASIGNACIONES DIARIAS */}
                {(panelDerechoTab === 'asignaciones' || panelDerechoTab === 'todo') && (
                  <div>
                    {panelDerechoTab === 'todo' && (
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Jornadas de Servicio Activo ({registrosFiltradosColumna.length})
                      </h4>
                    )}

                    {isLoading ? (
                      <div className="py-12 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-[#65002D] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs">Cargando jornadas operativas...</p>
                      </div>
                    ) : registrosFiltradosColumna.length === 0 ? (
                      <div className="py-10 text-center text-gray-400">
                        <p className="font-semibold text-xs text-gray-600">Sin jornadas registradas</p>
                        <p className="text-[11px] mt-0.5">No hay registros para la fecha o filtros seleccionados.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {registrosFiltradosColumna.map((item, idx) => {
                          const esMantenimiento = item.estatus === 'mantenimiento' || Boolean(item.falla);
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border text-xs transition-all ${
                                esMantenimiento
                                  ? 'bg-rose-50/40 border-rose-200'
                                  : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
                              }`}
                            >
                              {/* Cabecera del Día: Fecha + Ruta + Corrida + Estatus */}
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-gray-900 text-xs">
                                    {formatearFecha(item.fecha)}
                                  </span>
                                  {item.ruta && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                      Ruta {item.ruta}
                                    </span>
                                  )}
                                  {item.corrida && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                      Corrida {item.corrida}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    item.estatus === 'operacion'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : item.estatus === 'mantenimiento'
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {item.estatus || 'DISPONIBLE'}
                                </span>
                              </div>

                              {/* Conductor y Relevo: Fila limpia sin etiquetas pesadas ni cajas vacías */}
                              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                {/* Titular */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-white shrink-0">
                                    {item.numero_tarjeton ? `T-${item.numero_tarjeton}` : 'S/N'}
                                  </span>
                                  <span className="font-semibold text-gray-900 truncate">
                                    {item.nombre_conductor || 'Sin conductor asignado'}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-medium">(Titular)</span>
                                </div>

                                {/* Relevo: Solo si existe en este día */}
                                {item.relevo_conductor && (
                                  <div className="flex items-center gap-1.5 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                                    <span className="text-[10px] font-bold text-blue-700 uppercase">
                                      Relevo {item.relevo_hora ? `(${item.relevo_hora})` : ''}:
                                    </span>
                                    <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-700 text-white">
                                      {item.relevo_tarjeton ? `T-${item.relevo_tarjeton}` : 'S/N'}
                                    </span>
                                    <span className="font-medium text-blue-900 text-xs">
                                      {item.relevo_conductor}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Timeline Gráfico de Turno de 24h */}
                              {renderShiftTimeline(item)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VISTA FALLAS MECÁNICAS Y TALLER */}
                {(panelDerechoTab === 'fallas' || panelDerechoTab === 'todo') && (
                  <div className={panelDerechoTab === 'todo' ? 'pt-3 mt-3 border-t border-gray-200' : ''}>
                    {panelDerechoTab === 'todo' && (
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                        Averías y Reportes de Taller ({fallasFiltradasPanel.length})
                      </h4>
                    )}

                    {fallasFiltradasPanel.length === 0 ? (
                      <div className="py-8 text-center text-gray-400">
                        <svg className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-semibold text-gray-600">Sin fallas mecánicas registradas</p>
                        <p className="text-[10.5px] text-gray-400">La unidad operó sin incidencias reportadas en este rango.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fallasFiltradasPanel.map((f, fIdx) => (
                          <div key={fIdx} className="bg-rose-50/70 border border-rose-200 rounded-lg p-2.5 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-rose-950">
                                {formatearFecha(f.fecha)}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-200 text-rose-800">
                                Taller
                              </span>
                            </div>
                            <p className="text-rose-900 font-semibold text-xs">
                              {f.falla || f.motivo_estatus || f.motivo || 'Reporte de afectación mecánica'}
                            </p>
                            {f.nombre_conductor && (
                              <p className="text-[11px] text-rose-700/80 mt-1">
                                Operador: {f.nombre_conductor} ({f.numero_tarjeton ? `T-${f.numero_tarjeton}` : 'S/N'})
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. VISTA MOVIMIENTOS EN MESA DE CONTROL */}
                {(panelDerechoTab === 'movimientos' || panelDerechoTab === 'todo') && (
                  <div className={panelDerechoTab === 'todo' ? 'pt-3 mt-3 border-t border-gray-200' : ''}>
                    {panelDerechoTab === 'todo' && (
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Movimientos de Mesa de Control ({movimientosFiltradosPanel.length})
                      </h4>
                    )}

                    {movimientosFiltradosPanel.length === 0 ? (
                      <div className="py-8 text-center text-gray-400">
                        <p className="text-xs font-semibold text-gray-600">Sin movimientos en Mesa de Control</p>
                        <p className="text-[10.5px] text-gray-400">No hubo sustituciones o reasignaciones para esta unidad.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {movimientosFiltradosPanel.map((m, mIdx) => (
                          <div key={mIdx} className="bg-amber-50/60 border border-amber-200/90 rounded-lg p-2.5 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                                {m.tipo_accion || 'MOVIMIENTO'}
                              </span>
                              <span className="font-bold text-gray-600 text-[11px]">
                                {formatearFecha(m.fecha)} {m.hora ? `• ${m.hora}` : ''}
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium mt-1">
                              {typeof m.detalles === 'object' ? JSON.stringify(m.detalles) : String(m.detalles || '')}
                            </p>
                            {m.usuario_nombre && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Registrado por: {m.usuario_nombre}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. VISTA: TABLA GENERAL ==================== */}
        {viewMode === 'tabla' && (
          <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#65002D' }}>
                Listado General de Registros ({registros.length} filas)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[11px] text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Económico</th>
                    <th className="py-3 px-4">Modelo</th>
                    <th className="py-3 px-4">Estatus</th>
                    <th className="py-3 px-4">Ruta / Corrida</th>
                    <th className="py-3 px-4">Conductor Titular</th>
                    <th className="py-3 px-4">Conductor Relevo</th>
                    <th className="py-3 px-4">Falla Mecánica</th>
                    <th className="py-3 px-4">Movs. Mesa</th>
                    <th className="py-3 px-4">Salida / Encierro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {registros.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-gray-400">
                        No se encontraron registros en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    registros.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                          {formatearFecha(r.fecha)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-[#65002D] border border-slate-200">
                            Eco {r.economico}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{r.tipo_unidad || 'URBANUSS'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              r.estatus === 'operacion'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.estatus === 'mantenimiento'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.estatus || 'DISPONIBLE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {r.ruta || 'Sin Ruta'} {r.corridas ? `(C${r.corridas})` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{r.nombre_conductor || 'No asignado'}</div>
                          {r.numero_tarjeton && (
                            <div className="text-[10px] text-gray-400 font-mono">Tarj: {r.numero_tarjeton}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.relevo_conductor ? (
                            <div>
                              <div className="font-bold text-blue-900">{r.relevo_conductor}</div>
                              <div className="text-[10px] text-blue-600 font-mono">
                                Tarj: {r.relevo_tarjeton} {r.relevo_hora ? `(${r.relevo_hora})` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.falla || r.motivo_estatus ? (
                            <span className="text-rose-700 font-bold text-[11px] block max-w-xs truncate" title={r.falla || r.motivo_estatus}>
                              ⚠️ {r.falla || r.motivo_estatus}
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-[11px]">Sin reporte</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.movimientos && r.movimientos.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {r.movimientos.length} cambio(s)
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {r.hora_salida_patio || r.hora_real_salida_patio || '—'} / {r.hora_encierro || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 7. MODAL INTERACTIVO DE MÉTRICAS ==================== */}
        {metricModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
              {/* Header Modal */}
              <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide ${metricModal.badgeColor}`}>
                    {metricModal.items.length} {metricModal.items.length === 1 ? 'registro' : 'registros'}
                  </span>
                  <h3 className="font-bold text-gray-900 text-base">{metricModal.titulo}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMetricModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contenido Modal */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 text-xs">
                {metricModal.items.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No hay registros detallados en este concepto.</p>
                ) : (
                  metricModal.items.map((item, idx) => {
                    if (metricModal.tipo === 'conductores') {
                      return (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-bold text-gray-900 text-sm">{item.nombre}</span>
                            <span className="text-xs text-gray-500 block">Tarjetón: {item.tarjeton} &bull; Rol: {item.tipo}</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                            {item.dias} {item.dias === 1 ? 'jornada' : 'jornadas'}
                          </span>
                        </div>
                      );
                    }

                    if (metricModal.tipo === 'fallas') {
                      return (
                        <div key={idx} className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-rose-950">{formatearFecha(item.fecha)}</span>
                            <span className="text-[10px] font-bold uppercase bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                              Falla
                            </span>
                          </div>
                          <p className="text-rose-900 font-medium">
                            <strong>Avería:</strong> {item.falla || item.motivo_estatus || item.motivo || 'Reporte mecánico'}
                          </p>
                          {item.nombre_conductor && (
                            <p className="text-[11px] text-rose-700 mt-1">
                              Operador: {item.nombre_conductor} ({item.numero_tarjeton || 'S/N'})
                            </p>
                          )}
                        </div>
                      );
                    }

                    if (metricModal.tipo === 'movimientos') {
                      return (
                        <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-amber-950 uppercase">{item.tipo_accion}</span>
                            <span className="text-gray-500 font-bold">{formatearFecha(item.fecha)} {item.hora || ''}</span>
                          </div>
                          <p className="text-gray-800 font-medium">
                            {typeof item.detalles === 'object' ? JSON.stringify(item.detalles) : String(item.detalles || '')}
                          </p>
                          {item.usuario_nombre && (
                            <p className="text-[10px] text-gray-400 mt-1">Registrado por: {item.usuario_nombre}</p>
                          )}
                        </div>
                      );
                    }

                    // Operación
                    return (
                      <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-bold text-gray-900">{formatearFecha(item.fecha)}</span>
                          <span className="text-xs text-gray-600 block">
                            Ruta: {item.ruta || 'Sin Ruta'} &bull; Conductor: {item.nombre_conductor || 'No asignado'} ({item.numero_tarjeton || 'S/N'})
                          </span>
                        </div>
                        <span className="text-xs text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                          Salida: {item.hora_salida_patio || item.hora_real_salida_patio || '—'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
