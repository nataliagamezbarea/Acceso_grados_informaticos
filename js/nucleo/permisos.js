window.Permisos = (() => {
  let usuario = null;
  let rol = null;
  try {
    if (sessionStorage.getItem("esAdmin") === "true") {
      rol = "admin";
    }
  } catch (e) {}
  let invitadosActivos = true;

  try { invitadosActivos = localStorage.getItem("invitados_activos_live") !== "false"; } catch (e) {}

  const CLAVE_INVITADOS_ACTIVOS = "invitados_activos_live";
  const CLAVES_AJUSTES = {
    modoOscuro: "modo_oscuro",
    invitados: "invitados_activos",
    descargarTodas: "descargar_todas_clases",
    descargarAsignatura: "descargar_asignatura",
    descargarCurso: "descargar_curso",
    descargarAsignaturaTodos: "descargar_asignatura_todos",
  };
  const BUCKET_CSV = "csv-grados";

  const modoEdicionActivo = () => {
    try { return localStorage.getItem("modo_edicion_live") === "true"; } catch (e) { return false; }
  };

  const ramaActual = () =>
    new URLSearchParams(window.location.search).get("rama") ||
    (window.Estado ? window.Estado.obtener("rama") : "") ||
    (window.RamaActual ? window.RamaActual.obtener() : "") ;

  const esLocal = () => {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  };

  let promesaSesion = null;
  let sesionCargada = false;

  const asegurarSesion = async () => {
    if (!promesaSesion) promesaSesion = cargoSesion();
    try {
      await promesaSesion;
      sesionCargada = true;
    } catch (e) {
      sesionCargada = true;
    }
  };

  const cargoSesion = async () => {
    const cliente = window.PermisosSupabase ? await window.PermisosSupabase.esperarCliente() : null;
    if (!cliente) return;

    await cargarAjustesServidor();

    try {
      let { data: { session } } = await cliente.auth.getSession();
      usuario = session?.user || null;

      if (!usuario) {
        const { data: { user } } = await cliente.auth.getUser();
        usuario = user || null;
      }

      let tokenEncontrado = "";
      let repoEncontrado = "";

      if (cliente && window.PermisosSupabase) {
        try {
          const resToken = await window.PermisosSupabase.consultarTablaConFallback(cliente, "configuracion", (t) =>
            t.select("valor").eq("clave", "gh_token").maybeSingle()
          );
          if (!resToken.error && resToken.data?.valor) {
            tokenEncontrado = String(resToken.data.valor).trim();
          }

          const resRepo = await window.PermisosSupabase.consultarTablaConFallback(cliente, "configuracion", (t) =>
            t.select("valor").eq("clave", "gh_repo").maybeSingle()
          );
          if (!resRepo.error && resRepo.data?.valor) {
            repoEncontrado = String(resRepo.data.valor).trim();
          }
        } catch (e) {}
      }

      const esTokenGithubValido = (t) => t && !String(t).trim().startsWith("ya29.");

      if (!esTokenGithubValido(tokenEncontrado)) tokenEncontrado = "";

      if (!tokenEncontrado && session?.provider_token && session?.user?.app_metadata?.provider === "github") {
        if (esTokenGithubValido(session.provider_token)) {
          tokenEncontrado = String(session.provider_token).trim();
        }
      }

      if (!tokenEncontrado && window.GITHUB_CONFIG && window.GITHUB_CONFIG.token) {
        tokenEncontrado = String(window.GITHUB_CONFIG.token).trim();
      }

      try { localStorage.removeItem("GH_TOKEN"); } catch (e) {}

      if (window.PermisosCrypto) {
        window.PermisosCrypto.asegurarConfigSegura(tokenEncontrado, repoEncontrado);
      }

      if (usuario && window.PermisosGithub) {
        sessionStorage.removeItem("esInvitado");
        const esAdminValido = await window.PermisosGithub.verificarAdmin(usuario, cliente, tokenEncontrado);
        if (esAdminValido || sessionStorage.getItem("esAdmin") === "true") {
          rol = "admin";
          try { sessionStorage.setItem("esAdmin", "true"); } catch (e) {}
          await cargarAjustesServidor();
          if (window.Ajustes && typeof window.Ajustes.asegurarBotonAjustes === "function") {
            window.Ajustes.asegurarBotonAjustes();
          }
          return;
        }
      }

      if (sessionStorage.getItem("esAdmin") === "true") {
        rol = "admin";
        await cargarAjustesServidor();
        if (window.Ajustes && typeof window.Ajustes.asegurarBotonAjustes === "function") {
          window.Ajustes.asegurarBotonAjustes();
        }
        return;
      }

      rol = "invitado";
      try { sessionStorage.setItem("esAdmin", "false"); } catch (e) {}
    } catch (e) {
      if (sessionStorage.getItem("esAdmin") === "true") {
        rol = "admin";
      } else {
        usuario = null;
        rol = "invitado";
      }
    }
  };

  const valoresAjustes = {
    modo_oscuro: false,
    descargar_todas_clases: false,
    descargar_asignatura: false,
    descargar_curso: false,
    descargar_asignatura_todos: false,
  };

  const obtenerAjuste = (clave, def = false) => {
    if (valoresAjustes[clave] !== undefined) return Boolean(valoresAjustes[clave]);
    try {
      const v = localStorage.getItem(`ajustes_${clave}`);
      return v === null ? def : v === "true";
    } catch (e) {
      return def;
    }
  };

  const guardarConfig = async (clave, valor) => {
    const esTrue = Boolean(valor);
    valoresAjustes[clave] = esTrue;
    try { localStorage.setItem(`ajustes_${clave}`, esTrue ? "true" : "false"); } catch (e) {}

    if (clave === "modo_oscuro") {
      try { localStorage.setItem("modo_oscuro", esTrue ? "true" : "false"); } catch (e) {}
    }

    if (rol !== "admin") return;

    const cliente = window.PermisosSupabase ? await window.PermisosSupabase.esperarCliente() : null;
    if (!cliente) return;
    try {
      await window.PermisosSupabase.getTabla(cliente, "configuracion")
        .upsert({ clave, valor: String(esTrue) }, { onConflict: "clave" });
    } catch (e) {}
  };

  const normalizarRamaNombre = (ramaStr) => {
    if (!ramaStr) return "";
    let r = String(ramaStr).trim();
    return r;
  };

  const cargarAjustesServidor = async () => {
    if (!usuario || rol !== "admin") return valoresAjustes;
    const cliente = window.PermisosSupabase ? await window.PermisosSupabase.esperarCliente() : null;
    if (!cliente) return valoresAjustes;
    try {
      const res = await window.PermisosSupabase.consultarTablaConFallback(cliente, "configuracion", (t) =>
        t.select("clave, valor").in("clave", [
          CLAVES_AJUSTES.modoOscuro,
          CLAVES_AJUSTES.invitados,
          CLAVES_AJUSTES.descargarTodas,
          CLAVES_AJUSTES.descargarAsignatura,
          CLAVES_AJUSTES.descargarCurso,
          CLAVES_AJUSTES.descargarAsignaturaTodos,
        ])
      );

      if (!res.error && res.data) {
        res.data.forEach((fila) => {
          if (fila.clave === CLAVES_AJUSTES.invitados) {
            invitadosActivos = fila.valor !== "false";
            try { localStorage.setItem(CLAVE_INVITADOS_ACTIVOS, invitadosActivos ? "true" : "false"); } catch (e) {}
          } else if (fila.clave === CLAVES_AJUSTES.modoOscuro) {
            const esDark = fila.valor === "true";
            valoresAjustes[fila.clave] = esDark;
            if (rol === "admin") {
              try { localStorage.setItem("modo_oscuro", esDark ? "true" : "false"); } catch (e) {}
              if (esDark) document.body.classList.add("modo-oscuro");
              else document.body.classList.remove("modo-oscuro");
            }
          } else {
            const esTrue = fila.valor === "true";
            valoresAjustes[fila.clave] = esTrue;
            try { localStorage.setItem(`ajustes_${fila.clave}`, esTrue ? "true" : "false"); } catch (e) {}
          }
        });
      }
    } catch (e) {}
    return valoresAjustes;
  };

  const leerCsv = async (nombreCsv, rama) => {
    await asegurarSesion();
    const r = ramaActual();
    const claveCache = `cache_file_${r}_${nombreCsv}`;
    let contenidoFresco = null;

    try {
      const config = window.GITHUB_CONFIG || {};
      const tokenSeguro = typeof config.obtenerTokenSeguro === "function" ? config.obtenerTokenSeguro() : (config.token || "");
      if (config.repo && tokenSeguro) {
        const resG = await fetch(
          `https://api.github.com/repos/${config.repo}/contents/${encodeURIComponent(nombreCsv)}?ref=${encodeURIComponent(r)}`,
          {
            headers: {
              Authorization: `Bearer ${tokenSeguro}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
        if (resG.ok) {
          const datos = await resG.json();
          if (datos && datos.content && window.PermisosCrypto) {
            contenidoFresco = window.PermisosCrypto.decodificarBase64(datos.content);
          }
        }
      }
    } catch (e) {}

    if (!contenidoFresco) {
      try {
        const config = window.GITHUB_CONFIG || {};
        const repo = config.repo || "";
        const rawUrl = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(r)}/${encodeURIComponent(nombreCsv)}`;
        const resRaw = await fetch(rawUrl);
        if (resRaw.ok) {
          contenidoFresco = (await resRaw.text()).replace(/^\uFEFF/, "");
        }
      } catch (e) {}
    }

    if (!contenidoFresco && window.supabaseClient) {
      try {
        const rutaSupabase = `${r}/${nombreCsv}`;
        const { data, error } = await window.supabaseClient.storage.from("csv-grados").download(rutaSupabase);
        if (!error && data) {
          contenidoFresco = (await data.text()).replace(/^\uFEFF/, "");
        }
      } catch (eSb) {}
    }

    if (contenidoFresco) {
      try { localStorage.setItem(claveCache, contenidoFresco); } catch (e) {}
      return contenidoFresco;
    }

    try {
      const enCache = localStorage.getItem(claveCache);
      if (enCache) return enCache;
    } catch (e) {}

    return null;
  };

  const listarRamasStorage = async () => {
    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient.storage.from("csv-grados").list("", { limit: 100 });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data
            .map((item) => item.name)
            .filter((n) => n && n !== ".emptyFolderPlaceholder" && String(n).toLowerCase() !== "master");
        }
      }
    } catch (e) {}
    return [];
  };

  return {
    BUCKET_CSV,
    get usuario() { return usuario; },
    get rol() { return rol; },
    get esAdmin() { return rol === "admin"; },
    get vistaInvitado() { return rol === "admin" && modoEdicionActivo(); },
    setVistaInvitado(vista) {
      vistaInvitadoModo = Boolean(vista);
      try { localStorage.setItem("vista_invitado", vistaInvitadoModo ? "true" : "false"); } catch (e) {}
    },
    get invitadosActivos() { return invitadosActivos; },
    setInvitadosActivos(activo) {
      invitadosActivos = Boolean(activo);
      try { localStorage.setItem(CLAVE_INVITADOS_ACTIVOS, invitadosActivos ? "true" : "false"); } catch (e) {}
      guardarConfig(CLAVES_AJUSTES.invitados, invitadosActivos);
    },
    get sesionCargada() { return sesionCargada; },
    cargoSesion,
    asegurarSesion,
    guardarConfig,
    cargarAjustesServidor,
    obtenerAjuste,
    listarRamasStorage,
    cargarArchivos: (a, t) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.cargarArchivos(a, t) : new Map()),
    puedeVer: (s, n) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.puedeVer(s, n, rol === "admin", modoEdicionActivo()) : false),
    esVisibleParaInvitado: (s, n) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.esVisibleParaInvitado(s, n) : false),
    esArchivoVisibleParaInvitado: (s, nf, na) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.esArchivoVisibleParaInvitado(s, nf, na) : true),
    guardarVisibilidad: (a, t, s, n, v) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.guardarVisibilidad(a, t, s, n, v) : { error: null }),
    guardarVisibilidadArchivo: (a, t, s, nf, na, v) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.guardarVisibilidadArchivo(a, t, s, nf, na, v) : { error: null }),
    guardarVisibilidadSeccion: (a, t, s, l, v) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.guardarVisibilidadSeccion(a, t, s, l, v) : { error: null }),
    verificarAdmin: (user, c, t) => (window.PermisosGithub ? window.PermisosGithub.verificarAdmin(user, c, t) : false),
    leerCsv,
    esLocal,
    ramaActual,
  };
})();
