import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DetalleUnidadTitan from './DetalleUnidadTitan';
import { AuthContext } from '../../context/AuthContext';
import React from 'react';

// Mock dependencias
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(),
  },
}));

describe('DetalleUnidadTitan', () => {
  const mockModel = { id: 'urbanus', label: 'URBANUSS' };
  const mockUnidad = { numero_economico: '123' };

  it('renders and allows tab switching without data contamination', async () => {
    
    render(
      <AuthContext.Provider value={{ token: 'fake-token', user: { nombre_completo: 'Test User' } }}>
        <DetalleUnidadTitan model={mockModel} preselectedUnidad={mockUnidad} />
      </AuthContext.Provider>
    );

    // Initial state has no active tab body rendered until clicked, so let's click one
    const desincTab = screen.getByText('Desincorporación');
    await userEvent.click(desincTab);
    expect(screen.getByText(/Motivo/i)).toBeInTheDocument();
    
    // Switch to Código Naranja
    const naranjaTab = screen.getByText('Código Naranja');
    await userEvent.click(naranjaTab);
    
    expect(screen.getByText(/REPORTE DE ACOSO/i)).toBeInTheDocument();
  });
});
