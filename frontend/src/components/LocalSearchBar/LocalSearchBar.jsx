import React, { useState } from 'react';
import Swal from 'sweetalert2';
import '../../pages/Unidades/LocalSearch.css';

export default function LocalSearchBar({ unidades = [], onSelectUnit, moduleName = '' }) {
  const [localSearch, setLocalSearch] = useState('');

  const normalizarNumeroEco = (eco) => {
    if (!eco) return '';
    const num = parseInt(eco.replace(/\D/g, ''), 10);
    return isNaN(num) ? '' : num.toString().padStart(3, '0');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const ecoBuscar = normalizarNumeroEco(localSearch);
    
    if (!ecoBuscar || ecoBuscar === '000') {
      return;
    }

    // Buscar la unidad en la lista de unidades del componente padre
    const encontrada = unidades.find(u => {
      const valorEco = u.numero_eco !== undefined ? u.numero_eco : u.eco;
      return normalizarNumeroEco(valorEco) === ecoBuscar;
    });

    if (encontrada) {
      // Simular que el usuario seleccionó la unidad
      onSelectUnit(encontrada.display || `ECO${ecoBuscar}`);
      setLocalSearch('');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'No se encontró',
        text: `No existe la unidad ${ecoBuscar} en la sección de ${moduleName}.`,
        confirmButtonColor: '#601a2a',
      });
    }
  };

  return (
    <form className="local-search-container" onSubmit={handleSearch}>
      <svg className="local-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        className="local-search-input"
        placeholder={`Buscar ECO en ${moduleName}...`}
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value.replace(/\D/g, '').substring(0, 3))}
      />
    </form>
  );
}
