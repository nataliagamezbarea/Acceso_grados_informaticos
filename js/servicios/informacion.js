function escaparSelectorCSS(valor) {
  const texto = String(valor ?? "");
  try {
    if (globalThis.CSS && typeof globalThis.CSS.escape === "function") return globalThis.CSS.escape(texto);
  } catch (_) {}
  return texto.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
}

window.InformacionGrado = (() =>  {
  const CLAVE_DESCARGA_BOTONES = "descarga_boton_activo_v2";
  const leerDescargasBotones = () => {
    try {
      const raw = localStorage.getItem(CLAVE_DESCARGA_BOTONES);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (_) { return {}; }
  };
  const guardarDescargaBoton = (clave, datos) => {
    if (!clave) return;
    try {
      const obj = leerDescargasBotones();
      obj[clave] = { ...(datos || {}), actualizado: Date.now() };
      localStorage.setItem(CLAVE_DESCARGA_BOTONES, JSON.stringify(obj));
    } catch (_) {}
  };
  const borrarDescargaBoton = (clave) => {
    if (!clave) return;
    try {
      const obj = leerDescargasBotones();
      delete obj[clave];
      localStorage.setItem(CLAVE_DESCARGA_BOTONES, JSON.stringify(obj));
    } catch (_) {}
  };
  const claveDescargaBoton = (rama, trimestre) =>
    `${String(rama || "").trim()}::${String(trimestre || "").trim()}`;
  const estadoDescargaBoton = (clave) => {
    const obj = leerDescargasBotones();
    return obj[clave] || null;
  };
  const aplicarEstadoCargandoBoton = (btn, titulo, activo, pct) => {
    if (!btn) return;
    btn.disabled = Boolean(activo);
    if (activo) {
      btn.classList.add("deshabilitado");
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      btn.title = `${titulo}${pct != null ? ` (${pct}%)` : ""}`;
    } else {
      btn.classList.remove("deshabilitado");
      btn.innerHTML = '<i class="fa-solid fa-download"></i>';
      btn.title = titulo;
    }
  };
  const cargar = async (rama) =>  {
    const r = (rama || (window.RamaActual ? window.RamaActual.obtener() : "") || "").trim();
    const fallback =  {
      titulo: r ? r.replace(/_/g, " ") : "", emoji: "📘", trimestres: [  {
        nombre: "1º Trimestre", valor: "1º Trimestre", emoji: "1️⃣"
      }
      ,  { nombre: "2º Trimestre", valor: "2º Trimestre", emoji: "2️⃣" }
      ,  { nombre: "3º Trimestre", valor: "3º Trimestre", emoji: "3️⃣" }
      ], asignaturas: []
    }
    ;
    if (!r) return fallback;
    try {
      if (window.Permisos) {
        const texto = await window.Permisos.leerCsv("informacion.json", r);
        if (texto) {
          try {
            const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
            if (datos && (datos.titulo || datos.trimestres || datos.asignaturas)) return datos;
          } catch (eJson) {
          }
        }
      }
    } catch (e) {
    }
    return fallback;
  }
  ;
  const pintar = async (rama, contenedorId) =>  {
    let lista = null;
    const esPaginaAsignaturas = window.location.pathname.includes("asignaturas.html");
    if (!esPaginaAsignaturas) {
      if (typeof contenedorId === "string" && contenedorId.trim()) {
        lista = document.getElementById(contenedorId.trim());
      }
      if (!lista) { lista = document.getElementById("lista-trimestres") || document.getElementById("lista-asignaturas"); }
    }
    if (lista && !lista.querySelector(".flex")) { lista.innerHTML = ""; }
    const r = typeof rama === "string" && rama.trim() ? rama.trim() : (window.RamaActual ? window.RamaActual.obtener() : "");
    const datos = (await cargar(r)) ||  {
    }
    ;
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
      if (spanTexto.textContent !== texto) { spanTexto.textContent = texto; }
    }
    if (datos.titulo || r) document.title = datos.titulo || r.replace(/_/g, " ");
    const esAdmin = !!(window.Permisos && window.Permisos.esAdmin);
    const ajustesCfg = window.Ajustes ? window.Ajustes.obtener() :  {
    }
    ;
    let btnCursoH1 = document.getElementById("btn-descargar-curso-h1");
    if (esAdmin && ajustesCfg.descargarCurso && tTitulo) {
      if (!btnCursoH1) {
        btnCursoH1 = document.createElement("span");
        btnCursoH1.id = "btn-descargar-curso-h1";
        btnCursoH1.className = "btn-descarga btn-descarga-curso-h1";
        btnCursoH1.setAttribute("role", "button");
        btnCursoH1.setAttribute("tabindex", "0");
        const obtenerTituloDescarga = (base) =>  {
          const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
          const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado);
          const esLectura = esAdmin && !esVistaInvitado;
          return esLectura ? `${base} (Modo Lectura: todos los archivos)` : `${base} (Modo Invitado: solo visibles)`;
        }
        ;
        btnCursoH1.title = obtenerTituloDescarga("Descargar todo el curso");
        btnCursoH1.innerHTML = '<i class="fa-solid fa-download"></i>';
        const clickHandler = async () =>  {
          if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
          btnCursoH1.classList.add("deshabilitado");
          btnCursoH1.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          try {
            const urls = await window.recogerUrlsMaterial( { rama: r }
  );
            await window.descargarTodosArchivos(urls, (estado, pct) =>  {
              btnCursoH1.title = `Descargando curso (${pct}%)... ${estado}`;
              btnCursoH1.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
            ,  { nombreZip: `${(datos.titulo || "curso").toString().trim() || "curso"}.zip` }
  );
            btnCursoH1.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
          } catch (e) {
            btnCursoH1.innerHTML = '<i class="fa-solid fa-circle-xmark icono-error"></i>';
          } finally {
            setTimeout(() =>  {
              btnCursoH1.classList.remove("deshabilitado");
              btnCursoH1.title = obtenerTituloDescarga("Descargar todo el curso");
              btnCursoH1.innerHTML = '<i class="fa-solid fa-download"></i>';
            }
            , 2500);
          }
        }
        ;
        btnCursoH1.addEventListener("click", clickHandler);
        btnCursoH1.addEventListener("keydown", (e) =>  {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            clickHandler();
          }
        }
  );
        tTitulo.appendChild(document.createTextNode(" "));
        tTitulo.appendChild(btnCursoH1);
      }
    } else if (btnCursoH1 && !btnCursoH1.classList.contains("anim-desaparecer-descarga")) {
      btnCursoH1.classList.add("anim-desaparecer-descarga");
      setTimeout(() => btnCursoH1.remove(), 220);
    }
    let btnVisorGrado = document.getElementById("btn-visor-grado-h1");
    const visorEnGrados = ajustesCfg.visorEnGrados !== false;
    if (esAdmin && ajustesCfg.visorActivo !== false && visorEnGrados && tTitulo) {
      if (!btnVisorGrado) {
        btnVisorGrado = document.createElement("button");
        btnVisorGrado.id = "btn-visor-grado-h1";
        btnVisorGrado.type = "button";
        btnVisorGrado.className = "btn-descarga btn-descarga-curso-h1 btn-visor-contextual btn-visor-grado-h1";
        btnVisorGrado.innerHTML = '<i class="fa-solid fa-file-pen" aria-hidden="true"></i>';
        btnVisorGrado.title = `Abrir visor y gestionar documentos de ${datos.titulo || r.replace(/_/g, " ")}`;
        btnVisorGrado.setAttribute("aria-label", "Abrir visor y gestionar documentos del grado");
        const abrirVisorGrado = () =>  {
          if (typeof window.abrirVisorAdministrador !== "function") return;
          window.abrirVisorAdministrador( { rama: r }
  );
        }
        ;
        btnVisorGrado.addEventListener("click", abrirVisorGrado);
        btnVisorGrado.addEventListener("keydown", (e) =>  {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirVisorGrado();
          }
        }
  );
        tTitulo.appendChild(document.createTextNode(" "));
        tTitulo.appendChild(btnVisorGrado);
      }
    } else if (btnVisorGrado && !btnVisorGrado.classList.contains("anim-desaparecer-descarga")) {
      btnVisorGrado.classList.add("anim-desaparecer-descarga");
      setTimeout(() => btnVisorGrado.remove(), 220);
    }
    if (lista) {
      let listaTrimestres = [];
      if (datos.trimestres && Array.isArray(datos.trimestres) && datos.trimestres.length > 0) {
        listaTrimestres = datos.trimestres.map((t) =>  {
          const nom = typeof t === "string" ? t : (t.nombre || t.valor || "");
          const val = typeof t === "string" ? t : (t.valor || t.nombre || nom);
          return  {
            nombre: nom || val, valor: val || nom, emoji: (typeof t === "object" && t.emoji) || (window.Trimestres ? window.Trimestres.emojiPara(val || nom) : "📘"), enlace: (typeof t === "object" && t.enlace) || null,
          }
          ;
        }
  );
      } else if (window.Trimestres) {
        const disp = await window.Trimestres.obtenerDisponibles(r);
        listaTrimestres = disp.map((t) =>  {
          const nom = typeof t === "string" ? t : (t.nombre || t.valor || "");
          const val = typeof t === "string" ? t : (t.valor || t.nombre || nom);
          return  {
            nombre: nom || val, valor: val || nom, emoji: window.Trimestres.emojiPara(val || nom), enlace: null,
          }
          ;
        }
  );
      }
      if (!listaTrimestres.length) {
        listaTrimestres = [  { nombre: "1º Trimestre", valor: "1º Trimestre", emoji: "1️⃣", enlace: null }
        ,  { nombre: "2º Trimestre", valor: "2º Trimestre", emoji: "2️⃣", enlace: null }
        ,  { nombre: "3º Trimestre", valor: "3º Trimestre", emoji: "3️⃣", enlace: null }
        , ];
      }
      const enModulos = window.location.pathname.includes("/modulos/") || window.location.pathname.endsWith("/modulos");
      const rutaAsignaturas = "/";
      if (lista) {
        const deberiaReconstruir = lista.dataset.ramaActual !== r || lista.querySelectorAll(".flex").length === 0;
        if (deberiaReconstruir) {
          lista.innerHTML = "";
          lista.dataset.ramaActual = r;
          listaTrimestres.forEach((t) =>  {
            const fila = document.createElement("div");
            fila.className = "flex";
            const texto = t.nombre;
            if (t.enlace) { fila.innerHTML = `
<strong>${t.emoji}</strong> <a href="${t.enlace}" target="_blank" rel="noopener noreferrer"> <span class="texto-trimestre">${texto}</span> </a> `; }
            else {
              fila.innerHTML = `
<strong>${t.emoji}</strong> <a href="${rutaAsignaturas}" data-trimestre="${t.valor}"> <span class="texto-trimestre">${texto}</span> </a> `;
              const enlaceTrimestre = fila.querySelector("a[data-trimestre]");
              enlaceTrimestre.addEventListener("click", (e) =>  {
                e.preventDefault();
                if (window.Estado) window.Estado.navegar(rutaAsignaturas,  {
                  rama: r, trimestre: t.valor, asignatura: ""
                }
  );
                else window.location.href = rutaAsignaturas;
              }
  );
            }
            lista.appendChild(fila);
          }
  );
        }
        const activados = listaTrimestres.length > 0;
        if (esAdmin && activados && ajustesCfg.descargarTodasClases) {
          const obtenerTituloTrimestre = (tVal) =>  {
              const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado);
            return !esVistaInvitado
            ? `Descargar todas las clases del ${tVal} (Modo Lectura: todos los archivos)`
            : `Descargar clases del ${tVal} (Modo Invitado: solo visibles)`;
          }
          ;
          listaTrimestres.forEach((t, idx) =>  {
            const fila = lista.querySelector(`a[data-trimestre="${escaparSelectorCSS(t.valor)}"]`);
            if (!fila) return;
            const cont = fila.closest(".flex");
            if (!cont || cont.querySelector(".btn-descarga-trimestre")) return;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-descarga btn-descarga-trimestre";
            const tituloBase = obtenerTituloTrimestre(t.valor);
            btn.title = tituloBase;
            btn.innerHTML = '<i class="fa-solid fa-download"></i>';
            const claveBotonDescarga = claveDescargaBoton(r, t.valor);
            btn.dataset.descargaClave = claveBotonDescarga;

            // RESTAURACIÓN REAL TRAS F5: si este trimestre estaba descargando,
            // el mismo botón vuelve a mostrarse como "cargando" aunque la
            // lista se haya reconstruido desde cero.
            const persistido = estadoDescargaBoton(claveBotonDescarga);
            if (persistido && persistido.activo === true) {
              aplicarEstadoCargandoBoton(btn, `Descargando ${t.valor}...`, true, persistido.pct ?? 0);
            }

            btn.addEventListener("click", async () =>  {
              if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
              if (btn.disabled) return;
              const jobId = `btn_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
              guardarDescargaBoton(claveBotonDescarga, {
                activo: true, rama: r, trimestre: t.valor, pct: 0, jobId
              });
              aplicarEstadoCargandoBoton(btn, `Descargando ${t.valor}...`, true, 0);
              try {
                const urls = await window.recogerUrlsMaterial( { rama: r, trimestre: t.valor } );
                await window.descargarTodosArchivos(urls, (estado, pct) =>  {
                  guardarDescargaBoton(claveBotonDescarga, {
                    activo: true, rama: r, trimestre: t.valor, pct: Number(pct) || 0, jobId
                  });
                  btn.title = `Descargando ${t.valor} (${pct}%)... ${estado}`;
                  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                  btn.classList.add("deshabilitado");
                },  {
                  jobId,
                  rama: r,
                  trimestre: t.valor,
                  nombreZip: `${idx + 1}_TRIMESTRE_${String(r || "Rama").replace(/[^a-z0-9áéíóúüñ_-]+/gi, "_").replace(/^_+|_+$/g, "")}_${idx + 1}.zip`
                });
                borrarDescargaBoton(claveBotonDescarga);
                btn.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
              } catch (e) {
                borrarDescargaBoton(claveBotonDescarga);
                btn.innerHTML = "❌";
              } finally {
                setTimeout(() =>  {
                  btn.disabled = false;
                  btn.classList.remove("deshabilitado");
                  btn.title = tituloBase;
                  btn.innerHTML = '<i class="fa-solid fa-download"></i>';
                }, 2500);
              }
            });
            cont.appendChild(btn);
          }
  );
        } else {
          const viejosBtn = lista.querySelectorAll(".btn-descarga-trimestre");
          viejosBtn.forEach((b) =>  {
            if (!b.classList.contains("anim-desaparecer-descarga")) {
              b.classList.add("anim-desaparecer-descarga");
              setTimeout(() => b.remove(), 220);
            }
          }
  );
        }
        const visorTrimestreActivo = esAdmin && ajustesCfg.visorActivo !== false && ajustesCfg.visorEnTrimestres !== false;
        listaTrimestres.forEach((t) =>  {
          const enlace = lista.querySelector(`a[data-trimestre="${escaparSelectorCSS(t.valor)}"]`);
          const cont = enlace && enlace.closest(".flex");
          if (!cont) return;
          let visor = cont.querySelector(".btn-visor-trimestre");
          if (visorTrimestreActivo) {
            if (!visor && typeof window.crearBotonVisorContextual === "function") {
              visor = window.crearBotonVisorContextual( {
                rama: r, trimestre: t.valor, etiqueta: `Abrir visor: ${t.nombre || t.valor}`
              }
  );
              visor.classList.add("btn-visor-trimestre");
              const descarga = cont.querySelector(".btn-descarga-trimestre");
              if (descarga && descarga.nextSibling) { cont.insertBefore(visor, descarga.nextSibling); }
              else { cont.appendChild(visor); }
            }
          } else if (visor) {
            visor.remove();
          }
        }
  );
      }
    }
    if (emojiCambiado && window.ParsearEmojis && typeof window.ParsearEmojis === "function") {
      window.ParsearEmojis();
    }
    return datos;
  }
  ;
  window.__pintarClase = () => pintar();
  // IMPORTANTE: cambiar EDITAR/LECTURA NO repinta los trimestres.
  // Los trimestres mantienen exactamente su estado actual; el modo de edición
  // solo afecta a los controles de edición que ya estén renderizados.
  return  { cargar, pintar }
  ;
}
)();
window.addEventListener("csv-cache-actualizado", (e) =>  { const d = e?.detail ||  { }
  ;
  const rama = window.RamaActual?.obtener?.() || window.Estado?.obtener?.("rama") || "";
  if (!rama || d.rama !== rama) return;
  if (typeof window.__pintarClase === "function" && window.AppViews?.obtener?.() === "clase") {
    Promise.resolve(window.__pintarClase()).catch(() =>  {
    }
  );
  }
}
  );
