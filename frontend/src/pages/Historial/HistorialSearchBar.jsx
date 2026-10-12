import React from 'react';

/**
 * Componente unificado y estilizado de Barra de Búsqueda para todos los Historiales.
 * 
 * Props:
 * - value: string (texto de búsqueda)
 * - onChange: function(string)
 * - placeholder: string (texto de ayuda con campos específicos del historial)
 * - totalCount: number (conteo total de registros disponibles)
 * - filteredCount: number (conteo de registros que coinciden con el filtro)
 * - extraFilters: ReactNode (selects o filtros adicionales a la derecha)
 * - className: string (clases extra)
 */
export default function HistorialSearchBar({
  value = '',
  onChange,
  placeholder = 'Buscar en el historial...',
  totalCount,
  filteredCount,
  extraFilters,
  className = ''
}) {
  const hasValue = Boolean(value && value.trim().length > 0);

  return (
    <div className={`historial-search-toolbar ${className}`}>
      <div className="historial-search-box">
        <svg
          className="historial-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          className="historial-search-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onChange('');
          }}
        />

        {hasValue && (
          <button
            type="button"
            className="historial-search-clear"
            onClick={() => onChange('')}
            title="Limpiar búsqueda (Esc)"
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {extraFilters && (
        <div className="historial-search-extras">
          {extraFilters}
        </div>
      )}

      {(filteredCount !== undefined || totalCount !== undefined) && (
        <div className="historial-search-counter">
          {hasValue ? (
            <span className="historial-counter-badge active">
              <span className="dot"></span>
              {filteredCount ?? 0} de {totalCount ?? 0} {totalCount === 1 ? 'coincidencia' : 'coincidencias'}
            </span>
          ) : (
            <span className="historial-counter-badge">
              {totalCount ?? filteredCount ?? 0} {(totalCount ?? filteredCount) === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
