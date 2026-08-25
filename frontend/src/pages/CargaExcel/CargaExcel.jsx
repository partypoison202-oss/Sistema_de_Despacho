import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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

  const _roleCodigo = String(user?.role?.codigo || '').toUpperCase().trim();
  const _roleNombre = String(user?.role?.nombre || '').toUpperCase().trim();
  const isRelevos = _roleCodigo === 'RELEVOS' || _roleCodigo === 'REVELOS'
    || _roleNombre === 'RELEVOS' || _roleNombre === 'REVELOS'
    || sessionStorage.getItem('vistaPreview') === 'RELEVOS';

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
    if (!tipo) return 'URBANUSS';
    let t = tipo.toString().trim().toUpperCase();
    return t === 'URBANUS' ? 'URBANUSS' : t;
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
    } else if (field === 'HORA_DE_ACOPLE' || field === 'HORA_PROGRAMADA') {
      updatedData[index]['HORA_DE_ACOPLE'] = value;
      updatedData[index]['HORA_PROGRAMADA'] = value;
    } else {
      updatedData[index][field] = value;
    }

    setPreviewData(updatedData);
    setHasChanges(true);
  };

  // ─── HELPER: CARGA UNA IMAGEN DESDE /public Y LA CONVIERTE A PNG BASE64 ──────
  // Usa un <canvas> intermedio para: 1) soportar WEBP en jsPDF (que solo acepta
  // JPEG/PNG/otros formatos rasterizados de forma confiable) y 2) obtener las
  // dimensiones reales de la imagen para poder calcular su proporción y que
  // nunca se vea deformada al insertarla en el PDF.
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  // ─── GENERA EL PDF Y RETORNA EL BASE64 ───────────────────────────────────────
  const generarPDFProgramacion = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const fecha = new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const horaGeneracion = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit'
    });

    // ── Colores corporativos ──
    const vino = [107, 29, 51];
    const vinoOscuro = [74, 16, 32];
    const dorado = [197, 160, 89];
    const grisTexto = [75, 85, 99];

    // ── ENCABEZADO ──
    const headerAlto = 26;
    doc.setFillColor(...vino);
    doc.rect(0, 0, pageWidth, headerAlto, 'F');
    // Franja dorada inferior del header
    doc.setFillColor(...dorado);
    doc.rect(0, headerAlto, pageWidth, 1.2, 'F');

    const logoAltoMM = 15; // alto máximo que ocupará cada logo dentro del header
    const logoY = (headerAlto - logoAltoMM) / 2;

    let textoX = 14; // límite izquierdo del bloque de título (se ajusta si carga el logo izq.)
    let textoRightLimit = pageWidth - 14; // límite derecho (se ajusta si carga el logo der.)

    // ── LOGO IZQUIERDO: sistema_de_tm ──
    try {
      const { base64, width, height } = await loadImageAsBase64('/images/sistema_de_tm.webp');
      const anchoMM = (width / height) * logoAltoMM;
      doc.addImage(base64, 'PNG', 14, logoY, anchoMM, logoAltoMM, undefined, 'FAST');
      textoX = 14 + anchoMM + 6;
    } catch (e) {
      console.warn('No se pudo cargar el logo sistema_de_tm.webp para el PDF:', e);
    }

    // ── LOGO DERECHO: sitmah_logo ──
    try {
      const { base64, width, height } = await loadImageAsBase64('/images/sitmah_logo.png');
      const anchoMM = (width / height) * logoAltoMM;
      const logoXDerecho = pageWidth - 14 - anchoMM;
      doc.addImage(base64, 'PNG', logoXDerecho, logoY, anchoMM, logoAltoMM, undefined, 'FAST');
      textoRightLimit = logoXDerecho - 6;
    } catch (e) {
      console.warn('No se pudo cargar el logo sitmah_logo para el PDF:', e);
    }

    // ── TÍTULO (centrado entre ambos logos) ──
    const tituloAncho = textoRightLimit - textoX;
    const tituloCentro = textoX + tituloAncho / 2;

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Programación Operativa Diaria', tituloCentro, 11, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de unidades, conductores y rutas', tituloCentro, 17, { align: 'center' });

    const fechaCapitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    doc.setFontSize(7.5);
    doc.text(`${fechaCapitalizada} · Generado a las ${horaGeneracion} hrs`, tituloCentro, 22.5, { align: 'center' });

    // ── RESUMEN POR ESTATUS ──
    const conteo = previewData.reduce((acc, fila) => {
      const est = String(fila.ESTATUS || 'sin_estatus').toLowerCase();
      acc[est] = (acc[est] || 0) + 1;
      return acc;
    }, {});

    const resumenItems = [
      { label: 'Total unidades', valor: previewData.length, color: vinoOscuro },
      { label: 'En operación', valor: conteo.operacion || 0, color: [46, 125, 50] },
      { label: 'En reserva', valor: conteo.reserva || 0, color: [30, 90, 168] },
      { label: 'Mantenimiento', valor: conteo.mantenimiento || 0, color: [184, 134, 11] },
    ];

    const resumenY = 34;
    const boxWidth = (pageWidth - 28 - 3 * 4) / 4; // 4 cajas, márgenes de 14 c/lado, 4mm de separación
    resumenItems.forEach((item, i) => {
      const x = 14 + i * (boxWidth + 4);
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(x, resumenY, boxWidth, 14, 1.5, 1.5, 'FD');
      // Barrita de color a la izquierda
      doc.setFillColor(...item.color);
      doc.roundedRect(x, resumenY, 2, 14, 1, 1, 'F');

      doc.setTextColor(...item.color);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.valor), x + 6, resumenY + 7);

      doc.setTextColor(...grisTexto);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, x + 6, resumenY + 11.5);
    });

    // ── TABLA ──
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
      startY: resumenY + 20,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        valign: 'middle',
        lineColor: [225, 225, 225],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: vino,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      bodyStyles: { halign: 'center', textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: {
        5: { halign: 'left' }, // Conductor alineado a la izquierda, se lee mejor
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const estatus = String(filas[data.row.index]?.[2] ?? '').toLowerCase();
          if (estatus === 'operacion') {
            data.cell.styles.fillColor = [198, 239, 206];
            data.cell.styles.textColor = [30, 90, 30];
            data.cell.styles.fontStyle = 'bold';
          }
          if (estatus === 'reserva') {
            data.cell.styles.fillColor = [221, 235, 247];
            data.cell.styles.textColor = [20, 60, 110];
            data.cell.styles.fontStyle = 'bold';
          }
          if (estatus === 'mantenimiento') {
            data.cell.styles.fillColor = [255, 242, 204];
            data.cell.styles.textColor = [130, 95, 10];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: () => {
        // ── PIE DE PÁGINA en cada página ──
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

        doc.setDrawColor(...dorado);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFontSize(7.5);
        doc.setTextColor(...grisTexto);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema de Despacho — Documento generado automáticamente', 14, pageHeight - 7);
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
      },
    });

    // ── LEYENDA DE COLORES (debajo de la tabla, en la última página) ──
    const finalY = doc.lastAutoTable.finalY + 6;
    if (finalY < pageHeight - 20) {
      const leyenda = [
        { color: [198, 239, 206], label: 'Operación' },
        { color: [221, 235, 247], label: 'Reserva' },
        { color: [255, 242, 204], label: 'Mantenimiento' },
      ];
      let legendX = 14;
      doc.setFontSize(7.5);
      leyenda.forEach(item => {
        doc.setFillColor(...item.color);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(legendX, finalY, 4, 4, 0.5, 0.5, 'FD');
        doc.setTextColor(...grisTexto);
        doc.text(item.label, legendX + 6, finalY + 3.2);
        legendX += doc.getTextWidth(item.label) + 16;
      });
    }

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
      // Evita que un click accidental fuera de la alerta (o la tecla ESC) la cierre
      // sin que el usuario tome una decisión explícita.
      allowOutsideClick: false,
      allowEscapeKey: false,
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
      const pdfBase64 = await generarPDFProgramacion();

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
      <Header hasUnsavedChanges={hasChanges} onSaveAndExit={handleSaveChangesDirectly} />
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
                display: isRelevos ? 'none' : 'flex', alignItems: 'center', gap: '0.5rem',
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