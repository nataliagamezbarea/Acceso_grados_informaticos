// Login principal: Google/GitHub solo si public.perfiles.rol === "admin".
(() => {
  const errorBox = document.getElementById("mensaje-error");
  const btnGoogle = document.getElementById("btn-google");
  const btnGithub = document.getElementById("btn-github");
  const mostrarError = msg => {
    if (errorBox) { errorBox.textContent = msg; errorBox.hidden = false; }
  };
  const getClient = async () => {
    if (window.supabaseClient) return window.supabaseClient;
    if (!window.supabase?.createClient) return null;
    try {
      const url = window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co";
      const key = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
      window.supabaseClient = window.supabase.createClient(url, key, {
        db: { schema: "grados-informaticos" },
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return window.supabaseClient;
    } catch (_) { return null; }
  };
  const isAdmin = async (c, user) => {
    if (!user) return false;
    try {
      try {
        const u = window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co";
        const k = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
        const idFiltro = user.id ? `id=eq.${encodeURIComponent(user.id)}` : (user.email ? `email=eq.${encodeURIComponent(user.email)}` : null);
        if (idFiltro) {
          const resp = await fetch(`${u}/rest/v1/perfiles?select=rol&${idFiltro}`, {
            credentials: "omit",
            headers: { "apikey": k, "Authorization": `Bearer ${k}` }
          });
          if (resp.ok) {
            const arr = await resp.json();
            if (Array.isArray(arr) && arr.length > 0 && String(arr[0].rol || "").trim().toLowerCase() === "admin") {
              return true;
            }
          }
        }
      } catch (_) {}

      if (!c) return false;
      let data = null;
      if (user.id) {
        const resId = await c.schema("public").from("perfiles")
          .select("rol").eq("id", user.id).maybeSingle();
        if (!resId.error && resId.data) data = resId.data;
      }
      if (!data && user.email) {
        const resEmail = await c.schema("public").from("perfiles")
          .select("rol").eq("email", user.email).maybeSingle();
        if (!resEmail.error && resEmail.data) data = resEmail.data;
      }
      return data && String(data.rol || "").trim().toLowerCase() === "admin";
    } catch (_) { return false; }
  };
  const validateOAuthCallback = async () => {
    const c = await getClient();
    if (!c) return;
    try {
      let { data: { session } } = await c.auth.getSession();
      if (!session && (window.location.hash.includes("access_token") || window.location.search.includes("code="))) {
        if (window.location.search.includes("code=")) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");
          if (code && typeof c.auth.exchangeCodeForSession === "function") {
            try {
              const resCode = await c.auth.exchangeCodeForSession(code);
              if (resCode.data?.session) session = resCode.data.session;
            } catch (_) {}
          }
        }
        for (let i = 0; i < 30; i++) {
          if (session) break;
          await new Promise(r => setTimeout(r, 100));
          const res = await c.auth.getSession();
          if (res.data?.session) {
            session = res.data.session;
            break;
          }
        }
      }
      if (!session?.user) return;
      if (!(await isAdmin(c, session.user))) {
        await c.auth.signOut().catch(() => {});
        try { sessionStorage.removeItem("esAdmin"); sessionStorage.removeItem("esInvitado"); } catch (_) {}
        mostrarError("Acceso denegado: solo los administradores pueden iniciar sesión con Google o GitHub.");
        return;
      }
      try { sessionStorage.removeItem("esInvitado"); sessionStorage.setItem("esAdmin", "true"); } catch (_) {}
      window.location.replace(new URL("../index.html", window.location.href).href);
    } catch (_) {
      await c.auth.signOut().catch(() => {});
      mostrarError("No se pudo verificar el permiso de administrador.");
    }
  };
  const loginOAuth = async (provider, button, label) => {
    const c = await getClient();
    if (!c) return mostrarError("Error al conectar con Supabase.");
    if (button) { button.disabled = true; button.textContent = "Comprobando…"; }
    const { error } = await c.auth.signInWithOAuth({
      provider,
      options: { redirectTo: new URL("paginas/login.html", window.location.href).href }
    });
    if (error) {
      if (button) { button.disabled = false; button.textContent = label; }
      mostrarError(error.message);
    }
  };
  btnGoogle?.addEventListener("click", () => loginOAuth("google", btnGoogle, "Entrar con Google"));
  btnGithub?.addEventListener("click", () => loginOAuth("github", btnGithub, "Entrar con GitHub"));
  validateOAuthCallback();
})();
