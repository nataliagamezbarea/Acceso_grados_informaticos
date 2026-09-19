/*
 * CONTROL CENTRAL DE CACHÉ DEL VISOR-ADMIN
 *
 * Hay varias capas de caché en el visor (Map en memoria, IndexedDB y cachés
 * de árbol/contenido de GitHub). Antes no existía realmente toggleCache(),
 * por lo que la casilla "Caché desactivada" no controlaba esas capas.
 */
(function () {
  'use strict';

  const KEY = 'visor_admin_cache_disabled';
  const EVENT = 'visor-admin-cache-changed';
  const VERSION = 'visor-admin-cache-v4';

  function disabled() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }

  function setDisabled(value, options = {}) {
    const next = !!value;
    try {
      if (next) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
      localStorage.setItem('visor_admin_cache_version', VERSION);
    } catch (_) {}

    window.__VISOR_ADMIN_CACHE_DISABLED = next;
    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { disabled: next, clear: options.clear !== false } }));
    } catch (_) {}
    actualizarUI();
    return next;
  }

  function clearAll() {
    try { window._pdfBufferCache?.clear?.(); } catch (_) {}
    try { window._docInfoCache?.clear?.(); } catch (_) {}
    try { window.__VISOR_ADMIN_CLEAR_PERSISTENT_CACHE?.(); } catch (_) {}
    try { window.__VISOR_ADMIN_CLEAR_API_CACHE?.(); } catch (_) {}
  }

  function toggleCache(checked) {
    // La casilla se llama "Caché desactivada": checked=true => desactivar.
    setDisabled(checked, { clear: true });
    if (checked) clearAll();
  }

  function actualizarUI() {
    const cb = document.getElementById('cbCacheDesactivada');
    const txt = document.getElementById('dev-cache-toggle-text');
    const off = disabled();
    if (cb) cb.checked = off;
    if (txt) {
      txt.innerHTML = off
        ? '<i class="fa-solid fa-ban"></i> Caché desactivada'
        : '<i class="fa-solid fa-database"></i> Caché activa';
    }
  }

  function initCacheToggle() {
    window.__VISOR_ADMIN_CACHE_DISABLED = disabled();
    actualizarUI();
  }

  // Si otra pestaña cambia la casilla, ambas quedan sincronizadas.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    window.__VISOR_ADMIN_CACHE_DISABLED = disabled();
    clearAll();
    actualizarUI();
  });

  // Una escritura importante (GitHub) puede invalidar las cachés de datos.
  window.addEventListener(EVENT, (e) => {
    if (e?.detail?.clear) clearAll();
  });

  window.__VISOR_ADMIN_CACHE_VERSION = VERSION;
  window.__VISOR_ADMIN_CACHE_DISABLED = disabled();
  window.visorAdminCacheDisabled = disabled;
  window.setVisorAdminCacheDisabled = setDisabled;
  window.toggleCache = toggleCache;
  window.initCacheToggle = initCacheToggle;
  window.clearVisorAdminCache = clearAll;
})();
