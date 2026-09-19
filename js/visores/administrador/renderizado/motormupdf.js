/* MuPDF.js CORE — único acceso al motor PDF del visor. */
(() =>  {
  let modPromise = null;
  const cache = new Map();
  async function cargarMuPDF() {
    if (modPromise) return modPromise;
    modPromise = import('https://cdn.jsdelivr.net/npm/mupdf@1.28.0/dist/mupdf.js')
    .catch(() => import('https://unpkg.com/mupdf@1.28.0/dist/mupdf.js'))
    .then(m => m.default || m)
    .catch(err =>  {
      modPromise = null;
      const msg = err && err.message ? ` ${err.message}` : '';
      console.error('[MuPDF] Error cargando MuPDF.js:', err);
      throw new Error(`No se pudo cargar MuPDF.js.${msg}`);
    }
  );
    return modPromise;
  }
  async function abrirMuPDF(bytes, mime='application/pdf') {
    let mupdf = await cargarMuPDF();
    if (typeof mupdf === 'function' && !mupdf.Document) { mupdf = await mupdf(); }
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const doc = mupdf.Document.openDocument(data, mime);
    if (!doc) throw new Error('MuPDF.js no pudo abrir el documento.');
    doc.__mupdf = mupdf;
    return  { mupdf, doc }
    ;
  }
  function cerrarMuPDF(doc) {
    try { doc?.destroy?.(); }
    catch (_) { } }
  function paginaMuPDF(doc, idx0) { return doc.loadPage(idx0); }
  function viewportMuPDF(page, scale=1) {
    const b = page.getBounds('CropBox');
    const w = Math.max(1, (b[2]-b[0]) * scale);
    const h = Math.max(1, (b[3]-b[1]) * scale);
    return  { width:w, height:h, scale, transform:[scale,0,0,scale,0,0], pageBounds:b }
    ;
  }
  // Normaliza el color de un span/línea de MuPDF a un string CSS ('rgb(r,g,b)').
  // MuPDF puede exponer el color como [r,g,b] en 0..1, [r,g,b] en 0..255,
  // un objeto {r,g,b} o un entero empaquetado, según la versión/JSON. Se
  // intentan las formas más comunes y si no hay nada se devuelve null para
  // que el llamador decida el color de respaldo (nunca inventar un color).
  function _colorMuPDFaCss(c) {
    if (c == null) return null;
    if (typeof c === 'number' && Number.isFinite(c)) {
      const r = (c >> 16) & 0xFF;
      const g = (c >> 8) & 0xFF;
      const b = c & 0xFF;
      return `rgb(${r},${g},${b})`;
    }
    if (Array.isArray(c) && c.length >= 3) {
      const max = Math.max(...c.slice(0,3));
      const to255 = v => Math.max(0, Math.min(255, Math.round(max <= 1 ? v * 255 : v)));
      return `rgb(${to255(c[0])},${to255(c[1])},${to255(c[2])})`;
    }
    if (typeof c === 'object' && (c.r != null || c.g != null || c.b != null)) {
      const max = Math.max(c.r||0, c.g||0, c.b||0);
      const to255 = v => Math.max(0, Math.min(255, Math.round(max <= 1 ? v * 255 : v)));
      return `rgb(${to255(c.r||0)},${to255(c.g||0)},${to255(c.b||0)})`;
    }
    return null;
  }
  async function textoMuPDF(page, scale=1) {
    const st = page.toStructuredText('preserve-spans');
    const data = JSON.parse(st.asJSON());
    const items = [];
    for (const block of (data.blocks || [])) {
      if (!Array.isArray(block.lines)) continue;
      for (const line of (block.lines || [])) {
        const lineB = line.bbox || { x: line.x || 0, y: line.y || 0, w: 0, h: line.font?.size || 10 };
        const lineText = String(line.text || '');
        if (!lineText.trim()) continue;
        const lineX = Number(lineB.x || 0) * scale;
        const lineY = Number(lineB.y || 0) * scale;
        const lineW = Number(lineB.w || 0) * scale;
        const lineH = Number(lineB.h || line.font?.size || 10) * scale;
        const lineFontSize = Number(line.font?.size || 10) * scale;
        const lineDefaultColor = _colorMuPDFaCss(line.color)
          || _colorMuPDFaCss(line.spans?.[0]?.color)
          || _colorMuPDFaCss(line.chars?.[0]?.color)
          || null;

        const rawSpans = Array.isArray(line.spans) && line.spans.length ? line.spans : null;
        const spans = [];
        if (rawSpans) {
          for (const sp of rawSpans) {
            const spText = String(sp.text || sp.str || '');
            if (!spText) continue;
            const spB = sp.bbox || { x: sp.x || lineX, y: sp.y || lineY, w: 0, h: lineH };
            const spX = Number(spB.x || 0) * scale;
            const spY = Number(spB.y || 0) * scale;
            const spW = Number(spB.w || 0) * scale;
            const spH = Number(spB.h || sp.font?.size || lineH) * scale;
            const spColor = _colorMuPDFaCss(sp.color) || lineDefaultColor;
            const spFontSize = Number(sp.font?.size || line.font?.size || 10) * scale;
            const isUnderline = Boolean(sp.flags & 1 || sp.font?.flags & 1 || sp.underline || /underline/i.test(sp.font?.name || sp.font?.style || ''));
            spans.push({
              text: spText,
              str: spText,
              left: spX,
              top: spY,
              right: spX + spW,
              bottom: spY + spH,
              width: spW,
              height: spH,
              fontSize: spFontSize,
              fontName: sp.font?.name || line.font?.name || '',
              fontFamily: sp.font?.family || line.font?.family || '',
              fontWeight: sp.font?.weight || line.font?.weight || 'normal',
              fontStyle: sp.font?.style || line.font?.style || 'normal',
              color: spColor,
              underline: isUnderline
            });
          }
        }

        const isLineUnderline = Boolean(line.flags & 1 || line.font?.flags & 1 || spans.some(s => s.underline));

        items.push({
          str: lineText,
          width: lineW,
          height: lineH,
          left: lineX,
          top: lineY,
          right: lineX + lineW,
          bottom: lineY + lineH,
          fontSize: lineFontSize,
          bbox: { left: lineX, top: lineY, right: lineX + lineW, bottom: lineY + lineH, width: lineW, height: lineH },
          transform: [scale, 0, 0, scale, lineX, lineY + lineH],
          fontName: line.font?.name || '',
          fontFamily: line.font?.family || '',
          fontWeight: line.font?.weight || 'normal',
          fontStyle: line.font?.style || 'normal',
          color: lineDefaultColor,
          underline: isLineUnderline,
          spans: spans.length ? spans : undefined
        });
      }
    }
    return  { items, styles: { }
    }
    ;
  }
  window.MuPDFCore =  { cargarMuPDF, abrirMuPDF, cerrarMuPDF, paginaMuPDF, viewportMuPDF, textoMuPDF }
  ;
  window.__MUPDF_MOD_PROMISE = () => cargarMuPDF();
}
)();
