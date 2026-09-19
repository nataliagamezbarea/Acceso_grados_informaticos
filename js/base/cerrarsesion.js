/*
 * CIERRE DE SESIÓN COMPLETO (compartido por index.html y el Visor Admin).
 *
 * Antes cada sitio hacía algo distinto y ninguno dejaba la app limpia:
 *   - sessionStorage.esAdmin = "true" seguía guardado, y Permisos lo trataba
 *     como administrador aunque ya no hubiera usuario;
 *   - visor_admin_abierto / app_ultima_vista / visor_f5_recovery... seguían en
 *     localStorage, así que al volver a "/" reabrir_visor.js reabría el visor
 *     por encima del login (el visor sin sesión mostraba "No se pudieron
 *     cargar los datos");
 *   - si signOut() fallaba (red), la sesión local no se borraba.
 */
(() => {
  const CLAVES_LOCALES = [
    'visor_admin_abierto', 'app_ultima_vista', 'app_ultimo_contexto',
    'visor_contexto', 'visor_recovery_snapshot', 'visor_f5_recovery',
    'last_open', 'last_archivo', 'last_archivo_rama', 'last_grado',
    'last_pos', 'visor_pos', 'visor_rama', 'visor_todas',
    'rama_actual', 'app_rama', 'descarga_activa_live'
  ];

  function limpiarSesionLocal() {
    // Tokens de Supabase (por si signOut no pudo hacerlo, p. ej. sin red).
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && /^sb-.+-auth-token(-code-verifier)?$/.test(k)) localStorage.removeItem(k);
      }
    } catch (_) {}
    // Estado de navegación/visor: sin esto se reabre el visor al volver a "/".
    try { CLAVES_LOCALES.forEach((k) => localStorage.removeItem(k)); } catch (_) {}
    // Marcas de rol y de invitado (viven en sessionStorage, compartido con el iframe del visor).
    try { sessionStorage.clear(); } catch (_) {}
    try { window.sesionActual = null; } catch (_) {}
  }

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  async function cerrarSesionCompleta() {
    if (window.__cerrandoSesion) return;
    window.__cerrandoSesion = true;

    let invitado = false;
    try { invitado = sessionStorage.getItem('esInvitado') === 'true'; } catch (_) {}

    if (!invitado) {
      const auth = window.supabaseClient?.auth;
      if (auth?.signOut) {
        // Sin red signOut puede tardar o fallar: no debe bloquear el cierre.
        try { await Promise.race([auth.signOut({ scope: 'global' }), esperar(4000)]); } catch (_) {}
      }
    }
    limpiarSesionLocal();

    const destino = window.APP_BASE || '/';
    try {
      // Desde el iframe del visor hay que mover la ventana principal.
      const ventana = (window.top && window.top !== window) ? window.top : window;
      ventana.location.replace(destino);
    } catch (_) {
      window.location.replace(destino);
    }
  }

  window.__cerrarSesionCompleta = cerrarSesionCompleta;
})();
