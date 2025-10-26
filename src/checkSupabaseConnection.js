import { supabase } from './supabaseClient';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

export async function checkSupabaseConnection({ timeoutMs = 5000 } = {}) {
  if (!SUPABASE_URL) {
    return { ok: false, auth: false, rest: false, error: 'Missing REACT_APP_SUPABASE_URL' };
  }

  // Check GoTrue (Auth) health
  let authOk = false;
  try {
    const { controller, cancel } = withTimeout(timeoutMs);
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    cancel();
    authOk = res.ok;
  } catch {
    authOk = false;
  }

  // Check PostgREST reachability
  let restOk = false;
  try {
    const headers = {};
    if (SUPABASE_ANON_KEY) {
      headers['apikey'] = SUPABASE_ANON_KEY;
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }
    const { controller, cancel } = withTimeout(timeoutMs);
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    cancel();
    restOk = !!res.status; // any HTTP response indicates reachability
  } catch {
    restOk = false;
  }

  const ok = authOk || restOk;

  // Benign client call to ensure client is usable
  try {
    await supabase.auth.signOut();
  } catch {}

  return {
    ok,
    auth: authOk,
    rest: restOk,
    error: ok ? undefined : 'Unable to reach Supabase Auth/REST endpoints',
  };
}

export async function logSupabaseConnectionStatus() {
  const result = await checkSupabaseConnection();
  console.log('[Supabase Connection Check]', result);
  return result;
}