import React, { useState, useEffect, useLayoutEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import { AuthContext } from '../../context/AuthContext';
import API_BASE from '../../config/api';
import './Operadores.css';
import InfoGeneralOperador from './InfoGeneralOperador';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import GeneracionGafete from './GeneracionGafete';
import EstadisticasOperadores from './EstadisticasOperadores';

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

// Componente de Dropdown de Estatus de Servicio para T6
function StatusDropdown({ value, onChange }) {
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
      const dropdownHeight = 160; // Altura estimada del menú (4 opciones)

      let style = {
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999
      };

      // Si no hay suficiente espacio abajo y hay más espacio arriba que abajo, desplegar hacia arriba
      if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
        style.bottom = window.innerHeight - rect.top + 4;
        style.top = 'auto';
      } else {
        style.top = rect.bottom + 4;
        style.bottom = 'auto';
      }

      setMenuStyle({ ...style });
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
    { value: 'permuta', label: 'PERMUTA', class: 'permuta' }
  ];

  // Si el T6 está marcado como maniobrista, mostrar badge de solo lectura
  if (value === 'maniobrista') {
    return (
      <div className="status-dropdown-container" ref={dropdownRef}>
        <div
          className="status-dropdown-trigger maniobrista"
          title="Este T6 está gestionado como Maniobrista"
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
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
        }}
        style={{ cursor: 'pointer' }}
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

      {isOpen && createPortal(
        <div className="status-dropdown-menu" style={menuStyle}>
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
        </div>,
        document.body
      )}
    </div>
  );
}

