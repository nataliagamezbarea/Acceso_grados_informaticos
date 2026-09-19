/* ORQUESTADOR: no contiene lógica visual específica.
 * Cada funcionalidad vive en su JS independiente.
 */
function _pctARect(hs, viewport) {
  const l = Number(hs?.pct_left ?? hs?.left ?? 0);
  const t = Number(hs?.pct_top ?? hs?.top ?? 0);
  const w = Number(hs?.pct_width ?? hs?.width ?? 0);
  const h = Number(hs?.pct_height ?? hs?.height ?? 0);
  return  {
    left: l / 100 * viewport.width,
    top: t / 100 * viewport.height,
    right: (l + w) / 100 * viewport.width,
    bottom: (t + h) / 100 * viewport.height
  };
}
function _solapan(a,b) { return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top; }
function _cubre(a,b) { return a.left<=b.left+2&&a.right>=b.right-2&&a.top<=b.top+2&&a.bottom>=b.bottom-2; }
async function calcularPlanReflujo(pagina,viewport,hotspotsAEliminar=[],hotspotsCambios=[]) {
  const _extraerLineas = typeof extraerLineasTexto === 'function' ? extraerLineasTexto : window.extraerLineasTexto;
  const _extraerRects = typeof extraerRectangulos === 'function' ? extraerRectangulos : window.extraerRectangulos;
  const _extraerIms = typeof extraerImagenes === 'function' ? extraerImagenes : window.extraerImagenes;
  const _detectarImg = typeof detectarImagenParaHotspot === 'function' ? detectarImagenParaHotspot : window.detectarImagenParaHotspot;
  const _crearOpImg = typeof crearOperacionEliminacionImagen === 'function' ? crearOperacionEliminacionImagen : window.crearOperacionEliminacionImagen;
  const _construirTxt = typeof construirOperacionesEliminacionTexto === 'function' ? construirOperacionesEliminacionTexto : window.construirOperacionesEliminacionTexto;
  const _construirSust = typeof construirOperacionSustitucion === 'function' ? construirOperacionSustitucion : window.construirOperacionSustitucion;
  const _construirRec = typeof construirOperacionesRecuadros === 'function' ? construirOperacionesRecuadros : window.construirOperacionesRecuadros;

  const lineas = _extraerLineas ? await _extraerLineas(pagina,viewport) : [];
  // MUY IMPORTANTE: las sustituciones se construyen de forma síncrona y hacen
  // measureText() durante construirOperacionSustitucion(). Por tanto, todas
  // las fuentes que vienen del PDF deben estar resueltas ANTES de construir el
  // plan. Si se cargan después, el wrap/reflujo ya quedó calculado con Arial.
  if (typeof resolverFuente === 'function' && Array.isArray(lineas)) {
    const fuentes = new Map();
    for (const l of lineas) {
      for (const item of (Array.isArray(l.items) && l.items.length ? l.items : [l])) {
        const raw = item?.fontName || item?.fontFamily || l?.fontName || l?.fontFamily || '';
        if (!raw) continue;
        const parsed = parseFontFamilyAndStyle(raw);
        const key = `${parsed.family}|${parsed.style}`;
        if (!fuentes.has(key)) fuentes.set(key, resolverFuente(parsed.family, parsed.style));
      }
    }
    await Promise.allSettled([...fuentes.values()]);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try { await document.fonts.ready; }
      catch (_) { } }
  }
  const rects = _extraerRects ? await _extraerRects(pagina,viewport) : [];
  const imagenes = _extraerIms ? await _extraerIms(pagina,viewport) : [];
  const operaciones=[], avisos=[];
  const imgItems=(hotspotsAEliminar||[]).filter(x=>x?.tipo==='imagen');
  for(const item of imgItems) {
    const imagen = _detectarImg ? _detectarImg(imagenes,item.hotspot,viewport) : null;
    const op = _crearOpImg ? _crearOpImg(imagen,viewport) : null;
    if(op) {
      op.hotspot = item.hotspot;
      op.source = item.hotspot;
      op.id = item.id;
      op.page_num = item.page_num;
      operaciones.push(op);
    }
  }
  const txt = _construirTxt ? _construirTxt(lineas,hotspotsAEliminar,viewport,rects) : { operaciones: [], fullRemoved: new Set() };
  operaciones.push(...txt.operaciones);
  for(const item of (hotspotsCambios||[])) {
    const orig = item.textoOriginal || item.start || item.old || 'PRÁCTICA 1';
    const nw = item.newText || item.new || item.text || '';
    const op = typeof _construirSust === 'function'
    ? _construirSust(lineas,rects,orig,nw,viewport,item)
    : null;
    if(op) operaciones.push(op);
  }
  // Los recuadros se reconstruyen DESPUÉS de conocer todos los desplazamientos.
  // Esto permite que una caja situada debajo de una foto o título conserve
  // exactamente su estructura y ajuste su posición si fuera necesario.
  if (_construirRec) {
    operaciones.push(..._construirRec(rects,lineas,txt.fullRemoved,operaciones,viewport));
  }
  return  { operaciones,avisos };
}
if(typeof module!=='undefined'&&module.exports)module.exports= { calcularPlanReflujo,_pctARect,_solapan }
;
else window.calcularPlanReflujo=calcularPlanReflujo;
