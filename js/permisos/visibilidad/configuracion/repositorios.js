/*
 * MÓDULO: Configuración - Repositorios y credenciales de GitHub.
 * Las credenciales salen exclusivamente de Supabase, schema configurado por
 * PermisosSupabase (grados-informaticos).
 *
 * Público:
 *   lectura  -> configuracion_publica.gh_token
 *   escritura -> configuracion_privada.gh_token
 * Privado:
 *   lectura/escritura -> configuracion_privada.gh_token
 */
(function (global) {
  const ramaActual = () =>
    (global.RamaActual && typeof global.RamaActual.obtener === "function" ? global.RamaActual.obtener() : "") ||
    (global.Estado && typeof global.Estado.obtener === "function" ? global.Estado.obtener("rama") : "") ||
    (typeof location !== "undefined" && new URLSearchParams(location.search).get("rama")) || "";

  let configPublicaCache = null;
  let configPrivadaCache = null;
  let publicPromise = null;
  let privatePromise = null;

  const cargarTabla = async (nombre, claves) => {
    const cliente = await global.PermisosSupabase?.esperarCliente?.();
    if (!cliente) throw new Error(`No hay cliente Supabase para leer ${nombre}.`);
    const tabla = global.PermisosSupabase?.getTabla?.(cliente, nombre, "grados-informaticos")
      || global.PermisosSupabase?.getTabla?.(cliente, nombre);
    if (!tabla) throw new Error(`No se encontró la tabla ${nombre} en Supabase.`);

    let data = null;
    let error = null;
    if (typeof global.PermisosSupabase?.consultarTablaConFallback === "function") {
      const res = await global.PermisosSupabase.consultarTablaConFallback(
        cliente,
        nombre,
        (t) => t.select("clave, valor").in("clave", claves)
      );
      data = res?.data || [];
      error = res?.error || null;
    } else {
      const res = await tabla.select("clave, valor").in("clave", claves);
      data = res?.data || [];
      error = res?.error || null;
    }
    if (error) throw error;

    const cfg = {};
    for (const fila of data || []) {
      cfg[String(fila?.clave || "").trim()] = String(fila?.valor || "").trim();
    }
    return cfg;
  };

  const cargarConfiguracionPublicaDesdeSupabase = async () => {
    if (configPublicaCache) return configPublicaCache;
    if (publicPromise) return publicPromise;
    publicPromise = (async () => {
      try {
        const cfg = await cargarTabla("configuracion_publica", ["gh_repo", "gh_token"]);
        if (!cfg.gh_repo) throw new Error("Falta gh_repo en configuracion_publica de Supabase.");
        if (!cfg.gh_token) throw new Error("Falta gh_token en configuracion_publica de Supabase.");
        configPublicaCache = { repo: cfg.gh_repo, token: cfg.gh_token };
        return configPublicaCache;
      } finally {
        publicPromise = null;
      }
    })();
    return publicPromise;
  };

  const cargarConfiguracionPrivadaDesdeSupabase = async () => {
    if (configPrivadaCache) return configPrivadaCache;
    if (privatePromise) return privatePromise;
    privatePromise = (async () => {
      try {
        const cfg = await cargarTabla("configuracion_privada", ["gh_repo", "gh_repo_general", "gh_token"]);
        const repo = cfg.gh_repo || cfg.gh_repo_general;
        if (!repo) throw new Error("Falta gh_repo/gh_repo_general en configuracion_privada de Supabase.");
        if (!cfg.gh_token) throw new Error("Falta gh_token en configuracion_privada de Supabase.");
        configPrivadaCache = { repo, token: cfg.gh_token };
        return configPrivadaCache;
      } finally {
        privatePromise = null;
      }
    })();
    return privatePromise;
  };

  const cargarRepoPublicoDesdeSupabase = async () => (await cargarConfiguracionPublicaDesdeSupabase()).repo;
  const repoPublico = () => configPublicaCache?.repo || "";
  const repoPrivado = () => configPrivadaCache?.repo || "";
  const tokenPublico = async () => (await cargarConfiguracionPublicaDesdeSupabase()).token;
  const tokenAdmin = async () => (await cargarConfiguracionPrivadaDesdeSupabase()).token;

  const headers = (token) => {
    const h = { Accept: "application/vnd.github+json", "User-Agent": "grados-informaticos" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const Repositorios = {
    ramaActual,
    repoPrivado,
    repoPublico,
    cargarConfiguracionPublicaDesdeSupabase,
    cargarConfiguracionPrivadaDesdeSupabase,
    cargarRepoPublicoDesdeSupabase,
    tokenPublico,
    tokenAdmin,
    headers
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Repositorios;
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.Repositorios = Repositorios;
})(typeof window !== "undefined" ? window : globalThis);
