import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import { AuthContext } from '../../context/AuthContext';
import API_BASE from '../../config/api';
import './Maniobristas.css';

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

// Componente de Dropdown de Estatus de Servicio para Maniobristas
function StatusDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [menuStyle, setMenuStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest('.status-dropdown-menu')) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999
      });
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const options = [
    { value: 'disponible', label: 'DISPONIBLE', class: 'disponible' },
    { value: 'en_servicio', label: 'EN SERVICIO', class: 'en_servicio' },
    { value: 'falta', label: 'FALTA', class: 'falta' },
    { value: 'maniobrista', label: 'MANIOBRISTA', class: 'maniobrista' },
    { value: 'permuta', label: 'PERMUTA', class: 'permuta', hideInMenu: true }
  ];

  const selectedOpt = options.find(o => o.value === (value || 'disponible')) || options[0];
  const isReadOnly = selectedOpt.value === 'permuta';

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`status-dropdown-trigger ${selectedOpt.class} ${isOpen ? 'open' : ''}`}
        onClick={() => {
          if (isReadOnly) return;
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState && dropdownRef.current) {
            setTimeout(() => {
              dropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }}
        style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
        onClick={() => {
          if (isReadOnly) return;
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState && dropdownRef.current) {
            setTimeout(() => {
              dropdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }}
        style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
      >
        <span className="status-text">{selectedOpt.label}</span>
        {!isReadOnly && (
          <svg
            className={`arrow-icon ${isOpen ? 'open' : ''}`}
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
          </svg>
        )}
        {!isReadOnly && (
          <svg
            className={`arrow-icon ${isOpen ? 'open' : ''}`}
            viewBox="0 0 24 24"
            width="16"
            height="16"
          >
            <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
          </svg>
        )}
      </button>

      {isOpen && !isReadOnly && createPortal(
        <div className="status-dropdown-menu" style={menuStyle}>
          {options.filter(opt => !opt.hideInMenu).map((opt) => (
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
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Operadores() {
  const { user } = useContext(AuthContext);
  const [maniobristas, setManiobristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedManiobrista, setSelectedManiobrista] = useState(null);

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

  const fetchManiobristas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/conductores`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Error al cargar maniobristas');
      const data = await res.json();
      setManiobristas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los maniobristas.',
        confirmButtonColor: '#6b1d33'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManiobristas();
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
        text: 'Por favor ingresa un nombre válido para el maniobrista.',
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
      if (!res.ok) throw new Error(data.message || 'Error al agregar maniobrista');

      setShowAddModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Maniobrista Registrado',
        text: `El maniobrista se creó exitosamente con el Tarjetón Automático: ${data.conductor.tarjeton}`,
        confirmButtonColor: '#c5a059'
      });
      fetchManiobristas();
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
    setSelectedManiobrista(c);
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
        text: 'El nombre del maniobrista no puede estar vacío.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/conductores/${selectedManiobrista.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nombre: nombreLimpio,
          tipo_tarjeton: tipoTarjeton.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar maniobrista');

      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'Los datos del maniobrista se han actualizado correctamente.',
        confirmButtonColor: '#c5a059'
      });
      fetchManiobristas();
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
      title: '¿Dar de baja al maniobrista?',
      text: `El maniobrista ${c.nombre} (Tarjetón: ${c.tarjeton}) se marcará como BAJA en el sistema. No se eliminará de la base de datos.`,
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
        title: 'Maniobrista en Baja',
        text: 'El maniobrista se ha dado de baja correctamente.',
        confirmButtonColor: '#c5a059'
      });
      fetchManiobristas();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    }
  };

  const handleStatusChange = async (maniobrista, nuevoEstatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/conductores/${maniobrista.id}`, {
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
        text: `El estatus de ${maniobrista.nombre} se actualizó a ${nuevoEstatus.replace('_', ' ').toUpperCase()}.`,
        confirmButtonColor: '#c5a059',
        timer: 1500
      });
      fetchManiobristas();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#6b1d33'
      });
    }
  };

  const filteredManiobristas = maniobristas.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.tarjeton && c.tarjeton.toLowerCase().includes(term)) ||
      (c.tipo_tarjeton && c.tipo_tarjeton.toLowerCase().includes(term))
    );
  });

  const isAdmin = user?.role?.codigo === 'ADMINISTRADOR';

  return (
    <div className="maniobristas-layout">
      <Header title="Gestión de Maniobristas" />

      <main className="maniobristas-main-content">
        <div className="maniobristas-top-bar">
          <div className="maniobristas-title-section">
            <h1>Catálogo de Maniobristas</h1>
            <p className="maniobristas-subtitle">
              Administra el alta y edición de maniobristas. El tarjetón se genera automáticamente.
            </p>
          </div>
        </div>

        <div className="maniobristas-filter-card">
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
          <div className="maniobristas-loading">
            <span className="spinner"></span>
            <p>Cargando lista de maniobristas...</p>
          </div>
        ) : (
          <div className="maniobristas-table-card">
            <div className="table-responsive">
              <table className="maniobristas-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}># Tarjetón</th>
                    <th>Nombre Completo del Maniobrista</th>
                    <th style={{ width: '140px' }}>Tipo Tarjetón</th>
                    <th style={{ width: '160px' }}>Estado Servicio</th>
                    <th style={{ textAlign: 'center', width: '220px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManiobristas.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        No se encontraron maniobristas registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredManiobristas.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="tarjeton-badge">{c.tarjeton}</span>
                        </td>
                        <td className="maniobrista-nombre">{c.nombre}</td>
                        <td>
                          <span className="tipo-badge">
                            {c.tipo_tarjeton ? `TIPO ${c.tipo_tarjeton}` : 'TIPO B'}
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
                              title="Editar Maniobrista"
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
        )}
      </main>

      {/* Modal Agregar Maniobrista */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>Agregar Nuevo Maniobrista</h2>
                <p>Ingresa los datos del maniobrista a registrar</p>
              </div>
              <button className="close-btn" onClick={() => setShowAddModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Nombre Completo del Maniobrista</label>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
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
                  {submitting ? 'Guardando...' : 'Guardar Maniobrista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Maniobrista */}
      {showEditModal && selectedManiobrista && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>Editar Maniobrista</h2>
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
                  value={selectedManiobrista.tarjeton}
                  className="modal-input disabled-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre Completo del Maniobrista</label>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
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
