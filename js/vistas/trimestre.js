const urlParams = new URLSearchParams(window.location.search);
const trimestre = urlParams.get("trimestre") || (window.Estado ? window.Estado.obtener("trimestre") : "") || "1";
const rama = urlParams.get("rama") || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");

if (urlParams.get("trimestre") && window.Estado) window.Estado.guardar("trimestre", trimestre);
if (urlParams.get("rama")) {
  if (window.Estado) window.Estado.guardar("rama", rama);
  if (window.RamaActual) window.RamaActual.guardar(rama);
}

const emojiSpan = document.getElementById("emoji-trimestre");
const numeroTrimestreSpan = document.getElementById("numero-trimestre");

if (emojiSpan) {
  emojiSpan.textContent = window.Trimestres ? window.Trimestres.emojiPara(trimestre) : "📘";
}
if (numeroTrimestreSpan) {
  numeroTrimestreSpan.textContent = trimestre;
}

const cargarInformacion = async (r) => {
  const fallback = {
    titulo: (r || "").replace(/_/g, " "),
    emoji: "📘",
    trimestres: [
      { nombre: "1º Trimestre", valor: "1º Trimestre", emoji: "1️⃣" },
      { nombre: "2º Trimestre", valor: "2º Trimestre", emoji: "2️⃣" },
      { nombre: "3º Trimestre", valor: "3º Trimestre", emoji: "3️⃣" }
    ],
    asignaturas: []
  };

  try {
    if (window.Permisos) {
      const texto = await window.Permisos.leerCsv("informacion.json", r);
      if (texto) {
        try {
          const datos = JSON.parse(texto.trim().replace(/^\uFEFF/, ""));
          if (datos) return datos;
        } catch (eJ) {}
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/informacion?rama=${encodeURIComponent(r)}`).catch(() => null);
    if (res && res.ok) return await res.json();
  } catch (e) {}

  if (window.InformacionGrado) {
    const datosInf = await window.InformacionGrado.cargar(r);
    if (datosInf) return datosInf;
  }

  return fallback;
};

const normalizar = (v) =>
  window.Trimestres
    ? window.Trimestres.normalizar(v)
    : (v || "")
        .replace(/[ºª]/g, "")
        .replace(/\btrimestres?\b/gi, "")
        .trim()
        .toLowerCase();

const asignaturasConDatos = async (asignaturas) => {
  const tri = normalizar(trimestre);
  const set = new Set();
  let leidos = 0;

  for (const archivo of ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"]) {
    try {
      const texto = await Permisos.leerCsv(archivo, rama);
      if (!texto) continue;
      leidos++;
      const filas = Papa.parse(texto, {
        header: true,
        skipEmptyLines: true,
        delimiter: ",",
        quotes: true,
      }).data;

      filas.forEach((f) => {
        if (tri && normalizar(f.TRIMESTRE) !== tri && f.TRIMESTRE) return;
        const v = (f.ASIGNATURA || "").trim().toLowerCase();
        (asignaturas || []).forEach((a) => {
          const cod = String(a.codigo || "").trim().toLowerCase();
          const nom = String(a.nombre || "").trim().toLowerCase();
          if (v === cod || v === nom || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom))) {
            set.add(a.codigo);
          }
        });
      });
    } catch (e) {}
  }
  return { set, pudoLeer: leidos > 0 };
};

(async () => {
  const lista = document.getElementById("lista-asignaturas");
  if (!lista) return;

  lista.innerHTML = '<p class="mensaje-cargando">Cargando asignaturas...</p>';

  const datos = await cargarInformacion(rama);
  if (!datos) {
    lista.innerHTML = "<p>No hay datos disponibles para esta rama.</p>";
    return;
  }

  if (datos.trimestres && Array.isArray(datos.trimestres)) {
    const normTri = normalizar(trimestre);
    const encontrado = datos.trimestres.find(
      (t) => normalizar(t.valor) === normTri || normalizar(t.nombre) === normTri
    );
    if (encontrado) {
      if (numeroTrimestreSpan && encontrado.nombre) {
        numeroTrimestreSpan.textContent = encontrado.nombre;
      }
      if (emojiSpan && encontrado.emoji) {
        emojiSpan.textContent = encontrado.emoji;
      }
    }
  }

  const { set: conDatos } = await asignaturasConDatos(datos.asignaturas || []);

  lista.innerHTML = "";

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
        const filas = Papa.parse(texto, { header: true, skipEmptyLines: true, delimiter: ",", quotes: true }).data;
        filas.forEach((f) => {
          if (triNorm && f.TRIMESTRE && normalizar(f.TRIMESTRE) !== triNorm) return;
          const nom = (f.ASIGNATURA || "").trim();
          if (nom && !mapaExtraidas.has(nom.toLowerCase())) {
            const cod = nom.toUpperCase().replace(/\s+/g, "_");
            mapaExtraidas.set(nom.toLowerCase(), { codigo: cod, nombre: nom });
          }
        });
      } catch (e) {}
    }
    visibles = Array.from(mapaExtraidas.values());
  }

  if (!visibles.length) {
    lista.innerHTML = "<p class='sin-archivos-visibles'>No hay asignaturas disponibles para este trimestre.</p>";
    return;
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

  const mapaNombresAsignaturas = new Map();
  (datos.asignaturas || []).forEach((a) => {
    if (a && a.codigo) mapaNombresAsignaturas.set(String(a.codigo).toLowerCase(), a.nombre || a.codigo);
  });

  const recogerTodasLasUrls = async () => {
    const urls = [];
    const tri = normalizar(trimestre);
    const filtradoInvitado = !(window.Permisos && window.Permisos.esAdmin && !window.Permisos.vistaInvitado);
    const pares = [
      { seccion: "apuntes", archivo: "APUNTES.csv" },
      { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv" },
    ];

    const mapaVisibilidad = new Map();
    if (filtradoInvitado && window.Permisos && typeof window.Permisos.cargarArchivos === "function") {
      const asignaturas = new Set();
      for (const { archivo } of pares) {
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
            const a = String(f.ASIGNATURA || "").trim();
            if (a) asignaturas.add(a);
          });
        } catch (e) {}
      }
      for (const a of asignaturas) {
        try {
          const mapa = await window.Permisos.cargarArchivos(a, tri);
          if (mapa && mapa instanceof Map) {
            mapa.forEach((v, k) => mapaVisibilidad.set(k, Boolean(v)));
          }
        } catch (e) {}
      }
    }

    const filaVisible = (seccion, nombreFila) => {
      if (!filtradoInvitado) return true;
      const clave = `${seccion}|${String(nombreFila || "").trim()}`;
      if (mapaVisibilidad.has(clave)) return Boolean(mapaVisibilidad.get(clave));
      return false; // por defecto, para el invitado está oculto
    };
    const archivoVisible = (seccion, nombreFila, nombreArchivo) => {
      if (!filtradoInvitado) return true;
      const clave = `${seccion}|${String(nombreFila || "").trim()}::${String(nombreArchivo || "").trim()}`;
      if (mapaVisibilidad.has(clave)) return Boolean(mapaVisibilidad.get(clave));
      return true; // por defecto, el archivo es visible si la fila lo está
    };

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
          if (tri && f.TRIMESTRE && normalizar(f.TRIMESTRE) !== tri) return;
          const nombreFila = (f.NOMBRE || "").trim();
          if (!filaVisible(seccion, nombreFila)) return;
          const codAsig = String(f.ASIGNATURA || "").trim();
          const nombreAsignatura = mapaNombresAsignaturas.get(codAsig.toLowerCase()) || codAsig;
          aListaUrls(f.ARCHIVO).forEach((u) => {
            const nombre = u.split("/").pop() || "archivo";
            if (!archivoVisible(seccion, nombreFila, nombre)) return;
            urls.push({ url: u, nombre, carpeta: nombreAsignatura });
          });
        });
      } catch (e) {}
    }
    return urls;
  };

  const pintarListaAsignaturas = () => {
    const esAdmin = !!(window.Permisos && window.Permisos.esAdmin);
    const cfg = window.Ajustes ? window.Ajustes.obtener() : {};

    const obtenerTituloModo = (base) => {
      const modoLiveEdicion = localStorage.getItem("modo_edicion_live") === "true";
      const esVistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado) || modoLiveEdicion;
      return !esVistaInvitado
        ? `${base} (Modo Lectura: todos los archivos)`
        : `${base} (Modo Invitado: solo visibles)`;
    };

    const filasExistentes = lista.querySelectorAll(".flex");
    const crearEstructura = filasExistentes.length === 0;
    if (crearEstructura) {
      lista.innerHTML = "";
    }

    visibles.forEach((a) => {
      let fila = lista.querySelector(`a[data-asignatura="${CSS.escape(a.codigo)}"]`)?.closest(".flex");
      if (!fila) {
        fila = document.createElement("div");
        fila.className = "flex";
        fila.innerHTML = `
          <strong>${a.emoji || "📄"}</strong>
          <a href="asignatura.html?asignatura=${encodeURIComponent(a.codigo)}&trimestre=${encodeURIComponent(trimestre)}&rama=${encodeURIComponent(rama)}" data-asignatura="${a.codigo}">${a.nombre}</a>
        `;
        lista.appendChild(fila);
      }

      // Gestión del botón de descarga trimestre actual
      let btnAsigTri = fila.querySelector(".btn-descarga-asignatura-trimestre");
      if (esAdmin && cfg.descargarAsignatura) {
        if (!btnAsigTri) {
          btnAsigTri = document.createElement("button");
          btnAsigTri.type = "button";
          btnAsigTri.className = "btn-descarga btn-descarga-asignatura-trimestre";
          btnAsigTri.title = obtenerTituloModo(`Descargar ${a.nombre} (${trimestre})`);
          btnAsigTri.innerHTML = '<i class="fa-solid fa-download"></i>';
          btnAsigTri.addEventListener("click", async () => {
            if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
            btnAsigTri.disabled = true;
            btnAsigTri.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
              const urls = await window.recogerUrlsMaterial({ rama, asignatura: a.codigo, trimestre });
              await window.descargarTodosArchivos(urls, (estado, pct) => {
                btnAsigTri.title = `Descargando ${a.nombre} (${pct}%)... ${estado}`;
                btnAsigTri.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
              }, { nombreZip: `${a.nombre}_${trimestre}.zip` });
              btnAsigTri.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
            } catch (e) {
              btnAsigTri.innerHTML = "❌";
            } finally {
              setTimeout(() => {
                btnAsigTri.disabled = false;
                btnAsigTri.title = obtenerTituloModo(`Descargar ${a.nombre} (${trimestre})`);
                btnAsigTri.innerHTML = '<i class="fa-solid fa-download"></i>';
              }, 2500);
            }
          });
          fila.appendChild(btnAsigTri);
        } else {
          btnAsigTri.title = obtenerTituloModo(`Descargar ${a.nombre} (${trimestre})`);
        }
      } else if (btnAsigTri && !btnAsigTri.classList.contains("anim-desaparecer-descarga")) {
        btnAsigTri.classList.add("anim-desaparecer-descarga");
        setTimeout(() => btnAsigTri.remove(), 220);
      }

      // Gestión del botón de descarga todos los trimestres
      let btnAsigTodos = fila.querySelector(".btn-descarga-asignatura-todos");
      if (esAdmin && cfg.descargarAsignaturaTodos) {
        if (!btnAsigTodos) {
          btnAsigTodos = document.createElement("button");
          btnAsigTodos.type = "button";
          btnAsigTodos.className = "btn-descarga btn-descarga-asignatura-todos";
          btnAsigTodos.title = obtenerTituloModo(`Descargar ${a.nombre} (Todos los trimestres)`);
          btnAsigTodos.innerHTML = '<i class="fa-solid fa-folder-closed"></i>';
          btnAsigTodos.addEventListener("click", async () => {
            if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos) return;
            btnAsigTodos.disabled = true;
            btnAsigTodos.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
              const urls = await window.recogerUrlsMaterial({ rama, asignatura: a.codigo });
              await window.descargarTodosArchivos(urls, (estado, pct) => {
                btnAsigTodos.title = `Descargando ${a.nombre} (${pct}%)... ${estado}`;
                btnAsigTodos.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
              }, { nombreZip: `${a.nombre}_todos_los_trimestres.zip` });
              btnAsigTodos.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
            } catch (e) {
              btnAsigTodos.innerHTML = "❌";
            } finally {
              setTimeout(() => {
                btnAsigTodos.disabled = false;
                btnAsigTodos.title = obtenerTituloModo(`Descargar ${a.nombre} (Todos los trimestres)`);
                btnAsigTodos.innerHTML = '<i class="fa-solid fa-folder-closed"></i>';
              }, 2500);
            }
          });
          fila.appendChild(btnAsigTodos);
        } else {
          btnAsigTodos.title = obtenerTituloModo(`Descargar ${a.nombre} (Todos los trimestres)`);
        }
      } else if (btnAsigTodos && !btnAsigTodos.classList.contains("anim-desaparecer-descarga")) {
        btnAsigTodos.classList.add("anim-desaparecer-descarga");
        setTimeout(() => btnAsigTodos.remove(), 220);
      }
    });
  };

  window.__pintarTrimestre = () => {
    pintarListaAsignaturas();
  };

  pintarListaAsignaturas();
})();
