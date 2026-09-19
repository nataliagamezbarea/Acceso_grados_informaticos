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
var _searchDebounceDirecto = null;
var _searchAbortDirecto = null;
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
<div class="visor-cargando-documentos" role="status" aria-live="polite"><div class="visor-spinner-anillo"></div><span class="visor-cargando-texto">Cargando documentos…</span></div>`;
  const stats = document.getElementById('stats');
  if (stats) stats.innerHTML = '';
}
function mostrarSeleccionarRama() {
  const content = document.getElementById('content');
  if (content) { content.innerHTML = `
<div class="visor-home-ramas">
  <i class="fa-brands fa-github"></i>
  <h2>Selecciona una rama desde la barra de navegación</h2>
  <p>Utiliza el selector <strong>Rama</strong> de la barra de navegación superior para elegir qué rama quieres revisar.</p>
</div>`; }
  const stats = document.getElementById('stats');
  if (stats) stats.innerHTML = '';
}
function _leerJSONLocalSeguro(clave, fallback = {}) {
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch (_) {
    try { localStorage.removeItem(clave); } catch (_) {}
    return fallback;
  }
}
function _guardarJSONLocalSeguro(clave, value) {
  try { localStorage.setItem(clave, JSON.stringify(value)); return true; }
  catch (_) { return false; }
}

async function load() {
  const params = new URLSearchParams(window.location.search);
  let contexto =  {
  }
  ;
  contexto = _leerJSONLocalSeguro('visor_contexto', {});
  let recovery = _leerJSONLocalSeguro('visor_recovery_snapshot', {});
  const hayRecovery = recovery.activo === true && !!String(recovery.archivo || '').trim();
  if (hayRecovery) {
    // Si F5 ocurre mientras MuPDF aún carga, esta instantánea manda sobre cualquier
    // estado intermedio de la SPA/iframe.
    contexto = { ...contexto, ...recovery, abierto: true, directo: true, abrirLista: false };
  }
  const urlRama = params.get('rama');
  const urlTodas = params.get('todas') === '1';
  const urlAsig = params.get('asignatura');
  const urlTri = params.get('trimestre');
  const urlArchivo = params.get('archivo');
  const urlReturn = params.get('return');
  const urlPos = params.get('pos');
  let appContexto =  {
  }
  ;
  appContexto = _leerJSONLocalSeguro('app_ultimo_contexto', {});
  if (!contexto.rama && appContexto.rama) contexto.rama = appContexto.rama;
  if (!contexto.archivo && appContexto.archivo) contexto.archivo = appContexto.archivo;
  if (contexto.pos === undefined && appContexto.pos !== undefined) contexto.pos = appContexto.pos;
  if (urlRama || urlTodas || urlAsig || urlTri || urlArchivo || urlReturn || urlPos !== null) {
    contexto =  {
      ...contexto,
      ...(urlRama ?  { rama: urlRama, todas: false }
      :  {
      }
      ),
      ...(urlTodas ?  { rama: '', todas: true }
      :  {
      }
      ),
      ...(urlAsig ?  { asignatura: urlAsig }
      :  {
      }
      ),
      ...(urlTri ?  { trimestre: urlTri }
      :  {
      }
      ),
      ...(urlArchivo ?  { archivo: urlArchivo }
      :  {
      }
      ),
      ...(urlReturn ?  { returnPath: urlReturn }
      :  {
      }
      )
    }
    ;
    try {
      if (urlPos !== null) localStorage.setItem('visor_pos', urlPos);
      if (urlRama) {
        localStorage.setItem('visor_rama', urlRama);
        // Una navegación explícita a una rama concreta invalida cualquier flag
        // antiguo de "todas las ramas" que pudiera quedar de una sesión anterior.
        localStorage.removeItem('visor_todas');
      }
      if (urlTodas) localStorage.setItem('visor_todas', '1');
      localStorage.setItem('visor_contexto', JSON.stringify(contexto));
      // La URL del visor permanece visible mientras el documento está abierto.
    } catch (_) {
    }
  }
  // Recuperación fuerte tras F5: si existe un documento persistido y no hay una orden
  // explícita de volver a la lista, lo consideramos abierto aunque app_ultimo_contexto
  // haya quedado desfasado durante la navegación SPA.
  try {
    const persistedArch = String(contexto.archivo || localStorage.getItem('last_archivo') || '').trim();
    const persistedOpen = localStorage.getItem('last_open') === '1';
    if (persistedArch && persistedOpen && contexto.abrirLista !== true && contexto.abierto !== false) {
      contexto.archivo = persistedArch;
      contexto.abierto = true;
      contexto.directo = true;
      contexto.abrirLista = false;
      if (contexto.pos === undefined || contexto.pos === null) {
        const lp = localStorage.getItem('visor_pos') ?? localStorage.getItem('last_pos');
        if (lp !== null) contexto.pos = lp;
      }
    }
  } catch (_) {}

  // La última vista explícita manda: si la pantalla anterior era la LISTA,
  // jamás rehidratamos un documento solo porque haya quedado un archivo antiguo en caché.
  const vistaListaExplicita = !hayRecovery && (contexto.abierto === false || contexto.abrirLista === true || (appContexto.abierto === false && contexto.abierto !== true && contexto.directo !== true));
  if (vistaListaExplicita && !urlArchivo) {
    contexto.archivo = '';
    contexto.directo = false;
    contexto.abrirLista = true;
    contexto.abierto = false;
    try {
      localStorage.setItem('last_open', '0');
      localStorage.removeItem('last_archivo');
      localStorage.removeItem('last_archivo_rama');
      localStorage.removeItem('last_archivo_trimestre');
      localStorage.removeItem('last_archivo_asignatura');
    } catch (_) {}
  }
  const modoTodas = urlTodas || contexto.todas === true || contexto.rama === '__TODAS__' || contexto.rama === 'TODAS_LAS_RAMAS_' || contexto.rama === 'TODAS LAS RAMAS' || localStorage.getItem('visor_todas') === '1' || localStorage.getItem('last_grado') === '__TODAS__' || localStorage.getItem('last_grado') === 'TODAS LAS RAMAS' || (!urlRama && !contexto.rama && !localStorage.getItem('last_archivo_rama') && !localStorage.getItem('last_grado') && !localStorage.getItem('rama_actual'));
  const abrirListaContextual = contexto.abrirLista === true;
  const savedGrado = modoTodas ? '' : (urlRama || contexto.rama || localStorage.getItem('last_archivo_rama') || localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '');
  // Mientras la rama todavía se está cargando por completo (buildData aún no
  // ha resuelto), el buscador necesita saber a qué rama apuntar sin esperar
  // a que "grad" quede asignado más abajo.
  window.__ramaCargando = savedGrado || '';
  try {
    contexto.rama = savedGrado;
    localStorage.setItem('app_ultima_vista', 'visores/administrador');
    localStorage.setItem('app_ultimo_contexto', JSON.stringify( {
      vista:'visores/administrador', rama:savedGrado, asignatura:contexto.asignatura||'', trimestre:contexto.trimestre||'',
      archivo:contexto.archivo||'', pos:contexto.pos, abierto:contexto.abierto !== false && !!(contexto.archivo || localStorage.getItem('last_open') === '1')
    }
    ));
  } catch (_) {
  }
  const filtroAsignatura = contexto.asignatura || '';
  const filtroTrimestre = contexto.trimestre || '';
  if (typeof window.sincronizarSelectoresTrimestre === 'function') {
    window.sincronizarSelectoresTrimestre(filtroTrimestre);
  } else {
    const selTri = document.getElementById('selectTrimestreVisor');
    if (selTri) selTri.value = filtroTrimestre || '';
  }
  const archivoPersistido = String(contexto.archivo || '').trim();
  const archivoUltimo = String(localStorage.getItem('last_archivo') || '').trim();
  const ramaUltimoArchivo = String(localStorage.getItem('last_archivo_rama') || '').trim();
  const hayUltimoDocumento = localStorage.getItem('last_open') === '1' && !!archivoUltimo;
  // Prioridad: documento indicado explícitamente en la navegación > contexto directo > último documento.
  // Si el contexto dice abrirLista, se ignora SIEMPRE el último documento.
  const documentoExplicito = !!urlArchivo || (contexto.abierto === true && contexto.directo === true && !!archivoPersistido);
  const archivoContexto = (urlArchivo ? urlArchivo : (abrirListaContextual || vistaListaExplicita ? '' : (documentoExplicito ? archivoPersistido : (hayUltimoDocumento && (!savedGrado || !ramaUltimoArchivo || ramaUltimoArchivo === savedGrado || modoTodas) ? archivoUltimo : ''))));
  const hayRamaObjetivo = true;
  if (!window.__visorCargaInicial) mostrarCargaGlobal();
  let d = null;
  const ramaParaCargaDirecta = (!modoTodas && savedGrado) ? savedGrado : null;
  const pedirJSON = async (url) => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const x = await r.json();
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('Respuesta de datos inválida');
    return x;
  };
  let ultimoError = null;
  if (ramaParaCargaDirecta) {
    try { d = await pedirJSON(`/api/datos_rama?rama=${encodeURIComponent(ramaParaCargaDirecta)}`); }
    catch (e) { ultimoError = e; }
  }
  if (!d) {
    try { d = await pedirJSON('/api/datos'); }
    catch (e) { ultimoError = e; }
  }
  if (!d) {
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = `<div class="visor-estado-error-datos" role="alert">
        <i class="fa-solid fa-triangle-exclamation visor-estado-error-icono"></i>
        <h2 class="visor-estado-error-titulo">No se pudieron cargar los datos</h2>
        <p class="visor-estado-error-descripcion">El estado guardado no se ha perdido. Puedes reintentar sin recargar la página.</p>
        <button type="button" class="visor-boton-reintentar" onclick="location.reload()"><i class="fa-solid fa-rotate-right"></i> Reintentar</button>
      </div>`;
    }
    console.warn('[Visor Admin] No se pudieron cargar los datos:', ultimoError);
    return;
  }
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
<div class="visor-estado-error-datos">
  <i class="fa-solid fa-triangle-exclamation visor-estado-error-icono"></i>
  <h2 class="visor-estado-error-titulo">No se pudieron cargar los datos</h2>
  <p class="visor-estado-error-descripcion">Comprueba tu sesión o la configuración y vuelve a intentarlo.</p>
</div>`; }
    return;
  }
  if (modoTodas) { grad = '__TODAS__'; }
  else if (savedGrado && (degrees.includes(savedGrado) || CONFIG[savedGrado])) { grad = savedGrado; }
  else if (urlRama && (degrees.includes(urlRama) || CONFIG[urlRama])) { grad = urlRama; }
  else if (degrees.length > 0 && !esHomeVisor) { grad = degrees[0]; }
  else { grad = ''; }
  const sel = document.getElementById('selectRamaGithub');
  if (sel) sel.value = modoTodas ? 'TODAS LAS RAMAS' : grad;
  if (modoTodas || (grad && CONFIG[grad])) {
    if (abrirListaContextual) {
      try {
        localStorage.setItem('last_open', '0');
        localStorage.removeItem('last_archivo');
        localStorage.removeItem('last_archivo_rama');
        localStorage.removeItem('visor_pos');
      } catch (_) {
      }
    }
    if (typeof renderTabs === 'function') renderTabs();
    buildAllItems();
    if (typeof render === 'function') render();
    if (typeof precargarPrimerosOriginales === 'function') setTimeout(precargarPrimerosOriginales, 400);
    const archivoObjetivo = abrirListaContextual ? '' : (urlArchivo || archivoContexto);
    let abrioArchivoObjetivo = false;
    if (archivoObjetivo) {
      const nombreObjetivo = String(archivoObjetivo).split('/').pop();
      const objetivo = nombreObjetivo.toLowerCase();
      const idxObjetivo = ITEMS.findIndex(it => String(it.archivo || '').split('/').pop().toLowerCase() === objetivo);
      const inputBusqueda = document.getElementById('inputBuscarArchivo');
      if (inputBusqueda) {
        inputBusqueda.value = nombreObjetivo;
        try { filtrarArchivos(nombreObjetivo); }
        catch (_) { } }
      if (idxObjetivo >= 0) {
        abrioArchivoObjetivo = true;
        POS = idxObjetivo;
        localStorage.setItem('last_grado', grad);
        localStorage.setItem('last_pos', String(POS));
        localStorage.setItem('last_open', '1');
        localStorage.setItem('last_archivo', ITEMS[POS].archivo);
        setTimeout(() =>  { if (typeof openOv === 'function') openOv(); }
        , 0);
      } else {
        // El documento solicitado o guardado no pertenece a la asignatura/trimestre actual
        localStorage.setItem('last_open', '0');
        const ov = document.getElementById('ov');
        if (ov) ov.classList.remove('on', 'visor-preloading');
        document.documentElement.classList.remove('visor-document-open', 'visor-preloading');
        document.body.classList.remove('visor-document-open');
        document.body.style.overflow = '';
      }
    }
    const openParam = params.get('pos');
    const storedPos = localStorage.getItem('visor_pos');
    if (!abrioArchivoObjetivo && !abrirListaContextual && !vistaListaExplicita && (openParam !== null || storedPos !== null)) {
      const p = parseInt(openParam !== null ? openParam : storedPos, 10);
      if (p >= 0 && p < ITEMS.length && ITEMS[p]) {
        POS = p;
        openOv();
      } else {
        POS = 0;
        localStorage.setItem('last_open', '0');
        const ov = document.getElementById('ov');
        if (ov) ov.classList.remove('on', 'visor-preloading');
        document.documentElement.classList.remove('visor-document-open', 'visor-preloading');
        document.body.classList.remove('visor-document-open');
        document.body.style.overflow = '';
      }
    } else if (!abrioArchivoObjetivo && !abrirListaContextual && !vistaListaExplicita && localStorage.getItem('last_open') === '1') {
      const savedArch = localStorage.getItem('last_archivo');
      const savedRama = localStorage.getItem('last_archivo_rama') || '';
      const normCheck = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[ºª]/g, '').replace(/\btrimestres?\b/g, '').trim();
      const savedTri = normCheck(localStorage.getItem('last_archivo_trimestre'));
      const savedAsig = normCheck(localStorage.getItem('last_archivo_asignatura'));
      const triAct = normCheck(filtroTrimestre);
      const asigAct = normCheck(filtroAsignatura);
      const coincideTri = !triAct || (savedTri && savedTri === triAct);
      const coincideAsig = !asigAct || (savedAsig && (savedAsig === asigAct || savedAsig.includes(asigAct) || asigAct.includes(savedAsig)));
      let idx = -1;
      if (savedArch && coincideTri && coincideAsig) {
        idx = ITEMS.findIndex(item => item.archivo === savedArch && (!savedRama || !modoTodas || (item._rama || '') === savedRama));
        if (idx === -1 && modoTodas) { idx = ITEMS.findIndex(item => item.archivo === savedArch); }
      }
      if (idx >= 0 && idx < ITEMS.length) {
        POS = idx;
        openOv();
      } else {
        // No coincide con el trimestre/asignatura actual
        localStorage.setItem('last_open', '0');
        const ov = document.getElementById('ov');
        if (ov) ov.classList.remove('on', 'visor-preloading');
        document.documentElement.classList.remove('visor-document-open', 'visor-preloading');
        document.body.classList.remove('visor-document-open');
        document.body.style.overflow = '';
        POS = 0;
      }
    } else {
      POS = 0;
      const ov = document.getElementById('ov');
      if (ov) ov.classList.remove('on', 'visor-preloading');
      document.documentElement.classList.remove('visor-document-open', 'visor-preloading');
      document.body.classList.remove('visor-document-open');
      document.body.style.overflow = '';
      if (modoTodas) {
        localStorage.removeItem('last_open');
        localStorage.removeItem('last_archivo');
        localStorage.removeItem('last_archivo_rama');
        localStorage.removeItem('last_archivo_trimestre');
        localStorage.removeItem('last_archivo_asignatura');
      }
    }
  } else {
    mostrarSeleccionarRama();
  }
}
function buildAllItems() {
  ITEMS = [];
  const filtro = window.VISOR_FILTRO ||  {
  }
  ;
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[ºª]/g, '').replace(/\btrimestres?\b/g, '').trim();
  const asig = norm(filtro.asignatura);
  const tri = norm(filtro.trimestre);
  const obtenerCampo = (e, ...keys) =>  {
    for (const k of keys) {
      if (e && e[k] !== undefined && e[k] !== null && String(e[k]).trim() !== '') return e[k];
    }
    return '';
  }
  ;
  const coincide = (e) =>  {
    if (!asig && !tri) return true;
    const ea = norm(obtenerCampo(e, 'asignatura', 'ASIGNATURA', 'materia', 'curso', 'asignatura_codigo', 'codigo_asignatura'));
    const et = norm(obtenerCampo(e, 'trimestre', 'TRIMESTRE', 'trimestre_nombre', 'periodo'));
    if (asig && (!ea || (ea !== asig && !ea.includes(asig) && !asig.includes(ea)))) return false;
    if (tri && (!et || et !== tri)) return false;
    return true;
  }
  ;
  const ramas = grad === '__TODAS__' ? Object.keys(DATA) : [grad];
  ramas.forEach(rama =>  {
    const d = DATA[rama];
    if (!d) return;
    (d.entries || []).forEach((e, idx) =>  {
      if (coincide(e)) {
        const itemTri = obtenerCampo(e, 'trimestre', 'TRIMESTRE', 'trimestre_nombre', 'periodo') || filtro.trimestre || '';
        const itemAsig = obtenerCampo(e, 'asignatura', 'ASIGNATURA', 'materia', 'curso', 'asignatura_codigo', 'codigo_asignatura') || filtro.asignatura || '';
        ITEMS.push( { ...e, type: 'e', idx, _rama: rama, _trimestre: itemTri, _asignatura: itemAsig }
  );
      }
    }
  );
    (d.no_cambian || []).forEach((n, idx) =>  {
      if (coincide(n)) {
        const itemTri = obtenerCampo(n, 'trimestre', 'TRIMESTRE', 'trimestre_nombre', 'periodo') || filtro.trimestre || '';
        const itemAsig = obtenerCampo(n, 'asignatura', 'ASIGNATURA', 'materia', 'curso', 'asignatura_codigo', 'codigo_asignatura') || filtro.asignatura || '';
        ITEMS.push( { ...n, type: 'n', idx, _rama: rama, _trimestre: itemTri, _asignatura: itemAsig }
  );
      }
    }
  );
  }
  );
  window.ITEMS = ITEMS;
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
  const ramaObjetivoBusqueda = (grad && grad !== '__TODAS__') ? grad : (window.__ramaCargando || '');
  const ramaYaCompleta = !ramaObjetivoBusqueda || DATA[ramaObjetivoBusqueda]?._completo === true;
  if (count) {
    count.textContent = BUSQUEDA_ARCHIVO
      ? (ramaYaCompleta ? `${ITEMS_BUSQUEDA.length} encontrado${ITEMS_BUSQUEDA.length === 1 ? '' : 's'}` : 'Buscando…')
      : '';
  }
  if (clear) clear.style.display = BUSQUEDA_ARCHIVO ? 'inline-flex' : 'none';
  if (typeof render === 'function' && grad && (grad === '__TODAS__' || DATA[grad])) render();
  if (typeof precargarPrimerosOriginales === 'function') {
    try { precargarPrimerosOriginales(); }
    catch (_) { } }
  // BÚSQUEDA DIRECTA: si la rama aún no ha terminado de cargar por
  // completo, no esperamos a que termine: pedimos directamente los
  // archivos que coinciden con lo escrito, en vez de cargar/precargar
  // toda la rama primero.
  if (BUSQUEDA_ARCHIVO && ramaObjetivoBusqueda && !ramaYaCompleta) {
    clearTimeout(_searchDebounceDirecto);
    _searchDebounceDirecto = setTimeout(() => buscarArchivosDirecto(valor, ramaObjetivoBusqueda), 220);
  }
}
async function buscarArchivosDirecto(valor, ramaObjetivo) {
  const texto = String(valor || '').trim();
  if (!texto || !ramaObjetivo) return;
  try { _searchAbortDirecto?.abort?.(); } catch (_) {}
  _searchAbortDirecto = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  try {
    const url = `/api/buscar_archivos?rama=${encodeURIComponent(ramaObjetivo)}&q=${encodeURIComponent(texto)}`;
    const r = await fetch(url, _searchAbortDirecto ? { signal: _searchAbortDirecto.signal } : {});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const resultado = await r.json();
    const d = resultado?.[ramaObjetivo];
    if (!d) return;
    // Si mientras tanto ya terminó la carga íntegra de la rama, esa
    // ficha completa manda: no la pisamos con el resultado parcial.
    if (DATA[ramaObjetivo]?._completo === true) return;
    // El usuario pudo haber cambiado el texto mientras esperábamos la
    // respuesta: si ya no coincide, este resultado está obsoleto.
    if (_normalizarBusquedaArchivo(valor) !== BUSQUEDA_ARCHIVO) return;
    DATA[ramaObjetivo] = d;
    window.DATA = DATA;
    buildAllItems();
    ITEMS_BUSQUEDA = obtenerItemsBusqueda();
    window.ITEMS_BUSQUEDA = ITEMS_BUSQUEDA;
    const count = document.getElementById('fileSearchCount');
    if (count) count.textContent = `${ITEMS_BUSQUEDA.length} encontrado${ITEMS_BUSQUEDA.length === 1 ? '' : 's'}`;
    if (typeof render === 'function') render();
  } catch (e) {
    if (e?.name !== 'AbortError') console.warn('[Buscador] búsqueda directa falló:', e);
  }
}

function limpiarBusquedaArchivos() {
  const input = document.getElementById('inputBuscarArchivo');
  if (input) input.value = '';
  filtrarArchivos('');
}
