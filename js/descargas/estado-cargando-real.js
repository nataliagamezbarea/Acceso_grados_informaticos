/* Estado de "cargando": solo se muestra mientras existe una descarga activa.
   Si el trabajo ya terminó, el spinner no se restaura tras recargar. */
(function () {
  "use strict";
  const KEYS = [
    "descarga_activa",
    "descargaEnCurso",
    "estado_descarga",
    "descarga_cargando"
  ];

  function activo(v) {
    if (!v) return false;
    try {
      const x = typeof v === "string" ? JSON.parse(v) : v;
      const estado = String(x?.estado || x?.status || "").toLowerCase();
      return x === true ||
        x?.activa === true ||
        x?.cargando === true ||
        ["pending","queued","processing","downloading","active","cargando","en_curso"].includes(estado);
    } catch (_) {
      return v === "true";
    }
  }

  function limpiarEstadosTerminados() {
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v && !activo(v)) localStorage.removeItem(k);
    }
  }

  function restaurarSoloSiActiva() {
    limpiarEstadosTerminados();
    const hayActiva = KEYS.some(k => activo(localStorage.getItem(k)));
    if (!hayActiva) return;

    // Notificador/cola del proyecto puede encargarse del popup.
    // Solo restauramos el indicador del botón si su API existe.
    try {
      if (typeof window.restaurarEstadoCargando === "function") {
        window.restaurarEstadoCargando();
      }
    } catch (_) {}
  }

  window.addEventListener("DOMContentLoaded", restaurarSoloSiActiva);
  window.addEventListener("load", restaurarSoloSiActiva);

  // Al terminar/cancelar/error, eliminar estados de carga conocidos.
  for (const ev of ["descarga-completada","descarga-cancelada","descarga-error"]) {
    window.addEventListener(ev, () => {
      for (const k of KEYS) localStorage.removeItem(k);
      try {
        if (ev === "descarga-cancelada" || ev === "descarga-completada" || ev === "descarga-error") {
          localStorage.removeItem("descarga_activa_live");
        }
      } catch (_) {}
    });
  }
})();
