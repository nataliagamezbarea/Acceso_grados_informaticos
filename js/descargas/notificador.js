window._descargasCanceladas = window._descargasCanceladas || new Set();

function pedirConfirmacionCancelarDescarga(jobId) {
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
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("btn-cancelar-no").addEventListener("click", () => {
    modal.remove();
  });

  document.getElementById("btn-cancelar-solo-esta").addEventListener("click", () => {
    if (jobId) window._descargasCanceladas.add(jobId);
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CANCELAR_DESCARGA", jobId });
    }
    const t = document.getElementById(`toast-descarga-${jobId}`);
    const pctActual = t && t.dataset.pct ? parseInt(t.dataset.pct, 10) : 50;
    try {
      sessionStorage.removeItem(`descarga_activa_${jobId}`);
    } catch (e) {}
    modal.remove();
    mostrarNotificacionDescarga("Descarga cancelada.", pctActual, jobId);
  });

  document.getElementById("btn-cancelar-todas").addEventListener("click", () => {
    window.__cancelarDescarga = true;
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CANCELAR_DESCARGA", jobId: "ALL" });
    }
    try {
      sessionStorage.clear();
      localStorage.removeItem("descarga_activa_live");
    } catch (e) {}
    modal.remove();
    mostrarNotificacionDescarga("Todas las descargas canceladas.", 50, jobId);
  });
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
  const jobId = jobIdParam || "global";
  const cont = obtenerContenedorToasts();
  let toast = document.getElementById(`toast-descarga-${jobId}`);

  if (!toast) {
    toast = document.createElement("div");
    toast.id = `toast-descarga-${jobId}`;
    toast.className = "toast-descarga-card";
    cont.appendChild(toast);
  }

  const p = Math.min(Math.max(porcentaje || 0, 0), 100);
  toast.dataset.pct = p;

  const esCancelado = Boolean(estado && estado.toLowerCase().includes("cancelad"));
  const esCompleto = (p >= 100 || (estado && estado.toLowerCase().includes("completad"))) && !esCancelado;
  const esError = Boolean(estado && estado.toLowerCase().includes("error"));
  
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

  const btnCerrar = toast.querySelector(`#btn-cerrar-toast-${jobId}`);
  if (btnCerrar) {
    btnCerrar.onclick = () => {
      if (esCompleto || esError || esCancelado) {
        toast.remove();
      } else {
        pedirConfirmacionCancelarDescarga(jobId);
      }
    };
  }

  toast.classList.remove("oculto");
  toast.classList.add("activo");

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
          if (val && val.estado && !esFinal && (ahora - val.timestamp < 120000)) {
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
          if (liveVal && liveVal.estado && !esFinalLive && (ahora - liveVal.timestamp < 120000)) {
            items.push(liveVal);
          } else if (esFinalLive) {
            localStorage.removeItem("descarga_activa_live");
          }
        } catch (e) {}
      }
    }

    items.forEach((info) => {
      mostrarNotificacionDescarga(info.estado, info.porcentaje, info.jobId || "global");
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
