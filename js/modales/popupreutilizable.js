/* Popup reutilizable para operaciones de la aplicación.
 * Tipos: progreso, confirmación y acción reversible (deshacer).
 */
(() => {
  const ID = "popup-operacion-global";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"
    }[c]));
  }

  function actualizarPosicion() {
    const cont = document.getElementById("contenedor-toasts-descarga");
    const altura = cont ? Math.ceil(cont.getBoundingClientRect().height || 0) : 0;
    document.documentElement.style.setProperty("--altura-cola-descargas", `${altura}px`);
  }

  function vigilarColaDescargas() {
    actualizarPosicion();
    const cont = document.getElementById("contenedor-toasts-descarga");
    if (!cont || cont.__popupResizeVigilado) return;
    cont.__popupResizeVigilado = true;
    try {
      const ro = new ResizeObserver(() => requestAnimationFrame(actualizarPosicion));
      ro.observe(cont);
    } catch (_) {}
    try {
      const mo = new MutationObserver(() => requestAnimationFrame(actualizarPosicion));
      mo.observe(cont, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    } catch (_) {}
  }

  function root() {
    let el = document.getElementById(ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = ID;
    el.className = "popup-operacion";
    el.hidden = true;
    el.innerHTML = `
      <div class="popup-operacion__panel" role="dialog" aria-modal="true" aria-labelledby="popupOperacionTitulo">
        <div class="popup-operacion__cabecera">
          <div class="popup-operacion__icono" aria-hidden="true"></div>
          <div class="popup-operacion__texto">
            <h2 id="popupOperacionTitulo" class="popup-operacion__titulo"></h2>
            <p class="popup-operacion__mensaje"></p>
          </div>
          <button type="button" class="popup-operacion__cerrar" aria-label="Cerrar">×</button>
        </div>
        <div class="popup-operacion__cuerpo">
          <div class="popup-operacion__progreso" hidden><div></div></div>
          <div class="popup-operacion__contador" hidden></div>
          <div class="popup-operacion__actual" hidden></div>
          <div class="popup-operacion__acciones"></div>
        </div>
      </div>`;
    document.body.appendChild(el);
    vigilarColaDescargas();
    el.querySelector(".popup-operacion__cerrar").addEventListener("click", () => cerrar());
    el.addEventListener("click", e => { if (e.target === el) cerrar(); });
    return el;
  }

  function render(opts = {}) {
    const el = root();
    const panel = el.querySelector(".popup-operacion__panel");
    const icono = el.querySelector(".popup-operacion__icono");
    const titulo = el.querySelector(".popup-operacion__titulo");
    const mensaje = el.querySelector(".popup-operacion__mensaje");
    const progreso = el.querySelector(".popup-operacion__progreso");
    const barra = progreso.querySelector("div");
    const contador = el.querySelector(".popup-operacion__contador");
    const actual = el.querySelector(".popup-operacion__actual");
    const acciones = el.querySelector(".popup-operacion__acciones");
    const cerrarBtn = el.querySelector(".popup-operacion__cerrar");

    panel.dataset.tipo = opts.tipo || "info";
    panel.dataset.estado = opts.estado || "procesando";
    const iconoHtml = opts.iconoHtml || opts.icono || "";
    if (/<[a-z][\s\S]*>/i.test(String(iconoHtml))) icono.innerHTML = String(iconoHtml);
    else if (String(iconoHtml).trim()) icono.textContent = String(iconoHtml).trim();
    else icono.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    titulo.textContent = opts.titulo || "";
    mensaje.textContent = opts.mensaje || "";
    progreso.hidden = opts.tipo !== "progreso";
    contador.hidden = opts.tipo !== "progreso";
    actual.hidden = !opts.actual;
    cerrarBtn.hidden = opts.cerrable === false;
    acciones.innerHTML = "";

    if (opts.tipo === "progreso") {
      const total = Number(opts.total) || 0;
      const hecho = Math.max(0, Number(opts.hecho) || 0);
      const pct = total ? Math.min(100, (hecho / total) * 100) : Math.min(100, Number(opts.porcentaje) || 0);
      barra.style.width = `${pct}%`;
      contador.innerHTML = `<span class="popup-operacion__porcentaje">${Math.round(pct)}%</span>${total ? `<span class="popup-operacion__conteo">${hecho} / ${total}</span>` : ""}`;
      actual.textContent = opts.actual || "";
    }

    (opts.acciones || []).forEach((accion, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `popup-operacion__boton ${accion.clase || ""}`;
      b.textContent = accion.texto || "Aceptar";
      b.addEventListener("click", async () => {
        b.disabled = true;
        try { await accion.onClick?.(); } finally {
          if (accion.cerrar !== false) cerrar(); else b.disabled = false;
        }
      });
      acciones.appendChild(b);
      if (i === 0 && accion.autofocus !== false) setTimeout(() => b.focus(), 0);
    });

    el.hidden = false;
    el.classList.add("visible");
    vigilarColaDescargas();
    requestAnimationFrame(actualizarPosicion);
    return el;
  }

  function cerrar() {
    const el = document.getElementById(ID);
    if (!el) return;
    el.classList.remove("visible");
    el.hidden = true;
  }

  function mostrar(opts) { return render(opts); }
  function progreso(opts = {}) { return render({ ...opts, tipo: "progreso", cerrable: opts.cerrable ?? true }); }
  function actualizarProgreso(opts = {}) {
    return render({ ...opts, tipo: "progreso", cerrable: opts.cerrable ?? true });
  }
  function confirmar(opts = {}) {
    return render({
      ...opts,
      tipo: "confirmacion",
      cerrable: opts.cerrable ?? true,
      acciones: opts.acciones || [
        { texto: "Confirmar", clase: "primario", onClick: opts.onConfirm },
        { texto: "Cancelar", clase: "secundario", onClick: opts.onCancel }
      ]
    });
  }
  function deshacer(opts = {}) {
    return render({
      ...opts,
      tipo: "deshacer",
      cerrable: true,
      acciones: [{ texto: opts.textoAccion || "Deshacer", clase: "primario", onClick: opts.onUndo }]
    });
  }

  function iconoOperacion(tipo) {
    if (tipo === "visible") return '<i class="fa-solid fa-eye"></i>';
    if (tipo === "oculto") return '<i class="fa-solid fa-lock"></i>';
    if (tipo === "subida") return '<i class="fa-solid fa-cloud-arrow-up"></i>';
    if (tipo === "revertir") return '<i class="fa-solid fa-rotate-left"></i>';
    return '<i class="fa-solid fa-cloud-arrow-down"></i>';
  }
  function descarga(opts = {}) { return progreso({ titulo: "Descargas", iconoHtml: iconoOperacion("descarga"), ...opts }); }
  function subida(opts = {}) { return progreso({ titulo: "Subiendo archivos", iconoHtml: iconoOperacion("subida"), ...opts }); }
  function revertir(opts = {}) { return deshacer({ titulo: opts.titulo || "Cambios guardados", iconoHtml: opts.iconoHtml || iconoOperacion("revertir"), ...opts }); }

  window.PopupReutilizable = Object.freeze({
    mostrar, progreso, actualizarProgreso, confirmar, deshacer, descarga, subida, revertir, cerrar
  });

  // Compatibilidad con el popup de descargas antiguo: ahora usa el template común.
  window.mostrarPopupDescargasAcceso = total => progreso({
    titulo: "Descargas",
    mensaje: "Preparando descargas...",
    total: Number(total) || 0,
    hecho: 0,
    cerrable: true,
    iconoHtml: '<i class="fa-solid fa-cloud-arrow-down"></i>',
  });
  window.actualizarPopupDescargasAcceso = (done, total, status, current) => progreso({
    titulo: "Descargas",
    mensaje: status || "Descargando...",
    total: Number(total) || 0,
    hecho: Number(done) || 0,
    actual: current || "",
    cerrable: true,
    iconoHtml: '<i class="fa-solid fa-cloud-arrow-down"></i>',
  });
  window.cerrarPopupDescargasAcceso = ok => {
    render({
      tipo: ok ? "info" : "confirmacion",
      titulo: ok ? "Descarga completada" : "Descarga finalizada",
      mensaje: ok ? "Los archivos están listos." : "La operación ha terminado.",
      iconoHtml: ok ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>', 
      acciones: [{ texto: "Cerrar", clase: "primario", onClick: cerrar }]
    });
    if (ok) setTimeout(cerrar, 1400);
  };
})();
