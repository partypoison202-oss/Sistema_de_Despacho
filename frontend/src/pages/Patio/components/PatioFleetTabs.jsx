// components/PatioFleetTabs.js
import React from 'react';

const PatioFleetTabs = ({ fleets, selected, onSelect }) => (
  <div className="floating-fleet-tabs">
    {fleets.map(f => (
      <button
        key={f.id}
        className={`fleet-tab ${selected === f.id ? 'active' : ''}`}
        onClick={() => onSelect(f.id)}
      >
        {f.label}
      </button>
    ))}
  </div>
);

export default PatioFleetTabs;