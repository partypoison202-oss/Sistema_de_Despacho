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

// Centro del medidor (en coordenadas del viewBox)
const CX = 100;
const CY = 105;

// Ángulos del medidor: de -90° (E) a 90° (F)
const angleForValue = (value) => -90 + (value / 100) * 180;

export default function FuelGaugeSelector({
  value,
  onChange,
  color = '#6b1d33',
  label = 'Combustible',
}) {
  const nivelActual = value === '' || value === undefined || value === null ? null : Number(value);
  const angle = nivelActual !== null ? angleForValue(nivelActual) : -90;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 240 }}>
      <svg viewBox="0 0 200 125" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {/* Arco de fondo */}
        <path
          d="M 20 105 A 80 80 0 0 1 180 105"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Arco de color según nivel */}
        <path
          d="M 20 105 A 80 80 0 0 1 180 105"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${nivelActual !== null ? (nivelActual / 100) * 251 : 0} 251`}
          opacity={0.85}
        />

        {/* Marcas + etiquetas clicables */}
        {NIVELES.map((n) => {
          const a = angleForValue(n.value);
          const rad = (a * Math.PI) / 180;
          const xOuter = CX + 95 * Math.sin(rad);
          const yOuter = CY - 95 * Math.cos(rad);
          const xLabel = CX + 68 * Math.sin(rad);
          const yLabel = CY - 68 * Math.cos(rad);
          const isActive = nivelActual === n.value;

          return (
            <g
              key={n.value}
              onClick={() => onChange(String(n.value))}
              style={{ cursor: 'pointer' }}
            >
              {/* área de click más grande, invisible */}
              <circle cx={xOuter} cy={yOuter} r="14" fill="transparent" />
              <text
                x={xLabel}
                y={yLabel}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isActive ? 14 : 11}
                fontWeight={isActive ? 800 : 600}
                fill={isActive ? color : '#9ca3af'}
                style={{ userSelect: 'none' }}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {/* Aguja: el pivote lo controla el propio transform="rotate(angulo cx cy)" del atributo SVG */}
        <g transform={`rotate(${angle} ${CX} ${CY})`}>
          <polygon points={`${CX},${CY - 65} ${CX - 5},${CY} ${CX + 5},${CY}`} fill={color} />
        </g>
        <circle cx={CX} cy={CY} r="8" fill={color} />

        {/* Base */}
        <rect x={CX - 30} y={CY} width="60" height="8" rx="4" fill="#d1d5db" />
      </svg>

      <div style={{ marginTop: '-0.4rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', display: 'block' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: nivelActual !== null ? color : '#d1d5db',
          }}
        >
          {nivelActual !== null ? `${nivelActual}%` : 'Sin capturar'}
        </span>
      </div>
    </div>
  );
}