const EditableCell = React.memo(({ value, onChange, type = 'text', placeholder = 'Vacío' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [status, setStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = async () => {
    setIsEditing(false);
    if (localValue !== value) {
      setStatus('saving');
      try {
        let finalValue = localValue;
        if (type === 'number') {
          finalValue = Number(localValue);
          if (isNaN(finalValue) || localValue === '') {
            finalValue = 0;
          }
        }
        await onChange(finalValue);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch (e) {
        setStatus('error');
        setLocalValue(value); // Revertir visualmente
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current.blur();
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        min={type === 'number' ? '0' : undefined}
        className="kardex-input"
        style={{ width: '100%', textAlign: type === 'number' ? 'center' : 'left' }}
        value={localValue || ''}
        onChange={(e) => setLocalValue(type === 'number' ? (parseInt(e.target.value, 10) || 0) : e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      style={{
        cursor: 'pointer',
        padding: '0.4rem',
        minHeight: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: type === 'number' ? 'center' : 'flex-start',
        gap: '8px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        position: 'relative'
      }}
      className="editable-cell-display"
      title="Haz clic para editar"
    >
      <span style={{
        color: value ? 'inherit' : '#aaa',
        fontStyle: value ? 'normal' : 'italic'
      }}>
        {value === 0 ? '0' : (value || placeholder)}
      </span>
      {status === 'saving' && (
        <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
      {status === 'saved' && (
        <svg width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === 'error' && (
        <svg width="14" height="14" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && prevProps.type === nextProps.type;
});

export default function T6() {
  const { user } = useContext(AuthContext);
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstadoServicio, setFilterEstadoServicio] = useState('');
  const navigate = useNavigate();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);

  // Form states
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoTarjeton, setTipoTarjeton] = useState('');
  const [vigenciaLicencia, setVigenciaLicencia] = useState('');
  const [sexo, setSexo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ref1Nombre, setRef1Nombre] = useState('');
  const [ref1Telefono, setRef1Telefono] = useState('');
  const [ref2Nombre, setRef2Nombre] = useState('');
  const [ref2Telefono, setRef2Telefono] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [foto, setFoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const tipoOptions = [
    { value: '', label: 'Seleccionar...' },
    { value: 'B', label: 'TIPO B' },
    { value: 'C', label: 'TIPO C' }
  ];

  const sexoOptions = [
    { value: '', label: 'Seleccionar...' },
    { value: 'Masculino', label: 'MASCULINO' },
    { value: 'Femenino', label: 'FEMENINO' }
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Validación en tiempo real: solo letras, acentos, ñ y espacios
  const handleNombresChange = (e) => {
    const val = e.target.value.toUpperCase();
    const filtered = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (filtered.length <= 100) {
      setNombres(filtered);
    }
  };

  const handleApellidosChange = (e) => {
    const val = e.target.value.toUpperCase();
    const filtered = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (filtered.length <= 100) {
      setApellidos(filtered);
    }
  };

  const handlePhoneChange = (e, setter) => {
    const val = e.target.value.replace(/\D/g, ''); // Solo números
    if (val.length <= 10) {
      setter(val);
    }
  };

  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' o 'kardex' o 'info_general'
  const [savingId, setSavingId] = useState(null);

  // Modal Detalles (Amonestaciones/Reconocimientos)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsType, setDetailsType] = useState(''); // 'amonestaciones' or 'reconocimientos'
  const [detailsConductor, setDetailsConductor] = useState(null);
  const [newDetailMotivo, setNewDetailMotivo] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  const getDetailArray = (T6, type) => {
    if (!conductor) return [];
    const val = conductor[`${type}_detalle`];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const openDetailsModal = (c, type) => {
    setDetailsType(type);
    setDetailsConductor(c);
    setNewDetailMotivo('');
    setShowDetailsModal(true);
  };

  const handleAddDetail = async (e) => {
    e.preventDefault();
    if (!newDetailMotivo.trim() || savingDetail) return;

    setSavingDetail(true);
    const fieldName = `${detailsType}_detalle`;
    const existing = getDetailArray(detailsConductor, detailsType);
    const newDetail = { id: Date.now(), motivo: newDetailMotivo.trim(), fecha: new Date().toISOString() };
    const updatedDetails = [...existing, newDetail];

    try {
      const res = await fetch(`${API_BASE}/api/conductores/${detailsConductor.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          [fieldName]: updatedDetails,
          [detailsType]: updatedDetails.length
        })
      });
      if (!res.ok) throw new Error('Error al guardar detalle');

      setNewDetailMotivo('');
      fetchConductores(true); // silent fetch para no recargar visualmente el fondo

      setDetailsConductor({
        ...detailsConductor,
        [fieldName]: updatedDetails,
        [detailsType]: updatedDetails.length
      });

    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleRemoveDetail = async (detailId) => {
    if (savingDetail) return;
    setSavingDetail(true);
    const fieldName = `${detailsType}_detalle`;
    const updatedDetails = getDetailArray(detailsConductor, detailsType).filter(d => d.id !== detailId);

    try {
      const res = await fetch(`${API_BASE}/api/conductores/${detailsConductor.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          [fieldName]: updatedDetails,
          [detailsType]: updatedDetails.length
        })
      });
      if (!res.ok) throw new Error('Error al eliminar detalle');

      fetchConductores(true); // silent fetch para no parpadear toda la tabla
      setDetailsConductor({
        ...detailsConductor,
        [fieldName]: updatedDetails,
        [detailsType]: updatedDetails.length
      });
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingDetail(false);
    }
  };

  const fetchConductores = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/conductores?incluir_bajas=true`, {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      if (!res.ok) throw new Error('Error al cargar T6');
      const data = await res.json();
      setConductores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (!silent) {
        Swal.fire({
          icon: 'error',
          title: err.message === 'Sesión expirada. Por favor, inicia sesión nuevamente.' ? 'Sesión expirada' : 'Error',
          text: err.message === 'Sesión expirada. Por favor, inicia sesión nuevamente.'
            ? err.message
            : 'No se pudieron cargar los T6.',
          confirmButtonColor: '#6b1d33'
        }).then((result) => {
          if (result.isConfirmed && err.message === 'Sesión expirada. Por favor, inicia sesión nuevamente.') {
            // Limpiar tokens y redirigir al login si la sesión expiró
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            window.location.href = '/login';
          }
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const autoSaveField = async (id, field, value) => {
    const finalValue = typeof value === 'string' ? value.toUpperCase() : value;

    // Optimistic update
    setConductores(prev => prev.map(c => c.id === id ? { ...c, [field]: finalValue } : c));

    const payload = { [field]: finalValue };

    const res = await fetch(`${API_BASE}/api/conductores/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Error al guardar');
    }
  };

  // Carga inicial
  useEffect(() => {
    fetchConductores();
  }, []);

  // Polling silencioso & Bloquear scroll de fondo
  useEffect(() => {
    const isAnyModalOpen = showDetailsModal || showEditModal || showAddModal;

    // Bloquear el scroll en el body si hay modales abiertos
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Polling cada 15 segundos para no saturar ni alentar el navegador
    let interval;
    if (!isAnyModalOpen) {
      interval = setInterval(() => {
        fetchConductores(true);
      }, 15000);
    }

    return () => {
      clearInterval(interval);
      document.body.style.overflow = '';
    };
  }, [showDetailsModal, showEditModal, showAddModal]);

  const handleOpenAddModal = () => {
    setNombres('');
    setApellidos('');
    setTipoTarjeton('');
    setFoto(null);
    setVigenciaLicencia('');
    setSexo('');
    setFechaNacimiento('');
    setTelefono('');
    setRef1Nombre('');
    setRef1Telefono('');
    setRef2Nombre('');
    setRef2Telefono('');
    setFechaIngreso('');
    setFoto(null);
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const nombresLimpio = nombres.trim();
    const apellidosLimpio = apellidos.trim();
    if (!nombresLimpio || !apellidosLimpio || !tipoTarjeton.trim() || !sexo) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor ingresa nombres, apellidos, tipo de tarjetón y sexo.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if ((telefono && !phoneRegex.test(telefono)) || (ref1Telefono && !phoneRegex.test(ref1Telefono)) || (ref2Telefono && !phoneRegex.test(ref2Telefono))) {
      Swal.fire({
        icon: 'warning',
        title: 'Teléfono inválido',
        text: 'Todos los números de teléfono deben tener exactamente 10 dígitos numéricos.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nombres: nombresLimpio,
        apellidos: apellidosLimpio,
        tipo_tarjeton: tipoTarjeton.trim(),
      };
      if (vigenciaLicencia) payload.vigencia_licencia = vigenciaLicencia;
      if (sexo) payload.sexo = sexo;
      if (fechaNacimiento) payload.fecha_nacimiento = fechaNacimiento;
      if (telefono) payload.telefono = telefono;
      const ref1 = [ref1Nombre.trim(), ref1Telefono.trim()].filter(Boolean).join(' - ');
      if (ref1) payload.referencia_1 = ref1;

      const ref2 = [ref2Nombre.trim(), ref2Telefono.trim()].filter(Boolean).join(' - ');
      if (ref2) payload.referencia_2 = ref2;
      if (fechaIngreso) payload.fecha_ingreso = fechaIngreso;

      const res = await fetch(`${API_BASE}/api/conductores`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al agregar T6');

      // Subir la foto si se seleccionó una
      if (foto && data.conductor?.id) {
        if (foto.size > 5 * 1024 * 1024) {
          throw new Error('La fotografía excede el tamaño máximo permitido de 5MB. Por favor, elige una imagen más ligera.');
        }

        const formData = new FormData();
        formData.append('foto', foto);


        const photoRes = await fetch(`${API_BASE}/api/conductores/${data.conductor.id}/foto`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
          },
          body: formData
        });

        if (!photoRes.ok) {
          console.error("Error al subir foto durante la creación del T6");
        }
      }

      setShowAddModal(false);
      Swal.fire({
        icon: 'success',
        title: 'T6 Registrado',
        text: `El T6 se creó exitosamente con el Tarjetón Automático: ${data.conductor.tarjeton}`,
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
    setNombres(c.nombres || '');
    setApellidos(c.apellidos || '');
    setTipoTarjeton(c.tipo_tarjeton === 'C' ? 'C' : 'B');
    setVigenciaLicencia(c.vigencia_licencia || '');
    setSexo(c.sexo || '');
    setFechaNacimiento(c.fecha_nacimiento || '');
    setTelefono(c.telefono || '');
    const parseRef = (refStr) => {
      if (!refStr) return ['', ''];
      const parts = refStr.split(' - ');
      if (parts.length === 2) return parts;
      return [parts[0] || '', parts.slice(1).join(' - ') || ''];
    };

    const [r1n, r1t] = parseRef(c.referencia_1);
    setRef1Nombre(r1n);
    setRef1Telefono(r1t);

    const [r2n, r2t] = parseRef(c.referencia_2);
    setRef2Nombre(r2n);
    setRef2Telefono(r2t);
    setFechaIngreso(c.fecha_ingreso || '');
    setFoto(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const nombresLimpio = nombres.trim();
    const apellidosLimpio = apellidos.trim();
    if (!nombresLimpio || !apellidosLimpio || !tipoTarjeton.trim() || !sexo) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Los nombres, apellidos, tipo de tarjetón y sexo del T6 no pueden estar vacíos.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if ((telefono && !phoneRegex.test(telefono)) || (ref1Telefono && !phoneRegex.test(ref1Telefono)) || (ref2Telefono && !phoneRegex.test(ref2Telefono))) {
      Swal.fire({
        icon: 'warning',
        title: 'Teléfono inválido',
        text: 'Todos los números de teléfono deben tener exactamente 10 dígitos numéricos.',
        confirmButtonColor: '#c5a059'
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nombres: nombresLimpio,
        apellidos: apellidosLimpio,
        tipo_tarjeton: tipoTarjeton.trim(),
      };
      if (vigenciaLicencia) payload.vigencia_licencia = vigenciaLicencia;
      if (sexo) payload.sexo = sexo;
      if (fechaNacimiento) payload.fecha_nacimiento = fechaNacimiento;
      if (telefono) payload.telefono = telefono;
      const ref1 = [ref1Nombre.trim(), ref1Telefono.trim()].filter(Boolean).join(' - ');
      if (ref1) payload.referencia_1 = ref1;

      const ref2 = [ref2Nombre.trim(), ref2Telefono.trim()].filter(Boolean).join(' - ');
      if (ref2) payload.referencia_2 = ref2;
      if (fechaIngreso) payload.fecha_ingreso = fechaIngreso;

      const res = await fetch(`${API_BASE}/api/conductores/${selectedConductor.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar T6');

      // Subir la foto si se seleccionó una
      if (foto) {
        if (foto.size > 5 * 1024 * 1024) {
          throw new Error('La fotografía excede el tamaño máximo permitido de 5MB. Por favor, elige una imagen más ligera.');
        }

        const formData = new FormData();
        formData.append('foto', foto);

        const photoRes = await fetch(`${API_BASE}/api/conductores/${selectedConductor.id}/foto`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
          },
          body: formData
        });

        if (!photoRes.ok) {
          console.error("Error al subir foto");
          // Podríamos lanzar error, pero preferimos que el T6 se haya guardado
        }
      }

      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'Los datos del T6 se han actualizado correctamente.',
        confirmButtonColor: '#c5a059'
      }).then(() => {
        // fetchConductores(); // It will be fetched by the interval, or we can fetch it explicitly
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
      title: '¿Dar de baja al T6?',
      text: `El T6 ${c.nombre} (Tarjetón: ${c.tarjeton}) se marcará como BAJA en el sistema. No se eliminará de la base de datos.`,
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
        title: 'T6 en Baja',
        text: 'El T6 se ha dado de baja correctamente.',
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

  const handleStatusChange = async (T6, nuevoEstatus) => {
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

  const getTarjetonNumber = (tarjeton) => {
    if (!tarjeton) return 0;
    const match = tarjeton.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const filteredConductores = T6.filter(c => {
    if (activeTab === 'catalogo' && c.estatus === 'baja') {
      return false;
    }

    // Filtros por Tipo y Estado
    if (filterTipo && c.tipo_tarjeton !== filterTipo) return false;
    if (filterEstadoServicio && c.estado_servicio !== filterEstadoServicio) return false;

    const term = searchTerm.toLowerCase();
    if (!term) return true;

    return (
      (c.nombre && c.nombre.toLowerCase().includes(term)) ||
      (c.tarjeton && c.tarjeton.toLowerCase().includes(term)) ||
      (c.tipo_tarjeton && c.tipo_tarjeton.toLowerCase().includes(term))
    );
  }).sort((a, b) => {
    return getTarjetonNumber(a.tarjeton) - getTarjetonNumber(b.tarjeton);
  });

  const isAdmin = user?.role?.codigo === 'ADMINISTRADOR';

  return (
    <div className="operadores-layout">
      <Header title="Gestión de T6" />

      <main className="operadores-main-content">
        <div className="operadores-top-bar">
          <div className="operadores-title-section">
            <h1>Gestión de T6</h1>
            <p className="operadores-subtitle">
              Administra el alta y edición de T6. El tarjetón se genera automáticamente.
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
              Agregar T6
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
            Gestión de T6
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
            Kardex de T6
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'estadisticas' ? 'active' : ''}`}
            onClick={() => setActiveTab('estadisticas')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'estadisticas' ? '#6b1d33' : '#64748b',
              borderBottom: activeTab === 'estadisticas' ? '3px solid #6b1d33' : '3px solid transparent',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Estadísticas
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'info_general' ? 'active' : ''}`}
            onClick={() => setActiveTab('info_general')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'info_general' ? '#6b1d33' : '#64748b',
              borderBottom: activeTab === 'info_general' ? '3px solid #6b1d33' : '3px solid transparent',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Información General de T6
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'generacion_gafete' ? 'active' : ''}`}
            onClick={() => setActiveTab('generacion_gafete')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'generacion_gafete' ? '#6b1d33' : '#64748b',
              borderBottom: activeTab === 'generacion_gafete' ? '3px solid #6b1d33' : '3px solid transparent',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Generación de Gafete
          </button>
        </div>

        {activeTab === 'estadisticas' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 p-6">
            <EstadisticasOperadores conductores={conductores} />
          </div>
        )}

        {activeTab !== 'info_general' && activeTab !== 'generacion_gafete' && activeTab !== 'estadisticas' && (
          <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, tarjetón o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 text-[0.95rem] rounded-xl focus:ring-2 focus:ring-[#6b1d33]/20 focus:border-[#6b1d33] focus:bg-white transition-all outline-none placeholder:text-slate-400"
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

              {activeTab === 'catalogo' && (
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
                      { value: 'permuta', label: 'PERMUTA' }
                    ]}
                  />
                </div>
              )}

            </div>
          </div>
        )}

        {loading ? (
          <div className="operadores-loading">
            <span className="spinner"></span>
            <p>Cargando lista de T6...</p>
          </div>
        ) : activeTab === 'catalogo' ? (
          <div className="operadores-table-card">
            <div className="table-responsive">
              <table className="operadores-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}># Tarjetón</th>
                    <th>Nombre Completo</th>
                    <th style={{ width: '160px' }}>Tipo Tarjetón</th>
                    <th style={{ width: '160px' }}>Estado Servicio</th>
                    <th style={{ textAlign: 'center', width: '220px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductores.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">
                        No se encontraron T6 registrados.
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
                              title="Editar T6"
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
        ) : activeTab === 'kardex' ? (
          <div className="operadores-table-card">
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="operadores-table kardex-table" style={{ minWidth: '3300px', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Tarjetón</th>
                    <th style={{ width: '160px' }}>Tipo Tarjetón</th>
                    <th style={{ width: '280px' }}>Nombre completo</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Edad</th>
                    <th style={{ width: '130px' }}>Estatus</th>
                    <th style={{ width: '210px' }}>Última capacitación</th>
                    <th style={{ width: '210px' }}>Próxima capacitación</th>
                    <th style={{ width: '220px', textAlign: 'center' }}>Accidentes y Siniestros</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Faltas</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Retardos</th>
                    <th style={{ width: '180px', textAlign: 'center' }}>Amonestaciones</th>
                    <th style={{ width: '180px', textAlign: 'center' }}>Reconocimientos</th>
                    <th style={{ width: '280px' }}>Condicionamientos médicos</th>
                    <th style={{ minWidth: '180px' }}>Condicionamientos Jurídicos</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Permutas</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Evaluación</th>
                    <th style={{ width: '350px' }}>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductores.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="empty-table-cell">
                        No se encontraron T6 registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredConductores.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="tarjeton-badge">{c.tarjeton}</span>
                        </td>
                        <td className="text-center">
                          <span className="tipo-badge">TIPO {c.tipo_tarjeton || 'B'}</span>
                        </td>
                        <td className="conductor-nombre">{c.nombre}</td>
                        <td className="text-center" style={{ fontWeight: 600, color: '#555' }}>{c.fecha_nacimiento ? Math.floor((new Date() - new Date(c.fecha_nacimiento)) / 31557600000) : 'N/A'}</td>
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
                          <div style={{ width: '100%', minWidth: '160px' }}>
                            <AppleDatePicker
                              value={c.ultima_capacitacion || ''}
                              disableFuture={true}
                              onChange={(val) => {
                                autoSaveField(c.id, 'ultima_capacitacion', val);
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <div style={{ width: '100%', minWidth: '160px' }}>
                            <AppleDatePicker
                              value={c.proxima_capacitacion || ''}
                              disableFuture={false}
                              disablePast={true}
                              onChange={(val) => {
                                autoSaveField(c.id, 'proxima_capacitacion', val);
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn-details-badge"
                              onClick={() => openDetailsModal(c, 'accidentes_siniestros')}
                            >
                              <span className="badge-number">{c.accidentes_siniestros ?? 0}</span>
                              <span className="badge-text">Detalles</span>
                            </button>
                          </div>
                        </td>
                        <td>
                          <EditableCell
                            type="number"
                            value={c.faltas}
                            onChange={(val) => autoSaveField(c.id, 'faltas', val)}
                          />
                        </td>
                        <td>
                          <EditableCell
                            type="number"
                            value={c.retardos}
                            onChange={(val) => autoSaveField(c.id, 'retardos', val)}
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-details-badge"
                            onClick={() => openDetailsModal(c, 'amonestaciones')}
                          >
                            <span className="badge-number">{c.amonestaciones ?? 0}</span>
                            <span className="badge-text">Detalles</span>
                          </button>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-details-badge"
                            onClick={() => openDetailsModal(c, 'reconocimientos')}
                          >
                            <span className="badge-number">{c.reconocimientos ?? 0}</span>
                            <span className="badge-text">Detalles</span>
                          </button>
                        </td>
                        <td>
                          <EditableCell
                            type="text"
                            value={c.condicionamientos_medicos}
                            placeholder="Sin especificar"
                            onChange={(val) => autoSaveField(c.id, 'condicionamientos_medicos', val)}
                          />
                        </td>
                        <td>
                          <EditableCell
                            type="text"
                            value={c.condicionamientos_juridicos}
                            placeholder="Sin especificar"
                            onChange={(val) => autoSaveField(c.id, 'condicionamientos_juridicos', val)}
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn-details-badge"
                            onClick={() => openDetailsModal(c, 'permutas')}
                          >
                            <span className="badge-number">{c.permutas ?? 0}</span>
                            <span className="badge-text">Detalles</span>
                          </button>
                        </td>
                        <td>
                          <EditableCell
                            type="text"
                            value={c.evaluacion}
                            placeholder="N/A"
                            onChange={(val) => autoSaveField(c.id, 'evaluacion', val)}
                          />
                        </td>
                        <td>
                          <EditableCell
                            type="text"
                            value={c.observaciones}
                            placeholder="Añadir nota..."
                            onChange={(val) => autoSaveField(c.id, 'observaciones', val)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'info_general' ? (
          <InfoGeneralOperador conductores={conductores} />
        ) : activeTab === 'generacion_gafete' ? (
          <GeneracionGafete conductores={conductores} />
        ) : null}
      </main>

      {/* Modal Agregar T6 */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>Agregar Nuevo T6</h2>
                <p>Ingresa los datos del T6 a registrar</p>
              </div>
              <button className="close-btn" onClick={() => setShowAddModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Fotografía del T6 (Opcional)</label>
                {foto && (
                  <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <img
                      src={URL.createObjectURL(foto)}
                      alt="Vista previa"
                      style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc', margin: '0 auto' }}
                    />
                  </div>
                )}
                <label className="custom-file-upload-btn" style={{ color: '#fff', width: '100%' }}>
                  <svg width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {foto ? 'Cambiar Fotografía' : 'Seleccionar Fotografía'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFoto(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Apellidos del T6</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PÉREZ LÓPEZ"
                  value={apellidos}
                  onChange={handleApellidosChange}
                  maxLength={100}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre(s) del T6</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. JUAN ARTURO"
                  value={nombres}
                  onChange={handleNombresChange}
                  maxLength={100}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Tarjetón</label>
                <CustomSelect
                  value={tipoTarjeton}
                  onChange={setTipoTarjeton}
                  options={tipoOptions}
                />
              </div>

              <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#6A1B29', fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.3rem' }}>Datos Personales y Operativos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sexo</label>
                  <CustomSelect
                    value={sexo}
                    onChange={setSexo}
                    options={sexoOptions}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha de Nacimiento</label>
                  <AppleDatePicker value={fechaNacimiento} onChange={setFechaNacimiento} disableFuture={true} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={telefono} onChange={e => handlePhoneChange(e, setTelefono)} placeholder="Ej. 5551234567" maxLength={10} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha de Ingreso</label>
                  <AppleDatePicker value={fechaIngreso} onChange={setFechaIngreso} disableFuture={true} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vigencia Licencia</label>
                  <AppleDatePicker value={vigenciaLicencia} onChange={setVigenciaLicencia} disableFuture={false} disablePast={false} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 1 - Nombre</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref1Nombre} onChange={e => setRef1Nombre(e.target.value)} placeholder="Ej. Juan Pérez" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 1 - Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref1Telefono} onChange={e => handlePhoneChange(e, setRef1Telefono)} placeholder="Ej. 5551234567" maxLength={10} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Nombre</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Nombre} onChange={e => setRef2Nombre(e.target.value)} placeholder="Ej. María López" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Telefono} onChange={e => handlePhoneChange(e, setRef2Telefono)} placeholder="Ej. 5551234567" maxLength={10} />
                </div>
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
                  {submitting ? 'Guardando...' : 'Guardar T6'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar T6 */}
      {showEditModal && selectedConductor && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-header-title">
                <h2>Editar T6</h2>
                <p>Modifica el nombre o tipo de tarjetón asignado</p>
              </div>
              <button className="close-btn" onClick={() => setShowEditModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Fotografía del T6 (Opcional)</label>
                {(foto || selectedConductor?.foto) && (
                  <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                    <img
                      src={foto ? URL.createObjectURL(foto) : `${API_BASE}/storage/${selectedConductor.foto}`}
                      alt="Vista previa"
                      style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ccc', margin: '0 auto' }}
                    />
                  </div>
                )}
                <label className="custom-file-upload-btn" style={{ color: '#fff', width: '100%' }}>
                  <svg width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  {(foto || selectedConductor?.foto) ? 'Cambiar Fotografía' : 'Seleccionar Fotografía'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFoto(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

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
                <label className="form-label">Apellidos del T6</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PÉREZ LÓPEZ"
                  value={apellidos}
                  onChange={handleApellidosChange}
                  maxLength={100}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre(s) del T6</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. JUAN ARTURO"
                  value={nombres}
                  onChange={handleNombresChange}
                  maxLength={100}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Tarjetón</label>
                <CustomSelect
                  value={tipoTarjeton}
                  onChange={setTipoTarjeton}
                  options={tipoOptions}
                />
              </div>

              <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#6A1B29', fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.3rem' }}>Datos Personales y Operativos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sexo</label>
                  <CustomSelect
                    value={sexo}
                    onChange={setSexo}
                    options={sexoOptions}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha de Nacimiento</label>
                  <AppleDatePicker value={fechaNacimiento} onChange={setFechaNacimiento} disableFuture={true} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={telefono} onChange={e => handlePhoneChange(e, setTelefono)} placeholder="Ej. 5551234567" maxLength={10} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha de Ingreso</label>
                  <AppleDatePicker value={fechaIngreso} onChange={setFechaIngreso} disableFuture={true} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vigencia Licencia</label>
                  <AppleDatePicker value={vigenciaLicencia} onChange={setVigenciaLicencia} disableFuture={false} disablePast={false} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 1 - Nombre</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref1Nombre} onChange={e => setRef1Nombre(e.target.value)} placeholder="Ej. Juan Pérez" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 1 - Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref1Telefono} onChange={e => handlePhoneChange(e, setRef1Telefono)} placeholder="Ej. 5551234567" maxLength={10} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Nombre</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Nombre} onChange={e => setRef2Nombre(e.target.value)} placeholder="Ej. María López" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Telefono} onChange={e => handlePhoneChange(e, setRef2Telefono)} placeholder="Ej. 5551234567" maxLength={10} />
                </div>
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

      {/* Modal Detalles Amonestaciones / Reconocimientos / Permisos / Permutas */}
      {showDetailsModal && detailsConductor && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h2 style={{ textTransform: 'capitalize' }}>
                  Historial de {detailsType.replace(/_/g, ' y ')}
                </h2>
                <p>{detailsConductor.nombre}</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Lista actual */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                {getDetailArray(detailsConductor, detailsType).map((d, index) => (
                  <li key={d.id || index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#333' }}>{d.motivo}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#888' }}>
                        {d.fecha ? new Date(d.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha no disponible'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveDetail(d.id)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
                      title="Eliminar"
                    >
                      &times;
                    </button>
                  </li>
                ))}
                {getDetailArray(detailsConductor, detailsType).length === 0 && (
                  <li style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontStyle: 'italic' }}>No hay registros.</li>
                )}
              </ul>

              <form onSubmit={handleAddDetail}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Nuevo Motivo</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={newDetailMotivo} onChange={(e) => setNewDetailMotivo(e.target.value.toUpperCase())} placeholder="Ej. Motivo del registro..." required />
                </div>
                <button type="submit" className="btn-save" style={{ width: '100%', padding: '0.75rem', opacity: savingDetail ? 0.7 : 1, cursor: savingDetail ? 'wait' : 'pointer' }} disabled={savingDetail}>
                  {savingDetail ? 'Guardando registro...' : 'Agregar Registro'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
