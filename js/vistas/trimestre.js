function escaparSelectorCSS(valor) {
  const texto = String(valor ?? "");
  try {
    if (globalThis.CSS && typeof globalThis.CSS.escape === "function") return globalThis.CSS.escape(texto);
  } catch (_) {}
  return texto.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
}



const CLAVE_DESCARGAS_TRIMESTRE_ACTIVAS = "descargas_trimestre_activas_v3";

function _leerDescargasTrimestreActivas() {
  try {
    const raw = localStorage.getItem(CLAVE_DESCARGAS_TRIMESTRE_ACTIVAS);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
}

function _guardarDescargasTrimestreActivas(data) {
  try {
    if (Array.isArray(data) && data.length) localStorage.setItem(CLAVE_DESCARGAS_TRIMESTRE_ACTIVAS, JSON.stringify(data));
    else localStorage.removeItem(CLAVE_DESCARGAS_TRIMESTRE_ACTIVAS);
  } catch (_) {}
}

function _normalizarTrimestrePersistente(v) {
  return String(v || "").replace(/[ºª°]/g, "").replace(/\btrimestres?\b/gi, "").trim().toLowerCase();
}

function _normalizarTextoPersistente(v) {
  return String(v || "").trim().toLowerCase();
}

function _descargaTrimestreActivaPara(rama, trimestre, asignatura) {
  const r = _normalizarTextoPersistente(rama);
  const t = _normalizarTrimestrePersistente(trimestre);
  const a = _normalizarTextoPersistente(asignatura);
  return _leerDescargasTrimestreActivas().some((x) => {
    if (!x || x.estadoFinal) return false;
    const xr = _normalizarTextoPersistente(x.rama);
    const xt = _normalizarTrimestrePersistente(x.trimestre);
    const xa = _normalizarTextoPersistente(x.asignatura);
    if (xa !== a || xt !== t) return false;
    // Al recargar, si todavía no se ha restaurado la rama, no bloquear la restauración.
    return !xr || !r || xr === r;
  });
}

function _marcarDescargaTrimestreActiva(rama, trimestre, asignatura, nombre, jobId) {
  const actual = _leerDescargasTrimestreActivas().filter((x) => {
    if (!x) return false;
    return !(
      _normalizarTextoPersistente(x.rama) === _normalizarTextoPersistente(rama) &&
      _normalizarTrimestrePersistente(x.trimestre) === _normalizarTrimestrePersistente(trimestre) &&
      _normalizarTextoPersistente(x.asignatura) === _normalizarTextoPersistente(asignatura)
    );
  });
  actual.push({
    rama: String(rama || "").trim(),
    trimestre: String(trimestre || "").trim(),
    asignatura: String(asignatura || "").trim(),
    nombre: String(nombre || "").trim(),
    jobId: String(jobId || "").trim(),
    estado: "Preparando descarga...",
    porcentaje: 5,
    estadoFinal: false,
    timestamp: Date.now()
  });
  _guardarDescargasTrimestreActivas(actual);
}

function _actualizarDescargaTrimestreActiva(jobId, estado, porcentaje) {
  const id = String(jobId || "").trim();
  if (!id) return;
  const actual = _leerDescargasTrimestreActivas();
  let encontrado = false;
  const estadoTxt = String(estado || "");
  const st = estadoTxt.toLowerCase();
  const final = Number(porcentaje) >= 100 || st.includes("completad") || st.includes("error") || st.includes("cancelad") || st.includes("sin archivos");
  for (const x of actual) {
    if (String(x?.jobId || "") !== id) continue;
    x.estado = estadoTxt;
    x.porcentaje = Number(porcentaje) || 0;
    x.estadoFinal = final;
    x.timestamp = Date.now();
    encontrado = true;
  }
  if (encontrado) _guardarDescargasTrimestreActivas(final ? actual.filter((x) => String(x?.jobId || "") !== id) : actual);
}

function _eliminarDescargaTrimestreActiva(rama, trimestre, asignatura, jobId) {
  const r = _normalizarTextoPersistente(rama);
  const t = _normalizarTrimestrePersistente(trimestre);
  const a = _normalizarTextoPersistente(asignatura);
  const id = String(jobId || "").trim();
  const restantes = _leerDescargasTrimestreActivas().filter((x) => {
    if (!x) return false;
    const mismo = (
      _normalizarTextoPersistente(x.rama) === r &&
      _normalizarTrimestrePersistente(x.trimestre) === t &&
      _normalizarTextoPersistente(x.asignatura) === a
    );
    if (mismo) return false;
    if (id && String(x.jobId || "") === id) return false;
    return true;
  });
  _guardarDescargasTrimestreActivas(restantes);
}

function inicializarVistaTrimestre() {
  try {
    const listaInicial = document.getElementById("lista-asignaturas");
    if (listaInicial) listaInicial.innerHTML = '<p class="cargando" role="status" aria-live="polite"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</p>';
  } catch (_) {}
  const urlParamsTrimestre = new URLSearchParams(window.location.search);
  const trimestre = urlParamsTrimestre.get("trimestre") || (window.Estado ? window.Estado.obtener("trimestre") : "") || "1";
  const rama = urlParamsTrimestre.get("rama") || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");
  if (urlParamsTrimestre.get("trimestre") && window.Estado) window.Estado.guardar("trimestre", trimestre);
  if (urlParamsTrimestre.get("rama")) {
    if (window.Estado) window.Estado.guardar("rama", rama);
    if (window.RamaActual) window.RamaActual.guardar(rama);
  }
  const emojiSpan = document.getElementById("emoji-trimestre");
  const numeroTrimestreSpan = document.getElementById("numero-trimestre");
  if (emojiSpan) {
    emojiSpan.textContent = window.Trimestres ? window.Trimestres.emojiPara(trimestre) : ( {
      "1": "1️⃣", "2": "2️⃣", "3": "3️⃣"
    }
    [String(trimestre).match(/\d+/)?.[0]] || "📚");
  }
  if (numeroTrimestreSpan) { numeroTrimestreSpan.textContent = trimestre; }
  const cargarInformacion = async (r) =>  {
    const fallback =  {
      titulo: (r || "").replace(/_/g, " "), emoji: "📘", trimestres: [  {
        nombre: "1º Trimestre", valor: "1º Trimestre", emoji: "1️⃣"
      }
      ,  { nombre: "2º Trimestre", valor: "2º Trimestre", emoji: "2️⃣" }
      ,  { nombre: "3º Trimestre", valor: "3º Trimestre", emoji: "3️⃣" }
      ], asignaturas: []
    }
    ;
    try {
      if (window.Permisos) {
        const texto = await window.Permisos.leerCsv("informacion.json", r);
        if (texto) {
          try {
            const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
            if (datos) return datos;
          } catch (eJ) {
          }
        }
      }
    } catch (e) {
    }
    try {
      const res = await fetch(`/api/informacion?rama=${encodeURIComponent(r)}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {
    }
    if (window.InformacionGrado) {
      const datosInf = await window.InformacionGrado.cargar(r);
      if (datosInf) return datosInf;
    }
    return fallback;
  }
  ;
  const normalizar = (v) => window.Trimestres
  ? window.Trimestres.normalizar(v)
  : (v || "") .replace(/[ºª]/g, "") .replace(/\btrimestres?\b/gi, "") .trim() .toLowerCase();
  const asignaturasConDatos = async (asignaturas) =>  {
    const tri = normalizar(trimestre);
    const set = new Set();
    let leidos = 0;
    for (const archivo of ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"]) {
      try {
        const texto = await Permisos.leerCsv(archivo, rama);
        if (!texto) continue;
        leidos++;
        const filas = Papa.parse(texto,  {
          header: true, skipEmptyLines: true, delimiter: ",", quotes: true,
        }
        ).data;
        filas.forEach((f) =>  {
          if (tri && normalizar(f.TRIMESTRE) !== tri && f.TRIMESTRE) return;
          const v = (f.ASIGNATURA || "").trim().toLowerCase();
          (asignaturas || []).forEach((a) =>  {
            const cod = String(a.codigo || "").trim().toLowerCase();
            const nom = String(a.nombre || "").trim().toLowerCase();
            if (v === cod || v === nom || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom))) {
              set.add(a.codigo);
            }
          }
  );
        }
  );
      } catch (e) {
      }
    }
    return  { set, pudoLeer: leidos > 0 }
    ;
  }
  ;
  return (async () =>  {
    const lista = document.getElementById("lista-asignaturas");
    if (!lista) return;
    lista.innerHTML = '<p class="cargando"><i class="fa-solid fa-spinner fa-spin"></i> Cargando asignaturas...</p>';
    const datos = await cargarInformacion(rama);
    if (!datos) {
      lista.innerHTML = "<p>No hay datos disponibles para esta rama.</p>";
      return;
    }
    if (datos.trimestres && Array.isArray(datos.trimestres)) {
      const normTri = normalizar(trimestre);
      const encontrado = datos.trimestres.find( (t) => normalizar(t.valor) === normTri || normalizar(t.nombre) === normTri );
      if (encontrado) {
        if (numeroTrimestreSpan && encontrado.nombre) {
          numeroTrimestreSpan.textContent = encontrado.nombre;
        }
        if (emojiSpan && encontrado.emoji) { emojiSpan.textContent = encontrado.emoji; }
      }
    }
    const  { set: conDatos }
    = await asignaturasConDatos(datos.asignaturas || []);
    lista.innerHTML = '<p class="cargando"><i class="fa-solid fa-spinner fa-spin"></i> Cargando asignaturas...</p>';
    let visibles = (datos.asignaturas && datos.asignaturas.length > 0)
    ? datos.asignaturas
    : [];
    if (!visibles.length) {
      const mapaExtraidas = new Map();
      const triNorm = normalizar(trimestre);
      for (const csvNombre of ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"]) {
        try {
          const texto = await Permisos.leerCsv(csvNombre, rama);
          if (!texto) continue;
          const filas = Papa.parse(texto,  {
            header: true, skipEmptyLines: true, delimiter: ",", quotes: true
          }
          ).data;
          filas.forEach((f) =>  {
            if (triNorm && f.TRIMESTRE && normalizar(f.TRIMESTRE) !== triNorm) return;
            const nom = (f.ASIGNATURA || "").trim();
            if (nom && !mapaExtraidas.has(nom.toLowerCase())) {
              const cod = nom.toUpperCase().replace(/\s+/g, "_");
              mapaExtraidas.set(nom.toLowerCase(),  { codigo: cod, nombre: nom }
  );
            }
          }
  );
        } catch (e) {
        }
      }
      visibles = Array.from(mapaExtraidas.values());
    }
    if (!visibles.length) {
      lista.innerHTML = "<p class='sin-archivos-visibles'>No hay asignaturas disponibles para este trimestre.</p>";
      return;
    }
    const aListaUrls = (v) =>  {
      if (!v) return [];
      let arr = [];
      if (Array.isArray(v)) { arr = v.flatMap((x) => String(x).split(/[,;]/)); }
      else { arr = String(v).split(/[,;]/); }
      return arr.map((u) => u.trim()).filter(Boolean);
    }
    ;
    const mapaNombresAsignaturas = new Map();
    (datos.asignaturas || []).forEach((a) =>  {
      if (a && a.codigo) mapaNombresAsignaturas.set(String(a.codigo).toLowerCase(), a.nombre || a.codigo);
    }
  );
    const recogerTodasLasUrls = async () =>  {
      const urls = [];
      const tri = normalizar(trimestre);
      const filtradoInvitado = !(window.Permisos && window.Permisos.esAdmin && !window.Permisos.vistaInvitado);
      const pares = [  { seccion: "apuntes", archivo: "APUNTES.csv" }
      ,  { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv" }
      , ];
      const mapaVisibilidad = new Map();
      if (filtradoInvitado && window.Permisos && typeof window.Permisos.cargarArchivos === "function") {
        const asignaturas = new Set();
        for (const  { archivo }
        of pares) {
          try {
            const texto = await Permisos.leerCsv(archivo, rama);
            if (!texto) continue;
            const filas = Papa.parse(texto,  {
              header: true, skipEmptyLines: true, delimiter: ",", quotes: true,
            }
            ).data;
            filas.forEach((f) =>  {
              const a = String(f.ASIGNATURA || "").trim();
              if (a) asignaturas.add(a);
            }
  );
          } catch (e) {
          }
        }
        for (const a of asignaturas) {
          try {
            const mapa = await window.Permisos.cargarArchivos(a, tri);
            if (mapa && mapa instanceof Map) { mapa.forEach((v, k) => mapaVisibilidad.set(k, Boolean(v))); }
          } catch (e) {
          }
        }
      }
      const filaVisible = (seccion, nombreFila) =>  {
        if (!filtradoInvitado) return true;
        const clave = `${seccion}|${String(nombreFila || "").trim()}`;
        if (mapaVisibilidad.has(clave)) return Boolean(mapaVisibilidad.get(clave));
        return false;
        // por defecto, para el invitado está oculto
      }
      ;
      const archivoVisible = (seccion, nombreFila, nombreArchivo) =>  {
        if (!filtradoInvitado) return true;
        const clave = `${seccion}|${String(nombreFila || "").trim()}::${String(nombreArchivo || "").trim()}`;
        if (mapaVisibilidad.has(clave)) return Boolean(mapaVisibilidad.get(clave));
        return true;
        // por defecto, el archivo es visible si la fila lo está
      }
      ;
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
            if (tri && f.TRIMESTRE && normalizar(f.TRIMESTRE) !== tri) return;
            const nombreFila = (f.NOMBRE || "").trim();
            if (!filaVisible(seccion, nombreFila)) return;
            const codAsig = String(f.ASIGNATURA || "").trim();
            const nombreAsignatura = mapaNombresAsignaturas.get(codAsig.toLowerCase()) || codAsig;
            aListaUrls(f.ARCHIVO).forEach((u) =>  {
              const nombre = u.split("/").pop() || "archivo";
              if (!archivoVisible(seccion, nombreFila, nombre)) return;
              urls.push( { url: u, nombre, carpeta: nombreAsignatura }
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
    const pintarListaAsignaturas = () =>  {
      const esAdmin = !!(window.Permisos && window.Permisos.esAdmin);
      const cfg = window.Ajustes ? window.Ajustes.obtener() :  {
      }
      ;
      const obtenerTituloModo = (base) =>  {
        const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado);
        return !esVistaInvitado
        ? `${base} (Modo Lectura: todos los archivos)`
        : `${base} (Modo Invitado: solo visibles)`;
      }
      ;
      const filasExistentes = lista.querySelectorAll(".flex");
      const crearEstructura = filasExistentes.length === 0;
      if (crearEstructura) { lista.innerHTML = ""; }
      visibles.forEach((a) =>  {
        let fila = lista.querySelector(`a[data-asignatura="${escaparSelectorCSS(a.codigo)}"]`)?.closest(".flex");
        if (!fila) {
          fila = document.createElement("div");
          fila.className = "flex";
          fila.innerHTML = `
<strong>${a.emoji || "📄"}</strong> <a href="/" data-asignatura="${a.codigo}">${a.nombre}</a> `;
          lista.appendChild(fila);
          const enlaceAsignatura = fila.querySelector("a[data-asignatura]");
          if (enlaceAsignatura) {
            enlaceAsignatura.addEventListener("click", (e) =>  {
              e.preventDefault();
              if (window.AppViews?.mostrar) window.AppViews.mostrar("asignatura",  {
                rama, trimestre, asignatura: a.codigo
              }
  );
              else if (window.Estado) window.Estado.navegar("asignatura.html",  {
                rama, trimestre, asignatura: a.codigo
              }
  );
            }
  );
          }
        }
        let btnAsigTri = fila.querySelector(".btn-descarga-asignatura-trimestre");
        if (esAdmin && cfg.descargarAsignatura) {
          if (!btnAsigTri) {
            btnAsigTri = document.createElement("button");
            btnAsigTri.type = "button";
            btnAsigTri.className = "btn-descarga btn-descarga-asignatura-trimestre";
            const restaurarCarga = () => {
              if (!_descargaTrimestreActivaPara(rama, trimestre, a.codigo)) return;
              btnAsigTri.disabled = true;
              btnAsigTri.title = `Descargando ${a.nombre} (${trimestre})...`;
              btnAsigTri.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            };
            btnAsigTri.title = obtenerTituloModo(`Descargar ${a.nombre} (${trimestre})`);
            btnAsigTri.innerHTML = '<i class="fa-solid fa-download"></i>';
            restaurarCarga();
            btnAsigTri.addEventListener("click", async () =>  {
              if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
              const jobId = `dl_tri_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              _marcarDescargaTrimestreActiva(rama, trimestre, a.codigo, a.nombre, jobId);
              btnAsigTri.disabled = true;
              btnAsigTri.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
              try {
                const urls = await window.recogerUrlsMaterial( { rama, asignatura: a.codigo, trimestre }
  );
                await window.descargarTodosArchivos(urls, (estado, pct) =>  {
                  btnAsigTri.title = `Descargando ${a.nombre} (${pct}%)... ${estado}`;
                  btnAsigTri.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                  _actualizarDescargaTrimestreActiva(jobId, estado, pct);
                }, { nombreZip: `${a.nombre}_${trimestre}.zip` , rama, jobId });
                btnAsigTri.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
                _eliminarDescargaTrimestreActiva(rama, trimestre, a.codigo, jobId);
              } catch (e) {
                _eliminarDescargaTrimestreActiva(rama, trimestre, a.codigo, jobId);
                btnAsigTri.innerHTML = "❌";
              } finally {
                setTimeout(() =>  {
                  btnAsigTri.disabled = false;
                  btnAsigTri.title = obtenerTituloModo(`Descargar ${a.nombre} (${trimestre})`);
                  btnAsigTri.innerHTML = '<i class="fa-solid fa-download"></i>';
                }
                , 2500);
              }
            }
  );
            fila.appendChild(btnAsigTri);
          } else {
            btnAsigTri.title = obtenerTituloModo(`Descargar ${a.nombre} (${trimestre})`);
          }
        } else if (btnAsigTri && !btnAsigTri.classList.contains("anim-desaparecer-descarga")) {
          btnAsigTri.classList.add("anim-desaparecer-descarga");
          setTimeout(() => btnAsigTri.remove(), 220);
        }
        const visorActivo = cfg.visorActivo !== false && cfg.visorEnTrimestres !== false;
        let visorTri = fila.querySelector(".btn-visor-asignatura-trimestre");
        if (esAdmin && visorActivo) {
          if (!visorTri && typeof window.crearBotonVisorContextual === "function") {
            visorTri = window.crearBotonVisorContextual( {
              rama, asignatura: a.codigo, trimestre, etiqueta: `Abrir visor: ${a.nombre} (${trimestre})`
            }
  );
            visorTri.classList.add("btn-visor-asignatura-trimestre");
            fila.appendChild(visorTri);
          }
        } else if (visorTri) {
          visorTri.remove();
        }
      }
  );
    }
    ;
    window.__pintarTrimestre = () =>  { pintarListaAsignaturas(); }
    ;
    // EDITAR/LECTURA no reconstruye la lista de asignaturas/trimestres.
    // Se mantiene intacto el estado de navegación y de descarga.
    window.addEventListener("ajustes-servidor-cargados", () =>  {
      if (typeof window.__pintarTrimestre === "function") {
        Promise.resolve(window.__pintarTrimestre()).catch(() =>  {
        }
  );
      }
    }
  );
    pintarListaAsignaturas();
  }
  )();
}
window.inicializarVistaTrimestre = inicializarVistaTrimestre;
window.addEventListener("csv-cache-actualizado", (e) =>  { const d = e?.detail ||  { }
  ;
  const ramaActual = window.Estado?.obtener?.("rama") || window.RamaActual?.obtener?.() || "";
  if (!ramaActual || d.rama !== ramaActual) return;
  if (typeof window.__pintarTrimestre === "function" && window.AppViews?.obtener?.() === "asignaturas") {
    Promise.resolve(window.__pintarTrimestre()).catch(() =>  {
    }
  );
  }
}
  );
