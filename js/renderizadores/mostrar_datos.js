const urlParams = new URLSearchParams(location.search);
const asig = urlParams.get("asignatura") || (window.Estado ? window.Estado.obtener("asignatura") : "") || "";
const tri = urlParams.get("trimestre") || (window.Estado ? window.Estado.obtener("trimestre") : "") || "";
const rama = urlParams.get("rama") || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");

if (urlParams.get("asignatura") && window.Estado) window.Estado.guardar("asignatura", asig);
if (urlParams.get("trimestre") && window.Estado) window.Estado.guardar("trimestre", tri);
if (urlParams.get("rama")) {
  if (window.Estado) window.Estado.guardar("rama", rama);
  if (window.RamaActual) window.RamaActual.guardar(rama);
}

const CLAVE_MODO_EDICION = "modo_edicion_activo";
let modoEdicion = localStorage.getItem("modo_edicion_live") === "true" || sessionStorage.getItem(CLAVE_MODO_EDICION) === "true";
try { localStorage.setItem("modo_edicion_live", modoEdicion ? "true" : "false"); } catch(e) {}


async function leerCsv(seccion, nombreArchivo) {
  const texto = await Permisos.leerCsv(nombreArchivo, rama);
  return texto;
}

async function cargarAsignatura(codigo) {
  let datos = null;
  if (window.InformacionGrado) {
    datos = await InformacionGrado.cargar(rama).catch(() => null);
  }
  if (!datos) {
    try {
      const texto = await Permisos.leerCsv("informacion.json", rama);
      if (texto) datos = JSON.parse(texto.replace(/^\uFEFF/, ""));
    } catch (e) { /* sin datos */ }
  }
  const asignaturas = (datos && datos.asignaturas) || [];
  return asignaturas.find((a) => String(a.codigo).toLowerCase() === String(codigo).toLowerCase()) || null;
}

