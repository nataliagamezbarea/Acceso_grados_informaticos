const urlParams = new URLSearchParams(location.search);
let tempObj = null;
try {
  const temp = sessionStorage.getItem("detalle_temp");
  if (temp) tempObj = JSON.parse(temp);
} catch (e) {}

const nombre = (urlParams.get("nombre") || tempObj?.NOMBRE || (window.Estado ? window.Estado.obtener("nombre") : "") || "").trim();
const asignatura = (urlParams.get("asignatura") || tempObj?.ASIGNATURA || (window.Estado ? window.Estado.obtener("asignatura") : "") || "").trim();
const rama = urlParams.get("rama") || tempObj?.RAMA || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");
const normalizarTrimestre = (v) =>
  window.Trimestres
    ? window.Trimestres.normalizar(v)
    : (v || "")
        .replace(/[ºª]/g, "")
        .replace(/\btrimestres?\b/gi, "")
        .trim()
        .toLowerCase();
const trimestreFiltro = normalizarTrimestre(
  urlParams.get("trimestre") || tempObj?.TRIMESTRE || (window.Estado ? window.Estado.obtener("trimestre") : "") || ""
);

const seccionDetalle = (urlParams.get("seccion") || tempObj?._seccion || tempObj?.seccion || tempObj?.SECCION || "apuntes").toLowerCase();

if (urlParams.get("nombre") && window.Estado) window.Estado.guardar("nombre", nombre);
if (urlParams.get("asignatura") && window.Estado) window.Estado.guardar("asignatura", asignatura);
if (urlParams.get("rama")) {
  if (window.Estado) window.Estado.guardar("rama", rama);
  if (window.RamaActual) window.RamaActual.guardar(rama);
}

const contenidoDiv = document.getElementById("contenido");

