/* CREACION DE HOTSPOTS DE NOMBRES (< 85 lineas) */
function _crearHotspotNombre(nh, pageDiv, isLeft, it, p) {
  if (!nh) return;
  const activo = (it?.inc_interior !== false);
  if (!isLeft && !activo) return;
  const pageNum = Number.isFinite(Number(p?.page_num)) ? Number(p.page_num) : 0;
  const rawP = (nh.page_num !== undefined && nh.page_num !== null) ? nh.page_num : ((nh.page !== undefined && nh.page !== null) ? nh.page : null);
  const hp = rawP !== null ? Number(String(rawP).replace(/[^0-9]/g, '')) : null;
  if (Number.isFinite(hp) ? hp !== pageNum : pageNum !== 0) return;
  const left = (nh.left !== undefined ? nh.left : (nh.pct_left !== undefined ? nh.pct_left : 5));
  const top = (nh.top !== undefined ? nh.top : (nh.pct_top !== undefined ? nh.pct_top : 5));
  const width = (nh.width !== undefined ? nh.width : (nh.pct_width !== undefined ? nh.pct_width : 30));
  const height = (nh.height !== undefined ? nh.height : (nh.pct_height !== undefined ? nh.pct_height : 4));
  const box = document.createElement('div');
  box.style.position = 'absolute';
  box.style.left = left + '%';
  box.style.top = top + '%';
  box.style.width = width + '%';
  box.style.height = height + '%';
  box.className = activo ? 'blue-name-hotspot' : 'gray-name-hotspot';
  box.style.pointerEvents = 'auto';
  box.style.userSelect = 'none';
  box.setAttribute('data-hotspot-interactive', '1');
  box.style.zIndex = '101';
  box.style.boxSizing = 'border-box';
  box.style.borderColor = '#3b82f6';
  box.style.backgroundColor = 'rgba(59, 130, 246, 0.22)';
  box.title = activo ? (nh.manual ? 'Nombre (Recuadro manual)' : 'Nombre (Activo para borrar)') : 'Nombre (Desactivado)';
  box.onpointerdown = (e) =>  { e.stopPropagation(); }
  ;
  box.onmousedown = (e) =>  { e.stopPropagation(); }
  ;
  box.onclick = (e) =>  {
    e.stopPropagation();
    if (typeof openNombrePopup === 'function') openNombrePopup(nh, e, box);
  }
  ;
  if (isLeft && typeof anadirHandlesRedimensionamiento === 'function') {
    anadirHandlesRedimensionamiento(box, nh, pageNum, 'nombre');
  }
  const host = pageDiv.__hotspotOverlayLayer || pageDiv;
  host.appendChild(box);
}