if (asig && tri) {
  let nombreAsignatura;
  const normalizar = (v) =>
    window.Trimestres
      ? window.Trimestres.normalizar(v)
      : (v || "")
          .replace(/[ºª]/g, "")
          .replace(/\btrimestres?\b/gi, "")
          .trim()
          .toLowerCase();

  const triFiltro = normalizar(tri);

  (async () => {
    const asignatura = await cargarAsignatura(asig);

    if (asignatura) {
      const { nombre, emoji } = asignatura;
      nombreAsignatura = nombre;
      document.title = `${nombre} - ${tri}`;
      document.getElementById("emoji-trimestre").textContent = emoji;
      document.getElementById("titulo").textContent = nombre;
    } else {
      nombreAsignatura = asig;
      document.title = `${asig} - ${tri}`;
      document.getElementById("emoji-trimestre").textContent = "❓";
      document.getElementById("titulo").textContent = asig;
    }

    await Promise.all([Permisos.cargoSesion(), Permisos.cargarArchivos(asig, triFiltro)]);

    if (Permisos.esAdmin) {
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

        const actualizarModoInSitu = (activo) => {
          modoEdicion = activo;
          actualizarBoton();

          document.querySelectorAll(".barra-edicion-seccion").forEach((el) => {
            el.style.display = activo ? "flex" : "none";
          });

          document.querySelectorAll(".permiso-switch").forEach((el) => {
            el.style.display = activo ? "inline-flex" : "none";
          });

          document.querySelectorAll(".btn-toggle-archivo").forEach((el) => {
            el.style.display = activo ? "inline-flex" : "none";
          });

          document.querySelectorAll("tr[data-visible-invitado]").forEach((tr) => {
            const esVisible = tr.dataset.visibleInvitado === "true";
            if (!esVisible) {
              tr.style.display = activo ? "" : "none";
              if (activo) tr.classList.add("fila-oculta-invitado");
              else tr.classList.remove("fila-oculta-invitado");
            }
          });
        };
        window.__actualizarModoInSitu = actualizarModoInSitu;

        boton.addEventListener("click", async () => {
          modoEdicion = !modoEdicion;
          sessionStorage.setItem(CLAVE_MODO_EDICION, modoEdicion ? "true" : "false");
          localStorage.setItem("modo_edicion_live", modoEdicion ? "true" : "false");

          // Si ya hay tabla renderizada, actualizar in situ sin salto de página ni recarga de DOM
          const hayTablas = document.querySelector("#contenedor-apuntes table, #contenedor-practicas table");
          if (hayTablas) {
            actualizarModoInSitu(modoEdicion);
          } else {
            actualizarBoton();
            if (window.Permisos && window.Permisos.cargarArchivos) {
              await window.Permisos.cargarArchivos(asig, triFiltro);
            }
            pintarTodo();
          }
        });

        const barra = document.getElementById("barra-superior");
        const navRight = document.querySelector("#barra-superior .nav-right");
        if (barra && navRight) {
          barra.insertBefore(boton, navRight);
        } else if (barra) {
          barra.appendChild(boton);
        } else {
          const ref = document.querySelector(".portada_emoji_contenedor") || document.querySelector(".container");
          if (ref) ref.after(boton);
        }
      }

      const aListaUrls = (v) => {
        if (!v) return [];
        let arr = [];
        if (Array.isArray(v)) {
          arr = v.flatMap((x) => String(x).split(/[,;]/));
        } else {
          arr = String(v).split(/[,;]/);
        }
        return arr.map((u) => u.trim()).filter(Boolean);
      };

      const normalizarFila = (v) =>
        window.Trimestres
          ? window.Trimestres.normalizar(v)
          : String(v || "")
              .replace(/[ºª]/g, "")
              .replace(/\btrimestres?\b/gi, "")
              .trim()
              .toLowerCase();

      const recogerUrlsAsignatura = async () => {
        const urls = [];
        const filtradoInvitado = !(window.Permisos && window.Permisos.esAdmin && !window.Permisos.vistaInvitado);
        const pares = [
          { seccion: "apuntes", archivo: "APUNTES.csv" },
          { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv" },
        ];
        for (const { seccion, archivo } of pares) {
          try {
            const texto = await Permisos.leerCsv(archivo, rama);
            if (!texto) continue;
            const filas = Papa.parse(texto, {
              header: true,
              skipEmptyLines: true,
              delimiter: ",",
              quotes: true,
            }).data;
            filas.forEach((f) => {
              const codFila = String(f.ASIGNATURA || "").trim();
              const v = codFila.toLowerCase();
              const cod = String(asig || "").trim().toLowerCase();
              const nom = (nombreAsignatura || "").trim().toLowerCase();
              const coincide = v === cod || (nom && v === nom) || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom));
              if (!coincide) return;
              if (triFiltro && f.TRIMESTRE && normalizarFila(f.TRIMESTRE) !== triFiltro) return;
              const nombreFila = (f.NOMBRE || "").trim();
              if (filtradoInvitado && !Permisos.puedeVer(seccion, nombreFila)) return;
              aListaUrls(f.ARCHIVO).forEach((u) => {
                const nombre = u.split("/").pop() || "archivo";
                if (filtradoInvitado && !Permisos.esArchivoVisibleParaInvitado(seccion, nombreFila, nombre)) return;
                urls.push({ url: u, nombre, carpeta: nombreAsignatura || asig });
              });
            });
          } catch (e) {}
        }
        return urls;
      };

      const gestionarBotonDescargaAsignatura = async () => {
        const zona = document.getElementById("zona-descarga-asignatura");
        if (zona) zona.innerHTML = "";
      };

      window.__pintarAsignatura = gestionarBotonDescargaAsignatura;
      gestionarBotonDescargaAsignatura();

      const gestionarBotonDescargaAsignaturaTodos = async () => {
        const zona = document.getElementById("zona-descarga-asignatura-todos");
        if (zona) zona.innerHTML = "";
      };
      gestionarBotonDescargaAsignaturaTodos();
    }

    window.__pintarTodo = pintarTodo;
    pintarTodo();

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

        const hayTablas = document.querySelector("#contenedor-apuntes table, #contenedor-practicas table");
        if (hayTablas && typeof window.__actualizarModoInSitu === "function") {
          window.__actualizarModoInSitu(activo);
        } else if (typeof window.__pintarTodo === "function") {
          window.__pintarTodo();
        }
        return;
      }

      if (e.key === "invitados_activos_live") {
        if (typeof window.__pintarTodo === "function") window.__pintarTodo();
        return;
      }
    });
  })();

  function pintarTodo() {
    const secciones = [
      { seccion: "apuntes", archivo: "APUNTES.csv", contenedor: "contenedor-apuntes" },
      { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv", contenedor: "contenedor-practicas" },
    ];

    secciones.forEach(({ seccion, archivo, contenedor }) => {
      (async () => {
        const destino = document.getElementById(contenedor);
        if (!destino) return;
        if (!destino.children.length || destino.innerHTML.trim() === "") {
          destino.innerHTML = '<p class="mensaje-cargando">Cargando contenido...</p>';
        }
        let csvTexto = null;
        try {
          csvTexto = await leerCsv(seccion, archivo);
        } catch (e) {
          destino.innerHTML = `<p>Error al leer ${archivo}: ${e.message}</p>`;
          return;
        }

        if (csvTexto === null) {
          destino.innerHTML = "<p>No hay datos para esta rama.</p>";
          return;
        }

        const R = Papa.parse(csvTexto, {
          header: true,
          skipEmptyLines: true,
          delimiter: ",",
          quotes: true,
        });

        const coincideAsignatura = (valor) => {
          const v = (valor || "").trim().toLowerCase();
          const cod = asig.trim().toLowerCase();
          const nom = (nombreAsignatura || "").trim().toLowerCase();
          return v === cod || (nom && v === nom) || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom));
        };

        const coincideTrimestre = (valor) => {
          if (!triFiltro) return true;
          const vNorm = normalizar(valor);
          return vNorm === triFiltro || (!valor && !triFiltro);
        };

        const filas = R.data.filter(
          (f) => coincideAsignatura(f.ASIGNATURA) && coincideTrimestre(f.TRIMESTRE)
        );

        window.__mapaFilasDetalle = window.__mapaFilasDetalle || new Map();
        filas.forEach((f) => {
          window.__mapaFilasDetalle.set(`${seccion}|${(f.NOMBRE || "").trim().toLowerCase()}`, f);
        });

        window.prepararDetalleClick = (sec, nomFila) => {
          const item = window.__mapaFilasDetalle?.get(`${sec}|${String(nomFila).trim().toLowerCase()}`);
          if (item) {
            try {
              sessionStorage.setItem("detalle_temp", JSON.stringify({ ...item, _seccion: sec }));
            } catch (e) {}
          }
        };

        if (!filas.length) {
          destino.innerHTML = "<p>No hay datos disponibles en este trimestre.</p>";
          return;
        }

        destino.innerHTML = '<p class="mensaje-cargando">Cargando contenidos...</p>';

        const grupos = {};
        filas.forEach((f) => {
          const key = `${(f.PROFESOR || "Sin profesor").trim()}|${(f.NOMBRE || "").trim()}|${(f.ASIGNATURA || "").trim()}|${(f.TRIMESTRE || "").trim()}`;
          if (!grupos[key]) grupos[key] = { ...f, ARCHIVO: [] };

          if (f.ARCHIVO) {
            grupos[key].ARCHIVO = grupos[key].ARCHIVO.concat(
              f.ARCHIVO.split(/[,;]/)
                .map((u) => u.trim())
                .filter(Boolean)
            );
          }

          if (!f["📒 APUNTES"]) f["📒 APUNTES"] = "";
        });

        // Organizar por profesor
        const profesores = {};
        Object.values(grupos).forEach((f) => {
          const prof = f.PROFESOR || "Sin profesor";
          if (!profesores[prof]) profesores[prof] = [];
          profesores[prof].push(f);
        });

        window.__profesoresConocidos = window.__profesoresConocidos || [];
        Object.keys(profesores).forEach((p) => {
          const limpio = (p || "").trim();
          if (limpio && limpio !== "Sin profesor" && !window.__profesoresConocidos.includes(limpio)) {
            window.__profesoresConocidos.push(limpio);
          }
        });

        // Generar HTML
        let html = "";

        if (Permisos.esAdmin && modoEdicion) {
          const tituloSec = seccion === "apuntes" ? "Apuntes" : "Prácticas";
          html += `
            <div class="barra-edicion-seccion">
              <span>⚙️ ${tituloSec} para invitados:</span>
              <div class="barra-edicion-botones">
                <button type="button" class="btn-seccion-todos btn-mostrar-todos" data-seccion="${seccion}" data-accion="mostrar"><i class="fa-solid fa-eye"></i> Mostrar todos</button>
                <button type="button" class="btn-seccion-todos btn-ocultar-todos" data-seccion="${seccion}" data-accion="ocultar"><i class="fa-solid fa-ban"></i> Ocultar todos</button>
              </div>
            </div>`;
        }

        const esVisibleFila = (f) => {
          if (Permisos.esAdmin && (!Permisos.vistaInvitado || modoEdicion)) return true;
          
          const nombreFila = (f.NOMBRE || "").trim();
          const filaVisibleGeneral = Permisos.puedeVer(seccion, nombreFila);
          if (!filaVisibleGeneral) return false;

          let listaArchivos = f.ARCHIVO || [];
          if (!Array.isArray(listaArchivos)) {
            listaArchivos = String(listaArchivos).split(/[,;]/).map((u) => u.trim()).filter(Boolean);
          }

          if (listaArchivos.length > 0) {
            const algunoVisible = listaArchivos.some((url) => {
              const nomArchivo = url.split("/").pop();
              return Permisos.esArchivoVisibleParaInvitado(seccion, nombreFila, nomArchivo);
            });
            if (!algunoVisible) return false; // Si todos los archivos están ocultos para el invitado, no se le muestra la fila
          }

          return true;
        };

        for (let prof in profesores) {
          let filasProfesor = profesores[prof].filter(esVisibleFila);

          if (!filasProfesor.length) continue;

          const tituloBloque = Permisos.esAdmin ? prof : "Material Docente y Contenidos";
          html += `<div class="bloque-profesor"><h3>${tituloBloque}</h3>`;
          html += '<div class="tabla-contenedor-responsive"><table><thead><tr>';

          const cols = Object.keys(filasProfesor[0]).filter(
            (c) => c !== "ARCHIVO" && (Permisos.esAdmin || c.toUpperCase() !== "PROFESOR")
          );
          html += cols.map((c) => `<th>${c}</th>`).join("") + "<th>ARCHIVO</th></tr></thead><tbody>";

          filasProfesor.forEach((f) => {
            const nomFila = (f.NOMBRE || "").trim();
            const visibleParaInvitado = Permisos.esVisibleParaInvitado(seccion, nomFila);
            const esOcultaInvitado = Permisos.esAdmin && modoEdicion && !visibleParaInvitado;
            const estiloFila = esOcultaInvitado ? ' class="fila-oculta-invitado"' : "";
            html += `<tr${estiloFila}>`;
            cols.forEach((c) => {
              let valor = f[c] || "";
              if (c === "NOMBRE") {
                let solo = "";
                if (Permisos.esAdmin && modoEdicion) {
                  const claseSwitch = visibleParaInvitado ? "permiso-switch" : "permiso-switch permiso-switch-oculto";
                  const iconoEstado = visibleParaInvitado ? "fa-eye" : "fa-lock";
                  const textoEstado = visibleParaInvitado ? "Invitado lo ve" : "Oculto a invitados";
                  solo = `<br><label class="${claseSwitch}" data-seccion="${seccion}" data-nombre="${nomFila}">
                    <input type="checkbox" ${visibleParaInvitado ? "checked" : ""}> <span><i class="fa-solid ${iconoEstado}"></i> ${textoEstado}</span>
                  </label>`;
                }
                const nomEscaped = String(valor).replace(/'/g, "\\'");
                valor = `<a href="apuntes_practicas_ejercicios_tareas.html?nombre=${encodeURIComponent(valor)}&asignatura=${encodeURIComponent(asig)}&trimestre=${encodeURIComponent(tri)}&rama=${encodeURIComponent(rama)}&seccion=${encodeURIComponent(seccion)}" onclick="window.prepararDetalleClick('${seccion}', '${nomEscaped}');">${valor}</a>${solo}`;
              }
              html += `<td>${valor}</td>`;
            });

            const archivosHTML = window.renderizarArchivosHTML
              ? window.renderizarArchivosHTML(f.ARCHIVO, {
                  seccion,
                  nombreFila: (f.NOMBRE || "").trim(),
                  modoEdicion: Permisos.esAdmin && modoEdicion,
                  esAdmin: Permisos.esAdmin,
                  profesor: prof,
                })
              : (f.ARCHIVO || []).join("<br>");

            html += `<td>${archivosHTML}</td>`;
            html += "</tr>";
          });

          html += "</tbody></table></div></div>";
        }

        destino.innerHTML = html;

        if (!html.trim()) {
          const hayFilas = Object.keys(grupos).length > 0;
          const esVistaInvitado = Permisos.esAdmin && Permisos.vistaInvitado;
          if ((!Permisos.esAdmin || esVistaInvitado) && hayFilas) {
            destino.innerHTML = `
              <div class="aviso-material-protegido">
                <strong class="texto-material-protegido">Hay material disponible, pero está protegido.</strong><br>
                El contenido de este ${seccion === "apuntes" ? "apunte" : "ejercicio/práctica"} no se muestra por seguridad y respeto a los derechos de autor. Si necesitas acceso, contacta con la profesora.
              </div>`;
          } else {
            destino.innerHTML = "<p>No hay datos disponibles en este trimestre.</p>";
          }
        }
      })();
    });
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-seccion-todos");
  if (!btn) return;

  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const seccion = btn.dataset.seccion;
  const accion = btn.dataset.accion; // 'mostrar' o 'ocultar'
  const visible = accion === "mostrar";

  const switches = document.querySelectorAll(`.permiso-switch[data-seccion="${seccion}"] input`);
  switches.forEach((cb) => {
    cb.checked = visible;
  });

  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const listaNombres = (window.__nombresRealesSeccion && window.__nombresRealesSeccion[seccion]) ||
    Array.from(document.querySelectorAll(`.permiso-switch[data-seccion="${seccion}"]`))
      .map((el) => (el.dataset.nombre || "").trim())
      .filter(Boolean);

  const normalizar = (v) =>
    window.Trimestres
      ? window.Trimestres.normalizar(v)
      : (v || "")
          .replace(/[ºª]/g, "")
          .replace(/\btrimestres?\b/gi, "")
          .trim()
          .toLowerCase();

  await Permisos.guardarVisibilidadSeccion(asig, normalizar(tri), seccion, listaNombres, visible);

  switches.forEach((cb) => {
    cb.checked = visible;
  });

  btn.disabled = false;
  btn.textContent = textoOriginal;
});

