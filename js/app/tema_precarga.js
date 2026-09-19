(function () {
  try {
    const html = document.documentElement;
    const ruta = String(window.location.pathname || '').toLowerCase();
    const esLoginDirecto = ruta.endsWith('/login.html') || ruta.includes('/iniciarsesion.html');

    // Las pantallas de acceso siempre nacen en claro. La preferencia del
    // administrador se hidrata después desde Supabase, nunca durante el primer paint.
    if (esLoginDirecto) {
      html.classList.remove('modo-oscuro');
      html.dataset.theme = 'light';
      html.classList.add('tema-preboot');
      const liberar = () => html.classList.remove('tema-preboot');
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', liberar, { once: true });
      else liberar();
      return;
    }

    // El invitado sí tiene una preferencia local independiente.
    const invitado = (() => {
      try { return sessionStorage.getItem('esInvitado') === 'true'; }
      catch (_) { return false; }
    })();

    if (invitado) {
      const oscuro = sessionStorage.getItem('guest_modo_oscuro') === 'true';
      html.classList.toggle('modo-oscuro', oscuro);
      html.dataset.theme = oscuro ? 'dark' : 'light';
      html.dataset.rol = 'invitado';
    } else {
      // ADMIN: sessionStorage sobrevive a una recarga. Lo usamos solo como
      // estado de arranque para que index.html ya sepa que la sesión anterior
      // era admin y pinte el último tema conocido sin el destello claro.
      // La fuente de verdad sigue siendo Supabase y autenticacion.js lo valida
      // antes de retirar app-preboot.
      let adminCache = false;
      try { adminCache = sessionStorage.getItem('esAdmin') === 'true'; }
      catch (_) { adminCache = false; }
      if (adminCache) html.dataset.rol = 'admin';

      let oscuro = false;
      try {
        oscuro = adminCache && localStorage.getItem('modo_oscuro') === 'true';
      } catch (_) { oscuro = false; }
      html.classList.toggle('modo-oscuro', oscuro);
      html.dataset.theme = oscuro ? 'dark' : 'light';
    }

    html.classList.add('tema-preboot');
    const liberar = () => html.classList.remove('tema-preboot');
    // En la aplicación la liberación real la hace autenticacion.js cuando el routing
    // y el tema del usuario ya están preparados.
    if (ruta.endsWith('/login.html') || ruta.includes('/iniciarsesion.html')) liberar();
  } catch (_) {
    // El tema claro del CSS es el fallback seguro.
  }
})();
