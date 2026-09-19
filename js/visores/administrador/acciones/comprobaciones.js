/* ACCIONES SOBRE CHECKS DEL VISOR (< 85 lineas) */
async function setInc(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : document.getElementById('cbInc').checked;
  it.include = nuevoVal;
  const ramaItem = it._rama || grad;
  if (DATA[ramaItem] && Array.isArray(DATA[ramaItem].entries)) {
    const orig = DATA[ramaItem].entries.find(x => x.archivo === it.archivo);
    if (orig) {
      orig.include = nuevoVal;
      // El check global de Enunciados es la puerta de entrada a TODAS las
      // sustituciones. Al activarlo/desactivarlo sincronizamos también el
      // estado de cada enunciado para que el visor no se quede bloqueado por
      // un include=false antiguo guardado dentro de rewrites_*.json.
      if (Array.isArray(orig.enunciados)) {
        orig.enunciados.forEach(sh =>  { sh.include = nuevoVal; }
  );
      }
    }
  }
  if (DATA[ramaItem]) {
    const origNo = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origNo) {
      origNo.include = nuevoVal;
      if (Array.isArray(origNo.enunciados)) origNo.enunciados.forEach(sh =>  { sh.include = nuevoVal; }
  );
    }
  }
  const cb = document.getElementById('cbInc');
  if (cb) cb.checked = nuevoVal;
  guardarCheckEnServidor('inc', nuevoVal);
  refreshRightIframe();
  if (typeof renderStats === 'function') renderStats();
}
async function setInt(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : document.getElementById('cbInt').checked;
  it.inc_interior = nuevoVal;
  const ramaItem = it._rama || grad;
  if (DATA[ramaItem]) {
    const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo);
    if (origE) origE.inc_interior = nuevoVal;
    const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origN) origN.inc_interior = nuevoVal;
  }
  const cb = document.getElementById('cbInt');
  if (cb) cb.checked = nuevoVal;
  guardarCheckEnServidor('int', nuevoVal);
  refreshRightIframe();
  if (typeof renderStats === 'function') renderStats();
}
async function setCol(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : document.getElementById('cbCol').checked;
  it.inc_colegio = nuevoVal;
  const ramaItem = it._rama || grad;
  if (DATA[ramaItem]) {
    const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo);
    if (origE) origE.inc_colegio = nuevoVal;
    const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origN) origN.inc_colegio = nuevoVal;
  }
  const cb = document.getElementById('cbCol');
  if (cb) cb.checked = nuevoVal;
  guardarCheckEnServidor('col', nuevoVal);
  refreshRightIframe();
  if (typeof renderStats === 'function') renderStats();
}
async function setImg(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : (document.getElementById('cbImg') ? document.getElementById('cbImg').checked : true);
  it.inc_imagenes = nuevoVal;
  const ramaItem = it._rama || grad;
  if (DATA[ramaItem]) {
    const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo);
    if (origE) origE.inc_imagenes = nuevoVal;
    const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origN) origN.inc_imagenes = nuevoVal;
  }
  const cb = document.getElementById('cbImg');
  if (cb) cb.checked = nuevoVal;
  guardarCheckEnServidor('imagenes', nuevoVal);
  if (typeof refreshRightIframe === 'function') refreshRightIframe();
  if (typeof renderStats === 'function') renderStats();
}
async function setInternet(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : (document.getElementById('cbBorrarImgInternet') ? document.getElementById('cbBorrarImgInternet').checked : false);
  it.inc_internet = nuevoVal;
  const ramaItem = it._rama || grad;
  if (DATA[ramaItem]) {
    const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo);
    if (origE) origE.inc_internet = nuevoVal;
    const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origN) origN.inc_internet = nuevoVal;
  }
  if (typeof syncInternetCheckboxes === 'function') syncInternetCheckboxes();
  guardarCheckEnServidor('internet', nuevoVal);
  refreshRightIframe();
  if (typeof renderStats === 'function') renderStats();
}
async function setRen(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : document.getElementById('cbRen').checked;
  it.inc_renombre = nuevoVal;
  const ramaItem = it._rama || grad;
  if (DATA[ramaItem]) {
    const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo);
    if (origE) origE.inc_renombre = nuevoVal;
    const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origN) origN.inc_renombre = nuevoVal;
  }
  const cb = document.getElementById('cbRen');
  if (cb) cb.checked = nuevoVal;
  guardarCheckEnServidor('ren', nuevoVal);
  if (typeof renderStats === 'function') renderStats();
}
