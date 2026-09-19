let currentEditingHotspot = null;
function openEnunciadoPopup(sh, e, elBox) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof closeNombrePopup === 'function') closeNombrePopup();
  if (typeof closeColegioPopup === 'function') closeColegioPopup();
  const flImg = document.getElementById('floatingImgMenu');
  if (flImg) flImg.style.display = 'none';
  if (typeof marcarHotspotSeleccionado === 'function') marcarHotspotSeleccionado(elBox || (e && e.currentTarget) || (e && e.target));
  if (sh) currentEditingHotspot = sh;
  const flMenu = document.getElementById('floatingPdfMenu');
  if (!flMenu) return;
  const btnEl = document.getElementById('btnEliminarEnunciado'), bdg = document.getElementById('floatStatusBadge'), btnRest = document.getElementById('btnRestaurarEnunciado');
  const desact = (sh && sh.include === false);
  if (btnEl) {
    btnEl.innerHTML = desact ? '<i class="fa-solid fa-circle-check"></i> Activar Enunciado' : '<i class="fa-solid fa-trash-can"></i> Eliminar Enunciado';
    btnEl.style.background = desact ? '#10b981' : '#ef4444';
  }
  if (bdg) {
    bdg.textContent = desact ? 'Desactivado' : (sh && sh.new ? 'Reescrito' : 'Detectado');
    bdg.className = desact ? 'badge o' : 'badge v';
  }
  if (btnRest) {
    btnRest.style.display = (sh && !sh.custom && (sh.id !== undefined || sh.old || sh.new !== undefined)) ? 'inline-flex' : 'none';
  }
  flMenu.style.display = 'flex';
}
function closeEnunciadoPopup() {
  document.querySelectorAll('.red-hotspot, .orange-hotspot, .green-hotspot, .gray-hotspot').forEach(el => el.classList.remove('selected'));
  const flMenu = document.getElementById('floatingPdfMenu');
  if (flMenu) flMenu.style.display = 'none';
}
async function editarEnunciadoDesdePopup() {
  closeEnunciadoPopup();
  await openEditarEnunciadoModal(currentEditingHotspot);
}
async function eliminarEnunciadoDesdePopup() {
  closeEnunciadoPopup();
  const it = ITEMS[POS], sh = currentEditingHotspot, desact = (sh && sh.include === false);
  const _scrollAntes = (typeof capturarPosicionVisores === 'function') ? capturarPosicionVisores() : null;
  if (typeof pedirRestauracionVisores === 'function') pedirRestauracionVisores(_scrollAntes);
  showBlocker(desact ? 'Activando enunciado...' : 'Eliminando enunciado...');
  try {
    const url = desact ? '/api/save_enunciado' : '/api/delete_enunciado';
    const payload = desact ?  {
      grado: (it?._rama || grad), archivo: it.archivo, start: sh.start || '', end: sh.end || '', new_text: sh.new || '', page: sh.page, pct_top: sh.top
    }
    :  {
      grado: (it?._rama || grad), archivo: it.archivo, start: sh ? (sh.start || '') : '', end: sh ? (sh.end || '') : '', custom: !!(sh && sh.custom), hotspot_id: sh ? sh.id : undefined, page: sh ? sh.page : undefined
    }
    ;
    await fetch(url,  {
      method: 'POST', headers:  { 'Content-Type': 'application/json' }
      , body: JSON.stringify(payload)
    }
  );
    if (typeof load === 'function') await load();
    hideBlocker();
    refreshRightIframe();
  } catch (err) {
    hideBlocker();
    void 0;
  }
}
async function handlePopupAction(val) {
  closeEnunciadoPopup();
  await setInc(val);
}
async function restoreInitialSuggestion() {
  closeEnunciadoPopup();
  const it = ITEMS[POS];
  if (!it) return;
  const _scrollAntes = (typeof capturarPosicionVisores === 'function') ? capturarPosicionVisores() : null;
  if (typeof pedirRestauracionVisores === 'function') pedirRestauracionVisores(_scrollAntes);
  showBlocker('Eliminando historial inicial...');
  try {
    await fetch('/api/reset_item',  {
      method: 'POST', headers:  { 'Content-Type': 'application/json' }
      , body: JSON.stringify( { grado: (it?._rama || grad), archivo: it.archivo }
      )
    }
  );
    Object.assign(it,  {
      inc: false, int: false, col: false, ren: false, internet: false, enunciados: [], recuadros:  { } }
  );
    if (typeof load === 'function') await load();
    hideBlocker();
    refreshRightIframe();
  } catch (err) {
    hideBlocker();
    void 0;
  }
}

window.openEnunciadoPopup = openEnunciadoPopup;
window.closeEnunciadoPopup = closeEnunciadoPopup;
window.editarEnunciadoDesdePopup = editarEnunciadoDesdePopup;
window.eliminarEnunciadoDesdePopup = eliminarEnunciadoDesdePopup;
window.restoreInitialSuggestion = restoreInitialSuggestion;