document.addEventListener("change", async (e) => {
  const switchEl = e.target.closest(".permiso-switch input");
  if (!switchEl) return;

  const label = switchEl.closest(".permiso-switch");
  if (!label) return;
  const nuevoEstado = switchEl.checked;

  // Actualización in-place sin brincos ni recargas del DOM
  label.classList.toggle("permiso-switch-oculto", !nuevoEstado);
  const span = label.querySelector("span");
  if (span) {
    span.innerHTML = nuevoEstado
      ? '<i class="fa-solid fa-eye"></i> Invitado lo ve'
      : '<i class="fa-solid fa-lock"></i> Oculto a invitados';
  }
  const filaTr = label.closest("tr");
  if (filaTr) {
    filaTr.classList.toggle("fila-oculta-invitado", !nuevoEstado);
  }

  const normalizar = (v) =>
    window.Trimestres
      ? window.Trimestres.normalizar(v)
      : (v || "")
          .replace(/[ºª]/g, "")
          .replace(/\btrimestres?\b/gi, "")
          .trim()
          .toLowerCase();

  if (window.Permisos && window.Permisos.guardarVisibilidad) {
    await Permisos.guardarVisibilidad(
      asig,
      normalizar(tri),
      label.dataset.seccion,
      label.dataset.nombre,
      nuevoEstado
    );
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-toggle-archivo");
  if (!btn) return;

  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const seccion = btn.dataset.seccion;
  const fila = btn.dataset.fila;
  const archivo = btn.dataset.archivo;
  const nuevoEstado = btn.dataset.visible !== "1";

  const normalizar = (v) =>
    window.Trimestres
      ? window.Trimestres.normalizar(v)
      : (v || "")
          .replace(/[ºª]/g, "")
          .replace(/\btrimestres?\b/gi, "")
          .trim()
          .toLowerCase();

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
  if (itemSpan) itemSpan.classList.toggle("archivo-oculto-admin", !nuevoEstado);

  await Permisos.guardarVisibilidadArchivo(asig, normalizar(tri), seccion, fila, archivo, nuevoEstado);
});
