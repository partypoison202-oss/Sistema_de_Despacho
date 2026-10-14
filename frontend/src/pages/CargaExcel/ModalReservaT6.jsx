import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';

// URL de la API
import API_BASE from '../../config/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export default function ModalReservaT6({ isOpen, onClose, catalogConductores, tabActiva, isPasteles = false }) {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [autorizadosList, setAutorizadosList] = useState(new Set());
  const [estadosLocales, setEstadosLocales] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtroVista, setFiltroVista] = useState('TODOS'); // 'TODOS' | 'DISPONIBLES' | 'SELECCIONADOS'

  useEffect(() => {
    if (isOpen) {
      cargarAutorizados();
      try {
        queryClient.invalidateQueries({ queryKey: ['capturista-catalogos'] });
      } catch (e) {
        console.error(e);
      }
    } else {
      setBusqueda('');
      setSeleccionados(new Set());
      setFiltroVista('TODOS');
      setEstadosLocales({});
    }
  }, [isOpen, tabActiva]);

  const cargarAutorizados = async () => {
    try {
      setCargando(true);
      const res = await fetch(`${API_BASE}/api/reservas/autorizadas?fecha=${tabActiva}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const tarjetonesNormalizados = (Array.isArray(data) ? data : [])
          .map(t => String(t || '').trim().padStart(4, '0'))
          .filter(t => t !== '0000' && t !== '');
          
        const setAutorizados = new Set(tarjetonesNormalizados);
        setAutorizadosList(setAutorizados);
        
        if (isPasteles) {
          setSeleccionados(new Set());
          setFiltroVista('TODOS');
        } else {
          setSeleccionados(setAutorizados);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  // Helper para verificar si un tarjetón está seleccionado
  const isTarjetonSelected = (tarjeton) => {
    const raw = String(tarjeton || '').trim();
    if (!raw) return false;
    const pad = raw.padStart(4, '0');
    const clean = raw.replace(/^0+/, '');
    return seleccionados.has(raw) || seleccionados.has(pad) || (clean !== '' && seleccionados.has(clean));
  };

  // Helper para obtener el estado actual del operador (incluyendo cambios locales inmediatos)
  const getEstadoOperador = (c) => {
    const tarjPad = String(c?.tarjeton || '').trim().padStart(4, '0');
    if (estadosLocales[tarjPad]) return estadosLocales[tarjPad];
    const tarjRaw = String(c?.tarjeton || '').trim();
    if (estadosLocales[tarjRaw]) return estadosLocales[tarjRaw];
    return String(c?.estado_servicio || 'disponible').toLowerCase();
  };

  // 1. Catálogo completo de operadores activos (no bajas ni inhabilitados)
  const todosOperadores = useMemo(() => {
    return (catalogConductores || [])
      .filter(c => {
        const est = String(c.estatus || 'activo').toLowerCase();
        if (est !== 'activo') return false;
        
        if (isPasteles) {
          const raw = String(c.tarjeton || '').trim();
          const pad = raw.padStart(4, '0');
          const clean = raw.replace(/^0+/, '');
          const isAuth = autorizadosList.has(raw) || autorizadosList.has(pad) || (clean !== '' && autorizadosList.has(clean));
          const estado = getEstadoOperador(c);
          return isAuth || estado === 'falta' || c.estado_servicio === 'falta';
        }
        
        return true;
      })
      .sort((a, b) => {
        const nomA = String(a.nombre || `${a.nombres || ''} ${a.apellidos || ''}`).trim();
        const nomB = String(b.nombre || `${b.nombres || ''} ${b.apellidos || ''}`).trim();
        return nomA.localeCompare(nomB);
      });
  }, [catalogConductores, isPasteles, autorizadosList, estadosLocales]);

  // Contadores para los botones de filtro rápido
  const countDisponibles = useMemo(() => {
    return todosOperadores.filter(c => getEstadoOperador(c) === 'disponible').length;
  }, [todosOperadores, estadosLocales]);

  const countSeleccionados = useMemo(() => {
    return todosOperadores.filter(c => isTarjetonSelected(c.tarjeton)).length;
  }, [todosOperadores, seleccionados]);

  // 2. Filtrado por vista ('TODOS', 'DISPONIBLES', 'SELECCIONADOS')
  const operadoresPorVista = useMemo(() => {
    return todosOperadores.filter(c => {
      const estado = getEstadoOperador(c);
      if (filtroVista === 'DISPONIBLES') {
        return estado === 'disponible';
      }
      if (filtroVista === 'SELECCIONADOS') {
        return isTarjetonSelected(c.tarjeton);
      }
      return true;
    });
  }, [todosOperadores, filtroVista, seleccionados, estadosLocales]);

  // 3. Filtrado por término de búsqueda (Nombre o Tarjetón)
  const filtrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return operadoresPorVista;

    return operadoresPorVista.filter(c => {
      const nombre = String(c.nombre || `${c.nombres || ''} ${c.apellidos || ''}`).toLowerCase();
      const tarjeton = String(c.tarjeton || '').toLowerCase();
      return nombre.includes(term) || tarjeton.includes(term);
    }).sort((a, b) => {
      const s = term;
      const tA = String(a.tarjeton || '').toLowerCase();
      const tB = String(b.tarjeton || '').toLowerCase();
      const paddedS = s.padStart(4, '0');
      const padA = tA.padStart(4, '0');
      const padB = tB.padStart(4, '0');

      // Coincidencia exacta de tarjetón primero
      if (padA === paddedS && padB !== paddedS) return -1;
      if (padB === paddedS && padA !== paddedS) return 1;
      if (tA === s && tB !== s) return -1;
      if (tB === s && tA !== s) return 1;

      // Empieza con tarjetón
      if (tA.startsWith(s) && !tB.startsWith(s)) return -1;
      if (tB.startsWith(s) && !tA.startsWith(s)) return 1;

      return 0;
    });
  }, [operadoresPorVista, busqueda]);

  const toggleSeleccion = (tarjeton) => {
    const raw = String(tarjeton || '').trim();
    if (!raw) return;
    const pad = raw.padStart(4, '0');
    const clean = raw.replace(/^0+/, '');
    const nuevos = new Set(seleccionados);

    if (isTarjetonSelected(raw)) {
      nuevos.delete(raw);
      nuevos.delete(pad);
      if (clean) nuevos.delete(clean);
    } else {
      nuevos.add(pad);
    }
    setSeleccionados(nuevos);
  };

  const toggleTodos = () => {
    if (filtrados.length === 0) return;
    const todosSeleccionados = filtrados.every(c => isTarjetonSelected(c.tarjeton));
    const nuevos = new Set(seleccionados);

    if (todosSeleccionados) {
      filtrados.forEach(c => {
        const raw = String(c.tarjeton || '').trim();
        const pad = raw.padStart(4, '0');
        const clean = raw.replace(/^0+/, '');
        nuevos.delete(raw);
        nuevos.delete(pad);
        if (clean) nuevos.delete(clean);
      });
    } else {
      filtrados.forEach(c => {
        const pad = String(c.tarjeton || '').trim().padStart(4, '0');
        if (pad !== '0000') nuevos.add(pad);
      });
    }
    setSeleccionados(nuevos);
  };

  const limpiarSeleccion = () => {
    setSeleccionados(new Set());
  };

  const marcarInasistencias = async () => {
    try {
      if (seleccionados.size === 0) return;
      
      const confirm = await Swal.fire({
        title: '¿Mandar a Falta?',
        html: `¿Estás seguro de registrar inasistencia a los <b>${seleccionados.size}</b> operador(es) seleccionado(s)?<br/><br/>Esta acción afectará inmediatamente su kardex en Control de Personas Conductoras y su estado cambiará a FALTA.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, mandar a falta',
        cancelButtonText: 'Cancelar'
      });
      
      if (!confirm.isConfirmed) return;

      setGuardando(true);
      
      // Determinar la fecha real para la falta en formato local YYYY-MM-DD
      const today = new Date();
      if (tabActiva === 'MANANA') today.setDate(today.getDate() + 1);
      else if (tabActiva === 'SABADO') {
        const diff = (6 - today.getDay() + 7) % 7;
        today.setDate(today.getDate() + (diff === 0 ? 7 : diff));
      } else if (tabActiva === 'DOMINGO') {
        const diff = (7 - today.getDay() + 7) % 7;
        today.setDate(today.getDate() + (diff === 0 ? 7 : diff));
      } else if (tabActiva === 'LUNES') {
        const diff = (1 - today.getDay() + 7) % 7;
        today.setDate(today.getDate() + (diff === 0 ? 7 : diff));
      } else if (tabActiva === 'FESTIVO') today.setDate(today.getDate() + 1);
      
      const ano = today.getFullYear();
      const mes = String(today.getMonth() + 1).padStart(2, '0');
      const dia = String(today.getDate()).padStart(2, '0');
      const fechaFalta = `${ano}-${mes}-${dia}`;

      const conductoresAMarcar = todosOperadores.filter(c => isTarjetonSelected(c.tarjeton));

      let successCount = 0;
      let ultimoError = null;
      const nuevosEstados = { ...estadosLocales };
      const nuevosAutorizados = new Set(autorizadosList);

      for (const c of conductoresAMarcar) {
        try {
          const conductorId = c.id || c.tarjeton;
          const res = await fetch(`${API_BASE}/api/conductores/${conductorId}/agregar-falta`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              fecha: fechaFalta,
              fecha_falta: fechaFalta,
              motivo: 'Inasistencia a reserva T6 (Mesa de Control)',
              motivo_falta: 'Inasistencia a reserva T6 (Mesa de Control)',
              estado_servicio: 'falta'
            })
          });

          if (res.ok) {
            successCount++;
            c.estado_servicio = 'falta';
            c.faltas = (c.faltas || 0) + 1;
            const padT = String(c.tarjeton || '').trim().padStart(4, '0');
            const rawT = String(c.tarjeton || '').trim();
            const cleanT = rawT.replace(/^0+/, '');

            nuevosEstados[padT] = 'falta';
            nuevosEstados[rawT] = 'falta';
            if (cleanT) nuevosEstados[cleanT] = 'falta';

            nuevosAutorizados.delete(padT);
            nuevosAutorizados.delete(rawT);
            if (cleanT) nuevosAutorizados.delete(cleanT);
          } else {
            const errData = await res.json().catch(() => ({}));
            ultimoError = errData.message || 'Error del servidor al registrar falta';
          }
        } catch (fetchErr) {
          console.error('Error al registrar falta de operador:', fetchErr);
        }
      }

      setEstadosLocales(nuevosEstados);
      setAutorizadosList(nuevosAutorizados);

      if (successCount > 0) {
        setSeleccionados(new Set());
        try {
          queryClient.invalidateQueries({ queryKey: ['capturista-catalogos'] });
          queryClient.invalidateQueries({ queryKey: ['conductores-list'] });
          queryClient.invalidateQueries({ queryKey: ['reservas-autorizadas'] });
          queryClient.invalidateQueries({ queryKey: ['despacho-datos'] });
          queryClient.invalidateQueries({ queryKey: ['monitoreo-conductores-dia'] });
          queryClient.invalidateQueries({ queryKey: ['unidades-list-mesacontrol'] });
          queryClient.invalidateQueries({ queryKey: ['conductores'] });
        } catch (queryErr) {
          console.error(queryErr);
        }

        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('unidades_estatus_channel');
            bc.postMessage({ tipo: 'CAMBIO_ESTATUS', action: 'estatus_updated' });
            bc.close();
          } catch (e) {
            console.error(e);
          }
        }

        Swal.fire({
          icon: 'success',
          title: 'Faltas Registradas',
          text: `Se registraron ${successCount} inasistencia(s) en el kardex y su estatus cambió a FALTA.`,
          timer: 2500,
          showConfirmButton: false
        });
        onClose();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al registrar faltas',
          text: ultimoError || 'No se pudieron registrar las inasistencias en el servidor.',
          confirmButtonColor: '#dc2626'
        });
      }
    } catch (e) {
      Swal.fire('Error', 'Hubo un error al registrar las inasistencias.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const guardarAutorizados = async () => {
    try {
      setGuardando(true);
      const arr = Array.from(seleccionados)
        .map(t => String(t).trim().padStart(4, '0'))
        .filter(t => t !== '0000' && t !== '');

      const uniqueArr = Array.from(new Set(arr));

      const res = await fetch(`${API_BASE}/api/reservas/autorizadas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fecha: tabActiva,
          tarjetones: uniqueArr
        })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reservas Autorizadas',
          text: `Se han autorizado ${uniqueArr.length} operador(es) para reserva en Mesa de Control.`,
          timer: 2500,
          showConfirmButton: false
        });
        onClose();
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      Swal.fire('Error', 'Hubo un problema al autorizar las reservas.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Obtener texto del día basado en tabActiva
  const getDiaTexto = () => {
    const tabs = {
      'HOY': 'Día Operativo (Actual)',
      'MANANA': 'Día Siguiente',
      'FESTIVO': 'Días Festivos'
    };
    return tabs[tabActiva] || 'el día seleccionado';
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: 'white', padding: '1.75rem', borderRadius: '12px',
        width: '720px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '1px solid #fef3c7'
            }}>
              <svg width="20" height="20" fill="none" stroke="#b45309" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 style={{ color: '#6b1d33', margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>
              Guardar Reservas T6
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              border: 'none', background: 'transparent', color: '#94a3b8',
              fontSize: '1.5rem', cursor: 'pointer', lineHeight: '1', padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: 0, marginBottom: '1rem', lineHeight: '1.4' }}>
          Selecciona a los operadores (T6) que estarán autorizados en la sección de Reservas T6 de la Mesa de Control para <strong>{getDiaTexto()}</strong>.
        </p>

        {/* Buscador */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </span>
            <input 
              type="text" 
              autoFocus
              placeholder="Buscar por Nombre o Tarjetón..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '6px',
                border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)', boxSizing: 'border-box'
              }}
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Filtro Rápido */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isPasteles && (
              <>
                <button
                  type="button"
                  onClick={() => setFiltroVista('TODOS')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                    border: filtroVista === 'TODOS' ? '1px solid #6b1d33' : '1px solid #e2e8f0',
                    backgroundColor: filtroVista === 'TODOS' ? '#6b1d33' : '#f8fafc',
                    color: filtroVista === 'TODOS' ? 'white' : '#475569',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  Todos ({todosOperadores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroVista('DISPONIBLES')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                    border: filtroVista === 'DISPONIBLES' ? '1px solid #059669' : '1px solid #e2e8f0',
                    backgroundColor: filtroVista === 'DISPONIBLES' ? '#059669' : '#f8fafc',
                    color: filtroVista === 'DISPONIBLES' ? 'white' : '#475569',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  Solo Disponibles ({countDisponibles})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroVista('SELECCIONADOS')}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
                    border: filtroVista === 'SELECCIONADOS' ? '1px solid #d97706' : '1px solid #e2e8f0',
                    backgroundColor: filtroVista === 'SELECCIONADOS' ? '#d97706' : '#f8fafc',
                    color: filtroVista === 'SELECCIONADOS' ? 'white' : '#475569',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  Seleccionados ({countSeleccionados})
                </button>
              </>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Mostrando <strong>{filtrados.length}</strong> operador(es)
          </div>
        </div>
        
        {/* Lista de Operadores */}
        <div style={{ 
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '320px'
        }}>
          {/* Encabezado de la tabla */}
          <div style={{ 
            display: 'flex', padding: '0.65rem 1rem', background: '#f1f5f9', 
            borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '0.8rem', color: '#475569', alignItems: 'center'
          }}>
            <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={filtrados.length > 0 && filtrados.every(c => isTarjetonSelected(c.tarjeton))}
                onChange={toggleTodos}
                style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#6b1d33' }}
                title="Seleccionar / deseleccionar todos los visibles"
              />
            </div>
            <div style={{ flex: 3 }}>OPERADOR / NOMBRE</div>
            <div style={{ width: '90px', textAlign: 'center' }}>TIPO</div>
            <div style={{ width: '120px', textAlign: 'center' }}>ESTADO ACTUAL</div>
            <div style={{ width: '80px', textAlign: 'right' }}>TARJETÓN</div>
          </div>
          
          <ul style={{ overflowY: 'auto', listStyle: 'none', margin: 0, padding: 0, flex: 1 }}>
            {cargando ? (
              <li style={{ padding: '3rem', color: '#94a3b8', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#6b1d33', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Cargando catálogo de operadores...</div>
              </li>
            ) : filtrados.length === 0 ? (
              <li style={{ padding: '3rem 1rem', color: '#94a3b8', textAlign: 'center', fontSize: '0.95rem' }}>
                No se encontraron operadores con los criterios seleccionados.
              </li>
            ) : (
              filtrados.map((c, idx) => {
                const isSelected = isTarjetonSelected(c.tarjeton);
                const nombreOperador = String(c.nombre || `${c.nombres || ''} ${c.apellidos || ''}`).trim() || 'SIN NOMBRE';
                const estado = getEstadoOperador(c);
                const tipoTarj = String(c.tipo_tarjeton || '').toUpperCase();

                // Colores para el badge de estado
                let estadoBg = '#f1f5f9';
                let estadoColor = '#475569';
                let estadoText = 'DISPONIBLE';

                if (estado === 'disponible') {
                  estadoBg = '#ecfdf5';
                  estadoColor = '#065f46';
                  estadoText = 'DISPONIBLE';
                } else if (estado === 'en_servicio') {
                  estadoBg = '#eff6ff';
                  estadoColor = '#1e40af';
                  estadoText = 'EN SERVICIO';
                } else if (estado === 'maniobrista') {
                  estadoBg = '#faf5ff';
                  estadoColor = '#6b21a8';
                  estadoText = 'MANIOBRISTA';
                } else if (estado === 'falta') {
                  estadoBg = '#fef2f2';
                  estadoColor = '#991b1b';
                  estadoText = 'FALTA';
                } else if (estado) {
                  estadoBg = '#fff7ed';
                  estadoColor = '#9a3412';
                  estadoText = estado.toUpperCase();
                }

                return (
                  <li 
                    key={c.id || c.tarjeton || idx} 
                    onClick={() => toggleSeleccion(c.tarjeton)}
                    style={{
                      padding: '0.65rem 1rem', fontSize: '0.88rem', color: '#1e293b',
                      background: isSelected ? '#fefce8' : (idx % 2 === 0 ? 'white' : '#f8fafc'),
                      borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center',
                      cursor: 'pointer', transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // Manejado por li onClick
                        style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#6b1d33' }}
                      />
                    </div>
                    
                    {/* Nombre */}
                    <div style={{ 
                      flex: 3, fontWeight: isSelected ? '700' : '500', 
                      color: isSelected ? '#854d0e' : '#1e293b',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                      <span>{nombreOperador}</span>
                    </div>

                    {/* Tipo de tarjetón */}
                    <div style={{ width: '90px', textAlign: 'center' }}>
                      {tipoTarj ? (
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 6px',
                          borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569',
                          border: '1px solid #e2e8f0'
                        }}>
                          {tipoTarj.startsWith('TIPO') ? tipoTarj : `T-${tipoTarj}`}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                      )}
                    </div>

                    {/* Estado actual */}
                    <div style={{ width: '120px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px',
                        borderRadius: '9999px', backgroundColor: estadoBg, color: estadoColor,
                        display: 'inline-block'
                      }}>
                        {estadoText}
                      </span>
                    </div>

                    {/* Tarjetón */}
                    <div style={{ 
                      width: '80px', textAlign: 'right', fontWeight: 'bold', 
                      color: isSelected ? '#854d0e' : '#334155', fontFamily: 'monospace', fontSize: '0.95rem'
                    }}>
                      {String(c.tarjeton || '').padStart(4, '0')}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        
        {/* Footer */}
        <div style={{ 
          marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: '#334155', fontSize: '0.92rem' }}>
              <strong>{countSeleccionados}</strong> {isPasteles ? 'operador(es) seleccionado(s) para falta' : 'operador(es) autorizado(s) en reserva'}
            </div>
            {countSeleccionados > 0 && (
              <button
                type="button"
                onClick={limpiarSeleccion}
                style={{
                  border: 'none', background: 'transparent', color: '#dc2626',
                  fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0
                }}
              >
                Limpiar selección
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1',
                background: 'white', color: '#475569', borderRadius: '6px',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
              }}
            >
              Cancelar
            </button>
            {isPasteles && (
              <button 
                type="button"
                onClick={marcarInasistencias}
                disabled={guardando || cargando || seleccionados.size === 0}
                title="Mandar a falta en el Kardex a los seleccionados"
                style={{
                  padding: '0.65rem 1.25rem', border: 'none',
                  background: '#dc2626', color: 'white', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  opacity: (guardando || cargando || seleccionados.size === 0) ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mandar a Falta
              </button>
            )}
            {!isPasteles && (
              <button 
                type="button"
                onClick={guardarAutorizados}
                disabled={guardando || cargando}
                style={{
                  padding: '0.65rem 1.5rem', border: 'none',
                  background: '#6b1d33', color: 'white', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  opacity: (guardando || cargando) ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(107, 29, 51, 0.25)'
                }}
              >
                {guardando ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {guardando ? 'Guardando...' : 'Guardar Reservas'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
