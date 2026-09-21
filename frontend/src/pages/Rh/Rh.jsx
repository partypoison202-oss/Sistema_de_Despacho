import Header from '../../components/Header/Header';
import React from 'react';

export default function Rh() {
  return (
    <div className="rh-page">
      <Header title="Recursos Humanos" eyebrow="Módulo en desarrollo" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Módulo de Recursos Humanos</h2>
          <p className="text-gray-600">Este módulo se encuentra actualmente en desarrollo. Pronto estarán disponibles las herramientas de gestión de personal.</p>
        </div>
      </main>
    </div>
  );
}
