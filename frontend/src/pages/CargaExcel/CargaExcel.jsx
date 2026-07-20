import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import ExcelPreview from './ExcelVista/ExcelVista';
import './CargaExcel.css';
import API_BASE from '../../config/api';

export default function CargaExcel() {
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    const [resUnidades, resConductores, resRutas] = await Promise.all([
      fetch(`${API_BASE}/api/despacho/catalogo/unidades`, { headers }),
      fetch(`${API_BASE}/api/conductores`, { headers }),
      fetch(`${API_BASE}/api/despacho/rutas`, { headers })
    ]);

    if (!resUnidades.ok || !resConductores.ok || !resRutas.ok) {
      throw new Error('Error al cargar catálogos');
    }

    const unidades = await resUnidades.json();
    const conductores = await resConductores.json();
    const rutas = await resRutas.json();

    return {
      unidades: Array.isArray(unidades) ? unidades : [],
      conductores: Array.isArray(conductores) ? conductores : [],
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

  // Vaciar los campos de un registro (excepto unidad y eco)
  const handleClearRecord = (index) => {
    const target = previewData[index];
    const targetEco = target ? (target.ECONOMICO || 'Sin ECO') : 'Sin ECO';

    Swal.fire({
      title: '¿Vaciar registro?',
      text: `Se limpiarán los datos operativos de la unidad ${targetEco}. El tipo y número económico se conservarán.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, vaciar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedData = [...previewData];
        updatedData[index] = {
          ...updatedData[index],
          RUTA: '',
          TARJETON: '',
          NOMBRE_CONDUCTOR: '',
          ESTATUS: 'operacion',
          HORA_DE_ACOPLE: '',
          CORRIDAS: null
        };
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
      // Invalidar cache para forzar la recarga de datos frescos
      queryClient.invalidateQueries({ queryKey: ['despacho-hoy'] });
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

        {cargandoTabla && previewData.length === 0 ? (
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
            catalogRutasObj={catalogRutasObj}
            onUpdate={handleUpdateRecord}
            onClear={handleClearRecord}
            onSave={handleSaveChanges}
            hasChanges={hasChanges}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
}
