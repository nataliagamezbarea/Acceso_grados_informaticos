const _pdfBufferCache = new Map();
const _docInfoCache = new Map();
// Caché persistente: permite volver al visor después de cambiar de vista/pestaña
// o incluso después de que el documento HTML se haya vuelto a inicializar, sin
// tener que descargar otra vez el PDF desde GitHub. Los objetos MuPDF no se
// pueden persistir, por eso guardamos únicamente el ArrayBuffer y la información.
const _CACHE_DOCUMENTOS_DB = "visor-documentos-cache-v4";
const _CACHE_DOCUMENTOS_STORE = "documentos";
const _CACHE_DOCUMENTOS_TIMEOUT = 1200;
const _CACHE_PDF_TTL = 2 * 60 * 1000;
const _CACHE_DOCINFO_TTL = 30 * 1000;
function _visorCacheDisabled() {
  try { return window.visorAdminCacheDisabled?.() === true || window.__VISOR_ADMIN_CACHE_DISABLED === true; }
  catch (_) { return false; }
}
let _cacheDocumentosDBPromise = null;
function _conTimeout(promesa, ms = _CACHE_DOCUMENTOS_TIMEOUT) {
  return Promise.race([
    Promise.resolve(promesa),
    new Promise(resolve => setTimeout(() => resolve(null), ms))
  ]);
}
function _abrirCacheDocumentos() {
  if (_cacheDocumentosDBPromise) return _cacheDocumentosDBPromise;
  if (!window.indexedDB) return Promise.resolve(null);
  _cacheDocumentosDBPromise = new Promise(resolve => {
    let terminado = false;
    const finalizar = db => {
      if (terminado) return;
      terminado = true;
      resolve(db || null);
    };
    const temporizador = setTimeout(() => finalizar(null), _CACHE_DOCUMENTOS_TIMEOUT);
    try {
      const req = indexedDB.open(_CACHE_DOCUMENTOS_DB, 1);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(_CACHE_DOCUMENTOS_STORE)) db.createObjectStore(_CACHE_DOCUMENTOS_STORE);
        } catch (_) {}
      };
      req.onsuccess = () => { clearTimeout(temporizador); finalizar(req.result); };
      req.onerror = () => { clearTimeout(temporizador); finalizar(null); };
      req.onblocked = () => { clearTimeout(temporizador); finalizar(null); };
    } catch (_) {
      clearTimeout(temporizador);
      finalizar(null);
    }
  });
  return _cacheDocumentosDBPromise;
}
async function _leerCachePersistente(clave, ttl = _CACHE_PDF_TTL) {
  if (_visorCacheDisabled()) return null;
  const db = await _conTimeout(_abrirCacheDocumentos());
  if (!db) return null;
  return _conTimeout(new Promise(resolve => {
    try {
      const tx = db.transaction(_CACHE_DOCUMENTOS_STORE, "readonly");
      const req = tx.objectStore(_CACHE_DOCUMENTOS_STORE).get(clave);
      req.onsuccess = () => {
        const value = req.result || null;
        const savedAt = Number(value?.guardado || 0);
        const version = String(value?.cacheVersion || '');
        if (!value || version !== 'visor-admin-cache-v4' || !savedAt || Date.now() - savedAt >= ttl) return resolve(null);
        resolve(value);
      };
      req.onerror = () => resolve(null);
    } catch (_) { resolve(null); }
  }));
}
async function _limpiarCachePersistente() {
  const db = await _conTimeout(_abrirCacheDocumentos());
  if (!db) return false;
  return Boolean(await _conTimeout(new Promise(resolve => {
    try {
      const tx = db.transaction(_CACHE_DOCUMENTOS_STORE, "readwrite");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
      tx.objectStore(_CACHE_DOCUMENTOS_STORE).clear();
    } catch (_) { resolve(false); }
  })));
}
window.__VISOR_ADMIN_CLEAR_PERSISTENT_CACHE = _limpiarCachePersistente;
window.addEventListener('visor-admin-cache-changed', (e) => {
  if (e?.detail?.clear) {
    try { _pdfBufferCache.clear(); } catch (_) {}
    try { _docInfoCache.clear(); } catch (_) {}
    void _limpiarCachePersistente();
  }
});

async function _guardarCachePersistente(clave, valor) {
  if (_visorCacheDisabled()) return false;
  const db = await _conTimeout(_abrirCacheDocumentos());
  if (!db) return false;
  return Boolean(await _conTimeout(new Promise(resolve => {
    try {
      const tx = db.transaction(_CACHE_DOCUMENTOS_STORE, "readwrite");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
      tx.objectStore(_CACHE_DOCUMENTOS_STORE).put({ ...valor, cacheVersion: 'visor-admin-cache-v4' }, clave);
    } catch (_) { resolve(false); }
  })));
}

