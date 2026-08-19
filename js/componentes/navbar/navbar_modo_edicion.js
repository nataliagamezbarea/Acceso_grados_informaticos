function asegurarModoEdicionBoton() {
  const path = window.location.pathname;
  const esPaginaIndex = path.endsWith("/index.html") || path.endsWith("/") || path.endsWith("/GRADOS_INFORMATICOS-LOGIN");
  const esPaginaLogin = /login\.html/.test(path);
  const esPaginaVisor = /visor\.html/.test(path);

  if (esPaginaIndex || esPaginaLogin || esPaginaVisor) return;
  const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
  if (!esAdmin) return;

  const barra = document.getElementById("barra-superior");
  const navRight = barra ? barra.querySelector(".nav-right") : null;
  if (!barra) return;

  let boton = document.getElementById("boton-modo-edicion");
  let modoEdicion = localStorage.getItem("modo_edicion_live") === "true";

  const actualizarTextoBoton = () => {
    boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "✏️" : "📖"}</span><span class="btn-text"> ${modoEdicion ? "EDITAR" : "LECTURA"}</span>`;
    boton.classList.toggle("modo-encendido", modoEdicion);
    boton.title = modoEdicion
      ? "Modo Edición activo (Clic para cambiar a Lectura)"
      : "Modo Lectura activo (Clic para cambiar a Edición)";
  };

  if (!boton) {
    boton = document.createElement("button");
    boton.id = "boton-modo-edicion";
    actualizarTextoBoton();

    boton.addEventListener("click", async () => {
      modoEdicion = !modoEdicion;
      try {
        sessionStorage.setItem("modo_edicion", modoEdicion ? "true" : "false");
        localStorage.setItem("modo_edicion_live", modoEdicion ? "true" : "false");
      } catch (e) {}
      if (window.Permisos) {
        window.Permisos.vistaInvitado = !modoEdicion;
      }
      actualizarTextoBoton();

      if (typeof window.__pintarTodo === "function") window.__pintarTodo();
      if (typeof window.__pintarTrimestre === "function") window.__pintarTrimestre();
      if (typeof window.__pintarClase === "function") window.__pintarClase();
      if (typeof window.__pintarDetalle === "function") window.__pintarDetalle();
      if (window.InformacionGrado && typeof window.InformacionGrado.pintar === "function") {
        window.InformacionGrado.pintar();
      }
    });

    if (navRight) {
      barra.insertBefore(boton, navRight);
    } else {
      barra.appendChild(boton);
    }
  } else {
    actualizarTextoBoton();
  }
}

window.asegurarModoEdicionBoton = asegurarModoEdicionBoton;
