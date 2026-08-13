import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import ExcelPreview from './ExcelVista/ExcelVista';
import './CargaExcel.css';
import API_BASE from '../../config/api';

export default function CargaExcel() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verInicio, setVerInicio] = useState(false);
  const [inicioData, setInicioData] = useState([]);
  const [cargandoInicio, setCargandoInicio] = useState(false);

  const getAuthHeaders = () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchCatalogos = async () => {
    const headers = getAuthHeaders();
    const [resUnidades, resConductores, resRutas, resManiobristas] = await Promise.all([
      fetch(`${API_BASE}/api/despacho/catalogo/unidades`, { headers }),
      fetch(`${API_BASE}/api/conductores`, { headers }),
      fetch(`${API_BASE}/api/despacho/rutas`, { headers }),
      fetch(`${API_BASE}/api/maniobristas`, { headers })
    ]);

    if (!resUnidades.ok || !resConductores.ok || !resRutas.ok || !resManiobristas.ok) {
      throw new Error('Error al cargar catálogos');
    }

    const unidades = await resUnidades.json();
    const conductores = await resConductores.json();
    const rutas = await resRutas.json();
    const maniobristas = await resManiobristas.json();

    return {
      unidades: Array.isArray(unidades) ? unidades : [],
      conductores: Array.isArray(conductores) ? conductores : [],
      maniobristas: Array.isArray(maniobristas) ? maniobristas : [],
      rutasObj: rutas || { troncales: [], alimentadoras: [] }
    };
  };

  const { data: catalogos } = useQuery({
    queryKey: ['capturista-catalogos'],
    queryFn: fetchCatalogos,
    staleTime: 1000 * 60 * 30,
  });

  const catalogUnidades = catalogos?.unidades || [];
  const catalogConductores = catalogos?.conductores || [];
  const catalogManiobristas = catalogos?.maniobristas || [];
  const catalogRutasObj = catalogos?.rutasObj || { troncales: [], alimentadoras: [] };

  const fetchDatosHoy = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/hoy`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener datos de hoy');
    const datos = await response.json();
    return Array.isArray(datos) ? datos : [];
  };

  const { data: serverData, isLoading: cargandoTabla } = useQuery({
    queryKey: ['despacho-hoy'],
    queryFn: fetchDatosHoy,
    refetchInterval: hasChanges ? false : 8000,
  });

  useEffect(() => {
    if (serverData && !hasChanges) {
      setPreviewData(serverData);
    }
  }, [serverData, hasChanges]);

  const trimString = (str) => String(str ?? '').trim();

  const normalizarTipoUnidad = (tipo) => {
    if (!tipo) return 'URBANUS';
    let t = tipo.toString().trim().toUpperCase();
    return t === 'URBANUSS' ? 'URBANUS' : t;
  };

  const registrosVisibles = previewData.map((fila, originalIndex) => ({ fila, originalIndex }));

  const handleUpdateRecord = async (index, field, value) => {
    const updatedData = [...previewData];
    const valStr = String(value ?? '').trim();

    if (field === 'ESTATUS') {
      if (valStr === 'mantenimiento' || valStr === 'reserva') {
        updatedData[index]['ESTATUS'] = valStr;
        updatedData[index]['RUTA'] = '';
        updatedData[index]['TARJETON'] = '';
        updatedData[index]['NOMBRE_CONDUCTOR'] = '';
        updatedData[index]['HORA_DE_ACOPLE'] = '';
        updatedData[index]['CORRIDAS'] = null;
      } else {
        updatedData[index]['ESTATUS'] = valStr;
      }
      setPreviewData(updatedData);
      setHasChanges(true);
      return;
    }

    if (field === 'TARJETON') {
      if (valStr === '') {
        updatedData[index]['TARJETON'] = '';
        updatedData[index]['NOMBRE_CONDUCTOR'] = '';
        setPreviewData(updatedData);
        setHasChanges(true);
        return;
      }

      const existingRowIndex = updatedData.findIndex((row, idx) => idx !== index && trimString(row.TARJETON) === valStr);
      const newDriverConductor = catalogConductores.find(c => trimString(c.tarjeton) === valStr);
      const newDriverName = newDriverConductor ? newDriverConductor.nombre : '';

      if (newDriverConductor && newDriverConductor.estado_servicio === 'falta') {
        const confirm = await Swal.fire({
          title: 'Confirmar asignación',
          text: `El operador ${newDriverName} está en estatus de FALTA. ¿Deseas asignarlo a la unidad ${updatedData[index]['ECONOMICO']} y cambiar su estatus a en servicio?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#c5a059',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, asignar',
          cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;
        newDriverConductor.estado_servicio = 'en_servicio';
      }

      if (existingRowIndex !== -1) {
        const existingRow = updatedData[existingRowIndex];
        const currentUnitDriverTarjeton = updatedData[index]['TARJETON'];
        const currentUnitDriverName = updatedData[index]['NOMBRE_CONDUCTOR'];

        const confirm = await Swal.fire({
          title: 'Conductor en servicio',
          text: `El conductor ${newDriverName} ya está asignado a la unidad ${existingRow.ECONOMICO}. ¿Deseas hacer el cambio?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#c5a059',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, hacer cambio',
          cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
          updatedData[index]['TARJETON'] = valStr;
          updatedData[index]['NOMBRE_CONDUCTOR'] = newDriverName;
          updatedData[existingRowIndex]['TARJETON'] = currentUnitDriverTarjeton;
          updatedData[existingRowIndex]['NOMBRE_CONDUCTOR'] = currentUnitDriverName;
          setPreviewData(updatedData);
          setHasChanges(true);
        }
        return;
      } else {
        updatedData[index]['TARJETON'] = valStr;
        updatedData[index]['NOMBRE_CONDUCTOR'] = newDriverName;
      }
    } else if (field === 'TARJETON_MANIOBRISTA') {
      if (valStr === '') {
        updatedData[index]['TARJETON_MANIOBRISTA'] = '';
        updatedData[index]['NOMBRE_MANIOBRISTA'] = '';
        setPreviewData(updatedData);
        setHasChanges(true);
        return;
      }

      const existingRowIndex = updatedData.findIndex((row, idx) => idx !== index && trimString(row.TARJETON_MANIOBRISTA) === valStr);
      const newManiobristaCatalog = catalogManiobristas.find(m => trimString(m.tarjeton) === valStr);
      const newManiobristaName = newManiobristaCatalog ? newManiobristaCatalog.nombre : '';

      if (newManiobristaCatalog && newManiobristaCatalog.estado_servicio === 'falta') {
        const confirm = await Swal.fire({
          title: 'Confirmar asignación',
          text: `El maniobrista ${newManiobristaName} está en estatus de FALTA. ¿Deseas asignarlo a la unidad ${updatedData[index]['ECONOMICO']} y cambiar su estatus a en servicio?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#c5a059',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, asignar',
          cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;
        newManiobristaCatalog.estado_servicio = 'en_servicio';
      }

      if (existingRowIndex !== -1) {
        const existingRow = updatedData[existingRowIndex];
        const currentUnitManiobristaTarjeton = updatedData[index]['TARJETON_MANIOBRISTA'];
        const currentUnitManiobristaName = updatedData[index]['NOMBRE_MANIOBRISTA'];

        const confirm = await Swal.fire({
          title: 'Maniobrista en servicio',
          text: `El maniobrista ${newManiobristaName} ya está asignado a la unidad ${existingRow.ECONOMICO}. ¿Deseas hacer el cambio?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#c5a059',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, hacer cambio',
          cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
          updatedData[index]['TARJETON_MANIOBRISTA'] = valStr;
          updatedData[index]['NOMBRE_MANIOBRISTA'] = newManiobristaName;
          updatedData[existingRowIndex]['TARJETON_MANIOBRISTA'] = currentUnitManiobristaTarjeton;
          updatedData[existingRowIndex]['NOMBRE_MANIOBRISTA'] = currentUnitManiobristaName;
          setPreviewData(updatedData);
          setHasChanges(true);
        }
        return;
      } else {
        updatedData[index]['TARJETON_MANIOBRISTA'] = valStr;
        updatedData[index]['NOMBRE_MANIOBRISTA'] = newManiobristaName;
      }
    } else if (field === 'ECONOMICO') {
      const shortcutEco = valStr ? valStr.padStart(3, '0') : '';
      const unidad = catalogUnidades.find(u => trimString(u.numero_eco) === shortcutEco || trimString(u.numero_eco) === valStr);
      updatedData[index]['ECONOMICO'] = shortcutEco;
      if (unidad) {
        updatedData[index]['TIPO_DE_UNIDAD'] = normalizarTipoUnidad(unidad.tipo);
      }
    } else {
      updatedData[index][field] = value;
    }

    setPreviewData(updatedData);
    setHasChanges(true);
  };

  // ─── GENERA EL PDF Y RETORNA EL BASE64 ───────────────────────────────────────
  const generarPDFProgramacion = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Encabezado vino
    doc.setFillColor(107, 29, 51);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Programación Operativa Diaria', 14, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(fecha, doc.internal.pageSize.getWidth() - 14, 13, { align: 'right' });

    const columnas = ['Económico', 'Tipo', 'Estatus', 'Ruta', 'Tarjetón', 'Conductor', 'Hora Prog.', 'Corrida'];
    const filas = previewData.map(fila => [
      fila.ECONOMICO ?? '',
      fila.TIPO_DE_UNIDAD ?? '',
      (fila.ESTATUS ?? '').toUpperCase(),
      fila.RUTA ?? '',
      fila.TARJETON ?? '',
      fila.NOMBRE_CONDUCTOR ?? '',
      fila.HORA_DE_ACOPLE ?? '',
      fila.CORRIDAS ?? '',
    ]);

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: 24,
      styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
      headStyles: { fillColor: [107, 29, 51], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center' },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const estatus = String(filas[data.row.index]?.[2] ?? '').toLowerCase();
          if (estatus === 'operacion')     data.cell.styles.fillColor = [198, 239, 206];
          if (estatus === 'reserva')       data.cell.styles.fillColor = [221, 235, 247];
          if (estatus === 'mantenimiento') data.cell.styles.fillColor = [255, 242, 204];
        }
      },
      alternateRowStyles: { fillColor: false },
    });

    // Retorna solo el base64 sin el prefijo data URI
    return doc.output('datauristring').split(',')[1];
  };

  // ─── GUARDAR DIRECTO (retorna booleano) ──────────────────────────────────────
  const handleSaveChangesDirectly = async () => {
    const tieneIncompletos = previewData.some(fila => !fila.ECONOMICO);
    if (tieneIncompletos) {
      Swal.fire({
        icon: 'error',
        title: 'Error de validación',
        text: 'Hay registros sin número económico. Por favor complétalos o elimínalos.',
        confirmButtonColor: '#6b1d33'
      });
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/despacho/actualizar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ unidades: previewData })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al guardar');

      setHasChanges(false);
      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'La programación operativa se ha guardado correctamente.',
        confirmButtonColor: '#c5a059'
      });
      queryClient.invalidateQueries({ queryKey: ['despacho-hoy'] });
      return true;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#6b1d33'
      });
      return false;
    }
  };

  // ─── GUARDAR + PREGUNTAR SI ENVIAR PDF ───────────────────────────────────────
  const handleSaveChanges = async () => {
    setIsSaving(true);
    const guardadoExitoso = await handleSaveChangesDirectly();
    setIsSaving(false);

    if (!guardadoExitoso) return;

    const { isConfirmed } = await Swal.fire({
      title: '¿Enviar programación a FORTALEZA?',
      text: 'Se enviará la programación operativa actual en PDF al correo de FORTALEZA.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'No, omitir',
    });

    if (!isConfirmed) return;

    try {
      Swal.fire({
        title: 'Enviando PDF...',
        text: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const fecha = new Date().toISOString().split('T')[0];
      const pdfBase64 = generarPDFProgramacion();

      const res = await fetch(`${API_BASE}/api/despacho/enviar-pdf-fortaleza`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pdf_base64: pdfBase64,
          nombre_archivo: `Programacion_Operativa_${fecha}.pdf`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: '¡PDF enviado!',
          text: 'La programación fue enviada correctamente a FORTALEZA.',
          confirmButtonColor: '#6b1d33',
          timer: 3000,
        });
      } else {
        throw new Error(data.message || 'Error al enviar el PDF');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al enviar',
        text: error.message || 'No se pudo enviar el PDF. Intenta de nuevo.',
        confirmButtonColor: '#6b1d33',
      });
    }
  };

  // ─── BLOQUEAR CIERRE SI HAY CAMBIOS ──────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar en la programación operativa.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // ─── EXPORTAR EXCEL ───────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!previewData || previewData.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay registros cargados para exportar.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    const columnas = ['ECONOMICO', 'TIPO_DE_UNIDAD', 'ESTATUS', 'RUTA', 'TARJETON', 'NOMBRE_CONDUCTOR', 'HORA_DE_ACOPLE', 'CORRIDAS'];
    const encabezados = ['Económico', 'Tipo de Unidad', 'Estatus', 'Ruta', 'Tarjetón', 'Conductor', 'Hora Programada', 'Corrida'];

    const datosHoja = [
      encabezados,
      ...previewData.map(fila => columnas.map(col => fila[col] ?? ''))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(datosHoja);

    worksheet['!cols'] = encabezados.map((h, i) => ({
      wch: Math.max(h.length, ...previewData.map(fila => String(fila[columnas[i]] ?? '').length)) + 3
    }));

    const colorPorEstatus = {
      operacion: 'C6EFCE',
      reserva: 'DDEBF7',
      mantenimiento: 'FFF2CC'
    };

    const rango = XLSX.utils.decode_range(worksheet['!ref']);

    for (let col = rango.s.c; col <= rango.e.c; col++) {
      const celdaRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[celdaRef]) continue;
      worksheet[celdaRef].s = {
        fill: { fgColor: { rgb: '6B1D33' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '4A1020' } },
          bottom: { style: 'thin', color: { rgb: '4A1020' } },
          left: { style: 'thin', color: { rgb: '4A1020' } },
          right: { style: 'thin', color: { rgb: '4A1020' } }
        }
      };
    }

    previewData.forEach((fila, rowIdx) => {
      const excelRow = rowIdx + 1;
      const bgColor = colorPorEstatus[String(fila.ESTATUS || '').toLowerCase()] || 'FFFFFF';

      for (let col = rango.s.c; col <= rango.e.c; col++) {
        const celdaRef = XLSX.utils.encode_cell({ r: excelRow, c: col });
        if (!worksheet[celdaRef]) continue;
        worksheet[celdaRef].s = {
          fill: { fgColor: { rgb: bgColor } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
            left: { style: 'thin', color: { rgb: 'D1D5DB' } },
            right: { style: 'thin', color: { rgb: 'D1D5DB' } }
          }
        };
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Despacho');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Despacho_Diario_${fecha}.xlsx`, { cellStyles: true });
  };

  // ─── VER INICIO DEL DÍA ───────────────────────────────────────────────────────
  const handleVerInicio = async () => {
    if (verInicio) {
      setVerInicio(false);
      return;
    }
    setCargandoInicio(true);
    try {
      const response = await fetch(`${API_BASE}/api/despacho/inicio-hoy`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Error al obtener datos de inicio');
      const data = await response.json();
      setInicioData(data);
      setVerInicio(true);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la programación de inicio de hoy.',
        confirmButtonColor: 'var(--color-maroon)'
      });
    } finally {
      setCargandoInicio(false);
    }
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div className="excel-layout">
      <Header />
      <main className="excel-main-content">
        <div className="excel-top-bar">
          <div className="excel-title-section">
            <h1>Captura de Despacho Diario</h1>
            <p className="excel-subtitle">Organiza, edita y concilia la programación operativa de hoy directamente en el sistema</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleVerInicio}
              disabled={cargandoInicio}
              className="excel-export-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.25rem', borderRadius: '0.6rem', border: 'none',
                background: verInicio ? 'var(--color-primary)' : 'var(--brand-gold-bg)',
                color: 'white', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = verInicio ? 'var(--color-primary-hover)' : '#b38f4d'}
              onMouseOut={(e) => e.currentTarget.style.background = verInicio ? 'var(--color-primary)' : 'var(--brand-gold-bg)'}
            >
              {cargandoInicio ? (
                <span className="spinner-mini"></span>
              ) : verInicio ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              )}
              {verInicio ? 'Volver a Edición' : 'Ver Inicio del Día'}
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="excel-export-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.25rem', borderRadius: '0.6rem', border: 'none',
                background: '#1e7145', color: 'white', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#155a35'}
              onMouseOut={(e) => e.currentTarget.style.background = '#1e7145'}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar Excel
            </button>
          </div>
        </div>

        {cargandoTabla && previewData.length === 0 ? (
          <div className="excel-card-table-loading" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '3rem', height: '3rem', marginBottom: '1rem', display: 'inline-block' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0 }}>Cargando programación diaria...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Obteniendo los registros de hoy</p>
          </div>
        ) : (
          <ExcelPreview
            readOnly={verInicio}
            data={
              verInicio
                ? inicioData
                : registrosVisibles.map(r => ({ ...r.fila, __originalIndex: r.originalIndex }))
            }
            catalogUnidades={catalogUnidades}
            catalogConductores={catalogConductores}
            catalogManiobristas={catalogManiobristas}
            catalogRutasObj={catalogRutasObj}
            onUpdate={handleUpdateRecord}
            onSave={handleSaveChanges}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
}