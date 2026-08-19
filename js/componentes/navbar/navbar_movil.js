function inicializarNavbarMovil(opciones) {
  const opts = opciones || {};
  const barra = document.getElementById("barra-superior");
  if (!barra) return;

  let btnHamburguesa = document.getElementById("btn-hamburguesa");
  if (!btnHamburguesa) {
    btnHamburguesa = document.createElement("button");
    btnHamburguesa.id = "btn-hamburguesa";
    btnHamburguesa.className = "btn-hamburguesa";
    btnHamburguesa.title = "Menú";
    btnHamburguesa.setAttribute("aria-label", "Menú de navegación");
    btnHamburguesa.innerHTML = '<i class="fa-solid fa-bars"></i>';
    barra.appendChild(btnHamburguesa);
  }

  let overlay = document.getElementById("overlay-hamburguesa");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "overlay-hamburguesa";
    document.body.appendChild(overlay);
  }

  let menuMovil = document.getElementById("menu-hamburguesa-desplegable");
  if (!menuMovil) {
    menuMovil = document.createElement("nav");
    menuMovil.id = "menu-hamburguesa-desplegable";
    menuMovil.setAttribute("aria-label", "Menú móvil");
    document.body.appendChild(menuMovil);
  }

  const sincronizarMenuHamburguesa = () => {
    const path = window.location.pathname;
    const esPaginaIndex = path.endsWith("/index.html") || path.endsWith("/") || path.endsWith("/GRADOS_INFORMATICOS-LOGIN");
    const enModulos = path.includes("/modulos");
    const rutaInicio = enModulos ? "../index.html" : "index.html";

    const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
    const modoEdicion = localStorage.getItem("modo_edicion_live") === "true";
    const esOscuro = document.body.classList.contains("modo-oscuro");

    let itemsHTML = "";

    if (!esPaginaIndex) {
      itemsHTML += `
        <a href="${rutaInicio}" class="hm-item" id="hm-btn-inicio">
          <span class="hm-icon"><i class="fa-solid fa-house"></i></span>
          <span class="hm-text">Inicio</span>
        </a>
        <button type="button" class="hm-item" id="hm-btn-volver">
          <span class="hm-icon"><i class="fa-solid fa-arrow-left"></i></span>
          <span class="hm-text">Volver Atrás</span>
        </button>
      `;
    }

    if (esAdmin) {
      itemsHTML += `
        <button type="button" class="hm-item hm-item-modo ${modoEdicion ? "modo-encendido" : ""}" id="hm-btn-modo-edicion">
          <span class="hm-icon">${modoEdicion ? "✏️" : "📖"}</span>
          <span class="hm-text">Modo ${modoEdicion ? "Edición" : "Lectura"}</span>
          <span class="hm-badge">${modoEdicion ? "ON" : "OFF"}</span>
        </button>
      `;
    }

    itemsHTML += `
      <button type="button" class="hm-item" id="hm-btn-modo-oscuro">
        <span class="hm-icon">${esOscuro ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>'}</span>
        <span class="hm-text">${esOscuro ? "Modo Claro" : "Modo Oscuro"}</span>
      </button>
    `;

    if (esAdmin) {
      itemsHTML += `
        <button type="button" class="hm-item" id="hm-btn-ajustes">
          <span class="hm-icon"><i class="fa-solid fa-gear"></i></span>
          <span class="hm-text">Ajustes</span>
        </button>
      `;
    }

    itemsHTML += `
      <button type="button" class="hm-item hm-item-peligro" id="hm-btn-cerrar-sesion">
        <span class="hm-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
        <span class="hm-text">Cerrar Sesión</span>
      </button>
    `;

    menuMovil.innerHTML = itemsHTML;

    const hmVolver = document.getElementById("hm-btn-volver");
    if (hmVolver && typeof opts.ejecutarVolverAtras === "function") {
      hmVolver.addEventListener("click", (e) => {
        cerrarMenu();
        opts.ejecutarVolverAtras(e);
      });
    }

    const hmModo = document.getElementById("hm-btn-modo-edicion");
    if (hmModo) {
      hmModo.addEventListener("click", () => {
        const btnOriginal = document.getElementById("boton-modo-edicion");
        if (btnOriginal) {
          btnOriginal.click();
        } else {
          const actual = localStorage.getItem("modo_edicion_live") === "true";
          const nuevo = !actual;
          localStorage.setItem("modo_edicion_live", nuevo ? "true" : "false");
          sessionStorage.setItem("modo_edicion", nuevo ? "true" : "false");
          if (window.Permisos && window.Permisos.setVistaInvitado) {
            window.Permisos.setVistaInvitado(nuevo);
          }
        }
        setTimeout(sincronizarMenuHamburguesa, 50);
      });
    }

    const hmOscuro = document.getElementById("hm-btn-modo-oscuro");
    if (hmOscuro && typeof opts.alternarModoOscuro === "function") {
      hmOscuro.addEventListener("click", () => {
        opts.alternarModoOscuro();
        sincronizarMenuHamburguesa();
      });
    }

    const hmAjustes = document.getElementById("hm-btn-ajustes");
    if (hmAjustes) {
      hmAjustes.addEventListener("click", (e) => {
        e.stopPropagation();
        cerrarMenu();
        const btnAjustesOriginal = document.getElementById("boton-ajustes");
        if (btnAjustesOriginal) {
          btnAjustesOriginal.click();
        } else {
          const panel = document.getElementById("panel-ajustes");
          if (panel && typeof panel.abrir === "function") {
            panel.abrir();
          } else if (panel) {
            panel.classList.add("visible", "abierto");
          }
        }
      });
    }

    const hmCerrar = document.getElementById("hm-btn-cerrar-sesion");
    if (hmCerrar && typeof opts.ejecutarCerrarSesion === "function") {
      hmCerrar.addEventListener("click", async (e) => {
        e.preventDefault();
        cerrarMenu();
        await opts.ejecutarCerrarSesion();
      });
    }
  };

  const abrirMenu = () => {
    const panelAjustes = document.getElementById("panel-ajustes");
    if (panelAjustes && typeof panelAjustes.cerrar === "function") {
      panelAjustes.cerrar();
    } else if (panelAjustes) {
      panelAjustes.classList.remove("visible", "abierto");
    }

    sincronizarMenuHamburguesa();
    btnHamburguesa.classList.add("activo");
    btnHamburguesa.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    overlay.classList.add("activo");
    menuMovil.classList.add("activo");
  };

  const cerrarMenu = () => {
    btnHamburguesa.classList.remove("activo");
    btnHamburguesa.innerHTML = '<i class="fa-solid fa-bars"></i>';
    overlay.classList.remove("activo");
    menuMovil.classList.remove("activo");
  };

  const alternarMenu = () => {
    if (menuMovil.classList.contains("activo")) {
      cerrarMenu();
    } else {
      abrirMenu();
    }
  };

  if (!btnHamburguesa.dataset.listener) {
    btnHamburguesa.dataset.listener = "true";
    btnHamburguesa.addEventListener("click", (e) => {
      e.stopPropagation();
      alternarMenu();
    });
  }

  overlay.addEventListener("click", cerrarMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuMovil.classList.contains("activo")) {
      cerrarMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 500 && menuMovil.classList.contains("activo")) {
      cerrarMenu();
    }
  });

  return { sincronizarMenuHamburguesa, abrirMenu, cerrarMenu };
}

window.inicializarNavbarMovil = inicializarNavbarMovil;
