document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-toggle-archivo");
  if (!btn) return;

  const seccion = btn.dataset.seccion;
  const fila = btn.dataset.fila;
  const archivo = btn.dataset.archivo;
  const nuevoEstado = btn.dataset.visible !== "1";

  btn.dataset.visible = nuevoEstado ? "1" : "0";
  btn.innerHTML = nuevoEstado ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
  const icono = btn.querySelector("i");
  if (icono) {
    icono.style.animation = "none";
    void icono.offsetWidth;
    icono.style.animation = "girarOjo 0.3s ease";
  }
  btn.title = nuevoEstado
    ? "Visible para invitados (clic para ocultar este archivo)"
    : "Oculto para invitados (clic para mostrar este archivo)";
  btn.style.borderColor = nuevoEstado ? "rgba(226, 232, 240, 0.9)" : "#fca5a5";
  btn.style.background = nuevoEstado ? "rgba(248, 250, 252, 0.9)" : "#fef2f2";
  btn.style.color = nuevoEstado ? "#64748b" : "#ef4444";

  const itemSpan = btn.closest(".item-archivo");
  if (itemSpan) {
    itemSpan.classList.toggle("archivo-oculto-admin", !nuevoEstado);
  }

  const params = new URLSearchParams(window.location.search);
  const asignatura = params.get("asignatura") || "";
  const trimestreFiltro = params.get("trimestre") || "";

  if (window.Permisos && window.Permisos.guardarVisibilidadArchivo) {
    await window.Permisos.guardarVisibilidadArchivo(asignatura, trimestreFiltro, seccion, fila, archivo, nuevoEstado);
  }
});

function inicializarGestorArchivosModal() {
  console.log("[GestorArchivosModal] Módulo de visibilidad y gestor de archivos cargado.");
}

window.inicializarGestorArchivosModal = inicializarGestorArchivosModal;
