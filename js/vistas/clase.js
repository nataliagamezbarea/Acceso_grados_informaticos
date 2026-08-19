document.addEventListener("DOMContentLoaded", async () => {
  const urlRama = new URLSearchParams(window.location.search).get("rama");
  const rama = urlRama || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");
  if (urlRama) {
    if (window.RamaActual) window.RamaActual.guardar(urlRama);
    if (window.Estado) window.Estado.guardar("rama", urlRama);
  }
  if (window.InformacionGrado) {
    await window.InformacionGrado.pintar(rama);
  }
});