if (!nombre || !asignatura) {
  if (contenidoDiv) contenidoDiv.textContent = "Faltan parámetros en la URL (nombre y/o asignatura).";
} else {
  if (contenidoDiv && (!tempObj || !tempObj.NOMBRE)) {
    contenidoDiv.textContent = "Cargando información del tema...";
  }
  (async () => {
    let nombreAsignatura = asignatura;
    let codigoAsignatura = asignatura;
    try {
      const textoInfo = await Permisos.leerCsv("informacion.json", rama);
      if (textoInfo) {
        const datosInfo = JSON.parse(textoInfo.trim().replace(/^\uFEFF/, ""));
        const found = (datosInfo.asignaturas || []).find(
          (a) =>
            String(a.codigo).toLowerCase() === asignatura.toLowerCase() ||
            String(a.nombre).toLowerCase() === asignatura.toLowerCase()
        );
        if (found) {
          nombreAsignatura = found.nombre;
          codigoAsignatura = found.codigo;
        }
      }
    } catch (e) { /* sigue */ }

    const coincideAsig = (val) => {
      if (!val) return true;
      const v = String(val).trim().toLowerCase();
      const asigUrl = String(asignatura).trim().toLowerCase();
      const asigNom = String(nombreAsignatura || "").trim().toLowerCase();
      const asigCod = String(codigoAsignatura || "").trim().toLowerCase();
      return (
        v === asigUrl ||
        v === asigNom ||
        v === asigCod ||
        asigUrl.includes(v) ||
        v.includes(asigUrl) ||
        asigNom.includes(v) ||
        v.includes(asigNom)
      );
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

          const filas = res.data.filter(
            (f) =>
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
        if (window.__pintarDetalle) await window.__pintarDetalle();
      } else if (!usandoCacheInstantanea) {
        contenidoDiv.textContent = "El tema de esta tarea no tiene ningún material asociado 📚 .";
      }
    };

    const CLAVE_MODO_EDICION = "modo_edicion_activo";
    let modoEdicion = localStorage.getItem("modo_edicion_live") === "true" || sessionStorage.getItem(CLAVE_MODO_EDICION) === "true";

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
            boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "✏️" : "📖"}</span><span class="btn-text"> ${modoEdicion ? "EDITAR" : "LECTURA"}</span>`;
            boton.classList.toggle("modo-encendido", modoEdicion);
            boton.title = modoEdicion ? "Modo Edición activo (Clic para cambiar a Lectura)" : "Modo Lectura activo (Clic para cambiar a Edición)";
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

          boton.addEventListener("click", async () => {
            modoEdicion = !modoEdicion;
            sessionStorage.setItem(CLAVE_MODO_EDICION, modoEdicion ? "true" : "false");
            localStorage.setItem("modo_edicion_live", modoEdicion ? "true" : "false");
            if (window.Permisos && window.Permisos.setVistaInvitado) {
              window.Permisos.setVistaInvitado(modoEdicion);
            }

            const hayDetalles = document.querySelector(".detalle-apunte");
            if (hayDetalles) {
              actualizarModoDetalleInSitu(modoEdicion);
            } else {
              actualizarBoton();
              await window.Permisos.cargarArchivos(asignatura, trimestreFiltro);
              pintarDetalles();
            }
          });

          const barra = document.getElementById("barra-superior");
          const navRight = document.querySelector("#barra-superior .nav-right");
          if (barra && navRight) {
            barra.insertBefore(boton, navRight);
          } else if (barra) {
            barra.appendChild(boton);
          } else {
            const ref = document.getElementById("volver-atras") || document.body;
            if (ref) ref.after(boton);
          }
        } else {
          boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "✏️" : "📖"}</span><span class="btn-text"> ${modoEdicion ? "EDITAR" : "LECTURA"}</span>`;
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

        // Los administradores siempre pueden ver y editar el detalle; a los invitados se les oculta si no tienen visibilidad
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

          if (clave === "ASIGNATURA") {
            valor = nombreAsignatura || fila.ASIGNATURA || valor;
          }

          if (clave === "ARCHIVO" && fila.ARCHIVO.length > 0) {
            valor = window.renderizarArchivosHTML
              ? window.renderizarArchivosHTML(fila.ARCHIVO, {
                  seccion: seccionDetalle,
                  nombreFila: nomFila,
                  modoEdicion: esAdmin && modoEdicion,
                  esAdmin: esAdmin,
                  profesor: fila.PROFESOR,
                })
              : fila.ARCHIVO.join("<br>");
          }

          html += `
            <div class="campo">
              <span class="clave">${clave}:</span>
              <span class="valor">${valor}</span>
            </div>`;
        }

        if (esAdmin && modoEdicion) {
          const claseCaja = !visibleGeneral ? "caja-permiso-invitado caja-permiso-invitado-oculto" : "caja-permiso-invitado";
          const claseSwitch = !visibleGeneral ? "permiso-switch permiso-switch-oculto" : "permiso-switch";
          const iconoEstado = visibleGeneral ? "fa-eye" : "fa-lock";
          const textoEstado = visibleGeneral ? "Invitado lo ve (Tema completo)" : "Oculto a invitados (Tema completo)";
          html += `
            <div${claseCaja}>
              <label class="${claseSwitch}" data-seccion="${seccionDetalle}" data-nombre="${nomFila}">
                <input type="checkbox" ${visibleGeneral ? "checked" : ""}>
                <span><i class="fa-solid ${iconoEstado}"></i> ${textoEstado}</span>
              </label>
            </div>`;
        }

        html += "</div>";
      });

      if (!contadorVisibles && html === "") {
        const hayFilas = Object.keys(grupos).length > 0;
        if (!esAdmin && hayFilas) {
          html = `
            <div class="aviso-material-protegido">
              <strong class="texto-material-protegido">Hay material disponible, pero está protegido.</strong><br>
              El contenido de este apunte no se muestra por seguridad y respeto a los derechos de autor. Si necesitas acceso, contacta con la profesora.
            </div>`;
        } else {
          html = "<p>No hay datos disponibles.</p>";
        }
      }

      contenidoDiv.innerHTML = html;
    };

    window.__pintarDetalle = pintarDetalles;
    await pintarDetalles();
    cargarDesdeServidor();

    window.addEventListener("storage", async (e) => {
      if (e.key === "modo_edicion_live") {
        const activo = e.newValue === "true";
        modoEdicion = activo;
        sessionStorage.setItem(CLAVE_MODO_EDICION, activo ? "true" : "false");
        const boton = document.getElementById("boton-modo-edicion");
        if (boton) {
          boton.innerHTML = `<span class="btn-icon">${activo ? "✏️" : "📖"}</span><span class="btn-text"> ${activo ? "EDITAR" : "LECTURA"}</span>`;
          boton.classList.toggle("modo-encendido", activo);
        }
        if (typeof window.__pintarDetalle === "function") window.__pintarDetalle();
        return;
      }

      if (e.key === "invitados_activos_live") {
        if (typeof window.__pintarDetalle === "function") window.__pintarDetalle();
        return;
      }
    });
  })();
}

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
  btn.classList.toggle("visible-invitado", nuevoEstado);
  btn.classList.toggle("oculto-invitado", !nuevoEstado);

  const itemSpan = btn.closest(".item-archivo");
  if (itemSpan) {
    itemSpan.classList.toggle("archivo-oculto-admin", !nuevoEstado);
  }

  if (window.Permisos && window.Permisos.guardarVisibilidadArchivo) {
    await window.Permisos.guardarVisibilidadArchivo(asignatura, trimestreFiltro, seccion, fila, archivo, nuevoEstado);
  }
});

document.addEventListener("change", async (e) => {
  const switchEl = e.target.closest(".permiso-switch input");
  if (!switchEl) return;
  const label = switchEl.closest(".permiso-switch");
  if (!label) return;

  const seccion = label.dataset.seccion || seccionDetalle || "apuntes";
  const nombreFila = label.dataset.nombre || "";
  const nuevoEstado = switchEl.checked;

  // Actualización in-place en la vista de detalle
  const caja = label.closest(".caja-permiso-invitado");
  if (caja) {
    caja.classList.toggle("caja-permiso-invitado-oculto", !nuevoEstado);
  }
  label.classList.toggle("permiso-switch-oculto", !nuevoEstado);
  const span = label.querySelector("span");
  if (span) {
    span.innerHTML = nuevoEstado
      ? '<i class="fa-solid fa-eye"></i> Invitado lo ve (Tema completo)'
      : '<i class="fa-solid fa-lock"></i> Oculto a invitados (Tema completo)';
  }
  const card = label.closest(".detalle-apunte");
  if (card) {
    card.classList.toggle("tema-oculto-invitado", !nuevoEstado);
  }

  if (window.Permisos && window.Permisos.guardarVisibilidad) {
    await window.Permisos.guardarVisibilidad(asignatura, trimestreFiltro, seccion, nombreFila, nuevoEstado);
  }
});

document.querySelector("#popover .cerrar-popover").addEventListener("click", () => {
  document.getElementById("popover").removeAttribute("popover-open");
});
