const _estadoPDFJS =  {
}
, _loadTokens =  {
}
;
// nombre histórico; ahora contiene exclusivamente estado MuPDF.js
const _estadoZoomMUPDF =  {
  viewerOld:  { modo:'fit', escala:null }
  , viewerNew:  { modo:'fit', escala:null }
}
;
let currentDocPages = [];
function loadDocViewer(containerId, isLeft, enc, int, col, netVal, force = false) {
  const it = ITEMS[POS], el = document.getElementById(containerId);
  if (!it || !el) return Promise.resolve();
  const keyBase = `${it._rama || grad || ''}::${it.archivo || ''}::${isLeft ? 'L' : 'R'}::${enc}::${int}::${col}::${netVal}`;
  const key = force ? `${keyBase}::reload-${Date.now()}` : keyBase;
  const previo = _estadoPDFJS[containerId];
  // Si el visor sigue vivo, no vuelvas a pintar ni muestres el spinner. Esto es
  // importante al salir a otra vista y regresar al documento: el PDF ya está
  // abierto en MuPDF y se reutiliza exactamente el mismo canvas/DOM.
  if (!force && previo && previo.doc && previo.key === key && !previo.loading) {
    el.style.visibility = 'visible';
    return Promise.resolve();
  }
  return loadDocViewerPDFJS(containerId, isLeft, el, it, 'old', enc, int, col, netVal, key);
}
async function loadDocViewerPDFJS(containerId, isLeft, el, it, mode, enc, int, col, netVal, requestKey = '') {
  if (!el) return;
  const previo = _estadoPDFJS[containerId];
  if (previo?.loading && previo.requestKey === requestKey) return previo.promise || Promise.resolve();
  if (previo && previo.doc) {
    try { previo.doc.destroy(); }
    catch (_e) { } }
  const token = ++_loadTokens[containerId] || (_loadTokens[containerId] = 1);
  const marcador =  { doc: null, loading: true, requestKey, key: requestKey, isLeft }
  ;
  _estadoPDFJS[containerId] = marcador;
  const textoCarga = isLeft ? 'Cargando documento original...' : 'Cargando documento limpio...';
  el.innerHTML = `<div class="doc-viewer-loading" role="status" aria-live="polite"><div class="doc-viewer-loading-mark"><div class="visor-spinner-anillo visor-spinner-documento"></div></div><div class="doc-viewer-loading-text"><strong>${textoCarga}</strong></div></div>`;
  const headerEl = isLeft ? document.getElementById('headerViewerOld') : document.getElementById('headerViewerNew');
  const tituloBase = isLeft ? '<i class="fa-solid fa-file-lines"></i> 1. ORIGINAL' : '<i class="fa-solid fa-wand-magic-sparkles"></i> 2. CÓMO QUEDARÍA';
  if (headerEl) { instalarControlesZoomMuPDF(containerId, el); }
  try {
    // IMPORTANTE: el visor derecho NO debe cargar un PDF de la rama *_limpia.
    // DDDDD trabaja renderizando el PDF ORIGINAL en canvas y aplicando encima
    // el plan de sustitución/reflujo. Por eso ambos visores parten siempre del
    // mismo PDF original; la diferencia entre izquierda y derecha es el raster
    // transformado que hace _renderPaginaPDFJS().
    const reloadParam = requestKey.includes('::reload-') ? `&__static_reload=${Date.now()}` : '';
    const qs = `archivo=${encodeURIComponent(it.archivo)}&mode=old&enc=${isLeft ? enc : '1'}&int=${isLeft ? int : '1'}&col=${isLeft ? col : '1'}&net=${isLeft ? netVal : '0'}${reloadParam}`;
    const qsOld = `archivo=${encodeURIComponent(it.archivo)}&mode=old&enc=1&int=0&col=0&net=0${reloadParam}`;
    const ramaItem = it._rama || grad;
    const urlPDF = `/api/preview/${encodeURIComponent(ramaItem)}?${qs}`;
    // El PDF ORIGINAL se carga una sola vez en memoria y se reutiliza en ambos visores.
    // Los parámetros enc/int/col/net solo afectan a la información/transformación,
    // no deben provocar una segunda descarga del mismo PDF.
    const cargarOriginal = (typeof _obtenerBufferPDFOriginal === 'function')
    ? _obtenerBufferPDFOriginal(ramaItem, it.archivo, true, !!reloadParam)
    : _obtenerBufferPDF(urlPDF);
    const promesas = [cargarOriginal, _obtenerDocInfoJSON(`/api/doc_info/${encodeURIComponent(ramaItem)}?${qs}`).catch(() => null)];
    if (!isLeft) promesas.push(_obtenerDocInfoJSON(`/api/doc_info/${encodeURIComponent(ramaItem)}?${qsOld}`).catch(() => null));
    const [buffer, info, infoOriginal] = await Promise.all(promesas);
    if (token !== _loadTokens[containerId]) return;
    if (isLeft) { currentDocPages = (info && info.pages) || []; }
    else {
      // Guardamos EXACTAMENTE la información con la que se construye el visor
      // derecho. La descarga debe reutilizar esta misma configuración DDDDD,
      // no volver a consultar doc_info con int=0/col=0 y obtener otro resultado.
      window.__DDD_VISOR_INFO = info || null;
      window.__DDD_VISOR_INFO_ARCHIVO = String(it.archivo || '');
      window.__DDD_VISOR_INFO_RAMA = String(it._rama || grad || '');
    }
    let uint8Data;
    try {
      if (buffer instanceof ArrayBuffer && buffer.byteLength > 0) uint8Data = new Uint8Array(buffer.slice(0));
      else if (buffer && buffer.buffer && buffer.buffer.byteLength > 0) uint8Data = new Uint8Array(buffer.buffer.slice(0));
      else {
        const r = await fetch(urlPDF);
        uint8Data = new Uint8Array(await r.arrayBuffer());
      }
    } catch (_e) {
      const r = await fetch(urlPDF);
      uint8Data = new Uint8Array(await r.arrayBuffer());
    }
    if (typeof abrirMuPDFVisor !== 'function') throw new Error('MuPDF.js no está cargado.');
    const mupdfState = await abrirMuPDFVisor(uint8Data);
    const doc = mupdfState.doc;
    if (token !== _loadTokens[containerId]) {
      try { cerrarMuPDFVisor(doc); }
      catch (_e) {
      }
      return;
    }
    if (window.__MUPDF_VISOR_DOCS?.[containerId]) {
      try { cerrarMuPDFVisor(window.__MUPDF_VISOR_DOCS[containerId]); }
      catch (_) { } }
    window.__MUPDF_VISOR_DOCS[containerId] = doc;
    _estadoPDFJS[containerId] =  {
      doc, mupdfDoc: doc, mupdf: mupdfState.mupdf, qs, isLeft, key: requestKey, requestKey, loading: false
    }
    ;
    const total = doc.countPages();
    const anchoDisp = Math.max(280, el.clientWidth - 18);
    // Sustituimos el indicador por los placeholders directamente, sin dejar
    // nunca el doc-viewer vacío entre la carga del PDF y la creación de páginas.
    const loadingEl = el.querySelector('.doc-viewer-loading');
    // En "Cómo quedaría" el indicador de carga NO se retira aquí: debe seguir
    // mostrándose hasta que la primera página esté totalmente sustituida y el
    // plan DDDDD aplicado (se elimina tras renderizarPaginaOnDemand(0)).
    if (loadingEl && isLeft) loadingEl.remove();
    const wrappers = crearPlaceholdersDocumento(total, anchoDisp, el);
    initSynchronizedScrolling();
    initResizeAutoFit();
    const paginasRenderizadas = new Set();
    const paginasDisponibles = new Set([0]);
    wrappers.forEach((wrapper, idx) =>  { if (idx > 0) wrapper.style.display = 'none'; }
  );
    const mostrarPagina = (i) =>  {
      const wrapper = wrappers[i];
      if (!wrapper) return null;
      wrapper.style.display = 'flex';
      paginasDisponibles.add(i);
      return wrapper;
    }
    ;
    const mostrarHasta = (i) =>  {
      const limite = Math.min(total - 1, Math.max(0, Number(i) || 0));
      for (let n = 0; n <= limite; n++) mostrarPagina(n);
    }
    ;
    window.__visorEnsurePage = window.__visorEnsurePage ||  {
    }
    ;
    window.__visorEnsurePage[containerId] = (i) =>  {
      const idx = Math.max(0, Math.min(total - 1, Number(i) || 0));
      mostrarHasta(idx);
      return wrappers[idx] || null;
    }
    ;
    async function renderizarPaginaOnDemand(i) {
      if (paginasRenderizadas.has(i) || token !== _loadTokens[containerId]) return;
      const wrapper = mostrarPagina(i);
      if (!wrapper) return;
      paginasRenderizadas.add(i);
      try {
        const meta = (info && info.pages && info.pages[i]) ? info.pages[i] :  { page_num: i }
        ;
        const gz = (typeof window !== 'undefined' && window._estadoGlobalZoomVisor) ? window._estadoGlobalZoomVisor :  {
          modo:'fit_width', escala:null
        }
        ;
        const escalaPagina = gz.modo === 'manual' ? gz.escala : (gz.modo === 'fit_page' ? 'fit_page' : null);
        await _renderPaginaPDFJS(doc, i, wrapper, escalaPagina, el, meta, isLeft);
        wrapper.style.minHeight = '';
        wrapper.style.background = '';
        wrapper.style.marginBottom = '12px';
        const esActivo = v => v === '1' || v === 1 || v === true || v === 'true' || v === undefined;
        anadirOverlaysPagina(wrapper, meta, it, isLeft,  {
          enc: esActivo(enc), int: esActivo(int), col: esActivo(col), metaOriginalPagina: (!isLeft && infoOriginal && infoOriginal.pages) ? infoOriginal.pages[i] : null
        }
  );
      } catch (_e) {
      }
    }
    // Al abrir el documento hay que mostrar la primera página cuanto antes.
    // Antes esperábamos a que TODAS las páginas terminasen de renderizarse; en
    // documentos largos eso dejaba el indicador de "Cargando documento..."
    // indefinidamente visible y, tras F5, parecía que el visor se había quedado
    // bloqueado. La primera página desbloquea el visor y el resto continúa en
    // segundo plano.
    try {
      await renderizarPaginaOnDemand(0);
    } finally {
      if (!isLeft) {
        const doneEl = el.querySelector('.doc-viewer-loading');
        if (doneEl) doneEl.remove();
      }
    }
    // El documento sigue renderizándose completo, pero sin bloquear la apertura.
    // Promise.allSettled evita que un fallo de una página mantenga la apertura
    // pendiente para siempre.
    if (total > 1) {
      void Promise.allSettled(
        Array.from({ length: total - 1 }, (_, n) => renderizarPaginaOnDemand(n + 1))
      );
    }
    if (typeof actualizarEtiquetasZoomAmbos === 'function') actualizarEtiquetasZoomAmbos();
    const revelarSiguiente = () =>  {
      const visibles = [...paginasDisponibles].sort((a, b) => a - b);
      const ultima = visibles.length ? visibles[visibles.length - 1] : 0;
      if (ultima + 1 < total) renderizarPaginaOnDemand(ultima + 1);
    }
    ;
    const renderCercanas = () =>  {
      const top = el.scrollTop;
      const bottom = top + el.clientHeight;
      wrappers.forEach((wrapper, idx) =>  {
        if (!paginasDisponibles.has(idx)) return;
        const y = wrapper.offsetTop;
        if (y < bottom + Math.max(900, el.clientHeight) && y + wrapper.offsetHeight > top - 300) {
          renderizarPaginaOnDemand(idx);
        }
      }
  );
      if (bottom >= el.scrollHeight - Math.max(180, el.clientHeight * 0.18)) revelarSiguiente();
    }
    ;
    const observer = new IntersectionObserver((entries) =>  {
      entries.forEach(entry =>  {
        if (entry.isIntersecting) {
          const pIdx = parseInt(entry.target.dataset.paginaIdx, 10);
          if (!isNaN(pIdx)) renderizarPaginaOnDemand(pIdx);
        }
      }
  );
    }
    ,  { root: el, rootMargin: '1200px 0px' }
  );
    for (let i = 1; i < total; i++) observer.observe(wrappers[i]);
    el.addEventListener('scroll', renderCercanas,  { passive: true }
  );
    el.addEventListener('wheel', (ev) =>  { if (ev.deltaY > 0) revelarSiguiente(); }
    ,  { passive: true }
  );
    requestAnimationFrame(renderCercanas);
    if (headerEl && token === _loadTokens[containerId]) headerEl.innerHTML = tituloBase;
    instalarControlesZoomMuPDF(containerId, el);
    consumirRestauracionVisor(containerId);
    try {
      const rs = JSON.parse(localStorage.getItem('visor_scroll_v1') || '{}');
      if (containerId === 'viewerOld' && Number.isFinite(Number(rs.old))) el.scrollTop = Number(rs.old);
      if (containerId === 'viewerNew' && Number.isFinite(Number(rs.new))) el.scrollTop = Number(rs.new);
    } catch (_) {}
    if (typeof actualizarNavegacionCambios === 'function') actualizarNavegacionCambios();
    dispararPrecargaProximos();
  } catch (err) {
    if (_estadoPDFJS[containerId]?.requestKey === requestKey) _estadoPDFJS[containerId].loading = false;
    if (headerEl) headerEl.innerHTML = tituloBase;
    el.innerHTML = `<div class="doc-viewer-load-error visor-error-carga-documento"><i class="fa-solid fa-triangle-exclamation visor-error-icono"></i><strong class="visor-error-titulo">No se pudo cargar el documento</strong><span class="visor-error-detalle">${err.message || 'Error de conexión o archivo no encontrado'}</span><button type="button" onclick="openPos(POS)" class="visor-boton-reintentar"><i class="fa-solid fa-rotate-right"></i> Reintentar</button></div>`;
  }
}
/* Responsive: selector Original / Cómo quedaría para móvil/tablet y tacto. */
(() =>  {
  const STORAGE_KEY = 'visor_responsive_v40';
  // Se conserva entre recargas del visor. sessionStorage se pierde al cerrar/recrear el documento.
  const STORAGE = window.localStorage;
  function activar(tipo) {
    const root = document.getElementById('ov');
    if (!root) return;
    const cols = root.querySelectorAll('.ovcol');
    const botones = root.querySelectorAll('.visor-responsive-switch button');
    if (!cols.length || !botones.length) return;
    const idx = tipo === 'new' ? 1 : 0;
    cols.forEach((c, i) =>  {
      c.classList.toggle('is-responsive-active', i === idx);
      if (window.matchMedia && window.matchMedia('(max-width: 1100px)').matches) {
        c.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
      } else {
        c.removeAttribute('aria-hidden');
      }
    }
  );
    botones.forEach(b =>  {
      const activo = b.dataset.view === tipo;
      b.classList.toggle('active', activo);
      b.setAttribute('aria-selected', activo ? 'true' : 'false');
      b.setAttribute('tabindex', activo ? '0' : '-1');
    }
  );
    try { STORAGE.setItem(STORAGE_KEY, tipo); }
    catch (_) {
    }
    if (typeof window._restaurarScrollTabMovil === 'function') {
      window._restaurarScrollTabMovil(tipo === 'new' ? 'viewerNew' : 'viewerOld');
    }
  }
  function init() {
    const root = document.getElementById('ov');
    const switcher = root?.querySelector('#visorResponsiveSwitch');
    if (!switcher || switcher.dataset.ready === '1') return;
    switcher.dataset.ready = '1';
    // Aplicar inmediatamente el estado visual antes de cualquier repintado posterior.
    // Así nunca quedan visibles los dos visores durante la inicialización.
    const primerActivo = switcher.querySelector('button.active')?.dataset.view === 'new' ? 'new' : 'old';
    activar(primerActivo);
    switcher.querySelectorAll('button').forEach(b => b.addEventListener('click', () => activar(b.dataset.view === 'new' ? 'new' : 'old')));
    let saved = 'old';
    try { saved = STORAGE.getItem(STORAGE_KEY) || 'old'; }
    catch (_) {
    }
    activar(saved === 'new' ? 'new' : 'old');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init,  { once: true }
  );
  else init();
  const observer = new MutationObserver(init);
  observer.observe(document.documentElement,  { childList: true, subtree: true }
  );
  window.addEventListener('resize', init,  { passive: true }
  );
}
)();
window._estadoGlobalZoomVisor = window._estadoGlobalZoomVisor ||  {
  modo: 'fit_width',
  escala: null
};
/* Restauración inmediata del zoom: se lee antes del primer render del PDF. */
try {
  const rawZoom = localStorage.getItem('visor_zoom_v1');
  if (rawZoom) {
    const z = JSON.parse(rawZoom);
    if (z && (z.modo === 'fit_width' || z.modo === 'fit_page' || z.modo === 'manual')) {
      window._estadoGlobalZoomVisor.modo = z.modo;
      window._estadoGlobalZoomVisor.escala = Number.isFinite(Number(z.escala)) ? Number(z.escala) : null;
    }
  }
} catch (_) {}
function guardarEstadoVisorAntesDeSalir() {
  try {
    const gz = window._estadoGlobalZoomVisor || {};
    const tipo = localStorage.getItem('visor_responsive_v40') === 'new' ? 'new' : 'old';
    localStorage.setItem('visor_zoom_v1', JSON.stringify({ modo: gz.modo || 'fit_width', escala: gz.escala }));
    localStorage.setItem('visor_responsive_v40', tipo);
    const oldEl = document.getElementById('viewerOld');
    const newEl = document.getElementById('viewerNew');
    localStorage.setItem('visor_scroll_v1', JSON.stringify({
      old: oldEl ? oldEl.scrollTop : 0, new: newEl ? newEl.scrollTop : 0
    }));
  } catch (_) {}
}
window.addEventListener('pagehide', guardarEstadoVisorAntesDeSalir, { passive:true });
window.addEventListener('beforeunload', guardarEstadoVisorAntesDeSalir, { passive:true });
function obtenerEscalaVisor(containerId, modo) {
  const el = document.getElementById(containerId);
  if (!el) return 1;
  const st = _estadoPDFJS[containerId];
  let pw = 595, ph = 842;
  try {
    const md = st?.mupdfDoc;
    if (md && typeof md.loadPage === 'function') {
      const mp = md.loadPage(0);
      try {
        const b = mp.getBounds('CropBox');
        pw = Math.max(1, b[2] - b[0]);
        ph = Math.max(1, b[3] - b[1]);
      } finally {
        try { mp.destroy?.(); }
        catch (_) { } }
    } else if (st?.doc) {
      const mp = st.doc.loadPage(0);
      const vp = MuPDFCore.viewportMuPDF(mp, 1);
      pw = Math.max(1, vp.width);
      ph = Math.max(1, vp.height);
      try { mp.destroy?.(); }
      catch (_) { } }
  } catch (_) {
  }
  const bw = Math.max(280, el.clientWidth - 24);
  const bh = Math.max(240, el.clientHeight - 24);
  const fitW = bw / pw;
  const fitH = bh / ph;
  if (modo === 'fit_page') {
    // Ver solo la página completa encajada sin scroll vertical
    return Math.max(0.25, Math.min(3.5, Math.min(fitW, fitH)));
  }
  // Por defecto 'fit_width': ocupa todo el ancho disponible
  return Math.max(0.35, Math.min(4.0, fitW));
}
function actualizarEtiquetasZoomAmbos() {
  const gz = window._estadoGlobalZoomVisor;
  const labels = document.querySelectorAll('.mupdf-zoom-value');
  let texto = '';
  if (gz.modo === 'fit_page') { texto = 'Página entera'; }
  else if (gz.modo === 'fit_width') {
    const esc = Math.round(obtenerEscalaVisor('viewerOld', 'fit_width') * 100);
    texto = `${esc}%`;
  } else {
    texto = `${Math.round(gz.escala * 100)}%`;
  }
  labels.forEach(l =>  { l.textContent = texto; }
  );
}
function aplicarZoomAmbosVisores(nuevoModo, factor = 1) {
  const gz = window._estadoGlobalZoomVisor;
  if (nuevoModo === 'fit_page') {
    gz.modo = 'fit_page';
    gz.escala = null;
  } else if (nuevoModo === 'fit_width') {
    gz.modo = 'fit_width';
    gz.escala = null;
  } else {
    // modo 'manual': más y menos funcionan a la vez para ambos visores
    let currentScale = gz.escala;
    if (!Number.isFinite(currentScale) || currentScale <= 0) {
      currentScale = Math.max(
      obtenerEscalaVisor('viewerOld', gz.modo),
      obtenerEscalaVisor('viewerNew', gz.modo)
  );
    }
    gz.modo = 'manual';
    gz.escala = Math.max(0.35, Math.min(4.5, currentScale * factor));
  }
  actualizarEtiquetasZoomAmbos();
  ['viewerOld', 'viewerNew'].forEach(containerId =>  {
    _estadoZoomMUPDF[containerId] =  { modo: gz.modo, escala: gz.escala }
    ;
    const el = document.getElementById(containerId);
    if (!el) return;
    let targetScale = gz.escala;
    if (gz.modo === 'fit_page' || gz.modo === 'fit_width') {
      targetScale = obtenerEscalaVisor(containerId, gz.modo);
    }
    if (!Number.isFinite(targetScale) || targetScale <= 0) targetScale = 1;
    const visualScale = Math.max(0.1, targetScale / 3);
    const wrappers = el.querySelectorAll('.doc-page, .ddd-continuacion');
    wrappers.forEach(w => {
      /*
       * IMPORTANTE: el canvas se rasteriza a 3x SOLO para ganar nitidez.
       * La página ya se dimensiona físicamente con targetScale durante el
       * render. Aplicar además `zoom = targetScale / 3` encogía la página
       * por segunda vez (PDF diminuto centrado en mucho espacio vacío).
       *
       * El zoom visual debe ser 1: la escala real se expresa en width/height.
       * Para páginas ya renderizadas reutilizamos sus dimensiones naturales.
       */
      const naturalW = Number(w.__naturalWidth || w.dataset.naturalWidth || 0);
      const naturalH = Number(w.__naturalHeight || w.dataset.naturalHeight || 0);
      const scale = Number.isFinite(targetScale) && targetScale > 0 ? targetScale : 1;
      if (naturalW > 0 && naturalH > 0) {
        w.style.width = `${Math.round(naturalW * scale)}px`;
        w.style.height = `${Math.round(naturalH * scale)}px`;
      }
      w.style.zoom = '1';
      w.dataset.dddVisualScale = '1';
      w.dataset.dddTargetScale = String(scale);
    });
  }
  );
}
function instalarControlesZoomMuPDF(containerId, el) {
  if (!el) return;
  const headerId = containerId === 'viewerOld' ? 'headerViewerOld' : 'headerViewerNew';
  const headerEl = document.getElementById(headerId);
  const parentTarget = headerEl || el;
  let box = parentTarget.querySelector('.mupdf-zoom-controls');
  const yaExiste = !!box;
  if (!box) {
    box = document.createElement('div');
    box.className = 'mupdf-zoom-controls';
  }
  box.setAttribute('role', 'toolbar');
  box.setAttribute('aria-label', 'Controles de zoom del documento');
  box.innerHTML = `
    <button type="button" class="mupdf-zoom-minus" title="Alejar ambos documentos" aria-label="Alejar"><i class="fa-solid fa-minus"></i></button>
    <button type="button" class="mupdf-zoom-fit" title="Ver solo la página (Página entera)" aria-label="Ver solo la página"><i class="fa-solid fa-expand"></i></button>
    <button type="button" class="mupdf-zoom-plus" title="Acercar ambos documentos" aria-label="Acercar"><i class="fa-solid fa-plus"></i></button>
    <span class="mupdf-zoom-value" aria-live="polite">100%</span>`;
  if (!yaExiste) parentTarget.appendChild(box);
  box.classList.remove('mupdf-zoom-controls-initial');
  box.querySelectorAll('button').forEach(btn =>  { btn.disabled = false; }
  );
  box.querySelector('.mupdf-zoom-minus').onclick = () => aplicarZoomAmbosVisores('manual', 0.9);
  box.querySelector('.mupdf-zoom-plus').onclick = () => aplicarZoomAmbosVisores('manual', 1.1);
  box.querySelector('.mupdf-zoom-fit').onclick = () =>  {
    const gz = window._estadoGlobalZoomVisor;
    aplicarZoomAmbosVisores(gz.modo === 'fit_page' ? 'fit_width' : 'fit_page');
  }
  ;
  actualizarEtiquetasZoomAmbos();
}
window._estadoPDFJS = _estadoPDFJS;
