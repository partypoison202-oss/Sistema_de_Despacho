import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import { AuthContext } from '../../context/AuthContext';
import API_BASE from '../../config/api';
import './Operadores.css';
import InfoGeneralOperador from './InfoGeneralOperador';
import AppleDatePicker from '../Mantenimiento/components/AppleDatePicker';
import GeneracionGafete from './GeneracionGafete';

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
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstadoServicio, setFilterEstadoServicio] = useState('');
  const navigate = useNavigate();
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [tipoTarjeton, setTipoTarjeton] = useState('B');
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
    { value: 'B', label: 'TIPO B' },
    { value: 'C', label: 'TIPO C' }
  ];

  const sexoOptions = [
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

  // Validación en tiempo real para el nombre del operador: solo letras, acentos, ñ y espacios
  const handleNombreChange = (e) => {
    const val = e.target.value.toUpperCase();
    const filtered = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (filtered.length <= 100) {
      setNombre(filtered);
    }
  };

  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' o 'kardex' o 'info_general'
  const [savingId, setSavingId] = useState(null);
  const [modifiedIds, setModifiedIds] = useState(new Set());

  // Modal Detalles (Amonestaciones/Reconocimientos)
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsType, setDetailsType] = useState(''); // 'amonestaciones' or 'reconocimientos'
  const [detailsConductor, setDetailsConductor] = useState(null);
  const [newDetailMotivo, setNewDetailMotivo] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  const openDetailsModal = (c, type) => {
    setDetailsConductor(c);
    setDetailsType(type);
    setNewDetailMotivo('');
    setShowDetailsModal(true);
  };

  const handleAddDetail = async (e) => {
    e.preventDefault();
    if (!newDetailMotivo.trim() || savingDetail) return;
    
    setSavingDetail(true);
    const fieldName = `${detailsType}_detalle`;
    const existing = detailsConductor[fieldName] || [];
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
      const updatedDetails = (detailsConductor[fieldName] || []).filter(d => d.id !== detailId);
      
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
      if (!res.ok) throw new Error('Error al cargar operadores');
      const data = await res.json();
      setConductores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (!silent) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los operadores.',
          confirmButtonColor: '#6b1d33'
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLocalFieldChange = (id, field, value) => {
    const finalValue = typeof value === 'string' ? value.toUpperCase() : value;
    setConductores(prev => prev.map(c => c.id === id ? { ...c, [field]: finalValue } : c));
    setModifiedIds(prev => new Set(prev).add(id));
  };

  const handleSaveAllKardex = async () => {
    if (modifiedIds.size === 0) return;
    setSavingId('all');
    try {
      const promises = Array.from(modifiedIds).map(id => {
        const c = conductores.find(cond => cond.id === id);
        return fetch(`${API_BASE}/api/conductores/${c.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            accidentes_siniestros: c.accidentes_siniestros,
            faltas: c.faltas,
            retardos: c.retardos,
            condicionamientos_medicos: c.condicionamientos_medicos,
            condicionamientos_juridicos: c.condicionamientos_juridicos,
            evaluacion: c.evaluacion,
            observaciones: c.observaciones
          })
        });
      });

      const results = await Promise.all(promises);
      
      const failed = results.filter(res => !res.ok);
      if (failed.length > 0) throw new Error('Algunos cambios no se pudieron guardar.');

      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'Los cambios del Kardex se han guardado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
      setModifiedIds(new Set());
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

  useEffect(() => {
    fetchConductores();
    
    // Polling rápido cada 2 segundos solo si no hay cambios sin guardar y no hay modal abierto
    let interval;
    if (modifiedIds.size === 0 && !showDetailsModal && !showEditModal && !showAddModal) {
      interval = setInterval(() => {
        fetchConductores(true);
      }, 2000);
    }
    
    return () => clearInterval(interval);
  }, [modifiedIds.size, showDetailsModal, showEditModal, showAddModal]);

  const handleOpenAddModal = () => {
    setNombre('');
    setTipoTarjeton('B');
    setVigenciaLicencia('');
    setSexo('');
    setFechaNacimiento('');
    setTelefono('');
    setRef1Nombre('');
    setRef1Telefono('');
    setRef2Nombre('');
    setRef2Telefono('');
    setFechaIngreso('');
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
      const payload = {
        nombre: nombreLimpio,
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
    setNombre(c.nombre || '');
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
      const payload = {
        nombre: nombreLimpio,
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
      if (!res.ok) throw new Error(data.message || 'Error al actualizar operador');

      // Subir la foto si se seleccionó una
      if (foto) {
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
           // Podríamos lanzar error, pero preferimos que el conductor se haya guardado
        }
      }

      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'Los datos del operador se han actualizado correctamente.',
        confirmButtonColor: '#c5a059'
      }).then(() => {
        // Redirigir al módulo de checklist como solicitó el usuario
        navigate('/checklist/menu');
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

  const getTarjetonNumber = (tarjeton) => {
    if (!tarjeton) return 0;
    const match = tarjeton.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const filteredConductores = conductores.filter(c => {
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
            Información General de Operador
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

        {activeTab !== 'info_general' && (
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
                      { value: 'falta', label: 'FALTA' }
                    ]}
                  />
                </div>
              )}

              {activeTab === 'kardex' && (
                <div className="flex w-full md:w-auto items-center gap-3">
                  <button
                    onClick={handleSaveAllKardex}
                    disabled={modifiedIds.size === 0 || savingId === 'all'}
                    className={`px-6 py-2.5 rounded-xl text-[0.95rem] font-bold text-white transition-all shadow-sm flex items-center justify-center min-w-[200px] ${modifiedIds.size === 0 ? 'bg-slate-300 cursor-not-allowed opacity-70' : savingId === 'all' ? 'bg-slate-400 cursor-wait' : 'bg-[#6b1d33] hover:bg-[#8d2745] hover:-translate-y-0.5 active:translate-y-0 shadow-md'}`}
                  >
                    {savingId === 'all' ? 'Guardando...' : `Guardar Cambios (${modifiedIds.size})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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
        ) : activeTab === 'kardex' ? (
          <div className="operadores-table-card">
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="operadores-table kardex-table" style={{ minWidth: '3300px', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Tarjetón</th>
                    <th style={{ width: '140px' }}>Tipo Tarjetón</th>
                    <th style={{ width: '280px' }}>Nombre completo</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Edad</th>
                    <th style={{ width: '130px' }}>Estatus</th>
                    <th style={{ width: '210px' }}>Última capacitación</th>
                    <th style={{ width: '210px' }}>Próxima capacitación</th>
                    <th style={{ width: '220px', textAlign: 'center' }}>Accidentes / Siniestros</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Faltas</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Retardos</th>
                    <th style={{ width: '180px', textAlign: 'center' }}>Amonestaciones</th>
                    <th style={{ width: '180px', textAlign: 'center' }}>Reconocimientos</th>
                    <th style={{ width: '280px' }}>Condicionamientos médicos</th>
                    <th style={{ minWidth: '180px' }}>Condicionamientos Jurídicos</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Cambios</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Permisos</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Evaluación</th>
                    <th style={{ width: '350px' }}>Observaciones</th>
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
                        <td className="text-center">
                          <span className="tipo-badge">TIPO {c.tipo_tarjeton || 'B'}</span>
                        </td>
                        <td className="conductor-nombre">{c.nombre}</td>
                        <td className="text-center" style={{fontWeight: 600, color: '#555'}}>{c.fecha_nacimiento ? Math.floor((new Date() - new Date(c.fecha_nacimiento)) / 31557600000) : 'N/A'}</td>
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
                                handleLocalFieldChange(c.id, 'ultima_capacitacion', val);
                                handleBlurSave({ ...c, ultima_capacitacion: val }, 'ultima_capacitacion');
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
                                handleLocalFieldChange(c.id, 'proxima_capacitacion', val);
                                handleBlurSave({ ...c, proxima_capacitacion: val }, 'proxima_capacitacion');
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.accidentes_siniestros ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'accidentes_siniestros', parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.faltas ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'faltas', parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="kardex-input text-center"
                            value={c.retardos ?? 0}
                            onChange={(e) => handleLocalFieldChange(c.id, 'retardos', parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                        <td className="text-center">
                          <button 
                            type="button" 
                            onClick={() => openDetailsModal(c, 'amonestaciones')}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '0.3rem', border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            {c.amonestaciones ?? 0} Detalles
                          </button>
                        </td>
                        <td className="text-center">
                          <button 
                            type="button" 
                            onClick={() => openDetailsModal(c, 'reconocimientos')}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '0.3rem', border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            {c.reconocimientos ?? 0} Detalles
                          </button>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input"
                            value={c.condicionamientos_medicos || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'condicionamientos_medicos', e.target.value)}
                            placeholder="Sin especificar"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input"
                            value={c.condicionamientos_juridicos || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'condicionamientos_juridicos', e.target.value)}
                            placeholder="Sin especificar"
                          />
                        </td>
                        <td className="text-center">
                          <button 
                            type="button" 
                            onClick={() => openDetailsModal(c, 'permutas')}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '0.3rem', border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            {c.permutas ?? 0} Detalles
                          </button>
                        </td>
                        <td className="text-center">
                          <button 
                            type="button" 
                            onClick={() => openDetailsModal(c, 'permisos')}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '0.3rem', border: '1px solid #ddd', background: '#f9f9f9', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            {c.permisos ?? 0} Detalles
                          </button>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input text-center"
                            value={c.evaluacion || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'evaluacion', e.target.value)}
                            placeholder="N/A"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="kardex-input"
                            value={c.observaciones || ''}
                            onChange={(e) => handleLocalFieldChange(c.id, 'observaciones', e.target.value)}
                            placeholder="Añadir nota..."
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

              <h3 style={{marginTop: '1rem', marginBottom: '0.5rem', color: '#6A1B29', fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.3rem'}}>Datos Personales y Operativos</h3>
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
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. 555-123-4567" />
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
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref1Telefono} onChange={e => setRef1Telefono(e.target.value)} placeholder="Ej. 555-123-4567" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Nombre</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Nombre} onChange={e => setRef2Nombre(e.target.value)} placeholder="Ej. María López" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Telefono} onChange={e => setRef2Telefono(e.target.value)} placeholder="Ej. 555-123-4567" />
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

              <div className="form-group">
                <label className="form-label">Fotografía del Operador (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFoto(e.target.files[0])}
                  className="modal-input"
                  style={{ width: '100%', padding: '0.6rem' }}
                />
              </div>

              <h3 style={{marginTop: '1rem', marginBottom: '0.5rem', color: '#6A1B29', fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.3rem'}}>Datos Personales y Operativos</h3>
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
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. 555-123-4567" />
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
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref1Telefono} onChange={e => setRef1Telefono(e.target.value)} placeholder="Ej. 555-123-4567" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Nombre</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Nombre} onChange={e => setRef2Nombre(e.target.value)} placeholder="Ej. María López" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ref. 2 - Teléfono</label>
                  <input type="text" className="modal-input" style={{ width: '100%', padding: '0.6rem' }} value={ref2Telefono} onChange={e => setRef2Telefono(e.target.value)} placeholder="Ej. 555-123-4567" />
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
          <div className="modal-content" style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h2 style={{textTransform: 'capitalize'}}>
                  Historial de {detailsType}
                </h2>
                <p>{detailsConductor.nombre}</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)} aria-label="Cerrar">&times;</button>
            </div>
            <div style={{padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto'}}>
              {/* Lista actual */}
              <ul style={{listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0'}}>
                {(detailsConductor[`${detailsType}_detalle`] || []).map((d, index) => (
                  <li key={d.id || index} style={{display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '0.5rem'}}>
                    <div>
                      <strong style={{ display: 'block', color: '#333' }}>{d.motivo}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#888' }}>
                        {new Date(d.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
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
                {(!detailsConductor[`${detailsType}_detalle`] || detailsConductor[`${detailsType}_detalle`].length === 0) && (
                  <li style={{textAlign: 'center', color: '#94a3b8', padding: '1rem', fontStyle: 'italic'}}>No hay registros.</li>
                )}
              </ul>
              
              <form onSubmit={handleAddDetail}>
                <div className="form-group" style={{marginBottom: '1rem'}}>
                  <label className="form-label">Nuevo Motivo</label>
                  <input type="text" className="modal-input" style={{width: '100%', padding: '0.6rem'}} value={newDetailMotivo} onChange={(e) => setNewDetailMotivo(e.target.value.toUpperCase())} placeholder="Ej. Motivo del registro..." required />
                </div>
                <button type="submit" className="btn-save" style={{width: '100%', padding: '0.75rem', opacity: savingDetail ? 0.7 : 1, cursor: savingDetail ? 'wait' : 'pointer'}} disabled={savingDetail}>
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
