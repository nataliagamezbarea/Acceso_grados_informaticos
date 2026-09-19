/* Template real de permiso-switch */
(function () {
  "use strict";

  const TEMPLATE = "componentes/accesofp/comunes/permisos/permiso-switch.html";
  const seen = new WeakSet();

  async function montar(root = document) {
    const nodes = [];
    if (root.matches?.('[data-component="permiso-switch"]')) nodes.push(root);
    root.querySelectorAll?.('[data-component="permiso-switch"]').forEach(n => nodes.push(n));

    if (!nodes.length) {
      // Compatibilidad: si una vista todavía genera el label directamente,
      // lo dejamos como componente y seguimos usando su input real.
      root.querySelectorAll?.('.permiso-switch').forEach(conectar);
      return;
    }

    let html;
    try {
      const r = await fetch(TEMPLATE, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      html = await r.text();
    } catch (e) {
      console.error("[PERMISO-SWITCH] No se pudo cargar el template:", e);
      return;
    }

    for (const placeholder of nodes) {
      if (!placeholder.isConnected) continue;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html.trim();
      const el = wrapper.firstElementChild;
      if (!el) continue;

      const contexto = {
        asignatura: placeholder.getAttribute("data-asignatura") || "",
        trimestre: placeholder.getAttribute("data-trimestre") || "",
        seccion: placeholder.getAttribute("data-seccion") || "apuntes",
        nombre: placeholder.getAttribute("data-nombre") || ""
      };

      for (const name of ["data-asignatura","data-trimestre","data-seccion","data-nombre","data-archivo","data-checked"]) {
        if (placeholder.hasAttribute(name)) el.setAttribute(name, placeholder.getAttribute(name));
      }

      if (placeholder.dataset.checked === "true") {
        el.querySelector("[data-permiso-input]").checked = true;
      }

      placeholder.replaceWith(el);
      conectar(el);
    }
  }

  const CLAVE_PENDIENTES = "permisos_switches_pendientes";

  function obtenerPendientes() {
    try {
      const raw = localStorage.getItem(CLAVE_PENDIENTES) || sessionStorage.getItem(CLAVE_PENDIENTES);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function guardarPendiente(clave, datos) {
    try {
      const pendientes = obtenerPendientes();
      if (datos) pendientes[clave] = datos;
      else delete pendientes[clave];
      const str = JSON.stringify(pendientes);
      localStorage.setItem(CLAVE_PENDIENTES, str);
      sessionStorage.setItem(CLAVE_PENDIENTES, str);
    } catch (_) {}
  }

  function limpiarPendiente(clave) {
    guardarPendiente(clave, null);
  }

  function conectar(label) {
    if (seen.has(label)) return;
    seen.add(label);

    const input = label.querySelector("input[data-permiso-input], input[type=checkbox]");
    if (!input) return;

    const getDatos = () => {
      const asignatura = label.dataset.asignatura || window.Estado?.obtener?.("asignatura") || "";
      const trimestre = label.dataset.trimestre || window.Estado?.obtener?.("trimestre") || "";
      const seccion = label.dataset.seccion || "apuntes";
      const nombre = (label.dataset.nombre || label.dataset.archivo || "").trim();
      const clave = `${asignatura}|${trimestre}|${seccion}|${nombre}`.toLowerCase();
      return { asignatura, trimestre, seccion, nombre, clave };
    };

    const aplicarEstadoVisual = (visible, cargando) => {
      label.classList.toggle("is-loading", !!cargando);
      label.classList.toggle("permiso-switch-oculto", !visible);
      label.classList.toggle("permiso-switch-publico", !!visible);
      input.checked = !!visible;
      input.disabled = !!cargando;
      const spanTexto = label.querySelector(".permiso-switch-texto") || label.querySelector("span:not(.permiso-switch-check-wrapper)");
      if (spanTexto) {
        if (cargando) {
          spanTexto.innerHTML = visible
            ? '<i class="fa-solid fa-eye permiso-switch-estado-icono" aria-hidden="true"></i> Publicando...'
            : '<i class="fa-solid fa-lock permiso-switch-estado-icono" aria-hidden="true"></i> Ocultando...';
        } else {
          spanTexto.innerHTML = visible
            ? '<i class="fa-solid fa-eye permiso-switch-estado-icono" aria-hidden="true"></i> Invitado lo ve'
            : '<i class="fa-solid fa-lock permiso-switch-estado-icono" aria-hidden="true"></i> Oculto a invitados';
        }
      }
    };

    const mostrarPopupVisibilidad = (visible, datos) => {
      if (!window.PopupReutilizable?.progreso) return;
      window.PopupReutilizable.progreso({
        titulo: visible ? "Publicando para invitados" : "Ocultando a invitados",
        mensaje: visible
          ? `Se está haciendo público ${datos.nombre || "el contenido"}.`
          : `Se está retirando ${datos.nombre || "el contenido"} del acceso de invitados.`,
        iconoHtml: visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-lock"></i>',
        porcentaje: 0,
        actual: visible ? "Preparando publicación..." : "Preparando retirada...",
        cerrable: false
      });
    };

    const actualizarPopupVisibilidad = (visible, datos, res) => {
      if (!window.PopupReutilizable?.progreso) return;
      const error = !!res?.error;
      window.PopupReutilizable.progreso({
        titulo: error
          ? "No se pudo cambiar la visibilidad"
          : (visible ? "Contenido visible para invitados" : "Contenido oculto a invitados"),
        mensaje: error
          ? String(res.error)
          : (visible ? "El contenido ya está disponible para invitados." : "El contenido ya no está disponible para invitados."),
        iconoHtml: error ? '<i class="fa-solid fa-circle-exclamation"></i>' : (visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-lock"></i>'),
        estado: error ? "error" : "completado",
        porcentaje: 100,
        actual: error ? "La operación no se completó." : "Operación completada.",
        cerrable: true,
        acciones: [{ texto: "Cerrar", clase: error ? "secundario" : "primario", onClick: () => window.PopupReutilizable.cerrar() }]
      });
      if (!error) setTimeout(() => window.PopupReutilizable?.cerrar?.(), 1600);
    };

    // Si había una operación pendiente al recargar la página, restaurar el estado 'cargando'
    const datosIniciales = getDatos();
    const pendientes = obtenerPendientes();
    if (datosIniciales.clave && pendientes[datosIniciales.clave]) {
      const pendiente = pendientes[datosIniciales.clave];
      aplicarEstadoVisual(pendiente.visible, true);
      // Reanudar la sincronización en background si aún no ha finalizado
      const fn = window.Visibilidad?.guardarVisibilidad;
      if (typeof fn === "function") {
        fn(pendiente.asignatura, pendiente.trimestre, pendiente.seccion, pendiente.nombre, pendiente.visible)
          .then((res) => {
            limpiarPendiente(datosIniciales.clave);
            aplicarEstadoVisual(res?.error ? !pendiente.visible : pendiente.visible, false);
          })
          .catch(() => {
            limpiarPendiente(datosIniciales.clave);
            aplicarEstadoVisual(!pendiente.visible, false);
          });
      }
    }

    input.addEventListener("change", async () => {
      const visible = !!input.checked;
      const { asignatura, trimestre, seccion, nombre, clave } = getDatos();

      // Feedback visual inmediato + popup global reutilizable mientras dura la operación.
      aplicarEstadoVisual(visible, true);
      mostrarPopupVisibilidad(visible, { asignatura, trimestre, seccion, nombre });
      guardarPendiente(clave, { asignatura, trimestre, seccion, nombre, visible, timestamp: Date.now() });

      console.log("[PERMISO-SWITCH]", visible ? "PRIVADO -> PÚBLICO" : "PÚBLICO -> PRIVADO", {
        asignatura,
        trimestre,
        seccion,
        nombre
      });

      try {
        const fn = window.Visibilidad?.guardarVisibilidad;
        if (typeof fn !== "function") throw new Error("Visibilidad.guardarVisibilidad no disponible");

        const progresoIntermedio = setTimeout(() => {
          if (window.PopupReutilizable?.progreso) window.PopupReutilizable.progreso({
            titulo: visible ? "Publicando para invitados" : "Ocultando a invitados",
            mensaje: visible ? `Se está haciendo público ${nombre || "el contenido"}.` : `Se está retirando ${nombre || "el contenido"} del acceso de invitados.`,
            iconoHtml: visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-lock"></i>',
            porcentaje: 55,
            actual: visible ? "Sincronizando permisos..." : "Actualizando permisos...",
            cerrable: false
          });
        }, 350);
        const res = await fn(asignatura, trimestre, seccion, nombre, visible);
        clearTimeout(progresoIntermedio);
        limpiarPendiente(clave);
        actualizarPopupVisibilidad(visible, { asignatura, trimestre, seccion, nombre }, res);
        if (res?.error) {
          aplicarEstadoVisual(!visible, false);
          console.error("[PERMISO-SWITCH] ERROR ❌", res.error, res);
        } else {
          aplicarEstadoVisual(visible, false);
          console.log(
            visible
              ? "[PERMISO-SWITCH] MOVIDO AL PÚBLICO ✅"
              : "[PERMISO-SWITCH] DEVUELTO AL PRIVADO ✅",
            res
          );
        }
      } catch (e) {
        limpiarPendiente(clave);
        const error = { error: e?.message || String(e) };
        actualizarPopupVisibilidad(visible, { asignatura, trimestre, seccion, nombre }, error);
        aplicarEstadoVisual(!visible, false);
        console.error("[PERMISO-SWITCH] ERROR ❌", e);
      }
    });
  }

  window.montarComponentesPermiso = montar;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void montar());
  } else {
    void montar();
  }

  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) void montar(node);
      }
    }
  }).observe(document.documentElement, {childList:true, subtree:true});
})();
