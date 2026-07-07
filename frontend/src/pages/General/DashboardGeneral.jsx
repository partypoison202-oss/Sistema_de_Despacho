// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import TablaInformativa from './components/TablaInformativa';
import { transportModules } from '../../config/transportModules';
import API_BASE from '../../config/api';
import './DashboardGeneral.css';

const normalizarTexto = (valor) => String(valor ?? '').trim().toUpperCase();

const normalizarRuta = (ruta) => {
  const texto = normalizarTexto(ruta);
  if (!texto) return 'SIN SERVICIO';
  return texto.replace(/\s+/g, ' ').trim();
};

const esRutaTroncal = (ruta) => {
  const texto = normalizarRuta(ruta);
  return texto.startsWith('T-') || texto.startsWith('T');
};

// FIX: antes solo detectaba rutas que contuvieran "RA" o fueran exactamente "20B".
// Los datos reales usan códigos como "05", "15C", "2A", "2B", "20B", etc.
// La regla correcta es: si tiene ruta asignada y NO es troncal, es alimentador.
const esRutaAlimentador = (ruta) => {
  const texto = normalizarRuta(ruta);
  if (texto === 'SIN SERVICIO') return false;
  return !esRutaTroncal(ruta);
};

const normalizarEstatus = (valor) => {
  const texto = normalizarTexto(valor);
  if (texto === 'OPERACION' || texto === 'OPERANDO' || texto === 'EN OPERACION') {
    return 'OPERACION';
  }
  return 'FUERA';
};

const construirResumen = (registros, tipo) => {
  const filasPorServicio = new Map();

  registros.forEach((registro) => {
    const ruta = normalizarRuta(registro.ruta);
    const coincide = tipo === 'troncal' ? esRutaTroncal(ruta) : esRutaAlimentador(ruta);

    if (!coincide) return;

    const entrada = filasPorServicio.get(ruta) || {
      servicio: ruta,
      operando: 0,
      fuera: 0,
      corridas: [],
      motivos: [],
      economicos: [],
    };

    const estatus = normalizarEstatus(registro.estatus);
    if (estatus === 'OPERACION') {
      entrada.operando += 1;
    } else {
      entrada.fuera += 1;
    }

    if (registro.corridas !== null && registro.corridas !== undefined && registro.corridas !== '') {
      entrada.corridas.push(String(registro.corridas));
    }

    if (registro.motivo) {
      entrada.motivos.push(String(registro.motivo));
    }

    if (registro.economico) {
      entrada.economicos.push(String(registro.economico));
    }

    filasPorServicio.set(ruta, entrada);
  });

  const filas = Array.from(filasPorServicio.values())
    .map((entrada) => ({
      servicio: entrada.servicio,
      operando: entrada.operando,
      fuera: entrada.fuera,
      corrida: entrada.corridas.find(Boolean) || '',
      motivo: entrada.motivos.find(Boolean) || '',
      economicos: Array.from(new Set(entrada.economicos)).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.servicio.localeCompare(b.servicio));

  const programadas = filas.reduce((total, fila) => total + fila.operando + fila.fuera, 0);
  const operando = filas.reduce((total, fila) => total + fila.operando, 0);
  const faltantes = programadas - operando;

  return {
    programadas,
    operando,
    faltantes,
    filas: [
      ...filas,
      {
        servicio: 'TOTAL',
        operando,
        fuera: faltantes,
        corrida: '',
        motivo: '',
        esTotal: true,
        economicos: [],
      },
    ],
  };
};

export default function Dashboard() {
  const [conteos, setConteos] = useState({});
  const [tablas, setTablas] = useState({
    troncal: { programadas: 0, operando: 0, faltantes: 0, filas: [] },
    alimentador: { programadas: 0, operando: 0, faltantes: 0, filas: [] },
  });
  const [cargando, setCargando] = useState(true);

  const [mostrarTroncal, setMostrarTroncal] = useState(false);
  const [mostrarAlimentador, setMostrarAlimentador] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      const token = localStorage.getItem('token');
      setCargando(true);

      try {
        const [resumenResponse, hoyResponse] = await Promise.all([
          fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/api/despacho/hoy`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (resumenResponse.ok) {
          const data = await resumenResponse.json();
          setConteos(data);
        }

        if (hoyResponse.ok) {
          const registros = await hoyResponse.json();
          const registrosNormalizados = Array.isArray(registros)
            ? registros.map((registro) => ({
                ...registro,
                economico: registro.ECONOMICO || registro.economico || registro.numero_eco || '',
                ruta: registro.RUTA || registro.ruta || '',
                estatus: registro.ESTATUS || registro.estatus || '',
                corridas: registro.CORRIDAS || registro.corridas || '',
                motivo: registro.MOTIVO || registro.motivo || '',
              }))
            : [];

          setTablas({
            troncal: construirResumen(registrosNormalizados, 'troncal'),
            alimentador: construirResumen(registrosNormalizados, 'alimentador'),
          });
        }
      } catch (error) {
        console.error('Error de conexión:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchDatos();
  }, []);

  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard__main">
        <p className="dashboard__eyebrow">Seleccione el tipo de transporte</p>
        <h1 className="dashboard__title">Flota de Unidades</h1>
        <p className="dashboard__subtitle">
          Toque la imagen del transporte para ver la información de despacho
        </p>

        <div className="dashboard__grid">
          {transportModules.map((modulo) => (
            <TransportCard
              key={modulo.id}
              title={modulo.title}
              subtitle={modulo.subtitle}
              image={modulo.image}
              route={`/despacho/${modulo.id}`}
              cantidad={conteos[modulo.id] || 0}
              cargando={cargando}
            />
          ))}
        </div>

        {/* Etiquetas desplegables de tablas informativas */}
        <div className="dashboard__tablas-informativas">
          <button
            className="dashboard__etiqueta"
            onClick={() => setMostrarTroncal((prev) => !prev)}
          >
            <span>Tabla informativa servicio troncal</span>
            <span
              className={`dashboard__etiqueta-flecha ${
                mostrarTroncal ? 'dashboard__etiqueta-flecha--abierta' : ''
              }`}
            >
              ▾
            </span>
          </button>

          {mostrarTroncal && (
            <TablaInformativa
              titulo="Tabla informativa servicio troncal"
              columnaServicio="Servicio troncal"
              programadas={tablas.troncal.programadas}
              operando={tablas.troncal.operando}
              faltantes={tablas.troncal.faltantes}
              filas={tablas.troncal.filas}
              ordenColumnas="motivo-corrida"
            />
          )}

          <button
            className="dashboard__etiqueta"
            onClick={() => setMostrarAlimentador((prev) => !prev)}
          >
            <span>Tabla informativa de servicio alimentador</span>
            <span
              className={`dashboard__etiqueta-flecha ${
                mostrarAlimentador ? 'dashboard__etiqueta-flecha--abierta' : ''
              }`}
            >
              ▾
            </span>
          </button>

          {mostrarAlimentador && (
            <TablaInformativa
              titulo="Tabla informativa de servicio alimentador"
              columnaServicio="Servicio alimentador"
              programadas={tablas.alimentador.programadas}
              operando={tablas.alimentador.operando}
              faltantes={tablas.alimentador.faltantes}
              filas={tablas.alimentador.filas}
              ordenColumnas="corrida-motivo"
            />
          )}
        </div>
      </main>
    </div>
  );
}
