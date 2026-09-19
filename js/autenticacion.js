// GUARD DE AUTENTICACIÓN SUPABASE Y GITHUB (< 80 líneas)
(() =>  {
const esPaginaLogin = /login\.html/.test(window.location.pathname);
  const credencialesListas = window.SUPABASE_URL && window.SUPABASE_ANON_KEY && !window.SUPABASE_URL.startsWith("PEGA");
  document.documentElement.style.visibility = "hidden";
  const redirigir = (dest) => window.location.replace(dest);
  // FUNCION PARA QUERIES DIRECTAS AL SCHEMA grados-informaticos
  // El SDK JS v2 cachea el esquema y a veces no encuentra tablas en schemas con nombre especial.
  // Esta función evita el cache usando fetch directo con el header Accept-Profile.
  const querySupabaseEsquema = async (tabla, columnas = "*", condiciones =  {
  }
  ) =>  {
    const url = `${window.SUPABASE_URL}/rest/v1/${tabla}`;
    const anonKey = window.SUPABASE_ANON_KEY || window.SUPABASE_PUBLISHABLE_KEY || window.SUPABASE_KEY;
    // Construir query string
    let query = columnas;
    if (condiciones && Object.keys(condiciones).length > 0) {
      const clausulas = Object.entries(condiciones).map(([clave, valor]) =>  {
        if (typeof valor === 'object') {
          // Formato IN: { clave: ['valor1', 'valor2'] }
          const valores = valor.map(v => `"${v}"`).join(",");
          return `clave=in.(${valores})`;
        }
        return `clave=eq.${clave}`;
      }
  );
      query += `?${clausulas.join("&")}`;
    }
    const headers =  {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
      "Accept": "application/json",
      "Accept-Profile": "grados-informaticos"
    }
    ;
    return fetch(`${url}?${query}`,  { headers }
    )
    .then(res =>  {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    }
    )
    .catch(err =>  {
      console.error(`Error en querySupabaseEsquema ${tabla}:`, err);
      throw err
    }
  );
  }
  ;
  const verificarPermiso = async (u) =>  {
    if (!u) return false;
    const email = (u.email || "").toLowerCase();
    const uName = (u.user_metadata?.user_name || u.user_metadata?.preferred_username || u.identities?.[0]?.identity_data?.user_name || "").toLowerCase();
    if (email === "nataliagbarea@gmail.com" || uName === "nataliagamezbarea") return true;
    // La autorizacion del ADMIN la decide Supabase/RLS mediante public.perfiles.
    // El gh_token de GitHub se carga después desde configuracion_privada de Supabase para el ADMIN.
    try {
      const  { data, error }
      = await window.supabaseClient
      .from("perfiles")
      .select("rol")
      .eq("id", u.id)
      .maybeSingle();
      if (error) return false;
      return data?.rol === "admin";
    } catch (_e) {
      return false;
    }
  }
  ;
  const iniciar = async () =>  {
    try {
      if (!credencialesListas) throw new Error("Configura Supabase");
      const supabase = window.supabaseClient || (window.supabase?.createClient ? window.supabase.createClient(
        window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        }
      ) : null);
      if (!supabase) throw new Error("Cliente Supabase no disponible.");
      window.supabaseClient = supabase;
      const  {
        data:  { session }
      }
      = await supabase.auth.getSession();
      if (session && session.user) {
        const tieneAcceso = await verificarPermiso(session.user);
        window.__ES_ADMIN = !!tieneAcceso;
        if (!tieneAcceso) {
          await supabase.auth.signOut();
          redirigir("paginas/login.html?error=no_access");
          return;
        }
      }
      if (esPaginaLogin && session) {
        const redir = new URLSearchParams(window.location.search).get("redir") || "index.html";
        redirigir(redir);
        return;
      }
      if (!esPaginaLogin && !session) {
        redirigir("paginas/login.html?redir=" + encodeURIComponent(window.location.href));
        return;
      }
      document.documentElement.style.visibility = "";
      document.documentElement.style.background = "";
      window.sesionActual = session;
      window.dispatchEvent(new CustomEvent("static-auth-ready",  {
        detail:  { admin: !!window.__ES_ADMIN, session }
      }
      ));
      window.cerrarSesionUsuario = async () =>  {
        if (supabase) await supabase.auth.signOut();
        redirigir("paginas/login.html");
      }
      ;
    } catch (e) {
      if (!esPaginaLogin) redirigir("paginas/login.html");
      else {
        document.documentElement.style.visibility = "";
        document.documentElement.style.background = "";
      }
    }
  }
  ;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
}
)();
