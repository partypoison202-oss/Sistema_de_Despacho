import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../../components/Header/Header';
import API_BASE from '../../config/api';
import '../Operadores/Operadores.css'; // Reutilizamos los estilos del módulo de operadores
import '../CentroControl/CentroControl.css'; // Importamos para los estilos del header (centro-welcome, page-title, etc)
import GestionFaltasOperadores from '../Operadores/GestionFaltasOperadores';

export default function Rh() {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
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
      if (!res.ok) throw new Error('Error al cargar operadores');
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
            : 'No se pudieron cargar los datos.',
          confirmButtonColor: '#6b1d33'
        }).then((result) => {
          if (result.isConfirmed && err.message === 'Sesión expirada. Por favor, inicia sesión nuevamente.') {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            navigate('/login');
          }
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchConductores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rh-page bg-gray-50 min-h-screen">
      <Header title="Recursos Humanos" eyebrow="Gestión de Personal" />
      <main className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Titulo y descripción enfocados a RH (Estilo Centro de Control) */}
        <div className="centro-welcome" style={{ marginBottom: '32px' }}>
          <p className="page-eyebrow">Control de Incidencias</p>
          <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>RECURSOS HUMANOS</h1>
          <p className="centro-date">{fechaActual}</p>
          <p className="centro-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Consulta el padrón de conductores, revisa el historial de faltas activas,
            aprueba justificantes y gestiona el personal operativo.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6b1d33]"></div>
            <p className="mt-4 text-gray-600 font-medium">Cargando padrón de conductores...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
            <GestionFaltasOperadores 
              conductores={conductores} 
              onRefresh={fetchConductores} 
              getAuthHeaders={getAuthHeaders} 
            />
          </div>
        )}
      </main>
    </div>
  );
}
