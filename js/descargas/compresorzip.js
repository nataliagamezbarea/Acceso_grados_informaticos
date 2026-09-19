/* Rama de descarga: NUNCA se obtiene de la URL.
   Se usa únicamente el estado/selector actual de la aplicación. */
if (typeof window.ramaActual !== "function") {
window.ramaActual = function ramaActual() {
    try {
      const deEstado = window.Estado?.obtener?.("rama");
      if (deEstado) return String(deEstado).trim();
    } catch (_) {}
    try {
      const deRama = window.RamaActual?.obtener?.();
      if (deRama) return String(deRama).trim();
    } catch (_) {}
    return "";
  };
}


async function cargarJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    s.onload = () => res(window.JSZip);
    s.onerror = () => rej(new Error("Error al cargar JSZip"));
    document.head.appendChild(s);
  });
}

function conMimeCorrecto(blob, nombre) {
  if (!blob) return blob;
  const n = (nombre || "").toLowerCase();
  let t = blob.type;
  if (n.endsWith(".pdf")) t = "application/pdf";
  else if (n.endsWith(".png")) t = "image/png";
  else if (n.endsWith(".jpg") || n.endsWith(".jpeg")) t = "image/jpeg";
  else if (n.endsWith(".webp")) t = "image/webp";
  else if (n.endsWith(".txt")) t = "text/plain";
  else if (n.endsWith(".md")) t = "text/markdown";
  else if (n.endsWith(".html") || n.endsWith(".htm")) t = "text/html";
  else if (n.endsWith(".css")) t = "text/css";
  else if (n.endsWith(".js")) t = "application/javascript";
  else if (n.endsWith(".json")) t = "application/json";
  else if (n.endsWith(".zip")) t = "application/zip";
  if (t !== blob.type) return new Blob([blob], { type: t });
  return blob;
}

function carpetaPadre(url) {
  if (!url) return "";
  const limpia = url.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const idx = limpia.lastIndexOf("/");
  return idx > 0 ? limpia.slice(0, idx) : "";
}

/*
 * LÓGICA DE DESCARGA
 *
 * - Una URL web (YouTube, Genially, Prezi, Figma, GitHub repo, etc.)
 *   NO se descarga como archivo.
 * - Una ruta interna se obtiene mediante fetchArchivoDesdeGitHub().
 * - Una URL directa de archivo/raw sí se obtiene mediante fetch().
 * - Las descargas masivas generan un ZIP solo con los archivos que realmente
 *   se han podido obtener.
 */

/* ===== DESCARGA REAL: misma lógica que el proyecto de referencia =====
   Las rutas /archivo/... son archivos del repositorio.
   Las URL https externas son enlaces y NO se descargan.
*/
function _ramaParaDescarga() {
  // IMPORTANTE: NO leer la rama desde la URL.
  try {
    const ctx = window.Estado?.leerContexto?.() || {};
    if (ctx.rama && String(ctx.rama).trim()) return String(ctx.rama).trim();
  } catch (_) {}
  try {
    const r = sessionStorage.getItem("app_rama") || "";
    if (r.trim()) return r.trim();
  } catch (_) {}
  try {
    const r = localStorage.getItem("rama_actual") || "";
    if (r.trim()) return r.trim();
  } catch (_) {}
  return "";
}

function _repoParaDescarga() {
  const c = window.GITHUB_CONFIG || {};
  return String(c.repo || window.GITHUB_REPO || "").trim();
}

function _tokenParaDescarga() {
  const c = window.GITHUB_CONFIG || {};
  try {
    if (typeof c.obtenerTokenSeguro === "function") return c.obtenerTokenSeguro() || "";
  } catch (_) {}
  return c.token || "";
}

async function _configGitHubDescarga() {
  // GitHub SOLO desde Supabase. Claves exactas: gh_repo_general y gh_token.
  if (typeof window.obtenerConfigGitHubDescarga === "function") {
    const cfg = await window.obtenerConfigGitHubDescarga();
    if (cfg?.repo && cfg?.token) return cfg;
  }
  throw new Error("No se pudo obtener gh_repo_general y gh_token desde Supabase");
}

function _normalizarRamaDescarga(rama) {
  const r = String(rama || "").trim();
  if (!r || r === "TODAS LAS RAMAS" || r === "TODAS_LAS_RAMAS_" || r === "__TODAS__") return "";
  return r;
}

