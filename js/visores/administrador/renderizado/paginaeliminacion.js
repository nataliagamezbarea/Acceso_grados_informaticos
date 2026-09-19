/* Renderizado de Hotspots de Eliminación (Nombres, Colegio e Imágenes) en página: responsabilidad única y 100% aislada. */
function renderizarEliminacionHotspotsPagina(wrapper, viewport, plan, opsPlan, allNameHotspots, allSchoolHotspots, meta, itemActual, aplicarNombres, aplicarColegio) {
  if (!wrapper || !opsPlan) return;
  const compact = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
  const rightHotspots = wrapper.__dddRightHotspots || [];
  const shiftBeforeY = (y) =>  {
    let sh = 0;
    const box = meta?.rects?.[0] || meta?.rectangulos?.[0] || null;
    const bTop = recOp ? Number(recOp.cajaTopAntes ?? recOp.cajaTop ?? 0) : (box ? Number(box.top) : Infinity);
    for (const o of opsPlan) {
      if (o.tipo === 'colapsar_flujo' && Number(o.origenBottom) <= Number(y) + 0.01) {
        sh += Math.max(0, Number(o.origenBottom) - Number(o.origenTop));
      } else if (o.tipo === 'colapsar_flujo_foto_hasta' && Number(y) >= Number(o.origenBottom) - 0.01 && Number(y) < Number(o.stopTop) - 0.01) {
        sh += Math.max(0, Number(o.origenBottom) - Number(o.origenTop));
      } else if (o.tipo === 'reemplazar_texto' && Number(o.top) < Number(y)) {
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
  const recOp = opsPlan.find(x => x.tipo === 'reconstruir_caja') || null;
  const addDeletedHotspot = (h, tipo, activo = true) =>  {
    if (!h || !activo) return;
    const l = Number(h.left ?? h.pct_left ?? 0) / 100 * viewport.width;
    const t0 = Number(h.top ?? h.pct_top ?? 0) / 100 * viewport.height;
    const w = Number(h.width ?? h.pct_width ?? 10) / 100 * viewport.width;
    const hh = Number(h.height ?? h.pct_height ?? 4) / 100 * viewport.height;
    const box = meta?.rects?.[0] || meta?.rectangulos?.[0] || null;
    const bTop = recOp ? Number(recOp.cajaTopAntes ?? recOp.cajaTop ?? 0) : (box ? Number(box.top) : Infinity);
    let finalTop = t0 - shiftBeforeY(t0);
    if (recOp && t0 >= bTop - 15) {
      const targetTxt = compact(h.text || h.texto || h.start || h.old || '');
      const recLine = Array.isArray(recOp.lineas)
      ? recOp.lineas.find(line =>  {
        const cL = compact(line.texto);
        if (!cL || !targetTxt) return false;
        if (tipo === 'colegio') {
          const isSchoolText = /SAN\s*JOSE|COLEGIO|IES|INSTITUTO|CEIP|OBRERO/i.test(line.texto);
          if (!isSchoolText) return false;
        }
        return cL.includes(targetTxt) || targetTxt.includes(cL);
      }
      )
      : null;
      if (recLine) { finalTop = Number(recOp.cajaTop) + Number(recLine.relY ?? 0); }
      else {
        const relY = Math.max(0, t0 - Number(recOp.cajaTopAntes ?? bTop));
        finalTop = Number(recOp.cajaTop) + relY;
      }
    }
    let cls = 'blue-name-hotspot';
    if (tipo === 'nombre') cls = activo ? 'blue-name-hotspot' : 'gray-name-hotspot';
    else if (tipo === 'colegio') cls = activo ? 'school-hotspot' : 'gray-school-hotspot';
    pctRect(l, finalTop, l + w, finalTop + hh, cls, tipo, h);
  }
  ;
  const pageNum = Number.isFinite(Number(meta?.page_num)) ? Number(meta.page_num) : 0;
  const esDeEstaPagina = (h, pno) => {
    if (!h) return false;
    const raw = (h.page_num !== undefined && h.page_num !== null && String(h.page_num).trim() !== '')
      ? h.page_num
      : ((h.page !== undefined && h.page !== null && String(h.page).trim() !== '') ? h.page : null);
    const hp = raw !== null ? Number(String(raw).replace(/[^0-9]/g, '')) : null;
    return Number.isFinite(hp) ? hp === pno : (pno === 0);
  };
  const nameList = (allNameHotspots && allNameHotspots.length)
  ? allNameHotspots
  : [
  ...(Array.isArray(meta?.name_hotspots) ? meta.name_hotspots : []),
  ...(Array.isArray(itemActual?.name_hotspots) ? itemActual.name_hotspots : [])
  ];
  const seenNames = new Set();
  for (const nh of nameList) {
    if (!esDeEstaPagina(nh, pageNum)) continue;
    const key = String(nh.id ?? (nh.left + '-' + nh.top + '-' + nh.text));
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    const act = (accionesNombre[String(nh.id || '')] || accionesNombre.default)?.accion || defaultNomAct;
    const isActivo = (aplicarNombres && act === 'eliminar');
    addDeletedHotspot(nh, 'nombre', isActivo);
  }
  const schoolList = (allSchoolHotspots && allSchoolHotspots.length)
  ? allSchoolHotspots
  : [
  ...(Array.isArray(meta?.school_hotspots) ? meta.school_hotspots : []),
  ...(Array.isArray(itemActual?.school_hotspots) ? itemActual.school_hotspots : [])
  ];
  const seenSchools = new Set();
  for (const sh of schoolList) {
    if (!esDeEstaPagina(sh, pageNum)) continue;
    const key = String(sh.id ?? (sh.left + '-' + sh.top + '-' + sh.text));
    if (seenSchools.has(key)) continue;
    seenSchools.add(key);
    const act = (accionesColegio[String(sh.id || '')] || accionesColegio.default)?.accion || defaultColAct;
    const isActivo = (aplicarColegio && act === 'eliminar');
    addDeletedHotspot(sh, 'colegio', isActivo);
  }
  for (const op of opsPlan.filter(x => x.tipo === 'redactar_imagen' || x.tipo === 'reemplazar_imagen')) {
    const shift = shiftBeforeY(Number(op.top));
    pctRect(Number(op.left), Number(op.top) - shift, Number(op.right), Number(op.bottom) - shift,
    op.tipo === 'reemplazar_imagen' ? 'image-hotspot replaced' : 'image-hotspot deleted', 'imagen', op.source || op.hotspot || op);
  }
  wrapper.__dddRightHotspots = rightHotspots;
}
window.renderizarEliminacionHotspotsPagina = renderizarEliminacionHotspotsPagina;
