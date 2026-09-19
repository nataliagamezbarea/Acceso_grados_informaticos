/* POPUPS FLOTANTES DE NOMBRES Y COLEGIOS (< 65 lineas) */
let currentNombreHotspot = null, currentColegioHotspot = null;
function _prepararPopup(e, elBox, nh, flId, isName) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (typeof closeEnunciadoPopup === 'function') closeEnunciadoPopup();
  if (isName && typeof closeColegioPopup === 'function') closeColegioPopup();
  if (!isName && typeof closeNombrePopup === 'function') closeNombrePopup();
  const flImg = document.getElementById('floatingImgMenu');
  if (flImg) flImg.style.display = 'none';
  if (typeof marcarHotspotSeleccionado === 'function') marcarHotspotSeleccionado(elBox || (e && e.currentTarget) || (e && e.target));
  const fl = document.getElementById(flId);
  if (!fl) return null;
  const it = ITEMS[POS], activo = isName ? (it && it.inc_interior !== false) : (it && it.inc_colegio !== false);
  const bEl = document.getElementById(isName ? 'btnEliminarNombre' : 'btnEliminarCol');
  const bCon = document.getElementById(isName ? 'btnConservarNombre' : 'btnConservarCol');
  const bDel = document.getElementById(isName ? 'btnBorrarRecuadroNombre' : 'btnBorrarRecuadroCol');
  if (bEl) bEl.style.opacity = activo ? '1' : '0.5';
  if (bCon) bCon.style.opacity = activo ? '0.5' : '1';
  if (bDel) bDel.style.display = (nh && nh.manual) ? 'inline-flex' : 'none';
  fl.style.display = 'flex';
  return fl;
}
function openNombrePopup(nh, e, elBox) {
  currentNombreHotspot = nh;
  _prepararPopup(e, elBox, nh, 'floatingNameMenu', true);
}
function closeNombrePopup() {
  document.querySelectorAll('.blue-name-hotspot, .gray-name-hotspot').forEach(el => el.classList.remove('selected'));
  const fl = document.getElementById('floatingNameMenu');
  if (fl) fl.style.display = 'none';
  currentNombreHotspot = null;
}
async function _ejecutarAccionRecuadro(tipo, hs, val, fnFallback) {
  if (val === 'eliminar_recuadro' && hs && hs.manual) {
    showBlocker('Eliminando recuadro...');
    await fetch('/api/recuadro',  {
      method: 'POST', headers:  { 'Content-Type': 'application/json' }
      ,
      body: JSON.stringify( {
        grado: (ITEMS[POS]?._rama || grad), archivo: ITEMS[POS].archivo, tipo: tipo, page_num: hs.page_num, eliminar: true
      }
      )
    }
  );
    hideBlocker();
    if (typeof openPos === 'function' && typeof POS !== 'undefined') openPos(POS);
    return;
  }
  await fnFallback(val);
}
async function handleNombreAction(val) {
  const nh = currentNombreHotspot;
  closeNombrePopup();
  if (val === 'eliminar' || val === true) {
    try { await guardarHotspotAction('nombre','eliminar',nh); }
    catch(_) { } }
  else if (val === 'conservar' || val === false) {
    try { await guardarHotspotAction('nombre','conservar',nh); }
    catch(_) { } }
  else if (val === 'eliminar_recuadro') {
    await _ejecutarAccionRecuadro('nombre', nh, val, setInt);
    return;
  }
  if (typeof openPos === 'function' && typeof POS !== 'undefined') await openPos(POS, {
    force:true,preserveScroll:true
  }
  );
}
function openColegioPopup(sh, e, elBox) {
  currentColegioHotspot = sh;
  _prepararPopup(e, elBox, sh, 'floatingColMenu', false);
}
function closeColegioPopup() {
  document.querySelectorAll('.school-hotspot, .gray-school-hotspot').forEach(el => el.classList.remove('selected'));
  const fl = document.getElementById('floatingColMenu');
  if (fl) fl.style.display = 'none';
  currentColegioHotspot = null;
}
async function handleColegioAction(val) {
  const sh = currentColegioHotspot;
  closeColegioPopup();
  if (val === 'eliminar' || val === true) {
    try { await guardarHotspotAction('colegio','eliminar',sh); }
    catch(_) { } }
  else if (val === 'conservar' || val === false) {
    try { await guardarHotspotAction('colegio','conservar',sh); }
    catch(_) { } }
  else if (val === 'eliminar_recuadro') {
    await _ejecutarAccionRecuadro('colegio', sh, val, setCol);
    return;
  }
  if (typeof openPos === 'function' && typeof POS !== 'undefined') await openPos(POS, {
    force:true,preserveScroll:true
  }
  );
}
/* Selector de ramas: siempre conserva SELECCIONAR y permite TODAS las ramas */
async function guardarHotspotAction(tipo, accion, hs) {
  const it = ITEMS[POS];
  if (!it || !hs) return;
  const r = await fetch('/api/hotspot_action', {
    method:'POST',headers: { 'Content-Type':'application/json' }
    ,body:JSON.stringify( {
      grado:(it._rama||grad),archivo:it.archivo,tipo,accion,hotspot_id:hs.id,page_num:hs.page_num
    }
    )
  }
  );
  const d = await r.json().catch(()=>( { ok:false }
  ));
  if (!r.ok || d.ok===false) throw new Error(d.msg||'No se pudo guardar la acción.');
}

window.openNombrePopup = openNombrePopup;
window.closeNombrePopup = closeNombrePopup;
window.handleNombreAction = handleNombreAction;
window.openColegioPopup = openColegioPopup;
window.closeColegioPopup = closeColegioPopup;
window.handleColegioAction = handleColegioAction;
window.guardarHotspotAction = guardarHotspotAction;
