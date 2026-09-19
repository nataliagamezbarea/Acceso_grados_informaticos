/* POPUP DE IMAGENES (< 60 lineas) */
let selectedImageIh = null;
function openImagePopup(ih, e) {
  selectedImageIh = ih;
  if (typeof closeNombrePopup === 'function') closeNombrePopup();
  const flPdf = document.getElementById('floatingPdfMenu');
  if (flPdf) flPdf.style.display = 'none';
  if (typeof closeColegioPopup === 'function') closeColegioPopup();
  const flImgMenu = document.getElementById('floatingImgMenu');
  if (!flImgMenu) return;
  const lblExp = document.getElementById('lblExcepcionInternet');
  const cbExp = document.getElementById('cbNoBorrarInternet');
  const intActivo = isAutoDelInternetActive();
  if (lblExp) {
    lblExp.style.display = intActivo ? 'inline-flex' : 'none';
    if (intActivo && cbExp) { const it = (typeof ITEMS !== 'undefined' && ITEMS[POS]) ? ITEMS[POS] :  { }
      ;
      const acc = (it.imagenes ||  {
      }
      )[ih.id] ||  {
      }
      ;
      cbExp.checked = (acc.accion === 'conservar' || acc.no_borrar === true || ih.accion === 'conservar');
    }
  }
  flImgMenu.style.display = 'flex';
}
function toggleExcepcionInternet(checked) {
  if (!selectedImageIh) return;
  if (checked) {
    handleImageAction('conservar',  { no_borrar: true }
    , selectedImageIh);
  } else {
    handleImageAction('restaurar',  {
    }
    , selectedImageIh);
  }
}
function closeImgPopup() {
  const flImgMenu = document.getElementById('floatingImgMenu');
  if (flImgMenu) flImgMenu.style.display = 'none';
  selectedImageIh = null;
}
function closeImagePopup() { closeImgPopup(); }
function isAutoDelInternetActive() {
  if (typeof ITEMS !== 'undefined' && ITEMS[POS]) { return !!ITEMS[POS].inc_internet; }
  const cb = document.getElementById('cbBorrarImgInternet');
  return cb ? cb.checked : false;
}
function syncInternetCheckboxes() {
  const cb1 = document.getElementById('cbBorrarImgInternet');
  const cb2 = document.getElementById('cbBorrarImgInternetPopup');
  if (!cb1 && !cb2) return;
  const active = isAutoDelInternetActive();
  if (cb1) cb1.checked = active;
  if (cb2) cb2.checked = active;
}
function toggleAutoDelInternet(val) {
  if (typeof setInternet === 'function') { setInternet(val); }
  else {
    syncInternetCheckboxes();
    if (typeof refreshRightIframe === 'function') refreshRightIframe();
  }
}

window.openImagePopup = openImagePopup;
window.closeImgPopup = closeImgPopup;
window.closeImagePopup = closeImagePopup;
window.toggleExcepcionInternet = toggleExcepcionInternet;
window.toggleAutoDelInternet = toggleAutoDelInternet;
window.syncInternetCheckboxes = syncInternetCheckboxes;
