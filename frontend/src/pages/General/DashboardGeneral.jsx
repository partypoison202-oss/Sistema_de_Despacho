// src/pages/Dashboard/Dashboard.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header/Header';
import TransportCard from '../../components/TransportCard';
import TablaInformativa from './components/TablaInformativa';
import TablaFaltantes from './components/TablaFaltantes';
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
  if (texto === 'OPERACION' || texto === 'OPERANDO' || texto === 'EN OPERACION' || texto === 'RESERVA' || texto === 'EN RESERVA') {
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
  const eficiencia = programadas > 0 ? Math.round((operando / programadas) * 100) : 0;

  return {
    programadas,
    operando,
    faltantes,
    eficiencia,
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

// Construye la lista plana de unidades con estatus "FUERA" para la
// tabla de unidades faltantes (ECO, RUTA, CORRIDA, CICLO, MOTIVO).
const construirFaltantes = (registros) =>
  registros
    .filter((registro) => normalizarEstatus(registro.estatus) === 'FUERA')
    .map((registro) => {
      const ciclosFaltantes = parseFloat(registro.ciclo) || 0;
      const corridasFaltantes = ciclosFaltantes * 2;
      return {
        eco: registro.economico ? String(registro.economico) : '',
        ruta: normalizarRuta(registro.ruta),
        corrida: ciclosFaltantes > 0 ? String(corridasFaltantes) : '',
        ciclo: registro.ciclo ? String(registro.ciclo) : '',
        motivo: registro.motivo ? String(registro.motivo) : '',
      };
    })
    .sort((a, b) => a.ruta.localeCompare(b.ruta) || a.eco.localeCompare(b.eco));

export default function Dashboard() {
  const [mostrarTroncal, setMostrarTroncal] = useState(false);
  const [mostrarAlimentador, setMostrarAlimentador] = useState(false);
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false);

  const fetchConteos = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/conteo-unidades`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!response.ok) throw new Error('Error');
    return response.json();
  };

  const { data: conteos = {}, isLoading: cargandoConteos } = useQuery({
    queryKey: ['conteo-unidades-global'],
    queryFn: fetchConteos,
    refetchInterval: 30000,
  });

  const fetchDespachoHoy = async () => {
    const response = await fetch(`${API_BASE}/api/despacho/hoy`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!response.ok) throw new Error('Error');
    return response.json();
  };

  const { data: registrosHoy = [], isLoading: cargandoHoy } = useQuery({
    queryKey: ['despacho-hoy'],
    queryFn: fetchDespachoHoy,
    refetchInterval: 30000,
  });

  const registrosNormalizados = React.useMemo(() => {
    return Array.isArray(registrosHoy)
      ? registrosHoy.map((registro) => ({
          ...registro,
          economico: registro.ECONOMICO || registro.economico || registro.numero_eco || '',
          ruta: registro.RUTA || registro.ruta || '',
          estatus: registro.ESTATUS || registro.estatus || '',
          corridas: registro.CORRIDAS || registro.corridas || '',
          motivo: registro.MOTIVO || registro.motivo || '',
          ciclo: registro.CICLO || registro.ciclo || '',
        }))
      : [];
  }, [registrosHoy]);

  const tablas = React.useMemo(() => ({
    troncal: construirResumen(registrosNormalizados, 'troncal'),
    alimentador: construirResumen(registrosNormalizados, 'alimentador'),
  }), [registrosNormalizados]);

  const faltantesUnidades = React.useMemo(() => construirFaltantes(registrosNormalizados), [registrosNormalizados]);

  const cargando = cargandoConteos || cargandoHoy;



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
              eficiencia={tablas.troncal.eficiencia}
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
              eficiencia={tablas.alimentador.eficiencia}
              filas={tablas.alimentador.filas}
              ordenColumnas="corrida-motivo"
            />
          )}

          <button
            className="dashboard__etiqueta"
            onClick={() => setMostrarFaltantes((prev) => !prev)}
          >
            <span>Tabla de unidades faltantes</span>
            <span
              className={`dashboard__etiqueta-flecha ${
                mostrarFaltantes ? 'dashboard__etiqueta-flecha--abierta' : ''
              }`}
            >
              ▾
            </span>
          </button>

          {mostrarFaltantes && (
            <TablaFaltantes
              titulo="Unidades faltantes"
              filas={faltantesUnidades}
            />
          )}
        </div>
      </main>
    </div>
  );
}