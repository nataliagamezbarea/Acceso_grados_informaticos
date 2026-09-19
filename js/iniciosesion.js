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
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return window.supabaseClient;
    } catch (_) { return null; }
  };
  const isAdmin = async (c, user) => {
    if (!c || !user?.id) return false;
    try {
      const { data, error } = await c.schema("public").from("perfiles")
        .select("rol").eq("id", user.id).maybeSingle();
      return !error && String(data?.rol || "").trim().toLowerCase() === "admin";
    } catch (_) { return false; }
  };
  const validateOAuthCallback = async () => {
    const c = await getClient();
    if (!c) return;
    try {
      const { data: { session } } = await c.auth.getSession();
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
