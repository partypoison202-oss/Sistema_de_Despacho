import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
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
  const [showInicioModal, setShowInicioModal] = useState(false);
  const [inicioData, setInicioData] = useState([]);
  const [cargandoInicio, setCargandoInicio] = useState(false);

  // Helper para obtener el token de autenticación
  const getAuthHeaders = () => {
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // 1. Obtener y cachear Catálogos usando React Query (Cache de larga duración)
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
    staleTime: 1000 * 60 * 30, // Mantener en cache por 30 minutos sin refetch automático
  });

  const catalogUnidades = catalogos?.unidades || [];
  const catalogConductores = catalogos?.conductores || [];
  const catalogManiobristas = catalogos?.maniobristas || [];
  const catalogRutasObj = catalogos?.rutasObj || { troncales: [], alimentadoras: [] };

  // 2. Cargar datos de la BD en tiempo real (Polling cada 8 segundos)
  const fetchDatosHoy = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/hoy`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Error al obtener datos de hoy');
    }
    const datos = await response.json();
    return Array.isArray(datos) ? datos : [];
  };

  const { data: serverData, isLoading: cargandoTabla } = useQuery({
    queryKey: ['despacho-hoy'],
    queryFn: fetchDatosHoy,
    // Detiene el refetch en segundo plano si hay cambios locales sin guardar para no sobrescribir el trabajo del capturista
    refetchInterval: hasChanges ? false : 8000, 
  });

  // Sincronizar datos del servidor con el estado local del editor cuando no hay cambios pendientes
  useEffect(() => {
    if (serverData && !hasChanges) {
      setPreviewData(serverData);
    }
  }, [serverData, hasChanges]);

  const trimString = (str) => {
    return String(str ?? '').trim();
  };

  const normalizarTipoUnidad = (tipo) => {
    if (!tipo) return 'URBANUS';
    let t = tipo.toString().trim().toUpperCase();
    return t === 'URBANUSS' ? 'URBANUS' : t;
  };

  // Solo se muestran en la tabla los registros cuyo ESTATUS sea "operacion".
  // Se conserva el índice original de previewData para que las actualizaciones
  // (handleUpdateRecord) sigan apuntando al registro correcto, aunque la tabla
  // esté filtrada.
  const registrosVisibles = previewData
    .map((fila, originalIndex) => ({ fila, originalIndex }))
    .filter(({ fila }) => trimString(fila.ESTATUS).toLowerCase() === 'operacion');

  // Actualizar un campo específico de un registro
  const handleUpdateRecord = async (index, field, value) => {
    const updatedData = [...previewData];
    const valStr = String(value ?? '').trim();

    // 1. Cambio de Estatus
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
    
    // 2. Asignación de Tarjetón / Conductor con validación de exclusividad 1 a 1
    if (field === 'TARJETON') {
      // Si el usuario simplemente está limpiando el conductor (vaciando el campo)
      if (valStr === '') {
        updatedData[index]['TARJETON'] = '';
        updatedData[index]['NOMBRE_CONDUCTOR'] = '';
        setPreviewData(updatedData);
        setHasChanges(true);
        return;
      }

      // Buscar si este conductor ya está asignado a OTRA unidad en la lista
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

        if (!confirm.isConfirmed) {
          return;
        }

        newDriverConductor.estado_servicio = 'en_servicio';
      }

      if (existingRowIndex !== -1) {
        // Conductor en uso, solicitar confirmación para intercambiar
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
          // Asignar el nuevo conductor a la unidad seleccionada
          updatedData[index]['TARJETON'] = valStr;
          updatedData[index]['NOMBRE_CONDUCTOR'] = newDriverName;

          // La unidad que tenía a este conductor ahora recibe al conductor que tenía la unidad actual (Intercambio)
          updatedData[existingRowIndex]['TARJETON'] = currentUnitDriverTarjeton;
          updatedData[existingRowIndex]['NOMBRE_CONDUCTOR'] = currentUnitDriverName;

          setPreviewData(updatedData);
          setHasChanges(true);
        }
        return;
      } else {
        // El conductor está libre, asignación normal
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

  // Guardar todos los cambios al backend directamente (retorna booleano)
  const handleSaveChangesDirectly = async () => {
    // Validar que no haya registros incompletos (unidades sin economico)
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
      // Invalidar cache para forzar la recarga de datos frescos
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

  // Guardar todos los cambios al backend
  const handleSaveChanges = async () => {
    setIsSaving(true);
    await handleSaveChangesDirectly();
    setIsSaving(false);
  };



  // 4. Bloquear recarga/cierre del navegador si hay cambios sin guardar
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

  // Exportar los datos actuales a un archivo Excel (.xlsx) con formato
  // Nota: exporta TODOS los registros (todos los estatus), no solo "operacion",
  // para conservar en el archivo el respaldo completo de mantenimiento/reserva/etc.
  // Si prefieres exportar solo lo visible en pantalla, cambia `previewData` por
  // `registrosVisibles.map(r => r.fila)` en las líneas marcadas abajo.
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

    const columnas = ['ECONOMICO', 'TIPO_DE_UNIDAD', 'ESTATUS', 'RUTA', 'TARJETON', 'NOMBRE_CONDUCTOR', 'TARJETON_MANIOBRISTA', 'NOMBRE_MANIOBRISTA', 'HORA_DE_ACOPLE', 'CORRIDAS'];
    const encabezados = ['Económico', 'Tipo de Unidad', 'Estatus', 'Ruta', 'Tarjetón', 'Conductor', 'Tarjetón Maniobrista', 'Nombre Maniobrista', 'Hora Programada', 'Corrida'];

    // Construir array de arrays: encabezados + filas de datos
    const datosHoja = [
      encabezados,
      ...previewData.map(fila => columnas.map(col => fila[col] ?? ''))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(datosHoja);

    // Ancho de columnas
    worksheet['!cols'] = encabezados.map((h, i) => ({
      wch: Math.max(h.length, ...previewData.map(fila => String(fila[columnas[i]] ?? '').length)) + 3
    }));

    // Colores por estatus (fondo de fila)
    const colorPorEstatus = {
      operacion: 'C6EFCE',      // verde claro
      reserva: 'DDEBF7',        // azul claro
      mantenimiento: 'FFF2CC'   // amarillo claro
    };

    const rango = XLSX.utils.decode_range(worksheet['!ref']);

    // Formato del encabezado (fila 0): fondo vino, texto blanco, negritas
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

    // Formato de las filas de datos: colores por estatus + bordes + centrado
    previewData.forEach((fila, rowIdx) => {
      const excelRow = rowIdx + 1; // +1 porque la fila 0 es encabezado
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

  const handleVerInicio = async () => {
    setCargandoInicio(true);
    try {
      const response = await fetch(`${API_BASE}/api/despacho/inicio-hoy`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Error al obtener datos de inicio');
      }
      const data = await response.json();
      setInicioData(data);
      setShowInicioModal(true);
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: 'var(--brand-gold-bg)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#b38f4d'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--brand-gold-bg)'}
            >
              {cargandoInicio ? (
                <span className="spinner-mini"></span>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              )}
              Ver Inicio del Día
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="excel-export-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: '#1e7145',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
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
            data={registrosVisibles.map(r => ({ ...r.fila, __originalIndex: r.originalIndex }))}
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

      {showInicioModal && (
        <InicioDiaModal
          data={inicioData}
          onClose={() => setShowInicioModal(false)}
        />
      )}
    </div>
  );
}

function InicioDiaModal({ data, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTech, setSelectedTech] = useState('');

  const customSortOrder = ['URBANUS', 'URBANUSS', 'ZAFIRO', 'VAGONETA', 'ORION'];

  const estatusTranslations = {
    operacion: 'Operación',
    mantenimiento: 'Mantenimiento',
    reserva: 'Reserva'
  };

  const estatusColors = {
    operacion: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
    mantenimiento: { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
    reserva: { bg: 'rgba(59, 130, 246, 0.08)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' }
  };

  const sortedData = [...(data || [])].sort((a, b) => {
    const typeA = String(a.TIPO_DE_UNIDAD || '').toUpperCase();
    const typeB = String(b.TIPO_DE_UNIDAD || '').toUpperCase();

    let indexA = customSortOrder.indexOf(typeA);
    if (indexA === -1) indexA = 999;
    let indexB = customSortOrder.indexOf(typeB);
    if (indexB === -1) indexB = 999;

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    const ecoA = parseInt(a.ECONOMICO || '0', 10);
    const ecoB = parseInt(b.ECONOMICO || '0', 10);
    return ecoA - ecoB;
  });

  const filteredData = sortedData.filter(fila => {
    if (!fila) return false;

    if (selectedTech) {
      const rowTech = String(fila.TIPO_DE_UNIDAD || '').toUpperCase();
      const targetTech = selectedTech.toUpperCase();
      
      if (targetTech === 'URBANUS') {
        if (rowTech !== 'URBANUS' && rowTech !== 'URBANUSS') return false;
      } else {
        if (rowTech !== targetTech) return false;
      }
    }

    if (searchTerm.trim() !== '') {
      const s = searchTerm.toLowerCase();
      const eco = String(fila.ECONOMICO || '').toLowerCase();
      const ruta = String(fila.RUTA || '').toLowerCase();
      const driver = String(fila.NOMBRE_CONDUCTOR || '').toLowerCase();
      const tarjeton = String(fila.TARJETON || '').toLowerCase();

      return eco.includes(s) || ruta.includes(s) || driver.includes(s) || tarjeton.includes(s);
    }

    return true;
  });

  return (
    <div className="inicio-modal-overlay" onClick={onClose}>
      <div className="inicio-modal-box" onClick={e => e.stopPropagation()}>
        <div className="inicio-modal-header">
          <h2>Programación de Inicio (Hoy)</h2>
          <button type="button" className="inicio-modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="inicio-modal-body">
          <div className="inicio-filters-bar">
            <input
              type="text"
              placeholder="Buscar por eco, ruta, conductor o tarjetón..."
              className="inicio-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['', 'URBANUS', 'ZAFIRO', 'VAGONETA', 'ORION'].map(tech => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => setSelectedTech(tech)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--tw-color-gray-200)',
                    background: selectedTech === tech ? 'var(--brand-maroon-bg)' : 'white',
                    color: selectedTech === tech ? 'white' : 'var(--tw-color-gray-700)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tech === '' ? 'Todos' : tech}
                </button>
              ))}
            </div>
          </div>

          <div className="inicio-table-wrapper table-responsive">
            <table className="inicio-table">
              <thead>
                <tr>
                  <th>Tipo Unidad</th>
                  <th>Económico</th>
                  <th>Ruta</th>
                  <th>Corrida</th>
                  <th>Tarjetón</th>
                  <th>Conductor</th>
                  <th>Tarjetón Maniobrista</th>
                  <th>Maniobrista</th>
                  <th>Estatus</th>
                  <th>Hora Acople</th>
                  <th>Hora Programada</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: 'var(--tw-color-gray-500)' }}>
                      No se encontraron registros de inicio hoy.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, idx) => {
                    const est = String(row.ESTATUS || 'operacion').toLowerCase();
                    const color = estatusColors[est] || estatusColors.operacion;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{row.TIPO_DE_UNIDAD || '-'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{row.ECONOMICO || '-'}</td>
                        <td>{row.RUTA || '-'}</td>
                        <td>{row.CORRIDAS ?? '-'}</td>
                        <td>{row.TARJETON || '-'}</td>
                        <td>{row.NOMBRE_CONDUCTOR || '-'}</td>
                        <td>{row.TARJETON_MANIOBRISTA || '-'}</td>
                        <td>{row.NOMBRE_MANIOBRISTA || '-'}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '30px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`
                          }}>
                            {estatusTranslations[est] || est}
                          </span>
                        </td>
                        <td>{row.HORA_DE_ACOPLE || '-'}</td>
                        <td>{row.HORA_PROGRAMADA || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="inicio-modal-footer">
          <button type="button" className="inicio-modal-btn-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}