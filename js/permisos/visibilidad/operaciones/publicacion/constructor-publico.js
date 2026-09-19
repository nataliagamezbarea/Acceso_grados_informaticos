/*
 * MÓDULO: Operaciones - Constructor de Estado Público
 * Actualiza el CSV público y sincroniza únicamente los blobs/archivos de las filas seleccionadas
 * desde el repositorio privado hacia el público.
 */
(function (global) {
  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};

  const construirEstadoPublico = async (publico, branch, tokenEscrituraPublico, cambios) => {
    const apiGithub = getMod("ApiGithub");
    const procesadorCsv = getMod("ProcesadorCsv");
    const analizadorRutas = getMod("AnalizadorRutas");
    const constantes = getMod("Constantes");

    const tokenLecturaPublica = String(cambios?.tokenLecturaPublica || "").trim();
    if (!tokenLecturaPublica) throw new Error("No hay gh_token de configuracion_publica para leer el repositorio público.");
    if (!tokenEscrituraPublico) throw new Error("No hay gh_token de configuracion_privada para escribir el repositorio público.");

    const csvPracticas = constantes.CSV_PRACTICAS || "EJERCICIOS_PRACTICAS_PROYECTOS.csv";
    const csvApuntes = constantes.CSV_APUNTES || "APUNTES.csv";
    const csv = cambios.seccionModificada === "practicas" ? csvPracticas : csvApuntes;

    const cleanBranch = String(branch || "").replace(/^refs\/heads\//, "");
    const publicoCsv = await procesadorCsv.obtenerFilasRepo(publico, csv, cleanBranch, tokenLecturaPublica);
    const fields = cambios.fieldsSeccion?.length
      ? cambios.fieldsSeccion
      : (publicoCsv.fields?.length ? publicoCsv.fields : ["ASIGNATURA", "TRIMESTRE", "NOMBRE", "ARCHIVO"]);

    // Solo se modifica el CSV de la sección que se está publicando.
    const csvContent = procesadorCsv.unparseCsv(cambios.rowsSeccion || [], fields);
    await apiGithub.putFile(
      publico,
      csv,
      cleanBranch,
      csvContent,
      tokenEscrituraPublico,
      cambios.message || `Actualizar ${csv}`
    );

    // Pausa para que el commit del CSV se propague en el backend distribuido de GitHub
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Si la acción es ocultar, solo actualizamos el CSV público (no se suben archivos)
    if (cambios.accion === "ocultar" || String(cambios.message || "").toLowerCase().startsWith("ocultar")) {
      return;
    }

    // Subir solo las rutas que vienen de las filas seleccionadas para publicar
    const rutas = cambios?.rutasDesdePrivado?.length
      ? Array.from(new Set(cambios.rutasDesdePrivado))
      : Array.from(analizadorRutas.obtenerRutasReferenciadas(cambios.rowsSeccion || []));
    const rutasDesdePrivado = new Set(cambios?.rutasDesdePrivado || []);

    for (const ruta of rutas) {
      // Para una publicación PRIVADO -> PÚBLICO, el archivo origen se toma
      // siempre directamente del repositorio privado. No se reutiliza ni se
      // comprueba primero el archivo en el público.
      const origenRepo = cambios.fallbackRepoOrigen;
      const origenToken = cambios.fallbackToken || "";
      if (!origenRepo) throw new Error(`No hay repositorio privado de origen para ${ruta}.`);
      if (!origenToken) throw new Error(`No hay gh_token privado para ${ruta}.`);

      const b64 = await apiGithub.githubBlobBase64(
        origenRepo,
        String(ruta || "").replace(/^\/+/, ""),
        cleanBranch,
        origenToken
      );
      if (!b64) throw new Error(`No se pudo leer del privado el archivo ${ruta}.`);

      const rutaLimpia = String(ruta || "").replace(/^\/+/, "");
      await apiGithub.putFileBase64(
        publico,
        rutaLimpia,
        cleanBranch,
        b64,
        tokenEscrituraPublico,
        cambios.message || `Publicar ${rutaLimpia}`,
        null
      );

      // Pequeña pausa entre archivos para evitar colisiones en la rama
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  };

  const ConstructorPublico = {
    construirEstadoPublico
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ConstructorPublico;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.ConstructorPublico = ConstructorPublico;
})(typeof window !== "undefined" ? window : globalThis);
