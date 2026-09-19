async function inicializarVistaClase() {
  const urlRama = new URLSearchParams(window.location.search).get("rama");
  const rama =
  urlRama ||
  (window.Estado ? window.Estado.obtener("rama") : "") ||
  (window.RamaActual ? window.RamaActual.obtener() : "") ||
  (window.AppViews ? window.AppViews.contexto()?.rama : "") ||
  localStorage.getItem("rama_actual") ||
  localStorage.getItem("last_grado") ||
  localStorage.getItem("rama") ||
  localStorage.getItem("app_rama") ||
  sessionStorage.getItem("app_rama") ||
  "";
  if (!rama) {
    const lista = document.getElementById("lista-asignaturas");
    if (lista) { lista.innerHTML = '<p id="sin-rama">Selecciona una rama.</p>'; }
    return;
  }
  if (window.RamaActual?.guardar) window.RamaActual.guardar(rama);
  if (window.Estado?.guardar) window.Estado.guardar("rama", rama);
  const lista = document.getElementById("lista-asignaturas");
  if (lista) { lista.innerHTML = '<p class="cargando"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</p>'; }
  if (window.InformacionGrado && typeof window.InformacionGrado.pintar === "function") {
    await window.InformacionGrado.pintar(rama, "lista-asignaturas");
  } else if (typeof window.__pintarClase === "function") {
    await window.__pintarClase(rama, "lista-asignaturas");
  }
}
window.inicializarVistaClase = inicializarVistaClase;
