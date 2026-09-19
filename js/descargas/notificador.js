window._descargasCanceladas = window._descargasCanceladas || new Set();
// Un AbortController por trabajo (lo rellena compresorzip.js). Es la fuente de
// verdad de "qué descargas están en marcha" y permite abortar el fetch en curso.
window.__controladoresDescarga = window.__controladoresDescarga || new Map();

/* Cancela UN trabajo: lo marca como cancelado (los bucles de descarga lo
   consultan entre archivo y archivo) y aborta el fetch que tenga en vuelo. */
function cancelarTrabajoEnCola(jobId) {
  if (!jobId) return;
  window._descargasCanceladas.add(jobId);
  const controlador = window.__controladoresDescarga.get(jobId);
  if (controlador) { try { controlador.abort(); } catch (_) {} }
}

/* Ids de TODAS las descargas que siguen activas: ZIP en curso, PDFs en curso,
   toasts visibles sin terminar y estados persistidos en sessionStorage. */
function obtenerJobIdsDescargasActivas() {
  const ids = new Set();
  try { window.__controladoresDescarga.forEach((_, id) => ids.add(id)); } catch (_) {}
  try { if (window.__descargasPDFActivas) window.__descargasPDFActivas.forEach((_, id) => ids.add(id)); } catch (_) {}
  try {
    document.querySelectorAll(".toast-descarga-card").forEach(t => {
      if (t.dataset.final === "1") return;
      const id = String(t.id || "").replace(/^toast-descarga-/, "");
      if (id) ids.add(id);
    });
  } catch (_) {}
  try {
    const prefijo = "descarga_activa_";
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefijo)) ids.add(k.slice(prefijo.length));
    }
  } catch (_) {}
  return ids;
}

/* Cancela todas las descargas activas AHORA. No usa un booleano global: cada
   trabajo se marca por su id, así una descarga nueva posterior no se ve afectada. */
function cancelarTodasLasDescargasEnCola() {
  const ids = obtenerJobIdsDescargasActivas();
  ids.forEach(cancelarTrabajoEnCola);
  return Array.from(ids);
}

window.cancelarTrabajoEnCola = cancelarTrabajoEnCola;
window.obtenerJobIdsDescargasActivas = obtenerJobIdsDescargasActivas;
window.cancelarTodasLasDescargasEnCola = cancelarTodasLasDescargasEnCola;


function obtenerTemaRealNotificador() {
  try {
    // La fuente de verdad del tema de la aplicación es la misma que usa
    // iniciotema.js: guest_modo_oscuro para invitado y modo_oscuro para admin.
    const esInvitado = sessionStorage.getItem("esInvitado") === "true";
    const clave = esInvitado ? "guest_modo_oscuro" : "modo_oscuro";
    const guardado = esInvitado ? sessionStorage.getItem(clave) : localStorage.getItem(clave);
    if (guardado === "true") return true;
    if (guardado === "false") return false;

    // Si aún no existe preferencia guardada, respeta el estado explícito del DOM.
    const root = document.documentElement;
    if (root.dataset.theme === "light") return false;
    if (root.dataset.theme === "dark") return true;
    if (root.classList.contains("modo-oscuro")) return true;
    if (document.body && document.body.dataset.theme === "light") return false;
    if (document.body && document.body.dataset.theme === "dark") return true;
    if (document.body && document.body.classList.contains("modo-oscuro")) return true;

    // Sin preferencia ni marca explícita: claro por defecto.
    return false;
  } catch (_) {
    return false;
  }
}

function aplicarTemaNotificador() {
  try {
    const oscuro = obtenerTemaRealNotificador();
    const root = document.documentElement;
    const body = document.body;
    const elementos = [];
    const cont = document.getElementById("contenedor-toasts-descarga");
    if (cont) elementos.push(cont);
    document.querySelectorAll(".toast-descarga-card, .modal-overlay-cancelar, .modal-card-cancelar").forEach(el => elementos.push(el));
    elementos.forEach(el => {
      el.classList.toggle("tema-dark", oscuro);
      el.classList.toggle("tema-light", !oscuro);
      el.dataset.theme = oscuro ? "dark" : "light";
    });
    if (root && root.dataset.theme !== (oscuro ? "dark" : "light")) root.dataset.theme = oscuro ? "dark" : "light";
    if (body && body.dataset.theme !== (oscuro ? "dark" : "light")) body.dataset.theme = oscuro ? "dark" : "light";
  } catch (e) {}
}

