window.Ajustes = (() =>  {
  const CLAVE_DESCARGAR_TODAS = "ajustes_descargar_todas_clases";
  const CLAVE_DESCARGAR_ASIGNATURA = "ajustes_descargar_asignatura";
  const CLAVE_DESCARGAR_CURSO = "ajustes_descargar_curso";
  const CLAVE_DESCARGAR_ASIGNATURA_TODOS = "ajustes_descargar_asignatura_todos";
  const CLAVE_VISOR_ACTIVO = "ajustes_visor_activo";
  const CLAVE_VISOR_TAREAS = "ajustes_visor_en_tareas";
  const CLAVE_VISOR_ASIGNATURAS = "ajustes_visor_en_asignaturas";
  const CLAVE_VISOR_TRIMESTRES = "ajustes_visor_en_trimestres";
  const CLAVE_VISOR_GRADOS = "ajustes_visor_en_grados";
  const CLAVE_VISOR_SELECTOR_RAMAS = "ajustes_visor_en_selector_ramas";
  const CLAVE_DESCARGAS_SELECTOR_RAMAS = "ajustes_descargas_en_selector_ramas";
  const leer = (claveServidor, claveLocal, def) =>  {
    if (window.Permisos && typeof window.Permisos.obtenerAjuste === "function") {
      return window.Permisos.obtenerAjuste(claveServidor, def);
    }
    try {
      const v = localStorage.getItem(claveLocal);
      return v === null ? def : v === "true";
    } catch (e) {
      return def;
    }
  }
  ;
  const esInvitadoLocal = () => {
    try { return sessionStorage.getItem("esInvitado") === "true"; }
    catch (_) { return false; }
  };
  const escribir = (clave, valor) =>  {
    try { localStorage.setItem(esInvitadoLocal() ? `guest_${clave}` : clave, valor ? "true" : "false"); }
    catch (e) { } }
  ;
  const obtener = () => ( {
    descargarTodasClases: leer("descargar_todas_clases", CLAVE_DESCARGAR_TODAS, false),
    descargarAsignatura: leer("descargar_asignatura", CLAVE_DESCARGAR_ASIGNATURA, false),
    descargarCurso: leer("descargar_curso", CLAVE_DESCARGAR_CURSO, false),
    descargarAsignaturaTodos: leer("descargar_asignatura_todos", CLAVE_DESCARGAR_ASIGNATURA_TODOS, false),
    visorActivo: leer("visor_activo", CLAVE_VISOR_ACTIVO, true),
    visorEnTareas: leer("visor_en_tareas", CLAVE_VISOR_TAREAS, true),
    visorEnAsignaturas: leer("visor_en_asignaturas", CLAVE_VISOR_ASIGNATURAS, true),
    visorEnTrimestres: leer("visor_en_trimestres", CLAVE_VISOR_TRIMESTRES, true),
    visorEnGrados: leer("visor_en_grados", CLAVE_VISOR_GRADOS, true),
    visorEnSelectorRamas: leer("visor_en_selector_ramas", CLAVE_VISOR_SELECTOR_RAMAS, true),
    descargasEnSelectorRamas: leer("descargas_en_selector_ramas", CLAVE_DESCARGAS_SELECTOR_RAMAS, true),
  }
  );
  const notificarCambio = (tipo = "") =>  {
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
      if (typeof window.__pintarAccionesRamas === "function") { window.__pintarAccionesRamas(); }
      if (typeof window.__pintarVisorAsignatura === "function") { window.__pintarVisorAsignatura(); }
      if (typeof window.__pintarVisorTarea === "function") { window.__pintarVisorTarea(); }
    } catch (e) {
    }
  }
  ;
  const panelToogleHTML = (id, chequed, label, icono = "fa-gear") =>  {
    const esClassroom = icono === "classroom";
    const iconoHTML = esClassroom
    ? '<img class="icono-classroom-ajuste" src="/classroom_icon.png" alt="" aria-hidden="true">'
    : `<i class="fa-solid ${icono}"></i>`;
    return `
<label class="fila-ajuste" for="${id}" title="${label}">
  <span class="icono-ajuste-fila${esClassroom ? ' icono-ajuste-imagen' : ''}">${iconoHTML}</span>
  <span class="texto-ajuste"><strong>${label}</strong></span>
  <span class="switch-clasico">
    <input type="checkbox" id="${id}" ${chequed ? "checked" : ""} />
    <span class="slider-clasico"></span>
  </span>
</label>`;
  }
  ;
  const crearPanel = () =>  {
    let panel = document.getElementById("panel-ajustes");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "panel-ajustes";
      document.body.appendChild(panel);
    }
    const sincronizarPanel = () =>  {
      const cfg = obtener();
      const chkTodas = document.getElementById("ajuste-descargar-todas");
      const chkAsignatura = document.getElementById("ajuste-descargar-asignatura");
      const chkInvitados = document.getElementById("ajuste-invitados-activos");
      const chkCurso = document.getElementById("ajuste-descargar-curso");
      const chkAsignaturaTodos = document.getElementById("ajuste-descargar-asignatura-todos");
      const chkVisor = document.getElementById("ajuste-visor-activo");
      const chkVisorTareas = document.getElementById("ajuste-visor-en-tareas");
      const chkVisorAsignaturas = document.getElementById("ajuste-visor-en-asignaturas");
      const chkVisorTrimestres = document.getElementById("ajuste-visor-en-trimestres");
      const chkVisorGrados = document.getElementById("ajuste-visor-en-grados");
      const chkVisorSelectorRamas = document.getElementById("ajuste-visor-en-selector-ramas");
      const chkDescargasSelectorRamas = document.getElementById("ajuste-descargas-en-selector-ramas");
      if (chkTodas) chkTodas.checked = cfg.descargarTodasClases;
      if (chkAsignatura) chkAsignatura.checked = cfg.descargarAsignatura;
      if (chkCurso) chkCurso.checked = cfg.descargarCurso;
      if (chkAsignaturaTodos) chkAsignaturaTodos.checked = cfg.descargarAsignaturaTodos;
      if (chkVisor) chkVisor.checked = cfg.visorActivo;
      if (chkVisorTareas) chkVisorTareas.checked = cfg.visorEnTareas;
      if (chkVisorAsignaturas) chkVisorAsignaturas.checked = cfg.visorEnAsignaturas;
      if (chkVisorTrimestres) chkVisorTrimestres.checked = cfg.visorEnTrimestres;
      if (chkVisorGrados) chkVisorGrados.checked = cfg.visorEnGrados;
      if (chkVisorSelectorRamas) chkVisorSelectorRamas.checked = cfg.visorEnSelectorRamas;
      if (chkDescargasSelectorRamas) chkDescargasSelectorRamas.checked = cfg.descargasEnSelectorRamas;
      if (chkInvitados) {
        chkInvitados.checked = !(window.Permisos && window.Permisos.invitadosActivos === false);
      }
    }
    ;
    const renderizarContenido = (estaCargando = false) =>  {
      if (estaCargando) { panel.innerHTML = `
<div class="cabecera-ajustes">
  <span><i class="fa-solid fa-gear cabecera-ajustes-icono"></i>Ajustes</span>
  <button type="button" class="btn-cerrar-ajustes" aria-label="Cerrar ajustes"><i class="fa-solid fa-xmark"></i></button>
</div>
<div class="cuerpo-ajustes cuerpo-ajustes-cargando">
  <i class="fa-solid fa-spinner fa-spin spinner-ajustes-cargando"></i>
  <strong class="texto-ajustes-cargando">Cargando ajustes de Supabase...</strong>
</div>`; }
      else {
        panel.innerHTML = `
<div class="cabecera-ajustes">
  <span><i class="fa-solid fa-gear cabecera-ajustes-icono"></i>Ajustes</span>
  <button type="button" class="btn-cerrar-ajustes" aria-label="Cerrar ajustes"><i class="fa-solid fa-xmark"></i></button>
</div>
<div class="cuerpo-ajustes">
  ${window.Permisos?.esAdmin ? panelToogleHTML("ajuste-invitados-activos", !(window.Permisos && window.Permisos.invitadosActivos === false), "Acceso para invitados", "fa-user-lock") : ""}
  <div class="seccion-ajustes-titulo"><i class="fa-solid fa-download seccion-ajustes-icono"></i>Sección de Descargas</div>
  ${panelToogleHTML("ajuste-descargar-curso", leer("descargar_curso", CLAVE_DESCARGAR_CURSO, false), "Curso Completo", "fa-graduation-cap")}
  ${panelToogleHTML("ajuste-descargar-todas", leer("descargar_todas_clases", CLAVE_DESCARGAR_TODAS, false), "Clases del Trimestre", "fa-calendar-days")}
  ${panelToogleHTML("ajuste-descargar-asignatura-todos", leer("descargar_asignatura_todos", CLAVE_DESCARGAR_ASIGNATURA_TODOS, false), "Asignatura (Todos sus Trimestres)", "fa-book-bookmark")}
  ${panelToogleHTML("ajuste-descargar-asignatura", leer("descargar_asignatura", CLAVE_DESCARGAR_ASIGNATURA, false), "Asignatura (Trimestre Actual)", "fa-book-open")}
  ${panelToogleHTML("ajuste-descargas-en-selector-ramas", leer("descargas_en_selector_ramas", CLAVE_DESCARGAS_SELECTOR_RAMAS, true), "Mostrar Descargas en selector de ramas", "fa-download")}
  <div class="seccion-ajustes-titulo"><i class="fa-solid fa-file-pen seccion-ajustes-icono"></i>Visor y gestión de documentos</div>
  ${panelToogleHTML("ajuste-visor-activo", leer("visor_activo", CLAVE_VISOR_ACTIVO, true), "Visor habilitado", "fa-file-pen")}
  ${panelToogleHTML("ajuste-visor-en-tareas", leer("visor_en_tareas", CLAVE_VISOR_TAREAS, true), "Mostrar en tareas", "fa-list-check")}
  ${panelToogleHTML("ajuste-visor-en-asignaturas", leer("visor_en_asignaturas", CLAVE_VISOR_ASIGNATURAS, true), "Mostrar en asignaturas", "fa-book-open")}
  ${panelToogleHTML("ajuste-visor-en-trimestres", leer("visor_en_trimestres", CLAVE_VISOR_TRIMESTRES, true), "Mostrar en trimestres", "fa-calendar-days")}
  ${panelToogleHTML("ajuste-visor-en-grados", leer("visor_en_grados", CLAVE_VISOR_GRADOS, true), "Mostrar en grados", "classroom")}
  ${panelToogleHTML("ajuste-visor-en-selector-ramas", leer("visor_en_selector_ramas", CLAVE_VISOR_SELECTOR_RAMAS, true), "Mostrar Visor Admin en selector de ramas", "fa-file-pen")}
</div>`;
        sincronizarPanel();
      }
    }
    ;
    const sesionListo = Boolean(window.Permisos && window.Permisos.sesionCargada);
    renderizarContenido(!sesionListo);
    const onCambio = (chequed, tipo) =>  {
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
      } else if (tipo === "visor-activo") {
        escribir(CLAVE_VISOR_ACTIVO, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("visor_activo", chequed);
      } else if (tipo === "visor-en-tareas") {
        escribir(CLAVE_VISOR_TAREAS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("visor_en_tareas", chequed);
      } else if (tipo === "visor-en-asignaturas") {
        escribir(CLAVE_VISOR_ASIGNATURAS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("visor_en_asignaturas", chequed);
        notificarCambio();
      } else if (tipo === "visor-en-trimestres") {
        escribir(CLAVE_VISOR_TRIMESTRES, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("visor_en_trimestres", chequed);
      } else if (tipo === "visor-en-grados") {
        escribir(CLAVE_VISOR_GRADOS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("visor_en_grados", chequed);
      } else if (tipo === "visor-en-selector-ramas") {
        escribir(CLAVE_VISOR_SELECTOR_RAMAS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("visor_en_selector_ramas", chequed);
      } else if (tipo === "descargas-en-selector-ramas") {
        escribir(CLAVE_DESCARGAS_SELECTOR_RAMAS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) window.Permisos.guardarConfig("descargas_en_selector_ramas", chequed);
      } else if (tipo === "descargar-asignatura-todos") {
        escribir(CLAVE_DESCARGAR_ASIGNATURA_TODOS, chequed);
        if (window.Permisos && window.Permisos.guardarConfig) {
          window.Permisos.guardarConfig("descargar_asignatura_todos", chequed);
        }
      }
      notificarCambio(tipo);
    }
    ;
    if (!panel.dataset.eventosConfigurados) {
      panel.dataset.eventosConfigurados = "true";
      panel.addEventListener("change", (e) =>  {
        const input = e.target.closest("input[type=checkbox]");
        if (!input) return;
        onCambio(input.checked, input.id.replace("ajuste-", ""));
      }
  );
    }
    panel.sincronizar = () => sincronizarPanel();
    panel.abrir = () => abrirPanel();
    panel.cerrar = () => cerrarPanel();
    panel.toggle = () => togglePanel();
  }
  ;
  const cerrarPanel = () =>  {
    const panel = document.getElementById("panel-ajustes");
    if (!panel) return;
    panel.classList.remove("visible");
    panel.classList.remove("abierto");
    const btn = document.getElementById("boton-ajustes");
    if (btn) btn.classList.remove("abierto", "visible");
    try { sessionStorage.setItem("panel_ajustes_abierto", "false"); }
    catch (e) { } }
  ;
  const abrirPanel = () =>  {
    crearPanel();
    const panel = document.getElementById("panel-ajustes");
    if (!panel) return;
    panel.classList.add("visible");
    panel.classList.add("abierto");
    const btn = document.getElementById("boton-ajustes");
    if (btn) btn.classList.add("abierto", "visible");
    try { sessionStorage.setItem("panel_ajustes_abierto", "true"); }
    catch (e) {
    }
    if (typeof panel.sincronizar === "function") panel.sincronizar();
    if (window.Permisos && typeof window.Permisos.cargarAjustesServidor === "function") {
      window.Permisos.cargarAjustesServidor().then(() =>  {
        if (typeof panel.sincronizar === "function") panel.sincronizar();
      }
      ).catch(() =>  {
      }
  );
    }
  }
  ;
  const togglePanel = () =>  {
    const panel = document.getElementById("panel-ajustes");
    if (panel && (panel.classList.contains("visible") || panel.classList.contains("abierto"))) {
      cerrarPanel();
    } else {
      abrirPanel();
    }
  }
  ;
  document.addEventListener("click", (e) =>  {
    if (!e.target) return;
    const btnCerrar = e.target.closest(".btn-cerrar-ajustes");
    if (btnCerrar) {
      e.preventDefault();
      e.stopPropagation();
      cerrarPanel();
      return;
    }
    const btnAjustes = e.target.closest("#boton-ajustes, .btn-ajustes, [data-action='ajustes'], [data-navbar-action='settings']");
    if (btnAjustes) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
      return;
    }
    const panel = document.getElementById("panel-ajustes");
    if (panel && (panel.classList.contains("visible") || panel.classList.contains("abierto"))) {
      if (!panel.contains(e.target)) { cerrarPanel(); }
    }
  }
  );
  const refrescarTrasCarga = () =>  {
    const panel = document.getElementById("panel-ajustes");
    if (panel) { crearPanel(); }
  }
  ;
  window.addEventListener("sesion-cargada", refrescarTrasCarga);
  window.addEventListener("ajustes-servidor-cargados", refrescarTrasCarga);
  const asegurarBotonAjustes = async () =>  {
    const barra = document.getElementById("barra-superior");
    if (!barra) return;
    let btnAjustes = document.getElementById("boton-ajustes");
    const hostAjustes = btnAjustes?.closest("navbar-boton-ajustes");
    // Por seguridad no mostramos Ajustes mientras todavía no conocemos el rol.
    if (hostAjustes) hostAjustes.hidden = true;
    if (btnAjustes) { btnAjustes.classList.add("oculto"); btnAjustes.hidden = true; }
    if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
      try {
        await window.Permisos.asegurarSesion();
        const esAdminFinal = Boolean(window.Permisos && window.Permisos.esAdmin);
        if (hostAjustes) hostAjustes.hidden = !esAdminFinal;
        if (btnAjustes) {
          btnAjustes.classList.toggle("oculto", !esAdminFinal);
          btnAjustes.hidden = !esAdminFinal;
        }
        window.dispatchEvent(new CustomEvent("navbar-permisos-actualizados"));
      } catch (e) {
        if (hostAjustes) hostAjustes.hidden = true;
        if (btnAjustes) btnAjustes.hidden = true;
      }
    }
  }
  ;
  const inicializar = async () =>  {
    if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
      try { await window.Permisos.asegurarSesion(); }
      catch (e) { } }
    asegurarBotonAjustes();
    const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
    if (esAdmin) {
      try {
        if (sessionStorage.getItem("panel_ajustes_abierto") === "true") { abrirPanel(); }
      } catch (e) {
      }
    }
  }
  ;
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", inicializar); }
  else { inicializar(); }
  return  {
    obtener,
    crearPanel,
    abrirPanel,
    cerrarPanel,
    togglePanel,
    abrir: abrirPanel,
    cerrar: cerrarPanel,
    toggle: togglePanel,
    asegurarBotonAjustes
  }
  ;
}
)();
