import React, { useState, useEffect, useLayoutEffect, useRef, useContext } from 'react';
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
function StatusDropdown({ value, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [menuStyle, setMenuStyle] = useState({});

  useLayoutEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest('.status-dropdown-menu')) {
        setIsOpen(false);
      }
    };


    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 200; // Altura estimada del menú desplegable

      let style = {
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999
      };

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        style.bottom = window.innerHeight - rect.top + 4;
      } else {
        style.top = rect.bottom + 4;
      }

      setMenuStyle(style);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options = [
    { value: 'disponible', label: 'DISPONIBLE', class: 'disponible' },
    { value: 'en_servicio', label: 'EN SERVICIO', class: 'en_servicio' },
    { value: 'falta', label: 'FALTA', class: 'falta' },
    { value: 'maniobrista', label: 'MANIOBRISTA', class: 'maniobrista' },
    { value: 'permuta', label: 'PERMUTA', class: 'permuta', hideInMenu: true },
    { value: 'incapacidad', label: 'INCAPACIDAD', class: 'incapacidad' },
    { value: 'descanso', label: 'DESCANSO', class: 'descanso' }
  ];

  const selectedOpt = options.find(o => o.value === (value || 'disponible')) || options[0];
  const isReadOnly = selectedOpt.value === 'permuta' || disabled;

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`status-dropdown-trigger ${selectedOpt.class} ${isOpen ? 'open' : ''}`}
        onClick={() => {
          if (isReadOnly) return;
          const nextState = !isOpen;
          setIsOpen(nextState);
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
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstadoServicio, setFilterEstadoServicio] = useState('');

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
      if (!res.ok) throw new Error('Error al cargar conductores');
      const data = await res.json();
      
      const mappedData = (Array.isArray(data) ? data : []).map(c => ({
        ...c,
        nombre: c.nombres ? `${c.nombres} ${c.apellidos || ''}`.trim() : c.nombre
      }));
      setManiobristas(mappedData);
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
      const res = await fetch(`${API_BASE}/api/maniobristas`, {
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
      const res = await fetch(`${API_BASE}/api/maniobristas/${selectedManiobrista.id}`, {
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
    const matchTerm = 
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.tarjeton && c.tarjeton.toLowerCase().includes(term)) ||
      (c.tipo_tarjeton && c.tipo_tarjeton.toLowerCase().includes(term));
    
    const matchTipo = filterTipo ? c.tipo_tarjeton === filterTipo : true;
    const matchEstado = filterEstadoServicio ? c.estado_servicio === filterEstadoServicio : true;

    return matchTerm && matchTipo && matchEstado;
  });

  const isAdmin = user?.role?.codigo === 'ADMINISTRADOR';
  const canEdit = user?.modulos?.includes('maniobristas') || isAdmin || user?.role?.codigo === 'GESTOR_OPERADORES';

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
          {/* Botón Nuevo Maniobrista eliminado ya que se extraen todos los conductores */}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 mt-2 px-6">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#6b1d33] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, tarjetón o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-[0.95rem] rounded-full focus:ring-2 focus:ring-[#6b1d33]/20 focus:border-[#6b1d33] focus:bg-white transition-all outline-none placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex w-full md:w-auto items-center gap-3">
            <CustomSelect
              value={filterTipo}
              onChange={setFilterTipo}
              options={[
                { value: '', label: 'TIPO TARJETÓN: TODOS' },
                { value: 'B', label: 'TIPO B' },
                { value: 'C', label: 'TIPO C' }
              ]}
            />

            <CustomSelect
              value={filterEstadoServicio}
              onChange={setFilterEstadoServicio}
              options={[
                { value: '', label: 'ESTADO SERVICIO: TODOS' },
                { value: 'disponible', label: 'DISPONIBLE' },
                { value: 'en_servicio', label: 'EN SERVICIO' },
                { value: 'falta', label: 'FALTA' },
                { value: 'maniobrista', label: 'MANIOBRISTA' },
                { value: 'permuta', label: 'PERMUTA' }
              ]}
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
                            disabled={!canEdit}
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
    </div>
  );
}