function pedirConfirmacionCancelarDescarga(jobId) {
  if (window.PopupReutilizable?.confirmar) {
    window.PopupReutilizable.confirmar({
      titulo: "¿Cancelar descarga?",
      mensaje: "Puedes cancelar solo esta descarga o todas las descargas activas.",
      icono: "⚠️",
      acciones: [
        {
          texto: "Cancelar solo esta",
          clase: "primario",
          onClick: () => cancelarDescargaDesdePopup(jobId, false)
        },
        {
          texto: "Cancelar todas",
          clase: "secundario",
          onClick: () => cancelarDescargaDesdePopup(jobId, true)
        },
        {
          texto: "Seguir descargando",
          clase: "secundario",
          onClick: () => {},
          cerrar: true
        }
      ]
    });
    return;
  }

  // Fallback por si el módulo común todavía no se ha cargado.
  const modalExistente = document.getElementById("modal-cancelar-descarga-confirmacion");
  if (modalExistente) modalExistente.remove();
  const modal = document.createElement("div");
  modal.id = "modal-cancelar-descarga-confirmacion";
  modal.className = "modal-overlay-cancelar";
  modal.innerHTML = `
    <div class="modal-card-cancelar">
      <div class="icono-warning">⚠️</div>
      <h3>¿Cancelar descarga?</h3>
      <p>Selecciona si deseas cancelar solo esta descarga o todas las descargas activas.</p>
      <div class="acciones-cancelar">
        <button id="btn-cancelar-solo-esta" type="button" class="btn-cancelar-solo">Cancelar solo esta descarga</button>
        <button id="btn-cancelar-todas" type="button" class="btn-cancelar-todas">Cancelar TODAS las descargas</button>
        <button id="btn-cancelar-no" type="button" class="btn-cancelar-no">No, seguir descargando</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  aplicarTemaNotificador();
  document.getElementById("btn-cancelar-no").onclick = () => modal.remove();
  document.getElementById("btn-cancelar-solo-esta").onclick = () => { modal.remove(); cancelarDescargaDesdePopup(jobId, false); };
  document.getElementById("btn-cancelar-todas").onclick = () => { modal.remove(); cancelarDescargaDesdePopup(jobId, true); };
}

function cancelarDescargaDesdePopup(jobId, todas) {
  if (!todas) {
    if (jobId) cancelarTrabajoEnCola(jobId);
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CANCELAR_DESCARGA", jobId });
    }
    const t = document.getElementById(`toast-descarga-${jobId}`);
    const pctActual = t && t.dataset.pct ? parseInt(t.dataset.pct, 10) : 50;
    try { sessionStorage.removeItem(`descarga_activa_${jobId}`); } catch (e) {}
    window.dispatchEvent(new CustomEvent("descarga-cancelada", { detail: { jobId, todas: false } }));
    mostrarNotificacionDescarga("Descarga cancelada.", pctActual, jobId);
    return;
  }

  // Cancelación por trabajo: nunca usamos un booleano global que pueda
  // quedarse activo y cancelar accidentalmente la siguiente descarga.
  // (Antes se llamaba a una función que no existía y el trabajo del propio
  // popup ni siquiera se marcaba como cancelado: por eso no hacía nada.)
  const idsCancelados = cancelarTodasLasDescargasEnCola();
  if (jobId) cancelarTrabajoEnCola(jobId);
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CANCELAR_DESCARGA", jobId: "ALL" });
  }
  try {
    // Limpiar SOLO los estados de descargas; no borrar la sesión de la aplicación.
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("descarga_activa_")) sessionStorage.removeItem(key);
    }
    localStorage.removeItem("descarga_activa_live");
  } catch (e) {}
  window.dispatchEvent(new CustomEvent("descarga-cancelada", { detail: { jobId, todas: true, jobIds: idsCancelados } }));
  // Cada descarga que tenga toast pasa a "cancelada" al instante; el resto de
  // trabajos se detienen solos en cuanto miran su marca / se aborta su fetch.
  idsCancelados.forEach(id => {
    if (id === jobId) return;
    const t = document.getElementById(`toast-descarga-${id}`);
    if (!t) return;
    const pct = t.dataset.pct ? parseInt(t.dataset.pct, 10) : 50;
    mostrarNotificacionDescarga("Descarga cancelada.", pct, id);
  });
  const tPropio = jobId ? document.getElementById(`toast-descarga-${jobId}`) : null;
  const pctPropio = tPropio && tPropio.dataset.pct ? parseInt(tPropio.dataset.pct, 10) : 50;
  mostrarNotificacionDescarga("Todas las descargas canceladas.", pctPropio, jobId);
}

function obtenerContenedorToasts() {
  let cont = document.getElementById("contenedor-toasts-descarga");
  if (!cont) {
    cont = document.createElement("div");
    cont.id = "contenedor-toasts-descarga";
    document.body.appendChild(cont);
  }
  return cont;
}

function mostrarNotificacionDescarga(estado, porcentaje, jobIdParam) {
  if (window.location.pathname.includes("visor.html") || (document.body && document.body.dataset.vista === "visor")) {
    return;
  }
  const jobId = jobIdParam || `descarga-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cont = obtenerContenedorToasts();
  let toast = document.getElementById(`toast-descarga-${jobId}`);

  if (!toast) {
    toast = document.createElement("div");
    toast.id = `toast-descarga-${jobId}`;
    toast.className = "toast-descarga-card";
    cont.appendChild(toast);
  }

  aplicarTemaNotificador();

  const p = Math.min(Math.max(porcentaje || 0, 0), 100);
  toast.dataset.pct = p;

  const esCancelado = Boolean(estado && estado.toLowerCase().includes("cancelad"));
  const esCompleto = (p >= 100 || (estado && estado.toLowerCase().includes("completad"))) && !esCancelado;
  const esError = Boolean(estado && estado.toLowerCase().includes("error"));
  toast.dataset.final = (esCancelado || esCompleto || esError) ? "1" : "0";
  
  let icono = '<i class="fa-solid fa-cloud-arrow-down fa-bounce icono-descarga-progreso"></i>';
  let barraClase = "barra-azul";

  if (esCancelado) {
    icono = '<i class="fa-solid fa-ban icono-descarga-cancelada"></i>';
    barraClase = "barra-roja";
  } else if (esCompleto) {
    icono = '<i class="fa-solid fa-circle-check icono-descarga-completada"></i>';
    barraClase = "barra-verde";
  } else if (esError) {
    icono = '<i class="fa-solid fa-circle-exclamation icono-descarga-error"></i>';
    barraClase = "barra-roja";
  }

  let estadoEtiqueta = `<span class="tag-estado procesando"><i class="fa-solid fa-spinner fa-spin"></i> Procesando descarga...</span>`;
  if (esCancelado) {
    estadoEtiqueta = `<span class="tag-estado cancelado"><i class="fa-solid fa-circle-xmark"></i> Descarga cancelada</span>`;
  } else if (esCompleto) {
    estadoEtiqueta = `<span class="tag-estado completado"><i class="fa-solid fa-circle-check"></i> Descarga finalizada</span>`;
  } else if (esError) {
    estadoEtiqueta = `<span class="tag-estado error"><i class="fa-solid fa-triangle-exclamation"></i> Error al descargar</span>`;
  }

  const estadoLimpio = estado ? estado.replace(/\s*\(\d+%\)/g, "") : "";

  toast.innerHTML = `
    <div class="toast-descarga-header">
      <div class="toast-descarga-icono">${icono}</div>
      <div class="toast-descarga-info-principal">
        <span class="toast-descarga-texto" title="${estadoLimpio}">${estadoLimpio}</span>
        <div class="toast-descarga-subinfo">${estadoEtiqueta}</div>
      </div>
      <span class="toast-descarga-porcentaje">${p}%</span>
      <button id="btn-cerrar-toast-${jobId}" type="button" class="toast-descarga-cerrar" title="Cancelar">×</button>
    </div>
    <div class="toast-descarga-barra-fondo">
      <div class="toast-descarga-barra-progreso ${barraClase}" style="width:${p}%;"></div>
    </div>
  `;
  aplicarTemaNotificador();

  const btnCerrar = document.getElementById(`btn-cerrar-toast-${jobId}`);
  if (btnCerrar) {
    btnCerrar.onclick = () => {
      if (esCompleto || esError || esCancelado) {
        toast.remove();
      } else {
        pedirConfirmacionCancelarDescarga(jobId);
      }
    };
  }

  // El popup se hace visible en el mismo ciclo en el que se solicita la descarga.
  toast.classList.remove("oculto", "salida-rapida");
  toast.classList.add("activo");
  // Forzar un reflow pequeño estabiliza la aparición cuando hay varias descargas.
  void toast.offsetWidth;

  try {
    if (esCancelado || esCompleto || esError) {
      sessionStorage.removeItem(`descarga_activa_${jobId}`);
      localStorage.removeItem("descarga_activa_live");
    } else {
      const info = { jobId, estado, porcentaje: p, timestamp: Date.now() };
      sessionStorage.setItem(`descarga_activa_${jobId}`, JSON.stringify(info));
      localStorage.setItem("descarga_activa_live", JSON.stringify(info));
    }
  } catch (e) {}

  if (esCompleto || esError || esCancelado) {
    const tiempoEspera = esCancelado ? 1200 : (esCompleto ? 2000 : 3000);
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.remove("activo");
        toast.classList.add("salida-rapida");
        toast.classList.add("oculto");
        setTimeout(() => {
          if (toast && toast.parentElement) toast.remove();
        }, 250);
      }
    }, tiempoEspera);
  }
}

