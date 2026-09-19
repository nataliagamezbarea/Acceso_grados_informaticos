/*
 * MÓDULO: Operaciones - Consulta de Visibilidad
 * Consulta y caché del estado de visibilidad pública para invitados.
 */
(function (global) {
  let mapaFilas = new Map();
  let cachePublico = new Map();
  const cargasPublicasEnVuelo = new Map();

  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};

  const normalizar = (v) =>
    getMod("Normalizacion").normalizar ? getMod("Normalizacion").normalizar(v) : String(v ?? "").trim().toLowerCase();

  const normalizarTrimestre = (v) =>
    getMod("Normalizacion").normalizarTrimestre ? getMod("Normalizacion").normalizarTrimestre(v) : String(v ?? "").trim().toLowerCase();

  const claveFila = (s, f) =>
    getMod("Normalizacion").claveFila ? getMod("Normalizacion").claveFila(s, f) : `${s}|${f?.ASIGNATURA}|${f?.TRIMESTRE}|${f?.NOMBRE}|${f?.ARCHIVO || ""}`;

  const archivoDeSeccion = (s) =>
    getMod("Constantes").archivoDeSeccion ? getMod("Constantes").archivoDeSeccion(s) : (String(s).toLowerCase() === "practicas" ? "EJERCICIOS_PRACTICAS_PROYECTOS.csv" : "APUNTES.csv");

  const cargarMapaPublico = async (asignatura, trimestre) => {
    const repos = getMod("Repositorios");
    const apiGithub = getMod("ApiGithub");
    const procesadorCsv = getMod("ProcesadorCsv");

    const r = repos.ramaActual?.() || "";
    const cfgPublica = (await repos.cargarConfiguracionPublicaDesdeSupabase?.()) || {};
    const repoPub = cfgPublica.repo || repos.repoPublico?.() || "";
    const tokenPub = cfgPublica.token || "";
    const claveCarga = `${repoPub}|${r}`;

    mapaFilas = new Map();
    cachePublico = new Map();

    if (!r || !repoPub) return;

    if (cargasPublicasEnVuelo.has(claveCarga)) {
      try { await cargasPublicasEnVuelo.get(claveCarga); } catch (_) {}
      return;
    }

    const trabajo = (async () => {
      const existe = await (apiGithub.ramaPublicaExiste?.(repoPub, r, tokenPub) ?? false);
      if (!existe) return;

      for (const seccion of ["apuntes", "practicas"]) {
        const csv = archivoDeSeccion(seccion);
        const file = await apiGithub.githubFile?.(repoPub, csv, r, tokenPub);
        if (!file) continue;

        const parsed = procesadorCsv.parseCsv?.(file.content) || { data: [] };
        parsed.data.forEach((f) => {
          if (asignatura && normalizar(f.ASIGNATURA) !== normalizar(asignatura)) return;
          if (trimestre && normalizarTrimestre(f.TRIMESTRE) !== normalizarTrimestre(trimestre)) return;

          const key = claveFila(seccion, f);
          mapaFilas.set(key, true);
          cachePublico.set(key, f);
        });
      }
    })();

    cargasPublicasEnVuelo.set(claveCarga, trabajo);
    try {
      await trabajo;
    } finally {
      if (cargasPublicasEnVuelo.get(claveCarga) === trabajo) {
        cargasPublicasEnVuelo.delete(claveCarga);
      }
    }
  };

  const cargarArchivos = async (asignatura, trimestre) => cargarMapaPublico(asignatura, trimestre);

  const esVisibleParaInvitado = (seccion, nombre, asignatura, trimestre) => {
    const s = normalizar(seccion), n = normalizar(nombre), a = normalizar(asignatura), t = normalizarTrimestre(trimestre);
    for (const key of mapaFilas.keys()) {
      const parts = key.split("|");
      const ks = parts[0], ka = parts[1], kt = parts[2], kn = parts[3];
      if (ks === s && kn === n && (!a || ka === a) && (!t || kt === t)) return true;
    }
    return false;
  };

  // Si es admin en MODO LECTURA (modoEdicion === false), debe ver exactamente
  // lo mismo que vería un invitado. Si es admin en modo edición (o no se
  // indica el parámetro, para no romper otras llamadas antiguas), ve todo.
  const puedeVer = (seccion, nombre, esAdmin, modoEdicion) => {
    if (esAdmin) return modoEdicion === false ? esVisibleParaInvitado(seccion, nombre) : true;
    return esVisibleParaInvitado(seccion, nombre);
  };
  const esArchivoVisibleParaInvitado = (seccion, nombreFila) => esVisibleParaInvitado(seccion, nombreFila);

  if (typeof global.addEventListener === "function") {
    global.addEventListener("configuracion-publica-cargada", () => {
      try {
        const repos = getMod("Repositorios");
        const r = repos.ramaActual?.();
        const pub = repos.repoPublico?.();
        if (r && pub) void cargarMapaPublico("", "");
      } catch (_) {}
    });

    global.addEventListener("permisos-sesion-cargada", () => {
      try {
        const repos = getMod("Repositorios");
        const asignatura = global.Estado?.obtener?.("asignatura") || "";
        const trimestre = global.Estado?.obtener?.("trimestre") || "";
        if (repos.repoPublico?.() && repos.ramaActual?.()) void cargarMapaPublico(asignatura, trimestre);
      } catch (_) {}
    });
  }

  const ConsultaVisibilidad = {
    get mapaFilas() { return mapaFilas; },
    get cachePublico() { return cachePublico; },
    cargarMapaPublico,
    cargarArchivos,
    esVisibleParaInvitado,
    puedeVer,
    esArchivoVisibleParaInvitado
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ConsultaVisibilidad;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.ConsultaVisibilidad = ConsultaVisibilidad;
})(typeof window !== "undefined" ? window : globalThis);
