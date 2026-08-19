function aListaUrlsLocal(v) {
  if (!v) return [];
  let arr = [];
  if (Array.isArray(v)) arr = v.flatMap((x) => String(x).split(/[,;]/));
  else arr = String(v).split(/[,;]/);
  return arr.map((u) => u.trim()).filter(Boolean);
}

function normalizarTrimestreLocal(v) {
  return window.Trimestres
    ? window.Trimestres.normalizar(v)
    : String(v || "")
        .replace(/[ºª]/g, "")
        .replace(/\btrimestres?\b/gi, "")
        .trim()
        .toLowerCase();
}

async function recogerUrlsMaterial(opts) {
  const o = opts || {};
  const r = o.rama ||
    (window.Estado ? window.Estado.obtener("rama") : "") ||
    (window.RamaActual ? window.RamaActual.obtener() : "") ||
    "";
  const urls = [];
  const modoLiveEdicion = localStorage.getItem("modo_edicion_live") === "true";
  const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
  const filtradoInvitado = !esAdmin || Boolean(window.Permisos && window.Permisos.vistaInvitado) || modoLiveEdicion;
  const pares = [
    { seccion: "apuntes", archivo: "APUNTES.csv" },
    { seccion: "practicas", archivo: "EJERCICIOS_PRACTICAS_PROYECTOS.csv" },
  ];

  const mapaNombres = new Map();
  try {
    if (window.Permisos && window.Permisos.leerCsv) {
      const texto = await window.Permisos.leerCsv("informacion.json", r);
      if (texto) {
        const datos = JSON.parse(texto.replace(/^\uFEFF/, "").trim());
        (datos.asignaturas || []).forEach((a) => {
          if (a && a.codigo) mapaNombres.set(String(a.codigo).toLowerCase(), a.nombre || a.codigo);
        });
      }
    }
  } catch (e) {}

  const tri = o.trimestre ? normalizarTrimestreLocal(o.trimestre) : "";

  const mapaVisibilidad = new Map();
  if (filtradoInvitado && window.Permisos && typeof window.Permisos.cargarArchivos === "function") {
    const asignaturasSet = new Set();
    for (const { archivo } of pares) {
      try {
        const texto = await window.Permisos.leerCsv(archivo, r);
        if (!texto) continue;
        const filas = Papa.parse(texto, { header: true, skipEmptyLines: true, delimiter: ",", quotes: true }).data;
        filas.forEach((f) => {
          const a = String(f.ASIGNATURA || "").trim();
          if (a) asignaturasSet.add(a);
        });
      } catch (e) {}
    }
    for (const a of asignaturasSet) {
      try {
        const mapa = await window.Permisos.cargarArchivos(a, tri || null);
        if (mapa && mapa instanceof Map) mapa.forEach((v, k) => mapaVisibilidad.set(k, Boolean(v)));
      } catch (e) {}
    }
  }

  const filaVisible = (seccion, nombreFila) => {
    if (!filtradoInvitado) return true;
    const clave = `${seccion}|${String(nombreFila || "").trim()}`;
    if (mapaVisibilidad.has(clave)) return Boolean(mapaVisibilidad.get(clave));
    return false;
  };
  const archivoVisible = (seccion, nombreFila, nombreArchivo) => {
    if (!filtradoInvitado) return true;
    const clave = `${seccion}|${String(nombreFila || "").trim()}::${String(nombreArchivo || "").trim()}`;
    if (mapaVisibilidad.has(clave)) return Boolean(mapaVisibilidad.get(clave));
    return true;
  };

  for (const { seccion, archivo } of pares) {
    try {
      const texto = await window.Permisos.leerCsv(archivo, r);
      if (!texto) continue;
      const filas = Papa.parse(texto, { header: true, skipEmptyLines: true, delimiter: ",", quotes: true }).data;
      filas.forEach((f) => {
        if (tri && f.TRIMESTRE && normalizarTrimestreLocal(f.TRIMESTRE) !== tri) return;
        if (o.asignatura) {
          const v = String(f.ASIGNATURA || "").trim().toLowerCase();
          const cod = String(o.asignatura || "").trim().toLowerCase();
          const nom = (o.nombreAsignatura || mapaNombres.get(cod) || "").trim().toLowerCase();
          const coincide = v === cod || (nom && v === nom) || (nom && v && nom.includes(v)) || (nom && v && v.includes(nom));
          if (!coincide) return;
        }
        const nombreFila = (f.NOMBRE || "").trim();
        if (!filaVisible(seccion, nombreFila)) return;
        const codAsig = String(f.ASIGNATURA || "").trim();
        const nombreAsigZip = mapaNombres.get(codAsig.toLowerCase()) || codAsig || "Material";
        aListaUrlsLocal(f.ARCHIVO).forEach((u) => {
          const nombre = u.split("/").pop() || "archivo";
          if (!archivoVisible(seccion, nombreFila, nombre)) return;
          const nombreLimpio = (filtradoInvitado && window.sanearNombreInvitado)
            ? window.sanearNombreInvitado(nombre, { profesor: f.PROFESOR })
            : nombre;
          urls.push({ url: u, nombre: nombreLimpio, carpeta: nombreAsigZip });
        });
      });
    } catch (e) {}
  }
  return urls;
}

function montarBotonDescargaMasiva(opts) {
  const o = opts || {};
  const zona = document.getElementById(o.zonaId);
  if (!zona) return;
  zona.innerHTML = "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-descarga-masiva";
  btn.innerHTML = `<i class="fa-solid fa-download"></i> ${o.texto}`;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.classList.add("cargando");
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando descarga...';
    try {
      const urls = await o.recoger();
      btn.textContent = `Descargando ${urls.length} archivos...`;
      await window.descargarTodosArchivos(urls, (estado) => { btn.textContent = estado; }, { nombreZip: o.nombreZip });
    } catch (e) {
      btn.textContent = "Error al descargar";
    } finally {
      btn.disabled = false;
      btn.classList.remove("cargando");
      setTimeout(() => {
        btn.innerHTML = `<i class="fa-solid fa-download"></i> ${o.texto}`;
      }, 2500);
    }
  });
  zona.appendChild(btn);
}

window.aListaUrlsLocal = aListaUrlsLocal;
window.normalizarTrimestreLocal = normalizarTrimestreLocal;
window.recogerUrlsMaterial = recogerUrlsMaterial;
window.montarBotonDescargaMasiva = montarBotonDescargaMasiva;
