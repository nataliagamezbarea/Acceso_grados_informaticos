/* ============================================================
   MODO EDITAR / LECTURA - controlador único y persistente
   - Fuente de verdad: localStorage.modo_edicion_live
   - Si no existe: LECTURA (false)
   - No depende de sessionStorage para decidir el estado.
   - Reintenta la inicialización después de recargar hasta que la sesión
     y la barra estén montadas.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "modo_edicion_live";
  let listenerInstalado = false;

  function leerEstado() {
    try {
      return localStorage.getItem(KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function guardarEstado(activo) {
    const estado = Boolean(activo);
    try { localStorage.setItem(KEY, estado ? "true" : "false"); } catch (_) {}
    // Mantener la clave antigua solo como compatibilidad, sin usarla como fuente.
    try { sessionStorage.setItem("modo_edicion", estado ? "true" : "false"); } catch (_) {}
    return estado;
  }

  function emitirCambio(activo) {
    const estado = guardarEstado(activo);
    window.dispatchEvent(new CustomEvent("modo-edicion-cambiado", {
      detail: { activo: estado, origen: "boton-modo-edicion" }
    }));
    return estado;
  }

  function esAdmin() {
    try {
      return Boolean(window.Permisos?.esAdmin) ||
        document.documentElement.dataset.rol === "admin" ||
        sessionStorage.getItem("esAdmin") === "true";
    } catch (_) {
      return Boolean(window.Permisos?.esAdmin);
    }
  }

  function esVisor() {
    const path = String(window.location.pathname || "");
    return path.includes("panel-administrador") ||
      path.includes("visores/administrador") ||
      Boolean(document.querySelector("visor-navbar") || document.getElementById("visor-btn-resumen"));
  }

  function renderizar(boton, activo) {
    if (!boton) return;
    const estado = Boolean(activo);
    boton.hidden = false;
    boton.disabled = false;
    boton.removeAttribute("aria-disabled");
    boton.classList.toggle("modo-encendido", estado);
    // estado=true significa que estamos en EDICIÓN, por eso el botón ofrece LECTURA.
    boton.innerHTML = `<span class="btn-icon">${estado ? "✏️" : "📖"}</span><span class="btn-text">${estado ? "LECTURA" : "EDITAR"}</span>`;
    boton.title = estado ? "Cambiar a modo lectura" : "Cambiar a modo edición";
    boton.setAttribute("aria-pressed", estado ? "true" : "false");
    boton.dataset.modoEdicion = estado ? "true" : "false";
  }

  function asegurar() {
    const boton = document.getElementById("boton-modo-edicion");
    if (!boton) return false;
    boton.classList.add("navbar-admin-only");

    // Nunca sobrescribir el valor persistido durante el arranque.
    const admin = esAdmin();
    const popup = document.querySelector("[data-navbar-popup-edit], .popup-admin-edit");
    if (!admin) {
      boton.hidden = true;
      // IMPORTANTE: no tocar popup.hidden aquí. El CSS decide su visibilidad
      // según el rol y el nivel responsive. Si JS lo marca hidden durante el
      // arranque, la regla global [hidden] impide que reaparezca en el popup.
      return false;
    }

    boton.hidden = false;
    renderizar(boton, leerEstado());
    // La copia del popup se mantiene sincronizada con el botón principal.
    // Su posición y visibilidad responsive las controla EXCLUSIVAMENTE CSS.
    if (popup) {
      popup.removeAttribute("hidden");
      popup.removeAttribute("aria-hidden");
      renderizar(popup, leerEstado());
    }
    return true;
  }

  window.ModoEdicionLive = {
    obtener: leerEstado,
    cambiar: (estado) => emitirCambio(estado),
    alternar: () => emitirCambio(!leerEstado()),
    renderizar
  };

  window.asegurarModoEdicionBoton = asegurar;
  window.__modoEdicionRenderizar = renderizar;

  // ÚNICO listener para el botón principal. Delegación = sobrevive a los
  // rerenders del navbar y de las vistas.
  if (!listenerInstalado) {
    listenerInstalado = true;
    document.addEventListener("click", function (ev) {
      const boton = ev.target?.closest?.("#boton-modo-edicion, [data-navbar-popup-edit]");
      if (!boton) return;
      if (!esAdmin()) return;

      ev.preventDefault();
      ev.stopImmediatePropagation();

      const nuevoEstado = !leerEstado();
      emitirCambio(nuevoEstado);
      renderizar(boton, nuevoEstado);
      const popup = document.querySelector("[data-navbar-popup-edit], .popup-admin-edit");
      if (popup && popup !== boton) renderizar(popup, nuevoEstado);
    }, true);
  }

  // Si otro componente cambia el modo, actualizar el botón sin volver a cambiarlo.
  window.addEventListener("modo-edicion-cambiado", function (ev) {
    const boton = document.getElementById("boton-modo-edicion");
    if (!boton || !esAdmin()) return;
    const estado = typeof ev?.detail?.activo === "boolean" ? ev.detail.activo : leerEstado();
    renderizar(boton, estado);
    const popup = document.querySelector("[data-navbar-popup-edit], .popup-admin-edit");
    if (popup && popup !== boton) renderizar(popup, estado);
  });

  // Restauración robusta tras F5: el navbar y Permisos pueden aparecer después.
  function iniciarRestauracion() {
    asegurar();
    let intentos = 0;
    const timer = setInterval(() => {
      intentos++;
      if (asegurar() || intentos >= 50) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarRestauracion, { once: true });
  } else {
    iniciarRestauracion();
  }
  window.addEventListener("navbar-lista", asegurar);
  window.addEventListener("permisos-sesion-cargada", asegurar);
  window.addEventListener("app-vista-cambiada", () => setTimeout(asegurar, 0));
})();
