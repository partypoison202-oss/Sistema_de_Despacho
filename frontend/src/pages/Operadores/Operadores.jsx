import React, { useState, useEffect, useRef, useContext } from 'react';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import { AuthContext } from '../../context/AuthContext';
import API_BASE from '../../config/api';
import './Operadores.css';

// Componente de Select Personalizado igual a la ventana de cambio de estatus de despacho
function CustomSelect({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selected-text">{selectedOption ? selectedOption.label : 'SELECCIONAR TIPO'}</span>
        <svg
          className={`arrow-icon ${isOpen ? 'open' : ''}`}
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5H7z" fill="#6b1d33" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-dropdown-item ${value === opt.value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de Dropdown de Estatus de Servicio para Operadores
function StatusDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'disponible', label: 'DISPONIBLE', class: 'disponible' },
    { value: 'en_servicio', label: 'EN SERVICIO', class: 'en_servicio' },
    { value: 'falta', label: 'FALTA', class: 'falta' }
  ];

  // Si el operador está marcado como maniobrista, mostrar badge de solo lectura
  if (value === 'maniobrista') {
    return (
      <div className="status-dropdown-container" ref={dropdownRef}>
        <div
          className="status-dropdown-trigger maniobrista"
          title="Este operador está gestionado como Maniobrista"
          style={{ cursor: 'default', opacity: 0.85 }}
        >
          <span className="status-text">MANIOBRISTA</span>
        </div>
      </div>
    );
  }

  const selectedOpt = options.find(o => o.value === (value || 'disponible')) || options[0];

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`status-dropdown-trigger ${selectedOpt.class} ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="status-text">{selectedOpt.label}</span>
        <svg
          className={`arrow-icon ${isOpen ? 'open' : ''}`}
          viewBox="0 0 24 24"
          width="16"
          height="16"
        >
          <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div className="status-dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`status-dropdown-item ${opt.class} ${value === opt.value ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(opt.value);
                  setIsOpen(false);
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Operadores() {
  const { user } = useContext(AuthContext);
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [tipoTarjeton, setTipoTarjeton] = useState('B');
  const [submitting, setSubmitting] = useState(false);

  const tipoOptions = [
    { value: 'B', label: 'TIPO B' },
    { value: 'C', label: 'TIPO C' }
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Validación en tiempo real para el nombre del operador: solo letras, acentos, ñ y espacios
  const handleNombreChange = (e) => {
    const val = e.target.value.toUpperCase();
    const filtered = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (filtered.length <= 100) {
      setNombre(filtered);
    }
  };

  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' o 'kardex'
  const [savingId, setSavingId] = useState(null);

  const fetchConductores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/conductores?incluir_bajas=true`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Error al cargar operadores');
      const data = await res.json();
      setConductores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los operadores.',
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocalFieldChange = (id, field, value) => {
    setConductores(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleInlineUpdate = async (id, field, value) => {
    setSavingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/conductores/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          [field]: value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar datos del Kardex');

      setConductores(prev => prev.map(c => c.id === id ? { ...c, [field]: data.conductor[field] } : c));
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleBlurSave = (c, field) => {
    handleInlineUpdate(c.id, field, c[field]);
  };

  useEffect(() => {
    fetchConductores();
  }, []);

  const handleOpenAddModal = () => {
    setNombre('');
    setTipoTarjeton('B');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || !tipoTarjeton.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor ingresa un nombre válido para el operador.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/conductores`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre: nombreLimpio,
          tipo_tarjeton: tipoTarjeton.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al agregar operador');

      setShowAddModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Operador Registrado',
        text: `El operador se creó exitosamente con el Tarjetón Automático: ${data.conductor.tarjeton}`,
        confirmButtonColor: '#c5a059'
      });
      fetchConductores();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (c) => {
    setSelectedConductor(c);
    setNombre(c.nombre);
    setTipoTarjeton(c.tipo_tarjeton === 'C' ? 'C' : 'B');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre del operador no puede estar vacío.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/conductores/${selectedConductor.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre: nombreLimpio,
          tipo_tarjeton: tipoTarjeton.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar operador');

      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'Los datos del operador se han actualizado correctamente.',
        confirmButtonColor: '#c5a059'
      });
      fetchConductores();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDarDeBaja = async (c) => {
    const confirm = await Swal.fire({
      title: '¿Dar de baja al operador?',
      text: `El operador ${c.nombre} (Tarjetón: ${c.tarjeton}) se marcará como BAJA en el sistema. No se eliminará de la base de datos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6b1d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/conductores/${c.id}/baja`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al dar de baja');

      Swal.fire({
        icon: 'success',
        title: 'Operador en Baja',
        text: 'El operador se ha dado de baja correctamente.',
        confirmButtonColor: '#c5a059'
      });
      fetchConductores();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    }
  };

  const handleStatusChange = async (conductor, nuevoEstatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/conductores/${conductor.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estado_servicio: nuevoEstatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar estatus');

      Swal.fire({
        icon: 'success',
        title: 'Estatus Actualizado',
        text: `El estatus de ${conductor.nombre} se actualizó a ${nuevoEstatus.replace('_', ' ').toUpperCase()}.`,
        confirmButtonColor: '#c5a059',
        timer: 1500
      });
      fetchConductores();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    }
  };

  const filteredConductores = conductores.filter(c => {
    if (activeTab === 'catalogo' && c.estatus === 'baja') {
      return false;
    }
    const term = searchTerm.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.tarjeton && c.tarjeton.toLowerCase().includes(term)) ||
      (c.tipo_tarjeton && c.tipo_tarjeton.toLowerCase().includes(term))
    );
  });

  const isAdmin = user?.role?.codigo === 'ADMINISTRADOR';

  return (
    <div className="operadores-layout">
      <Header title="Gestión de Operadores" />

      <main className="operadores-main-content">
        <div className="operadores-top-bar">
          <div className="operadores-title-section">
            <h1>Catálogo de Operadores / Conductores</h1>
            <p className="operadores-subtitle">
              Administra el alta y edición de operadores. El tarjetón se genera automáticamente.
            </p>
          </div>

          {activeTab === 'catalogo' && (
            <button
              type="button"
              className="btn-add-operador"
              onClick={handleOpenAddModal}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar Operador
            </button>
          )}
        </div>

        <div className="operadores-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalogo')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'catalogo' ? '#6b1d33' : '#64748b',
              borderBottom: activeTab === 'catalogo' ? '3px solid #6b1d33' : '3px solid transparent',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Catálogo de Operadores
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'kardex' ? 'active' : ''}`}
            onClick={() => setActiveTab('kardex')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'kardex' ? '#6b1d33' : '#64748b',
              borderBottom: activeTab === 'kardex' ? '3px solid #6b1d33' : '3px solid transparent',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Kardex de Operadores
          </button>
        </div>

        <div className="operadores-filter-card">
          <div className="search-input-wrapper">
            <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, tarjetón o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {loading ? (
          <div className="operadores-loading">
            <span className="spinner"></span>
            <p>Cargando lista de operadores...</p>
          </div>
        ) : activeTab === 'catalogo' ? (
          <div className="operadores-table-card">
            <div className="table-responsive">
              <table className="operadores-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}># Tarjetón</th>
                    <th>Nombre Completo del Operador</th>
                    <th style={{ width: '140px' }}>Tipo Tarjetón</th>
                    <th style={{ width: '160px' }}>Estado Servicio</th>
                    <th style={{ textAlign: 'center', width: '220px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductores.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        No se encontraron operadores registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredConductores.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="tarjeton-badge">{c.tarjeton}</span>
                        </td>
                        <td className="conductor-nombre">{c.nombre}</td>
                        <td>
                          <span className="tipo-badge">
                            TIPO {c.tipo_tarjeton || 'B'}
                          </span>
                        </td>
                        <td>
                          <StatusDropdown
                            value={c.estado_servicio}
                            onChange={(newStatus) => handleStatusChange(c, newStatus)}
                          />
                        </td>
                        <td>
                          <div className="actions-container">
                            <button
                              type="button"
                              className="btn-action edit"
                              onClick={() => handleOpenEditModal(c)}
                              title="Editar Operador"
                            >
                              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                              <span>Editar</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                className="btn-action baja"
                                onClick={() => handleDarDeBaja(c)}
                                title="Dar de baja en sistema"
                              >
                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                                </svg>
                                <span>Dar de Baja</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="operadores-table-card">
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="operadores-table kardex-table" style={{ minWidth: '2400px', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Tarjetón</th>
                    <th style={{ width: '220px' }}>Nombre completo</th>
                    <th style={{ width: '110px' }}>Estatus</th>
                    <th style={{ width: '160px' }}>Última capacitación</th>
                    <th style={{ width: '160px' }}>Próxima capacitación</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Accidentes / Siniestros</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Faltas</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Retardos</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Amonestaciones</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Reconocimientos</th>
                    <th style={{ width: '250px' }}>Condicionamientos jurídicos</th>
                    <th style={{ width: '95px', textAlign: 'center' }}>Permutas</th>
                    <th style={{ width: '95px', textAlign: 'center' }}>Permisos</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Evaluación</th>
                    <th style={{ width: '300px' }}>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductores.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="empty-table-cell">
                        No se encontraron operadores registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredConductores.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="tarjeton-badge">{c.tarjeton}</span>
                        </td>
                        <td className="conductor-nombre">{c.nombre}</td>
                        <td>
                          <span className={`estatus-badge ${c.estatus === 'baja' ? 'baja' : 'activo'}`} style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: c.estatus === 'baja' ? '#fee2e2' : '#dcfce7',
                            color: c.estatus === 'baja' ? '#b91c1c' : '#15803d',
                            textTransform: 'uppercase'
                          }}>
                            {c.estatus === 'baja' ? 'Baja' : 'Activo'}
                          </span>
                        </td>
                        <td>
                          <input
                            type="date"
                            className="kardex-input"
                            value={c.ultima_capacitacion || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'ultima_capacitacion', e.target.value)}
                            onBlur={() => handleBlurSave(c, 'ultima_capacitacion')}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="kardex-input"
                            value={c.proxima_capacitacion || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'proxima_capacitacion', e.target.value)}
                            onBlur={() => handleBlurSave(c, 'proxima_capacitacion')}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.accidentes_siniestros ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'accidentes_siniestros', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'accidentes_siniestros')}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.faltas ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'faltas', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'faltas')}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.retardos ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'retardos', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'retardos')}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.amonestaciones ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'amonestaciones', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'amonestaciones')}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.reconocimientos ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'reconocimientos', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'reconocimientos')}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input"
                            value={c.condicionamientos_juridicos || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'condicionamientos_juridicos', e.target.value)}
                            onBlur={() => handleBlurSave(c, 'condicionamientos_juridicos')}
                            placeholder="Sin especificar"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.permutas ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'permutas', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'permutas')}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.permisos ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'permisos', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleBlurSave(c, 'permisos')}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input text-center"
                            value={c.evaluacion || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'evaluacion', e.target.value)}
                            onBlur={() => handleBlurSave(c, 'evaluacion')}
                            placeholder="N/A"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input"
                            value={c.observaciones || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'observaciones', e.target.value)}
                            onBlur={() => handleBlurSave(c, 'observaciones')}
                            placeholder="Añadir notas..."
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Agregar Operador */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>Agregar Nuevo Operador</h2>
                <p>Ingresa los datos del conductor a registrar</p>
              </div>
              <button className="close-btn" onClick={() => setShowAddModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Nombre Completo del Operador</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PÉREZ LÓPEZ JUAN"
                  value={nombre}
                  onChange={handleNombreChange}
                  maxLength={100}
                  className="modal-input"
                />
                <small style={{ color: '#888', fontSize: '0.78rem', marginTop: '5px', display: 'flex', alignItems: 'flex-start', gap: '5px', lineHeight: '1.4' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Inicia por <strong style={{ color: '#555' }}>apellido paterno</strong>, apellido materno y luego el nombre(s).</span>
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Tarjetón</label>
                <CustomSelect
                  value={tipoTarjeton}
                  onChange={setTipoTarjeton}
                  options={tipoOptions}
                />
              </div>

              <div className="form-info-box">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="info-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>El número de tarjetón se generará de manera automática en el sistema (ej. TJ-XXXX).</span>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Guardar Operador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Operador */}
      {showEditModal && selectedConductor && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>Editar Operador</h2>
                <p>Modifica el nombre o tipo de tarjetón asignado</p>
              </div>
              <button className="close-btn" onClick={() => setShowEditModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Tarjetón Asignado (Automático)</label>
                <input
                  type="text"
                  disabled
                  value={selectedConductor.tarjeton}
                  className="modal-input disabled-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre Completo del Operador</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PÉREZ LÓPEZ JUAN"
                  value={nombre}
                  onChange={handleNombreChange}
                  maxLength={100}
                  className="modal-input"
                />
                <small style={{ color: '#888', fontSize: '0.78rem', marginTop: '5px', display: 'flex', alignItems: 'flex-start', gap: '5px', lineHeight: '1.4' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Inicia por <strong style={{ color: '#555' }}>apellido paterno</strong>, apellido materno y luego el nombre(s).</span>
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Tarjetón</label>
                <CustomSelect
                  value={tipoTarjeton}
                  onChange={setTipoTarjeton}
                  options={tipoOptions}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Actualizar Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
