document.addEventListener("DOMContentLoaded", async () => {
  const select = document.getElementById("selector-rama");
  if (!select) return;

  // Iniciar la descarga de datos de ramas en segundo plano inmediatamente
  const ramaPrevia = window.RamaActual ? window.RamaActual.obtener() : "";
  if (window.InformacionGrado) {
    window.InformacionGrado.cargar(ramaPrevia).catch(() => {});
  }

  if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
    try { await window.Permisos.asegurarSesion(); } catch (e) {}
  }

  await RamaActual.poblarSelector(select);
  const placeholder = select.querySelector('option[value=""]');
  if (placeholder) placeholder.selected = true;
  select.value = "";

  const navegar = () => {
    const rama = select.value;
    if (!rama || rama === "__cargando__") return;
    RamaActual.guardar(rama);
    if (window.Estado) window.Estado.guardar("rama", rama);
    window.location.href = `modulos/clase.html?rama=${encodeURIComponent(rama)}`;
  };

  select.addEventListener("change", navegar);
  select.addEventListener("input", navegar);
});
