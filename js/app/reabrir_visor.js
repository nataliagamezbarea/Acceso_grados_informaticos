/* Restauración instantánea del Visor Admin desde /.
 * Al recargar, el servidor entrega index.html porque la URL visible del visor es /.
 * Antes de montar la aplicación comprobamos el último contexto persistido y
 * reabrimos el panel real. El bloqueo de primer frame lo mantiene oculto
 * hasta que autenticacion.js termina el routing.
 */
(() =>  {
  try {
    // La entrada al selector desde HOME es explícita mediante ?selector=1.
    // Así una visita directa a / no hereda un flag antiguo de sessionStorage.
    const paramsInicio = new URLSearchParams(window.location.search);
    const selectorSolicitado = paramsInicio.get('selector') === '1';
    if (selectorSolicitado) {
      // HOME es una salida explícita del Visor-Admin. Borra TODO el estado
      // que podría provocar una reapertura al recargar /.
      try {
        sessionStorage.setItem('forzar_selector_rama', '1');
        [
          'visor_admin_abierto','app_ultima_vista','app_ultimo_contexto',
          'visor_contexto','visor_recovery_snapshot','visor_f5_recovery',
          'last_open','last_archivo','last_archivo_rama','last_grado',
          'last_pos','visor_pos','visor_rama','visor_todas','rama_actual',
          'app_rama'
        ].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('app_ultima_vista', 'inicio');
        localStorage.setItem('app_ultimo_contexto', JSON.stringify({ vista:'inicio', rama:'', asignatura:'', trimestre:'', archivo:'', abierto:false }));
        localStorage.setItem('visor_contexto', JSON.stringify({ rama:'', todas:false, asignatura:'', trimestre:'', archivo:'', directo:false, abrirLista:true, abierto:false }));
        window.history.replaceState({}, document.title, (window.APP_BASE || '/'));
      } catch (_) {}
      return;
    }

    // Entrada directa/recarga real: descartar cualquier flag viejo.
    try { sessionStorage.removeItem('forzar_selector_rama'); } catch (_) {}

    // El Visor Admin es solo para administradores: sin token de Supabase no se
    // reabre (mostraría "No se pudieron cargar los datos" sobre el login).
    let haySesion = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.+-auth-token$/.test(k) && localStorage.getItem(k)) { haySesion = true; break; }
      }
    } catch (_) { haySesion = true; }
    if (!haySesion) {
      try {
        ['visor_admin_abierto','visor_recovery_snapshot','visor_f5_recovery','last_open','last_archivo']
          .forEach(k => localStorage.removeItem(k));
        if ((localStorage.getItem('app_ultima_vista') || '') === 'visores/administrador') {
          localStorage.setItem('app_ultima_vista', 'inicio');
        }
      } catch (_) {}
      return;
    }

    const forced = false;
    const vista = localStorage.getItem('app_ultima_vista') || '';
    let vctxInicial = {};
    let recoveryInicial = {};
    let f5Recovery = {};
    try { vctxInicial = JSON.parse(localStorage.getItem('visor_contexto') || '{}') || {}; } catch (_) {}
    try { recoveryInicial = JSON.parse(localStorage.getItem('visor_recovery_snapshot') || '{}') || {}; } catch (_) {}
    try { f5Recovery = JSON.parse(localStorage.getItem('visor_f5_recovery') || '{}') || {}; } catch (_) {}
    if (f5Recovery.activo === true && f5Recovery.archivo) {
      recoveryInicial = { ...recoveryInicial, ...f5Recovery, activo: true };
      vctxInicial = { ...vctxInicial, ...f5Recovery, abierto: true, directo: true, abrirLista: false };
      try { localStorage.setItem('visor_admin_abierto', '1'); localStorage.setItem('app_ultima_vista', 'visores/administrador'); } catch (_) {}
    }
    // La instantánea de recuperación se escribe en el instante en que el usuario
    // abre un documento, antes de comenzar MuPDF. Es la fuente prioritaria durante
    // F5 para que una carga todavía pendiente nunca convierta el visor en lista.
    if (recoveryInicial.activo === true && recoveryInicial.archivo) {
      vctxInicial = { ...vctxInicial, ...recoveryInicial, abierto: true, directo: true, abrirLista: false };
    }
    const archivoPersistidoInicial = String(recoveryInicial.archivo || vctxInicial.archivo || localStorage.getItem('last_archivo') || '').trim();
    const visorAbiertoPersistido = !!archivoPersistidoInicial && (recoveryInicial.activo === true || vctxInicial.abierto !== false || vctxInicial.directo === true || localStorage.getItem('last_open') === '1');
    let marcadorVisor = false;
    try { marcadorVisor = localStorage.getItem('visor_admin_abierto') === '1'; } catch (_) {}
    const debeReabrirVisor = (f5Recovery.activo === true && !!f5Recovery.archivo) || marcadorVisor || vista === 'visores/administrador';
    const navEntry = window.performance?.getEntriesByType?.("navigation")?.[0];
    const esBack = navEntry?.type === "back_forward";
    if (forced || esBack || !debeReabrirVisor) {
      if (esBack || vista === 'inicio') {
        try {
          localStorage.removeItem('visor_admin_abierto');
          localStorage.removeItem('last_open');
          localStorage.removeItem('last_archivo');
          localStorage.removeItem('visor_recovery_snapshot');
          localStorage.removeItem('visor_f5_recovery');
          const vc = JSON.parse(localStorage.getItem('visor_contexto') || '{}') || {};
          localStorage.setItem('visor_contexto', JSON.stringify({ ...vc, archivo:'', abierto:false, directo:false }));
        } catch (_) {}
        localStorage.setItem('app_ultima_vista', 'inicio');
      }
      // NO quitar app-preboot aquí. Este script se ejecuta antes de que
      // autenticacion.js termine y quitarlo exponía el selector provisional.
      return;
    }
    let ctx =  {
    }
    ;
    try { ctx = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}'); }
    catch (_) {
    }
    let vctx =  {
    }
    ;
    try { vctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
    catch (_) {
    }
    const rama = String(f5Recovery.rama || recoveryInicial.rama || ctx.rama || vctx.rama || localStorage.getItem('last_archivo_rama') || localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '').trim();
    const archivo = String(f5Recovery.archivo || recoveryInicial.archivo || ctx.archivo || vctx.archivo || localStorage.getItem('last_archivo') || '').trim();
    const posRaw = f5Recovery.pos ?? recoveryInicial.pos ?? ctx.pos ?? vctx.pos ?? localStorage.getItem('visor_pos') ?? localStorage.getItem('last_pos');
    // Al recargar mientras un documento está abierto, reabrimos el Visor Admin
    // embebido en el documento principal (/) sin navegar a /paginas ni alterar
    // la URL del navegador, manteniéndola siempre en http://127.0.0.1:5500/.
    const u = new URL((window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html', location.origin);
    if (rama && rama !== '__TODAS__') u.searchParams.set('rama', rama);
    else u.searchParams.set('todas', '1');
    if (archivo) u.searchParams.set('archivo', archivo);
    if (posRaw !== null && posRaw !== undefined && String(posRaw) !== '') u.searchParams.set('pos', String(posRaw));
    const modo = String(vctxInicial.modo || vctxInicial.vistaPdf || localStorage.getItem('visor_modo') || '').trim();
    if (modo) u.searchParams.set('modo', modo);
    const zoom = String(vctxInicial.zoom || localStorage.getItem('visor_zoom') || '').trim();
    if (zoom) u.searchParams.set('zoom', zoom);
    const asig = String(f5Recovery.asignatura || ctx.asignatura || vctxInicial.asignatura || '').trim();
    const tri = String(f5Recovery.trimestre || ctx.trimestre || vctxInicial.trimestre || '').trim();
    if (asig) u.searchParams.set('asignatura', asig);
    if (tri) u.searchParams.set('trimestre', tri);
    u.searchParams.set('return', (window.APP_BASE || '/'));
    u.searchParams.set('_embed', '1');

    try { sessionStorage.setItem('visor_boot_search', u.search); } catch (_) {}

    if (typeof window.abrirVisorAdministradorEmbebido === 'function') {
      window.abrirVisorAdministradorEmbebido(u.href);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        if (typeof window.abrirVisorAdministradorEmbebido === 'function') {
          window.abrirVisorAdministradorEmbebido(u.href);
        }
      }, { once: true });
    }
    return;
  } catch (_) {
  }
}
)();