function restaurarToastsActivos() {
  try {
    const ahora = Date.now();
    const items = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("descarga_activa_")) {
        try {
          const val = JSON.parse(sessionStorage.getItem(key));
          const est = (val && val.estado) ? val.estado.toLowerCase() : "";
          const esFinal = est.includes("cancelad") || est.includes("completad") || est.includes("error") || (val && val.porcentaje >= 100);
          if (val && val.estado && !esFinal && true) {
            items.push(val);
          } else if (esFinal) {
            sessionStorage.removeItem(key);
          }
        } catch (e) {}
      }
    }

    if (items.length === 0) {
      const liveRaw = localStorage.getItem("descarga_activa_live");
      if (liveRaw) {
        try {
          const liveVal = JSON.parse(liveRaw);
          const estLive = (liveVal && liveVal.estado) ? liveVal.estado.toLowerCase() : "";
          const esFinalLive = estLive.includes("cancelad") || estLive.includes("completad") || estLive.includes("error") || (liveVal && liveVal.porcentaje >= 100);
          if (liveVal && liveVal.estado && !esFinalLive && true) {
            items.push(liveVal);
          } else if (esFinalLive) {
            localStorage.removeItem("descarga_activa_live");
          }
        } catch (e) {}
      }
    }

    items.forEach((info) => {
      if (info.jobId) mostrarNotificacionDescarga(info.estado, info.porcentaje, info.jobId);
    });
  } catch (e) {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", restaurarToastsActivos);
} else {
  restaurarToastsActivos();
}

window.obtenerContenedorToasts = obtenerContenedorToasts;
window.mostrarNotificacionDescarga = mostrarNotificacionDescarga;
window.pedirConfirmacionCancelarDescarga = pedirConfirmacionCancelarDescarga;
window.restaurarToastsActivos = restaurarToastsActivos;
window.aplicarTemaNotificador = aplicarTemaNotificador;

window.addEventListener("modo-oscuro-cambiado", aplicarTemaNotificador);
window.addEventListener("storage", (e) => {
  if (e.key === "modo_oscuro" || e.key === "guest_modo_oscuro") aplicarTemaNotificador();
});
window.addEventListener("app-vista-cambiada", () => setTimeout(aplicarTemaNotificador, 0));

// El tema puede cambiar después de crear el popup. Observamos el DOM para que
// el popup se adapte inmediatamente, sin necesidad de cerrarlo y abrirlo.
try {
  const obsTema = new MutationObserver(() => aplicarTemaNotificador());
  obsTema.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
  if (document.body) obsTema.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
} catch (_) {}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", aplicarTemaNotificador);
} else {
  aplicarTemaNotificador();
}
