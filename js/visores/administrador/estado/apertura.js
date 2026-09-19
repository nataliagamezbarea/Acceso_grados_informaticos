/* APERTURA Y CIERRE DEL MODAL VISOR (< 65 lineas) */
function openOv() {
  const it = ITEMS[POS];
  if (!it) return;
  it.visto = true;
  localStorage.setItem('last_grado', grad);
  localStorage.setItem('rama_actual', grad);
  localStorage.setItem('last_pos', POS);
  localStorage.setItem('last_open', '1');
  if (it.archivo) localStorage.setItem('last_archivo', it.archivo);
  const ov = document.getElementById('ov');
  if (ov) ov.classList.add('on');
  document.body.style.overflow = 'hidden';
  openPos(POS);
}
function closeOv() {
  const ov = document.getElementById('ov');
  if (ov) ov.classList.remove('on');
  document.body.style.overflow = '';
  localStorage.setItem('last_open', '0');
  localStorage.removeItem('last_archivo');
  if (typeof render === 'function') render();
}
function nav(dir) {
  let nextPos = POS + dir;
  if (nextPos < 0) nextPos = ITEMS.length - 1;
  if (nextPos >= ITEMS.length) nextPos = 0;
  POS = nextPos;
  openOv();
}
function openPos(p) {
  POS = p;
  const it = ITEMS[POS];
  if (!it) return;
  localStorage.setItem('last_pos', POS);
  localStorage.setItem('last_open', '1');
  if (it.archivo) localStorage.setItem('last_archivo', it.archivo);
  // La URL es la persistencia infalible (funciona aunque falle/esté desactivada
  // la cache y el localStorage): al recargar se reabre rama + documento.
  try {
    const url = new URL(window.location.href);
    if (grad) url.searchParams.set('rama', grad);
    url.searchParams.set('pos', String(POS));
    window.history.replaceState( {
    }
    , '', url.toString());
  } catch (_) {
  }
  const posTxt = document.getElementById('ovPosText');
  if (posTxt) posTxt.textContent = `${POS + 1} / ${ITEMS.length}`;
  const spanOrig = document.getElementById('spanOrigName');
  const spanClean = document.getElementById('spanCleanName');
  const spanArrow = document.getElementById('spanRenameArrow');
  if (spanOrig) spanOrig.textContent = it.archivo;
  if (spanClean) spanClean.textContent = (it.cambia_nombre && it.nombre_limpio) ? it.nombre_limpio : it.archivo;
  if (spanArrow) spanArrow.style.display = (it.cambia_nombre && it.nombre_limpio) ? 'inline' : 'none';
  try {
    const key = `flags_${it._rama || grad || ''}_${it.archivo || ''}`;
    const flags = JSON.parse(localStorage.getItem(key) || '{}');
    if (flags.inc !== undefined) it.include = flags.inc;
    if (flags.int !== undefined) it.inc_interior = flags.int;
    if (flags.col !== undefined) it.inc_colegio = flags.col;
    if (flags.imagenes !== undefined) it.inc_imagenes = flags.imagenes;
    if (flags.internet !== undefined) it.inc_internet = flags.internet;
    if (flags.ren !== undefined) it.inc_renombre = flags.ren;
    if (flags.apunte !== undefined) it.inc_apunte = flags.apunte;
    if (flags.nombre_apunte !== undefined) it.nombre_apunte = flags.nombre_apunte;
  } catch (_) {}
  const cbInt = document.getElementById('cbInt');
  if (cbInt) cbInt.checked = !!it.inc_interior;
  const cbCol = document.getElementById('cbCol');
  if (cbCol) cbCol.checked = !!it.inc_colegio;
  const cbApunte = document.getElementById('cbApunte');
  if (cbApunte) cbApunte.checked = !!it.inc_apunte;
  const cbInc = document.getElementById('cbInc');
  if (cbInc) cbInc.checked = (it.type === 'e') ? !!it.include : true;
  const cbRen = document.getElementById('cbRen');
  if (cbRen) cbRen.checked = (it.cambia_nombre) ? (it.inc_renombre !== false) : true;
  if (typeof syncInternetCheckboxes === 'function') syncInternetCheckboxes();
  if (typeof updateDecisionButtons === 'function') updateDecisionButtons(it);
  if (typeof updateApunteButton === 'function') updateApunteButton(it);
  if (typeof _marcarBotonDejarOriginal === 'function') _marcarBotonDejarOriginal(it.decision === 'original');
  const enc = (cbInc && cbInc.checked) ? '1' : '0';
  const int = (cbInt && cbInt.checked) ? '1' : '0';
  const col = (cbCol && cbCol.checked) ? '1' : '0';
  const net = !!it.inc_internet ? '1' : '0';
  if (typeof loadDocViewer === 'function') {
    loadDocViewer('viewerOld', true, enc, int, col, '0');
    loadDocViewer('viewerNew', false, enc, int, col, net);
  }
  setTimeout(actualizarNavegacionCambios, 100);
}
