(() =>  {
  // Rehidrata la sesión persistida por Supabase. NO inicia un segundo login.
  // Se usa en páginas que se abren desde index.html mediante navegación completa.
  if (!window.SUPABASE_URL) window.SUPABASE_URL = "https://lztatgnlplpduiatmlrv.supabase.co";
  if (!window.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
  if (!window.supabaseClient && window.supabase?.createClient) {
    try {
      window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
      {
        db:  { schema: "grados-informaticos" }
        , auth:  { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      }
  );
    } catch (_) {
    }
  }
  window.__SESION_COMPARTIDA = true;
}
)();
