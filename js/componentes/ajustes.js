window.Ajustes = (() => {
  const CLAVE_DESCARGAR_TODAS = "ajustes_descargar_todas_clases";
  const CLAVE_DESCARGAR_ASIGNATURA = "ajustes_descargar_asignatura";
  const CLAVE_DESCARGAR_CURSO = "ajustes_descargar_curso";
  const CLAVE_DESCARGAR_ASIGNATURA_TODOS = "ajustes_descargar_asignatura_todos";

  const leer = (claveServidor, claveLocal, def) => {
    if (window.Permisos && typeof window.Permisos.obtenerAjuste === "function") {
      return window.Permisos.obtenerAjuste(claveServidor, def);
    }
    try {
      const v = localStorage.getItem(claveLocal);
      return v === null ? def : v === "true";
    } catch (e) {
      return def;
    }
  };
  const escribir = (clave, valor) => {
    try {
      localStorage.setItem(clave, valor ? "true" : "false");
    } catch (e) {}
  };

  const obtener = () => ({
    descargarTodasClases: leer("descargar_todas_clases", CLAVE_DESCARGAR_TODAS, false),
    descargarAsignatura: leer("descargar_asignatura", CLAVE_DESCARGAR_ASIGNATURA, false),
    descargarCurso: leer("descargar_curso", CLAVE_DESCARGAR_CURSO, false),
    descargarAsignaturaTodos: leer("descargar_asignatura_todos", CLAVE_DESCARGAR_ASIGNATURA_TODOS, false),
  });

  const notificarCambio = (tipo = "") => {
    try {
      if (tipo === "invitados-activos") {
        if (typeof window.__pintarTodo === "function") window.__pintarTodo();
        if (typeof window.__pintarDetalle === "function") window.__pintarDetalle();
      }
      if (typeof window.__pintarTrimestre === "function") window.__pintarTrimestre();
      if (typeof window.__pintarAsignatura === "function") window.__pintarAsignatura();
      if (typeof window.__pintarClase === "function") window.__pintarClase();
      if (window.InformacionGrado && typeof window.InformacionGrado.pintar === "function") {
        window.InformacionGrado.pintar();
      }
    } catch (e) {}
  };

  const panelToogleHTML = (id, chequed, label, icono = "fa-gear") => `
    <label class="fila-ajuste" for="${id}" title="${label}">
      <span class="icono-ajuste-fila"><i class="fa-solid ${icono}"></i></span>
      <span class="texto-ajuste"><strong>${label}</strong></span>
      <span class="switch-clasico">
        <input type="checkbox" id="${id}" ${chequed ? "checked" : ""} />
        <span class="slider-clasico"></span>
      </span>
    </label>`;

  const asegurarEstilos = () => {
    if (typeof document === "undefined" || document.getElementById("link-css-ajustes")) return;
    const enModulos = window.location.pathname.includes("/modulos");
    const link = document.createElement("link");
    link.id = "link-css-ajustes";
    link.rel = "stylesheet";
    link.href = enModulos ? "../css/ajustes.css" : "css/ajustes.css";
    document.head.appendChild(link);
  };

  let panelCreado = false;

  const crearPanel = () => {
    asegurarEstilos();
    if (panelCreado) return;
    panelCreado = true;

    const panel = document.createElement("div");
    panel.id = "panel-ajustes";

    const sincronizarPanel = () => {
      const cfg = obtener();
      const chkTodas = document.getElementById("ajuste-descargar-todas");
      const chkAsignatura = document.getElementById("ajuste-descargar-asignatura");
      const chkInvitados = document.getElementById("ajuste-invitados-activos");
      const chkCurso = document.getElementById("ajuste-descargar-curso");
      const chkAsignaturaTodos = document.getElementById("ajuste-descargar-asignatura-todos");

      if (chkTodas) chkTodas.checked = cfg.descargarTodasClases;
      if (chkAsignatura) chkAsignatura.checked = cfg.descargarAsignatura;
      if (chkCurso) chkCurso.checked = cfg.descargarCurso;
      if (chkAsignaturaTodos) chkAsignaturaTodos.checked = cfg.descargarAsignaturaTodos;
      if (chkInvitados) {
        chkInvitados.checked = !!(window.Permisos && window.Permisos.invitadosActivos !== false);
      }
    };

    const renderizarContenido = (estaCargando = false) => {
      if (estaCargando) {
        panel.innerHTML = `
          <div class="cabecera-ajustes">
            <span><i class="fa-solid fa-gear cabecera-ajustes-icono"></i>Ajustes</span>
            <button type="button" class="btn-cerrar-ajustes" aria-label="Cerrar ajustes"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="cuerpo-ajustes cuerpo-ajustes-cargando">
            <i class="fa-solid fa-spinner fa-spin spinner-ajustes-cargando"></i>
            <strong class="texto-ajustes-cargando">Cargando ajustes de Supabase...</strong>
          </div>`;
      } else {
        panel.innerHTML = `
          <div class="cabecera-ajustes">
            <span><i class="fa-solid fa-gear cabecera-ajustes-icono"></i>Ajustes</span>
            <button type="button" class="btn-cerrar-ajustes" aria-label="Cerrar ajustes"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="cuerpo-ajustes">
            ${panelToogleHTML("ajuste-invitados-activos", !!(window.Permisos && window.Permisos.invitadosActivos !== false), "Acceso para invitados", "fa-user-lock")}
            <div class="seccion-ajustes-titulo"><i class="fa-solid fa-download seccion-ajustes-icono"></i>Sección de Descargas</div>
            ${panelToogleHTML("ajuste-descargar-curso", leer(CLAVE_DESCARGAR_CURSO, false), "Curso Completo", "fa-graduation-cap")}
            ${panelToogleHTML("ajuste-descargar-todas", leer(CLAVE_DESCARGAR_TODAS, false), "Clases del Trimestre", "fa-calendar-days")}
            ${panelToogleHTML("ajuste-descargar-asignatura-todos", leer(CLAVE_DESCARGAR_ASIGNATURA_TODOS, false), "Asignatura (Todos sus Trimestres)", "fa-book-bookmark")}
            ${panelToogleHTML("ajuste-descargar-asignatura", leer(CLAVE_DESCARGAR_ASIGNATURA, false), "Asignatura (Trimestre Actual)", "fa-book-open")}
          </div>`;
        sincronizarPanel();
      }
    };

    const sesionListo = Boolean(window.Permisos && window.Permisos.sesionCargada);
    renderizarContenido(!sesionListo);

    document.body.appendChild(panel);

    const onCambio = (chequed, tipo) => {
      if (tipo === "invitados-activos") {
        if (window.Permisos && window.Permisos.setInvitadosActivos) {
          window.Permisos.setInvitadosActivos(chequed);
        }
      } else if (tipo === "descargar-todas") {
        escribir(CLAVE_DESCARGAR_TODAS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) {
          window.Permisos.guardarConfig("descargar_todas_clases", chequed);
        }
      } else if (tipo === "descargar-curso") {
        escribir(CLAVE_DESCARGAR_CURSO, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) {
          window.Permisos.guardarConfig("descargar_curso", chequed);
        }
      } else if (tipo === "descargar-asignatura") {
        escribir(CLAVE_DESCARGAR_ASIGNATURA, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) {
          window.Permisos.guardarConfig("descargar_asignatura", chequed);
        }
      } else if (tipo === "descargar-asignatura-todos") {
        escribir(CLAVE_DESCARGAR_ASIGNATURA_TODOS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) {
          window.Permisos.guardarConfig("descargar_asignatura_todos", chequed);
        }
      }
      notificarCambio(tipo);
    };

    panel.addEventListener("change", (e) => {
      const input = e.target.closest("input[type=checkbox]");
      if (!input) return;
      onCambio(input.checked, input.id.replace("ajuste-", ""));
    });

    panel.addEventListener("click", (e) => {
      if (e.target.closest(".btn-cerrar-ajustes")) {
        e.preventDefault();
        e.stopPropagation();
        cerrarPanel();
      }
    });

    const cerrarPanel = () => {
      panel.classList.remove("visible");
      panel.classList.remove("abierto");
      try { sessionStorage.setItem("panel_ajustes_abierto", "false"); } catch (e) {}
    };

    const abrirPanel = () => {
      // Cerrar menú hamburguesa si está abierto
      const overlayHM = document.getElementById("overlay-hamburguesa");
      const menuHM = document.getElementById("menu-hamburguesa-desplegable");
      const btnHM = document.getElementById("btn-hamburguesa");
      if (overlayHM) overlayHM.classList.remove("activo");
      if (menuHM) menuHM.classList.remove("activo");
      if (btnHM) {
        btnHM.classList.remove("activo");
        btnHM.innerHTML = '<i class="fa-solid fa-bars icono-hamburguesa"></i>';
      }

      const listo = Boolean(window.Permisos && window.Permisos.sesionCargada);
      if (!panel.querySelector(".cuerpo-ajustes") || panel.querySelector(".fa-spinner")) {
        renderizarContenido(!listo);
      } else {
        sincronizarPanel();
      }
      panel.classList.add("visible");
      panel.classList.add("abierto");
      try { sessionStorage.setItem("panel_ajustes_abierto", "true"); } catch (e) {}
    };

    const togglePanel = () => {
      if (panel.classList.contains("visible") || panel.classList.contains("abierto")) {
        cerrarPanel();
      } else {
        abrirPanel();
      }
    };

    document.addEventListener("click", (e) => {
      if (!e.target || !e.target.isConnected) return;
      const btnAjustes = document.getElementById("boton-ajustes");
      const btnHmAjustes = document.getElementById("hm-btn-ajustes");
      if (
        (panel.classList.contains("visible") || panel.classList.contains("abierto")) &&
        !panel.contains(e.target) &&
        (!btnAjustes || !btnAjustes.contains(e.target)) &&
        (!btnHmAjustes || !btnHmAjustes.contains(e.target))
      ) {
        cerrarPanel();
      }
    });

    panel.sincronizar = () => sincronizarPanel();
    panel.abrir = abrirPanel;
    panel.cerrar = cerrarPanel;
    panel.toggle = togglePanel;
  };

  const asegurarBotonAjustes = async () => {
    const barra = document.getElementById("barra-superior");
    if (!barra) return;

    let navRight = barra.querySelector(".nav-right");
    if (!navRight) {
      navRight = document.createElement("div");
      navRight.className = "nav-right";
      barra.appendChild(navRight);
    }

    let btnAjustes = document.getElementById("boton-ajustes");

    if (!btnAjustes) {
      btnAjustes = document.createElement("button");
      btnAjustes.id = "boton-ajustes";
      btnAjustes.className = "btn-ajustes";
      btnAjustes.title = "Ajustes";
      btnAjustes.innerHTML = '<i class="fa-solid fa-gear"></i>';
      const btnCerrar = document.getElementById("btn-cerrar-sesion");
      if (btnCerrar) {
        navRight.insertBefore(btnAjustes, btnCerrar);
      } else {
        navRight.appendChild(btnAjustes);
      }
    } else if (btnAjustes.parentElement !== navRight) {
      const btnCerrar = document.getElementById("btn-cerrar-sesion");
      if (btnCerrar) {
        navRight.insertBefore(btnAjustes, btnCerrar);
      } else {
        navRight.appendChild(btnAjustes);
      }
    }

    btnAjustes.classList.remove("oculto");

    if (!btnAjustes.dataset.listener) {
      btnAjustes.dataset.listener = "true";
      btnAjustes.addEventListener("click", (e) => {
        e.stopPropagation();
        crearPanel();
        const p = document.getElementById("panel-ajustes");
        if (p && typeof p.toggle === "function") {
          p.toggle();
        }
      });
    }

    if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
      try {
        await window.Permisos.asegurarSesion();
        const esAdminFinal = Boolean(window.Permisos && window.Permisos.esAdmin);
        if (btnAjustes) {
          btnAjustes.classList.toggle("oculto", !esAdminFinal);
        }
        const p = document.getElementById("panel-ajustes");
        if (p && typeof p.sincronizar === "function") {
          p.sincronizar();
        }
      } catch (e) {}
    }
  };

  const inicializar = async () => {
    if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
      try { await window.Permisos.asegurarSesion(); } catch (e) {}
    }
    asegurarBotonAjustes();

    const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
    if (esAdmin) {
      try {
        if (sessionStorage.getItem("panel_ajustes_abierto") === "true") {
          crearPanel();
          const p = document.getElementById("panel-ajustes");
          if (p && typeof p.abrir === "function") {
            p.abrir();
          }
        }
      } catch (e) {}
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }

  return {
    obtener,
    crearPanel,
    asegurarBotonAjustes,
  };
})();
