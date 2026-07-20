import { useState, useEffect } from 'react';
import API_BASE from '../../../config/api';

const fetchSingleFleet = async (fleetId, token) => {
  const response = await fetch(`${API_BASE}/api/unidades/listar/${fleetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Error fetching ${fleetId}`);
  return await response.json();
};

export const usePatioData = (selectedFleet) => {
  const [apiUnits, setApiUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchUnits = async (fleetId, silent = false) => {
    if (!silent) setLoading(true);
    const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));

    try {
      let data = [];

      if (fleetId === 'all') {
        const fleetIds = ['urbanus', 'vagoneta', 'zafiro', 'orion'];
        const promises = fleetIds.map((id) => fetchSingleFleet(id, token));
        const results = await Promise.allSettled(promises);
        const allData = [];
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
            allData.push(...result.value);
          }
        });
        if (allData.length > 0) {
          data = allData;
          setIsOffline(false);
        } else {
          data = [];
          setIsOffline(true);
        }
      } else {
        const response = await fetch(`${API_BASE}/api/unidades/listar/${fleetId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const json = await response.json();
          if (json && json.length > 0) {
            data = json;
            setIsOffline(false);
          } else {
            throw new Error('Empty data');
          }
        } else {
          throw new Error('API error');
        }
      }

      setApiUnits(data);
    } catch (error) {
      console.warn('Error fetching units:', error);
      setApiUnits([]);
      setIsOffline(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(selectedFleet);
  }, [selectedFleet]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnits(selectedFleet, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedFleet]);

  return { apiUnits, loading, isOffline, fetchUnits };
};