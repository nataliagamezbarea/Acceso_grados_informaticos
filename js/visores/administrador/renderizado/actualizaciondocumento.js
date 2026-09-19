/* REFRESCO PARCIAL Y COMPLETO (< 80 lineas) */
async function refrescarPaginaPDFJS(containerId, pno) {
  const st = _estadoPDFJS[containerId];
  if (!st || !window.MuPDFCore) return false;
  const el = document.getElementById(containerId);
  if (!el) return false;
  const wrapper = el.querySelector(`.doc-page[data-pagina-idx="${pno}"]`);
  if (!wrapper) return false;
  try {
    const it = ITEMS[POS], isLeft = (containerId === 'viewerOld');
    const ramaItem = it?._rama || grad;
    let meta = { page_num: pno };
    let metaOrig = null;
    try {
      const qsDoc = `${st.qs || ''}&archivo=${encodeURIComponent(it.archivo)}&mode=old&t=${Date.now()}`;
      const resI = await fetch(`/api/doc_info/${encodeURIComponent(ramaItem)}?${qsDoc}`);
      const info = await resI.json();
      meta = (info && info.pages && info.pages[pno]) ? info.pages[pno] : { page_num: pno };
      if (!isLeft) {
        const resO = await fetch(`/api/doc_info/${encodeURIComponent(ramaItem)}?archivo=${encodeURIComponent(it.archivo)}&mode=old&t=${Date.now()}`);
        const infoO = await resO.json();
        metaOrig = (infoO && infoO.pages && infoO.pages[pno]) ? infoO.pages[pno] : null;
      }
    } catch (_e) {}

    const urlPDF = `/api/preview/${encodeURIComponent(ramaItem)}?${st.qs}&t=${Date.now()}`;
    const buffer = await _obtenerBufferPDF(urlPDF);
    const opened = await window.MuPDFCore.abrirMuPDF(buffer);
    const anterior = window.__MUPDF_VISOR_DOCS[containerId];
    window.__MUPDF_VISOR_DOCS[containerId] = opened.doc;
    st.doc = opened.doc;
    st.mupdfDoc = opened.doc;
    st.mupdf = opened.mupdf;
    await _renderPaginaPDFJS(opened.doc, pno, wrapper, null, el, meta, isLeft);
    try { anterior?.destroy?.(); }
    catch (_) {}

    if (typeof anadirOverlaysPagina === 'function') {
      const cbInc = document.getElementById('cbInc');
      const cbInt = document.getElementById('cbInt');
      const cbCol = document.getElementById('cbCol');
      anadirOverlaysPagina(wrapper, meta, it, isLeft, {
        enc: cbInc ? cbInc.checked : true,
        int: cbInt ? cbInt.checked : true,
        col: cbCol ? cbCol.checked : true,
        metaOriginalPagina: metaOrig
      });
    }
    return true;
  } catch (err) {
    return false;
  }
}
function refrescarPaginaPreview(pno) {
  refrescarPaginaPDFJS('viewerOld', pno);
  refrescarPaginaPDFJS('viewerNew', pno);
}
function refreshRightIframe() {
  if (typeof _pdfBufferCache !== 'undefined') _pdfBufferCache.clear();
  if (typeof _docInfoCache !== 'undefined') _docInfoCache.clear();
  if (typeof loadDocViewer === 'function') {
    const cbInc = document.getElementById('cbInc');
    const cbInt = document.getElementById('cbInt');
    const cbCol = document.getElementById('cbCol');
    const enc = cbInc?.checked ? '1' : '0';
    const int = cbInt?.checked ? '1' : '0';
    const col = cbCol?.checked ? '1' : '0';
    const net = (typeof isAutoDelInternetActive === 'function' && isAutoDelInternetActive()) ? '1' : '0';
    loadDocViewer('viewerOld', true, enc, int, col, '0', true);
    loadDocViewer('viewerNew', false, enc, int, col, net, true);
  }
}
/* Selector de ramas: siempre conserva SELECCIONAR y permite TODAS las ramas */
