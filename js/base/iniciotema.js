(function() {
  function aplicarTemaDOM(oscuro) {
    try {
      const activo = Boolean(oscuro);
      document.documentElement.classList.toggle('modo-oscuro', activo);
      if (document.body) document.body.classList.toggle('modo-oscuro', activo);
      document.documentElement.dataset.theme = activo ? 'dark' : 'light';
      if (document.body) document.body.dataset.theme = activo ? 'dark' : 'light';
      const frame = document.getElementById('visor-admin-spa-frame');
      if (frame?.contentDocument) {
        frame.contentDocument.documentElement.classList.toggle('modo-oscuro', activo);
        if (frame.contentDocument.body) frame.contentDocument.body.classList.toggle('modo-oscuro', activo);
        frame.contentDocument.documentElement.dataset.theme = activo ? 'dark' : 'light';
        if (frame.contentDocument.body) frame.contentDocument.body.dataset.theme = activo ? 'dark' : 'light';
      }
    } catch (e) {
    }
  }
  function obtenerTemaActivo() {
    try {
      return document.documentElement.classList.contains('modo-oscuro') ||
      (document.body && document.body.classList.contains('modo-oscuro'));
    } catch (e) {
      return false;
    }
  }
  function esInvitadoLocal() {
    try { return sessionStorage.getItem('esInvitado') === 'true'; }
    catch (e) { return false; }
  }
  function claveTemaLocal() { return esInvitadoLocal() ? 'guest_modo_oscuro' : 'modo_oscuro'; }
  function esVistaLogin() {
    try {
      const ruta = String(window.location.pathname || '').toLowerCase();
      return ruta.endsWith('/login.html') || ruta.includes('/iniciarsesion.html') || window.__APP_VISTA === 'login';
    } catch (e) { return false; }
  }
  function leerTemaGuardado() {
    try {
      // El login siempre es claro.
      if (esVistaLogin()) return false;

      // Invitado: usa exclusivamente su preferencia de sesión (predeterminado light).
      // Si cerró sesión, no persiste nada y arranca siempre en light.
      if (esInvitadoLocal()) {
        return sessionStorage.getItem('guest_modo_oscuro') === 'true';
      }

      // Admin autenticado o sesión admin conocida:
      // Conservar la preferencia del admin (modo_oscuro). El invitado nunca entra aquí.
      try {
        if (sessionStorage.getItem('esAdmin') === 'true') {
          return localStorage.getItem('modo_oscuro') === 'true';
        }
      } catch (_) {}

      // Sin sesión activa (login o visitante): light por defecto.
      return false;
    } catch (e) {
      return false;
    }
  }
  function actualizarIconosTema() {
    const oscuro = obtenerTemaActivo();
    const icono = oscuro ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    const titulo = oscuro ? 'Modo Claro' : 'Modo Oscuro';
    document.querySelectorAll('#btn-modo-oscuro, .btn-modo-oscuro').forEach(btn => {
      const iconoActual = btn.querySelector(':scope > i');
      if (iconoActual) {
        const clases = icono.match(/class="([^"]+)"/)?.[1];
        if (clases) iconoActual.className = clases;
        iconoActual.setAttribute('aria-hidden', 'true');
      } else {
        btn.insertAdjacentHTML('afterbegin', icono);
      }

      // Asegurar que exista una única etiqueta de texto sin duplicados
      const etiquetas = btn.querySelectorAll(':scope > .nav-label, :scope > .navbar-popup-action-text');
      let etiqueta = etiquetas[0];
      for (let i = 1; i < etiquetas.length; i++) {
        etiquetas[i].remove();
      }
      if (!etiqueta) {
        etiqueta = document.createElement('span');
        etiqueta.className = 'nav-label';
        btn.appendChild(etiqueta);
      }
      etiqueta.textContent = oscuro ? 'Modo Claro' : 'Modo oscuro';
      btn.title = titulo;
      btn.setAttribute('aria-label', titulo);
    });
  }
  function vincularBotonesTema() {
    // El listener de click del tema vive en barranavegacion.js.
    // Aquí solo sincronizamos iconos para evitar alternar dos veces.
    actualizarIconosTema();
  }
  function guardarTema(oscuro) {
    try {
      if (esInvitadoLocal()) {
        sessionStorage.setItem('guest_modo_oscuro', String(Boolean(oscuro)));
        try { localStorage.removeItem('guest_modo_oscuro'); } catch (_) {}
      } else {
        localStorage.setItem('modo_oscuro', String(Boolean(oscuro)));
      }
    } catch (e) {
    }
    aplicarTemaDOM(oscuro);
    actualizarIconosTema();
    window.dispatchEvent(new CustomEvent('modo-oscuro-cambiado',  {
      detail:  { activo: Boolean(oscuro) }
    }
    ));
  }
  // Aplica el tema (modo claro/oscuro) lo antes posible y sincroniza cambios entre pestañas.
  try {
    const apply = () =>  {
      aplicarTemaDOM(leerTemaGuardado());
      actualizarIconosTema();
    }
    ;
    apply();
    // Escuchar cambios desde otras pestañas
    window.addEventListener('storage', (e) =>  {
      if (e.key === 'guest_modo_oscuro' || (e.key === 'modo_oscuro' && !esVistaLogin() && !esInvitadoLocal())) apply();
    }
  );
    document.addEventListener('DOMContentLoaded', () =>  {
      actualizarIconosTema();
      vincularBotonesTema();
    }
  );
    window.addEventListener('app-vista-cambiada', () => setTimeout(() =>  {
      actualizarIconosTema();
      vincularBotonesTema();
    }
    , 0));
    window.addEventListener('navbar-lista', () =>  {
      actualizarIconosTema();
      vincularBotonesTema();
    }
  );
    window.__temaOscuroActivo = () => obtenerTemaActivo();
    window.__guardarTemaOscuro = guardarTema;
    window.__aplicarTemaDOM = aplicarTemaDOM;
    window.__actualizarIconosTema = actualizarIconosTema;
    window.__vincularBotonesTema = vincularBotonesTema;
    // Exponer atajo para alternar desde consola o código externo
    window.__alternarModoOscuro = () =>  {
      try {
        const nuevo = !obtenerTemaActivo();
        guardarTema(nuevo);
        return nuevo;
      } catch (e) {
        return false;
      }
    }
    ;
  } catch (e) {
  }
}
)();
