function _guardarVistaPdfPersistente(extra = {}) {
  try {
    const ctx = JSON.parse(localStorage.getItem("visor_contexto") || "{}") || {};
    localStorage.setItem("visor_contexto", JSON.stringify({ ...ctx, ...extra }));
  } catch (_) {}
}
function _guardarEstadoVisorPersistente(extra =  {
}
) {
  try { let ctx =  { }
    ;
    try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
    catch (_) {
    }
    const next =  { ...ctx, ...extra, vista: 'visores/administrador' }
    ;
    localStorage.setItem('visor_contexto', JSON.stringify(next));
    localStorage.setItem('app_ultima_vista', 'visores/administrador');
    localStorage.setItem('app_ultimo_contexto', JSON.stringify( {
      vista: 'visores/administrador', rama: next.rama || '', asignatura: next.asignatura || '',
      trimestre: next.trimestre || '', archivo: next.archivo || '', pos: next.pos, abierto: !!next.abierto
    }
    ));
  } catch (_) {
  }
}
function _actualizarURLVisor() {
  try {
    const ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
    const u = new URL(window.location.href);
    ['rama','asignatura','trimestre','archivo','pos'].forEach(k => u.searchParams.delete(k));
    if (ctx.rama) u.searchParams.set('rama', ctx.rama);
    if (ctx.asignatura) u.searchParams.set('asignatura', ctx.asignatura);
    if (ctx.trimestre) u.searchParams.set('trimestre', ctx.trimestre);
    if (ctx.abierto && ctx.archivo) {
      u.searchParams.set('archivo', ctx.archivo);
      if (ctx.pos !== undefined && ctx.pos !== null) u.searchParams.set('pos', String(ctx.pos));
    }
    u.searchParams.set('return', ctx.returnPath || (window.APP_BASE || '/'));
    if (window.top === window && window.parent === window && !document.documentElement.classList.contains('visor-embebido')) {
      history.replaceState({ visor: true, visorRutaReal: (window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html' }, document.title, (window.APP_BASE || '/'));
    }
  } catch (_) {
  }
}
function openOv() {
  const it = ITEMS[POS];
  if (!it) return;
  it.visto = true;
  const ramaPersistida = (it._rama || grad || '');
  const trimPersistido = (it._trimestre || it.trimestre || it.TRIMESTRE || (window.VISOR_FILTRO && window.VISOR_FILTRO.trimestre) || '');
  const asigPersistida = (it._asignatura || it.asignatura || it.ASIGNATURA || (window.VISOR_FILTRO && window.VISOR_FILTRO.asignatura) || '');
  localStorage.setItem('last_grado', grad);
  localStorage.setItem('rama_actual', grad);
  if (grad === '__TODAS__') localStorage.setItem('visor_todas', '1');
  localStorage.setItem('last_pos', POS);
  localStorage.setItem('last_open', '1');
  if (it.archivo) localStorage.setItem('last_archivo', it.archivo);
  if (ramaPersistida) localStorage.setItem('last_archivo_rama', ramaPersistida);
  if (trimPersistido) localStorage.setItem('last_archivo_trimestre', trimPersistido);
  else localStorage.removeItem('last_archivo_trimestre');
  if (asigPersistida) localStorage.setItem('last_archivo_asignatura', asigPersistida);
  else localStorage.removeItem('last_archivo_asignatura');
  // Instantánea inmediata de recuperación: se guarda ANTES de iniciar la carga
  // de los dos visores MuPDF. Así F5 durante una descarga/render no puede olvidar
  // qué documento estaba abierto.
  try {
    localStorage.setItem('visor_recovery_snapshot', JSON.stringify({
      activo: true,
      rama: String(ramaPersistida || ''),
      trimestre: String(trimPersistido || ''),
      asignatura: String(asigPersistida || ''),
      archivo: String(it.archivo || ''),
      pos: POS,
      returnPath: (window.APP_BASE || '/')
    }));
  } catch (_) {}
  try {
    localStorage.setItem('visor_f5_recovery', JSON.stringify({
      activo: true,
      rama: String(ramaPersistida || ''),
      trimestre: String(trimPersistido || ''),
      asignatura: String(asigPersistida || ''),
      archivo: String(it.archivo || ''),
      pos: POS,
      returnPath: (window.APP_BASE || '/')
    }));
  } catch (_) {}
  try {
    localStorage.setItem('visor_contexto', JSON.stringify( {
      ...(JSON.parse(localStorage.getItem('visor_contexto') || '{}') ||  {
      }
      ), rama: ramaPersistida, trimestre: trimPersistido, asignatura: asigPersistida, todas: grad === '__TODAS__', archivo: it.archivo || '', directo: true, abrirLista: false, pos: POS, abierto: true, returnPath: (window.APP_BASE || '/')
    }
    ));
  } catch(_) {
  }
  _guardarEstadoVisorPersistente( {
    rama: ramaPersistida, todas: grad === '__TODAS__', archivo: it.archivo || '', directo: true, abrirLista: false, pos: POS, abierto: true, returnPath: (window.APP_BASE || '/')
  }
  );
  _actualizarURLVisor();
  const ov = document.getElementById('ov');
  if (ov) ov.classList.add('on');
  document.documentElement.classList.add('visor-document-open');
  document.body.classList.add('visor-document-open');
  document.body.style.overflow = 'hidden';
  try {
    if (!window.history.state || !window.history.state.visorDocAbierto) {
      window.history.pushState( { visor: true, visorDocAbierto: true, archivo: it.archivo, pos: POS }
      , document.title, window.location.href);
    }
  } catch (_) {
  }
  openPos(POS);
}
function closeOv(desdePopstate = false) {
  const ov = document.getElementById('ov');
  if (ov) ov.classList.remove('on');
  document.documentElement.classList.remove('visor-document-open');
  document.body.classList.remove('visor-document-open');
  document.body.style.overflow = '';
  localStorage.setItem('last_open', '0');
  localStorage.removeItem('last_archivo');
  localStorage.removeItem('last_archivo_rama');
  localStorage.removeItem('last_archivo_trimestre');
  localStorage.removeItem('last_archivo_asignatura');
  try { localStorage.removeItem('visor_recovery_snapshot'); localStorage.removeItem('visor_f5_recovery'); } catch (_) {}
  // Conservamos la posición del documento para que, al volver a la lista,
  // el visor recuerde exactamente dónde estábamos.
  try { localStorage.setItem('visor_pos', String(POS)); } catch (_) {}
  try {
    const ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
    const rama = ctx.rama || (grad === '__TODAS__' ? '' : grad);
    _guardarEstadoVisorPersistente( {
      ...ctx,
      rama,
      archivo: '',
      pos: POS,
      trimestre: ctx.trimestre || (window.VISOR_FILTRO && window.VISOR_FILTRO.trimestre) || '',
      asignatura: ctx.asignatura || (window.VISOR_FILTRO && window.VISOR_FILTRO.asignatura) || '',
      directo: false,
      abrirLista: true,
      abierto: false
    }
  );
    const u = new URL(window.location.href);
    ['archivo','pos'].forEach(k => u.searchParams.delete(k));
    if (!desdePopstate && window.history.state?.visorDocAbierto) { window.history.back(); }
    else if (window.top === window && window.parent === window && !document.documentElement.classList.contains('visor-embebido')) {
      history.replaceState({ visor: true, visorRutaReal: (window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html' }, document.title, (window.APP_BASE || '/'));
    }
  } catch(_) {
  }
  if (typeof render === 'function') render();
}
async function nav(dir) {
  let nextPos = POS + dir;
  if (nextPos < 0) nextPos = ITEMS.length - 1;
  if (nextPos >= ITEMS.length) nextPos = 0;
  POS = nextPos;
  openOv();
}
async function openPos(p, options =  {
}
) {
  POS = p;
  const it = ITEMS[POS];
  if (!it) return;
  const ramaPersistida = (it._rama || grad || '');
  const trimPersistido = (it._trimestre || it.trimestre || it.TRIMESTRE || (window.VISOR_FILTRO && window.VISOR_FILTRO.trimestre) || '');
  const asigPersistida = (it._asignatura || it.asignatura || it.ASIGNATURA || (window.VISOR_FILTRO && window.VISOR_FILTRO.asignatura) || '');
  localStorage.setItem('last_pos', POS);
  localStorage.setItem('last_open', '1');
  if (it.archivo) localStorage.setItem('last_archivo', it.archivo);
  if (it._rama) localStorage.setItem('last_archivo_rama', it._rama);
  if (trimPersistido) localStorage.setItem('last_archivo_trimestre', trimPersistido);
  else localStorage.removeItem('last_archivo_trimestre');
  if (asigPersistida) localStorage.setItem('last_archivo_asignatura', asigPersistida);
  else localStorage.removeItem('last_archivo_asignatura');
  try {
    localStorage.setItem('visor_pos', String(POS));
    localStorage.setItem('visor_rama', String(grad || ''));
  } catch (_) {
  }
  try {
    localStorage.setItem('visor_recovery_snapshot', JSON.stringify({
      activo: true,
      rama: String(ramaPersistida || ''),
      trimestre: String(trimPersistido || ''),
      asignatura: String(asigPersistida || ''),
      archivo: String(it.archivo || ''),
      pos: POS,
      returnPath: (window.APP_BASE || '/')
    }));
  } catch (_) {}
  try {
    localStorage.setItem('visor_f5_recovery', JSON.stringify({
      activo: true,
      rama: String(ramaPersistida || ''),
      trimestre: String(trimPersistido || ''),
      asignatura: String(asigPersistida || ''),
      archivo: String(it.archivo || ''),
      pos: POS,
      returnPath: (window.APP_BASE || '/')
    }));
  } catch (_) {}
  _guardarEstadoVisorPersistente( {
    rama: String(it._rama || grad || ''), archivo: String(it.archivo || ''), pos: POS, abierto: true, directo: true, abrirLista: false
  }
  );
  _actualizarURLVisor();
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
  const cbImg = document.getElementById('cbImg');
  if (cbImg) cbImg.checked = (it.inc_imagenes !== false);
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
  const clavesVisor = (containerId, isLeft) =>  {
    const base = `${it._rama || grad || ''}::${it.archivo || ''}::${isLeft ? 'L' : 'R'}::${enc}::${int}::${col}::${isLeft ? '0' : net}`;
    return base;
  }
  ;
  const visorYaPreparado = !options.force &&
  window._estadoPDFJS &&
  window._estadoPDFJS.viewerOld?.doc && window._estadoPDFJS.viewerNew?.doc &&
  window._estadoPDFJS.viewerOld.key === clavesVisor('viewerOld', true) &&
  window._estadoPDFJS.viewerNew.key === clavesVisor('viewerNew', false);
  if (!visorYaPreparado && typeof mostrarCargandoDocumentoVisor === 'function') mostrarCargandoDocumentoVisor();
  if (typeof loadDocViewer === 'function') {
    try {
      await Promise.all([ loadDocViewer('viewerOld', true, enc, int, col, '0', !!options.force), loadDocViewer('viewerNew', false, enc, int, col, net, !!options.force) ]);
    } catch (e) {
      void 0;
    } finally {
      if (typeof ocultarCargandoDocumentoVisor === 'function') ocultarCargandoDocumentoVisor();
    }
  } else if (typeof ocultarCargandoDocumentoVisor === 'function') {
    ocultarCargandoDocumentoVisor();
  }
  setTimeout(actualizarNavegacionCambios, 100);
  if (!window.__visorCargaInicial) ocultarCargandoPagina();
}
// El botón 'Lista/Atrás' del overlay debe cerrar el documento incluso si el
// cargador de componentes no llega a enlazar data-event-click. No navega a '/',
// simplemente cierra el overlay y conserva rama/filtros/posición.
function _enlazarAtrasDocumento() {
  const btn = document.querySelector('#ov .back-btn');
  if (!btn || btn.dataset.atrasDocumentoEnlazado === '1') return;
  btn.dataset.atrasDocumentoEnlazado = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOv();
  }, true);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _enlazarAtrasDocumento, { once: true });
} else {
  _enlazarAtrasDocumento();
}

window.openOv = openOv;
window.closeOv = closeOv;
window.openPos = openPos;
window.nav = nav;
