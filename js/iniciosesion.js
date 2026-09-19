// ============================================================
// LÓGICA DEL FORMULARIO DE LOGIN (Google y GitHub OAuth)
// ============================================================
(() =>  {
  const errorBox = document.getElementById("mensaje-error");
  const btnGoogle = document.getElementById("btn-google");
  const btnGithub = document.getElementById("btn-github");
  const mostrarError = (msg) =>  {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
  ;
  const errParam = new URLSearchParams(window.location.search).get("error");
  if (errParam === "no_access") { mostrarError("Acceso denegado: tu cuenta no tiene permisos de acceso al repositorio."); }
  const conseguirSupabase = async () =>  {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.PermisosSupabase?.esperarCliente) {
      const c = await window.PermisosSupabase.esperarCliente();
      if (c) return c;
    }
    const url = window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co";
    const key = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
    if (window.supabase?.createClient) {
      try {
        window.supabaseClient = window.supabase.createClient(url, key, {
          db: { schema: "grados-informaticos" },
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return window.supabaseClient;
      } catch (_) {}
    }
    for (let i = 0; i < 30; i++) {
      if (window.supabaseClient) return window.supabaseClient;
      if (window.supabase?.createClient) {
        try {
          window.supabaseClient = window.supabase.createClient(url, key, {
            db: { schema: "grados-informaticos" },
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
          });
          return window.supabaseClient;
        } catch (_) {}
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }
  ;
  let oauthEnCurso = false;
  const iniciarOAuth = async (proveedor, boton, textoOriginal, textoCargando) =>  {
    if (oauthEnCurso) return;
    oauthEnCurso = true;
    if (errorBox) errorBox.hidden = true;
    const supabase = await conseguirSupabase();
    if (!supabase) {
      oauthEnCurso = false;
      mostrarError("Error al conectar con el servicio de autenticación.");
      return;
    }
    if (boton) {
      boton.disabled = true;
      boton.style.opacity = "0.7";
      boton.textContent = textoCargando;
    }
    const opciones =  {
    }
    ;
    if (proveedor === "google") {
      opciones.queryParams =  { access_type: "offline", prompt: "consent" }
      ;
    }
    const  { error }
    = await supabase.auth.signInWithOAuth( {
      provider: proveedor,
      options: opciones
    }
  );
    if (error) {
      oauthEnCurso = false;
      mostrarError(error.message);
      if (boton) {
        boton.disabled = false;
        boton.style.opacity = "1";
        boton.textContent = textoOriginal;
      }
    }
  }
  ;
  if (btnGoogle) {
    btnGoogle.addEventListener("click", () => iniciarOAuth("google", btnGoogle, "Entrar con Google", "Conectando con Google..."));
  }
  if (btnGithub) {
    btnGithub.addEventListener("click", () => iniciarOAuth("github", btnGithub, "Entrar con GitHub", "Conectando con GitHub..."));
  }
}
)();
