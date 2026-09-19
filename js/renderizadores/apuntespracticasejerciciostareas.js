const normalizarTrimestre = (v) => window.Trimestres
  ? window.Trimestres.normalizar(v)
  : (v || "").replace(/[ºª]/g, "").replace(/\btrimestres?\b/gi, "").trim().toLowerCase();

let modoEdicion = localStorage.getItem("modo_edicion_live") === "true";
const CLAVE_MODO_EDICION = "modo_edicion_activo";

window.inicializarVistaApuntes = async function() {
  const contextoActual = (window.AppViews && typeof window.AppViews.contexto === "function") ? (window.AppViews.contexto() || {}) : {};
  const urlParams = new URLSearchParams(location.search);
  let tempObj = null;
  try {
    const temp = sessionStorage.getItem("detalle_temp");
    if (temp) tempObj = JSON.parse(temp);
  } catch (e) {}

  const nombre = (contextoActual.nombre || urlParams.get("nombre") || tempObj?.NOMBRE || (window.Estado ? window.Estado.obtener("nombre") : "") || "").trim();
  const asignatura = (contextoActual.asignatura || urlParams.get("asignatura") || tempObj?.ASIGNATURA || (window.Estado ? window.Estado.obtener("asignatura") : "") || "").trim();
  const rama = contextoActual.rama || urlParams.get("rama") || tempObj?.RAMA || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");
  const trimestreFiltro = normalizarTrimestre(contextoActual.trimestre || urlParams.get("trimestre") || tempObj?.TRIMESTRE || (window.Estado ? window.Estado.obtener("trimestre") : "") || "");
  const seccionDetalle = (contextoActual.seccion || urlParams.get("seccion") || tempObj?._seccion || tempObj?.seccion || tempObj?.SECCION || "apuntes").toLowerCase();

  if (nombre && window.Estado) window.Estado.guardar("nombre", nombre);
  if (asignatura && window.Estado) window.Estado.guardar("asignatura", asignatura);
  if (rama) {
    if (window.Estado) window.Estado.guardar("rama", rama);
    if (window.RamaActual) window.RamaActual.guardar(rama);
  }

  const contenidoDiv = document.getElementById("contenido");

  if (!nombre || !asignatura) {
    if (contenidoDiv) {
      contenidoDiv.innerHTML = `
        <div class="detalle-apunte" style="text-align: center; padding: 32px 20px;">
          <p style="font-size: 16px; margin: 0 0 16px 0; color: inherit;">ℹ️ No se especificó ningún apunte o tarea para visualizar.</p>
          <button type="button" class="navbar-boton" id="btn-volver-vacio" style="display: inline-flex; width: auto; padding: 8px 18px; border-radius: 8px; cursor: pointer; gap: 8px;" onclick="window.AppViews?.atras ? window.AppViews.atras() : (location.href='/')">
            <i class="fa-solid fa-arrow-left"></i><span>Volver atrás</span>
          </button>
        </div>`;
    }
    window.__detalleCargaPromise = Promise.resolve();
    return window.__detalleCargaPromise;
  }

  // Mostrar el estado de cargando mientras se obtienen los datos
  if (contenidoDiv) {
    contenidoDiv.innerHTML = '<p class="cargando" role="status" aria-live="polite">Cargando información del tema...</p>';
  }

  window.__detalleCargaPromise = (async () => {
    let nombreAsignatura = asignatura;
    let codigoAsignatura = asignatura;
    try {
      const textoInfo = await Permisos.leerCsv("informacion.json", rama);
      if (textoInfo) {
        const datosInfo = JSON.parse(textoInfo.trim().replace(/^\uFEFF/, ""));
        const found = (datosInfo.asignaturas || []).find((a) =>
          String(a.codigo).toLowerCase() === asignatura.toLowerCase() ||
          String(a.nombre).toLowerCase() === asignatura.toLowerCase()
        );
        if (found) {
          nombreAsignatura = found.nombre;
          codigoAsignatura = found.codigo;
        }
      }
    } catch (e) {
      /* sigue */
    }

    const coincideAsig = (val) => {
      if (!val) return true;
      const v = String(val).trim().toLowerCase();
      const asigUrl = String(asignatura).trim().toLowerCase();
      const asigNom = String(nombreAsignatura || "").trim().toLowerCase();
      const asigCod = String(codigoAsignatura || "").trim().toLowerCase();
      return (v === asigUrl || v === asigNom || v === asigCod || asigUrl.includes(v) || v.includes(asigUrl) || asigNom.includes(v) || v.includes(asigNom));
    };

    const CLAVE_CACHE_LOCAL = `cache_detalle_${rama}_${asignatura}_${nombre}`;
    let resultados = [];
    let usandoCacheInstantanea = false;

    try {
      const temp = sessionStorage.getItem("detalle_temp");
      if (temp) {
        const itemObj = JSON.parse(temp);
        if (itemObj && (itemObj.NOMBRE || "").trim().toLowerCase() === nombre.toLowerCase()) {
          resultados = [itemObj];
          usandoCacheInstantanea = true;
        }
      }
    } catch (e) {}

    if (!usandoCacheInstantanea) {
      try {
        const cached = localStorage.getItem(CLAVE_CACHE_LOCAL);
        if (cached) {
          resultados = JSON.parse(cached);
          usandoCacheInstantanea = true;
        }
      } catch (e) {}
    }

    let grupos = {};
    const agruparResultados = (resList) => {
      const g = {};
      resList.forEach((f) => {
        const nomNorm = (f.NOMBRE || "").trim().toLowerCase();
        if (!nomNorm) return;
        if (!g[nomNorm]) {
          g[nomNorm] = {
            ...f,
            TRIMESTRE: (f.TRIMESTRE || "").trim(),
            PROFESOR: (f.PROFESOR || "").trim(),
            ARCHIVO: []
          };
        } else {
          if (!g[nomNorm].TRIMESTRE && (f.TRIMESTRE || "").trim()) {
            g[nomNorm].TRIMESTRE = (f.TRIMESTRE || "").trim();
          }
          if (!g[nomNorm].PROFESOR && (f.PROFESOR || "").trim()) {
            g[nomNorm].PROFESOR = (f.PROFESOR || "").trim();
          }
        }
        if (Array.isArray(f.ARCHIVO)) {
          g[nomNorm].ARCHIVO = Array.from(new Set(g[nomNorm].ARCHIVO.concat(f.ARCHIVO).filter(Boolean)));
        } else if (f.ARCHIVO) {
          const arr = String(f.ARCHIVO).split(/[,;]/).map((u) => u.trim()).filter(Boolean);
          g[nomNorm].ARCHIVO = Array.from(new Set(g[nomNorm].ARCHIVO.concat(arr)));
        }
      });
      return g;
    };

    if (resultados.length > 0) {
      grupos = agruparResultados(resultados);
    }

    const cargarDesdeServidor = async () => {
      const archivos = ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"];
      let nuevosResultados = [];
      for (const archivo of archivos) {
        let texto = null;
        try {
          texto = await Permisos.leerCsv(archivo, rama);
        } catch (e) {}
        if (texto) {
          const res = Papa.parse(texto, {
            header: true,
            skipEmptyLines: true,
            delimiter: ",",
            quotes: true,
          });
          const filas = res.data.filter((f) =>
            (f.NOMBRE || "").trim().toLowerCase() === nombre.toLowerCase() &&
            coincideAsig(f.ASIGNATURA)
          );
          nuevosResultados = nuevosResultados.concat(filas);
        }
      }
      if (nuevosResultados.length > 0) {
        resultados = nuevosResultados;
        grupos = agruparResultados(resultados);
        try {
          localStorage.setItem(CLAVE_CACHE_LOCAL, JSON.stringify(resultados));
        } catch (e) {}
      }
    };

    const pintarDetalles = async () => {
      if (window.Permisos && window.Permisos.cargoSesion) {
        await window.Permisos.cargoSesion();
      }
      const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
      if (esAdmin) {
        let boton = document.getElementById("boton-modo-edicion");
        if (!boton) {
          boton = document.createElement("button");
          boton.id = "boton-modo-edicion";
          const actualizarBoton = () => {
            boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "📖" : "✏️"}</span><span class="btn-text"> ${modoEdicion ? "LECTURA" : "EDITAR"}</span>`;
            boton.classList.toggle("modo-encendido", modoEdicion);
            boton.title = modoEdicion ? "Cambiar a modo lectura" : "Cambiar a modo edición";
          };
          actualizarBoton();
          const actualizarModoDetalleInSitu = (activo) => {
            modoEdicion = activo;
            actualizarBoton();
            document.querySelectorAll(".caja-permiso-invitado").forEach((el) => {
              el.style.display = activo ? "block" : "none";
            });
            document.querySelectorAll(".permiso-switch").forEach((el) => {
              el.style.display = activo ? "inline-flex" : "none";
            });
            document.querySelectorAll(".btn-toggle-archivo").forEach((el) => {
              el.style.display = activo ? "inline-flex" : "none";
            });
            document.querySelectorAll(".detalle-apunte[data-visible-invitado]").forEach((card) => {
              const esVisible = card.dataset.visibleInvitado === "true";
              if (!esVisible) {
                card.style.display = activo ? "" : "none";
                if (activo) card.classList.add("tema-oculto-invitado");
                else card.classList.remove("tema-oculto-invitado");
              }
            });
          };
          window.__actualizarModoDetalleInSitu = actualizarModoDetalleInSitu;
          const barra = document.getElementById("barra-superior");
          const navRight = document.querySelector("#barra-superior .nav-right");
          if (barra && navRight) { barra.insertBefore(boton, navRight); }
          else if (barra) { barra.appendChild(boton); }
          else {
            const ref = document.getElementById("volver-atras") || document.body;
            if (ref) ref.after(boton);
          }
        } else {
          boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "📖" : "✏️"}</span><span class="btn-text"> ${modoEdicion ? "LECTURA" : "EDITAR"}</span>`;
          boton.classList.toggle("modo-encendido", modoEdicion);
        }
      }

      if (window.Permisos && window.Permisos.cargarArchivos) {
        await window.Permisos.cargarArchivos(asignatura, trimestreFiltro);
      }

      const camposPermitidos = ["NOMBRE", "ASIGNATURA", "TRIMESTRE", "ARCHIVO"];
      const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado);
      if (esAdmin && !esVistaInvitado) camposPermitidos.push("PROFESOR");

      let html = "";
      let contadorVisibles = 0;

      Object.values(grupos).forEach((fila) => {
        const nomFila = (fila.NOMBRE || nombre).trim();
        if (!esAdmin && window.Permisos && window.Permisos.esVisibleParaInvitado && !window.Permisos.esVisibleParaInvitado(seccionDetalle, nomFila)) {
          return;
        }
        contadorVisibles++;
        const visibleGeneral = Permisos.esVisibleParaInvitado ? Permisos.esVisibleParaInvitado(seccionDetalle, nomFila) : true;
        const esOcultoInvitado = esAdmin && modoEdicion && !visibleGeneral;
        const claseCard = esOcultoInvitado ? "detalle-apunte tema-oculto-invitado" : "detalle-apunte";
        html += `<div class="${claseCard}">`;
        for (let clave of camposPermitidos) {
          let valor = fila[clave] || "";
          if (clave === "ASIGNATURA") { valor = nombreAsignatura || fila.ASIGNATURA || valor; }
          if (clave !== "ARCHIVO") {
            valor = String(valor).replace(/\s+/g, " ").trim();
          }
          if (clave === "ARCHIVO" && fila.ARCHIVO.length > 0) {
            valor = window.renderizarArchivosHTML
              ? window.renderizarArchivosHTML(fila.ARCHIVO, {
                  seccion: seccionDetalle,
                  nombreFila: nomFila,
                  modoEdicion: esAdmin && modoEdicion,
                  esAdmin: esAdmin,
                  profesor: fila.PROFESOR,
                  mostrarVisorArchivo: true,
                  tipoVista: "tarea",
                  rama,
                  asignatura,
                  trimestre: trimestreFiltro,
                })
              : fila.ARCHIVO.join("<br>");
          }
          html += `\n<div class="campo"> <span class="clave">${clave}:</span> <span class="valor">${valor}</span> </div>`;
        }
        if (esAdmin && modoEdicion) {
          const claseCaja = !visibleGeneral ? "caja-permiso-invitado caja-permiso-invitado-oculto" : "caja-permiso-invitado";
          html += `\n<div class="${claseCaja}"> <span data-component="permiso-switch" data-seccion="${seccionDetalle}" data-nombre="${nomFila}" data-asignatura="${String(asignatura || "").replace(/"/g, "&quot;")}" data-trimestre="${String(trimestreFiltro || "").replace(/"/g, "&quot;")}" data-checked="${visibleGeneral ? "true" : "false"}"></span> </div>`;
        }
        html += "</div>";
      });

      if (!contadorVisibles && html === "") {
        const hayFilas = Object.keys(grupos).length > 0;
        if (!esAdmin && hayFilas) {
          html = `\n<div class="aviso-material-protegido"> <strong class="texto-material-protegido">Hay material disponible, pero está protegido.</strong><br> El contenido de este apunte no se muestra por seguridad y respeto a los derechos de autor. Si necesitas acceso, contacta con la profesora.\n</div>`;
        } else {
          html = `
            <div class="detalle-apunte" style="text-align: center; padding: 32px 20px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: inherit;">📚 El tema solicitado no tiene material asociado en este momento.</p>
              <button type="button" class="navbar-boton" style="display: inline-flex; width: auto; padding: 8px 18px; border-radius: 8px; cursor: pointer; gap: 8px;" onclick="window.AppViews?.atras ? window.AppViews.atras() : (location.href='/')">
                <i class="fa-solid fa-arrow-left"></i><span>Volver a la asignatura</span>
              </button>
            </div>`;
        }
      }
      if (contenidoDiv) contenidoDiv.innerHTML = html;
    };

    window.__pintarDetalle = pintarDetalles;

    try {
      const inicioCarga = performance.now();
      await cargarDesdeServidor();
      await pintarDetalles();
      const transcurrido = performance.now() - inicioCarga;
      const minimoVisible = 220;
      if (transcurrido < minimoVisible) {
        await new Promise(resolve => setTimeout(resolve, minimoVisible - transcurrido));
      }
    } catch (error) {
      console.error("[DETALLE] Error cargando la vista:", error);
      if (contenidoDiv) {
        contenidoDiv.innerHTML = `
          <div class="detalle-apunte" style="text-align: center; padding: 32px 20px;">
            <p style="font-size: 16px; margin: 0 0 16px 0; color: #ef4444;">⚠️ No se pudo cargar el material del tema.</p>
            <button type="button" class="navbar-boton" style="display: inline-flex; width: auto; padding: 8px 18px; border-radius: 8px; cursor: pointer; gap: 8px;" onclick="window.inicializarVistaApuntes?.()">
              <i class="fa-solid fa-rotate-right"></i><span>Reintentar</span>
            </button>
          </div>`;
      }
    }
  })();

  return window.__detalleCargaPromise;
};

