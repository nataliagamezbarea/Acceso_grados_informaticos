var ALMACEN_INICIAL = [
"revision.json",
"nombres_eliminar.json",
"colegios.json",
"palabras_protegidas.json",
"registro_archivos.csv",
"imagenes_borrar_globales.json",
"rewrites_Primer_grado_medio.json",
"rewrites_Segundo_grado_medio.json",
"rewrites_Primer_grado_superior_DAW.json"
];
var almacenInicialPromise = null;
const _DATA_CACHE_TTL = 5 * 60 * 1000;
function _dataCacheDisabled() {
  try { return window.visorAdminCacheDisabled?.() === true || window.__VISOR_ADMIN_CACHE_DISABLED === true; }
  catch (_) { return false; }
}
function _dataFresh(key) {
  if (_dataCacheDisabled()) return false;
  const t = Number(cache.dataSavedAt?.get?.(key) || 0);
  return t > 0 && Date.now() - t < _DATA_CACHE_TTL;
}
function _markDataFresh(key) {
  try { cache.dataSavedAt?.set?.(key, Date.now()); } catch (_) {}
}

async function leerArchivoLocal(ruta) {
  const clean = String(ruta || '').replace(/^\/+/, '');
  const rutasProbables = [
  clean,
  "almacen/" + clean,
  "../almacen/" + clean,
  "../../almacen/" + clean,
  "GI/Primer_grado_medio/" + clean,
  "../GI/Primer_grado_medio/" + clean,
  "../../GI/Primer_grado_medio/" + clean
  ];
  for (const rPath of rutasProbables) {
    try {
      const u = new URL(rPath, location.href).href;
      const r = await originalFetch(u,  { cache: "no-store" }
  );
      if (r.ok) return await r.arrayBuffer();
    } catch (_) {
    }
  }
  return null;
}
function base64Bytes(buf) {
  const u8 = new Uint8Array(buf);
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) s += String.fromCharCode(...u8.subarray(i, i + chunk));
  return btoa(s);
}
async function asegurarAlmacenGeneral() {
  if (almacenInicialPromise) return almacenInicialPromise;
  try {
    if (sessionStorage.getItem('visor_almacen_inicial_ok') === '1') return [];
  } catch (_) {}
  almacenInicialPromise = (async () =>  {
    const c = await getConfig();
    const existentes = [];
    let masterPaths = [];
    try { masterPaths = await tree(c.repo, "master"); }
    catch (_) { masterPaths = []; }
    for (const nombre of ALMACEN_INICIAL) {
      const ruta = "almacen/datos/" + nombre;
      const existeRemoto = masterPaths.some(p => String(p).toLowerCase() === ruta.toLowerCase());
      if (existeRemoto) continue;
      const local = await leerArchivoLocal("datos/" + nombre);
      if (local) {
        try {
          const payload =  {
            message: "Inicializar almacén del Visor Admin: " + nombre,
            content: base64Bytes(local),
            branch: "master"
          };
          const r = await ghRequest(c.repo, "contents/" + ruta,  {
            method: "PUT",
            headers:  { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (r.ok) existentes.push(ruta);
        } catch (_) {
        }
      }
    }
    try { sessionStorage.setItem('visor_almacen_inicial_ok', '1'); } catch (_) {}
    return existentes;
  })().catch(e =>  {
    console.warn("[Visor Admin] Inicialización de almacén no completada:", e);
    return [];
  });
  return almacenInicialPromise;
}
async function getRevision() {
  if (_dataFresh('revision') && cache.revision) return cache.revision;
  let res = await cargarJsonDeRepositorio("almacen/datos/revision.json", "master");
  if (!res || typeof res !== "object" || Array.isArray(res)) {
    await asegurarAlmacenGeneral();
    res = await cargarJsonDeRepositorio("almacen/datos/revision.json", "master");
  }
  cache.revision = (res && typeof res === "object") ? res : {};
  _markDataFresh('revision');
  return cache.revision;
}
async function getRewrites(g) {
  const k = 'rewrites:' + g;
  if (_dataFresh(k) && cache.rewrites[g]) return cache.rewrites[g];
  let res = await cargarJsonDeRepositorio("almacen/datos/rewrites_" + g + ".json", "master");
  if (!Array.isArray(res) || !res.length) {
    await asegurarAlmacenGeneral();
    res = await cargarJsonDeRepositorio("almacen/datos/rewrites_" + g + ".json", "master");
  }
  cache.rewrites[g] = Array.isArray(res) ? res : [];
  _markDataFresh(k);
  return cache.rewrites[g];
}
async function getNombresEliminar() {
  await asegurarAlmacenGeneral();
  if (_dataFresh('nombres') && cache.nombresEliminar && cache.nombresEliminar.length) return cache.nombresEliminar;
  let res = await cargarJsonDeRepositorio("almacen/datos/nombres_eliminar.json", "master");
  if (!Array.isArray(res) || !res.length) {
    try {
      const buf = await leerArchivoLocal("datos/nombres_eliminar.json");
      if (buf) {
        const txt = new TextDecoder().decode(buf);
        res = JSON.parse(txt);
      }
    } catch (_) {
    }
  }
  if (!Array.isArray(res) || !res.length) {
    res = ["NATALIA GÁMEZ BAREA", "NATALIA GAMEZ BAREA", "XALO NICOLÁS MIRÓ", "XALO NICOLAS MIRO", "NICOLÁS MIRÓ", "NICOLAS MIRO"];
  }
  cache.nombresEliminar = Array.isArray(res) ? res : [];
  _markDataFresh('nombres');
  return cache.nombresEliminar;
}
async function getColegios() {
  await asegurarAlmacenGeneral();
  if (_dataFresh('colegios') && cache.colegios && cache.colegios.length) return cache.colegios;
  let res = await cargarJsonDeRepositorio("almacen/datos/colegios.json", "master");
  if (!Array.isArray(res) || !res.length) {
    try {
      const buf = await leerArchivoLocal("datos/colegios.json");
      if (buf) {
        const txt = new TextDecoder().decode(buf);
        res = JSON.parse(txt);
      }
    } catch (_) {
    }
  }
  if (!Array.isArray(res) || !res.length) { res = ["SAN JOSÉ OBRERO", "SAN JOSE OBRERO", "IES SAN JOSÉ OBRERO"]; }
  cache.colegios = Array.isArray(res) ? res : [];
  _markDataFresh('colegios');
  return cache.colegios;
}
async function getPalabrasProtegidas() {
  await asegurarAlmacenGeneral();
  if (_dataFresh('palabras') && cache.palabrasProtegidas) return cache.palabrasProtegidas;
  const res = await cargarJsonDeRepositorio("almacen/datos/palabras_protegidas.json", "master");
  cache.palabrasProtegidas = Array.isArray(res) ? res : [];
  _markDataFresh('palabras');
  return cache.palabrasProtegidas;
}
function key(g, a) { return g + "::" + String(a || "").split("/").pop(); }
function cleanName(a) {
  return String(a || "").replace(/\.pdf$/i, "").replace(/\s+/g, "_") + ".pdf";
}
const _contextoRamaCache = new Map();

async function cargarContextoRama(repo, branch, pathsDisponibles = []) {
  const cacheKey = repo + "::" + branch;
  if (!_dataCacheDisabled() && _contextoRamaCache.has(cacheKey)) {
    return _contextoRamaCache.get(cacheKey);
  }
  const mapa = new Map();
  const masterPathsPromise = ramasRepositorio(repo).then(async ramas => ramas.includes("master") ? tree(repo, "master") : []);

  await Promise.all(["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"].map(async (archivo) => {
    try {
      let origen = branch;
      let candidatos = Array.isArray(pathsDisponibles) ? pathsDisponibles : [];
      if (!candidatos.some(p => p.toLowerCase() === archivo.toLowerCase())) {
        const mp = await masterPathsPromise;
        if (mp.some(p => p.toLowerCase() === archivo.toLowerCase())) origen = "master";
        else return;
      }
      const x = await getContent(archivo, origen, repo);
      if (!x?.text) return;
      const filas = x.text.replace(/^\uFEFF/, "").split(/\r?\n/);
      if (!filas.length) return;
      const cab = filas.shift().split(",").map(v => v.replace(/^"|"$/g, "").trim().toUpperCase());
      const ia = cab.indexOf("ASIGNATURA"), it = cab.indexOf("TRIMESTRE"), ifile = cab.indexOf("ARCHIVO");
      if (ifile < 0) return;
      filas.forEach(linea => {
        if (!linea.trim()) return;
        let vals = [];
        if (window.Papa?.parse) vals = window.Papa.parse(linea, { delimiter: ",", quoteChar: '"' }).data?.[0] || [];
        else vals = linea.split(",");
        const archivos = String(vals[ifile] || "").split(/[,;]/).map(v => v.trim()).filter(Boolean);
        archivos.forEach(u => {
          const base = u.split("/").pop().toLowerCase();
          if (base) mapa.set(base, {
            asignatura: String(vals[ia] || "").trim(), trimestre: String(vals[it] || "").trim()
          });
        });
      });
    } catch (_) {}
  }));

  if (!_dataCacheDisabled()) {
    _contextoRamaCache.set(cacheKey, mapa);
  }
  return mapa;
}

async function listarRamasDatos(repo) {
  try {
    const ramas = await ramasRepositorio(repo);
    if (Array.isArray(ramas) && ramas.length) {
      return ramas.map(x => String(x || "").trim()).filter(r => r && r.toLowerCase() !== "master" && !/_limpia$/i.test(r));
    }
  } catch (_) {}
  return Object.keys(GRADOS);
}

function _normTextoBusquedaServidor(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const _buildDataCache = new Map();
const _BUILD_DATA_CACHE_TTL = 3 * 60 * 1000;

function _limpiarCacheBuildData() {
  try { _buildDataCache.clear(); } catch (_) {}
  try { _contextoRamaCache.clear(); } catch (_) {}
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("visor_admin_data_")) sessionStorage.removeItem(k);
    }
  } catch (_) {}
}
window.__VISOR_ADMIN_CLEAR_BUILD_DATA_CACHE = _limpiarCacheBuildData;

// filtroTexto: cuando se indica, buildData() se comporta como BÚSQUEDA DIRECTA:
// en lugar de construir la ficha completa de TODOS los archivos de la rama
// (lo que implica precargar miniaturas de cientos de PDFs antes de que el
// usuario pueda ver nada), solo procesa los archivos cuyo nombre coincide.
// Así el buscador no tiene que esperar a que cargue toda la rama.
async function buildData(ramaObjetivo = null, filtroTexto = "") {
  const c = await getConfig();
  const repo = c.repo;
  if (!repo) return {};

  const filtro = _normTextoBusquedaServidor(filtroTexto);
  const cacheKey = String(ramaObjetivo || "__TODAS__").trim();

  // Comprobar caché en memoria y sessionStorage si no es búsqueda con filtro
  if (!filtro && !_dataCacheDisabled()) {
    const mem = _buildDataCache.get(cacheKey);
    if (mem && (Date.now() - mem.savedAt < _BUILD_DATA_CACHE_TTL) && mem.data) {
      return mem.data;
    }
    try {
      const ses = sessionStorage.getItem("visor_admin_data_" + cacheKey);
      if (ses) {
        const parsed = JSON.parse(ses);
        if (parsed && (Date.now() - Number(parsed.savedAt || 0) < _BUILD_DATA_CACHE_TTL) && parsed.data) {
          _buildDataCache.set(cacheKey, { data: parsed.data, savedAt: parsed.savedAt });
          return parsed.data;
        }
      }
    } catch (_) {}
  }

  const coincideArchivo = (nombre) => !filtro || _normTextoBusquedaServidor(nombre).includes(filtro);

  // Obtener revision y lista de ramas en paralelo
  const [rev, ramasDisponibles] = await Promise.all([
    getRevision(),
    ramaObjetivo ? Promise.resolve([String(ramaObjetivo).trim()]) : listarRamasDatos(repo)
  ]);

  // Procesar todas las ramas concurrentemente en paralelo
  const fichasRamas = await Promise.all(
    ramasDisponibles.map(async (g) => {
      const gc = GRADOS[g] || { rama: g, limpia: g + "_limpia" };
      const [paths, rw] = await Promise.all([
        tree(repo, gc.rama),
        getRewrites(g)
      ]);
      const contextoRama = await cargarContextoRama(repo, gc.rama, paths);
      const pdfs = paths.filter(p => /\.pdf$/i.test(p) && (p.startsWith("archivos/") || p.startsWith("apuntes/")) && coincideArchivo(p.split("/").pop()));
      const entries = [], used = new Set();
      for (const e of (rw || []).filter(e => coincideArchivo(String(e.archivo || "").split("/").pop()))) {
        const a = String(e.archivo || "").split("/").pop();
        if (!a) continue;
        const rel = pdfs.find(p => p.split("/").pop() === a) || ("archivos/" + a);
        used.add(a);
        used.add(rel);
        const rr = rev[key(g, a)] || {};
        entries.push({
          idx: entries.length, archivo: a, rel_path: rel, carpeta: rel.includes("/") ? rel.split("/")[0] : "raíz",
          nombre_limpio: cleanName(a), cambia_nombre: cleanName(a) !== a, inc_nombre: !!rr.inc_renombre,
          inc_interior: rr.hasOwnProperty('inc_interior') ? rr.inc_interior !== false : true,
          inc_colegio: rr.hasOwnProperty('inc_colegio') ? rr.inc_colegio !== false : true,
          inc_internet: rr.hasOwnProperty('inc_internet') ? !!rr.inc_internet : false,
          inc_apunte: !!rr.inc_apunte || rel.startsWith("apuntes/"), nombre_apunte: rr.nombre_apunte || "",
          latex_compilado: !!rr.latex_compilado, asignatura: contextoRama.get(a.toLowerCase())?.asignatura || "",
          trimestre: contextoRama.get(a.toLowerCase())?.trimestre || "", old: e.start || "", new: e.new || "",
          start: e.start || "", end: e.end || "", enunciados: Array.isArray(e.enunciados) ? e.enunciados : [], enunciados_count: Array.isArray(e.enunciados) ? e.enunciados.length : 0,
          is_cv: false, cambia: !!(e.new || e.enunciados), include: e.include !== false, visto: !!rr.visto, decision: rr.decision || ""
        });
      }
      for (const p of pdfs) {
        const a = p.split("/").pop();
        if (used.has(a) || used.has(p)) continue;
        const rr = rev[key(g, a)] || {};
        entries.push({
          idx: entries.length, archivo: a, rel_path: p, carpeta: p.includes("/") ? p.split("/")[0] : "raíz",
          nombre_limpio: cleanName(a), cambia_nombre: cleanName(a) !== a, inc_nombre: !!rr.inc_renombre,
          inc_interior: rr.hasOwnProperty('inc_interior') ? rr.inc_interior !== false : true,
          inc_colegio: rr.hasOwnProperty('inc_colegio') ? rr.inc_colegio !== false : true,
          inc_internet: rr.hasOwnProperty('inc_internet') ? !!rr.inc_internet : false,
          inc_apunte: !!rr.inc_apunte || p.startsWith("apuntes/"), nombre_apunte: rr.nombre_apunte || "",
          latex_compilado: !!rr.latex_compilado, asignatura: contextoRama.get(a.toLowerCase())?.asignatura || "",
          trimestre: contextoRama.get(a.toLowerCase())?.trimestre || "", old: "", new: "", start: "", end: "",
          enunciados_count: 0, is_cv: false, cambia: false, include: rr.include !== false, visto: !!rr.visto, decision: rr.decision || ""
        });
      }
      return {
        g,
        ficha: { dir: g, titulo: g, total_archivos: entries.length, entries, no_cambian: [], _completo: !filtro }
      };
    })
  );

  const out = {};
  for (const item of fichasRamas) {
    if (item && item.g) out[item.g] = item.ficha;
  }

  // Guardar en caché si no es búsqueda con filtro y hay datos válidos
  if (!filtro && !_dataCacheDisabled() && Object.keys(out).length > 0) {
    const savedAt = Date.now();
    _buildDataCache.set(cacheKey, { data: out, savedAt });
    try {
      sessionStorage.setItem("visor_admin_data_" + cacheKey, JSON.stringify({ data: out, savedAt }));
    } catch (_) {}
  }

  return out;
}
// Guardados por archivo: evita dos PUT simultáneos sobre el mismo recurso.
