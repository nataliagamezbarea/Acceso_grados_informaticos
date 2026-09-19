/* MODAL EDITAR ENUNCIADO */
function _esZonaEnunciado(v) {
  const s = String(v || '').trim();
  return /^\[\s*Zona\b/i.test(s) || /^\[/.test(s);
}
async function _textoRealDelHotspot(sh) {
  const fallback = String(sh && (sh.old || sh.start || '') || '').trim();
  if (!sh || !_esZonaEnunciado(fallback)) return fallback;
  if (sh.page === undefined || sh.page === null) return fallback;
  const l = sh.pct_left ?? sh.left;
  const t = sh.pct_top ?? sh.top;
  const w = sh.pct_width ?? sh.width;
  const h = sh.pct_height ?? sh.height;
  if (![l,t,w,h].every(v => Number.isFinite(Number(v)))) return fallback;
  try {
    const it = ITEMS[POS];
    const r = await fetch('/api/extract_box_text',  {
      method: 'POST',
      headers:  { 'Content-Type': 'application/json' }
      ,
      body: JSON.stringify( {
        grado: (it?._rama || grad), archivo: it.archivo,
        page_num: sh.page, left: l, top: t, width: w, height: h
      }
      )
    }
  );
    const d = await r.json();
    const text = String(d?.text || '').trim();
    return text || fallback;
  } catch (_) {
    return fallback;
  }
}
async function openEditarEnunciadoModal(sh, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  currentEditingHotspot = sh;
  const m = document.getElementById('modalEditarEnunciado');
  if (!m) return;
  const oldTextarea = document.getElementById('editarOldText');
  const newTextarea = document.getElementById('editarNewText');
  if (oldTextarea) oldTextarea.value = await _textoRealDelHotspot(sh);
  if (newTextarea) newTextarea.value = (sh && sh.new) ? sh.new : '';
  m.classList.add('on');
}
function closeEditarEnunciadoModal() {
  const m = document.getElementById('modalEditarEnunciado');
  if (m) m.classList.remove('on');
  currentEditingHotspot = null;
}
async function guardarEditarEnunciado() {
  const it = ITEMS[POS];
  const sh = currentEditingHotspot;
  let st = String(document.getElementById('editarOldText')?.value || '').trim();
  const ed = sh ? (sh.end || '') : '';
  const nw = document.getElementById('editarNewText').value;
  if (!nw.trim()) return;
  // Si el hotspot nació como una zona, guardamos el TEXTO REAL del PDF,
  // pero conservamos además la geometría exacta. Así el motor DDDDD puede
  // encontrar el mismo texto incluso aunque haya espacios/acento distintos.
  if (_esZonaEnunciado(st) && sh) st = await _textoRealDelHotspot(sh);
  if (!st) {
    alert('No se ha podido detectar el texto del enunciado.');
    return;
  }
  const _scrollAntes = (typeof capturarPosicionVisores === 'function') ? capturarPosicionVisores() : null;
  if (typeof pedirRestauracionVisores === 'function') pedirRestauracionVisores(_scrollAntes);
  showBlocker('Guardando reescritura y actualizando vista previa...');
  try {
    const payload =  {
      grado: (it?._rama || grad), archivo: it.archivo,
      start: st,
      old_start: sh ? (sh.start || sh.old || '') : '',
      new_text: nw,
      page: sh ? sh.page : undefined,
      pct_top: sh ? (sh.pct_top ?? sh.top) : undefined,
      pct_left: sh ? (sh.pct_left ?? sh.left) : undefined,
      pct_width: sh ? (sh.pct_width ?? sh.width) : undefined,
      pct_height: sh ? (sh.pct_height ?? sh.height) : undefined,
      custom: !!(sh && sh.custom),
      hotspot_id: sh && Number.isInteger(sh.id) ? sh.id : undefined
    }
    ;
    const r = await fetch('/api/save_enunciado',  {
      method: 'POST', headers:  { 'Content-Type': 'application/json' }
      , body: JSON.stringify(payload)
    }
  );
    const data = await r.json().catch(() => ( {
    }
    ));
    if (!r.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${r.status}`);
    if (it.type === 'e') await setInc(true);
    closeEditarEnunciadoModal();
    await load();
    hideBlocker();
    refreshRightIframe();
    openPos(POS);
  } catch (e) {
    hideBlocker();
    console.error('[ENUNCIADO] Error guardando sustitución:', e);
    alert('No se pudo guardar la sustitución: ' + (e.message || e));
  }
}

window.openEditarEnunciadoModal = openEditarEnunciadoModal;
window.closeEditarEnunciadoModal = closeEditarEnunciadoModal;
window.guardarEditarEnunciado = guardarEditarEnunciado;
