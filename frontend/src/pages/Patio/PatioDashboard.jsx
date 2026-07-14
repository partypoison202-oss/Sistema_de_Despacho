// PatioDashboard.js
import React, { useState } from 'react';
import Header from '../../components/Header/Header';
import './PatioDashboard.css';
import { fleets } from './config/patioConfig';
import { usePatioData } from './hooks/usePatioData';
import { useUnitTransitions } from './hooks/useUnitTransitions';
import { useUnitDetails } from './hooks/useUnitDetails';
import PatioStats from './components/PatioStats';
import PatioMap from './components/PatioMap';

const PatioDashboard = () => {
  const [selectedFleet, setSelectedFleet] = useState('all');
  const { apiUnits, loading, fetchUnits } = usePatioData(selectedFleet);
  const { displayUnits, getUnitCoordinates } = useUnitTransitions(apiUnits);
  const { unitDetailsCache, hoveredUnitEco, handleMouseEnterUnit, handleMouseLeaveUnit } =
    useUnitDetails(selectedFleet);

  // Estadísticas
  const totalFleetCount = apiUnits.length;
  const activeCount = apiUnits.filter(u => u.estatus === 'operacion').length;
  const maintenanceCount = apiUnits.filter(u => u.estatus === 'mantenimiento').length;
  const reserveCount = apiUnits.filter(u => u.estatus === 'reserva').length;

  return (
    <div className="patio-dashboard light-theme-base">
      <Header />
      <main className="patio-main-container">
        <PatioStats
          total={totalFleetCount}
          active={activeCount}
          maintenance={maintenanceCount}
          reserve={reserveCount}
        />

        <div className="patio-viewport-centered">
          <PatioMap
            displayUnits={displayUnits}
            loading={loading}
            selectedFleet={selectedFleet}
            onSelectFleet={setSelectedFleet}
            onSync={() => fetchUnits(selectedFleet)}
            unitDetailsCache={unitDetailsCache}
            hoveredUnitEco={hoveredUnitEco}
            handleMouseEnter={handleMouseEnterUnit}
            handleMouseLeave={handleMouseLeaveUnit}
            getUnitCoordinates={getUnitCoordinates}
          />
        </div>
      </main>
    </div>
  );
};

export default PatioDashboard;