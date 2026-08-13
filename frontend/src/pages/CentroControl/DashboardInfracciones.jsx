import React from 'react';
import Header from '../../components/Header/Header';
import InfraccionStats from '../Infraccion/components/InfraccionStats';

export default function DashboardInfracciones() {
  return (
    <div style={{ paddingBottom: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <Header title="Centro de Control" eyebrow="Dashboard de Infracciones y Accidentes" />
      <main style={{ maxWidth: '1200px', margin: '0 auto', marginTop: '1.5rem', padding: '0 1rem' }}>
        <InfraccionStats />
      </main>
    </div>
  );
}
