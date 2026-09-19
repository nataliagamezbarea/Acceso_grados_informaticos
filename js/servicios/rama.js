window.RamaActual = window.RamaActual || (() =>  {
  const CLAVE_LOCAL = 'rama_actual';
  const CLAVE_FORZAR_SELECTOR = 'forzar_selector_rama';
  const esPantallaSelector = () =>  {
    const ruta = String(window.location.pathname || '').toLowerCase();
    return ruta === '/' || ruta.endsWith('/index.html') || ruta.includes('/inicio');
  }
  ;
  const estaForzadoSelector = () =>  {
    try { return esPantallaSelector() && sessionStorage.getItem(CLAVE_FORZAR_SELECTOR) === '1'; }
    catch (_) { return false; }
  }
  ;
  const obtener = () =>  {
    if (estaForzadoSelector()) return '';
    const q = new URLSearchParams(location.search).get('rama');
    if (q?.trim()) {
      guardar(q.trim());
      return q.trim();
    }
    try { const ctx = window.Estado?.leerContexto?.() ||  { }
      ;
      if (ctx.rama && String(ctx.rama).trim()) return String(ctx.rama).trim();
    } catch (_) {
    }
    try {
      const local = localStorage.getItem(CLAVE_LOCAL) || '';
      return local.trim();
    } catch (_) {
      return '';
    }
  }
  ;
  const guardar = (rama) =>  {
    const r = String(rama || '').trim();
    try {
      if (r) {
        localStorage.setItem(CLAVE_LOCAL, r);
        sessionStorage.removeItem(CLAVE_FORZAR_SELECTOR);
      } else {
        localStorage.removeItem(CLAVE_LOCAL);
      }
    } catch (_) {
    }
    try { window.Estado?.guardar?.('rama', r); }
    catch (_) { } }
  ;
  const limpiar = () =>  {
    try { localStorage.removeItem(CLAVE_LOCAL); }
    catch (_) {
    }
    try { sessionStorage.setItem(CLAVE_FORZAR_SELECTOR, '1'); }
    catch (_) {
    }
    try { window.Estado?.guardar?.('rama', ''); }
    catch (_) { } }
  ;
  const poblarSelector = async (select) =>  {
    const ramas = await (window.RamaAPI?.poblarSelector
    ? window.RamaAPI.poblarSelector(select)
    : Promise.resolve([]));
    const actual = obtener();
    if (actual && actual !== 'TODAS LAS RAMAS' && actual !== 'TODAS_LAS_RAMAS_' && actual !== '__TODAS__' && !Array.from(select.options).some(o => o.value === actual)) {
      const o = document.createElement('option');
      o.value = actual;
      o.textContent = actual;
      select.appendChild(o);
    }
    select.value = actual || '';
    return ramas;
  }
  ;
  return  {
    obtener,
    guardar,
    limpiar,
    estaForzadoSelector,
    listarRamas: () => window.RamaAPI?.listarRamas?.() || Promise.resolve([]),
    poblarSelector
  }
  ;
}
)();
