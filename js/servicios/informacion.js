window.InformacionGrado = (() => {
  const cargar = async (rama) => {
    const r = (rama || (window.RamaActual ? window.RamaActual.obtener() : "") || "").trim();
    const fallback = {
      titulo: r ? r.replace(/_/g, " ") : "",
      emoji: "📘",
      trimestres: [
        { nombre: "1º Trimestre", valor: "1º Trimestre", emoji: "1️⃣" },
        { nombre: "2º Trimestre", valor: "2º Trimestre", emoji: "2️⃣" },
        { nombre: "3º Trimestre", valor: "3º Trimestre", emoji: "3️⃣" }
      ],
      asignaturas: []
    };

    if (!r) return fallback;

    try {
      if (window.Permisos) {
        const texto = await window.Permisos.leerCsv("informacion.json", r);
        if (texto) {
          try {
            const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
            if (datos && (datos.titulo || datos.trimestres || datos.asignaturas)) return datos;
          } catch (eJson) {}
        }
      }
    } catch (e) {}

    return fallback;
  };

  const pintar = async (rama, contenedorId) => {
    let lista = null;
    const esPaginaAsignaturas = window.location.pathname.includes("asignaturas.html");
    if (!esPaginaAsignaturas) {
      if (typeof contenedorId === "string" && contenedorId.trim()) {
        lista = document.getElementById(contenedorId.trim());
      }
      if (!lista) {
        lista = document.getElementById("lista-trimestres") || document.getElementById("lista-asignaturas");
      }
    }

    if (lista && !lista.querySelector(".flex")) {
      lista.innerHTML = "<p class='mensaje-cargando'>Cargando trimestres...</p>";
    }

    const r = typeof rama === "string" && rama.trim() ? rama.trim() : (window.RamaActual ? window.RamaActual.obtener() : "");
    const datos = (await cargar(r)) || {};
    const tEmoji = document.getElementById("emoji-grado");
    const tTitulo = document.getElementById("titulo-grado");

    let emojiCambiado = false;
    if (tEmoji) {
      const emojiNuevo = datos.emoji || "📘";
      if (tEmoji.getAttribute("data-emoji-actual") !== emojiNuevo) {
        tEmoji.setAttribute("data-emoji-actual", emojiNuevo);
        tEmoji.textContent = emojiNuevo;
        emojiCambiado = true;
      }
    }

    if (tTitulo) {
      const texto = (datos.titulo || r.replace(/_/g, " ")).trim();
      let spanTexto = tTitulo.querySelector(".titulo-texto");
      if (!spanTexto) {
        tTitulo.innerHTML = "";
        spanTexto = document.createElement("span");
        spanTexto.className = "titulo-texto";
        tTitulo.appendChild(spanTexto);
      }
      if (spanTexto.textContent !== texto) {
        spanTexto.textContent = texto;
      }
    }
    if (datos.titulo || r) document.title = datos.titulo || r.replace(/_/g, " ");

    const esAdmin = !!(window.Permisos && window.Permisos.esAdmin);
    const ajustesCfg = window.Ajustes ? window.Ajustes.obtener() : {};

    let btnCursoH1 = document.getElementById("btn-descargar-curso-h1");
    if (esAdmin && ajustesCfg.descargarCurso && tTitulo) {
      if (!btnCursoH1) {
        btnCursoH1 = document.createElement("span");
        btnCursoH1.id = "btn-descargar-curso-h1";
        btnCursoH1.className = "btn-descarga btn-descarga-curso-h1";
        btnCursoH1.setAttribute("role", "button");
        btnCursoH1.setAttribute("tabindex", "0");
        const obtenerTituloDescarga = (base) => {
          const modoLiveEdicion = localStorage.getItem("modo_edicion_live") === "true";
          const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
          const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado) || modoLiveEdicion;
          const esLectura = esAdmin && !esVistaInvitado;
          return esLectura ? `${base} (Modo Lectura: todos los archivos)` : `${base} (Modo Invitado: solo visibles)`;
        };

        btnCursoH1.title = obtenerTituloDescarga("Descargar todo el curso");
        btnCursoH1.innerHTML = '<i class="fa-solid fa-download"></i>';
        const clickHandler = async () => {
          if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
          btnCursoH1.classList.add("deshabilitado");
          btnCursoH1.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          try {
            const urls = await window.recogerUrlsMaterial({ rama: r });
            await window.descargarTodosArchivos(urls, (estado, pct) => {
              btnCursoH1.title = `Descargando curso (${pct}%)... ${estado}`;
              btnCursoH1.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }, { nombreZip: `${(datos.titulo || "curso").toString().trim() || "curso"}.zip` });
            btnCursoH1.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
          } catch (e) {
            btnCursoH1.innerHTML = '<i class="fa-solid fa-circle-xmark icono-error"></i>';
          } finally {
            setTimeout(() => {
              btnCursoH1.classList.remove("deshabilitado");
              btnCursoH1.title = obtenerTituloDescarga("Descargar todo el curso");
              btnCursoH1.innerHTML = '<i class="fa-solid fa-download"></i>';
            }, 2500);
          }
        };
        btnCursoH1.addEventListener("click", clickHandler);
        btnCursoH1.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickHandler(); } });
        tTitulo.appendChild(document.createTextNode(" "));
        tTitulo.appendChild(btnCursoH1);
      }
    } else if (btnCursoH1 && !btnCursoH1.classList.contains("anim-desaparecer-descarga")) {
      btnCursoH1.classList.add("anim-desaparecer-descarga");
      setTimeout(() => btnCursoH1.remove(), 220);
    }

    if (lista) {
      let listaTrimestres = [];
      if (datos.trimestres && Array.isArray(datos.trimestres) && datos.trimestres.length > 0) {
        listaTrimestres = datos.trimestres.map((t) => ({
          nombre: t.nombre || t.valor,
          valor: t.valor || t.nombre,
          emoji: t.emoji || (window.Trimestres ? window.Trimestres.emojiPara(t.valor || t.nombre) : "📘"),
          enlace: t.enlace || null,
        }));
      } else if (window.Trimestres) {
        const disp = await window.Trimestres.obtenerDisponibles(r);
        listaTrimestres = disp.map((t) => ({
          nombre: t,
          valor: t,
          emoji: window.Trimestres.emojiPara(t),
          enlace: null,
        }));
      }

      if (!listaTrimestres.length) {
        listaTrimestres = [
          { nombre: "1º Trimestre", valor: "1º Trimestre", emoji: "1️⃣", enlace: null },
          { nombre: "2º Trimestre", valor: "2º Trimestre", emoji: "2️⃣", enlace: null },
          { nombre: "3º Trimestre", valor: "3º Trimestre", emoji: "3️⃣", enlace: null },
        ];
      }

      const enModulos = window.location.pathname.includes("/modulos/") || window.location.pathname.endsWith("/modulos");
      const rutaAsignaturas = enModulos ? "asignaturas.html" : "modulos/asignaturas.html";

      if (lista) {
        const deberiaReconstruir = lista.dataset.ramaActual !== r || lista.querySelectorAll(".flex").length === 0;
        if (deberiaReconstruir) {
          lista.innerHTML = "";
          lista.dataset.ramaActual = r;
          listaTrimestres.forEach((t) => {
            const fila = document.createElement("div");
            fila.className = "flex";
            const texto = t.nombre;
            if (t.enlace) {
              fila.innerHTML = `
                <strong>${t.emoji}</strong>
                <a href="${t.enlace}" target="_blank" rel="noopener noreferrer">
                  <span class="texto-trimestre">${texto}</span>
                </a>
              `;
            } else {
              fila.innerHTML = `
                <strong>${t.emoji}</strong>
                <a href="${rutaAsignaturas}?trimestre=${encodeURIComponent(t.valor)}&rama=${encodeURIComponent(r)}"
                   data-trimestre="${t.valor}">
                  <span class="texto-trimestre">${texto}</span>
                </a>
              `;
            }
            lista.appendChild(fila);
          });
        }

        const activados = listaTrimestres.length > 0;

        if (esAdmin && activados && ajustesCfg.descargarTodasClases) {
          const obtenerTituloTrimestre = (tVal) => {
            const modoLiveEdicion = localStorage.getItem("modo_edicion_live") === "true";
            const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado) || modoLiveEdicion;
            return !esVistaInvitado
              ? `Descargar todas las clases del ${tVal} (Modo Lectura: todos los archivos)`
              : `Descargar clases del ${tVal} (Modo Invitado: solo visibles)`;
          };

          listaTrimestres.forEach((t) => {
            const fila = lista.querySelector(`a[data-trimestre="${CSS.escape(t.valor)}"]`);
            if (!fila) return;
            const cont = fila.closest(".flex");
            if (!cont || cont.querySelector(".btn-descarga-trimestre")) return;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-descarga btn-descarga-trimestre";
            btn.title = obtenerTituloTrimestre(t.valor);
            btn.innerHTML = '<i class="fa-solid fa-download"></i>';
            btn.addEventListener("click", async () => {
              if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
              btn.disabled = true;
              btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
              try {
                const urls = await window.recogerUrlsMaterial({ rama: r, trimestre: t.valor });
                await window.descargarTodosArchivos(urls, (estado, pct) => {
                  btn.title = `Descargando ${t.valor} (${pct}%)... ${estado}`;
                  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                }, { nombreZip: `${t.nombre || t.valor}.zip` });
                btn.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
              } catch (e) {
                btn.innerHTML = "❌";
              } finally {
                setTimeout(() => {
                  btn.disabled = false;
                  btn.title = obtenerTituloTrimestre(t.valor);
                  btn.innerHTML = '<i class="fa-solid fa-download"></i>';
                }, 2500);
              }
            });
            cont.appendChild(btn);
          });
        } else {
          const viejosBtn = lista.querySelectorAll(".btn-descarga-trimestre");
          viejosBtn.forEach((b) => {
            if (!b.classList.contains("anim-desaparecer-descarga")) {
              b.classList.add("anim-desaparecer-descarga");
              setTimeout(() => b.remove(), 220);
            }
          });
        }
      }
    }

    if (emojiCambiado && window.ParsearEmojis && typeof window.ParsearEmojis === "function") {
      window.ParsearEmojis();
    }

    return datos;
  };

  window.__pintarClase = () => pintar();

  return { cargar, pintar };
})();
