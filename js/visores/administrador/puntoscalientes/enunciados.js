/* CREACION DE HOTSPOTS DE ENUNCIADOS (< 85 lineas) */
function _crearHotspotEnunciado(sh, pageDiv, isLeft, it, p) {
  if (!sh) return;
  const pageNum = Number.isFinite(Number(p?.page_num)) ? Number(p.page_num) : 0;
  const rawP = (sh.page_num !== undefined && sh.page_num !== null) ? sh.page_num : ((sh.page !== undefined && sh.page !== null) ? sh.page : null);
  const hp = rawP !== null ? Number(String(rawP).replace(/[^0-9]/g, '')) : null;
  if (Number.isFinite(hp) ? hp !== pageNum : pageNum !== 0) return;
  const activo = (sh.include !== false);
  const tieneNuevo = !!(sh.new && sh.new.trim());
  const esCustom = !!sh.custom;
  if (!isLeft && !activo) return;
  let left = (sh.left !== undefined ? sh.left : (sh.pct_left !== undefined ? sh.pct_left : null));
  let top = (sh.top !== undefined ? sh.top : (sh.pct_top !== undefined ? sh.pct_top : null));
  let width = (sh.width !== undefined ? sh.width : (sh.pct_width !== undefined ? sh.pct_width : null));
  let height = (sh.height !== undefined ? sh.height : (sh.pct_height !== undefined ? sh.pct_height : null));
  // Localización 100% basada en el TEXTO REAL de la página (por ejemplo "PRÁCTICA 1").
  // Busca la frase exacta en las líneas extraídas del PDF y sitúa el hotspot justo encima.
  const targetText = String(sh.start || sh.old || sh.original || sh.text || sh.original_text || '').trim();
  const lineas = pageDiv?.__lineas || p?.lineas || p?.extracted_lines || [];
  if (targetText && !/^\[.*\]$/.test(targetText) && Array.isArray(lineas) && lineas.length) {
    const compact = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
    const wanted = compact(targetText);
    const matchLine = lineas.find(l =>  {
      const txt = compact(l.texto);
      return txt && (txt.includes(wanted) || (wanted.length >= 6 && wanted.includes(txt) && txt.length >= 4));
    }
  );
    if (matchLine) {
      const vW = pageDiv?.__viewportWidth || (pageDiv?.style?.width ? parseFloat(pageDiv.style.width) : null) || pageDiv?.querySelector('canvas')?.width || 1785.84;
      const vH = pageDiv?.__viewportHeight || (pageDiv?.style?.height ? parseFloat(pageDiv.style.height) : null) || pageDiv?.querySelector('canvas')?.height || 2525.67;
      left = (matchLine.left / vW) * 100;
      top = (matchLine.top / vH) * 100;
      width = ((matchLine.right - matchLine.left) / vW) * 100;
      height = ((matchLine.bottom - matchLine.top) / vH) * 100;
    }
  }
  // Panel derecho (2. CÓMO QUEDARÍA):
  // Si es 1 línea, el recuadro empieza en oldTop y termina en oldBottom.
  // Si son múltiples líneas, abarca desde oldTop hasta cubrir todas las líneas del nuevo enunciado.
  if (!isLeft) {
    const linesCount = Math.max(1, String(sh.new || '').split(/\n/).length);
    if (linesCount > 1) { height = (height || 7.0) * linesCount; }
  }
  if (left == null) left = 26.5;
  if (top == null) top = 21.0;
  if (width == null) width = 50;
  if (height == null) height = 7;
  const box = document.createElement('div');
  box.style.position = 'absolute';
  box.style.left = left + '%';
  box.style.top = top + '%';
  box.style.width = width + '%';
  box.style.height = height + '%';
  box.className = !activo ? 'gray-hotspot' : (tieneNuevo ? 'green-hotspot' : (esCustom ? 'orange-hotspot' : 'red-hotspot'));
  box.style.pointerEvents = 'auto';
  box.style.zIndex = '103';
  box.setAttribute('data-hotspot-interactive', '1');
  const textoVisible = String(sh.start || sh.old || sh.original || sh.text || sh.original_text || '').trim();
  box.title = !activo ? (textoVisible ? `Enunciado desactivado: ${textoVisible}` : 'Enunciado desactivado (Clic para activar)') : (tieneNuevo ? `Enunciado: ${textoVisible || 'Texto'} → ${sh.new}` : (esCustom ? `Enunciado creado manualmente${textoVisible ? `: $ {
    textoVisible
  }
  ` : ''}` : (textoVisible ? `Enunciado: ${textoVisible}` : 'Enunciado')));
  box.setAttribute('aria-label', box.title);
  box.onpointerdown = (e) =>  { e.stopPropagation(); }
  ;
  box.onmousedown = (e) =>  { e.stopPropagation(); }
  ;
  box.onclick = (e) =>  {
    e.stopPropagation();
    if (typeof openEnunciadoPopup === 'function') openEnunciadoPopup(sh, e, box);
  }
  ;
  if (isLeft && typeof anadirHandlesRedimensionamiento === 'function') {
    anadirHandlesRedimensionamiento(box, sh, p.page_num, 'enunciado');
  }
  const host = pageDiv.__hotspotOverlayLayer || pageDiv;
  host.appendChild(box);
}
