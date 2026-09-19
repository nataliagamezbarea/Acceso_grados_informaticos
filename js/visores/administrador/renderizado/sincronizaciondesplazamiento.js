/* SCROLL SINCRONIZADO Y AUTO-FIT — ALINEACIÓN INSTANTÁNEA (SIN RETRASO) */
let _syncScrollSource = null;
let _syncRaf = null;
let _restauracionVisoresPendiente = null;
// Guardar posición de página para móvil
let _posicionCompartida =  { idx: 0, offsetPct: 0 }
;
function initSynchronizedScrolling() {
  const left = document.getElementById('viewerOld');
  const right = document.getElementById('viewerNew');
  if (!left || !right) return;
  function _obtenerInfoPagina(viewer) {
    const pages = viewer.querySelectorAll('.doc-page');
    if (!pages.length) return  { idx: 0, offsetPct: 0 }
    ;
    const vTop = viewer.scrollTop;
    const vMid = vTop + (viewer.clientHeight || 400) * 0.35;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pTop = page.offsetTop;
      const pHeight = page.offsetHeight || 1;
      if (vMid >= pTop && vMid < pTop + pHeight) {
        return  { idx: i, offsetPct: Math.max(0, Math.min(1, (vMid - pTop) / pHeight)) }
        ;
      }
    }
    return  { idx: pages.length - 1, offsetPct: 1 }
    ;
  }
  function _aplicarInfoPagina(target, info) {
    const pages = target.querySelectorAll('.doc-page');
    if (!pages.length) return;
    const targetIdx = Math.min(info.idx, pages.length - 1);
    const page = pages[targetIdx];
    if (!page) return;
    const pHeight = page.offsetHeight || 1;
    const targetTop = page.offsetTop + (pHeight * info.offsetPct) - ((target.clientHeight || 400) * 0.35);
    target.scrollTop = Math.max(0, targetTop);
  }
  const sincronizar = (source, target) =>  {
    if (_syncScrollSource && _syncScrollSource !== source) return;
    _syncScrollSource = source;
    const info = _obtenerInfoPagina(source);
    _posicionCompartida = info;
    // Sincronización inmediata vía requestAnimationFrame: CERO retraso
    if (_syncRaf) cancelAnimationFrame(_syncRaf);
    _syncRaf = requestAnimationFrame(() =>  {
      _aplicarInfoPagina(target, info);
      _syncScrollSource = null;
    }
  );
  }
  ;
  left.onscroll = () => sincronizar(left, right);
  right.onscroll = () => sincronizar(right, left);
  // Soporte táctil / touch en móvil para que sincronice en tiempo real durante el arrastre
  left.ontouchmove = () => sincronizar(left, right);
  right.ontouchmove = () => sincronizar(right, left);
}
// Función global para sincronizar al cambiar de pestaña en móvil
window._restaurarScrollTabMovil = function(nuevoViewerId) {
  const target = document.getElementById(nuevoViewerId);
  if (!target) return;
  requestAnimationFrame(() =>  {
    const pages = target.querySelectorAll('.doc-page');
    if (!pages.length) return;
    const targetIdx = Math.min(_posicionCompartida.idx, pages.length - 1);
    const page = pages[targetIdx];
    if (page) {
      const pHeight = page.offsetHeight || 1;
      const targetTop = page.offsetTop + (pHeight * _posicionCompartida.offsetPct) - ((target.clientHeight || 400) * 0.35);
      target.scrollTop = Math.max(0, targetTop);
    }
  }
  );
}
;
let _resizeReloadTimer = null;
let _visorResizeObservers = [];
let _visorResizeHandler = null;
function initResizeAutoFit() {
  const oldEl = document.getElementById('viewerOld');
  const newEl = document.getElementById('viewerNew');
  const oldBox = oldEl?.closest('.ovcol') || oldEl?.parentElement;
  const newBox = newEl?.closest('.ovcol') || newEl?.parentElement;
  if (!oldEl || !newEl) return;
  _visorResizeObservers.forEach(o =>  {
    try { o.disconnect(); }
    catch (_) { } }
  );
  _visorResizeObservers = [];
  let lastW = Math.round(oldBox?.clientWidth || oldEl.clientWidth || 0);
  let lastH = Math.round(oldBox?.clientHeight || oldEl.clientHeight || 0);
  let lastW2 = Math.round(newBox?.clientWidth || newEl.clientWidth || 0);
  let lastH2 = Math.round(newBox?.clientHeight || newEl.clientHeight || 0);
  const solicitarRender = () =>  {
    clearTimeout(_resizeReloadTimer);
    _resizeReloadTimer = setTimeout(() =>  {
      const ov = document.getElementById('ov');
      if (ov && ov.classList.contains('on') && typeof openPos === 'function' && typeof POS !== 'undefined') {
        // Solo se re-renderiza tras un cambio REAL del contenedor exterior.
        // Nunca por cambios producidos por el propio canvas/paginación.
        openPos(POS);
      }
    }
    , 220);
  }
  ;
  const onResizeBox = (which, rect) =>  {
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (which === 0) {
      if (Math.abs(w-lastW) < 3 && Math.abs(h-lastH) < 3) return;
      lastW=w;
      lastH=h;
    } else {
      if (Math.abs(w-lastW2) < 3 && Math.abs(h-lastH2) < 3) return;
      lastW2=w;
      lastH2=h;
    }
    solicitarRender();
  }
  ;
  if (typeof ResizeObserver === 'function') {
    [oldBox, newBox].forEach((box, i) =>  {
      if (!box) return;
      const ro = new ResizeObserver(entries =>  {
        const r = entries && entries[0] && entries[0].contentRect;
        if (r) onResizeBox(i, r);
      }
  );
      ro.observe(box);
      _visorResizeObservers.push(ro);
    }
  );
  }
  const onResize = () =>  {
    const w1 = Math.round(oldBox?.clientWidth || oldEl.clientWidth || 0);
    const h1 = Math.round(oldBox?.clientHeight || oldEl.clientHeight || 0);
    const w2 = Math.round(newBox?.clientWidth || newEl.clientWidth || 0);
    const h2 = Math.round(newBox?.clientHeight || newEl.clientHeight || 0);
    if (Math.abs(w1-lastW)>=3 || Math.abs(h1-lastH)>=3 || Math.abs(w2-lastW2)>=3 || Math.abs(h2-lastH2)>=3) {
      lastW=w1;
      lastH=h1;
      lastW2=w2;
      lastH2=h2;
      solicitarRender();
    }
  }
  ;
  if (_visorResizeHandler) window.removeEventListener('resize', _visorResizeHandler);
  _visorResizeHandler = onResize;
  window.addEventListener('resize', _visorResizeHandler,  { passive: true }
  );
}
function capturarPosicionVisores() {
  const left = document.getElementById('viewerOld');
  const right = document.getElementById('viewerNew');
  return  {
    leftTop: left ? left.scrollTop : 0,
    rightTop: right ? right.scrollTop : 0
  }
  ;
}
function pedirRestauracionVisores(pos) { _restauracionVisoresPendiente = pos; }
function consumirRestauracionVisor(containerId) {
  if (!_restauracionVisoresPendiente) return;
  const el = document.getElementById(containerId);
  if (!el) return;
  if (containerId === 'viewerOld') el.scrollTop = _restauracionVisoresPendiente.leftTop || 0;
  if (containerId === 'viewerNew') el.scrollTop = _restauracionVisoresPendiente.rightTop || 0;
}
