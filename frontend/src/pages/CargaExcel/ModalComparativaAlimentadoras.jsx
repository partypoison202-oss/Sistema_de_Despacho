import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import API_BASE from '../../config/api';
import './CargaExcel.css'; // Mismos estilos base

const fetchHistorialAlimentadoras = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/historial-operativo/alimentadoras-ayer`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Error al obtener el historial de alimentadoras');
  }
  return response.json();
};

const ModalComparativaAlimentadoras = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [rutaExpandida, setRutaExpandida] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['historialAlimentadorasAyer'],
    queryFn: fetchHistorialAlimentadoras,
    enabled: isOpen,
    fetchPolicy: 'network-only' // Forzar refetch
  });

  const historial = data?.rutas || {};
  const fechaAyer = data?.fecha || '';

  // Filtrado optimizado por económico, conductor o tarjetón
  const rutasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return historial;
    
    const lowerSearch = searchTerm.toLowerCase();
    const result = {};

    Object.entries(historial).forEach(([ruta, unidades]) => {
      const matchRuta = ruta.toLowerCase().includes(lowerSearch);
      
      const unidadesFiltradas = unidades.filter(u => 
        (u.economico && String(u.economico).toLowerCase().includes(lowerSearch))
      );

      if (matchRuta || unidadesFiltradas.length > 0) {
        result[ruta] = matchRuta ? unidades : unidadesFiltradas;
      }
    });

    return result;
  }, [historial, searchTerm]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(5px)',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      <div style={{
        background: '#ffffff', padding: '2.5rem', borderRadius: '16px',
        width: '950px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', position: 'relative'
      }}>
        <button 
          onClick={onClose} 
          aria-label="Cerrar modal"
          style={{
            position: 'absolute', top: '20px', right: '20px', background: '#f3f4f6',
            border: 'none', width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', color: '#6b7280', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
        >
          ✕
        </button>
        
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1.25rem' }}>
          <h2 style={{ 
            color: '#3a0e19', // Más oscuro
            marginTop: 0, 
            marginBottom: '0.4rem', 
            fontSize: '1.7rem', 
            fontWeight: '800',
            textTransform: 'uppercase', // Mayúsculas
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <svg width="28" height="28" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Historial de Alimentadoras (Ayer)
          </h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem', fontWeight: '500', marginLeft: '2.5rem' }}>
            Unidades que operaron el día <span style={{ color: 'var(--color-maroon)', fontWeight: '700' }}>{data?.fecha || fechaAyer || '...'}</span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <svg 
                width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"
                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text"
                placeholder="Buscar por Económico o Ruta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', 
                  padding: '0.85rem 1rem 0.85rem 2.8rem', 
                  borderRadius: '10px', 
                  border: '2px solid #e5e7eb', 
                  fontSize: '1rem', 
                  fontWeight: '500',
                  color: '#1f2937',
                  outline: 'none', 
                  transition: 'border-color 0.2s',
                  backgroundColor: '#f9fafb',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-gold)';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f9fafb';
                }}
              />
            </div>
            {/* Instrucción capa 8 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', marginLeft: '0.5rem' }}>
              <svg width="14" height="14" fill="none" stroke="#8b5cf6" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>
                <strong style={{ color: '#4b5563' }}>Instrucción:</strong> Ingresa únicamente el <strong style={{ color: 'var(--color-maroon)' }}>Número Económico</strong> de la unidad o la <strong style={{ color: 'var(--color-maroon)' }}>Ruta</strong> para filtrar los resultados.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <span className="spinner" style={{ borderColor: 'rgba(196, 161, 80, 0.2)', borderTopColor: 'var(--color-gold)', width: '2.5rem', height: '2.5rem', display: 'inline-block' }}></span>
              <p style={{ color: '#6b7280', marginTop: '1rem', fontWeight: '500' }}>Consultando bitácora operativa...</p>
            </div>
          ) : isError ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#ef4444' }}>
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p style={{ fontWeight: '600' }}>Ocurrió un error de conexión al cargar el historial.</p>
            </div>
          ) : Object.keys(rutasFiltradas).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', background: '#f9fafb', borderRadius: '12px', border: '2px dashed #e5e7eb' }}>
              <svg width="56" height="56" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 1.5rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p style={{ color: '#374151', fontSize: '1.2rem', fontWeight: '700' }}>No hay resultados</p>
              <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '1rem' }}>No se encontraron unidades con este económico o ruta.</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '1.25rem', 
              maxHeight: '55vh', 
              overflowY: 'auto', 
              paddingRight: '0.75rem',
              paddingBottom: '1rem',
              alignItems: 'start'
            }}>
              {Object.entries(rutasFiltradas).map(([ruta, unidades]) => (
                <div key={ruta} style={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  background: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'; }}
                >
                  {/* Header de la Tarjeta de Ruta */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, var(--color-maroon) 0%, #4a1220 100%)', 
                    color: '#ffffff', 
                    padding: '0.85rem 1.25rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: '3px solid var(--color-gold)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '0.02em' }}>RUTA {ruta}</span>
                    </div>
                    <span style={{ 
                      background: 'rgba(255,255,255,0.15)', 
                      border: '1px solid rgba(255,255,255,0.3)',
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '20px', 
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {unidades.length} {unidades.length === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </div>
                  
                  {/* Lista de Unidades */}
                  <div style={{ padding: '0.5rem' }}>
                    {unidades.map((u, idx) => (
                      <div key={idx} style={{ 
                        padding: '0.75rem', 
                        borderBottom: idx < unidades.length - 1 ? '1px dashed #e5e7eb' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ 
                            fontWeight: '800', 
                            color: '#1f2937', 
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: '600' }}>ECO</span>
                            {u.economico}
                          </span>
                          {u.tarjeton ? (
                            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                              T-{u.tarjeton.toString().padStart(4, '0')}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#d1d5db', fontStyle: 'italic' }}>Sin tarjetón</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
                          <svg width="15" height="15" fill="none" stroke="#9ca3af" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                            {u.conductor || 'Sin registro de conductor'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalComparativaAlimentadoras;
