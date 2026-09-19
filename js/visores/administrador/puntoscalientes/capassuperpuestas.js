function anadirOverlaysPagina(wrapper, p, it, isLeft, opciones =  {
}
) {
  if (!p || !wrapper) return;
  const paginaActual = Number.isFinite(Number(p?.page_num)) ? Number(p.page_num) : 0;
  const esDeEstaPagina = (h) => {
    if (!h) return false;
    const raw = (h.page_num !== undefined && h.page_num !== null && String(h.page_num).trim() !== '')
      ? h.page_num
      : ((h.page !== undefined && h.page !== null && String(h.page).trim() !== '') ? h.page : null);
    const hp = raw !== null ? Number(String(raw).replace(/[^0-9]/g, '')) : null;
    return Number.isFinite(hp) ? hp === paginaActual : (paginaActual === 0);
  };
  const dedupeHotspots = (arr) =>  {
    const out = [];
    const seen = new Set();
    for (const h of (Array.isArray(arr) ? arr : [])) {
      if (!esDeEstaPagina(h)) continue;
      const key = String(h.id ?? '') + '|' + String(h.page_num ?? h.page ?? '') + '|' + String(h.left ?? h.pct_left ?? '') + '|' + String(h.top ?? h.pct_top ?? '') + '|' + String(h.text ?? h.start ?? h.old ?? '');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
    }
    return out;
  }
  ;
  // IZQUIERDA: hotspots editables exactamente sobre el documento original.
  if (isLeft) {
    // Capa dedicada siempre encima del canvas/text layer. Esto evita que otra
    // capa del visor o una regla CSS tape accidentalmente los hotspots.
    let hotspotLayer = wrapper.querySelector(':scope > .hotspot-overlay-layer');
    if (!hotspotLayer) {
      hotspotLayer = document.createElement('div');
      hotspotLayer.className = 'hotspot-overlay-layer';
      hotspotLayer.style.position = 'absolute';
      hotspotLayer.style.left = '0';
      hotspotLayer.style.top = '0';
      hotspotLayer.style.width = '100%';
      hotspotLayer.style.height = '100%';
      hotspotLayer.style.zIndex = '100';
      hotspotLayer.style.pointerEvents = 'none';
      hotspotLayer.style.isolation = 'isolate';
      hotspotLayer.style.boxSizing = 'border-box';
      wrapper.appendChild(hotspotLayer);
    }
    // Limpiar siempre para que al recargar la página los hotspots se sitúen exactamente donde son
    hotspotLayer.innerHTML = '';
    wrapper.__hotspotOverlayLayer = hotspotLayer;
    const mostrarEnc = (opciones.enc !== false && opciones.enc !== '0');
    const mostrarNom = (opciones.int !== false && opciones.int !== '0');
    const mostrarCol = (opciones.col !== false && opciones.col !== '0');
    const meta = p;
    if (mostrarEnc) {
      let stHotspots = Array.isArray(meta.statement_hotspots) ? meta.statement_hotspots : null;
      if (!Array.isArray(stHotspots) || !stHotspots.length) {
        stHotspots = Array.isArray(it?.statement_hotspots) ? it.statement_hotspots : [];
      }
      // Compatibilidad DDDDD: algunos registros antiguos solo conservan
      // `enunciados` en el elemento. En ese caso no debemos dejar la columna
      // izquierda sin hotspots. Construimos los hotspots de la página actual
      // a partir de esos registros, respetando su página cuando exista.
      if ((!Array.isArray(stHotspots) || !stHotspots.length) && Array.isArray(it?.enunciados)) {
        const pageNum = Number.isFinite(Number(meta?.page_num)) ? Number(meta.page_num) : 0;
        stHotspots = it.enunciados.map((e, idx) => ( {
          id: e?.id ?? idx,
          start: e?.start || e?.old || '',
          old: e?.old || e?.start || '',
          new: e?.new || '',
          include: e?.include !== false,
          custom: !!e?.custom,
          page: e?.page !== undefined ? Number(e.page) : 0,
          left: e?.pct_left ?? e?.left,
          top: e?.pct_top ?? e?.top,
          width: e?.pct_width ?? e?.width,
          height: e?.pct_height ?? e?.height
        }
        )).filter(e =>  {
          const ep = Number(e.page ?? 0);
          return ep === pageNum;
        }
  );
      }
      dedupeHotspots(stHotspots).forEach(sh =>  {
        try { _crearHotspotEnunciado(sh, wrapper, isLeft, it, meta); }
        catch (_e) { } }
  );
    }
    if (mostrarNom) {
      const nameHotspots = dedupeHotspots([
      ...(Array.isArray(meta?.name_hotspots) ? meta.name_hotspots : []),
      ...(Array.isArray(it?.name_hotspots) ? it.name_hotspots : [])
      ]);
      for (const nh of nameHotspots) {
        try { _crearHotspotNombre(nh, wrapper, true, it, meta); }
        catch (e) { console.error('[HOTSPOT NOMBRE] Error pintando hotspot:', nh, e); }
      }
    }
    if (mostrarCol) {
      const schoolHotspots = dedupeHotspots([
      ...(Array.isArray(meta?.school_hotspots) ? meta.school_hotspots : []),
      ...(Array.isArray(it?.school_hotspots) ? it.school_hotspots : [])
      ]);
      for (const sh of schoolHotspots) {
        try { _crearHotspotColegio(sh, wrapper, true, it, meta); }
        catch (e) { console.error('[HOTSPOT COLEGIO] Error pintando hotspot:', sh, e); }
      }
    }
    if (Array.isArray(meta.reflow_hotspots) && typeof _crearHotspotReflujo === 'function') {
      dedupeHotspots(meta.reflow_hotspots).forEach(rh =>  {
        try { _crearHotspotReflujo(rh, wrapper, true, it, meta); }
        catch (_e) { } }
  );
    }
    const imageHotspots = dedupeHotspots([
      ...(Array.isArray(meta?.image_hotspots) ? meta.image_hotspots : []),
      ...(Array.isArray(it?.image_hotspots) ? it.image_hotspots : []),
      ...(Array.isArray(wrapper?.__image_hotspots) ? wrapper.__image_hotspots : [])
    ]);
    for (const ih of imageHotspots) {
      try { _crearHotspotImagen(ih, wrapper, true, it, meta); }
      catch (_e) { }
    }
    try {
    } catch (_) {
    }
    if (typeof attachDrawingToPage === 'function') {
      try { attachDrawingToPage(wrapper, p, it); }
      catch (_e) { } }
    return;
  }
  // DERECHA: referencias visuales interactuables de los cambios reales.
  let hotspotLayer = wrapper.querySelector(':scope > .hotspot-overlay-layer');
  if (!hotspotLayer) {
    hotspotLayer = document.createElement('div');
    hotspotLayer.className = 'hotspot-overlay-layer';
    hotspotLayer.style.position = 'absolute';
    hotspotLayer.style.left = '0';
    hotspotLayer.style.top = '0';
    hotspotLayer.style.width = '100%';
    hotspotLayer.style.height = '100%';
    hotspotLayer.style.zIndex = '100';
    hotspotLayer.style.pointerEvents = 'none';
    hotspotLayer.style.isolation = 'isolate';
    hotspotLayer.style.boxSizing = 'border-box';
    wrapper.appendChild(hotspotLayer);
  }
  hotspotLayer.innerHTML = '';
  wrapper.__hotspotOverlayLayer = hotspotLayer;
  wrapper.querySelectorAll(':scope > .green-hotspot, :scope > [data-hotspot-interactive="1"]').forEach(el => el.remove());

  const refs = Array.isArray(opciones.rightHotspots)
  ? opciones.rightHotspots
  : (Array.isArray(wrapper.__dddRightHotspots) ? wrapper.__dddRightHotspots : []);
  for (const ref of refs) {
    const box = document.createElement('div');
    box.className = ref.clase || 'green-hotspot';
    box.style.position = 'absolute';
    box.style.left = `${Number(ref.left) || 0}%`;
    box.style.top = `${Number(ref.top) || 0}%`;
    box.style.width = `${Math.max(0, Number(ref.width) || 0)}%`;
    box.style.height = `${Math.max(0, Number(ref.height) || 0)}%`;
    box.style.pointerEvents = 'auto';
    box.style.zIndex = '103';
    box.style.boxSizing = 'border-box';
    box.setAttribute('data-hotspot-interactive', '1');
    const src = ref.source || {};
    if (ref.tipo === 'enunciado') {
      box.title = `Enunciado: ${(src.start || src.old || '')} → ${(src.new || src.newText || '')}`;
    } else if (ref.tipo === 'nombre') {
      box.title = ref.clase?.includes('blue') ? (src.manual ? 'Nombre (Recuadro manual)' : 'Nombre (Activo para borrar)') : 'Nombre (Desactivado)';
    } else if (ref.tipo === 'colegio') {
      box.title = (ref.clase?.includes('school') && !ref.clase?.includes('gray')) ? (src.manual ? 'Colegio (Recuadro manual)' : 'Colegio/Logo (Activo para borrar)') : 'Colegio/Logo (Desactivado)';
    } else if (ref.tipo === 'imagen') {
      box.title = 'Imagen. Clic para opciones de reemplazo/borrado/internet.';
    }
    box.onpointerdown = (e) =>  { e.stopPropagation(); };
    box.onmousedown = (e) =>  { e.stopPropagation(); };
    box.onclick = (e) =>  {
      e.stopPropagation();
      const sh = ref.source ||  {};
      if (ref.tipo === 'enunciado' && typeof openEnunciadoPopup === 'function') {
        openEnunciadoPopup(sh, e, box);
      } else if (ref.tipo === 'nombre' && typeof openNombrePopup === 'function') {
        openNombrePopup(sh, e, box);
      } else if (ref.tipo === 'colegio' && typeof openColegioPopup === 'function') {
        openColegioPopup(sh, e, box);
      } else if (ref.tipo === 'imagen' && typeof openImagePopup === 'function') {
        openImagePopup(sh, e);
      }
    };
    hotspotLayer.appendChild(box);
  }
}
