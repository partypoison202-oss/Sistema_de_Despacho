import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import ExcelPreview from './ExcelVista/ExcelVista';
import './CargaExcel.css';
import API_BASE from '../../config/api';

export default function CargaExcel() {
  const [previewData, setPreviewData] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cargandoTabla, setCargandoTabla] = useState(true);

  // Catálogos
  const [catalogUnidades, setCatalogUnidades] = useState([]);
  const [catalogConductores, setCatalogConductores] = useState([]);
  const [catalogRutas, setCatalogRutas] = useState([]);

  // Helper para obtener el token de autenticación
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Carga inicial de datos y catálogos
  const fetchCatalogos = async () => {
    try {
      const headers = getAuthHeaders();
      const [resUnidades, resConductores, resRutas] = await Promise.all([
        fetch(`${API_BASE}/api/despacho/catalogo/unidades`, { headers }),
        fetch(`${API_BASE}/api/conductores`, { headers }),
        fetch(`${API_BASE}/api/despacho/rutas`, { headers })
      ]);

      if (resUnidades.ok) {
        const data = await resUnidades.json();
        setCatalogUnidades(Array.isArray(data) ? data : []);
      }
      if (resConductores.ok) {
        const data = await resConductores.json();
        setCatalogConductores(Array.isArray(data) ? data : []);
      }
      if (resRutas.ok) {
        const data = await resRutas.json();
        const routesObj = data || {};
        const allRoutes = [
          ...(routesObj.troncales || []),
          ...(routesObj.alimentadoras || [])
        ];
        setCatalogRutas(allRoutes);
      }
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  };

  const fetchDatosHoy = async () => {
    setCargandoTabla(true);
    try {
      const response = await fetch(`${API_BASE}/api/despacho/hoy`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const datos = await response.json();
        setPreviewData(Array.isArray(datos) ? datos : []);
      } else {
        setPreviewData([]);
      }
    } catch (error) {
      console.error('Error al obtener datos de hoy:', error);
      setPreviewData([]);
    } finally {
      setCargandoTabla(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
    fetchDatosHoy();
  }, []);

  // Agregar un nuevo registro vacío a la lista
  const handleAddRecord = () => {
    const nuevoRegistro = {
      TIPO_DE_UNIDAD: 'URBANUS', // valor inicial
      RUTA: '',
      ECONOMICO: '',
      TARJETON: '',
      NOMBRE_CONDUCTOR: '',
      ESTATUS: 'operacion',
      FALLA: null,
      CORRIDAS: null,
      CICLO: null,
      MOTIVO: null,
      MOTIVO_ESTATUS: null,
      HORA_DE_ACOPLE: '',
      HORA_PROGRAMADA: ''
    };
    setPreviewData((prev) => [nuevoRegistro, ...prev]);
    setHasChanges(true);
  };

  // Eliminar un registro de la lista
  const handleDeleteRecord = (index) => {
    const target = previewData[index];
    const targetEco = target ? (target.ECONOMICO || 'Sin ECO') : 'Sin ECO';

    Swal.fire({
      title: '¿Eliminar registro?',
      text: `Se quitará la unidad ${targetEco} de la lista de despacho. Recuerda guardar cambios.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedData = [...previewData];
        updatedData.splice(index, 1);
        setPreviewData(updatedData);
        setHasChanges(true);
      }
    });
  };

  // Actualizar un campo específico de un registro
  const handleUpdateRecord = (index, field, value) => {
    const updatedData = [...previewData];
    const valStr = String(value ?? '').trim();
    
    // Si se actualiza el Tarjetón, buscar automáticamente el nombre del conductor
    if (field === 'TARJETON') {
      const conductor = catalogConductores.find(c => trimString(c.tarjeton) === valStr);
      updatedData[index]['TARJETON'] = valStr;
      updatedData[index]['NOMBRE_CONDUCTOR'] = conductor ? conductor.nombre : '';
    } else if (field === 'ECONOMICO') {
      // Si se actualiza el económico, buscar su tipo correspondiente y asignarlo
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

  const trimString = (str) => {
    return String(str ?? '').trim();
  };

  const normalizarTipoUnidad = (tipo) => {
    if (!tipo) return 'URBANUS';
    let t = tipo.toString().trim().toUpperCase();
    return t === 'URBANUSS' ? 'URBANUS' : t;
  };

  // Guardar todos los cambios al backend
  const handleSaveChanges = async () => {
    // Validar que no haya registros incompletos (unidades sin economico)
    const tieneIncompletos = previewData.some(fila => !fila.ECONOMICO);
    if (tieneIncompletos) {
      Swal.fire({
        icon: 'error',
        title: 'Error de validación',
        text: 'Hay registros sin número económico. Por favor complétalos o elimínalos.',
        confirmButtonColor: '#6b1d33'
      });
      return;
    }

    setIsSaving(true);
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
      // Refrescar datos
      await fetchDatosHoy();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="excel-layout">
      <Header />
      <main className="excel-main-content">
        <div className="excel-top-bar">
          <div className="excel-title-section">
            <h1>Captura de Despacho Diario</h1>
            <p className="excel-subtitle">Organiza, edita y concilia la programación operativa de hoy directamente en el sistema</p>
          </div>

          <div className="excel-control-section" style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleAddRecord}
              className="btn-excel-sincronizar"
              style={{ backgroundColor: '#c5a059' }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Agregar Unidad</span>
            </button>
          </div>
        </div>

        {cargandoTabla ? (
          <div className="excel-card-table-loading" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span className="spinner" style={{ borderColor: 'rgba(96, 26, 42, 0.2)', borderTopColor: 'var(--color-maroon)', width: '3rem', height: '3rem', marginBottom: '1rem', display: 'inline-block' }}></span>
            <h3 style={{ color: '#4b5563', margin: 0 }}>Cargando programación diaria...</h3>
            <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Obteniendo los registros de hoy</p>
          </div>
        ) : (
          <ExcelPreview
            data={previewData}
            catalogUnidades={catalogUnidades}
            catalogConductores={catalogConductores}
            catalogRutas={catalogRutas}
            onUpdate={handleUpdateRecord}
            onDelete={handleDeleteRecord}
            onSave={handleSaveChanges}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
}
