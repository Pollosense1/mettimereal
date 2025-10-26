import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './History.css';

function History() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('history')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setHistoryData(data);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div className="loading">Cargando historial...</div>;
  }

  return (
    <div className="history-container">
      <h2>Historial</h2>
      {historyData.length === 0 ? (
        <p>No hay registros en el historial.</p>
      ) : (
        <ul>
          {historyData.map((item) => (
            <li key={item.id}>
              <p>{item.description}</p>
              <p>{new Date(item.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default History;