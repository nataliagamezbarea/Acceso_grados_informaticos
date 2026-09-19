window.inicializarMostrarDatos = function inicializarMostrarDatos() {
  // Cada entrada en la vista de asignatura debe leer el contexto ACTUAL.
  // El componente DSD se vuelve a montar, aunque este JS ya estuviera cargado.
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
  // localStorage es la única fuente de verdad tras una recarga.
  // Sin valor guardado, el modo predeterminado es LECTURA (false).
  let modoEdicion = localStorage.getItem("modo_edicion_live") === "true";
  async function leerCsv(seccion, nombreArchivo) {
    const texto = await Permisos.leerCsv(nombreArchivo, rama);
    return texto;
  }
  async function cargarAsignatura(codigo) {
    let datos = null;
    if (window.InformacionGrado) { datos = await InformacionGrado.cargar(rama).catch(() => null); }
    if (!datos) {
      try {
        const texto = await Permisos.leerCsv("informacion.json", rama);
        if (texto) datos = JSON.parse(texto.replace(/^\uFEFF/, ""));
      } catch (e) {
        /* sin datos */
      }
    }
    const asignaturas = (datos && datos.asignaturas) || [];
    return asignaturas.find((a) => String(a.codigo).toLowerCase() === String(codigo).toLowerCase()) || null;
  }
  if (asig && tri) {
    let nombreAsignatura;
    const normalizar = (v) => window.Trimestres
    ? window.Trimestres.normalizar(v)
    : (v || "") .replace(/[ºª]/g, "") .replace(/\btrimestres?\b/gi, "") .trim() .toLowerCase();
    const triFiltro = normalizar(tri);
    (async () =>  {
      const destinoApuntes = document.getElementById("contenedor-apuntes");
      const destinoPracticas = document.getElementById("contenedor-practicas");
      if (destinoApuntes) destinoApuntes.innerHTML = '<p class="cargando"><i class="fa-solid fa-spinner fa-spin"></i> Cargando contenido...</p>';
      if (destinoPracticas) destinoPracticas.innerHTML = '<p class="cargando"><i class="fa-solid fa-spinner fa-spin"></i> Cargando contenido...</p>';

      const asignatura = await cargarAsignatura(asig);
      if (asignatura) {
        const  { nombre, emoji }
        = asignatura;
        nombreAsignatura = nombre;
        document.title = `${nombre} - ${tri}`;
        const emojiEl = document.getElementById("emoji-trimestre");
        if (emojiEl) emojiEl.textContent = emoji;
        const tituloEl = document.getElementById("titulo");
        if (tituloEl) tituloEl.textContent = nombre;
      } else {
        nombreAsignatura = asig;
        document.title = `${asig} - ${tri}`;
        const emojiEl = document.getElementById("emoji-trimestre");
        if (emojiEl) emojiEl.textContent = "❓";
        const tituloEl = document.getElementById("titulo");
        if (tituloEl) tituloEl.textContent = asig;
      }
      await Promise.all([Permisos.cargoSesion(), Permisos.cargarArchivos(asig, triFiltro)]);
      if (Permisos.esAdmin) {
        let boton = document.getElementById("boton-modo-edicion");
        if (!boton) {
          boton = document.createElement("button");
          boton.id = "boton-modo-edicion";
          const actualizarBoton = () =>  {
            boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "📖" : "✏️"}</span><span class="btn-text"> ${modoEdicion ? "LECTURA" : "EDITAR"}</span>`;
            boton.classList.toggle("modo-encendido", modoEdicion);
            boton.title = modoEdicion ? "Cambiar a modo lectura" : "Cambiar a modo edición";
          }
          ;
          actualizarBoton();
          const actualizarModoInSitu = (activo) =>  {
            modoEdicion = activo;
            actualizarBoton();
            document.querySelectorAll(".barra-edicion-seccion").forEach((el) =>  {
              el.style.display = activo ? "flex" : "none";
            }
  );
            document.querySelectorAll(".permiso-switch").forEach((el) =>  {
              el.style.display = activo ? "inline-flex" : "none";
            }
  );
            document.querySelectorAll("tr[data-visible-invitado]").forEach((tr) =>  {
              const esVisible = tr.dataset.visibleInvitado === "true";
              if (!esVisible) {
                tr.style.display = activo ? "" : "none";
                if (activo) tr.classList.add("fila-oculta-invitado");
                else tr.classList.remove("fila-oculta-invitado");
              }
            }
  );
          }
          ;
          window.__actualizarModoInSitu = actualizarModoInSitu;
          const barra = document.getElementById("barra-superior");
          const navRight = document.querySelector("#barra-superior .nav-right");
          if (barra && navRight) { barra.insertBefore(boton, navRight); }
          else if (barra) { barra.appendChild(boton); }
          else {
            const ref = document.querySelector(".portada_emoji_contenedor") || document.querySelector(".container");
            if (ref) ref.after(boton);
          }
        }
        const aListaUrls = (v) =>  {
          if (!v) return [];
          let arr = [];
          if (Array.isArray(v)) { arr = v.flatMap((x) => String(x).split(/[,;]/)); }
          else { arr = String(v).split(/[,;]/); }
          return arr.map((u) => u.trim()).filter(Boolean);
        }
        ;
        const normalizarFila = (v) => window.Trimestres
        ? window.Trimestres.normalizar(v)
        : String(v || "") .replace(/[ºª]/g, "") .replace(/\btrimestres?\b/gi, "") .trim() .toLowerCase();
        const recogerUrlsAsignatura = async () =>  {
          const urls = [];
          const filtradoInvitado = !(window.Permisos && window.Permisos.esAdmin && !window.Permisos.vistaInvitado);
          const pares = [  { seccion: "apuntes", archivo: "APUNTES.csv" }
          ,  { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv" }
          , ];
          for (const  { seccion, archivo }
          of pares) {
            try {
              const texto = await Permisos.leerCsv(archivo, rama);
              if (!texto) continue;
              const filas = Papa.parse(texto,  {
                header: true, skipEmptyLines: true, delimiter: ",", quotes: true,
              }
              ).data;
              filas.forEach((f) =>  {
                const codFila = String(f.ASIGNATURA || "").trim();
                const v = codFila.toLowerCase();
                const cod = String(asig || "").trim().toLowerCase();
                const nom = (nombreAsignatura || "").trim().toLowerCase();
                const coincide = v === cod || (nom && v === nom) || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom));
                if (!coincide) return;
                if (triFiltro && f.TRIMESTRE && normalizarFila(f.TRIMESTRE) !== triFiltro) return;
                const nombreFila = (f.NOMBRE || "").trim();
                if (filtradoInvitado && !Permisos.puedeVer(seccion, nombreFila)) return;
                aListaUrls(f.ARCHIVO).forEach((u) =>  {
                  const nombre = u.split("/").pop() || "archivo";
                  if (filtradoInvitado && !Permisos.esArchivoVisibleParaInvitado(seccion, nombreFila, nombre)) return;
                  urls.push( { url: u, nombre, carpeta: nombreAsignatura || asig }
  );
                }
  );
              }
  );
            } catch (e) {
            }
          }
          return urls;
        }
        ;
        const gestionarBotonDescargaAsignatura = async () =>  {
          const zona = document.getElementById("zona-descarga-asignatura");
          if (zona) zona.innerHTML = "";
        }
        ;
        window.__pintarAsignatura = gestionarBotonDescargaAsignatura;
        gestionarBotonDescargaAsignatura();
        const gestionarBotonDescargaAsignaturaTodos = async () =>  {
          const zona = document.getElementById("zona-descarga-asignatura-todos");
          if (zona) zona.innerHTML = "";
        }
        ;
        gestionarBotonDescargaAsignaturaTodos();
      }
      window.__pintarTodo = pintarTodo;
      pintarTodo();
      const aplicarModoEdicionEnVivo = async (activo) =>  {
        modoEdicion = Boolean(activo);
        try { sessionStorage.setItem(CLAVE_MODO_EDICION, modoEdicion ? "true" : "false"); }
        catch (e) {
        }
        const boton = document.getElementById("boton-modo-edicion");
        if (boton) {
          boton.innerHTML = `<span class="btn-icon">${modoEdicion ? "📖" : "✏️"}</span><span class="btn-text"> ${modoEdicion ? "LECTURA" : "EDITAR"}</span>`;
          boton.classList.toggle("modo-encendido", modoEdicion);
          boton.title = modoEdicion ? "Cambiar a modo lectura" : "Cambiar a modo edición";
        }
        const hayTablas = document.querySelector("#contenedor-apuntes table, #contenedor-practicas table");
        if (hayTablas && typeof window.__actualizarModoInSitu === "function") {
          window.__actualizarModoInSitu(modoEdicion);
        } else {
          await pintarTodo();
        }
      }
      ;
      window.addEventListener("modo-edicion-cambiado", (e) =>  {
        aplicarModoEdicionEnVivo(Boolean(e && e.detail && e.detail.activo));
      }
  );
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
      }
  );
    }
    )();
    function pintarTodo() {
      const secciones = [  { seccion: "apuntes", archivo: "APUNTES.csv", contenedor: "contenedor-apuntes" }
      ,  { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv", contenedor: "contenedor-practicas" }
      , ];
      secciones.forEach(( { seccion, archivo, contenedor }
      ) =>  {
        (async () =>  {
          const destino = document.getElementById(contenedor);
          if (!destino) return;
          destino.innerHTML = '<p class="cargando"><i class="fa-solid fa-spinner fa-spin"></i> Cargando contenido...</p>';
          let csvTexto = null;
          try { csvTexto = await leerCsv(seccion, archivo); }
          catch (e) {
            destino.innerHTML = `<p>Error al leer ${archivo}: ${e.message}</p>`;
            return;
          }
          if (csvTexto === null) {
            destino.innerHTML = "<p>No hay datos para esta rama.</p>";
            return;
          }
          const R = Papa.parse(csvTexto,  {
            header: true, skipEmptyLines: true, delimiter: ",", quotes: true,
          }
  );
          const coincideAsignatura = (valor) =>  {
            const v = (valor || "").trim().toLowerCase();
            const cod = asig.trim().toLowerCase();
            const nom = (nombreAsignatura || "").trim().toLowerCase();
            return v === cod || (nom && v === nom) || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom));
          }
          ;
          const coincideTrimestre = (valor) =>  {
            if (!triFiltro) return true;
            const vNorm = normalizar(valor);
            return vNorm === triFiltro || (!valor && !triFiltro);
          }
          ;
          const filas = R.data.filter( (f) => coincideAsignatura(f.ASIGNATURA) && coincideTrimestre(f.TRIMESTRE) );
          window.__mapaFilasDetalle = window.__mapaFilasDetalle || new Map();
          filas.forEach((f) =>  { window.__mapaFilasDetalle.set(`${seccion}|${(f.NOMBRE || "").trim().toLowerCase()}`, f); }
  );
          window.prepararDetalleClick = (sec, nomFila) =>  {
            const item = window.__mapaFilasDetalle?.get(`${sec}|${String(nomFila).trim().toLowerCase()}`);
            if (item) {
              try {
                sessionStorage.setItem("detalle_temp", JSON.stringify( { ...item, _seccion: sec }
                ));
              } catch (e) {
              }
            }
          }
          ;
          document.querySelectorAll("a.enlace-detalle-apuntes").forEach((enlace) =>  {
            enlace.addEventListener("click", (e) =>  {
              e.preventDefault();
              const sec = enlace.dataset.seccion || "apuntes";
              const nomFila = decodeURIComponent(enlace.dataset.nombreFila || "");
              window.prepararDetalleClick(sec, nomFila);
              if (window.AppViews?.mostrar) {
                window.AppViews.mostrar("apuntes",  {
                  rama, asignatura: asig, trimestre: tri, seccion: sec, nombre: nomFila
                }
  );
              }
            }
  );
          }
  );
          if (!filas.length) {
            destino.innerHTML = "<p>No hay datos disponibles en este trimestre.</p>";
            return;
          }
          destino.innerHTML = "";
          const grupos =  {
          }
          ;
          filas.forEach((f) =>  {
            const key = `${(f.PROFESOR || "Sin profesor").trim()}|${(f.NOMBRE || "").trim()}|${(f.ASIGNATURA || "").trim()}|${(f.TRIMESTRE || "").trim()}`;
            if (!grupos[key]) grupos[key] =  { ...f, ARCHIVO: [] }
            ;
            if (f.ARCHIVO) {
              grupos[key].ARCHIVO = grupos[key].ARCHIVO.concat( f.ARCHIVO.split(/[,;]/) .map((u) => u.trim()) .filter(Boolean) );
            }
            if (!f["📒 APUNTES"]) f["📒 APUNTES"] = "";
          }
  );
          const profesores =  {
          }
          ;
          Object.values(grupos).forEach((f) =>  {
            const prof = f.PROFESOR || "Sin profesor";
            if (!profesores[prof]) profesores[prof] = [];
            profesores[prof].push(f);
          }
  );
          window.__profesoresConocidos = window.__profesoresConocidos || [];
          Object.keys(profesores).forEach((p) =>  {
            const limpio = (p || "").trim();
            if (limpio && limpio !== "Sin profesor" && !window.__profesoresConocidos.includes(limpio)) {
              window.__profesoresConocidos.push(limpio);
            }
          }
  );
          let html = "";
          if (Permisos.esAdmin && modoEdicion) {
            const tituloSec = seccion === "apuntes" ? "Apuntes" : "Prácticas";
            html += `
<div class="barra-edicion-seccion"> <span>⚙️ ${tituloSec} para invitados:</span> <div class="barra-edicion-botones"> <button type="button" class="btn-seccion-todos btn-mostrar-todos" data-seccion="${seccion}" data-accion="mostrar"><i class="fa-solid fa-eye"></i> Mostrar todos</button> <button type="button" class="btn-seccion-todos btn-ocultar-todos" data-seccion="${seccion}" data-accion="ocultar"><i class="fa-solid fa-ban"></i> Ocultar todos</button> </div> </div>`;
          }
          const esVisibleFila = (f) =>  {
            if (Permisos.esAdmin && (!Permisos.vistaInvitado || modoEdicion)) return true;
            const nombreFila = (f.NOMBRE || "").trim();
            const filaVisibleGeneral = Permisos.puedeVer(seccion, nombreFila);
            if (!filaVisibleGeneral) return false;
            let listaArchivos = f.ARCHIVO || [];
            if (!Array.isArray(listaArchivos)) {
              listaArchivos = String(listaArchivos).split(/[,;]/).map((u) => u.trim()).filter(Boolean);
            }
            if (listaArchivos.length > 0) {
              const algunoVisible = listaArchivos.some((url) =>  {
                const nomArchivo = url.split("/").pop();
                return Permisos.esArchivoVisibleParaInvitado(seccion, nombreFila, nomArchivo);
              }
  );
              if (!algunoVisible) return false;
              // Si todos los archivos están ocultos para el invitado, no se le muestra la fila
            }
            return true;
          }
          ;
          for (let prof in profesores) {
            let filasProfesor = profesores[prof].filter(esVisibleFila);
            if (!filasProfesor.length) continue;
            const tituloBloque = Permisos.esAdmin ? prof : "Material Docente y Contenidos";
            html += `<div class="bloque-profesor ${seccion === "apuntes" ? "bloque-apuntes" : "bloque-ejercicios"}"><h3>${tituloBloque}</h3>`;
            html += '<div class="tabla-contenedor-responsive"><table><thead><tr>';
            const cols = Object.keys(filasProfesor[0]).filter( (c) => c !== "ARCHIVO" && (Permisos.esAdmin || c.toUpperCase() !== "PROFESOR") );
            html += cols.map((c) => `<th>${c}</th>`).join("") + "<th>ARCHIVO</th></tr></thead><tbody>";
            filasProfesor.forEach((f) =>  {
              const nomFila = (f.NOMBRE || "").trim();
              const visibleParaInvitado = Permisos.esVisibleParaInvitado(seccion, nomFila);
              const esOcultaInvitado = Permisos.esAdmin && modoEdicion && !visibleParaInvitado;
              const estiloFila = esOcultaInvitado ? ' class="fila-oculta-invitado"' : "";
              html += `<tr${estiloFila}>`;
              cols.forEach((c) =>  {
                let valor = f[c] || "";
                if (c === "NOMBRE") {
                  let solo = "";
                  if (Permisos.esAdmin && modoEdicion) {
                    const claseSwitch = visibleParaInvitado ? "permiso-switch" : "permiso-switch permiso-switch-oculto";
                    const iconoEstado = visibleParaInvitado ? "fa-eye" : "fa-lock";
                    const textoEstado = visibleParaInvitado ? "Invitado lo ve" : "Oculto a invitados";
                    solo = `<br><span data-component="permiso-switch" data-seccion="${seccion}" data-nombre="${nomFila}" data-asignatura="${String(asig || "").replace(/"/g, "&quot;")}" data-trimestre="${String(tri || "").replace(/"/g, "&quot;")}" data-checked="${visibleParaInvitado ? "true" : "false"}"></span>`;
                  }
                  const nomEscaped = String(valor).replace(/'/g, "\\'");
                  valor = `<a href="/" class="enlace-detalle-apuntes" data-seccion="${seccion}" data-nombre-fila="${encodeURIComponent(valor)}">${valor}</a>${solo}`;
                }
                html += `<td>${valor}</td>`;
              }
  );
              const archivosHTML = window.renderizarArchivosHTML
              ? window.renderizarArchivosHTML(f.ARCHIVO,  {
                seccion, nombreFila: (f.NOMBRE || "").trim(), modoEdicion: Permisos.esAdmin && modoEdicion, esAdmin: Permisos.esAdmin, profesor: prof, mostrarVisorArchivo: true, tipoVista: "asignatura", rama, asignatura: asig, trimestre: tri,
              }
              )
              : (f.ARCHIVO || []).join("<br>");
              html += `<td>${archivosHTML}</td>`;
              html += "</tr>";
            }
  );
            html += "</tbody></table></div></div>";
          }
          destino.innerHTML = html;
          if (!html.trim()) {
            const hayFilas = Object.keys(grupos).length > 0;
            const esVistaInvitado = Permisos.esAdmin && Permisos.vistaInvitado;
            if ((!Permisos.esAdmin || esVistaInvitado) && hayFilas) { destino.innerHTML = `
<div class="aviso-material-protegido"> <strong class="texto-material-protegido">Hay material disponible, pero está protegido.</strong><br> El contenido de este ${seccion === "apuntes" ? "apunte" : "ejercicio/práctica"} no se muestra por seguridad y respeto a los derechos de autor. Si necesitas acceso, contacta con la profesora.
</div>`; }
            else { destino.innerHTML = "<p>No hay datos disponibles en este trimestre.</p>"; }
          }
        }
        )();
      }
  );
    }
  }
  document.addEventListener("click", async (e) =>  {
    const btn = e.target.closest(".btn-seccion-todos");
    if (!btn) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const seccion = btn.dataset.seccion;
    const accion = btn.dataset.accion;
    // 'mostrar' o 'ocultar'
    const visible = accion === "mostrar";
    const switches = document.querySelectorAll(`.permiso-switch[data-seccion="${seccion}"] input`);
    switches.forEach((cb) =>  { cb.checked = visible; }
  );
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const listaNombres = (window.__nombresRealesSeccion && window.__nombresRealesSeccion[seccion]) || Array.from(document.querySelectorAll(`.permiso-switch[data-seccion="${seccion}"]`)) .map((el) => (el.dataset.nombre || "").trim()) .filter(Boolean);
    const normalizar = (v) => window.Trimestres
    ? window.Trimestres.normalizar(v)
    : (v || "") .replace(/[ºª]/g, "") .replace(/\btrimestres?\b/gi, "") .trim() .toLowerCase();
    await Permisos.guardarVisibilidadSeccion(asig, normalizar(tri), seccion, listaNombres, visible);
    switches.forEach((cb) =>  { cb.checked = visible; }
  );
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
  );
  document.addEventListener("change", async (e) =>  {
    const switchEl = e.target.closest(".permiso-switch input");
    if (!switchEl) return;
    const label = switchEl.closest(".permiso-switch");
    if (!label) return;
    const nuevoEstado = switchEl.checked;
    label.classList.toggle("permiso-switch-oculto", !nuevoEstado);
    const span = label.querySelector(".permiso-switch-texto") || label.querySelector("span:not(.permiso-switch-check-wrapper)");
    if (span && !label.classList.contains("is-loading")) {
      span.innerHTML = nuevoEstado
      ? '<i class="fa-solid fa-eye"></i> Invitado lo ve'
      : '<i class="fa-solid fa-lock"></i> Oculto a invitados';
    }
    const filaTr = label.closest("tr");
    if (filaTr) { filaTr.classList.toggle("fila-oculta-invitado", !nuevoEstado); }
  }
  );
  document.addEventListener("click", async (e) =>  {
    const btn = e.target.closest(".btn-toggle-archivo");
    if (!btn) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Evita relanzar la operación si ya hay una petición de este mismo botón
    // en curso (doble clic): sin esto el estado visual y el popup podían
    // quedar desincronizados y solo se arreglaban recargando la página.
    if (btn.dataset.cargando === "1") return;

    const seccion = btn.dataset.seccion;
    const fila = btn.dataset.fila;
    const archivo = btn.dataset.archivo;
    const estadoAnterior = btn.dataset.visible === "1";
    const nuevoEstado = !estadoAnterior;
    const normalizar = (v) => window.Trimestres
    ? window.Trimestres.normalizar(v)
    : (v || "") .replace(/[ºª]/g, "") .replace(/\btrimestres?\b/gi, "") .trim() .toLowerCase();

    const icono = btn.querySelector("i");
    const aplicarIcono = (visible) =>  {
      btn.innerHTML = visible ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      const ic = btn.querySelector("i");
      if (ic) {
        ic.style.animation = "none";
        void ic.offsetWidth;
        ic.style.animation = "girarOjo 0.3s ease";
      }
      btn.title = visible
      ? "Visible para invitados (clic para ocultar este archivo)"
      : "Oculto para invitados (clic para mostrar este archivo)";
      btn.classList.toggle("visible-invitado", visible);
      btn.classList.toggle("oculto-invitado", !visible);
      const itemSpan = btn.closest(".item-archivo");
      if (itemSpan) itemSpan.classList.toggle("archivo-oculto-admin", !visible);
    }
    ;

    // Feedback visual inmediato + popup global, igual que el conmutador de fila,
    // para que "lo veo o no" del popup deje de depender de qué control se use.
    btn.dataset.visible = nuevoEstado ? "1" : "0";
    btn.dataset.cargando = "1";
    btn.disabled = true;
    aplicarIcono(nuevoEstado);
    if (icono) icono.classList.add("fa-spin");
    if (window.PopupReutilizable?.progreso) {
      window.PopupReutilizable.progreso({
        titulo: nuevoEstado ? "Publicando para invitados" : "Ocultando a invitados",
        mensaje: nuevoEstado ? `Se está haciendo público ${archivo || "el archivo"}.` : `Se está retirando ${archivo || "el archivo"} del acceso de invitados.`,
        iconoHtml: nuevoEstado ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-lock"></i>',
        porcentaje: 0,
        actual: nuevoEstado ? "Preparando publicación..." : "Preparando retirada...",
        cerrable: false
      });
    }

    try {
      const res = await Permisos.guardarVisibilidadArchivo(asig, normalizar(tri), seccion, fila, archivo, nuevoEstado);
      if (res?.error) {
        // Revertir: si el backend no aplicó el cambio, el botón no puede
        // quedarse mostrando un estado que no es real.
        aplicarIcono(estadoAnterior);
        btn.dataset.visible = estadoAnterior ? "1" : "0";
        if (window.PopupReutilizable?.progreso) {
          window.PopupReutilizable.progreso({
            titulo: "No se pudo cambiar la visibilidad",
            mensaje: String(res.error),
            iconoHtml: '<i class="fa-solid fa-circle-exclamation"></i>',
            estado: "error",
            porcentaje: 100,
            actual: "La operación no se completó.",
            cerrable: true,
            acciones: [{ texto: "Cerrar", clase: "secundario", onClick: () => window.PopupReutilizable.cerrar() }]
          });
        }
      } else if (window.PopupReutilizable?.progreso) {
        window.PopupReutilizable.progreso({
          titulo: nuevoEstado ? "Contenido visible para invitados" : "Contenido oculto a invitados",
          mensaje: nuevoEstado ? "El archivo ya está disponible para invitados." : "El archivo ya no está disponible para invitados.",
          iconoHtml: nuevoEstado ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-lock"></i>',
          estado: "completado",
          porcentaje: 100,
          actual: "Operación completada.",
          cerrable: true,
          acciones: [{ texto: "Cerrar", clase: "primario", onClick: () => window.PopupReutilizable.cerrar() }]
        });
        setTimeout(() => window.PopupReutilizable?.cerrar?.(), 1600);
      }
    } catch (err) {
      aplicarIcono(estadoAnterior);
      btn.dataset.visible = estadoAnterior ? "1" : "0";
      if (window.PopupReutilizable?.progreso) {
        window.PopupReutilizable.progreso({
          titulo: "No se pudo cambiar la visibilidad",
          mensaje: err?.message || String(err),
          iconoHtml: '<i class="fa-solid fa-circle-exclamation"></i>',
          estado: "error",
          porcentaje: 100,
          actual: "La operación no se completó.",
          cerrable: true,
          acciones: [{ texto: "Cerrar", clase: "secundario", onClick: () => window.PopupReutilizable.cerrar() }]
        });
      }
      console.error("[BTN-TOGGLE-ARCHIVO] ERROR", err);
    } finally {
      // Pase lo que pase (éxito, error o excepción), la animación/estado de
      // carga de ESTE botón concreto se detiene aquí mismo, sin recargar.
      delete btn.dataset.cargando;
      btn.disabled = false;
      const iconoFinal = btn.querySelector("i");
      if (iconoFinal) iconoFinal.classList.remove("fa-spin");
    }
  }
  );
}
;
window.__mostrarDatosV7Cargado = true;
// Primera inicialización (si la vista de asignatura ya está montada).
try { window.inicializarMostrarDatos(); }
catch (e) { void 0; }
