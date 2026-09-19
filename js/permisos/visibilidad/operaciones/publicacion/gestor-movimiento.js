/*
 * MÓDULO: Operaciones - Gestor de Movimiento
 * Publicación (privado -> público) y Ocultación (público -> privado) de filas y archivos.
 */
(function (global) {
  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};

  const normalizar = (v) =>
    getMod("Normalizacion").normalizar ? getMod("Normalizacion").normalizar(v) : String(v ?? "").trim().toLowerCase();

  const normalizarTrimestre = (v) =>
    getMod("Normalizacion").normalizarTrimestre ? getMod("Normalizacion").normalizarTrimestre(v) : String(v ?? "").trim().toLowerCase();

  const claveFila = (s, f) =>
    getMod("Normalizacion").claveFila ? getMod("Normalizacion").claveFila(s, f) : `${s}|${f?.ASIGNATURA}|${f?.TRIMESTRE}|${f?.NOMBRE}|${f?.ARCHIVO || ""}`;

  const archivoDeSeccion = (s) =>
    getMod("Constantes").archivoDeSeccion ? getMod("Constantes").archivoDeSeccion(s) : (String(s).toLowerCase() === "practicas" ? "EJERCICIOS_PRACTICAS_PROYECTOS.csv" : "APUNTES.csv");

  const coincideMovimiento = (f, asignatura, trimestre, nombre) =>
    normalizar(f?.NOMBRE) === normalizar(nombre) &&
    (!asignatura || normalizar(f?.ASIGNATURA) === normalizar(asignatura)) &&
    (!trimestre || normalizarTrimestre(f?.TRIMESTRE) === normalizarTrimestre(trimestre));

  const mover = async (asignatura, trimestre, seccion, nombres, visible) => {
    if (!global.Permisos?.esAdmin) return { error: "Solo el administrador puede mover material." };

    const repos = getMod("Repositorios");
    const apiGithub = getMod("ApiGithub");
    const historialGithub = getMod("HistorialGithub");
    const procesadorCsv = getMod("ProcesadorCsv");
    const analizadorRutas = getMod("AnalizadorRutas");
    const constructorPublico = getMod("ConstructorPublico");
    const consulta = getMod("ConsultaVisibilidad");

    const rawBranch = repos.ramaActual?.() || "";
    const branch = String(rawBranch).replace(/^refs\/heads\//, "");

    let configPrivada = null;
    try {
      configPrivada = (await repos.cargarConfiguracionPrivadaDesdeSupabase?.()) || {};
    } catch (e) {
      return { error: e?.message || "No se pudo leer configuracion_privada de Supabase." };
    }
    let configPublica = null;
    try {
      configPublica = (await repos.cargarConfiguracionPublicaDesdeSupabase?.()) || {};
    } catch (e) {
      return { error: e?.message || "No se pudo leer configuracion_publica de Supabase." };
    }

    const privado = configPrivada.repo || "";
    const tokenPrivado = configPrivada.token || "";
    const publico = configPublica.repo || "";
    const tokenPublicoLectura = configPublica.token || "";
    const tokenEscrituraPublica = tokenPrivado;

    if (!branch) return { error: "No hay rama seleccionada." };
    if (!privado) return { error: "Falta gh_repo en configuracion_privada." };
    if (!publico) return { error: "Falta gh_repo público." };
    if (!tokenPrivado) return { error: "No hay gh_token en configuracion_privada de Supabase." };
    if (!tokenPublicoLectura) return { error: "No hay gh_token en configuracion_publica de Supabase." };

    console.log("[VISIBILIDAD] INICIANDO MOVIMIENTO:", visible ? "PRIVADO -> PÚBLICO" : "PÚBLICO -> PRIVADO", {
      repoPrivado: privado,
      repoPublico: publico,
      rama: branch,
      tieneToken: Boolean(tokenPrivado)
    });

    const csv = archivoDeSeccion(seccion);
    const nombresSet = new Set((nombres || []).map(normalizar).filter(Boolean));

    const origenRepo = visible ? privado : publico;
    const destinoRepo = visible ? publico : privado;

    const tokenOrigen = tokenPrivado;
    const tokenDestino = tokenPrivado;
    const origen = await procesadorCsv.obtenerFilasRepo(origenRepo, csv, branch, tokenOrigen);
    const destino = await procesadorCsv.obtenerFilasRepo(destinoRepo, csv, branch, tokenDestino);

    let moverRows = [];

    // 1) PRIORIDAD DIRECTA: La fila exacta que ya está renderizada en pantalla (desde GitHub)
    for (const nom of (nombres || [])) {
      const k = `${normalizar(seccion)}|${normalizar(nom)}`;
      const filaMemoria = global.__mapaFilasDetalle?.get?.(k);
      if (filaMemoria) {
        moverRows.push(filaMemoria);
      }
    }
    if (!moverRows.length && typeof sessionStorage !== "undefined") {
      try {
        const temp = sessionStorage.getItem("detalle_temp");
        if (temp) {
          const item = JSON.parse(temp);
          if (item && nombresSet.has(normalizar(item.NOMBRE))) {
            moverRows.push(item);
          }
        }
      } catch (_) {}
    }

    // 2) Si no estaba en memoria, buscar en las filas leídas del repositorio origen
    if (!moverRows.length) {
      moverRows = (origen.rows || []).filter(f =>
        nombresSet.has(normalizar(f?.NOMBRE)) &&
        (!asignatura || normalizar(f?.ASIGNATURA) === normalizar(asignatura)) &&
        (!trimestre || normalizarTrimestre(f?.TRIMESTRE) === normalizarTrimestre(trimestre))
      );
    }

    // Fallback: si por trimestres no coincidiera exacto pero el nombre sí está en el origen
    if (!moverRows.length && (origen.rows || []).length > 0) {
      moverRows = (origen.rows || []).filter(f => nombresSet.has(normalizar(f?.NOMBRE)));
    }

    // Fallback 2: usar la fila que la aplicación tiene cargada mediante lector Permisos.leerCsv
    if (!moverRows.length) {
      try {
        const lector = global.Permisos?.leerCsv;
        if (typeof lector === "function") {
          const cargado = await lector(csv, branch);
          const rowsCargados = Array.isArray(cargado) ? cargado : (cargado?.data || []);
          moverRows = rowsCargados.filter(f =>
            nombresSet.has(normalizar(f?.NOMBRE)) &&
            (!asignatura || normalizar(f?.ASIGNATURA) === normalizar(asignatura))
          );
        }
      } catch (_) {}
    }

    console.log("[VISIBILIDAD] FILAS ENCONTRADAS:", moverRows.length, {
      asignatura,
      trimestre,
      seccion,
      nombres,
      moverRows: moverRows.map(f => f.NOMBRE)
    });

    if (!moverRows.length) {
      await consulta.cargarMapaPublico?.(asignatura, trimestre);
      return { error: null, movidas: 0 };
    }

    const clavesMover = new Set(moverRows.map(f => claveFila(seccion, f)));
    const restantesOrigen = (origen.rows || []).filter(f => !clavesMover.has(claveFila(seccion, f)));
    const existentesDestino = new Set((destino.rows || []).map(f => claveFila(seccion, f)));
    const nuevasDestino = (destino.rows || []).slice();
    for (const f of moverRows) {
      const k = claveFila(seccion, f);
      if (!existentesDestino.has(k)) {
        nuevasDestino.push(f);
        existentesDestino.add(k);
      }
    }

    const rutas = Array.from(analizadorRutas.obtenerRutasReferenciadas(moverRows));

    if (visible) {
      // 1) Reescribir el público completo con las filas públicas actuales + las nuevas.
      await constructorPublico.construirEstadoPublico(publico, branch, tokenEscrituraPublica, {
        seccionModificada: normalizar(seccion),
        rowsSeccion: nuevasDestino,
        fieldsSeccion: destino.fields.length ? destino.fields : origen.fields,
        fallbackRepoOrigen: privado,
        fallbackToken: tokenPrivado,
        tokenLecturaPublica: tokenPublicoLectura,
        rutasDesdePrivado: rutas,
        message: `Publicar ${asignatura || ""} - ${seccion}`
      });

      // 2) Solo después de publicar correctamente, retirar fila/archivos del privado.
      await new Promise(resolve => setTimeout(resolve, 800));
      const nuevoOrigenCsv = procesadorCsv.unparseCsv(restantesOrigen, origen.fields.length ? origen.fields : (destino.fields.length ? destino.fields : []));
      await apiGithub.putFile(privado, csv, branch, nuevoOrigenCsv, tokenPrivado, `Retirar del privado ${asignatura || ""} - ${seccion}`, origen.file?.sha);
      for (const ruta of rutas) {
        const referenciasPrivadas = analizadorRutas.obtenerRutasReferenciadas(restantesOrigen);
        if (referenciasPrivadas.has(ruta)) continue;
        const f = await apiGithub.githubFile(privado, ruta, branch, tokenPrivado);
        if (f?.sha) {
          await new Promise(resolve => setTimeout(resolve, 600));
          await apiGithub.deleteFile(privado, ruta, branch, tokenPrivado, f.sha, `Mover a público ${ruta}`);
        }
      }
    } else {
      // 1) Devolver al privado (público -> privado) los archivos de las filas que se ocultan.
      //    La existencia en el privado se comprueba contra el árbol (un solo GET 200,
      //    sin 404s por archivo).
      let arbolPrivado = [];
      try {
        arbolPrivado = (await apiGithub.obtenerArbolRepo?.(privado, branch, tokenPrivado)) || [];
      } catch (_) {}
      const normHide = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      const basesPrivadas = new Set(arbolPrivado.map(x => normHide(String(x.path).split("/").pop())));
      let hayCopias = false;
      for (const ruta of rutas) {
        const baseNorm = normHide(String(ruta).split("/").pop());
        if (basesPrivadas.has(baseNorm)) continue; // ya existe en el privado (mismo nombre)

        const b64 = await apiGithub.githubBlobBase64(publico, ruta, branch, tokenPublicoLectura);
        if (b64) {
          await apiGithub.putFileBase64(privado, ruta, branch, b64, tokenPrivado, `Devolver al privado ${ruta}`, null);
          hayCopias = true;
        }
      }
      if (hayCopias) await new Promise(resolve => setTimeout(resolve, 800));

      // 2) Actualizar el CSV privado con las filas devueltas
      const nuevoPrivadoCsv = procesadorCsv.unparseCsv(nuevasDestino, destino.fields.length ? destino.fields : origen.fields);
      await apiGithub.putFile(privado, csv, branch, nuevoPrivadoCsv, tokenPrivado, `Devolver al privado ${asignatura || ""} - ${seccion}`, destino.file?.sha);

      // 3) Reconstruir público sin la fila retirada
      await new Promise(resolve => setTimeout(resolve, 800));
      await constructorPublico.construirEstadoPublico(publico, branch, tokenEscrituraPublica, {
        accion: "ocultar",
        seccionModificada: normalizar(seccion),
        rowsSeccion: restantesOrigen,
        fieldsSeccion: origen.fields.length ? origen.fields : destino.fields,
        fallbackRepoOrigen: privado,
        fallbackToken: tokenPrivado,
        tokenLecturaPublica: tokenPublicoLectura,
        message: `Ocultar ${asignatura || ""} - ${seccion}`
      });

      // 4) Retirar del público los archivos que ya no se usen en público.
      //    Se usa el árbol del repo público: el borrado se ejecuta SIEMPRE que el
      //    archivo exista en el árbol y no esté referenciado en el CSV público restante.
      const referenciasPublicasRestantes = analizadorRutas.obtenerRutasReferenciadas(restantesOrigen);
      let cierreArbol = [];
      try {
        cierreArbol = (await apiGithub.obtenerArbolRepo?.(publico, branch, tokenEscrituraPublica)) || [];
      } catch (_) {}
      const normHide2 = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      const referenciasPublicasNorm = new Set(Array.from(referenciasPublicasRestantes).map(normHide2));
      const archivosPublicos = new Map(cierreArbol.map(x => [normHide2(x.path), x]));
      const archivosPublicosBase = new Map(cierreArbol.map(x => [normHide2(String(x.path).split("/").pop()), x]));
      for (const ruta of rutas) {
        const rutaNorm = normHide2(ruta);
        const baseNorm = normHide2(String(ruta).split("/").pop());
        if (referenciasPublicasNorm.has(rutaNorm)) continue;
        const entrada = archivosPublicos.get(rutaNorm) || archivosPublicosBase.get(baseNorm);
        if (entrada?.sha) {
          await new Promise(resolve => setTimeout(resolve, 600));
          await apiGithub.deleteFile(publico, entrada.path, branch, tokenEscrituraPublica, entrada.sha, `Retirar de público ${ruta}`);
        }
      }

      // 5) Quitar del historial público los archivos retirados (commit raíz sin padres)
      await new Promise(resolve => setTimeout(resolve, 800));
      await historialGithub.aplanarHistorial(publico, branch, tokenEscrituraPublica, `Limpiar historial de material retirado (${asignatura || ""} - ${seccion})`);
    }

    await consulta.cargarMapaPublico?.(asignatura, trimestre);
    const resultado = { error: null, movidas: moverRows.length };
    console.log("[VISIBILIDAD] RESULTADO FINAL ✅", {
      asignatura,
      trimestre,
      seccion,
      visible,
      movidas: moverRows.length
    });
    return resultado;
  };

  // Cola y deduplicación de operaciones para prevenir colisiones en la API de GitHub
  let colaOperaciones = Promise.resolve();
  const operacionesEnVuelo = new Map();

  const ejecutarEnCola = (clave, operacion) => {
    if (operacionesEnVuelo.has(clave)) {
      return operacionesEnVuelo.get(clave);
    }
    const promesa = colaOperaciones.then(async () => {
      return await operacion();
    }).finally(() => {
      operacionesEnVuelo.delete(clave);
    });
    operacionesEnVuelo.set(clave, promesa);
    colaOperaciones = promesa.catch(() => {});
    return promesa;
  };

  const guardarVisibilidad = async (asignatura, trimestre, seccion, nombre, visible) => {
    const clave = `${normalizar(asignatura)}|${normalizarTrimestre(trimestre)}|${normalizar(seccion)}|${normalizar(nombre)}|${Boolean(visible)}`;
    return ejecutarEnCola(clave, async () => {
      const res = await mover(asignatura, trimestre, seccion, [nombre], Boolean(visible));
      try { global.dispatchEvent?.(new CustomEvent("visibilidad-csv-cambiada", { detail: { asignatura, trimestre, seccion, nombre, visible: Boolean(visible), resultado: res } })); } catch (_) {}
      return res;
    });
  };

  const guardarVisibilidadSeccion = async (asignatura, trimestre, seccion, listaNombres, visible) => {
    const clave = `${normalizar(asignatura)}|${normalizarTrimestre(trimestre)}|${normalizar(seccion)}|${(listaNombres || []).map(normalizar).sort().join(",")}|${Boolean(visible)}`;
    return ejecutarEnCola(clave, async () => {
      const res = await mover(asignatura, trimestre, seccion, listaNombres, Boolean(visible));
      try { global.dispatchEvent?.(new CustomEvent("visibilidad-csv-cambiada", { detail: { asignatura, trimestre, seccion, nombres: listaNombres, visible: Boolean(visible), resultado: res } })); } catch (_) {}
      return res;
    });
  };

  const guardarVisibilidadArchivo = async (asignatura, trimestre, seccion, nombreFila, nombreArchivo, visible) =>
    guardarVisibilidad(asignatura, trimestre, seccion, nombreFila, visible);

  const asegurarCsvIniciales = async () => {
    if (!global.Permisos?.esAdmin) return { inicializados: false, motivo: "no-admin" };
    const constantes = getMod("Constantes");
    const csvs = constantes.CSVS || ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"];
    return { inicializados: true, resultado: csvs.map(csv => ({ csv })) };
  };

  const GestorMovimiento = {
    coincideMovimiento,
    mover,
    guardarVisibilidad,
    guardarVisibilidadSeccion,
    guardarVisibilidadArchivo,
    asegurarCsvIniciales
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = GestorMovimiento;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.GestorMovimiento = GestorMovimiento;
})(typeof window !== "undefined" ? window : globalThis);
