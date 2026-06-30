import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import './Menu.css';

const checklistMenuItems = [
  {
    id: 'hacer_checklist',
    redirectTo: '/checklist', 
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    label: 'HACER CHECK LIST',
    color: 'orange',
  },
  {
    id: 'revisar_checklist',
    redirectTo: '/checklist/historial', 
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: 'REVISAR CHECK LIST',
    color: 'blue',
  },
];

export default function MenuCheckList() {
  const navigate = useNavigate();

  const handleClick = (item) => {
    if (item.redirectTo) {
      navigate(item.redirectTo);
    }
  };

  return (
    <div className="menu-page">
      <Header hideBackButton={false} />

      <main className="dashboard-main">
        <div className="dashboard-welcome">
          <h2 className="dashboard-heading">Módulo de Check List</h2>
        </div>

        <div className="dashboard-grid">
          {checklistMenuItems.map((item) => (
            <button
              key={item.id}
              className={`dashboard-card dashboard-card--${item.color}`}
              onClick={() => handleClick(item)}
            >
              <div className="dashboard-card__icon" aria-hidden="true">
                {item.icon}
              </div>
              <div className="dashboard-card__body">
                <span className="dashboard-card__label">{item.label}</span>
              </div>
              <div className="dashboard-card__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