async function _listarRamasParaDescarga(cfg) {
  try {
    if (window.RamaAPI && typeof window.RamaAPI.listarRamas === "function") {
      const ramas = await window.RamaAPI.listarRamas();
      if (Array.isArray(ramas) && ramas.length) return ramas.map(String).map(x => x.trim()).filter(Boolean);
    }
  } catch (_) {}

  const repo = String(cfg?.repo || "").trim();
  if (!repo) return [];
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "grados-informaticos" };
  if (cfg.token) headers.Authorization = "Bearer " + cfg.token;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/branches?per_page=100`, { headers, cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(x => String(x?.name || "").trim()).filter(Boolean);
  } catch (_) {
    return [];
  }
}

async function _fetchGitHubRawPorRama(path, cfg, rama, signal) {
  const repo = String(cfg?.repo || "").trim();
  if (!repo) throw new Error("Falta gh_repo en la configuración de GitHub");

  const cleanPath = String(path || "").replace(/^\/+/, "");
  const partes = cleanPath.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  if (!partes) throw new Error("Ruta vacía");

  let api = `https://api.github.com/repos/${repo}/contents/${partes}`;
  const ref = _normalizarRamaDescarga(rama);
  if (ref) api += `?ref=${encodeURIComponent(ref)}`;

  const headers = {
    Accept: "application/vnd.github.raw",
    "User-Agent": "grados-informaticos"
  };
  if (cfg.token) headers.Authorization = "Bearer " + cfg.token;

  const res = await fetch(api, { headers, cache: "no-store", signal });
  if (!res.ok) throw new Error(`No se pudo leer el archivo (${res.status})${ref ? ` en rama ${ref}` : ""}`);
  return await res.blob();
}

async function _resolverRamaRealDescarga(cfg, rama) {
  const candidata = _normalizarRamaDescarga(rama);
  const ramas = await _listarRamasParaDescarga(cfg);
  if (!candidata) return "";
  if (ramas.includes(candidata)) return candidata;
  // Rama obsoleta (por ejemplo, una rama de pruebas eliminada): no volver a
  // consultar GitHub con ella. Se limpia la selección persistida y se deja
  // que GitHub use la rama por defecto.
  try { localStorage.removeItem("rama_actual"); } catch (_) {}
  try { sessionStorage.removeItem("app_rama"); } catch (_) {}
  return "";
}

async function fetchArchivoDesdeGitHub(ruta, nombre, rama, signal) {
  if (signal?.aborted) throw new DOMException("Descarga cancelada", "AbortError");

  const cfg = await _configGitHubDescarga();
  const path = String(ruta || "").replace(/^\/+/, "").trim();
  const ref = await _resolverRamaRealDescarga(cfg, rama);

  if (!path || /^(?:1|2|3)[º°]$/.test(path)) {
    throw new Error("Ruta no es un archivo: " + path);
  }

  if (signal?.aborted) throw new DOMException("Descarga cancelada", "AbortError");

  // Con rama seleccionada, se consulta exactamente esa rama.
  if (ref) return await _fetchGitHubRawPorRama(path, cfg, ref, signal);

  // Selector vacío = TODAS LAS RAMAS. No se deduce ninguna rama desde la URL.
  const ramas = await _listarRamasParaDescarga(cfg);
  let ultimoError = null;
  for (const candidata of ramas) {
    if (signal?.aborted) throw new DOMException("Descarga cancelada", "AbortError");
    try {
      return await _fetchGitHubRawPorRama(path, cfg, candidata, signal);
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      ultimoError = e;
    }
  }

  if (signal?.aborted) throw new DOMException("Descarga cancelada", "AbortError");

  // Último intento contra la rama por defecto de GitHub si no pudimos listar ramas.
  try {
    return await _fetchGitHubRawPorRama(path, cfg, "", signal);
  } catch (e) {
    ultimoError = e;
  }
  throw (ultimoError || new Error("No se pudo obtener el archivo de GitHub"));
}

window.fetchArchivoDesdeGitHub = window.fetchArchivoDesdeGitHub || fetchArchivoDesdeGitHub;

