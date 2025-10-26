import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import './App.css';
import FillableTable from './FillableTable';
import Cumplimiento from './Cumplimiento';
import FCumplimiento from './FCumplimiento';
import History from './History';
import Evidencias from './Evidencias';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState('landing');

  const missingEnv =
    !process.env.REACT_APP_SUPABASE_URL ||
    !process.env.REACT_APP_SUPABASE_ANON_KEY;

  // Whitelist: only these emails can see "Historial"
  const ALLOWED_HISTORY_USERS = new Set([
    'fransvetlana@gmail.com',
    'austriafariasc@gmail.com',
    'etienne.farias.c@gmail.com',
  ]);
  const canSeeHistory = !!user?.email && ALLOWED_HISTORY_USERS.has(user.email.toLowerCase());

  useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      // Always start on Login: clear any locally persisted session on first load
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    if (!mounted) return;
    setUser(null);
    setLoading(false);
  })();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  useEffect(() => {
    const clearLocalSessionOnUnload = () => {
      try {
        // clears stored credentials immediately (no network needed)
        supabase.auth.signOut({ scope: 'local' });
      } catch {}
    };
    window.addEventListener('beforeunload', clearLocalSessionOnUnload);
    return () => window.removeEventListener('beforeunload', clearLocalSessionOnUnload);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSelect = (selectedPage) => {
    setPage(selectedPage);
    setMenuOpen(false);
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (missingEnv) {
    return (
      <div style={{ padding: 24 }}>
        Missing Supabase configuration.
        Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy.
      </div>
    );
  }

  return (
    <div className="landing-page">
      <header className="header">
        <img src="METTIME LOGO.png" alt="Logo" className="header-image" />
        <div className="header-text">
          <h1>METTIME</h1>
        </div>
        <div className="dropdown">
          <button onClick={() => setMenuOpen(!menuOpen)}>
            Menu ▼
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button onClick={() => handleSelect('landing')}>Home</button>
              <button onClick={() => handleSelect('table')}>Formulario de solicitud</button>
              <button onClick={() => handleSelect('evidencias')}>Evidencias</button>
              <button onClick={() => handleSelect('fcumplimiento')}>Formulario Cumplimiento</button>
              <button onClick={() => handleSelect('cumplimiento')}>Dictamen de Cumplimiento</button>
              {canSeeHistory && (
                <button onClick={() => handleSelect('history')}>Historial</button>
              )}
            </div>
          )}
        </div>
      </header>
      {page === 'landing' && (
        <div className="landing-body">
          <h2>METTIME</h2>
          <p>Favor de seleccionar que operación desea realizar <br/> seleccionando una opción del menu </p>
        </div>
      )}
      <main>
        {page === 'landing' && null}
        {page === 'table' && <FillableTable />}
        {page === 'cumplimiento' && <Cumplimiento />}
        {page === 'fcumplimiento' && <FCumplimiento />}
        {page === 'history' && canSeeHistory && <History />}
        {page === 'evidencias' && <Evidencias />}
      </main>
      <footer className="App-footer">
        <p>Usuario: {user?.email}</p>
        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </footer>
    </div>
  );
}

export default App;
