/* CREACION DE HOTSPOTS DE COLEGIOS E IMAGENES (< 85 lineas) */
function _crearHotspotColegio(sh, pageDiv, isLeft, it, p) {
  const pageNum = Number.isFinite(Number(p?.page_num)) ? Number(p.page_num) : 0;
  const rawP = (sh.page_num !== undefined && sh.page_num !== null) ? sh.page_num : ((sh.page !== undefined && sh.page !== null) ? sh.page : null);
  const hp = rawP !== null ? Number(String(rawP).replace(/[^0-9]/g, '')) : null;
  if (Number.isFinite(hp) ? hp !== pageNum : pageNum !== 0) return;
  const activo = (it.inc_colegio !== false);
  if (!isLeft && !activo) return;
  const box = document.createElement('div');
  box.style.position = 'absolute';
  box.style.left = (sh.left !== undefined ? sh.left : 5) + '%';
  box.style.top = (sh.top !== undefined ? sh.top : 5) + '%';
  box.style.width = (sh.width !== undefined ? sh.width : 40) + '%';
  box.style.height = (sh.height !== undefined ? sh.height : 6) + '%';
  box.className = activo ? 'school-hotspot' : 'gray-school-hotspot';
  box.style.pointerEvents = 'auto';
  box.style.userSelect = 'none';
  box.setAttribute('data-hotspot-interactive', '1');
  box.style.zIndex = '102';
  box.style.boxSizing = 'border-box';
  box.style.borderColor = '#f59e0b';
  box.style.backgroundColor = 'rgba(245, 158, 11, 0.22)';
  box.title = activo ? (sh.manual ? 'Colegio (Recuadro manual)' : 'Colegio/Logo (Activo para borrar)') : 'Colegio/Logo (Desactivado)';
  box.onpointerdown = (e) =>  { e.stopPropagation(); }
  ;
  box.onmousedown = (e) =>  { e.stopPropagation(); }
  ;
  box.onclick = (e) =>  {
    e.stopPropagation();
    if (typeof openColegioPopup === 'function') openColegioPopup(sh, e, box);
  }
  ;
  if (isLeft && typeof anadirHandlesRedimensionamiento === 'function') {
    anadirHandlesRedimensionamiento(box, sh, p.page_num, 'colegio');
  }
  const host = pageDiv.__hotspotOverlayLayer || pageDiv;
  host.appendChild(box);
}
function _crearHotspotImagen(ih, pageDiv, isLeft, it, p) {
  if (!isLeft || !ih) return;
  const pageNum = Number.isFinite(Number(p?.page_num)) ? Number(p.page_num) : 0;
  const rawP = (ih.page_num !== undefined && ih.page_num !== null) ? ih.page_num : ((ih.page !== undefined && ih.page !== null) ? ih.page : null);
  const hp = rawP !== null ? Number(String(rawP).replace(/[^0-9]/g, '')) : null;
  if (Number.isFinite(hp) ? hp !== pageNum : pageNum !== 0) return;
  const box = document.createElement('div');
  const acciones = {
    ...(it?.acciones_imagenes || {}),
    ...(it?.imagenes || {}),
    ...(it?.image_actions || {}),
    ...(p?.acciones_imagenes || {}),
    ...(p?.imagenes || {}),
    ...(p?.image_actions || {})
  };
  const acc = acciones && (acciones[ih.id] || acciones[ih.signature]);
  box.className = 'image-hotspot' + (acc && acc.accion === 'borrar' ? ' deleted' : '') + (acc && acc.accion === 'reemplazar' ? ' replaced' : '');
  box.style.position = 'absolute';
  const left = ih.left !== undefined ? ih.left : (ih.pct_left !== undefined ? ih.pct_left : 0);
  const top = ih.top !== undefined ? ih.top : (ih.pct_top !== undefined ? ih.pct_top : 0);
  const width = ih.width !== undefined ? ih.width : (ih.pct_width !== undefined ? ih.pct_width : 10);
  const height = ih.height !== undefined ? ih.height : (ih.pct_height !== undefined ? ih.pct_height : 10);
  box.style.left = left + '%';
  box.style.top = top + '%';
  box.style.width = width + '%';
  box.style.height = height + '%';
  box.title = `Imagen (${ih.id || 'img'}). Clic para opciones de reemplazo/borrado/internet.`;
  box.style.pointerEvents = 'auto';
  box.style.userSelect = 'none';
  box.style.zIndex = '104';
  box.setAttribute('data-hotspot-interactive', '1');
  box.onpointerdown = (e) =>  { e.stopPropagation(); };
  box.onmousedown = (e) =>  { e.stopPropagation(); };
  box.onclick = (e) =>  {
    e.stopPropagation();
    if (typeof openImagePopup === 'function') openImagePopup(ih, e);
  };
  const host = pageDiv.__hotspotOverlayLayer || pageDiv;
  host.appendChild(box);
}
