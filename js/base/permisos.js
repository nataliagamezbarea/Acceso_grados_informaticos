
// Exponer la configuración pública para visibilidad.js sin mezclarla con la privada.
(function(){
function publicarConfigPublica(cfg){
    if (!cfg) return;
    window.CONFIGURACION_PUBLICA = cfg;
    window.CONFIGURACION_PUBLICA_CARGADA = true;
    try { window.dispatchEvent(new CustomEvent("configuracion-publica-cargada",{detail:cfg})); } catch(_){}
  }
  window.publicarConfiguracionPublica = publicarConfigPublica;
})();

window.Permisos = (() =>  {
  let usuario = null;
  let rol = null;
  try {
    if (sessionStorage.getItem("esAdmin") === "true") { rol = "admin"; }
  } catch (e) {
  }
  let invitadosActivos = true;
  try { invitadosActivos = localStorage.getItem("invitados_activos_live") !== "false"; }
  catch (e) {
  }
  const CLAVE_INVITADOS_ACTIVOS = "invitados_activos_live";
  const CLAVES_AJUSTES =  {
    modoOscuro: "modo_oscuro", invitados: "invitados_activos", descargarTodas: "descargar_todas_clases", descargarAsignatura: "descargar_asignatura", descargarCurso: "descargar_curso", descargarAsignaturaTodos: "descargar_asignatura_todos", visorActivo: "visor_activo", visorEnTareas: "visor_en_tareas", visorEnAsignaturas: "visor_en_asignaturas", visorEnTrimestres: "visor_en_trimestres", visorEnGrados: "visor_en_grados", visorEnSelectorRamas: "visor_en_selector_ramas", descargasEnSelectorRamas: "descargas_en_selector_ramas",
  }
  ;
  const BUCKET_CSV = "csv-grados";
  const modoEdicionActivo = () =>  {
    try { return localStorage.getItem("modo_edicion_live") === "true"; }
    catch (e) { return false; }
  }
  ;
  let vistaInvitadoModo = false;
  try { vistaInvitadoModo = localStorage.getItem("vista_invitado") === "true"; } catch (e) {}
  const ramaActual = () => new URLSearchParams(window.location.search).get("rama") || (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "");
  const esLocal = () =>  {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
  }
  ;
  let promesaSesion = null;
  let sesionCargada = false;
  let promesaCargoSesionEnVuelo = null;
  const resetearSesion = () => {
    promesaSesion = null;
    sesionCargada = false;
    usuario = null;
    // No borres el rol visual durante una transición de vista. Si existe una
    // marca de sesión admin, la conservamos hasta tener una comprobación nueva.
    try {
      rol = sessionStorage.getItem("esAdmin") === "true" ? "admin" : null;
    } catch (_) {
      rol = null;
    }
    promesaCargoSesionEnVuelo = null;
  };

  /*
   * Config del INVITADO / lecturas de solo lectura.
   * configuracion_publica es legible por anon y contiene gh_repo + gh_token
   * para LEER la documentación desde GitHub (descargas, CSV, ramas...).
   * Se carga en window.GITHUB_CONFIG para que la UI no dependa de que el
   * admin haya publicado su configuracion_privada.
   */
  const cargarConfigPublicaLocal = async () =>  {
    try {
      const cliente = window.PermisosSupabase
        ? await window.PermisosSupabase.esperarCliente()
        : null;
      if (!cliente) return;
      const res =
        await window.PermisosSupabase.consultarTablaConFallback(
        cliente,
        "configuracion_publica",
        (tabla) =>
        tabla
        .select("clave, valor")
        .in("clave", ["gh_repo", "gh_repo_invitados", "gh_repo_publico", "gh_token"])
    );
      const pub =  {
      }
      ;
      for (const fila of res.data || []) {
        pub[String(fila.clave || "").trim()] = String(fila.valor || "").trim();
      }
      const repo = pub.gh_repo_invitados || pub.gh_repo_publico || pub.gh_repo || "";
      const token = pub.gh_token || "";
      if (!repo && !token) return;
      window.GITHUB_CONFIG =  { ...(window.GITHUB_CONFIG ||  { }
        ),
        repo: repo || "",
        token: "",
        token_general: token || ""
      }
      ;
      if (window.PermisosCrypto) { window.PermisosCrypto.asegurarConfigSegura(token, repo); }
      try {
        window.dispatchEvent(new CustomEvent("configuracion-publica-local",  {
          detail:  { repo, tieneToken: Boolean(token) }
        }
        ));
      } catch (_) {}
    } catch (_) {}
  }
  ;
  const asegurarSesion = async () =>  {
    /*
     * La sesión de Supabase y el perfil de public.perfiles no siempre llegan
     * en el mismo instante (especialmente tras OAuth/recarga). Esperamos a
     * cargoSesion y, si existe usuario pero todavía no tenemos rol admin,
     * damos hasta dos reintentos antes de que una vista protegida decida que
     * no hay permisos. Esto evita falsos "Acceso solo para administradores".
     */
    for (let intento = 0; intento < 3; intento++) {
      if (!promesaSesion || (usuario && rol !== "admin" && intento > 0)) {
        promesaSesion = cargoSesion();
      }
      try { await promesaSesion; }
      catch (_) {
      }
      if (!usuario || rol === "admin" || intento === 2) break;
      await new Promise(r => setTimeout(r, 250 * (intento + 1)));
    }
    sesionCargada = true;
  }
  ;
  const cargoSesion = async () =>  {
    if (promesaCargoSesionEnVuelo) return promesaCargoSesionEnVuelo;
    promesaCargoSesionEnVuelo = (async () => {
      try {
        return await cargoSesionInterno();
      } finally {
        promesaCargoSesionEnVuelo = null;
      }
    })();
    return promesaCargoSesionEnVuelo;
  };
  const cargoSesionInterno = async () =>  {
    // MODO INVITADO: no crea/consulta una sesión de Supabase ni carga
    // configuración del servidor. El invitado es una sesión local de la
    // aplicación identificada únicamente por sessionStorage.
    try {
      if (sessionStorage.getItem("esInvitado") === "true") {
        usuario = null;
        rol = "invitado";
        sesionCargada = true;
        sessionStorage.setItem("esAdmin", "false");
        document.documentElement.dataset.rol = "invitado";
        window.dispatchEvent(new CustomEvent("permisos-sesion-cargada", {
          detail: { rol: "invitado", esAdmin: false }
        }));
        return;
      }
    } catch (_) {}

    let cliente = window.PermisosSupabase
    ? await window.PermisosSupabase.esperarCliente()
    : null;
    // Si el usuario llega aquí desde index.html mediante navegación completa,
    // la memoria JS anterior desaparece, pero Supabase conserva la sesión.
    // Reutilizamos esa sesión persistida: NO mostramos otro login.
    if (!cliente && window.supabase?.createClient) {
      try {
        if (!window.SUPABASE_URL) window.SUPABASE_URL = "https://lztatgnlplpduiatmlrv.supabase.co";
        if (!window.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
        cliente = window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL, window.SUPABASE_ANON_KEY,
        {
          db:  { schema: "grados-informaticos" }
          , auth:  { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        }
  );
      } catch (_) {
      }
    }
    if (!cliente) {
      // Fallo/transición de inicialización: nunca degradas una sesión admin
      // válida a invitado solo porque el cliente aún no esté disponible.
      let adminCache = false;
      try { adminCache = sessionStorage.getItem("esAdmin") === "true"; } catch (_) {}
      rol = adminCache ? "admin" : (document.documentElement.dataset.rol || "invitado");
      sesionCargada = true;
      try { window.SUPABASE_URL = "https://lztatgnlplpduiatmlrv.supabase.co"; } catch (_) {}
      window.dispatchEvent(new CustomEvent("permisos-sesion-cargada", { detail: { rol, esAdmin: rol === "admin" } }));
      document.documentElement.dataset.rol = rol;
      return;
    }
    try {
      const  {
        data:  { session }
      }
      = await cliente.auth.getSession();
      usuario = session?.user || null;
      if (!usuario) {
        try {
          const  { data: userData }
          = await cliente.auth.getUser();
          usuario = userData?.user || null;
        } catch (_) {
        }
      }
      let perfilRol = "";
      let perfilConsultado = false;
      /*
       * El origen de verdad del rol es public.perfiles.
       * NO tratamos el valor por defecto "invitado" de rol_actual()
       * como un rol real: esa función devuelve "invitado" también
       * cuando auth.uid() no encuentra una fila.
       */
      if (usuario) {
        try {
          const resultadoPerfil =
          await window.PermisosSupabase.consultarTablaConFallback(
          cliente,
          "perfiles",
          (tabla) =>
          tabla
          .select("id, email, rol")
          .eq("id", usuario.id)
          .maybeSingle()
  );
          if (
          !resultadoPerfil.error &&
          resultadoPerfil.data
          ) {
            perfilConsultado = true;
            perfilRol = String(
            resultadoPerfil.data.rol || ""
            )
            .trim()
            .toLowerCase();
          } else if (resultadoPerfil.error) {
          }
          /*
           * Respaldo por email. Sirve para cuentas cuyo registro
           * de perfil quedó con un id antiguo, pero mantiene como
           * fuente Supabase, nunca localStorage.
           */
          if (!perfilConsultado) {
            const resultadoEmail =
            await window.PermisosSupabase.consultarTablaConFallback(
            cliente,
            "perfiles",
            (tabla) =>
            tabla
            .select("id, email, rol")
            .eq("email", usuario.email)
            .maybeSingle()
  );
            if (
            !resultadoEmail.error &&
            resultadoEmail.data
            ) {
              perfilConsultado = true;
              perfilRol = String(
              resultadoEmail.data.rol || ""
              )
              .trim()
              .toLowerCase();
            }
          }
          /*
           * Solo si no se pudo consultar el perfil usamos RPC.
           * Un RPC que devuelva "invitado" sin encontrar perfil NO
           * debe pisar un rol válido de public.perfiles.
           */
          if (!perfilConsultado) {
            try {
              const  {
                data: rolRpc,
                error: rpcError
              }
              = await cliente.rpc("rol_actual");
              if (
              !rpcError &&
              rolRpc &&
              String(rolRpc).trim().toLowerCase() !==
              "invitado"
              ) {
                perfilRol = String(rolRpc)
                .trim()
                .toLowerCase();
              }
            } catch (errorRpc) {
            }
          }
        } catch (error) {
        }
      }
      /*
       * Supabase manda. Un valor local "esAdmin=true" solo se
       * conserva como respaldo si Supabase no pudo proporcionar
       * absolutamente ningún dato del rol.
       */
      // Nunca heredamos "esAdmin=true" de una sesión anterior si hay un
      // usuario autenticado cuyo perfil actual no confirma administrador.
      // Evita que un invitado vea EDITAR/LECTURA por un valor antiguo.
      const adminPorSesion =
      !!usuario &&
      !perfilConsultado &&
      !perfilRol &&
      sessionStorage.getItem("esAdmin") === "true";
      if (perfilRol === "admin" || adminPorSesion) {
        rol = "admin";
        sessionStorage.setItem("esAdmin", "true");
      } else {
        rol = "invitado";
        sessionStorage.setItem("esAdmin", "false");
      }
      sesionCargada = true;
      window.dispatchEvent(new CustomEvent("permisos-sesion-cargada", {
        detail: { rol, esAdmin: rol === "admin" }
      }));
      document.documentElement.dataset.rol = rol;

      // Sin usuario autenticado nunca cargamos configuración de servidor.
      // El modo invitado es exclusivamente local; Supabase se usa solo para
      // las cuentas autenticadas, especialmente el administrador.
      // El invitado sí puede leer configuracion_publica (repo + token de
      // solo lectura) para poder descargar material desde GitHub.
      if (!usuario && rol === "invitado") {
        await cargarConfigPublicaLocal();
        return;
      }
      /*
       * La configuración se obtiene SIEMPRE desde Supabase según el rol.
       *
       * ADMIN:
       *   configuracion_privada -> gh_repo + gh_token
       *
       * INVITADO:
       *   configuracion_publica -> gh_repo + gh_token
       */
      const tablaConfiguracion =
      rol === "admin"
      ? "configuracion_privada"
      : "configuracion_publica";
      const resConfiguracion =
      await window.PermisosSupabase.consultarTablaConFallback(
      cliente,
      tablaConfiguracion,
      (tabla) =>
      tabla
      .select("clave, valor")
      .in("clave", ["gh_repo", "gh_repo_general", "gh_token", "gh_token_general"])
  );
      if (resConfiguracion.error) {
      }
      const configuracion =  {
      }
      ;
      for (const fila of resConfiguracion.data || []) {
        configuracion[String(fila.clave)] = String(fila.valor || "").trim();
      }
      const repo = configuracion.gh_repo || "";
      const repoGeneral = configuracion.gh_repo_general || "";
      const token = configuracion.gh_token || "";
      const tokenGeneral = configuracion.gh_token_general || "";
      /*
       * Si configuracion_privada no tiene repo/token (p.ej. el deploy todavía
       * no los ha publicado), se usa la configuracion_publica: su token es de
       * solo lectura pero permite las descargas y la consulta de CSV/ramas.
       */
      if (!repo && !repoGeneral && !token) {
        const resPub =
          await window.PermisosSupabase.consultarTablaConFallback(
          cliente,
          "configuracion_publica",
          (tabla) =>
          tabla
          .select("clave, valor")
          .in("clave", ["gh_repo", "gh_repo_invitados", "gh_repo_publico", "gh_token"])
      );
        const pub =  {
        }
        ;
        for (const fila of resPub.data || []) {
          pub[String(fila.clave || "").trim()] = String(fila.valor || "").trim();
        }
        let repoPublico = pub.gh_repo_invitados || pub.gh_repo_publico || pub.gh_repo || "";
        const tokenPublico = pub.gh_token || "";
        if (repoPublico) repo = repoPublico;
        if (tokenPublico) token = tokenPublico;
      }
      window.GITHUB_CONFIG =  { ...(window.GITHUB_CONFIG ||  { }
        ),
        repo: repo || repoGeneral,
        repo_general: repoGeneral,
        token: token || tokenGeneral,
        token_general: tokenGeneral
      }
      ;
      if (window.PermisosCrypto) { window.PermisosCrypto.asegurarConfigSegura(token, repo); }
      await cargarAjustesServidor();
      if (
      window.Ajustes &&
      typeof window.Ajustes.asegurarBotonAjustes === "function"
      ) { window.Ajustes.asegurarBotonAjustes(); }
      return;
    } catch (error) {
      // No convertir un admin en invitado por un error temporal de red/RPC.
      // Solo una respuesta válida de perfiles puede confirmar que no es admin.
      let adminCache = false;
      try { adminCache = sessionStorage.getItem("esAdmin") === "true"; } catch (_) {}
      rol = adminCache ? "admin" : (document.documentElement.dataset.rol || "invitado");
      sesionCargada = true;
      try { if (rol === "admin") sessionStorage.setItem("esAdmin", "true"); } catch (_) {}
      window.dispatchEvent(new CustomEvent("permisos-sesion-cargada", { detail: { rol, esAdmin: rol === "admin" } }));
      document.documentElement.dataset.rol = rol;
    }
  }
  ;
  const valoresAjustes =  {
    modo_oscuro: false, descargar_todas_clases: false, descargar_asignatura: false, descargar_curso: false, descargar_asignatura_todos: false, visor_activo: true, visor_en_tareas: true, visor_en_asignaturas: true, visor_en_trimestres: true, visor_en_grados: true, visor_en_selector_ramas: true, descargas_en_selector_ramas: true
  }
  ;
  const esInvitadoLocal = () => {
    try { return sessionStorage.getItem("esInvitado") === "true"; }
    catch (_) { return false; }
  };
  const claveAjusteLocal = (clave) => esInvitadoLocal() ? `guest_ajustes_${clave}` : `ajustes_${clave}`;

  const obtenerAjuste = (clave, def = false) =>  {
    // En invitado, el valor local tiene prioridad y no se inicializa desde
    // la configuración del servidor.
    try {
      const claveLocal = claveAjusteLocal(clave);
      const vLocal = localStorage.getItem(claveLocal);
      if (vLocal !== null) return vLocal === "true";
    } catch (_) {}
    if (!esInvitadoLocal() && valoresAjustes[clave] !== undefined) return Boolean(valoresAjustes[clave]);
    return def;
  }
  ;
  const guardarConfig = async (clave, valor) =>  {
    const esTrue = Boolean(valor);
    const invitadoLocal = esInvitadoLocal();
    valoresAjustes[clave] = esTrue;
    try {
      localStorage.setItem(claveAjusteLocal(clave), esTrue ? "true" : "false");
    } catch (e) {}

    if (clave === "modo_oscuro") {
      try {
        if (invitadoLocal) {
          sessionStorage.setItem("guest_modo_oscuro", esTrue ? "true" : "false");
          try { localStorage.removeItem("guest_modo_oscuro"); } catch (_) {}
        } else {
          localStorage.setItem("modo_oscuro", esTrue ? "true" : "false");
        }
      } catch (e) {}
    }

    // El invitado nunca escribe preferencias en Supabase.
    if (invitadoLocal) return;
    if (rol !== "admin" && sessionStorage.getItem("esAdmin") !== "true") return;
    const cliente = window.PermisosSupabase
    ? await window.PermisosSupabase.esperarCliente()
    : null;
    if (!cliente) return;
    try {
      const tablaPrivada = window.PermisosSupabase.getTabla(cliente, "configuracion_privada", "grados-informaticos");
      if (tablaPrivada) {
        await tablaPrivada.upsert(
        { clave, valor: String(esTrue) }
        ,
        { onConflict: "clave" }
  );
      }
      if (clave === "invitados_activos") {
        try {
          const tablaPublica = window.PermisosSupabase.getTabla(cliente, "configuracion_publica", "grados-informaticos");
          if (tablaPublica) {
            await tablaPublica.upsert(
            { clave, valor: String(esTrue) }
            ,
            { onConflict: "clave" }
  );
          }
        } catch (_) {
        }
      }
    } catch (e) {
    }
  }
  ;
  const normalizarRamaNombre = (ramaStr) => {
    if (!ramaStr) return "";
    return String(ramaStr).trim();
  };

  // Las ramas son DINÁMICAS: nunca se debe inventar una rama ni reutilizar
  // una rama de una prueba que ya fue borrada. Validamos contra GitHub cuando
  // la rama seleccionada no coincide con la lista remota.
  const cacheRamasGithub = new Map();
  const obtenerRamasGithub = async (repo, token) => {
    const clave = String(repo || "").trim();
    if (!clave) return [];
    const ahora = Date.now();
    const anterior = cacheRamasGithub.get(clave);
    if (anterior && ahora - anterior.tiempo < 30000) return anterior.ramas;
    try {
      const headers = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`https://api.github.com/repos/${clave}/branches?per_page=100`, {
        headers, cache: "no-store"
      });
      if (!res.ok) return anterior?.ramas || [];
      const datos = await res.json();
      const ramas = Array.isArray(datos)
        ? datos.map(x => String(x?.name || "").trim()).filter(Boolean)
        : [];
      cacheRamasGithub.set(clave, { tiempo: ahora, ramas });
      return ramas;
    } catch (_) {
      return anterior?.ramas || [];
    }
  };

  const validarRamaGithub = async (repo, rama, token) => {
    const solicitada = normalizarRamaNombre(rama);
    if (!repo || !solicitada) return solicitada;
    const ramas = await obtenerRamasGithub(repo, token);
    if (!ramas.length) return solicitada;
    return ramas.some(r => r === solicitada) ? solicitada : "";
  };
   const esVistaLoginOPreboot = () => {
    try {
      const ruta = String(window.location.pathname || "").toLowerCase();
      return (
        ruta.endsWith("/login.html") ||
        ruta.includes("/iniciarsesion.html") ||
        window.__APP_VISTA === "login" ||
        document.body?.dataset?.vista === "login" ||
        document.documentElement?.dataset?.vista === "login" ||
        document.documentElement.classList.contains("auth-cargando") ||
        document.documentElement.classList.contains("app-preboot")
      );
    } catch (_) {
      return false;
    }
  };

  const desvanecerTemaAdmin = (esDark) => {
    try {
      if (esVistaLoginOPreboot()) {
        window.__adminTemaPendienteFade = esDark;
        return;
      }

      const actual = document.documentElement.classList.contains("modo-oscuro");
      if (actual === esDark) return;

      // La transición suave con efecto de desvanecer es exclusiva cuando el tema obtenido es dark
      if (!esDark) {
        if (typeof window.__aplicarTemaDOM === "function") {
          window.__aplicarTemaDOM(false);
        } else {
          document.documentElement.classList.remove("modo-oscuro");
          document.documentElement.dataset.theme = "light";
          if (document.body) {
            document.body.classList.remove("modo-oscuro");
            document.body.dataset.theme = "light";
          }
        }
        if (typeof window.__actualizarIconosTema === "function") {
          window.__actualizarIconosTema();
        }
        return;
      }

      const mutarDOM = () => {
        if (typeof window.__aplicarTemaDOM === "function") {
          window.__aplicarTemaDOM(true);
        } else {
          document.documentElement.classList.add("modo-oscuro");
          document.documentElement.dataset.theme = "dark";
          if (document.body) {
            document.body.classList.add("modo-oscuro");
            document.body.dataset.theme = "dark";
          }
        }
        if (typeof window.__actualizarIconosTema === "function") {
          window.__actualizarIconosTema();
        }
      };

      if (typeof document.startViewTransition === "function") {
        try {
          document.documentElement.classList.add("tema-fade-admin");
          const transicion = document.startViewTransition(() => {
            mutarDOM();
          });
          if (transicion && typeof transicion.finished?.then === "function") {
            transicion.finished.catch(() => {}).finally(() => {
              document.documentElement.classList.remove("tema-fade-admin");
            });
          } else {
            setTimeout(() => {
              document.documentElement.classList.remove("tema-fade-admin");
            }, 500);
          }
          return;
        } catch (_) {
          // Si falla startViewTransition, continúa al fallback
        }
      }

      document.documentElement.classList.add("tema-fade-admin");
      void document.documentElement.offsetHeight;
      mutarDOM();
      setTimeout(() => {
        document.documentElement.classList.remove("tema-fade-admin");
      }, 500);
    } catch (_) {
      if (typeof window.__aplicarTemaDOM === "function") {
        window.__aplicarTemaDOM(esDark);
      } else {
        document.documentElement.classList.toggle("modo-oscuro", esDark);
        document.documentElement.dataset.theme = esDark ? "dark" : "light";
        if (document.body) {
          document.body.classList.toggle("modo-oscuro", esDark);
          document.body.dataset.theme = esDark ? "dark" : "light";
        }
      }
      if (typeof window.__actualizarIconosTema === "function") {
        window.__actualizarIconosTema();
      }
    }
  };

  const resolverFadePendiente = () => {
    if (window.__adminTemaPendienteFade !== undefined && !esVistaLoginOPreboot()) {
      const temaPendiente = window.__adminTemaPendienteFade;
      window.__adminTemaPendienteFade = undefined;
      requestAnimationFrame(() => {
        desvanecerTemaAdmin(temaPendiente);
      });
    }
  };

  window.addEventListener("app-vista-cambiada", resolverFadePendiente);
  window.addEventListener("auth-ruta-lista", resolverFadePendiente);

  const cargarAjustesServidor = async () =>  {
    if (esInvitadoLocal()) return valoresAjustes;
    if (rol !== "admin" && sessionStorage.getItem("esAdmin") !== "true") return valoresAjustes;
    const cliente = window.PermisosSupabase
    ? await window.PermisosSupabase.esperarCliente()
    : null;
    if (!cliente) return valoresAjustes;
    try {
      const res = await window.PermisosSupabase.consultarTablaConFallback(
      cliente,
      "configuracion_privada",
      (t) =>
      t
      .select("clave, valor")
      .in("clave", [
      CLAVES_AJUSTES.modoOscuro,
      CLAVES_AJUSTES.invitados,
      CLAVES_AJUSTES.descargarTodas,
      CLAVES_AJUSTES.descargarAsignatura,
      CLAVES_AJUSTES.descargarCurso,
      CLAVES_AJUSTES.descargarAsignaturaTodos,
      CLAVES_AJUSTES.visorActivo,
      CLAVES_AJUSTES.visorEnTareas,
      CLAVES_AJUSTES.visorEnAsignaturas,
      CLAVES_AJUSTES.visorEnTrimestres,
      CLAVES_AJUSTES.visorEnGrados,
      CLAVES_AJUSTES.visorEnSelectorRamas,
      CLAVES_AJUSTES.descargasEnSelectorRamas,
      ])
  );
      if (!res.error && res.data) {
        res.data.forEach((fila) =>  {
          if (fila.clave === CLAVES_AJUSTES.invitados) {
            invitadosActivos = fila.valor !== "false";
            try {
              localStorage.setItem(
              CLAVE_INVITADOS_ACTIVOS,
              invitadosActivos ? "true" : "false"
  );
            } catch (e) {
            }
          } else if (fila.clave === CLAVES_AJUSTES.modoOscuro) {
            const esDark = fila.valor === "true";
            valoresAjustes[fila.clave] = esDark;
            if (rol === "admin" || sessionStorage.getItem("esAdmin") === "true") {
              try { localStorage.setItem("modo_oscuro", esDark ? "true" : "false"); }
              catch (_) {}
              desvanecerTemaAdmin(esDark);
            }
          } else {
            const esTrue = fila.valor === "true";
            valoresAjustes[fila.clave] = esTrue;
            try { localStorage.setItem(`ajustes_${fila.clave}`, esTrue ? "true" : "false"); }
            catch (e) { } }
        }
  );
      }
    } catch (e) {
    }
    try { window.dispatchEvent(new CustomEvent("ajustes-servidor-cargados")); }
    catch (e) {
    }
    return valoresAjustes;
  }
  ;
  const leerCsv = async (nombreCsv, rama) => {
    let r = normalizarRamaNombre(rama || ramaActual());
    if (!r) return null;
    const claveCache = `cache_file_${r}_${nombreCsv}`;
    let cacheLocal = null;
    try { cacheLocal = localStorage.getItem(claveCache) || null; }
    catch (_) {
    }
    const refrescar = async () =>  {
      await asegurarSesion();
      let contenidoFresco = null;
      try {
        const config = window.GITHUB_CONFIG || {};
        const tokenSeguro = typeof config.obtenerTokenSeguro === "function" ? config.obtenerTokenSeguro() : (config.token_general || config.token || "");
        const repoPrivado = String(config.repo_general || config.repo || "").trim();
        const repoReal = String(config.repo_general || config.repo || "").trim();
        const repos = [repoPrivado, repoReal].filter(Boolean).filter((repo, i, a) => a.indexOf(repo) === i);
        let ramaValida = false;
        if (!r) {
          // Sin selección explícita, GitHub usa la rama por defecto del repo.
          ramaValida = true;
        } else {
          for (const repo of repos) {
            const comprobada = await validarRamaGithub(repo, r, tokenSeguro);
            if (!comprobada) continue;
            r = comprobada;
            ramaValida = true;
            break;
          }
        }
        if (!ramaValida) {
          // Nunca volver a pedir una rama eliminada (p.ej. test-github-actions).
          try { localStorage.removeItem("rama_actual"); } catch (_) {}
          try { sessionStorage.removeItem("app_rama"); } catch (_) {}
          try { window.Estado?.guardar?.("rama", ""); } catch (_) {}
          return null;
        }
        for (const repo of repos) {
          let resG = null;
          const urlApi = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(nombreCsv)}?ref=${encodeURIComponent(r)}`;
          const headersApi = {
            ...(tokenSeguro ? { Authorization: `Bearer ${tokenSeguro}` } : {}),
            Accept: "application/vnd.github+json"
          };
          try {
            resG = await fetch(urlApi, { headers: headersApi, cache: "no-store" });
          } catch (_) {
            // Reintento en caso de microcorte o cambio de certificado (ERR_CERT_VERIFIER_CHANGED / ERR_FAILED)
            await new Promise(res => setTimeout(res, 500));
            try {
              resG = await fetch(urlApi, { headers: headersApi, cache: "no-store" });
            } catch (_) {}
          }
          if (!resG || !resG.ok) continue;
          const datos = await resG.json();
          if (datos && datos.content && window.PermisosCrypto) {
            contenidoFresco = window.PermisosCrypto.decodificarBase64(datos.content);
            break;
          }
        }
      } catch (_) {
      }
      if (contenidoFresco) {
        const haCambiado = cacheLocal !== contenidoFresco;
        try { localStorage.setItem(claveCache, contenidoFresco); }
        catch (_) {
        }
        if (haCambiado && cacheLocal !== null) {
          try {
            window.dispatchEvent(new CustomEvent("csv-cache-actualizado",  {
              detail:  { rama: r, archivo: nombreCsv }
            }
            ));
          } catch (_) {
          }
        }
        return contenidoFresco;
      }
      return null;
    }
    ;
    if (cacheLocal) { refrescar().catch(() =>  { }
  );
      return cacheLocal;
    }
    return await refrescar();
  }
  ;
  const listarRamasStorage = async () =>  {
    try {
      if (window.supabaseClient) {
        const  { data, error }
        = await window.supabaseClient.storage.from("csv-grados").list("",  { limit: 100 }
  );
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((item) => item.name).filter((n) => n && n !== ".emptyFolderPlaceholder" && String(n).toLowerCase() !== "master");
        }
      }
    } catch (e) {
    }
    return [];
  }
  ;
  return  {
    BUCKET_CSV, get usuario() { return usuario; }
    , get rol() { return rol; }
    , get esAdmin() { return rol === "admin"; }
    , get vistaInvitado() { return rol !== "admin" || vistaInvitadoModo; }
    , setVistaInvitado(vista) {
      vistaInvitadoModo = Boolean(vista);
      try { localStorage.setItem("vista_invitado", vistaInvitadoModo ? "true" : "false"); }
      catch (e) { } }
    , get invitadosActivos() { return invitadosActivos; }
    , setInvitadosActivos(activo) {
      invitadosActivos = Boolean(activo);
      try { localStorage.setItem(CLAVE_INVITADOS_ACTIVOS, invitadosActivos ? "true" : "false"); }
      catch (e) {
      }
      guardarConfig(CLAVES_AJUSTES.invitados, invitadosActivos);
    }
    , get sesionCargada() { return sesionCargada; }
    , activarInvitado() {
      usuario = null;
      rol = "invitado";
      sesionCargada = true;
      try {
        sessionStorage.setItem("esInvitado", "true");
        sessionStorage.setItem("esAdmin", "false");
      } catch (_) {}
      try { document.documentElement.dataset.rol = "invitado"; } catch (_) {}
      cargarConfigPublicaLocal();
      window.dispatchEvent(new CustomEvent("permisos-sesion-cargada", { detail: { rol: "invitado", esAdmin: false } }));
    }
    , resetearSesion, cargoSesion, asegurarSesion, guardarConfig, cargarAjustesServidor, obtenerAjuste, listarRamasStorage, cargarArchivos: (a, t) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.cargarArchivos(a, t) : new Map()), puedeVer: (s, n) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.puedeVer(s, n, rol === "admin", modoEdicionActivo()) : false), esVisibleParaInvitado: (s, n) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.esVisibleParaInvitado(s, n) : false), esArchivoVisibleParaInvitado: (s, nf, na) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.esArchivoVisibleParaInvitado(s, nf, na) : true), guardarVisibilidad: (a, t, s, n, v) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.guardarVisibilidad(a, t, s, n, v) :  {
      error: null
    }
    ), guardarVisibilidadArchivo: (a, t, s, nf, na, v) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.guardarVisibilidadArchivo(a, t, s, nf, na, v) :  {
      error: null
    }
    ), guardarVisibilidadSeccion: (a, t, s, l, v) => (window.PermisosVisibilidad ? window.PermisosVisibilidad.guardarVisibilidadSeccion(a, t, s, l, v) :  {
      error: null
    }
    ), verificarAdmin: (user, c, t) => (window.PermisosGithub ? window.PermisosGithub.verificarAdmin(user, c, t) : false), leerCsv, esLocal, ramaActual,
  }
  ;
}
)();
