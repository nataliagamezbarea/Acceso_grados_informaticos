var GRADOS =  {
Primer_grado_medio:  { rama: "Primer_grado_medio", limpia: "Primer_grado_medio_limpia" }
  ,
  Segundo_grado_medio:  { rama: "Segundo_grado_medio", limpia: "Segundo_grado_medio_limpia" }
  ,
  Primer_grado_superior_DAW:  { rama: "Primer_grado_superior_DAW", limpia: "Primer_grado_superior_DAW_limpia" }
}
;
var GH_API = "https://api.github.com";
var cfgPromise = null;
var cache =  { revision: null, rewrites:  { }
  , branches: null, trees: new Map(), nombresEliminar: null, colegios: null, palabrasProtegidas: null
  , dataSavedAt: new Map()
}
;
var _contentCache = new Map();
var _inFlightPromises = new Map();
const _CONTENT_CACHE_TTL = 5 * 60 * 1000;
function _cacheDisabled() {
  try { return window.visorAdminCacheDisabled?.() === true || window.__VISOR_ADMIN_CACHE_DISABLED === true; }
  catch (_) { return false; }
}
function _clearApiCache() {
  try { _contentCache.clear(); } catch (_) {}
  try { _inFlightPromises.clear(); } catch (_) {}
  try {
    cache.revision = null;
    cache.rewrites = {};
    cache.branches = null;
    cache.nombresEliminar = null;
    cache.colegios = null;
    cache.palabrasProtegidas = null;
    cache.dataSavedAt?.clear?.();
    cache.trees.clear();
  } catch (_) {}
  try { window.__VISOR_ADMIN_CLEAR_BUILD_DATA_CACHE?.(); } catch (_) {}
}
window.__VISOR_ADMIN_CLEAR_API_CACHE = _clearApiCache;
window.addEventListener('visor-admin-cache-changed', (e) => {
  if (e?.detail?.clear) _clearApiCache();
});
var json = (obj, status = 200) => new Response(JSON.stringify(obj),  {
  status, headers:  { "Content-Type": "application/json; charset=utf-8" }
}
  );
var bytes = (buf, type = "application/octet-stream", status = 200) => new Response(buf,  {
  status, headers:  { "Content-Type": type }
}
  );
var ghHeaders = token => ( {
  "Accept": "application/vnd.github+json", "User-Agent": "Visor-Grados-Static", ...(token ?  { Authorization: "Bearer " + token }
  :  {
  }
  )
}
  );