// Ejecución inicial automática al cargar el script por primera vez
try { window.inicializarVistaApuntes(); } catch (_) {}
const aplicarModoEdicionEnVivo = async (activo) => {
  modoEdicion = Boolean(activo);
  try { sessionStorage.setItem(CLAVE_MODO_EDICION, modoEdicion ? "true" : "false"); }
  catch (e) {}
  const boton = document.getElementById("boton-modo-edicion");
  if (boton) {
    boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "📖" : "✏️"}</span><span class="btn-text"> ${modoEdicion ? "LECTURA" : "EDITAR"}</span>`;
    boton.classList.toggle("modo-encendido", modoEdicion);
    boton.title = modoEdicion ? "Cambiar a modo lectura" : "Cambiar a modo edición";
  }
  const hayDetalles = document.querySelector(".detalle-apunte");
  if (hayDetalles && typeof window.__actualizarModoDetalleInSitu === "function") {
    window.__actualizarModoDetalleInSitu(modoEdicion);
  } else if (typeof window.__pintarDetalle === "function") {
    await window.__pintarDetalle();
  }
};

window.addEventListener("modo-edicion-cambiado", (e) => {
  aplicarModoEdicionEnVivo(Boolean(e && e.detail && e.detail.activo));
});
    window.addEventListener("storage", async (e) =>  {
      if (e.key === "modo_edicion_live") {
        const activo = e.newValue === "true";
        modoEdicion = activo;
        sessionStorage.setItem(CLAVE_MODO_EDICION, activo ? "true" : "false");
        const boton = document.getElementById("boton-modo-edicion");
        if (boton) {
          boton.innerHTML = `<span class="btn-icon">${activo ? "📖" : "✏️"}</span><span class="btn-text"> ${activo ? "LECTURA" : "EDITAR"}</span>`;
          boton.classList.toggle("modo-encendido", activo);
        }
        if (typeof window.__pintarDetalle === "function") window.__pintarDetalle();
        return;
      }
      if (e.key === "invitados_activos_live") {
        if (typeof window.__pintarDetalle === "function") window.__pintarDetalle();
        return;
      }
    }
  );
document.addEventListener("change", async (e) =>  {
  const switchEl = e.target.closest(".permiso-switch input");
  if (!switchEl) return;
  const label = switchEl.closest(".permiso-switch");
  if (!label) return;
  const seccion = label.dataset.seccion || seccionDetalle || "apuntes";
  const nombreFila = label.dataset.nombre || "";
  const nuevoEstado = switchEl.checked;
  const caja = label.closest(".caja-permiso-invitado");
  if (caja) { caja.classList.toggle("caja-permiso-invitado-oculto", !nuevoEstado); }
  label.classList.toggle("permiso-switch-oculto", !nuevoEstado);
  const span = label.querySelector(".permiso-switch-texto") || label.querySelector("span:not(.permiso-switch-check-wrapper)");
  if (span && !label.classList.contains("is-loading")) {
    span.innerHTML = nuevoEstado
    ? '<i class="fa-solid fa-eye"></i> Invitado lo ve'
    : '<i class="fa-solid fa-lock"></i> Oculto a invitados';
  }
  const card = label.closest(".detalle-apunte");
  if (card) { card.classList.toggle("tema-oculto-invitado", !nuevoEstado); }
}
  );
const cerrarPopover = document.querySelector("#popover .cerrar-popover");
if (cerrarPopover) cerrarPopover.addEventListener("click", () =>  {
  document.getElementById("popover")?.removeAttribute("popover-open");
}
  );

