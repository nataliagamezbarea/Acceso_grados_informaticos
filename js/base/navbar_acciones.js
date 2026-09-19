/*
 * NAVBAR: ACCIONES DE "CERRAR SESIÓN" Y "MODO OSCURO"
 * ----------------------------------------------------
 * Enlaza por delegación los botones de la barra superior (#btn-cerrar-sesion,
 * #btn-modo-oscuro) y los del popup (data-navbar-action="logout"/"theme").
 * Antes de este archivo, ningún script llamaba realmente a estas acciones:
 * window.cerrarSesionUsuario y window.__alternarModoOscuro existían pero no
 * tenían ningún addEventListener('click', ...) que los invocara en index.html.
 */
(() => {
  function esInvitado() {
    try { return sessionStorage.getItem('esInvitado') === 'true'; }
    catch (_) { return false; }
  }

  async function cerrarSesionPorDefecto() {
    // Cierre completo (Supabase + rol admin + estado del visor + redirección).
    if (typeof window.__cerrarSesionCompleta === 'function') {
      return window.__cerrarSesionCompleta();
    }
    try {
      if (esInvitado()) {
        try {
          sessionStorage.removeItem('esInvitado');
          sessionStorage.removeItem('guest_modo_oscuro');
        } catch (_) {}
      } else if (window.supabaseClient?.auth?.signOut) {
        await window.supabaseClient.auth.signOut();
      }
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      // '/' (no 'paginas/login.html'): esa página estática solo tiene
      // Google/GitHub y no incluye el botón de invitado. La vista de login
      // real, con invitado, la muestra index.html vía AppViews al detectar
      // que no hay sesión.
      window.location.replace((window.APP_BASE || '/'));
    }
  }

  // Si otra vista ya definió una implementación real, se respeta.
  // Si no existe ninguna (el caso de index.html), se usa esta.
  if (typeof window.cerrarSesionUsuario !== 'function') {
    window.cerrarSesionUsuario = cerrarSesionPorDefecto;
  }

  function alternarTema() {
    if (typeof window.__alternarModoOscuro === 'function') {
      window.__alternarModoOscuro();
      return;
    }
    // Respaldo mínimo por si iniciotema.js no llegó a cargar todavía.
    const activo = !document.documentElement.classList.contains('modo-oscuro');
    document.documentElement.classList.toggle('modo-oscuro', activo);
    document.body?.classList.toggle('modo-oscuro', activo);
    document.documentElement.dataset.theme = activo ? 'dark' : 'light';
  }

  function cerrarPopupMenu() {
    try { document.getElementById('navbar-menu-panel')?.hidePopover?.(); }
    catch (_) {}
  }

  // HOME (#btn-inicio): SIEMPRE debe llevar al selector de ramas, sin
  // importar en qué vista estemos ni si ya hay una rama seleccionada.
  // Antes solo se interceptaba dentro del Visor-Admin embebido
  // (visoradmin_embed.js) o en la página standalone del panel
  // (navegacionglobal.js). En el resto de vistas de la SPA (clase,
  // asignatura, apuntes...) el botón era un <a href="/"> normal: el
  // navegador recargaba "/" sin fijar forzar_selector_rama, y
  // autenticacion.js, al ver una rama ya persistida, te devolvía
  // directo a la clase en vez de mostrar el selector.
  document.addEventListener('click', (e) => {
    const home = e.target?.closest?.('#btn-inicio, .btn-inicio');
    if (!home) return;
    // Si el Visor-Admin embebido está activo, su propio handler
    // (visoradmin_embed.js) ya se encarga de cerrarlo y forzar el
    // selector; no dupliquemos el trabajo aquí.
    if (document.documentElement.classList.contains('visor-admin-active')) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (window.RamaActual?.limpiar) window.RamaActual.limpiar();
      if (window.Estado?.guardar) window.Estado.guardar('rama', '');
      [
        'rama_actual', 'last_grado', 'app_rama', 'last_open',
        'visor_recovery_snapshot', 'last_archivo', 'last_archivo_rama',
        'visor_pos', 'visor_rama', 'visor_todas', 'visor_f5_recovery',
        'visor_admin_abierto'
      ].forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('visor_contexto', JSON.stringify({
        rama: '', todas: false, asignatura: '', trimestre: '',
        archivo: '', directo: false, abrirLista: true, abierto: false
      }));
      localStorage.setItem('app_ultima_vista', 'inicio');
      localStorage.setItem('app_ultimo_contexto', JSON.stringify({
        vista: 'inicio', rama: '', asignatura: '', trimestre: '',
        archivo: '', abierto: false
      }));
      sessionStorage.setItem('forzar_selector_rama', '1');
    } catch (_) {}
    window.location.assign((window.APP_BASE || '/'));
  }, true);

  document.addEventListener('click', (e) => {
    const logoutEl = e.target?.closest?.(
      '#btn-cerrar-sesion, .btn-cerrar-sesion, [data-navbar-action="logout"]'
    );
    if (logoutEl) {
      e.preventDefault();
      cerrarPopupMenu();
      window.cerrarSesionUsuario();
      return;
    }

    const themeEl = e.target?.closest?.(
      '#btn-modo-oscuro, .btn-modo-oscuro, [data-navbar-action="theme"]'
    );
    if (themeEl) {
      e.preventDefault();
      alternarTema();
    }
  }, true);
})();
