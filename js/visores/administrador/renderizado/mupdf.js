/* MUDFT.JS — motor único de renderizado del visor.
 * El PDF llega desde GitHub, se mantiene en memoria y MuPDF.js renderiza cada página.
 * No usa PDF.js para pintar la página y no tiene fallback de renderizado.
 */
(() =>  {
  let _modPromise = null;
  const DOCS = Object.create(null);
  async function cargarMuPDFVisor() {
    if (typeof window !== 'undefined' && window.MuPDFCore?.cargarMuPDF) {
      return await window.MuPDFCore.cargarMuPDF();
    }
    if (_modPromise) return _modPromise;
    _modPromise = (async () =>  {
      let mod = typeof window !== 'undefined' && window.MuPDFCore?.cargarMuPDF
      ? await window.MuPDFCore.cargarMuPDF()
      : await import('https://cdn.jsdelivr.net/npm/mupdf@1.28.0/dist/mupdf.js')
      .catch(() => import('https://unpkg.com/mupdf@1.28.0/dist/mupdf.js'))
      .then(m => m.default || m);
      if (typeof mod === 'function' && !mod.Document) { mod = await mod(); }
      return mod;
    }
    )().catch(err =>  {
      _modPromise = null;
      throw new Error('No se pudo cargar MuPDF.js para el visor.');
    }
  );
    return _modPromise;
  }
  async function abrirMuPDFVisor(bytes) {
    const mupdf = await cargarMuPDFVisor();
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const doc = mupdf.Document.openDocument(data, 'application/pdf');
    if (!doc || typeof doc.countPages !== 'function') throw new Error('MuPDF.js no pudo abrir el PDF original.');
    doc.__mupdf = mupdf;
    return  { mupdf, doc }
    ;
  }
  function cerrarMuPDFVisor(doc) {
    try { doc?.destroy?.(); }
    catch (_) { } }
  async function renderPaginaMuPDFVisor(doc, idx0, canvas, escala) {
    const mupdf = doc?.__mupdf || (await cargarMuPDFVisor());
    const page = doc.loadPage(idx0);
    try {
      const bounds = page.getBounds('CropBox');
      const w = Math.max(1, Math.round((bounds[2] - bounds[0]) * escala));
      const h = Math.max(1, Math.round((bounds[3] - bounds[1]) * escala));
      const matrix = mupdf.Matrix.scale(escala, escala);
      const colorSpace = mupdf.ColorSpace?.DeviceRGB || mupdf.ColorSpace?.RGB;
      const pix = page.toPixmap(matrix, colorSpace, false, true, 'View', 'CropBox');
      const pixels = pix.getPixels();
      const n = pix.getNumberOfComponents();
      const stride = pix.getStride();
      const pw = pix.getWidth ? pix.getWidth() : w;
      const ph = pix.getHeight ? pix.getHeight() : h;
      const image = new ImageData(pw, ph);
      const dst = image.data;
      for (let y = 0; y < ph; y++) {
        const srcRow = y * stride;
        const dstRow = y * pw * 4;
        for (let x = 0; x < pw; x++) {
          const s = srcRow + x * n;
          const d = dstRow + x * 4;
          dst[d] = pixels[s] ?? 255;
          dst[d + 1] = pixels[s + 1] ?? dst[d];
          dst[d + 2] = pixels[s + 2] ?? dst[d];
          dst[d + 3] = n >= 4 ? (pixels[s + 3] ?? 255) : 255;
        }
      }
      canvas.width = pw;
      canvas.height = ph;
      const ctx = canvas.getContext('2d',  { alpha: false, willReadFrequently: true });
      ctx.putImageData(image, 0, 0);
      return  { width: pw, height: ph, scale: escala, mupdf, pageBounds: bounds }
      ;
    } finally {
      try { page.destroy?.(); }
      catch (_) { } }
  }
  window.__MUPDF_VISOR_DOCS = DOCS;
  window.cargarMuPDFVisor = cargarMuPDFVisor;
  window.abrirMuPDFVisor = abrirMuPDFVisor;
  window.cerrarMuPDFVisor = cerrarMuPDFVisor;
  window.renderPaginaMuPDFVisor = renderPaginaMuPDFVisor;
}
)();
