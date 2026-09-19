/* La navbar general gestiona las extensiones del visor mediante la plantilla común. */
async function inicializarRamasGithub() {
  const sel = document.getElementById('selectRamaGithub');
  if (!sel) return;
  let ramaGuardada = '';
  try {
    const ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
    ramaGuardada = String(
    window.RamaActual?.obtener?.() ||
    ctx.rama ||
    localStorage.getItem('last_archivo_rama') ||
    localStorage.getItem('last_grado') ||
    localStorage.getItem('rama_actual') ||
    ''
    ).trim();
  } catch (_) {
    try {
      ramaGuardada = String(window.RamaActual?.obtener?.() || localStorage.getItem('last_archivo_rama') || localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '').trim();
    } catch (_) {
    }
  }
  if (!ramaGuardada || ramaGuardada === '__TODAS__' || ramaGuardada === 'TODAS_LAS_RAMAS_' || ramaGuardada === 'TODAS LAS RAMAS') ramaGuardada = 'TODAS LAS RAMAS';
  // Si el selector no tiene opciones, asegurar que tenga TODAS LAS RAMAS
  if (sel.options.length === 0) { sel.innerHTML = '<option value="TODAS LAS RAMAS" selected>TODAS LAS RAMAS</option>'; }
  // Pintar la rama persistida si no está presente
  if (ramaGuardada) {
    if (!Array.from(sel.options).some(o => o.value === ramaGuardada)) {
      const o = document.createElement('option');
      o.value = ramaGuardada;
      o.textContent = (ramaGuardada === 'TODAS LAS RAMAS' || ramaGuardada === 'TODAS_LAS_RAMAS_' ? 'TODAS LAS RAMAS' : ramaGuardada);
      if (ramaGuardada === 'TODAS LAS RAMAS' || ramaGuardada === 'TODAS_LAS_RAMAS_') sel.insertBefore(o, sel.firstChild);
      else sel.appendChild(o);
    }
    sel.value = ramaGuardada;
  }
  sel.disabled = false;
  try {
    await window.RamaAPI.poblarSelector(sel,  { incluirMarcador: false, selectedValue: ramaGuardada }
  );
    // Limpiar cualquier residuo de SELECCIONAR RAMA y normalizar TODAS LAS RAMAS
    Array.from(sel.options).forEach(o =>  {
      if (o.value === '' || (o.textContent || '').trim().toUpperCase() === 'SELECCIONAR RAMA') o.remove();
      if (o.value === 'TODAS LAS RAMAS' || o.value === 'TODAS_LAS_RAMAS_' || o.value === '__TODAS__' || o.textContent === 'TODAS_LAS_RAMAS_' || o.textContent === '__TODAS__') {
        o.value = 'TODAS LAS RAMAS';
        o.textContent = 'TODAS LAS RAMAS';
      }
    }
  );
    if (!Array.from(sel.options).some(o => o.value === 'TODAS LAS RAMAS')) {
      const all = document.createElement('option');
      all.value = 'TODAS LAS RAMAS';
      all.textContent = 'TODAS LAS RAMAS';
      sel.insertBefore(all, sel.firstChild);
    }
    sel.value = ramaGuardada;
  } catch (_) {
    if (ramaGuardada) sel.value = ramaGuardada;
  }
  if (sel.options.length === 0) { sel.innerHTML = '<option value="TODAS LAS RAMAS" selected>TODAS LAS RAMAS</option>'; }
}
function _guardarContextoVisor(parcial =  {
}
) {
  try {
    const actual = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
    localStorage.setItem('visor_contexto', JSON.stringify( { ...actual, ...parcial }
    ));
  } catch (_) {
  }
}
function cambiarRamaGithub(rama) {
  mostrarCargandoPagina('Cargando rama...');
  const todasLasRamas = !rama || rama === 'TODAS LAS RAMAS' || rama === 'TODAS_LAS_RAMAS_' || rama === '__TODAS__';
  if (window.RamaActual) window.RamaActual.guardar(todasLasRamas ? '' : rama);
  // Cambiar de rama siempre invalida el documento abierto de la rama anterior.
  localStorage.removeItem('last_open');
  try { localStorage.removeItem('visor_recovery_snapshot'); } catch (_) {}
  localStorage.removeItem('last_archivo');
  localStorage.removeItem('last_archivo_rama');
  localStorage.removeItem('visor_pos');
  const previo = (()=> {
    try { return JSON.parse(localStorage.getItem('visor_contexto')||'{}'); }
    catch (_) { return  { }
      ;
    }
  }
  )();
  const triActual = previo.trimestre || (document.getElementById('selectTrimestreVisor')?.value || '');
  if (todasLasRamas) {
    grad = '__TODAS__';
    _guardarContextoVisor( {
      rama: '', todas: true, directo: false, archivo: '', asignatura: '', trimestre: triActual, tarea: '', pos: undefined, abierto: false
    }
  );
    localStorage.setItem('app_ultima_vista','visores/administrador');
    localStorage.setItem('app_ultimo_contexto', JSON.stringify( {
      vista:'visores/administrador',rama:'',asignatura:'',trimestre:triActual,archivo:'',abierto:false
    }
    ));
    if (typeof buildAllItems === 'function') buildAllItems();
    if (typeof renderTabs === 'function') renderTabs();
    if (typeof render === 'function') render();
    requestAnimationFrame(() => setTimeout(() => ocultarCargandoPagina(), 120));
    const sel = document.getElementById('selectRamaGithub');
    if (sel) sel.value = 'TODAS LAS RAMAS';
    if (typeof sincronizarSelectoresTrimestre === 'function') sincronizarSelectoresTrimestre(triActual);
    return;
  }
  _guardarContextoVisor( {
    rama: String(rama||''), todas: false, directo: false, archivo: '', asignatura: previo.asignatura || '', trimestre: triActual, tarea: '', pos: undefined, abierto: false
  }
  );
  try {
    localStorage.setItem('app_ultima_vista','visores/administrador');
    localStorage.setItem('app_ultimo_contexto', JSON.stringify( {
      vista:'visores/administrador',rama:String(rama||''),asignatura:previo.asignatura||'',trimestre:triActual,archivo:'',abierto:false
    }
    ));
  } catch (_) {
  }
  localStorage.removeItem('visor_todas');
  grad = rama;
  localStorage.setItem('last_grado', grad);
  localStorage.setItem('last_pos', '0');
  if (typeof sincronizarSelectoresTrimestre === 'function') sincronizarSelectoresTrimestre(triActual);
  if (typeof CONFIG !== 'undefined' && CONFIG[rama]) {
    if (typeof renderTabs === 'function') renderTabs();
    if (typeof buildAllItems === 'function') buildAllItems();
    if (typeof render === 'function') render();
    requestAnimationFrame(() => setTimeout(() => ocultarCargandoPagina(), 120));
  } else if (typeof load === 'function') {
    Promise.resolve(load()).finally(() => setTimeout(() => ocultarCargandoPagina(), 120));
  }
}
async function sincronizarGitHub() {
  if (typeof showBlocker === 'function') showBlocker('Sincronizando ramas y archivos con GitHub...');
  try {
    const res = await fetch('/api/github_pull',  { method: 'POST' });
    const data = await res.json();
    if (typeof hideBlocker === 'function') hideBlocker();
    if (typeof showCustomAlert === 'function') {
      await showCustomAlert('Sincronización GitHub', data.mensaje || 'Ramas y archivos sincronizados correctamente.', '<i class="fa-brands fa-github"></i>', '#2563eb');
    }
    if (typeof load === 'function') {
      await load();
    }
  } catch (e) {
    if (typeof hideBlocker === 'function') hideBlocker();
    void 0;
  }
}
async function cerrarSesionUsuario() {
  if (typeof window.__cerrarSesionCompleta === 'function') {
    await window.__cerrarSesionCompleta();
    return;
  }
  try { if (window.supabaseClient?.auth?.signOut) await window.supabaseClient.auth.signOut({ scope: 'global' }); } catch (_) {}
  try { sessionStorage.clear(); } catch (_) {}
  try { window.sesionActual = null; } catch (_) {}
  try {
    if (window.top && window.top !== window) window.top.location.replace((window.APP_BASE || '/'));
    else window.location.replace((window.APP_BASE || '/'));
  } catch (_) {
    window.location.replace((window.APP_BASE || '/'));
  }
}
function openSummaryModal() {
  const modal = document.getElementById('summaryModal');
  const body = document.getElementById('summaryBody');
  const title = document.getElementById('sumDegreeTitle');
  if (!modal || !body) return;
  const lista = Array.isArray(ITEMS) ? ITEMS : [];
  const total = lista.length;
  const originales = lista.filter(x => x.decision === 'original').length;
  const aceptados = lista.filter(x => x.decision === 'aceptado' || x.decision === 'accepted').length;
  const pendientes = Math.max(0, total - originales - aceptados);
  const ramaTitulo = (typeof grad !== 'undefined' && grad && grad !== '__TODAS__') ? grad : 'TODAS LAS RAMAS';
  if (title) title.textContent = ramaTitulo;
  body.innerHTML = `
<div class="summary-grid"> <div class="summary-card"><b>${total}</b><span>Documentos</span></div> <div class="summary-card"><b>${aceptados}</b><span>Aceptados</span></div> <div class="summary-card"><b>${originales}</b><span>Originales</span></div> <div class="summary-card"><b>${pendientes}</b><span>Pendientes</span></div> </div> <div class="summary-branch">Rama: <strong>${ramaTitulo}</strong></div>`;
  modal.classList.add('on');
}
function closeSummaryModal() {
  const modal = document.getElementById('summaryModal');
  if (modal) modal.classList.remove('on');
}
function mostrarAccesoDenegadoVisor() {
  try {
    if (window.top && window.top !== window) window.top.location.replace((window.APP_BASE || '/'));
    else window.location.replace((window.APP_BASE || '/'));
  } catch (_) {
    window.location.replace((window.APP_BASE || '/'));
  }
}
window.openSummaryModal = openSummaryModal;
window.closeSummaryModal = closeSummaryModal;
window.mostrarAccesoDenegadoVisor = mostrarAccesoDenegadoVisor;
window.cerrarSesionUsuario = cerrarSesionUsuario;
// En el panel suelto no se carga navbar_acciones.js: nadie enlazaba el botón
// "Cerrar sesión" (ni el del menú desplegable), así que no hacía nada.
document.addEventListener('click', (e) => {
  const el = e.target?.closest?.('#btn-cerrar-sesion, .btn-cerrar-sesion, [data-navbar-action="logout"]');
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  try { document.getElementById('navbar-menu-panel')?.hidePopover?.(); } catch (_) {}
  cerrarSesionUsuario();
}, true);
function mostrarCargandoPagina(mensaje = 'Cargando...') {
  const content = document.getElementById('content');
  if (!content) return;
  // El panel debe mostrar estado de carga inmediatamente, también durante
  // la carga inicial del Visor Admin. No se toca ningún dato ni la navbar.
  content.innerHTML = `
<div class="visor-cargando-documentos" role="status" aria-live="polite"><div class="visor-spinner-anillo"></div><span class="visor-cargando-texto">${String(mensaje || 'Cargando...')}</span></div>`;
  const stats = document.getElementById('stats');
  if (stats) stats.innerHTML = '';
}
function ocultarCargandoPagina() {
  const content = document.getElementById('content');
  if (content?.querySelector('.visor-cargando-documentos')) content.innerHTML = '';
}
document.addEventListener('click', (e) =>  {
  const enlace = e.target.closest('a[href]');
  if (!enlace || enlace.target === '_blank' || enlace.hasAttribute('download')) return;
  const href = enlace.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
  try {
    const u = new URL(href, location.href);
    if (u.origin === location.origin && u.href !== location.href) mostrarCargandoPagina('Cargando página...');
  } catch (_) {
  }
}
, true);
window.addEventListener('beforeunload', () => mostrarCargandoPagina('Cargando página...'));
function _contextoAperturaInmediata() {
  try {
    const q = new URLSearchParams(window.location.search);
    const ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
    if (ctx.abrirLista === true) {
      return  { abierto: false, archivo: '' }
      ;
    }
    if (q.has('archivo')) {
      return  { abierto: true, archivo: String(q.get('archivo')).trim() }
      ;
    }
    const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[ºª]/g, '').replace(/\btrimestres?\b/g, '').trim();
    const triFiltro = norm(q.get('trimestre') || ctx.trimestre);
    const asigFiltro = norm(q.get('asignatura') || ctx.asignatura);
    const lastTri = norm(localStorage.getItem('last_archivo_trimestre'));
    const lastAsig = norm(localStorage.getItem('last_archivo_asignatura'));
    const coincideTri = !triFiltro || (lastTri && lastTri === triFiltro);
    const coincideAsig = !asigFiltro || (lastAsig && (lastAsig === asigFiltro || lastAsig.includes(asigFiltro) || asigFiltro.includes(lastAsig)));
    if (coincideTri && coincideAsig) {
      if (ctx.directo && ctx.archivo) {
        return  { abierto: true, archivo: String(ctx.archivo).trim() }
        ;
      }
      if (localStorage.getItem('last_open') === '1' && localStorage.getItem('last_archivo')) {
        return  { abierto: true, archivo: String(localStorage.getItem('last_archivo')).trim() }
        ;
      }
    }
    return  { abierto: false, archivo: '' }
    ;
  } catch (_) {
    return  { abierto: false, archivo: '' }
    ;
  }
}
const HTML_CARGA_DOC = '<div class="doc-viewer-loading" role="status" aria-live="polite"><div class="doc-viewer-loading-mark"><div class="visor-spinner-anillo visor-spinner-documento"></div></div><div class="doc-viewer-loading-text"><strong>Cargando documento...</strong></div></div>';
function mostrarVisorDocumentoInmediato() {
  const estado = _contextoAperturaInmediata();
  if (!estado.abierto) return false;
  const ov = document.getElementById('ov');
  if (!ov) return false;
  ov.classList.add('on', 'visor-preloading');
  document.documentElement.classList.add('visor-document-open');
  document.body.classList.add('visor-document-open');
  document.body.style.overflow = 'hidden';
  const nombre = estado.archivo || 'Documento';
  const orig = document.getElementById('spanOrigName');
  const clean = document.getElementById('spanCleanName');
  const arrow = document.getElementById('spanRenameArrow');
  if (orig) orig.textContent = nombre;
  if (clean) clean.textContent = nombre;
  if (arrow) arrow.style.display = 'none';
  const oldViewer = document.getElementById('viewerOld');
  const newViewer = document.getElementById('viewerNew');
  if (oldViewer) {
    oldViewer.style.visibility = 'visible';
    if (!oldViewer.querySelector('.doc-viewer-loading') && !oldViewer.querySelector('canvas')) {
      oldViewer.innerHTML = HTML_CARGA_DOC;
    }
  }
  if (newViewer) {
    newViewer.style.visibility = 'visible';
    if (!newViewer.querySelector('.doc-viewer-loading') && !newViewer.querySelector('canvas')) {
      newViewer.innerHTML = HTML_CARGA_DOC;
    }
  }
  return true;
}
function mostrarCargandoDocumentoVisor() {
  const ov = document.getElementById('ov');
  if (ov) ov.classList.add('visor-preloading');
  const oldViewer = document.getElementById('viewerOld');
  const newViewer = document.getElementById('viewerNew');
  if (oldViewer) {
    oldViewer.style.visibility = 'visible';
    oldViewer.innerHTML = HTML_CARGA_DOC;
  }
  if (newViewer) {
    newViewer.style.visibility = 'visible';
    newViewer.innerHTML = HTML_CARGA_DOC;
  }
}
function ocultarCargandoDocumentoVisor() {
  const oldViewer = document.getElementById('viewerOld');
  const newViewer = document.getElementById('viewerNew');
  if (oldViewer) oldViewer.style.visibility = 'visible';
  if (newViewer) newViewer.style.visibility = 'visible';
  const ov = document.getElementById('ov');
  if (ov) ov.classList.remove('visor-preloading');
}
document.addEventListener('DOMContentLoaded', async () => {
  if (window.Permisos && typeof window.Permisos.asegurarSesion === 'function') {
    await window.Permisos.asegurarSesion();
  }
  if (!(window.Permisos && window.Permisos.esAdmin)) {
    mostrarAccesoDenegadoVisor();
    ocultarCargandoPagina();
    document.documentElement.classList.remove('visor-preboot');
    return;
  }
  mostrarVisorDocumentoInmediato();
  mostrarCargandoPagina('Cargando página...');
  /* Extensiones administradas por la plantilla común. */
  inicializarFiltroTrimestreVisor();
  try {
    const selRamaInicial = document.getElementById('selectRamaGithub');
    if (selRamaInicial && window.RamaActual?.pintarSeleccionActual) {
      window.RamaActual.pintarSeleccionActual(selRamaInicial);
    }
  } catch (_) {}
  try {
    const q = new URLSearchParams(window.location.search);
    const ret = q.get('return') || (() =>  {
      try {
        return JSON.parse(localStorage.getItem('visor_contexto') || '{}').returnPath || '';
      } catch (_) {
        return '';
      }
    }
    )();
    const btnVolver = document.getElementById('volver-atras');
    if (btnVolver && ret && ret.startsWith('/')) {
      btnVolver.dataset.returnPath = ret;
      btnVolver.title = 'Volver a la página anterior';
      btnVolver.classList.remove('oculto');
      btnVolver.classList.remove('cargando');
    }
  } catch (_) {
  }
  window.__visorCargaInicial = true;
  try {
    await Promise.all([inicializarRamasGithub(), load()]);
    const selFinal = document.getElementById('selectRamaGithub');
    if (selFinal && typeof grad !== 'undefined') {
      selFinal.value = (typeof modoTodas !== 'undefined' && modoTodas) || grad === '__TODAS__' ? 'TODAS LAS RAMAS' : grad;
    }
    if (window.top === window && window.parent === window && !document.documentElement.classList.contains('visor-embebido')) {
      window.history.replaceState({ visor: true, visorRutaReal: (window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html' }, document.title, (window.APP_BASE || '/'));
    }
    if (typeof initCacheToggle === 'function') initCacheToggle();
  } finally {
    window.__visorCargaInicial = false;
    requestAnimationFrame(() => setTimeout(() =>  {
      ocultarCargandoPagina();
      document.documentElement.classList.remove('visor-preboot');
    }
    , 120));
  }
}
  );
function normalizarNumeroTrimestre(v) {
  if (!v) return '';
  const s = String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (/primer|1er|1\b|1º|1ª/.test(s)) return '1';
  if (/segund|2do|2\b|2º|2ª/.test(s)) return '2';
  if (/tercer|3er|3\b|3º|3ª/.test(s)) return '3';
  const m = s.match(/\d+/);
  return m ? m[0] : s;
}
function seleccionarTrimestreEnElemento(selectEl, valorDeseado) {
  if (!selectEl) return '';
  const val = String(valorDeseado || '').trim();
  if (!val || val.toLowerCase() === 'todos los trimestres' || val.toLowerCase() === 'todos') {
    selectEl.value = '';
    return '';
  }
  for (const opt of selectEl.options) {
    if (opt.value === val || opt.textContent.trim() === val) {
      selectEl.value = opt.value;
      return opt.value;
    }
  }
  const num = normalizarNumeroTrimestre(val);
  if (num) {
    for (const opt of selectEl.options) {
      if (!opt.value) continue;
      if (normalizarNumeroTrimestre(opt.value) === num || normalizarNumeroTrimestre(opt.textContent) === num) {
        selectEl.value = opt.value;
        return opt.value;
      }
    }
  }
  const normVal = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ºª]/g, '').replace(/\btrimestres?\b/g, '').trim();
  for (const opt of selectEl.options) {
    if (!opt.value) continue;
    const normOpt = String(opt.value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ºª]/g, '').replace(/\btrimestres?\b/g, '').trim();
    if (normOpt === normVal) {
      selectEl.value = opt.value;
      return opt.value;
    }
  }
  const textoOpcion = (num ? `${num}º Trimestre` : val);
  const nuevaOpt = document.createElement('option');
  nuevaOpt.value = textoOpcion;
  nuevaOpt.textContent = textoOpcion;
  selectEl.appendChild(nuevaOpt);
  selectEl.value = textoOpcion;
  return selectEl.value;
}
function sincronizarSelectoresTrimestre(valor) {
  const sel = document.getElementById('selectTrimestreVisor');
  const hm = document.getElementById('hm-select-trimestre');
  let valElegido = valor;
  if (sel) { valElegido = seleccionarTrimestreEnElemento(sel, valor); }
  if (hm) {
    if (sel && hm.options.length !== sel.options.length) { hm.innerHTML = sel.innerHTML; }
    seleccionarTrimestreEnElemento(hm, valElegido || valor);
  }
  return valElegido;
}
window.normalizarNumeroTrimestre = normalizarNumeroTrimestre;
window.seleccionarTrimestreEnElemento = seleccionarTrimestreEnElemento;
window.sincronizarSelectoresTrimestre = sincronizarSelectoresTrimestre;
function cambiarTrimestreVisor(valor) {
  const trimestre = String(valor || '').trim();
  if (typeof window.aplicarFiltroTrimestreVisor === 'function') {
    void window.aplicarFiltroTrimestreVisor(trimestre);
    return;
  }
  let ctxLocal =  {
  }
  ;
  try { ctxLocal = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
  catch (_) {
  }
  const nuevo =  {
    ...ctxLocal, trimestre, archivo: '', directo: false, abrirLista: true, pos: undefined
  }
  ;
  if (window.Estado) {
    try { window.Estado.guardar('trimestre', trimestre); }
    catch (_) {
    }
    try {
      window.Estado.guardarContexto( {
        rama: nuevo.rama || (window.RamaActual?.obtener?.() || ''), trimestre, asignatura: nuevo.asignatura || ''
      }
  );
    } catch (_) {
    }
  }
  try {
    localStorage.setItem('visor_contexto', JSON.stringify(nuevo));
    localStorage.setItem('last_open', '0');
    try { localStorage.removeItem('visor_recovery_snapshot'); } catch (_) {}
    localStorage.removeItem('last_archivo');
    localStorage.removeItem('last_archivo_rama');
    localStorage.removeItem('last_archivo_trimestre');
    localStorage.removeItem('last_archivo_asignatura');
    localStorage.removeItem('visor_pos');
  } catch (_) {
  }
  window.VISOR_FILTRO =  { asignatura: nuevo.asignatura || '', trimestre }
  ;
  if (typeof buildAllItems === 'function') buildAllItems();
  if (typeof render === 'function') render();
  sincronizarSelectoresTrimestre(trimestre);
}
window.cambiarTrimestreVisor = cambiarTrimestreVisor;
function inicializarFiltroTrimestreVisor() {
  const sel = document.getElementById('selectTrimestreVisor');
  if (!sel || sel.dataset.ready === '1') return;
  sel.dataset.ready = '1';
  let ctx =  {
  }
  ;
  try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
  catch (_) {
  }
  const q = new URLSearchParams(window.location.search);
  const triInicial = q.get('trimestre') || ctx.trimestre || localStorage.getItem('trimestre') || '';
  sincronizarSelectoresTrimestre(triInicial);
  sel.addEventListener('change', () =>  { cambiarTrimestreVisor(sel.value); }
  );
}
window.inicializarFiltroTrimestreVisor = inicializarFiltroTrimestreVisor;
window.aplicarFiltroTrimestreVisor = async function aplicarFiltroTrimestreVisor(trimestre) {
  const valor = String(trimestre || '').trim();
  // Cambio de trimestre dentro de la misma vista: mostrar cargando mientras
  // se reconstruyen los datos, igual que en una navegación normal.
  try {
    if (typeof mostrarCargandoPagina === 'function') mostrarCargandoPagina('Cargando trimestre...');
    const content = document.getElementById('content');
    if (content) content.innerHTML = '<div class="visor-cargando-documentos" role="status" aria-live="polite"><div class="visor-spinner-anillo"></div><span class="visor-cargando-texto">Cargando...</span></div>';
  } catch (_) {}

  let ctx =  {
  }
  ;
  try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
  catch (_) {
  }
  const nuevo =  { ...ctx, trimestre: valor, archivo: '', directo: false, abrirLista: true }
  ;
  delete nuevo.pos;
  try {
    localStorage.setItem('visor_contexto', JSON.stringify(nuevo));
    localStorage.setItem('last_open', '0');
    try { localStorage.removeItem('visor_recovery_snapshot'); } catch (_) {}
    localStorage.removeItem('last_archivo');
    localStorage.removeItem('last_archivo_rama');
    localStorage.removeItem('last_archivo_trimestre');
    localStorage.removeItem('last_archivo_asignatura');
    localStorage.removeItem('visor_pos');
    window.Estado?.guardar?.('trimestre', valor);
    window.Estado?.guardarContexto?.( {
      rama: nuevo.rama || '', asignatura: nuevo.asignatura || '', trimestre: valor
    }
  );
  } catch (_) {
  }
  window.VISOR_FILTRO =  { asignatura: nuevo.asignatura || '', trimestre: valor }
  ;
  if (typeof buildAllItems === 'function') buildAllItems();
  if (typeof render === 'function') render();
  sincronizarSelectoresTrimestre(valor);
}
;
