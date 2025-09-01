import { useState, useEffect } from 'react';
import { getApiBase } from '../config/api';

const API_BASE = getApiBase('python');

export default function useAvailableForms(appId) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!appId) {
      setForms([]);
      setLoading(false);
      return;
    }

    async function fetchForms() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE}/api/apps/${appId}/forms`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch forms: ${response.status}`);
        }
        
        const formsList = await response.json();
        setForms(formsList);
      } catch (err) {
        console.error('Error fetching available forms:', err);
        setError(err.message);
        setForms([]);
      } finally {
        setLoading(false);
      }
    }

    fetchForms();
  }, [appId]);

  return { forms, loading, error };
}
