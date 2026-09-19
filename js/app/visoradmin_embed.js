/* Visor-Admin embebido: la navbar pertenece al template HTML de la SPA.
 * Este archivo solo activa el contexto y sincroniza los controles con el iframe.
 * NO genera, clona ni construye ninguna navbar.
 */
(() => {
  const ID = 'visor-admin-spa-frame';
  let urlPendiente = '';
  let syncTimer = null;

  function obtenerFrame() { return document.getElementById(ID); }
  function host() { return document.getElementById('app-navbar-cargando'); }

  function construirUrlDesdeContexto() {
    let ctx = {}, app = {}, recovery = {}, f5 = {};
    try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}') || {}; } catch (_) {}
    try { app = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}') || {}; } catch (_) {}
    try { recovery = JSON.parse(localStorage.getItem('visor_recovery_snapshot') || '{}') || {}; } catch (_) {}
    try { f5 = JSON.parse(localStorage.getItem('visor_f5_recovery') || '{}') || {}; } catch (_) {}
    const activoF5 = f5.activo === true && !!f5.archivo;
    const activoRecovery = activoF5 || (recovery.activo === true && !!recovery.archivo);
    const recoveryBase = activoF5 ? f5 : recovery;
    const rama = String((activoRecovery ? recoveryBase.rama : '') || ctx.rama || app.rama || localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '').trim();
    const asig = String((activoRecovery ? recoveryBase.asignatura : '') || ctx.asignatura || app.asignatura || '').trim();
    const tri = String((activoRecovery ? recoveryBase.trimestre : '') || ctx.trimestre || app.trimestre || '').trim();
    const archivo = String((activoRecovery ? recoveryBase.archivo : '') || ctx.archivo || localStorage.getItem('last_archivo') || '').trim();
    const pos = activoRecovery ? recoveryBase.pos : (ctx.pos ?? localStorage.getItem('visor_pos') ?? localStorage.getItem('last_pos'));
    const u = new URL((window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html', location.origin);
    if (rama && rama !== '__TODAS__') u.searchParams.set('rama', rama); else u.searchParams.set('todas', '1');
    if (asig) u.searchParams.set('asignatura', asig);
    if (tri) u.searchParams.set('trimestre', tri);
    if (archivo) u.searchParams.set('archivo', archivo);
    if (pos !== null && pos !== undefined && String(pos) !== '') u.searchParams.set('pos', String(pos));
    u.searchParams.set('return', (window.APP_BASE || '/'));
    u.searchParams.set('_embed', '1');
    u.searchParams.set('_v', '20260917-delapunte6');
    return u.href;
  }

  function activarContextoNavbar() {
    document.documentElement.classList.add('visor-admin-embed', 'visor-admin-active');
    document.body?.classList.add('visor-admin-embed', 'visor-admin-active');
    document.documentElement.dataset.vista = 'visores/administrador';
    if (document.body) document.body.dataset.vista = 'visores/administrador';
    const h = host();
    if (h) h.classList.add('navbar-context-visor-admin');
    const navbar = h?.querySelector?.('navbar-general');
    if (navbar) navbar.dataset.navbarContext = 'visor-admin';
  }

  function limpiarContextoNavbar() {
    document.documentElement.classList.remove('visor-admin-embed', 'visor-admin-active');
    document.body?.classList.remove('visor-admin-embed', 'visor-admin-active');
    const h = host();
    if (h) h.classList.remove('navbar-context-visor-admin');
    const navbar = h?.querySelector?.('navbar-general');
    if (navbar) delete navbar.dataset.navbarContext;
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
    ['navbar-rama-select','navbar-trimestre-select','navbar-rama-popup','navbar-trimestre-popup'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = id.includes('trimestre') ? '<option value="">Todos los trimestres</option><option value="1">1º Trimestre</option><option value="2">2º Trimestre</option><option value="3">3º Trimestre</option>' : '';
    });
  }

  function copiarSelect(origen, destinos) {
    if (!origen) return;
    destinos.forEach(dest => {
      if (!dest) return;
      const oldValue = origen.value;
      dest.innerHTML = origen.innerHTML;
      dest.value = oldValue;
    });
  }

  function sincronizarNavbarDesdeIframe() {
    const frame = obtenerFrame();
    if (!frame) return false;
    try {
      const doc = frame.contentDocument;
      if (!doc) return false;
      const rama = doc.getElementById('selectRamaGithub');
      const tri = doc.getElementById('selectTrimestreVisor');
      if (rama) copiarSelect(rama, [document.getElementById('navbar-rama-select'), document.getElementById('navbar-rama-popup')]);
      if (tri) copiarSelect(tri, [document.getElementById('navbar-trimestre-select'), document.getElementById('navbar-trimestre-popup')]);
      return Boolean(rama || tri);
    } catch (_) { return false; }
  }

  function iniciarSincronizacion() {
    if (syncTimer) clearInterval(syncTimer);
    sincronizarNavbarDesdeIframe();
    let n = 0;
    syncTimer = setInterval(() => {
      n++;
      sincronizarNavbarDesdeIframe();
      if (n > 80 || !obtenerFrame()) { clearInterval(syncTimer); syncTimer = null; }
    }, 250);
  }

  function invocarEnVisor(nombre) {
    const frame = obtenerFrame();
    if (!frame) return;
    try {
      const w = frame.contentWindow;
      if (typeof w?.[nombre] === 'function') w[nombre]();
    } catch (e) { console.error('Acción Visor-Admin:', nombre, e); }
  }

  // Si volvemos a Inicio sin un visor embebido activo, no puede quedar
  // arrastrado el contexto Visor-Admin de una navegación anterior/F5.
  function limpiarContextoSiEstamosEnInicio() {
    const vista = document.body?.dataset?.vista || document.documentElement?.dataset?.vista || '';
    if (vista === 'inicio' && !obtenerFrame() && !window.__visorAdminEmbedActivo) {
      limpiarContextoNavbar();
    }
  }

  function sincronizarTemaIframe(oscuro) {
    const frame = obtenerFrame();
    if (!frame) return;
    const isDark = typeof oscuro === 'boolean' ? oscuro : document.documentElement.classList.contains('modo-oscuro');
    const tema = isDark ? 'dark' : 'light';
    try {
      const doc = frame.contentDocument;
      if (doc) {
        doc.documentElement.classList.toggle('modo-oscuro', isDark);
        if (doc.body) doc.body.classList.toggle('modo-oscuro', isDark);
        doc.documentElement.dataset.theme = tema;
        if (doc.body) doc.body.dataset.theme = tema;
      }
      const win = frame.contentWindow;
      if (win && typeof win.__guardarTemaOscuro === 'function') {
        win.__guardarTemaOscuro(isDark);
      }
    } catch (_) {}
  }

  function enlazarNavbarConIframe() {
    if (document.documentElement.dataset.navbarVisorBound === '1') return;
    document.documentElement.dataset.navbarVisorBound = '1';

    // HOME: conserva el mismo botón visual, pero en Visor-Admin embebido
    // debe cerrar el visor y llevar SIEMPRE al selector de ramas.
    document.addEventListener('click', (e) => {
      const home = e.target?.closest?.('#btn-inicio');
      if (!home || !document.documentElement.classList.contains('visor-admin-active')) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        cerrar();
        sessionStorage.setItem('forzar_selector_rama', '1');
        ['rama_actual','last_grado','last_open','last_archivo','visor_pos','visor_recovery_snapshot','visor_f5_recovery'].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('visor_contexto', JSON.stringify({rama:'',todas:false,asignatura:'',trimestre:'',archivo:'',directo:false,abrirLista:true,abierto:false}));
      } catch (_) {}
      window.location.assign((window.APP_BASE || '/'));
    }, true);

    document.addEventListener('click', (e) => {
      const el = e.target?.closest?.('[data-navbar-action]');
      if (!el) return;
      const action = el.dataset.navbarAction;
      if (!action) return;
      if (action === 'theme') {
        if (typeof window.__alternarModoOscuro === 'function') window.__alternarModoOscuro();
        try { document.getElementById('navbar-menu-panel')?.hidePopover?.(); } catch (_) {}
        return;
      }
      if (action === 'settings') {
        if (window.Ajustes && typeof window.Ajustes.toggle === 'function') window.Ajustes.toggle();
        try { document.getElementById('navbar-menu-panel')?.hidePopover?.(); } catch (_) {}
        return;
      }
      if (action === 'logout') {
        if (typeof window.cerrarSesionUsuario === 'function') window.cerrarSesionUsuario();
        try { document.getElementById('navbar-menu-panel')?.hidePopover?.(); } catch (_) {}
        return;
      }
      if (!document.documentElement.classList.contains('visor-admin-active')) return;
      e.preventDefault(); e.stopPropagation();
      try { document.getElementById('navbar-menu-panel')?.hidePopover?.(); } catch (_) {}
      invocarEnVisor(action);
    }, true);

    document.addEventListener('change', (e) => {
      const el = e.target;
      if (!document.documentElement.classList.contains('visor-admin-active')) return;
      const w = obtenerFrame()?.contentWindow;
      try {
        if ((el?.id === 'navbar-rama-select' || el?.id === 'navbar-rama-popup') && typeof w?.cambiarRamaGithub === 'function') w.cambiarRamaGithub(el.value);
        if ((el?.id === 'navbar-trimestre-select' || el?.id === 'navbar-trimestre-popup') && typeof w?.cambiarTrimestreVisor === 'function') w.cambiarTrimestreVisor(el.value);
      } catch (_) {}
    }, true);

    window.addEventListener('modo-oscuro-cambiado', (e) => {
      sincronizarTemaIframe(e.detail?.activo);
    });
  }

  function cerrar() {
    const frame = obtenerFrame();
    if (frame) frame.remove();
    limpiarContextoNavbar();
    window.__visorAdminEmbedActivo = false;
    try { localStorage.removeItem('visor_admin_abierto'); } catch (_) {}
  }

  function abrir(url) {
    if (window.__visorAdminEmbedActivo && obtenerFrame()) return true;
    let destino = String(url || '').trim() || construirUrlDesdeContexto();
    try {
      const u = new URL(destino, location.origin);
      if (!u.searchParams.has('_tema')) u.searchParams.set('_tema', document.documentElement.classList.contains('modo-oscuro') ? 'dark' : 'light');
      destino = u.href;
    } catch (_) {}
    window.__visorAdminEmbedActivo = true;
    // Marcador persistente: la URL visible sigue siendo '/' pero una recarga
    // del navegador debe volver a abrir exactamente este visor/documento.
    try {
      localStorage.setItem('visor_admin_abierto', '1');
      localStorage.setItem('app_ultima_vista', 'visores/administrador');
    } catch (_) {}
    urlPendiente = destino;
    const montar = () => {
      if (!document.body || obtenerFrame()) return;
      activarContextoNavbar();
      document.documentElement.classList.remove('app-preboot', 'auth-cargando');
      const preloader = document.getElementById('app-preloader');
      if (preloader) preloader.style.display = 'none';
      const isDark = document.documentElement.classList.contains('modo-oscuro');
      const bg = isDark ? '#0f172a' : '#f1f5f9';
      const frame = document.createElement('iframe');
      frame.id = ID;
      frame.title = 'Visor y Gestor de Documentos';
      frame.setAttribute('aria-label', 'Visor y Gestor de Documentos');
      frame.setAttribute('allow', 'clipboard-read; clipboard-write');
      frame.style.cssText = `position:fixed;top:64px;right:0;bottom:0;left:0;width:100vw;height:calc(100vh - 64px);border:0;margin:0;padding:0;display:block;visibility:visible;opacity:1;z-index:999;background:${bg};`;
      frame.addEventListener('load', () => {
        urlPendiente = '';
        sincronizarTemaIframe();
        sincronizarNavbarDesdeIframe();
        iniciarSincronizacion();
      }, { once:true });
      document.body.appendChild(frame);
      frame.src = destino;
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar, { once:true }); else montar();
    return true;
  }

  limpiarContextoSiEstamosEnInicio();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', limpiarContextoSiEstamosEnInicio, { once:true });
  } else {
    setTimeout(limpiarContextoSiEstamosEnInicio, 0);
  }

  window.abrirVisorAdministradorEmbebido = abrir;
  window.cerrarVisorAdministradorEmbebido = cerrar;
  window.__navbarVisorSync = sincronizarNavbarDesdeIframe;
  window.__sincronizarTemaIframe = sincronizarTemaIframe;
  enlazarNavbarConIframe();
})();
