/* Renderizado y Continuaciones de Sustitución de Enunciados en página: responsabilidad única y 100% aislada. */
async function _renderPaginaPDFJS(doc, idx0, wrapper, escalaPreferida, elRef, meta = null, isLeft = true) {
  const pagina = doc.loadPage(idx0);
  const vp1 = MuPDFCore.viewportMuPDF(pagina, 1);
  const boxW = Math.max(280, ((elRef && elRef.clientWidth) || 800) - 24);
  const boxH = Math.max(240, ((elRef && elRef.clientHeight) || 800) - 24);
  const escalaFitW = boxW / vp1.width;
  const escalaFitH = boxH / vp1.height;
  // DDDDD debe calcularse con la MISMA escala física que usa la exportación.
  // Ambos visores se renderizan a alta resolución (3x) y se escalan visualmente con zoom.
  const ESCALA_DDDDD = 3;
  const escalaFinal = ESCALA_DDDDD;
  const viewport = MuPDFCore.viewportMuPDF(pagina, escalaFinal);
  wrapper.innerHTML = '';
  wrapper.__dddRightHotspots = [];
  wrapper.__viewportWidth = viewport.width;
  wrapper.__viewportHeight = viewport.height;
  wrapper.__naturalWidth = vp1.width;
  wrapper.__naturalHeight = vp1.height;
  let targetScale;
  const gz = (typeof window !== 'undefined' && window._estadoGlobalZoomVisor) ? window._estadoGlobalZoomVisor : null;
  const modoActual = gz?.modo || 'fit_width';
  if (Number.isFinite(escalaPreferida) && escalaPreferida > 0) { targetScale = escalaPreferida; }
  else if (modoActual === 'fit_page' || escalaPreferida === 'fit_page') {
    // Ver solo la página completa encajada
    targetScale = Math.min(escalaFitW, escalaFitH);
  } else {
    // Por defecto 'fit_width': ocupa todo el ancho disponible ("lo que quepa", no encogida)
    targetScale = escalaFitW;
  }
  const escalaVisual = Math.max(0.1, targetScale / escalaFinal);
  const anchoVisual = Math.max(1, Math.round(vp1.width * targetScale));
  const altoVisual = Math.max(1, Math.round(vp1.height * targetScale));
  wrapper.style.width = `${anchoVisual}px`;
  wrapper.style.height = `${altoVisual}px`;
  wrapper.style.zoom = '1';
  wrapper.dataset.dddRenderScale = String(escalaFinal);
  wrapper.dataset.dddVisualScale = '1';
  wrapper.dataset.dddVisualWidth = String(anchoVisual);
  wrapper.dataset.dddVisualHeight = String(altoVisual);
  wrapper.style.minHeight = '';
  wrapper.style.maxWidth = 'none';
  wrapper.style.flex = '0 0 auto';
  wrapper.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
  wrapper.style.setProperty('--scale-factor', escalaFinal);
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.maxWidth = '100%';
  canvas.style.maxHeight = '100%';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
  // El visor derecho NO puede enseñar el PDF original antes de que se hayan
  // aplicado las opciones marcadas en los checkboxes. Mientras se preparan
  // fuentes, hotspots, enunciados, imágenes, etc., mantenemos CARGANDO.
  // Así nunca aparece durante unos instantes una versión sin aplicar.
  // El canvas derecho permanece oculto hasta que el resultado DDDDD esté completamente aplicado.
  wrapper.appendChild(canvas);
  const mupdfDocs = (typeof window !== 'undefined' && window.__MUPDF_VISOR_DOCS) || null;
  const mupdfDoc = mupdfDocs ? mupdfDocs[elRef?.id || (isLeft ? 'viewerOld' : 'viewerNew')] : null;
  if (!mupdfDoc || typeof renderPaginaMuPDFVisor !== 'function') { throw new Error('MuPDF.js no está disponible para renderizar el visor.'); }
  const renderInfo = await renderPaginaMuPDFVisor(mupdfDoc, idx0, canvas, escalaFinal);
  viewport.width = renderInfo.width;
  viewport.height = renderInfo.height;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.aspectRatio = `${renderInfo.width} / ${renderInfo.height}`;
  const lineas = typeof extraerLineasTexto === 'function' ? await extraerLineasTexto(pagina, viewport) : [];
  if (wrapper) wrapper.__lineas = lineas;
  if (meta) meta.lineas = lineas;
  if (typeof extraerImagenes === 'function') {
    try {
      const ims = await extraerImagenes(pagina, viewport);
      if (wrapper) wrapper.__imagenes = ims;
      const genImHotspots = ims.map((im, idxImg) => ({
        id: `p${idx0}_img${idxImg}`,
        page_num: idx0,
        page: idx0,
        img_idx: idxImg,
        left: (im.left / viewport.width) * 100,
        top: (im.top / viewport.height) * 100,
        width: (im.width / viewport.width) * 100,
        height: (im.height / viewport.height) * 100,
        signature: `p${idx0}_img${idxImg}`
      }));
      if (wrapper) wrapper.__image_hotspots = genImHotspots;
      if (meta && (!Array.isArray(meta.image_hotspots) || !meta.image_hotspots.length)) {
        meta.image_hotspots = genImHotspots;
      }
    } catch (_) {}
  }
  if (!isLeft && typeof calcularPlanReflujo === 'function' && typeof aplicarPlanEnCanvas === 'function') {
    try {
      const compact = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
      const itemActual = (typeof ITEMS !== 'undefined' && typeof POS !== 'undefined' && ITEMS[POS]) ? ITEMS[POS] : null;
      const aplicarEnunciados = document.getElementById('cbInc') ? document.getElementById('cbInc').checked : true;
      const aplicarNombres = document.getElementById('cbInt') ? document.getElementById('cbInt').checked : true;
      const aplicarColegio = document.getElementById('cbCol') ? document.getElementById('cbCol').checked : true;
      const esDeEstaPagina = (h, pno) => {
        if (!h) return false;
        const raw = (h.page_num !== undefined && h.page_num !== null && String(h.page_num).trim() !== '')
          ? h.page_num
          : ((h.page !== undefined && h.page !== null && String(h.page).trim() !== '') ? h.page : null);
        const hp = raw !== null ? Number(String(raw).replace(/[^0-9]/g, '')) : null;
        return Number.isFinite(hp) ? hp === pno : (pno === 0);
      };
      const rawHotspots = [
      ...(meta && Array.isArray(meta.statement_hotspots) ? meta.statement_hotspots : []),
      ...(itemActual && Array.isArray(itemActual.statement_hotspots) ? itemActual.statement_hotspots : []),
      ...(itemActual && Array.isArray(itemActual.enunciados) ? itemActual.enunciados : [])
      ];
      const stHotspots = [];
      const vistaKeys = new Set();
      for (const sh of rawHotspots) {
        if (!esDeEstaPagina(sh, idx0)) continue;
        const k = (sh.id !== undefined ? String(sh.id) + '::' : '') + (sh.start || sh.old || '') + '::' + (sh.new || sh.newText || sh.texto || '');
        if (!vistaKeys.has(k)) {
          vistaKeys.add(k);
          stHotspots.push(sh);
        }
      }
      const hotspotsAEliminar = [];
      const hotspotsCambios = [];
      const resolverLinea = (sh) =>  {
        const objetivo = String(sh?.start || sh?.old || sh?.original || '').trim();
        const topPct = sh?.pct_top ?? sh?.top;
        let targetLine = null;
        if (topPct != null && lineas.length) {
          const y = Number(topPct) / 100 * viewport.height;
          const candidates = lineas.filter(l => Math.abs(l.top - y) < Math.max(25, (l.height || 15) * 2));
          if (objetivo && !/^\[.*\]$/.test(objetivo)) {
            const compactObj = compact(objetivo);
            targetLine = candidates.find(l => {
              const cL = compact(l.texto);
              return cL.includes(compactObj) || (compactObj.length >= 6 && compactObj.includes(cL) && cL.length >= 4);
            }) || null;
          } else if (!objetivo || /^\[.*\]$/.test(objetivo)) {
            targetLine = candidates[0] || null;
          }
        } else if (objetivo && !/^\[.*\]$/.test(objetivo)) {
          const compactObj = compact(objetivo);
          targetLine = lineas.find(l => {
            const cL = compact(l.texto);
            return cL.includes(compactObj) || (compactObj.length >= 6 && compactObj.includes(cL) && cL.length >= 4);
          }) || null;
        }
        return { objetivo, targetLine };
      };
      const rectDeLinea = (linea, sh) => linea ?  {
        left: linea.left / viewport.width * 100,
        top: linea.top / viewport.height * 100,
        width: (linea.right-linea.left) / viewport.width * 100,
        height: (linea.bottom-linea.top) / viewport.height * 100
      }
      :  {
        left: Number(sh?.pct_left ?? sh?.left ?? 5),
        top: Number(sh?.pct_top ?? sh?.top ?? 5),
        width: Number(sh?.pct_width ?? sh?.width ?? 90),
        height: Number(sh?.pct_height ?? sh?.height ?? 7.5)
      }
      ;
      for (const sh of (aplicarEnunciados ? stHotspots : [])) {
        if (sh.include === false || sh.include === 'false' || sh.include === 0) continue;
        if (!esDeEstaPagina(sh, idx0)) continue;
        const { objetivo, targetLine } = resolverLinea(sh);
        const nw = String(sh.new ?? sh.newText ?? '').trim();
        if (!nw) continue;
        const docScope = sh.documentFile || sh.archivo || sh.file || sh.document || '';
        const currentFile = String(itemActual?.archivo || '');
        if (docScope && currentFile && String(docScope) !== currentFile) continue;
        let tl = targetLine;
        if (!tl && objetivo && !sh.custom && !/^\[.*\]$/.test(objetivo)) {
          const compactObj = compact(objetivo);
          tl = lineas.find(l => {
            const cL = compact(l.texto);
            return cL.includes(compactObj) || (compactObj.length >= 6 && compactObj.includes(cL) && cL.length >= 4);
          }) || null;
        }
        if (!tl) continue;
        if (objetivo && !/^\[.*\]$/.test(objetivo)) {
          const compactObj = compact(objetivo);
          const cL = compact(tl.texto);
          if (!cL.includes(compactObj) && !(compactObj.length >= 6 && compactObj.includes(cL) && cL.length >= 4)) {
            continue;
          }
        }
        hotspotsCambios.push( {
          hotspot:rectDeLinea(tl, sh),
          textoOriginal:objetivo && !/^\[.*\]$/.test(objetivo) ? (compact(tl.texto).includes(compact(objetivo)) ? objetivo : tl.texto) : tl.texto,
          start:objetivo, old:objetivo, new:nw, newText:nw,
          targetTop:Number(tl.top), targetLeft:Number(tl.left), targetRight:Number(tl.right),
          page:idx0,
          documentFile:String(itemActual?.archivo || ''),
          selectedRect:rectDeLinea(tl, sh),
          forzarDosLineas:false
        }
  );
      }
      const accionesNombre =  { ...(itemActual?.acciones_nombre ||  { }
        ), ...(meta?.acciones_nombre ||  {
        }
        )
      }
      ;
      const accionesColegio =  { ...(itemActual?.acciones_colegio ||  { }
        ), ...(meta?.acciones_colegio ||  {
        }
        )
      }
      ;
      const defaultNomAct = (itemActual?.inc_interior !== false && meta?.inc_interior !== false) ? 'eliminar' : 'conservar';
      const defaultColAct = (itemActual?.inc_colegio !== false && meta?.inc_colegio !== false) ? 'eliminar' : 'conservar';
      const allNameHotspots = [
      ...(Array.isArray(meta?.name_hotspots) ? meta.name_hotspots : []),
      ...(Array.isArray(itemActual?.name_hotspots) ? itemActual.name_hotspots : [])
      ];
      for (const nh of (aplicarNombres ? allNameHotspots : [])) {
        if (!esDeEstaPagina(nh, idx0)) continue;
        const act = (accionesNombre[String(nh.id || '')] || accionesNombre.default)?.accion || defaultNomAct;
        if (act === 'eliminar') {
          const txt = String(nh.text || nh.texto || nh.start || nh.old || '').trim();
          if (txt) {
            hotspotsAEliminar.push( {
              tipo: 'texto', origenHotspot: 'nombre', hotspot: nh,
              textoObjetivo: txt, start: txt, old: txt, eliminarLineaCompleta: true
            }
  );
          }
        }
      }
      const allSchoolHotspots = [
      ...(Array.isArray(meta?.school_hotspots) ? meta.school_hotspots : []),
      ...(Array.isArray(itemActual?.school_hotspots) ? itemActual.school_hotspots : [])
      ];
      for (const sh of (aplicarColegio ? allSchoolHotspots : [])) {
        if (!esDeEstaPagina(sh, idx0)) continue;
        const act = (accionesColegio[String(sh.id || '')] || accionesColegio.default)?.accion || defaultColAct;
        if (act === 'eliminar') {
          const txt = String(sh.text || sh.texto || sh.start || sh.old || '').trim();
          if (txt) {
            hotspotsAEliminar.push( {
              tipo: 'texto', origenHotspot: 'colegio', hotspot: sh,
              textoObjetivo: txt, start: txt, old: txt, eliminarLineaCompleta: true
            }
  );
          }
        }
      }
      const aplicarImagenes = document.getElementById('cbImg') ? document.getElementById('cbImg').checked : true;
      if (aplicarImagenes) {
        const imgActions = {
          ...(itemActual?.imagenes || {}),
          ...(itemActual?.image_actions || {}),
          ...(itemActual?.acciones_imagenes || {}),
          ...(meta?.imagenes || {}),
          ...(meta?.image_actions || {}),
          ...(meta?.acciones_imagenes || {})
        };
        for (const [imgId, action] of Object.entries(imgActions)) {
          const act = String(action?.accion || action || '').toLowerCase();
          if (act !== 'borrar') continue;
          const allIhs = [
            ...(Array.isArray(meta?.image_hotspots) ? meta.image_hotspots : []),
            ...(Array.isArray(meta?.imagenes) ? meta.imagenes : []),
            ...(Array.isArray(itemActual?.image_hotspots) ? itemActual.image_hotspots : []),
            ...(Array.isArray(itemActual?.imagenes) ? itemActual.imagenes : []),
            ...(Array.isArray(wrapper?.__image_hotspots) ? wrapper.__image_hotspots : [])
          ];
          let ih = allIhs.find(x => String(x.id) === String(imgId) || String(x.signature) === String(imgId));
          if (!ih && (action?.page_num !== undefined || action?.page !== undefined)) {
            ih = action;
          }
          if (!ih) continue;
          if (!esDeEstaPagina(ih, idx0)) continue;
          hotspotsAEliminar.push( {
            tipo:'imagen', id:imgId, accion:'borrar',
            hotspot:ih, page_num:ih.page_num ?? ih.page, img_idx:ih.img_idx
          }
  );
        }
      }
      if (!isLeft && typeof calcularPlanReflujo === 'function' && typeof aplicarPlanEnCanvas === 'function' &&
      (hotspotsAEliminar.length || hotspotsCambios.length)) {
        const plan = await calcularPlanReflujo(pagina, viewport, hotspotsAEliminar, hotspotsCambios);
        if (typeof window !== 'undefined') { window.__DDD_PLANES_EXPORT = window.__DDD_PLANES_EXPORT ||  { }
          ;
          window.__DDD_PLANES_EXPORT[idx0] = plan || null;
        }
        if (plan?.operaciones?.length) {
          const opsPlan = Array.isArray(plan.operaciones) ? plan.operaciones : [];
          if (wrapper) {
            wrapper.__plan = plan;
            wrapper.__operaciones = opsPlan;
          }
          const generado = await aplicarPlanEnCanvas(canvas, plan,  {
            marginTop:48, marginBottom:48,
            imageLoader: async (ruta) =>  {
              if (!ruta) return null;
              try {
                const rr = await fetch('/api/image_asset?grado=' + encodeURIComponent(itemActual?._rama || '') + '&ruta=' + encodeURIComponent(ruta));
                if (!rr.ok) return null;
                const blob = await rr.blob();
                return await new Promise((resolve,reject)=> {
                  const u=URL.createObjectURL(blob), im=new Image();
                  im.onload=()=> {
                    URL.revokeObjectURL(u);
                    resolve(im);
                  }
                  ;
                  im.onerror=()=> {
                    URL.revokeObjectURL(u);
                    reject(new Error('imagen'));
                  }
                  ;
                  im.src=u;
                }
  );
              } catch(_e) {
                return null;
              }
            }
          }
  );
          if (typeof renderizarSustitucionEnunciadoPagina === 'function') {
            renderizarSustitucionEnunciadoPagina(wrapper, viewport, plan, opsPlan, stHotspots, generado, idx0, elRef);
          }
          if (typeof renderizarEliminacionHotspotsPagina === 'function') {
            renderizarEliminacionHotspotsPagina(wrapper, viewport, plan, opsPlan, allNameHotspots, allSchoolHotspots, meta, itemActual, aplicarNombres, aplicarColegio);
          }
          if (typeof anadirOverlaysPagina === 'function' && !isLeft) {
            anadirOverlaysPagina(wrapper, meta, itemActual, false);
          }
          if (typeof crearCapaTextoSeleccionable === 'function') {
            const layer = crearCapaTextoSeleccionable(lineas, plan, hotspotsAEliminar, canvas, viewport);
            if (layer) wrapper.appendChild(layer);
          }
          // Solo ahora, cuando el plan y las opciones seleccionadas ya están
          // aplicados, hacemos visible el resultado del visor.
          canvas.style.visibility = 'visible';
          return;
        }
      }
    } catch (e) {
      console.warn('[REFLUJO-RENDER] Error aplicando plan de reflujo:', e);
    }
  }
  try {
    const lineasBase = typeof extraerLineasTexto === 'function' ? await extraerLineasTexto(pagina, viewport) : [];
    const layer = crearCapaTextoSeleccionable(lineasBase, null, [], canvas, viewport);
    if (layer) wrapper.appendChild(layer);
  } catch (_) {
  }
  // Aunque no haya operaciones DDDDD que aplicar, la pantalla de carga solo
  // desaparece cuando hemos terminado de decidir/aplicar el estado actual.
  canvas.style.visibility = 'visible';
}
function crearCapaTextoSeleccionable(lineas, plan, eliminaciones, canvas, viewport) {
  const layer = document.createElement('div');
  layer.className = 'pdfTextLayer text-layer-seleccionable';
  layer.style.position = 'absolute';
  layer.style.left = '0';
  layer.style.top = '0';
  layer.style.width = canvas.width + 'px';
  layer.style.height = canvas.height + 'px';
  layer.style.overflow = 'hidden';
  layer.style.pointerEvents = 'auto';
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const compact = v => norm(v).replace(/\s+/g, '');
  const shiftBefore = y =>  {
    let shift = 0;
    for (const o of (plan?.operaciones || [])) {
      if (o.tipo === 'colapsar_flujo' && Number(o.origenBottom) <= y + 0.01) {
        shift += Math.max(0, Number(o.origenBottom) - Number(o.origenTop));
      } else if (o.tipo === 'colapsar_flujo_foto_hasta' && y >= Number(o.origenBottom) - 0.01 && y < Number(o.stopTop) - 0.01) {
        shift += Math.max(0, Number(o.origenBottom) - Number(o.origenTop));
      }
    }
    return shift;
  }
  ;
  const parciales = (eliminaciones || []).filter(x => x.tipo !== 'imagen' && !x.eliminarLineaCompleta && x.textoObjetivo);
  for (const l of (lineas || [])) {
    const full = (plan?.operaciones || []).some(o =>
    o.tipo === 'colapsar_flujo' && o.origenTipo === 'texto' && Math.abs(Number(o.origenTop) - Number(l.top)) < 2
  );
    if (full) continue;
    let txt = String(l.texto || '');
    let left = Number(l.left);
    let width = Math.max(1, Number(l.right) - Number(l.left));
    for (const e of parciales) {
      const target = compact(e.textoObjetivo);
      if (target && compact(txt).startsWith(target)) {
        const raw = String(l.texto || '');
        const idx = compact(raw).indexOf(target);
        if (idx >= 0) {
          const ratio = Math.max(1, compact(raw).length);
          const cut = (Number(l.right) - Number(l.left)) * ((idx + target.length) / ratio);
          left += cut;
          width = Math.max(1, Number(l.right) - left);
          txt = raw.slice(Math.min(raw.length, e.textoObjetivo.length));
        }
      }
    }
    if (!txt.trim()) continue;
    const span = document.createElement('span');
    span.textContent = txt;
    span.style.position = 'absolute';
    span.style.left = left + 'px';
    span.style.top = (Number(l.top) - shiftBefore(Number(l.top))) + 'px';
    span.style.width = width + 'px';
    span.style.height = Math.max(8, Number(l.height)) + 'px';
    span.style.fontSize = Math.max(6, Number(l.height) * 0.8) + 'px';
    span.style.lineHeight = Math.max(8, Number(l.height)) + 'px';
    span.style.whiteSpace = 'nowrap';
    span.style.color = 'transparent';
    span.style.userSelect = 'text';
    span.style.webkitUserSelect = 'text';
    span.style.pointerEvents = 'auto';
    layer.appendChild(span);
  }
  return layer;
}
function renderizarSustitucionEnunciadoPagina(wrapper, viewport, plan, opsPlan, stHotspots, generado, idx0, elRef) {
  if (!wrapper || !opsPlan) return;
  const compact = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
  const rightHotspots = wrapper.__dddRightHotspots || [];
  const shiftBeforeY = (y) =>  {
    let sh = 0;
    for (const o of opsPlan) {
      if (o.tipo === 'reemplazar_texto' && Number(o.bottom) <= Number(y) + 0.01) {
        const box = o.anchorBox || null;
        const bTop = box ? Number(box.top) : Infinity;
        const d = Number(o._delta || 0);
        if (d > 0) {
          if (y >= bTop) {
            const gap = Math.max(0, bTop - Number(o.bottom));
            const exceso = Math.max(0, d - gap);
            sh -= exceso;
          } else {
            sh -= d;
          }
        } else if (d < 0) {
          sh -= d;
        }
      }
    }
    return sh;
  }
  ;
  const pctRect = (left, top, right, bottom, clase, tipo, source = null) =>  {
    const l = Math.max(0, Number(left));
    const t = Math.max(0, Number(top));
    const r = Math.min(viewport.width, Number(right));
    const b = Math.min(viewport.height, Number(bottom));
    if (!(r > l && b > t)) return;
    rightHotspots.push( {
      left: l / viewport.width * 100,
      top: t / viewport.height * 100,
      width: (r - l) / viewport.width * 100,
      height: (b - t) / viewport.height * 100,
      clase, tipo, source
    }
  );
  }
  ;
  const claseEnunciado = (source) =>  {
    const activo = source?.include !== false;
    const tieneNuevo = !!String(source?.new ?? source?.newText ?? '').trim();
    const esCustom = !!source?.custom;
    if (!activo) return 'gray-hotspot';
    if (esCustom && !tieneNuevo) return 'orange-hotspot';
    return tieneNuevo ? 'green-hotspot' : 'red-hotspot';
  }
  ;
  for (const op of opsPlan.filter(x => x.tipo === 'reemplazar_texto')) {
    const src = (stHotspots || []).find(sh => compact(sh.start || sh.old || sh.original || '') === compact(op.start || op.old || '')) || op.source || {};
    const tieneNuevo = !!String(src?.new ?? src?.newText ?? op.nuevoTexto ?? '').trim();
    if (!tieneNuevo) continue;
    const originalTop = Number(op.top);
    const shift = shiftBeforeY(originalTop);
    const finalTop = originalTop - shift;
    const finalBottom = Number.isFinite(Number(op._finalBottom))
    ? Number(op._finalBottom)
    : finalTop + Math.max(1, Number(op.bottom) - Number(op.top));
    const leftPx = Number.isFinite(Number(op.hotspotLeft)) ? Number(op.hotspotLeft) : (Number.isFinite(Number(op.left)) ? Number(op.left) : (Number(src?.pct_left ?? src?.left ?? 0) / 100 * viewport.width));
    const rightPx = Number.isFinite(Number(op.hotspotRight)) ? Number(op.hotspotRight) : (Number.isFinite(Number(op.right)) ? Number(op.right) : (leftPx + Number(src?.pct_width ?? src?.width ?? 50) / 100 * viewport.width));
    pctRect(leftPx, finalTop, rightPx, finalBottom, claseEnunciado(src), 'enunciado', src);
  }
  wrapper.__dddRightHotspots = rightHotspots;
  if (generado?.continuations?.length) {
    generado.continuations.forEach((c, n) =>  {
      const idxStr = `${idx0}.c${n}`;
      if (elRef) {
        const oldC = elRef.querySelector(`.ddd-continuacion[data-pagina-idx="${idxStr}"]`);
        if (oldC) oldC.remove();
      }
      const cont = document.createElement('div');
      cont.className = 'pagina-wrapper ddd-continuacion';
      cont.dataset.paginaIdx = idxStr;
      cont.style.width = `${Math.round(viewport.width / ESCALA_DDDDD)}px`;
      cont.style.height = `${Math.round(viewport.height / ESCALA_DDDDD)}px`;
      cont.style.minHeight = `${Math.round(viewport.height / ESCALA_DDDDD)}px`;
      cont.dataset.naturalWidth = String(viewport.width / ESCALA_DDDDD);
      cont.dataset.naturalHeight = String(viewport.height / ESCALA_DDDDD);
      cont.style.marginBottom = '0';
      cont.style.flex = '0 0 auto';
      // Las continuaciones están fuera del wrapper de la página original, por
      // lo que también necesitan exactamente la misma reducción visual. El
      // canvas interno sigue renderizado a 3x y no cambia ninguna coordenada DDDDD.
      if (wrapper.dataset.dddVisualScale) {
        cont.style.zoom = wrapper.dataset.dddVisualScale;
        cont.dataset.dddRenderScale = wrapper.dataset.dddRenderScale || '';
        cont.dataset.dddVisualScale = wrapper.dataset.dddVisualScale;
      }
      c.style.display = 'block';
      c.style.width = `${viewport.width}px`;
      c.style.height = `${viewport.height}px`;
      c.style.marginTop = '0';
      c.style.marginBottom = '0';
      cont.appendChild(c);
      const parent = wrapper.parentNode || elRef;
      if (parent) {
        if (wrapper.nextSibling) parent.insertBefore(cont, wrapper.nextSibling);
        else parent.appendChild(cont);
      }
    }
  );
  }
}
window._renderPaginaPDFJS = _renderPaginaPDFJS;
window.crearCapaTextoSeleccionable = crearCapaTextoSeleccionable;
window.renderizarSustitucionEnunciadoPagina = renderizarSustitucionEnunciadoPagina;
