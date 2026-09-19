/*
 * GUARD DE ADMINISTRADOR — VISOR ADMIN
 *
 * Este archivo se ejecuta también cuando alguien abre directamente
 * paneladministrador.html. No confía en sessionStorage, localStorage,
 * username de GitHub, email, colaborador del repositorio ni en la URL.
 *
 * Única autorización: public.perfiles.rol === "admin" para el auth.uid().
 */
(() => {
  const rutaLogin = () => {
    const base = window.APP_BASE || "/";
    const u = new URL(base + "paginas/login.html", window.location.origin);
    u.searchParams.set("error", "no_access");
    u.searchParams.set("redir", window.location.href);
    return u.href;
  };

  // Ocultar el visor mientras se verifica la autorización.
  try {
    document.documentElement.dataset.adminGuard = "checking";
    document.documentElement.style.visibility = "hidden";
  } catch (_) {}

  const crearCliente = async () => {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.PermisosSupabase?.esperarCliente) {
      const c = await window.PermisosSupabase.esperarCliente();
      if (c) return c;
    }
    if (!window.supabase?.createClient) return null;
    try {
      window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        {
          db: { schema: "grados-informaticos" },
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
      return window.supabaseClient;
    } catch (_) {
      return null;
    }
  };

  const bloquear = async (client) => {
    try { await client?.auth?.signOut?.(); } catch (_) {}
    try {
      sessionStorage.removeItem("esAdmin");
      sessionStorage.removeItem("esInvitado");
    } catch (_) {}
    try {
      document.documentElement.dataset.adminGuard = "denied";
      document.documentElement.style.visibility = "";
    } catch (_) {}
    window.location.replace(rutaLogin());
  };

  const comprobar = async () => {
    const client = await crearCliente();
    if (!client) return bloquear(null);

    let session = null;
    try {
      const result = await client.auth.getSession();
      session = result?.data?.session || null;
    } catch (_) {
      return bloquear(client);
    }

    if (!session?.user?.id) return bloquear(client);

    try {
      const { data, error } = await client
        .schema("public")
        .from("perfiles")
        .select("rol")
        .eq("id", session.user.id)
        .maybeSingle();

      const esAdmin =
        !error &&
        String(data?.rol || "").trim().toLowerCase() === "admin";

      if (!esAdmin) return bloquear(client);

      // Solo aquí se marca la sesión como admin.
      try {
        sessionStorage.removeItem("esInvitado");
        sessionStorage.setItem("esAdmin", "true");
      } catch (_) {}

      window.__ADMIN_GUARD_OK = true;
      document.documentElement.dataset.adminGuard = "ok";
      document.documentElement.dataset.rol = "admin";
      document.documentElement.style.visibility = "";
      window.dispatchEvent(new CustomEvent("admin-guard-ok"));
    } catch (_) {
      return bloquear(client);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", comprobar, { once: true });
  } else {
    comprobar();
  }
})();
