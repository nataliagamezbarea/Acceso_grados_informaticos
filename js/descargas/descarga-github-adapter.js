/* DESCARGA - GitHub privado configurado EXCLUSIVAMENTE desde Supabase */
(function () {
  async function obtenerConfigGitHubDescarga() {
    // SOLO se permiten estas claves de Supabase:
    // gh_repo_general y gh_token.
    // NO existe ningún fallback a gh_repo, repo, repo_general alternativo,
    // GITHUB_CONFIG, localStorage ni sessionStorage.
    const supabaseUrl = String(window.SUPABASE_URL || "").replace(/\/+$/, "");
    const anonKey = String(window.SUPABASE_ANON_KEY || "").trim();

    if (!supabaseUrl || !anonKey) {
      throw new Error("Falta configuración de Supabase");
    }

    let accessToken = anonKey;
    try {
      const sb = window.supabaseClient;
      if (sb?.auth?.getSession) {
        const r = await sb.auth.getSession();
        if (r?.data?.session?.access_token) accessToken = r.data.session.access_token;
      }
    } catch (_) {}

    const url =
      `${supabaseUrl}/rest/v1/configuracion_privada` +
      `?select=clave,valor` +
      `&clave=in.%28gh_repo_general,gh_token%29`;

    const r = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Accept-Profile": "grados-informaticos"
      },
      cache: "no-store"
    });

    if (!r.ok) throw new Error(`Supabase configuracion_privada HTTP ${r.status}`);

    const filas = await r.json();
    let repo = "";
    let token = "";

    for (const fila of Array.isArray(filas) ? filas : []) {
      const clave = String(fila?.clave || "").trim();
      const valor = String(fila?.valor || "").trim();

      if (clave === "gh_repo_general") repo = valor;
      if (clave === "gh_token") token = valor;
    }

    console.log("[DESCARGAS] GitHub SOLO desde Supabase:", {
      gh_repo_general: repo || "[VACÍO]",
      gh_token: token ? "[CARGADO]" : "[VACÍO]"
    });

    if (!repo) {
      throw new Error(
        "ERROR: gh_repo_general está vacío. No se utilizará gh_repo como alternativa."
      );
    }

    if (!token) {
      throw new Error("ERROR: gh_token está vacío.");
    }

    return { repo, token };
  }

  function normalizarRama(rama) {
    const r = String(rama || "").trim();
    return (!r || r === "TODAS LAS RAMAS" || r === "TODAS_LAS_RAMAS_" || r === "__TODAS__") ? "" : r;
  }

  function separarRutaGitHub(ruta, rama) {
    const u = String(ruta || "").trim();
    const m = u.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/i);
    if (!m) return { path: u.replace(/^\/+/, ""), ref: normalizarRama(rama) };

    const resto = m[3];
    const ref = normalizarRama(rama);
    if (ref) {
      const pref = ref.replace(/^\/+|\/+$/g, "") + "/";
      if (resto.startsWith(pref)) return { path: resto.slice(pref.length), ref };
    }

    // Para URLs raw, si no hay rama seleccionada, el primer segmento es la rama
    // habitual del proyecto (main/master/Primer_grado_medio, etc.).
    const partes = resto.split("/");
    return { path: partes.slice(1).join("/"), ref: partes[0] };
  }

  async function fetchArchivoDesdeGitHub(ruta, nombre, rama, signal) {
    const cfg = await obtenerConfigGitHubDescarga();
    const partesRuta = separarRutaGitHub(ruta, rama);
    const path = String(partesRuta.path || "").replace(/^\/+/, "").trim();
    if (!path) throw new Error("Ruta de archivo vacía");

    const partes = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    let api = `https://api.github.com/repos/${cfg.repo}/contents/${partes}`;

    const ref = normalizarRama(partesRuta.ref);
    if (ref) api += `?ref=${encodeURIComponent(ref)}`;

    const headers = {
      Accept: "application/vnd.github.raw",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    headers.Authorization = "Bearer " + cfg.token;

    const res = await fetch(api, {
      method: "GET",
      headers,
      cache: "no-store",
      ...(signal ? { signal } : {})
    });

    if (!res.ok) {
      let detalle = "";
      try {
        const d = await res.json();
        if (d?.message) detalle = `: ${d.message}`;
      } catch (_) {}
      throw new Error(`GitHub ${res.status} al leer ${path}${ref ? ` en rama ${ref}` : ""}${detalle}`);
    }

    const blob = await res.blob();
    if (!(blob instanceof Blob)) throw new Error("GitHub no devolvió un Blob");
    return blob;
  }

  window.fetchArchivoDesdeGitHub = fetchArchivoDesdeGitHub;
  window.obtenerConfigGitHubDescarga = obtenerConfigGitHubDescarga;
})();
