// src/pages/Mantenimiento/components/FuelInspection.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import FuelGaugeSelector from './FuelGaugeSelector';
import AppleDatePicker from './AppleDatePicker';
import API_BASE from '../../../config/api';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (isoStr) => {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const diasDesde = (fechaStr) => {
  if (!fechaStr) return null;
  const msPerDay = 86400000;
  return Math.floor((Date.now() - new Date(fechaStr)) / msPerDay);
};

// ─── Sub-componente: Etiqueta de contexto (solo lectura) ─────────────────────
function ContextLabel({ label, value, accent = false }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.4rem 0.6rem',
        background: '#f3f4f6',
        borderRadius: '0.5rem',
        marginBottom: '0.35rem',
      }}
    >
      <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>{label}</span>
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: accent ? '#6b1d33' : '#374151',
        }}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}

// ─── Sub-componente: Bloque de un medidor (Gasolina/AdBlue) ─────────────────
function FuelBlock({
  label,
  color,
  nivelValue,
  onNivelChange,
  kilometrajeValue,
  onKilometrajeChange,
  litrosValue,
  onLitrosChange,
  fechaValue,
  onFechaChange,
  registroAnterior,
  isDiesel,
  showKilometraje,
  showDias = true,
}) {
  const dias = diasDesde(registroAnterior?.fecha_ultima_carga);
  const alerta = dias !== null && dias > 3;

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        background: '#fafafa',
        borderRadius: '0.75rem',
        padding: '0.85rem 0.65rem 1rem',
        border: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      {/* Medidor */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FuelGaugeSelector
          value={nivelValue}
          onChange={onNivelChange}
          color={color}
          label={label}
        />
      </div>

      {/* ── Contexto previo (solo lectura) ── */}
      {(registroAnterior?.fecha_ultima_carga || registroAnterior?.kilometraje) && (
        <div style={{ marginTop: '0.75rem' }}>
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#9ca3af',
              textTransform: 'uppercase',
              marginBottom: '0.3rem',
            }}
          >
            Último registro
          </p>
          {registroAnterior?.fecha_ultima_carga && (
            <ContextLabel
              label="Fecha anterior"
              value={
                <>
                  {formatDate(registroAnterior.fecha_ultima_carga)}
                  {showDias && dias !== null && (
                    <span
                      style={{
                        marginLeft: '0.35rem',
                        fontSize: '0.7rem',
                        color: alerta ? '#ef4444' : '#10b981',
                        fontWeight: 700,
                      }}
                    >
                      ({dias === 0 ? 'Hoy' : `Hace ${dias}d`}{alerta ? ' ⚠️' : ''})
                    </span>
                  )}
                </>
              }
            />
          )}
        </div>
      )}

      {/* ── Inputs de captura ── */}
      {showKilometraje && (
        <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
          <span className="info-card__label">Kilometraje Actual</span>
          <input
            type="text"
            inputMode="numeric"
            className="interactive-input"
            style={{
              marginTop: '0.25rem',
              padding: '0 0.85rem',
              height: '2.3rem',
              fontSize: '0.9rem',
              width: '100%',
            }}
            placeholder={registroAnterior?.kilometraje !== undefined && registroAnterior?.kilometraje !== null && registroAnterior?.kilometraje !== '' ? Number(registroAnterior.kilometraje).toLocaleString('es-MX') : "Ej: 125000"}
            value={kilometrajeValue || ''}
            onChange={(e) =>
              onKilometrajeChange(e.target.value.replace(/\D/g, '').substring(0, 7))
            }
          />
        </div>
      )}

      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
        <span className="info-card__label">Litros Cargados</span>
        <input
          type="text"
          inputMode="decimal"
          className="interactive-input"
          style={{
            marginTop: '0.25rem',
            padding: '0 0.85rem',
            height: '2.3rem',
            fontSize: '0.9rem',
            width: '100%',
          }}
          placeholder="Ej: 120"
          value={litrosValue || ''}
          onChange={(e) =>
            onLitrosChange(e.target.value.replace(/[^0-9.]/g, '').substring(0, 6))
          }
        />
      </div>

      <div className="info-card__item" style={{ marginTop: '0.85rem' }}>
        <span className="info-card__label">Última Carga</span>
        <div className="mt-1 relative z-50">
          <input
            type="text"
            className="interactive-input"
            disabled
            style={{
              padding: '0 0.85rem',
              height: '2.3rem',
              fontSize: '0.9rem',
              width: '100%',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              cursor: 'not-allowed',
              textAlign: 'center',
              fontWeight: '600'
            }}
            value={fechaValue ? formatDate(fechaValue) : formatDate(new Date().toISOString().split('T')[0])}
          />
        </div>
        {showDias && dias !== null && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              marginTop: '0.35rem',
              display: 'block',
              color: alerta ? '#ef4444' : '#10b981',
            }}
          >
            {dias === 0 ? 'Hoy' : `Hace ${dias} día${dias > 1 ? 's' : ''}`}{' '}
            {alerta && '⚠️ revisar carga'}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function FuelInspection({ eco, tipoTransporte, token }) {
  const queryClient = useQueryClient();
  const isDiesel = ['urbanus', 'urbanuss', 'zafiro', 'orion'].includes(
    tipoTransporte?.toLowerCase()
  );
  const combustibleLabel = isDiesel ? 'Diésel' : 'Gasolina';

  // Form state
  const [form, setForm] = useState({
    nivelGasolina: '',
    kilometrajeGasolina: '',
    fechaUltimaCargaGasolina: new Date().toISOString().split('T')[0],
    litrosGasolina: '',
    nivelAdblue: '',
    kilometrajeAdblue: '',
    fechaUltimaCargaAdblue: new Date().toISOString().split('T')[0],
    litrosAdblue: '',
    numeroCincho: '',
    numeroCinchoAdblue: '',
    odometro: '',
  });
  const [guardando, setGuardando] = useState(false);

  // ── Fetch del último registro ────────────────────────────────────────────
  const ecoLimpio = eco ? String(eco).replace(/\D/g, '').padStart(3, '0') : null;

  const { data: registroAnterior, isLoading: cargandoRegistro } = useQuery({
    queryKey: ['mantenimiento-ultimo-registro', ecoLimpio],
    queryFn: async () => {
      if (!ecoLimpio || !token) return null;
      const res = await fetch(`${API_BASE}/api/mantenimiento/ultimo-registro/${ecoLimpio}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!ecoLimpio && !!token,
    staleTime: 30000,
  });

  // ── Un único efecto que maneja tanto el reset como la pre-carga ─────────────
  // Esto evita la condición de carrera donde el reset pisaba al pre-populate.
  // Se dispara cuando cambia el ECO O cuando llegan nuevos datos del servidor.
  useEffect(() => {
    // Siempre que cambie el eco, empezamos en limpio y luego llenamos con
    // lo que ya tenemos en el servidor (si existe).
    const baseVacia = {
      nivelGasolina: '',
      kilometrajeGasolina: '',
      fechaUltimaCargaGasolina: new Date().toISOString().split('T')[0],
      litrosGasolina: '',
      nivelAdblue: '',
      kilometrajeAdblue: '',
      fechaUltimaCargaAdblue: new Date().toISOString().split('T')[0],
      litrosAdblue: '',
      numeroCincho: '',
      numeroCinchoAdblue: '',
      odometro: '',
    };

    if (!registroAnterior || registroAnterior.status === 'error') {
      setForm(baseVacia);
      return;
    }

    // Pre-poblar con lo que vino del servidor, dejando en blanco lo que no existe.
    // Solo poblamos el nivel (medidor), los demás se quedan vacíos para que muestren el placeholder.
    setForm({
      ...baseVacia,
      nivelGasolina: registroAnterior.nivel_combustible ?? '',
      nivelAdblue: registroAnterior.nivel_adblue ?? '',
      // No poblamos estos para que se vean como letras transparentes (placeholders):
      // numeroCincho: registroAnterior.numero_cincho ?? '',
      // kilometrajeGasolina: registroAnterior.kilometraje ?? '',
      // fechaUltimaCargaGasolina: isDiesel ? '' : (registroAnterior.fecha_ultima_carga ?? ''),
      // fechaUltimaCargaAdblue: isDiesel ? (registroAnterior.fecha_ultima_carga ?? '') : '',
    });
  }, [registroAnterior, ecoLimpio]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  // ── Validación y guardado ────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!ecoLimpio) return;

    const { nivelGasolina, nivelAdblue, numeroCincho, numeroCinchoAdblue, fechaUltimaCargaGasolina, fechaUltimaCargaAdblue, kilometrajeGasolina, odometro } = form;

    // 1. Al menos un dato (incluye el kilometraje: '0' es válido para una unidad nueva)
    const hayDato = nivelGasolina || nivelAdblue || numeroCincho || numeroCinchoAdblue || odometro ||
                    fechaUltimaCargaGasolina || fechaUltimaCargaAdblue ||
                    (kilometrajeGasolina !== '' && kilometrajeGasolina !== undefined);
    if (!hayDato) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Por favor ingresa al menos un dato de carga de combustible para poder guardar.',
        confirmButtonColor: '#c5a059',
      });
      return;
    }

    // 2. Validación de kilometraje: no puede ser menor al anterior
    const kmAnterior = registroAnterior?.kilometraje !== undefined && registroAnterior?.kilometraje !== null
      ? Number(registroAnterior.kilometraje) : null;

    // Usamos !== '' para que '0' (unidad nueva) sea un valor válido
    const kmGasolinaNum = form.kilometrajeGasolina !== '' && form.kilometrajeGasolina !== undefined
      ? Number(form.kilometrajeGasolina) : null;
    const kmAdblueNum = form.kilometrajeAdblue !== '' && form.kilometrajeAdblue !== undefined
      ? Number(form.kilometrajeAdblue) : null;

    if (kmAnterior !== null && kmGasolinaNum !== null && kmGasolinaNum < kmAnterior) {
      Swal.fire({
        icon: 'error',
        title: '⚠️ Anomalía en Kilometraje',
        html: `El kilometraje de ${combustibleLabel} ingresado (<b>${kmGasolinaNum.toLocaleString('es-MX')} km</b>) es <b>menor</b> al último registro guardado (<b>${kmAnterior.toLocaleString('es-MX')} km</b>).<br><br>Verifica el odómetro y vuelve a intentarlo.`,
        confirmButtonColor: '#6b1d33',
      });
      return;
    }
    if (kmAnterior !== null && kmAdblueNum !== null && kmAdblueNum < kmAnterior) {
      Swal.fire({
        icon: 'error',
        title: '⚠️ Anomalía en Kilometraje',
        html: `El kilometraje de AdBlue ingresado (<b>${kmAdblueNum.toLocaleString('es-MX')} km</b>) es <b>menor</b> al último registro guardado (<b>${kmAnterior.toLocaleString('es-MX')} km</b>).<br><br>Verifica el odómetro y vuelve a intentarlo.`,
        confirmButtonColor: '#6b1d33',
      });
      return;
    }

    setGuardando(true);
    try {
      // Usamos !== null para que 0 km (unidad nueva) no se descarte
      const kmActual = kmGasolinaNum !== null ? kmGasolinaNum : (kmAdblueNum !== null ? kmAdblueNum : null);

      const payload = {
        numero_eco: ecoLimpio,
        tipo: tipoTransporte,
        // Si el usuario no ingresó nada (y tampoco es 0), enviamos el valor anterior o null
        nivel_combustible: form.nivelGasolina !== '' ? form.nivelGasolina : null,
        nivel_adblue: form.nivelAdblue !== '' ? form.nivelAdblue : null,
        numero_cincho: form.numeroCincho !== '' ? form.numeroCincho : (registroAnterior?.numero_cincho || null),
        numero_cincho_adblue: form.numeroCinchoAdblue !== '' ? form.numeroCinchoAdblue : (registroAnterior?.numero_cincho_adblue || null),
        kilometraje: kmActual !== null ? String(kmActual) : (registroAnterior?.kilometraje ?? null),
        odometro: form.odometro !== '' ? form.odometro : (registroAnterior?.odometro ?? null),
        fecha_ultima_carga: form.fechaUltimaCargaGasolina !== '' ? form.fechaUltimaCargaGasolina 
                          : (form.fechaUltimaCargaAdblue !== '' ? form.fechaUltimaCargaAdblue : (registroAnterior?.fecha_ultima_carga ?? null)),
      };

      const response = await fetch(`${API_BASE}/api/mantenimiento/guardar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Invalidar cache para que al regresar a esta unidad se vea el nuevo registro
        queryClient.invalidateQueries(['mantenimiento-ultimo-registro', ecoLimpio]);

        Swal.fire({
          icon: 'success',
          title: 'Registro Guardado',
          text: 'Los datos se guardaron correctamente en el servidor.',
          confirmButtonColor: '#c5a059',
          timer: 2200,
          showConfirmButton: false,
        });
      } else {
        throw new Error(data.message || 'Error al guardar');
      }
    } catch (error) {
      console.error('[FuelInspection] Error al guardar:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar la información en la base de datos.',
        confirmButtonColor: '#601a2a',
      });
    } finally {
      setGuardando(false);
    }
  };

  // ── Sin unidad seleccionada ──────────────────────────────────────────────
  if (!eco) return null;

  return (
    <div className="info-card__body">
      {/* Spinner mientras carga el registro anterior */}
      {cargandoRegistro && (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
          Cargando registro anterior…
        </p>
      )}

      {/* ── Kilometraje Único ── */}
      <div className="info-card__item" style={{ marginBottom: '1.25rem', background: '#fafafa', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span className="info-card__label" style={{ margin: 0, fontSize: '0.9rem' }}>Kilometraje Actual</span>
          {registroAnterior?.kilometraje && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
              Anterior: <span style={{ color: '#6b1d33', fontWeight: 700 }}>{Number(registroAnterior.kilometraje).toLocaleString('es-MX')} km</span>
            </span>
          )}
        </div>
        <input
          type="text"
          inputMode="numeric"
          className="interactive-input"
          style={{
            padding: '0 0.85rem',
            height: '2.3rem',
            fontSize: '0.9rem',
            width: '100%',
            textAlign: 'center',
            letterSpacing: '0.05em',
            fontWeight: '600'
          }}
          placeholder={registroAnterior?.kilometraje ? Number(registroAnterior.kilometraje).toLocaleString('es-MX') : "Ej: 125000"}
          value={form.kilometrajeGasolina || ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').substring(0, 7);
            set('kilometrajeGasolina', v);
            set('kilometrajeAdblue', v);
          }}
        />
      </div>

      {/* ── Odómetro (Oculto para vagonetas) ── */}
      {tipoTransporte?.toLowerCase() !== 'vagoneta' && (
        <div className="info-card__item" style={{ marginBottom: '1.25rem', background: '#fafafa', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="info-card__label" style={{ margin: 0, fontSize: '0.9rem' }}>Odómetro</span>
            {registroAnterior?.odometro && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                Anterior: <span style={{ color: '#6b1d33', fontWeight: 700 }}>{Number(registroAnterior.odometro).toLocaleString('es-MX')}</span>
              </span>
            )}
          </div>
          <input
            type="text"
            inputMode="numeric"
            className="interactive-input"
            style={{
              padding: '0 0.85rem',
              height: '2.3rem',
              fontSize: '0.9rem',
              width: '100%',
              textAlign: 'center',
              letterSpacing: '0.05em',
              fontWeight: '600'
            }}
            placeholder={registroAnterior?.odometro ? Number(registroAnterior.odometro).toLocaleString('es-MX') : "Ej: 125000"}
            value={form.odometro || ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').substring(0, 7);
              set('odometro', v);
            }}
          />
        </div>
      )}

      {/* ── Dos medidores ── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
        {/* Gasolina / Diésel */}
        <FuelBlock
          label={combustibleLabel}
          color="#c5a059"
          nivelValue={form.nivelGasolina}
          onNivelChange={(v) => set('nivelGasolina', v)}
          litrosValue={form.litrosGasolina}
          onLitrosChange={(v) => set('litrosGasolina', v)}
          fechaValue={form.fechaUltimaCargaGasolina}
          onFechaChange={(v) => set('fechaUltimaCargaGasolina', v)}
          registroAnterior={{
            fecha_ultima_carga: registroAnterior?.fecha_ultima_carga,
          }}
          isDiesel={isDiesel}
          showDias={false}
        />

        {/* AdBlue (Oculto para vagonetas) */}
        {tipoTransporte?.toLowerCase() !== 'vagoneta' && (
          <FuelBlock
            label="AdBlue"
            color="#3b82f6"
            nivelValue={form.nivelAdblue}
            onNivelChange={(v) => set('nivelAdblue', v)}
            kilometrajeValue={form.kilometrajeAdblue}
            onKilometrajeChange={(v) => set('kilometrajeAdblue', v)}
            litrosValue={form.litrosAdblue}
            onLitrosChange={(v) => set('litrosAdblue', v)}
            fechaValue={form.fechaUltimaCargaAdblue}
            onFechaChange={(v) => set('fechaUltimaCargaAdblue', v)}
            registroAnterior={{
              fecha_ultima_carga: registroAnterior?.fecha_ultima_carga,
            }}
            showDias={false}
          />
        )}
      </div>

      {/* ── Cinchos (Ocultos para vagonetas) ── */}
      {tipoTransporte?.toLowerCase() !== 'vagoneta' && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginTop: '1.25rem' }}>
          <div className="info-card__item" style={{ flex: 1, marginTop: 0 }}>
            <span className="info-card__label">Número de Cincho ({combustibleLabel})</span>
            <input
              type="text"
              className="interactive-input"
              style={{
                marginTop: '0.35rem',
                padding: '0 0.85rem',
                height: '2.5rem',
                fontSize: '0.9rem',
                width: '100%',
                textTransform: 'uppercase',
              }}
              placeholder={registroAnterior?.numero_cincho ? registroAnterior.numero_cincho : "Ej: AB123"}
              maxLength={10}
              value={form.numeroCincho || ''}
              onChange={(e) =>
                set('numeroCincho', e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
              }
            />
          </div>

          <div className="info-card__item" style={{ flex: 1, marginTop: 0 }}>
            <span className="info-card__label">Número de Cincho (AdBlue)</span>
            <input
              type="text"
              className="interactive-input"
              style={{
                marginTop: '0.35rem',
                padding: '0 0.85rem',
                height: '2.5rem',
                fontSize: '0.9rem',
                width: '100%',
                textTransform: 'uppercase',
              }}
              placeholder={registroAnterior?.numero_cincho_adblue ? registroAnterior.numero_cincho_adblue : "Ej: XY987"}
              maxLength={10}
              value={form.numeroCinchoAdblue || ''}
              onChange={(e) =>
                set('numeroCinchoAdblue', e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
              }
            />
          </div>
        </div>
      )}

      {/* ── Botón Guardar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button
          type="button"
          disabled={guardando}
          onClick={handleGuardar}
          className="interactive-input"
          style={{
            width: 'auto',
            padding: '0 1.5rem',
            height: '2.3rem',
            background: '#6b1d33',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: guardando ? 'not-allowed' : 'pointer',
            opacity: guardando ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'opacity 0.2s',
          }}
        >
          {guardando && (
            <span
              className="spinner"
              style={{
                width: '14px',
                height: '14px',
                borderWidth: '2px',
                borderColor: 'rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                flexShrink: 0,
                aspectRatio: '1',
                boxSizing: 'border-box',
              }}
            />
          )}
          GUARDAR
        </button>
      </div>
    </div>
  );
}
