/* ESTADO GLOBAL Y CARGA (< 65 lineas) */
var DATA = window.DATA ||  {
}
;
var CONFIG = window.CONFIG ||  {
}
;
var grad = window.grad || '';
var POS = window.POS || 0;
var ITEMS = window.ITEMS || [];
var TAB_KEY = 'e';
var NAV_SOLO_SELECCIONADOS = true;
var BUSQUEDA_ARCHIVO = '';
var ITEMS_BUSQUEDA = [];
window.BUSQUEDA_ARCHIVO = BUSQUEDA_ARCHIVO;
window.ITEMS_BUSQUEDA = ITEMS_BUSQUEDA;
window.DATA = DATA;
window.CONFIG = CONFIG;
window.grad = grad;
window.POS = POS;
window.ITEMS = ITEMS;
function mostrarCargaGlobal() {
  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML = `
    <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:90px 20px;color:#94a3b8">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size:42px;color:#818cf8;margin-bottom:20px"></i>
      <span style="font-size:15px;color:#cbd5e1">Cargando documentos de la rama…</span>
    </div>`;
  const stats = document.getElementById('stats');
  if (stats) stats.innerHTML = '';
}
function mostrarSeleccionarRama() {
  const content = document.getElementById('content');
  if (content) { content.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:80px 24px;color:#94a3b8">
        <i class="fa-brands fa-github" style="font-size:52px;color:#a78bfa;margin-bottom:16px;display:block"></i>
        <h2 style="font-size:20px;color:#f1f5f9;margin-bottom:8px">Selecciona una rama</h2>
        <p style="font-size:14px;color:#94a3b8;max-width:460px;margin:0 auto">Elige una rama en el selector superior para cargar y revisar sus documentos.</p>
      </div>`; }
  const stats = document.getElementById('stats');
  if (stats) stats.innerHTML = '';
}
async function load() {
  const urlRama = new URLSearchParams(window.location.search).get('rama');
  const savedGrado = localStorage.getItem('last_grado') || localStorage.getItem('rama_actual');
  const hayRamaObjetivo = !!(savedGrado || urlRama);
  // Sin rama a cargar: se muestra "Selecciona una rama" al instante, sin esperar
  // el fetch de datos (evita que tarde).
  if (!hayRamaObjetivo) {
    mostrarSeleccionarRama();
    return;
  }
  mostrarCargaGlobal();
  const r = await fetch('/api/datos');
  const d = await r.json();
  DATA = d ||  {
  }
  ;
  CONFIG = d ||  {
  }
  ;
  const degrees = Object.keys(CONFIG);
  if (degrees.length === 0) {
    const content = document.getElementById('content');
    if (content) { content.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:90px 20px;color:#94a3b8">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:44px;color:#f59e0b;margin-bottom:16px;display:block"></i>
          <h2 style="font-size:18px;color:#f1f5f9;margin-bottom:6px">No se pudieron cargar los datos</h2>
          <p style="font-size:14px;color:#94a3b8">Comprueba tu sesión o la configuración y vuelve a intentarlo.</p>
        </div>`; }
    return;
  }
  if (savedGrado && degrees.includes(savedGrado)) { grad = savedGrado; }
  else if (urlRama && degrees.includes(urlRama)) { grad = urlRama; }
  else { grad = ''; }
  const sel = document.getElementById('selectRamaGithub');
  if (sel && grad) sel.value = grad;
  if (grad && CONFIG[grad]) {
    if (typeof renderTabs === 'function') renderTabs();
    buildAllItems();
    if (typeof render === 'function') render();
    if (typeof precargarPrimerosOriginales === 'function') setTimeout(precargarPrimerosOriginales, 400);
    const openParam = new URLSearchParams(window.location.search).get('pos');
    if (openParam !== null) {
      const p = parseInt(openParam, 10);
      if (p >= 0 && p < ITEMS.length) {
        POS = p;
        openOv();
      }
    } else if (localStorage.getItem('last_open') === '1') {
      const savedArch = localStorage.getItem('last_archivo');
      let idx = -1;
      if (savedArch) idx = ITEMS.findIndex(item => item.archivo === savedArch);
      if (idx === -1) {
        const savedPos = parseInt(localStorage.getItem('last_pos') || '0', 10);
        if (savedPos >= 0 && savedPos < ITEMS.length) idx = savedPos;
      }
      if (idx >= 0 && idx < ITEMS.length) {
        POS = idx;
        openOv();
      }
    } else {
      POS = 0;
    }
  } else {
    mostrarSeleccionarRama();
  }
}
function buildAllItems() {
  ITEMS = [];
  if (!DATA[grad]) return;
  (DATA[grad].entries || []).forEach((e, idx) => ITEMS.push( { ...e, type: 'e', idx }
  ));
  (DATA[grad].no_cambian || []).forEach((n, idx) => ITEMS.push( { ...n, type: 'n', idx }
  ));
}
function _normalizarBusquedaArchivo(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function obtenerItemsBusqueda() {
  if (!BUSQUEDA_ARCHIVO) return Array.isArray(ITEMS) ? ITEMS : [];
  return (Array.isArray(ITEMS) ? ITEMS : []).filter(it =>  {
    const nombre = _normalizarBusquedaArchivo(it?.archivo || '');
    return nombre.includes(BUSQUEDA_ARCHIVO);
  }
  );
}
function filtrarArchivos(valor) {
  BUSQUEDA_ARCHIVO = _normalizarBusquedaArchivo(valor);
  window.BUSQUEDA_ARCHIVO = BUSQUEDA_ARCHIVO;
  ITEMS_BUSQUEDA = obtenerItemsBusqueda();
  window.ITEMS_BUSQUEDA = ITEMS_BUSQUEDA;
  const count = document.getElementById('fileSearchCount');
  const clear = document.getElementById('btnLimpiarBusqueda');
  if (count) count.textContent = BUSQUEDA_ARCHIVO ? `${ITEMS_BUSQUEDA.length} encontrado${ITEMS_BUSQUEDA.length === 1 ? '' : 's'}` : '';
  if (clear) clear.style.display = BUSQUEDA_ARCHIVO ? 'inline-flex' : 'none';
  if (typeof render === 'function' && grad && DATA[grad]) render();
  if (typeof precargarPrimerosOriginales === 'function') {
    try { precargarPrimerosOriginales(); }
    catch (_) { } }
}
function limpiarBusquedaArchivos() {
  const input = document.getElementById('inputBuscarArchivo');
  if (input) input.value = '';
  filtrarArchivos('');
}