async function sbQuery(table, columns = "clave,valor", filters = "") {
  // 1. Consulta directa mediante el cliente SDK de Supabase con el esquema "grados-informaticos"
  if (window.PermisosSupabase && window.supabaseClient) {
    try {
      const res = await window.PermisosSupabase.consultarTablaConFallback(
      window.supabaseClient,
      table,
      (t) => t.select(columns)
  );
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) { return res.data; }
    } catch (_) {
    }
  }
  // 2. Consulta vía REST API con cabeceras de esquema grados-informaticos
  const u = (window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co") + "/rest/v1/" + table + "?select=" + encodeURIComponent(columns) + (filters ? "&" + filters : "");
  let tokenAuth = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
  try {
    if (window.supabaseClient) {
      const s = (await window.supabaseClient.auth.getSession()).data?.session;
      if (s?.access_token) tokenAuth = s.access_token;
    }
  } catch (_) {
  }
  const anon = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
  const headers =  {
    apikey: anon, Authorization: "Bearer " + tokenAuth, Accept: "application/json", "Accept-Profile": "grados-informaticos"
  }
  ;
  const r = await originalFetch(u,  { headers }
  );
  if (!r.ok) throw new Error("Supabase " + table + ": HTTP " + r.status);
  return r.json();
}
async function waitAuthReady() {
  if (!window.supabaseClient) return false;
  for (let i = 0; i < 20; i++) {
    try {
      if ((await window.supabaseClient.auth.getSession()).data?.session?.user) return true;
    } catch (_) {
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return false;
}
async function getConfig() {
  if (cfgPromise) return cfgPromise;
  cfgPromise = (async () =>  {
    const out =  {
      supabaseUrl: window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co",
      supabaseKey: window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ",
      repo: "",
      token: "",
      publicRepo: ""
    }
    ;
    // VISOR-ADMIN: el repositorio y el token salen SIEMPRE de
    // configuracion_privada. No se usa gh_repo, configuracion_publica ni
    // localStorage/sessionStorage para decidir el repositorio general.
    try {
      const authOk = await waitAuthReady();
      if (!authOk) throw new Error("No hay sesión Supabase autenticada.");
      const priv = await sbQuery("configuracion_privada", "clave,valor");
      for (const x of priv || []) {
        const clave = String(x?.clave || "").trim();
        const valor = String(x?.valor || "").trim();
        if (clave === "gh_repo_general") out.repo = valor;
        if (clave === "gh_token") out.token = valor;
        if (clave === "gh_repo_apuntes") out.repoApuntes = valor;
      }
    } catch (e) {
      console.warn("[Visor Admin] No se pudo leer configuracion_privada:", e);
    }
    // IMPORTANTE: en VISOR-ADMIN no hay fallback para GitHub.
    // El repositorio general y el token SIEMPRE salen de
    // configuracion_privada, una vez autenticado el usuario.
    if (!out.repo) throw new Error("No existe gh_repo_general en configuracion_privada de Supabase.");
    if (!out.token) throw new Error("No existe gh_token en configuracion_privada de Supabase.");
    out.publicRepo = out.repo;
    window.GITHUB_CONFIG =  { ...(window.GITHUB_CONFIG ||  { }
      ), repo: out.repo, repo_general: out.repo, repo_apuntes: out.repoApuntes || out.repo, token: out.token
    }
    ;
    return out;
  }
  )();
  try { return await cfgPromise; }
  catch (e) {
    cfgPromise = null;
    throw e;
  }
}
async function ghRequest(repo, path, opts =  {
}
) {
  const c = await getConfig();
  if (!repo) repo = c.repo;
  if (!repo || !c.token) throw new Error("Visor Admin: faltan gh_repo_general/gh_token de Supabase.");
  const url = GH_API + "/repos/" + repo + "/" + path.replace(/^\//, "");
  const r = await fetch(url,  {
    ...opts, headers:  { ...ghHeaders(c.token || null), ...(opts.headers ||  { }
      )
    }
  }
  );
  return r;
}
async function getContent(path, branch, repoOverride = "") {
  const c = await getConfig();
  const repo = repoOverride || c.repo;
  const token = c.token;
  if (!repo || !token) throw new Error("Visor Admin: faltan gh_repo_general/gh_token de Supabase.");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const cacheKey = repo + "::" + branch + "::" + cleanPath;
  if (!_cacheDisabled() && _contentCache.has(cacheKey)) {
    const item = _contentCache.get(cacheKey);
    const age = Date.now() - Number(item?.savedAt || 0);
    if (age >= 0 && age < _CONTENT_CACHE_TTL) {
      return {
        bytes: item.bytes.slice(0),
        text: item.text,
        sha: item.sha || "",
        path: item.path
      };
    }
    _contentCache.delete(cacheKey);
  }
  if (!_cacheDisabled() && _inFlightPromises.has(cacheKey)) return _inFlightPromises.get(cacheKey);
  const prom = (async () =>  {
    /*
     * IMPORTANTE:
     * Antes de pedir /contents comprobamos el árbol de la rama.
     * Si el archivo no existe, devolvemos null SIN generar un GET 404.
     */
    const branchPaths = await tree(repo, branch);
    let resolvedPath = cleanPath;
    const exact = branchPaths.find(p => String(p).toLowerCase() === cleanPath.toLowerCase());
    if (exact) { resolvedPath = exact; }
    else {
      // Algunos registros históricos guardan solo "apuntes/archivo.pdf" aunque
      // el PDF haya cambiado de carpeta. Resolver por nombre evita pedir una URL
      // inexistente y, por tanto, elimina el 404 de la Contents API.
      const base = cleanPath.split('/').pop().toLowerCase();
      const byBase = branchPaths.find(p => String(p).split('/').pop().toLowerCase() === base);
      if (byBase) resolvedPath = byBase;
      else return null;
    }
    /*
     * 1) METADATOS: siempre application/vnd.github+json.
     * Esto nos da SHA aunque el archivo sea grande o sea PDF.
     */
    const metaUrl =
    GH_API + "/repos/" + repo + "/contents/" +
    resolvedPath.split("/").map(encodeURIComponent).join("/") +
    "?ref=" + encodeURIComponent(branch);
    const metaRes = await originalFetch(metaUrl,  {
      headers:  {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Visor-Grados-Static",
        "Authorization": "Bearer " + token
      }
      ,
      cache: "no-store"
    }
  );
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    const sha = String(meta?.sha || "");
    /*
     * 2) CONTENIDO REAL:
     * application/vnd.github.raw+json permite descargar PDF/archivos
     * binarios directamente desde la Contents API, siempre autenticado.
     */
    const rawRes = await originalFetch(metaUrl,  {
      headers:  {
        "Accept": "application/vnd.github.raw+json",
        "User-Agent": "Visor-Grados-Static",
        "Authorization": "Bearer " + token
      }
      ,
      cache: "no-store"
    }
  );
    if (!rawRes.ok) return null;
    const buf = await rawRes.arrayBuffer();
    const raw = new Uint8Array(buf);
    const text = new TextDecoder().decode(raw);
    const result =  {
      bytes: buf,
      text,
      sha,
      path: cleanPath
    }
    ;
    if (_contentCache.size > 100) {
      const first = _contentCache.keys().next().value;
      _contentCache.delete(first);
    }
    if (!_cacheDisabled()) {
      _contentCache.set(cacheKey, {
        bytes: buf.slice(0),
        text,
        sha,
        path: cleanPath,
        savedAt: Date.now()
      });
    }
    return result;
  }
  )().catch(e =>  {
    console.warn("[Visor Admin] getContent:", cleanPath, e);
    return null;
  }
  ).finally(() =>  { _inFlightPromises.delete(cacheKey); }
  );
  _inFlightPromises.set(cacheKey, prom);
  return prom;
}
