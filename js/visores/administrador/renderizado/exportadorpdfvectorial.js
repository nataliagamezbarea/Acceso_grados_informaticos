/*
 * EXPORTADOR PDF — DDDDD + MuPDF.js
 *
 * IMPORTANTE:
 * - MuPDF.js es el motor del visor y también el motor que abre/crea el PDF final.
 * - La lógica DDDDD NO se vuelve a implementar aquí de forma aproximada.
 * - Para que el PDF descargado haga exactamente los mismos desplazamientos,
 *   recuadros, eliminaciones, sustituciones y continuaciones que el visor,
 *   se reutiliza literalmente `aplicarPlanEnCanvas()` sobre un render MuPDF
 *   de alta resolución y ese resultado se incrusta como imagen en el PDF.
 *
 * Las páginas SIN cambios se conservan como PDF original/vectorial mediante
 * graftPage. Solo las páginas modificadas por DDDDD se reconstruyen, evitando
 * degradar las páginas que no han sido tocadas.
 */
(() =>  {
  let _mupdfPromise = null;
  async function cargarMuPDF() {
    if (typeof window !== 'undefined' && window.MuPDFCore?.cargarMuPDF) {
      return await window.MuPDFCore.cargarMuPDF();
    }
    if (_mupdfPromise) return _mupdfPromise;
    _mupdfPromise = import('https://cdn.jsdelivr.net/npm/mupdf@1.28.0/dist/mupdf.js')
    .catch(() => import('https://unpkg.com/mupdf@1.28.0/dist/mupdf.js'))
    .then(m => m.default || m)
    .catch(err =>  {
      _mupdfPromise = null;
      console.error('[MUPDF DDDDD]', err);
      throw new Error('No se pudo cargar MuPDF.js para generar el PDF.');
    }
  );
    return _mupdfPromise;
  }
  async function canvasPNGBytes(canvas) {
    const blob = await new Promise((resolve, reject) =>  {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo convertir la página DDDDD a PNG.')), 'image/png');
    }
  );
    return new Uint8Array(await blob.arrayBuffer());
  }
  function crearPaginaImagen(pdfDoc, mupdf, canvas, pageWidth, pageHeight) {
    const pngPromise = canvasPNGBytes(canvas);
    return pngPromise.then(png =>  {
      const image = new mupdf.Image(png);
      const imageRef = pdfDoc.addImage(image);
      const resources = pdfDoc.addObject( {
        XObject:  { Im0: imageRef }
      }
  );
      // MuPDF/PDF usa el sistema de coordenadas de la página; la imagen PNG
      // se posiciona derecha con la matriz de escala estándar [pageWidth 0 0 pageHeight 0 0].
      const contents = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
      const pageObject = pdfDoc.addPage([0, 0, pageWidth, pageHeight], 0, resources, contents);
      return pageObject;
    }
  );
  }
  function instalarDocExportacionEnMapa(doc) {
    window.__MUPDF_VISOR_DOCS = window.__MUPDF_VISOR_DOCS || Object.create(null);
    const key = '__ddd_export__';
    const anterior = window.__MUPDF_VISOR_DOCS[key];
    window.__MUPDF_VISOR_DOCS[key] = doc;
    return () =>  {
      if (anterior) window.__MUPDF_VISOR_DOCS[key] = anterior;
      else delete window.__MUPDF_VISOR_DOCS[key];
    }
    ;
  }
  async function renderDDDPage(mupdfDoc, idx, meta, exportScale) {
    if (typeof _renderPaginaPDFJS !== 'function') { throw new Error('El renderizador DDDDD no está disponible.'); }
    const host = document.createElement('div');
    host.id = '__ddd_export__';
    host.style.cssText = [
    'position:fixed', 'left:-100000px', 'top:0',
    'width:1200px', 'height:1200px', 'overflow:hidden',
    'visibility:hidden', 'pointer-events:none'
    ].join(';');
    document.body.appendChild(host);
    const restore = instalarDocExportacionEnMapa(mupdfDoc);
    try {
      const wrapper = document.createElement('div');
      wrapper.className = 'doc-page pdfjs-page';
      wrapper.style.cssText = 'position:relative;margin:0;flex:0 0 auto;';
      host.appendChild(wrapper);
      // ESTE es el mismo camino usado por el visor derecho:
      // MuPDF renderiza + calcularPlanReflujo + aplicarPlanEnCanvas.
      await _renderPaginaPDFJS(mupdfDoc, idx, wrapper, exportScale, host, meta, false);
      const canvas = wrapper.querySelector('canvas');
      if (!canvas) throw new Error(`No se generó el canvas DDDDD de la página ${idx + 1}.`);
      const continuations = [...wrapper.parentNode.querySelectorAll(`.ddd-continuacion[data-pagina-idx^="${idx}.c"]`)];
      return  {
        canvas,
        continuations: continuations.map(x => x.querySelector('canvas')).filter(Boolean),
        width: canvas.width,
        height: canvas.height
      }
      ;
    } finally {
      restore();
      host.remove();
    }
  }
  async function exportarDesdePDFOriginalVectorial( { bytes, ramaItem, it, infoOriginal }
  ) {
    const mupdf = await cargarMuPDF();
    const originalDoc = mupdf.Document.openDocument(bytes, 'application/pdf');
    if (!originalDoc || typeof originalDoc.countPages !== 'function') { throw new Error('MuPDF.js no pudo abrir el PDF original.'); }
    originalDoc.__mupdf = mupdf;
    // 216 dpi aprox. respecto a las coordenadas PDF (72 dpi = escala 1).
    // Se usa una resolución alta para que la lógica raster DDDDD quede visualmente
    // fiel sin tocar las páginas que no han sido modificadas.
    const EXPORT_SCALE = 3;
    // Primero calculamos todas las páginas modificadas. Esto evita alterar índices
    // mientras se construye el documento final.
    const modificadas = new Map();
    const exportKey = '__ddd_export__';
    window.__MUPDF_VISOR_DOCS = window.__MUPDF_VISOR_DOCS || Object.create(null);
    const anteriorDoc = window.__MUPDF_VISOR_DOCS[exportKey];
    window.__MUPDF_VISOR_DOCS[exportKey] = originalDoc;
    const item = ramaItem || it;
    try {
      for (let i = 0; i < originalDoc.countPages(); i++) {
        const meta = infoOriginal?.pages?.[i] || { page_num: i };
        const esDeEstaPagina = (h, pno) => {
          if (!h) return false;
          const raw = (h.page_num !== undefined && h.page_num !== null && String(h.page_num).trim() !== '')
            ? h.page_num
            : ((h.page !== undefined && h.page !== null && String(h.page).trim() !== '') ? h.page : null);
          const hp = raw !== null ? Number(String(raw).replace(/[^0-9]/g, '')) : null;
          return Number.isFinite(hp) ? hp === pno : (pno === 0);
        };
        const hasChanges = Boolean(
          (meta.statement_hotspots && meta.statement_hotspots.some(s => esDeEstaPagina(s, i) && s.include !== false && s.include !== 'false' && s.include !== 0)) ||
          (meta.name_hotspots && meta.name_hotspots.some(n => esDeEstaPagina(n, i))) ||
          (meta.school_hotspots && meta.school_hotspots.some(sc => esDeEstaPagina(sc, i))) ||
          (meta.image_actions && Object.values(meta.image_actions).some(a => a.accion === 'borrar')) ||
          (item?.enunciados && item.enunciados.some(e => esDeEstaPagina(e, i) && e.include !== false && e.include !== 'false' && e.include !== 0)) ||
          (item?.statement_hotspots && item.statement_hotspots.some(s => esDeEstaPagina(s, i) && s.include !== false && s.include !== 'false' && s.include !== 0)) ||
          (item?.name_hotspots && item.name_hotspots.some(n => esDeEstaPagina(n, i))) ||
          (item?.school_hotspots && item.school_hotspots.some(sc => esDeEstaPagina(sc, i)))
        );
        if (!hasChanges) continue;
        const resultado = await renderDDDPage(originalDoc, i, meta, EXPORT_SCALE);
        const plan = window.__DDD_PLANES_EXPORT?.[i] || null;
        const ops = Array.isArray(plan?.operaciones) ? plan.operaciones : [];
        // Sin operaciones: se deja la página original intacta.
        if (!ops.length && !resultado.continuations.length) continue;
        const pageBounds = originalDoc.loadPage(i).getBounds('CropBox');
        modificadas.set(i,  {
          canvas: resultado.canvas,
          continuations: resultado.continuations,
          width: pageBounds[2] - pageBounds[0],
          height: pageBounds[3] - pageBounds[1]
        }
  );
      }
    } finally {
      if (anteriorDoc) window.__MUPDF_VISOR_DOCS[exportKey] = anteriorDoc;
      else delete window.__MUPDF_VISOR_DOCS[exportKey];
    }
    // Si no hubo ninguna modificación, devolvemos EXACTAMENTE el PDF original.
    if (!modificadas.size) {
      try { originalDoc.destroy(); }
      catch (_) {
      }
      return new Uint8Array(bytes);
    }
    // Construimos el documento final con MuPDF.
    // Las páginas no tocadas se copian mediante graftPage para conservar sus
    // objetos PDF originales. Las tocadas se sustituyen por el resultado exacto
    // del mismo pipeline DDDDD que usa el visor.
    const finalDoc = new mupdf.PDFDocument();
    const graft = finalDoc.newGraftMap();
    try {
      const total = originalDoc.countPages();
      for (let i = 0; i < total; i++) {
        const mod = modificadas.get(i);
        if (!mod) {
          graft.graftPage(-1, originalDoc, i);
          continue;
        }
        const pageObj = await crearPaginaImagen(finalDoc, mupdf, mod.canvas, mod.width, mod.height);
        finalDoc.insertPage(-1, pageObj);
        // Las continuaciones creadas por _replaceWithAnchor forman páginas nuevas
        // igual que en el visor. No se pierde esa parte de la lógica DDDDD.
        for (const cont of mod.continuations) {
          if (!cont) continue;
          const cObj = await crearPaginaImagen(finalDoc, mupdf, cont, mod.width, mod.height);
          finalDoc.insertPage(-1, cObj);
        }
      }
      const out = finalDoc.saveToBuffer('garbage,compress,compress-images');
      return new Uint8Array(out.asUint8Array ? out.asUint8Array() : out);
    } finally {
      try { finalDoc.destroy(); }
      catch (_) {
      }
      try { originalDoc.destroy(); }
      catch (_) { } }
  }
  window.exportarPDFVectorialDDD = exportarDesdePDFOriginalVectorial;
  window.exportarDesdePDFOriginalVectorial = exportarDesdePDFOriginalVectorial;
  window.cargarMuPDFVectorial = cargarMuPDF;
}
)();
