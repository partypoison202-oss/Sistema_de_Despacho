// src/pages/Inspeccion/components/FuelGaugeSelector.jsx
import React from 'react';

// value esperado: 0, 25, 50, 75, 100
const NIVELES = [
  { value: 0,   label: 'E' },
  { value: 25,  label: '¼' },
  { value: 50,  label: '½' },
  { value: 75,  label: '¾' },
  { value: 100, label: 'F' },
];

// Marcas menores entre los niveles principales (solo decorativas)
const MINOR_TICKS = [12.5, 37.5, 62.5, 87.5];

// Centro del medidor (en coordenadas del viewBox)
const CX = 100;
const CY = 105;

// Ángulos del medidor: de -90° (E) a 90° (F)
const angleForValue = (value) => -90 + (value / 100) * 180;

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

// Construye el path de un "gajo" (sector anular) entre dos ángulos,
// desde un radio interno hasta uno externo — es la zona clicable de cada cuarto
const describeAnnularSector = (cx, cy, rInner, rOuter, angleStart, angleEnd) => {
  const p1 = polarToCartesian(cx, cy, rOuter, angleStart);
  const p2 = polarToCartesian(cx, cy, rOuter, angleEnd);
  const p3 = polarToCartesian(cx, cy, rInner, angleEnd);
  const p4 = polarToCartesian(cx, cy, rInner, angleStart);
  const largeArc = angleEnd - angleStart > 180 ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
};

// Ancho de la zona clicable de cada nivel (180° / 5 niveles)
const ZONE_WIDTH = 36;

let gaugeInstance = 0;

export default function FuelGaugeSelector({
  value,
  onChange,
  color = '#6b1d33',
  label = 'Combustible',
}) {
  const idRef = React.useRef(null);
  if (idRef.current === null) {
    gaugeInstance += 1;
    idRef.current = `fuelGauge-${gaugeInstance}`;
  }
  const gradId = `${idRef.current}-arc`;
  const needleGradId = `${idRef.current}-needle`;
  const shadowId = `${idRef.current}-shadow`;

  const nivelActual = value === '' || value === undefined || value === null ? null : Number(value);
  const angle = nivelActual !== null ? angleForValue(nivelActual) : -90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 240 }}>
      <div
        style={{
          width: '100%',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          borderRadius: '1rem',
          padding: '0.75rem 0.5rem 0.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <svg viewBox="0 0 200 130" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.55" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>

            <radialGradient id={needleGradId} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="40%" stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </radialGradient>

            <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={color} floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Arco de fondo (surco) */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#eef0f2"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#d8dadd"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.35"
            transform="translate(0, 1)"
          />

          {/* Arco de color según nivel */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${nivelActual !== null ? (nivelActual / 100) * 251 : 0} 251`}
            filter={nivelActual !== null ? `url(#${shadowId})` : undefined}
            style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.34, 1.2, 0.64, 1)' }}
          />

          {/* Marcas menores decorativas */}
          {MINOR_TICKS.map((v) => {
            const a = angleForValue(v);
            const inner = polarToCartesian(CX, CY, 78, a);
            const outer = polarToCartesian(CX, CY, 86, a);
            return (
              <line
                key={v}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#d1d5db"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}

          {/* ── ZONAS CLICABLES: un gajo completo por cada nivel, sin sombreado visual ── */}
          {NIVELES.map((n) => {
            const centerAngle = angleForValue(n.value);
            const angleStart = centerAngle - ZONE_WIDTH / 2;
            const angleEnd = centerAngle + ZONE_WIDTH / 2;

            return (
              <path
                key={`zone-${n.value}`}
                d={describeAnnularSector(CX, CY, 25, 100, angleStart, angleEnd)}
                fill="transparent"
                onClick={() => onChange(String(n.value))}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* Etiquetas (el área de click ya la cubre el gajo de arriba) */}
          {NIVELES.map((n) => {
            const a = angleForValue(n.value);
            const { x: xLabel, y: yLabel } = polarToCartesian(CX, CY, 68, a);
            const isActive = nivelActual === n.value;

            return (
              <g key={n.value} style={{ pointerEvents: 'none' }}>
                {isActive && (
                  <circle
                    cx={xLabel}
                    cy={yLabel}
                    r="11"
                    fill={color}
                    opacity="0.12"
                    style={{ transition: 'opacity 0.2s' }}
                  />
                )}
                <text
                  x={xLabel}
                  y={yLabel}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isActive ? 14 : 11}
                  fontWeight={isActive ? 800 : 600}
                  fill={isActive ? color : '#9ca3af'}
                  style={{ userSelect: 'none', transition: 'font-size 0.2s, fill 0.2s' }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* Aguja */}
          <g
            transform={`rotate(${angle} ${CX} ${CY})`}
            style={{ transition: 'transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1)', pointerEvents: 'none' }}
            filter={`url(#${shadowId})`}
          >
            <polygon
              points={`${CX},${CY - 62} ${CX - 4},${CY - 6} ${CX + 4},${CY - 6}`}
              fill={color}
            />
            <polygon
              points={`${CX},${CY + 14} ${CX - 3},${CY} ${CX + 3},${CY}`}
              fill={color}
              opacity="0.6"
            />
          </g>

          <circle cx={CX} cy={CY} r="9" fill={`url(#${needleGradId})`} stroke="#fff" strokeWidth="1.5" style={{ pointerEvents: 'none' }} />

          <rect x={CX - 32} y={CY + 6} width="64" height="7" rx="3.5" fill="#e5e7eb" style={{ pointerEvents: 'none' }} />
          <rect x={CX - 32} y={CY + 6} width="64" height="3" rx="1.5" fill="#f3f4f6" style={{ pointerEvents: 'none' }} />
        </svg>
      </div>

      <div style={{ marginTop: '0.35rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', display: 'block', letterSpacing: '0.02em' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: nivelActual !== null ? color : '#d1d5db',
            transition: 'color 0.3s',
          }}
        >
          {nivelActual !== null ? `${nivelActual}%` : 'Sin capturar'}
        </span>
      </div>
    </div>
  );
}