import { useState } from 'react';
import API_BASE from '../../../config/api';

export const useUnitDetails = (selectedFleet) => {
  const [unitDetailsCache, setUnitDetailsCache] = useState({});
  const [hoveredUnitEco, setHoveredUnitEco] = useState(null);

  const handleMouseEnterUnit = async (eco, status) => {
    setHoveredUnitEco(eco);
    if (unitDetailsCache[eco]) return;
    const token = localStorage.getItem('token');
    try {
      const fleetToUse = selectedFleet !== 'all' ? selectedFleet : 'urbanus';
      const response = await fetch(`${API_BASE}/api/unidades/detalle/${fleetToUse}/${eco}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUnitDetailsCache((prev) => ({ ...prev, [eco]: data }));
      } else {
        throw new Error('API Details Error');
      }
    } catch (error) {
      console.warn('Error fetching details:', error);
      // Si quieres un fallback con datos mock, puedes añadirlo aquí, pero por ahora dejamos vacío
    }
  };

  const handleMouseLeaveUnit = () => {
    setHoveredUnitEco(null);
  };

  return { unitDetailsCache, hoveredUnitEco, handleMouseEnterUnit, handleMouseLeaveUnit };
};