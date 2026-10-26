import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import API_BASE from '../../config/api';
import { compareRutas } from '../../utils/rutaUtils';
import './GestionRutasAjustes.css';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  };
};

export const compareRutaCodes = compareRutas;

export default function GestionRutasAjustes() {
  const queryClient = useQueryClient();

  const [filtroTipo, setFiltroTipo] = useState('todas'); // 'todas', 'troncal', 'alimentadora'
  const [busqueda, setBusqueda] = useState('');
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [rutaEnEdicion, setRutaEnEdicion] = useState(null); // null para nueva ruta, objeto para editar
  const [codigoInput, setCodigoInput] = useState('');
  const [tipoInput, setTipoInput] = useState('alimentadora');
  const [descripcionInput, setDescripcionInput] = useState('');
  const [errorInput, setErrorInput] = useState('');

  // Bloquear scroll de fondo cuando el formulario esté abierto
  useEffect(() => {
    if (modalFormOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [modalFormOpen]);

  // 1. Obtener listado de rutas desde la API
  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ['catalogo-rutas-admin'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/rutas`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Error al consultar rutas');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const rutas = responseData?.data || [];
  const totales = responseData?.totales || {
    todas: rutas.length,
    troncales: rutas.filter(r => r.tipo === 'troncal').length,
    alimentadoras: rutas.filter(r => r.tipo === 'alimentadora').length
  };

  // 2. Mutación para Crear / Actualizar Ruta
  const guardarRutaMutation = useMutation({
    mutationFn: async ({ id, ruta, tipo, descripcion }) => {
      const isEdit = Boolean(id);
      const url = isEdit ? `${API_BASE}/api/rutas/${id}` : `${API_BASE}/api/rutas`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({ ruta, tipo, descripcion })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar la ruta');
      }
      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries clave para que todo el sistema y tablas jalen los nuevos datos
      queryClient.invalidateQueries({ queryKey: ['catalogo-rutas-admin'] });
      queryClient.invalidateQueries({ queryKey: ['capturista-catalogos'] });
      queryClient.invalidateQueries({ queryKey: ['despacho-rutas'] });
      queryClient.invalidateQueries({ queryKey: ['despacho-hoy'] });
      cerrarFormulario();

      Swal.fire({
        icon: 'success',
        title: '¡Operación exitosa!',
        text: data.message || 'El catálogo de rutas se ha actualizado.',
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    },
    onError: (err) => {
      setErrorInput(err.message || 'Ocurrió un error al guardar.');
    }
  });

  // 3. Mutación para Eliminar Ruta
  const eliminarRutaMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/api/rutas/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al eliminar la ruta');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-rutas-admin'] });
      queryClient.invalidateQueries({ queryKey: ['capturista-catalogos'] });
      queryClient.invalidateQueries({ queryKey: ['despacho-rutas'] });
      queryClient.invalidateQueries({ queryKey: ['despacho-hoy'] });

      Swal.fire({
        icon: 'success',
        title: 'Ruta eliminada',
        text: data.message || 'La ruta ha sido removida del catálogo.',
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    },
    onError: (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'No se pudo eliminar la ruta.'
      });
    }
  });

  // Abrir formulario para crear nueva ruta
  const handleAbrirCrear = () => {
    setRutaEnEdicion(null);
    setCodigoInput('');
    setTipoInput(filtroTipo === 'troncal' ? 'troncal' : 'alimentadora');
    setDescripcionInput('');
    setErrorInput('');
    setModalFormOpen(true);
  };

  // Abrir formulario para editar ruta existente
  const handleAbrirEditar = (r) => {
    setRutaEnEdicion(r);
    setCodigoInput(r.ruta);
    setTipoInput(r.tipo || 'alimentadora');
    setDescripcionInput(r.descripcion || '');
    setErrorInput('');
    setModalFormOpen(true);
  };

  const cerrarFormulario = () => {
    setModalFormOpen(false);
    setRutaEnEdicion(null);
    setCodigoInput('');
    setDescripcionInput('');
    setErrorInput('');
  };

  const handleGuardarSubmit = (e) => {
    e.preventDefault();
    const cleanCodigo = codigoInput.trim().toUpperCase();

    if (!cleanCodigo) {
      setErrorInput('El código o nombre de ruta es obligatorio.');
      return;
    }

    if (cleanCodigo.length > 20) {
      setErrorInput('El código no puede exceder 20 caracteres.');
      return;
    }

    setErrorInput('');
    guardarRutaMutation.mutate({
      id: rutaEnEdicion?.id,
      ruta: cleanCodigo,
      tipo: tipoInput,
      descripcion: descripcionInput.trim()
    });
  };

  const handleConfirmarEliminar = (r) => {
    Swal.fire({
      title: `¿Eliminar ruta ${r.ruta}?`,
      text: `Se retirará esta ruta (${r.tipo.toUpperCase()}) del catálogo de selección para las unidades.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        eliminarRutaMutation.mutate(r.id);
      }
    });
  };

  // Rutas filtradas por buscador y tipo (ordenadas de menor a mayor y alfabéticamente)
  const rutasFiltradas = useMemo(() => {
    return rutas
      .filter((r) => {
        const coincideTipo = filtroTipo === 'todas' || r.tipo === filtroTipo;
        const term = busqueda.toLowerCase().trim();
        const coincideBusqueda =
          !term ||
          r.ruta.toLowerCase().includes(term) ||
          (r.tipo && r.tipo.toLowerCase().includes(term)) ||
          (r.descripcion && r.descripcion.toLowerCase().includes(term));

        return coincideTipo && coincideBusqueda;
      })
      .sort((a, b) => compareRutaCodes(a.ruta, b.ruta));
  }, [rutas, filtroTipo, busqueda]);

  return (
    <div className="gestion-rutas">
      {/* Controles superiores fijados (Sticky al hacer scroll) */}
      <div className="gestion-rutas__sticky-header">
        {/* Cabecera y descripción explicativa */}
        <div className="gestion-rutas__intro">
          <div className="gestion-rutas__intro-text">
            <h3 className="gestion-rutas__title">Catálogo Maestro de Rutas</h3>
            <p className="gestion-rutas__subtitle">
              Administra las rutas troncales y alimentadoras conectadas a la base de datos.
              Cualquier cambio se reflejará al instante en las tablas de programación y despacho.
            </p>
          </div>
          <button
            type="button"
            className="btn-nueva-ruta"
            onClick={handleAbrirCrear}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva Ruta
          </button>
        </div>

        {/* Selector de Pestañas / Filtro por Tipo */}
        <div className="gestion-rutas__tabs">
          <button
            type="button"
            className={`tab-chip ${filtroTipo === 'todas' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('todas')}
          >
            Todas
            <span className="tab-count">{totales.todas}</span>
          </button>
          <button
            type="button"
            className={`tab-chip tab-chip--troncal ${filtroTipo === 'troncal' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('troncal')}
          >
            Troncales
            <span className="tab-count">{totales.troncales}</span>
          </button>
          <button
            type="button"
            className={`tab-chip tab-chip--alimentadora ${filtroTipo === 'alimentadora' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('alimentadora')}
          >
            Alimentadoras
            <span className="tab-count">{totales.alimentadoras}</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="gestion-rutas__search-bar">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar ruta (ej. T01, 1A, 15C)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="rutas-search-input"
            />
            {busqueda && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setBusqueda('')}
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Listado de Rutas */}
      <div className="gestion-rutas__content">
        {isLoading ? (
          <div className="gestion-rutas__loading">
            <div className="rutas-spinner" />
            <p>Consultando base de datos...</p>
          </div>
        ) : rutasFiltradas.length === 0 ? (
          <div className="gestion-rutas__empty">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No se encontraron rutas con el criterio seleccionado.</p>
            {busqueda && (
              <button
                type="button"
                className="btn-link"
                onClick={() => setBusqueda('')}
              >
                Limpiar filtro de búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="rutas-grid">
            {rutasFiltradas.map((r) => {
              const isTroncal = r.tipo === 'troncal';
              return (
                <div key={r.id} className={`ruta-card ${isTroncal ? 'ruta-card--troncal' : 'ruta-card--alimentadora'}`}>
                  <div className="ruta-card__info">
                    <div className="ruta-card__header-line">
                      <span className="ruta-badge">{r.ruta}</span>
                      <span className={`tipo-tag ${isTroncal ? 'tipo-tag--troncal' : 'tipo-tag--alimentadora'}`}>
                        {isTroncal ? 'TRONCAL' : 'ALIMENTADORA'}
                      </span>
                    </div>
                    {r.descripcion && (
                      <span className="ruta-desc-text" title={r.descripcion}>
                        {r.descripcion}
                      </span>
                    )}
                  </div>
                  <div className="ruta-card__actions">
                    <button
                      type="button"
                      className="btn-icon-action edit"
                      onClick={() => handleAbrirEditar(r)}
                      title={`Editar ruta ${r.ruta}`}
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action delete"
                      onClick={() => handleConfirmarEliminar(r)}
                      title={`Eliminar ruta ${r.ruta}`}
                      disabled={eliminarRutaMutation.isPending}
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini-Modal / Formulario para Agregar o Editar */}
      {modalFormOpen && createPortal(
        <div className="ruta-form-overlay" onClick={cerrarFormulario}>
          <div className="ruta-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ruta-form-modal__header">
              <h4>{rutaEnEdicion ? `Editar Ruta: ${rutaEnEdicion.ruta}` : 'Registrar Nueva Ruta'}</h4>
              <button type="button" className="ruta-form-close" onClick={cerrarFormulario}>×</button>
            </div>

            <form onSubmit={handleGuardarSubmit} className="ruta-form-modal__body">
              <div className="form-group">
                <label className="form-label" htmlFor="codigo_ruta">
                  Código o Identificador de Ruta <span className="text-required">*</span>
                </label>
                <input
                  id="codigo_ruta"
                  type="text"
                  placeholder="Ej. T03, 18, 20C..."
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                  maxLength={20}
                  className="form-input"
                  autoFocus
                />
                <span className="form-hint">Código corto para los selectores de programación (se guarda en mayúsculas).</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="descripcion_ruta">
                  Trayecto / Nombre de Ruta <span className="text-optional">(De dónde a dónde)</span>
                </label>
                <input
                  id="descripcion_ruta"
                  type="text"
                  placeholder="Ej. T-01 Exprés (Téllez - Plaza Juárez) o 2A San Alfonso - Matilde"
                  value={descripcionInput}
                  onChange={(e) => setDescripcionInput(e.target.value)}
                  maxLength={150}
                  className="form-input"
                />
                <span className="form-hint">Nombre que se mostrará en las tarjetas de Monitoreo de Operación.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Tipo de Ruta <span className="text-required">*</span>
                </label>
                <div className="tipo-selector-grid">
                  <label className={`tipo-option ${tipoInput === 'troncal' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="tipoRuta"
                      value="troncal"
                      checked={tipoInput === 'troncal'}
                      onChange={() => setTipoInput('troncal')}
                    />
                    <div className="tipo-option-content">
                      <span className="tipo-title">Urbanuss</span>
                    </div>
                  </label>

                  <label className={`tipo-option ${tipoInput === 'alimentadora' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="tipoRuta"
                      value="alimentadora"
                      checked={tipoInput === 'alimentadora'}
                      onChange={() => setTipoInput('alimentadora')}
                    />
                    <div className="tipo-option-content">
                      <span className="tipo-title">Zafiro, Orión y Vagoneta</span>
                    </div>
                  </label>
                </div>
              </div>

              {errorInput && (
                <div className="form-error-alert">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errorInput}</span>
                </div>
              )}

              <div className="ruta-form-modal__actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={cerrarFormulario}
                  disabled={guardarRutaMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={guardarRutaMutation.isPending || !codigoInput.trim()}
                >
                  {guardarRutaMutation.isPending ? 'Guardando...' : rutaEnEdicion ? 'Actualizar Ruta' : 'Guardar Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