function _esEnlaceExternoNoArchivo(url) {
  return /^https?:\/\//i.test(String(url || "")) &&
         !/^https:\/\/raw\.githubusercontent\.com\//i.test(String(url || "")) &&
         !/^https:\/\/api\.github\.com\//i.test(String(url || ""));
}

async function obtenerBlobDescargable(url, rama, signal) {
  const __u = String(url || "");
  // "2º", "1º", etc. are UI grouping labels, never files.
  if (/^\s*\d+[º°]\s*$/.test(__u.trim())) {
    return null;
  }

  const u = __u.trim();
  if (!u) throw new Error("URL/ruta vacía");

  // URL externa: NO se descarga. Es un enlace.
  if (_esEnlaceExternoNoArchivo(u)) {
    throw new Error("Enlace externo; no es un archivo del repositorio");
  }

  // Todo archivo de GitHub pasa por el adaptador autenticado (con señal de cancelación).
  const res = await fetchArchivoDesdeGitHub(u, null, rama, signal);
  return res;
}

async function descargarArchivo(url, nombre, rama) {
  const controller = null;
  const u = String(url || "").trim();
  if (_esEnlaceExternoNoArchivo(u)) {
    window.open(u, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const blob = conMimeCorrecto(await obtenerBlobDescargable(u, rama), nombre);
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = nombre || "archivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
  } catch (e) {
    console.error("No se pudo descargar:", u, e);
    if (typeof window.mostrarNotificacionDescarga === "function")
      window.mostrarNotificacionDescarga("No se pudo descargar el archivo.", 100, `archivo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    else alert("No se pudo descargar el archivo.");
  }
}

window.obtenerBlobDescargable = obtenerBlobDescargable;
window.descargarArchivo = descargarArchivo;

const __controladoresDescarga = window.__controladoresDescarga || (window.__controladoresDescarga = new Map());

function __jobCancelado(jobId) {
  return !!(window._descargasCanceladas && window._descargasCanceladas.has(jobId));
}

function __crearControladorDescarga(jobId) {
  if (typeof AbortController === "undefined") return null;
  const c = new AbortController();
  __controladoresDescarga.set(jobId, c);
  return c;
}

function __limpiarControladorDescarga(jobId) {
  __controladoresDescarga.delete(jobId);
}

function __finalizarCancelacion(jobId) {
  if (window._descargasCanceladas) window._descargasCanceladas.delete(jobId);
  __limpiarControladorDescarga(jobId);
}

async function descargarTodosArchivos(lista, onEstado, opciones) {
  const opts = opciones || {};
  const jobId = opts.jobId || `dl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  // NO borrar aquí la marca de cancelación: si el trabajo fue cancelado mientras
  // esperaba en la cola, debe saltarse y no volver a descargar.
  if (__jobCancelado(jobId)) {
    if (typeof window.mostrarNotificacionDescarga === "function")
      window.mostrarNotificacionDescarga("Descarga cancelada.", 100, jobId);
    if (typeof onEstado === "function") onEstado("Descarga cancelada.", 100, 0, lista?.length || 0);
    __finalizarCancelacion(jobId);
    return;
  }
  const controller = __crearControladorDescarga(jobId);

  const nombreZip = opts.nombreZip || `material_${new Date().toISOString().slice(0, 10)}.zip`;
  if (!lista || !lista.length) {
    const msg = "Sin archivos para descargar.";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msg, 100, jobId);
    if (typeof onEstado === "function") onEstado(msg, 100, 0, 0);
    __limpiarControladorDescarga(jobId);
    return;
  }

  try {
    const msgPrep = `Preparando ${lista.length} archivos...`;
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgPrep, 5, jobId);
    if (typeof onEstado === "function") onEstado(msgPrep, 5, 0, lista.length);

    const JSZip = await cargarJSZip();
    const zip = new JSZip();
    let incluidos = 0;

    for (let i = 0; i < lista.length; i++) {
      const item = typeof lista[i] === "string" ? { url: lista[i] } : (lista[i] || {});
      const url = String(item.url || item.URL || item.enlace || "").trim();
      const nombre = item.nombre || item.NOMBRE || item.archivo || item.ARCHIVO || url.split("/").pop()?.split("?")[0] || "archivo";
      const actualNum = i + 1;
      const pct = Math.round((actualNum / lista.length) * 85);
      const pctDisplay = Math.round((actualNum / lista.length) * 100);
      const msgProgreso = `Descargando ${actualNum}/${lista.length} archivos`;

      if (__jobCancelado(jobId)) {
        const msgCan = "Descarga cancelada.";
        if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, pctDisplay || pct, jobId);
        if (typeof onEstado === "function") onEstado(msgCan, pctDisplay || pct, i, lista.length);
        __finalizarCancelacion(jobId);
        return;
      }

      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgProgreso, pct, jobId);
      if (typeof onEstado === "function") onEstado(msgProgreso, pctDisplay, actualNum, lista.length);

      // Las webs externas son enlaces: no se descargan ni se incluyen en el ZIP.
      if (_esEnlaceExternoNoArchivo(url)) continue;

      try {
        const rama = item.rama || opts.rama || "";
        const blob = conMimeCorrecto(await obtenerBlobDescargable(url, rama, controller?.signal), nombre);
        const sub = item.carpeta || "";
        const rutaPadre = carpetaPadre(url);
        const ruta = [sub, rutaPadre, nombre].filter(Boolean).join("/");
        zip.file(ruta, blob);
        incluidos++;
      } catch (e) {
        // Si la cancelación abortó justo el archivo que se estaba descargando,
        // no seguir con el siguiente ni tratarlo como un simple fallo de archivo:
        // hay que detener el trabajo ya mismo para que la animación pare al instante.
        if (e?.name === "AbortError" || __jobCancelado(jobId)) {
          const msgCan = "Descarga cancelada.";
          if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, pctDisplay || pct, jobId);
          if (typeof onEstado === "function") onEstado(msgCan, pctDisplay || pct, i, lista.length);
          __finalizarCancelacion(jobId);
          return;
        }
        console.error("No se pudo añadir al ZIP:", url, e);
      }
    }

    if (__jobCancelado(jobId)) {
      const msgCan = "Descarga cancelada.";
      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, 85, jobId);
      if (typeof onEstado === "function") onEstado(msgCan, 85, lista.length, lista.length);
      __finalizarCancelacion(jobId);
      return;
    }

    if (!incluidos) {
      const msgVacio = "No se ha incluido ningún archivo descargable.";
      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgVacio, 100, jobId);
      if (typeof onEstado === "function") onEstado(msgVacio, 100, lista.length, lista.length);
      __limpiarControladorDescarga(jobId);
      return;
    }

    const msgZip = "Generando paquete ZIP...";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgZip, 92, jobId);
    if (typeof onEstado === "function") onEstado(msgZip, 92, lista.length, lista.length);

    const blob = await zip.generateAsync({ type: "blob" });
    // generateAsync no se puede abortar: si mientras tanto se canceló, el ZIP
    // ya generado se descarta en vez de descargarse igualmente.
    if (__jobCancelado(jobId)) {
      const msgCan = "Descarga cancelada.";
      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, 92, jobId);
      if (typeof onEstado === "function") onEstado(msgCan, 92, lista.length, lista.length);
      __finalizarCancelacion(jobId);
      return;
    }
    const objUrl = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = objUrl;
    enlace.download = nombreZip;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);

    __finalizarCancelacion(jobId);
    const msgDone = "¡Descarga completada!";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgDone, 100, jobId);
    if (typeof onEstado === "function") onEstado(msgDone, 100, lista.length, lista.length);
  } catch (e) {
    const fueCancelada = e?.name === "AbortError" || __jobCancelado(jobId);
    __limpiarControladorDescarga(jobId);
    if (fueCancelada) {
      __finalizarCancelacion(jobId);
      const msgCan = "Descarga cancelada.";
      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, 100, jobId);
      if (typeof onEstado === "function") onEstado(msgCan, 100, 0, lista?.length || 0);
      return;
    }
    console.error(e);
    const msgErr = "Error al generar ZIP";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgErr, 100, jobId);
    if (typeof onEstado === "function") onEstado(msgErr, 100, 0, 0);
  }
}

window.cargarJSZip = cargarJSZip;
window.conMimeCorrecto = conMimeCorrecto;
window.carpetaPadre = carpetaPadre;
window.obtenerBlobDescargable = obtenerBlobDescargable;
window.descargarArchivo = descargarArchivo;
window.descargarTodosArchivos = descargarTodosArchivos;
