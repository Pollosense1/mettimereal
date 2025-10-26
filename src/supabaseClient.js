import { createClient } from '@supabase/supabase-js';

// Use CRA env vars
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const missingEnv = !supabaseUrl || !supabaseAnonKey;

function makeQueryBuilder(error) {
  const builder = {
    // terminal/CRUD methods
    select() { return builder; },
    insert() { return builder; },
    upsert() { return builder; },
    update() { return builder; },
    delete() { return builder; },

    // filters/options
    eq() { return builder; },
    neq() { return builder; },
    lt() { return builder; },
    lte() { return builder; },
    gt() { return builder; },
    gte() { return builder; },
    like() { return builder; },
    ilike() { return builder; },
    contains() { return builder; },
    in() { return builder; },
    is() { return builder; },
    not() { return builder; },
    or() { return builder; },
    order() { return builder; },
    range() { return builder; },
    limit() { return builder; },
    single() { return builder; },
    maybeSingle() { return builder; },
    returns() { return builder; },

    // behave like a promise when awaited
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: null, error }).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve({ data: null, error }).catch(onRejected);
    },
    finally(onFinally) {
      return Promise.resolve().finally(onFinally);
    },
  };
  return builder;
}

function makeStubClient() {
  const error = new Error(
    'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.'
  );
  const ok = async () => ({ data: null, error: null });
  const err = async () => ({ data: null, error });

  return {
    auth: {
      signInWithPassword: err,
      signOut: ok,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from() {
      return makeQueryBuilder(error);
    },
    rpc: err,
    storage: {
      from() {
        return {
          upload: err,
          download: err,
          list: err,
          remove: err,
          getPublicUrl: () => ({ data: null, error }),
        };
      },
    },
    functions: { invoke: err },
  };
}

export const supabase = missingEnv
  ? makeStubClient()
  : createClient(supabaseUrl, supabaseAnonKey);

if (missingEnv) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Missing REACT_APP_SUPABASE_URL/REACT_APP_SUPABASE_ANON_KEY');
}