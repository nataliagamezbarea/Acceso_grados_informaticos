window.PermisosVisibilidad = (() => {
  let mapaFilas = new Map();    // "seccion|nombre" → visible (boolean)
  let mapaArchivos = new Map(); // "seccion|nombre_fila::nombre_archivo" → visible (boolean)
  let filasCache = [];          // array de { id, seccion, nombre } para buscar fila_id

  const ramaActual = () =>
    new URLSearchParams(window.location.search).get("rama") ||
    (window.Estado ? window.Estado.obtener("rama") : "") ||
    (window.RamaActual ? window.RamaActual.obtener() : "") ||
    "";

  // Obtener tabla del esquema grados-informaticos
  // REQUISITO: En Supabase → Settings → API → Exposed schemas → añadir "grados-informaticos"
  const getTabla = (nombre) => {
    const c = window.supabaseClient;
    if (!c) return null;
    try {
      if (typeof c.schema === "function") {
        return c.schema("grados-informaticos").from(nombre);
      }
    } catch (e) {}
    return c.from(nombre);
  };

  const esperarCliente = async () => {
    for (let i = 0; i < 30; i++) {
      if (window.supabaseClient) return window.supabaseClient;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };

  // Carga filas y archivos desde Supabase (estructura normalizada 1:N)
  const cargarArchivos = async (asignatura) => {
    mapaFilas = new Map();
    mapaArchivos = new Map();
    filasCache = [];

    const asigStr = String(asignatura || "").trim();

    const cliente = await esperarCliente();

    const r = ramaActual();

    try {
      // 1. Cargar tabla FILAS (padre)
      let qFilas = getTabla("filas").select("id, seccion, nombre, visible").eq("asignatura", asigStr);
      if (r) qFilas = qFilas.eq("rama", r);
      const { data: filas, error: errFilas } = await qFilas;

      if (errFilas) {
        return;
      }


      if (filas && filas.length > 0) {
        filasCache = filas;
        filas.forEach((f) => {
          mapaFilas.set(`${f.seccion}|${f.nombre}`, f.visible === true);
        });

        // 2. Cargar tabla ARCHIVOS (hija) para las filas encontradas
        const ids = filas.map((f) => f.id).filter(Boolean);
        if (ids.length > 0) {
          const { data: archivos, error: errArch } = await getTabla("archivos")
            .select("fila_id, nombre, visible")
            .in("fila_id", ids);

          if (errArch) {
          } else {
            (archivos || []).forEach((a) => {
              const fila = filas.find((f) => f.id === a.fila_id);
              if (fila) {
                mapaArchivos.set(`${fila.seccion}|${fila.nombre}::${a.nombre}`, a.visible === true);
              }
            });
          }
        }
      }

    } catch (e) {
    }
  };

  // ─── Funciones de consulta 

  const puedeVer = (seccion, nombre, esAdmin, modoEdicion) => {
    if (esAdmin) return true;
    const clave = `${seccion}|${String(nombre || "").trim()}`;
    return mapaFilas.has(clave) ? Boolean(mapaFilas.get(clave)) : false;
  };

  const esVisibleParaInvitado = (seccion, nombre) => {
    const clave = `${seccion}|${String(nombre || "").trim()}`;
    return mapaFilas.has(clave) ? Boolean(mapaFilas.get(clave)) : false;
  };

  const esArchivoVisibleParaInvitado = (seccion, nombreFila, nombreArchivo) => {
    const clave = `${seccion}|${String(nombreFila || "").trim()}::${String(nombreArchivo || "").trim()}`;
    return mapaArchivos.has(clave) ? Boolean(mapaArchivos.get(clave)) : true;
  };

  // Funciones de guardado 

  // Guarda visibilidad de una FILA en la tabla 'filas'
  const guardarVisibilidad = (asignatura, trimestre, seccion, nombre, visible) => {
    const nombreLimpio = String(nombre || "").trim();
    if (!nombreLimpio) return Promise.resolve({ error: "Nombre inválido" });

    const r = ramaActual();
    const asigStr = String(asignatura || "").trim();
    const triStr = String(trimestre || "").trim();

    mapaFilas.set(`${seccion}|${nombreLimpio}`, Boolean(visible));

    (async () => {
      try {
        await esperarCliente();
        const { data, error } = await getTabla("filas").upsert(
          { rama: r, asignatura: asigStr, trimestre: triStr, seccion, nombre: nombreLimpio, visible: Boolean(visible), actualizado_en: new Date().toISOString() },
          { onConflict: "rama,asignatura,trimestre,seccion,nombre" }
        ).select("id").single();
        if (!error && data) {
          // Actualizar cache local con el id devuelto
          const idx = filasCache.findIndex((f) => f.seccion === seccion && f.nombre === nombreLimpio);
          if (idx >= 0) filasCache[idx].id = data.id;
          else filasCache.push({ id: data.id, seccion, nombre: nombreLimpio, visible: Boolean(visible) });
        }U
        if (error) console.warn("Error guardando fila:", error.message);
      } catch (e) {
        console.warn("Excepción guardando fila:", e);
      }
    })();

    return Promise.resolve({ error: null });
  };

  // Guarda visibilidad de un ARCHIVO en la tabla 'archivos' (necesita fila_id)
  const guardarVisibilidadArchivo = (asignatura, trimestre, seccion, nombreFila, nombreArchivo, visible) => {
    const nomFilaLimpio = String(nombreFila || "").trim();
    const nomArchivoLimpio = String(nombreArchivo || "").trim();
    const r = ramaActual();
    const asigStr = String(asignatura || "").trim();
    const triStr = String(trimestre || "").trim();

    mapaArchivos.set(`${seccion}|${nomFilaLimpio}::${nomArchivoLimpio}`, Boolean(visible));

    (async () => {
      try {
        await esperarCliente();

        // 1. Buscar/crear la fila padre para obtener fila_id
        let filaId = (filasCache.find((f) => f.seccion === seccion && f.nombre === nomFilaLimpio) || {}).id;
        if (!filaId) {
          const { data: filaData } = await getTabla("filas")
            .upsert(
              { rama: r, asignatura: asigStr, trimestre: triStr, seccion, nombre: nomFilaLimpio, visible: true, actualizado_en: new Date().toISOString() },
              { onConflict: "rama,asignatura,trimestre,seccion,nombre" }
            ).select("id").single();
          if (filaData) {
            filaId = filaData.id;
            filasCache.push({ id: filaId, seccion, nombre: nomFilaLimpio });
          }
        }

        if (!filaId) { console.warn("No se pudo obtener fila_id para el archivo"); return; }

        // 2. Guardar archivo con fila_id
        const { error } = await getTabla("archivos").upsert(
          { fila_id: filaId, nombre: nomArchivoLimpio, visible: Boolean(visible), actualizado_en: new Date().toISOString() },
          { onConflict: "fila_id,nombre" }
        );
        if (error) console.warn("Error guardando archivo:", error.message);
      } catch (e) {
        console.warn("Excepción guardando archivo:", e);
      }
    })();

    return Promise.resolve({ error: null });
  };

  // Guarda visibilidad de toda una sección (múltiples filas a la vez)
  const guardarVisibilidadSeccion = (asignatura, trimestre, seccion, listaNombres, visible) => {
    const r = ramaActual();
    const asigStr = String(asignatura || "").trim();
    const triStr = String(trimestre || "").trim();

    const nombresReales = (window.__nombresRealesSeccion && window.__nombresRealesSeccion[seccion]) || listaNombres || [];
    const nombresUnicos = Array.from(new Set(nombresReales.map((n) => String(n).trim()).filter(Boolean)));

    nombresUnicos.forEach((nom) => mapaFilas.set(`${seccion}|${nom}`, Boolean(visible)));

    (async () => {
      try {
        await esperarCliente();
        if (nombresUnicos.length === 0) return;
        const registros = nombresUnicos.map((nom) => ({
          rama: r, asignatura: asigStr, trimestre: triStr, seccion,
          nombre: nom, visible: Boolean(visible), actualizado_en: new Date().toISOString(),
        }));
        const { error } = await getTabla("filas").upsert(registros, { onConflict: "rama,asignatura,trimestre,seccion,nombre" });
        if (error) console.warn("Error guardando sección:", error.message);
      } catch (e) {}
    })();

    return Promise.resolve({ error: null });
  };

  return {
    cargarArchivos,
    puedeVer,
    esVisibleParaInvitado,
    esArchivoVisibleParaInvitado,
    guardarVisibilidad,
    guardarVisibilidadArchivo,
    guardarVisibilidadSeccion,
  };
})();