async function _obtenerBufferPDF(url, prioridadAlta = false) {
  if (!_visorCacheDisabled() && _pdfBufferCache.has(url)) {
    const cached = _pdfBufferCache.get(url);
    return cached.slice(0);
  }
  // Primero memoria persistente del navegador. Así cambiar de pestaña/vista no
  // obliga a volver a descargar el mismo PDF.
  const persistido = await _leerCachePersistente("pdf:" + url, _CACHE_PDF_TTL);
  if (persistido?.buffer) {
    const buffer = persistido.buffer instanceof ArrayBuffer
    ? persistido.buffer
    : persistido.buffer.buffer;
    if (buffer && buffer.byteLength > 0) {
      if (!_visorCacheDisabled()) _pdfBufferCache.set(url, buffer.slice(0));
      return buffer.slice(0);
    }
  }
  const opts = prioridadAlta && typeof Request === "function" ?  { priority: "high" }
  :  {
  }
  ;
  const resp = await fetch(url, { ...opts, cache: _visorCacheDisabled() ? 'no-store' : 'no-cache' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} cargando preview`);
  const buf = await resp.arrayBuffer();
  if (_pdfBufferCache.size > 48) {
    const firstKey = _pdfBufferCache.keys().next().value;
    _pdfBufferCache.delete(firstKey);
  }
  if (!_visorCacheDisabled()) _pdfBufferCache.set(url, buf.slice(0));
  // Guardado persistente en segundo plano: el primer render no debe quedarse
  // esperando a IndexedDB. El timeout del propio caché evita que un navegador
  // con IDB bloqueado congele el visor.
  void _guardarCachePersistente("pdf:" + url, { buffer: buf.slice(0), guardado: Date.now() });
  return buf;
}
async function _obtenerBufferPDFOriginal(rama, archivo, prioridadAlta = false, recargar = false) {
  if (!rama || !archivo) throw new Error('Faltan rama o archivo para cargar el PDF original');
  const qs = `archivo=${encodeURIComponent(archivo)}&mode=old&enc=1&int=0&col=0&net=0`;
  const url = `/api/preview/${encodeURIComponent(rama)}?${qs}${recargar ? `&__static_reload=${Date.now()}` : ''}`;
  return _obtenerBufferPDF(url, prioridadAlta);
}
async function _obtenerDocInfoJSON(url, prioridadAlta = false) {
  if (!_visorCacheDisabled() && _docInfoCache.has(url)) return _docInfoCache.get(url);
  const persistido = await _leerCachePersistente("info:" + url, _CACHE_DOCINFO_TTL);
  if (persistido?.valor) {
    if (!_visorCacheDisabled()) _docInfoCache.set(url, persistido.valor);
    return persistido.valor;
  }
  const opts = prioridadAlta && typeof Request === "function" ?  { priority: "high" }
  :  {
  }
  ;
  const resp = await fetch(url, { ...opts, cache: _visorCacheDisabled() ? 'no-store' : 'no-cache' });
  const json = await resp.json();
  if (_docInfoCache.size > 60) {
    const firstKey = _docInfoCache.keys().next().value;
    _docInfoCache.delete(firstKey);
  }
  if (!_visorCacheDisabled()) _docInfoCache.set(url, json);
  void _guardarCachePersistente("info:" + url, { valor: json, guardado: Date.now() });
  return json;
}
function precargarItemInmediato(it, prioridadAlta = true) {
  if (!it || !it.archivo) return;
  const ramaItem = it._rama || (typeof grad !== "undefined" ? grad : "");
  if (!ramaItem || ramaItem === "__TODAS__") return;
  const qsOld = `archivo=${encodeURIComponent(it.archivo)}&mode=old&enc=1&int=0&col=0&net=0`;
  _obtenerBufferPDF(`/api/preview/${encodeURIComponent(ramaItem)}?${qsOld}`, prioridadAlta)
  .then(() => _obtenerDocInfoJSON(`/api/doc_info/${encodeURIComponent(ramaItem)}?${qsOld}`, prioridadAlta).catch(() =>  {
  }
  ))
  .catch(() =>  {
  }
  );
}
let _prefetchTimeout = null;
function dispararPrecargaProximos() {
  if (_prefetchTimeout) clearTimeout(_prefetchTimeout);
  _prefetchTimeout = setTimeout(() =>  {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => _ejecutarPrecargaProximos(),  { timeout: 1500 }
  );
    } else {
      setTimeout(_ejecutarPrecargaProximos, 200);
    }
  }
  , 250);
}
function _ejecutarPrecargaProximos() {
  if (!Array.isArray(ITEMS) || POS < 0) return;
  const lista = (typeof obtenerItemsBusqueda === "function") ? obtenerItemsBusqueda() : ITEMS;
  const archivoActual = ITEMS[POS]?.archivo;
  let posLista = lista.findIndex(x => x.archivo === archivoActual);
  if (posLista < 0) posLista = 0;
  const candidatos = [posLista + 1, posLista - 1, posLista + 2, posLista + 3].filter(idx => idx >= 0 && idx < lista.length);
  candidatos.forEach(idx =>  {
    const it = lista[idx];
    if (it) precargarItemInmediato(it, false);
  }
  );
}
function precargarPrimerosOriginales(priorizarBusqueda = true) {
  if (!Array.isArray(ITEMS) || ITEMS.length === 0) return;
  const lista = (typeof obtenerItemsBusqueda === "function") ? obtenerItemsBusqueda() : ITEMS;
  if (!lista.length) return;
  // Cargar con máxima prioridad los dos primeros resultados encontrados
  const prioritarios = lista.slice(0, 3);
  prioritarios.forEach(it => precargarItemInmediato(it, true));
  // Y en segundo plano los siguientes
  const siguientes = lista.slice(3, 8);
  siguientes.forEach(it => precargarItemInmediato(it, false));
}
window.precargarPrimerosOriginales = precargarPrimerosOriginales;
window.precargarItemInmediato = precargarItemInmediato;
window._obtenerBufferPDFOriginal = _obtenerBufferPDFOriginal;
window._pdfBufferCache = _pdfBufferCache;
window._docInfoCache = _docInfoCache;
