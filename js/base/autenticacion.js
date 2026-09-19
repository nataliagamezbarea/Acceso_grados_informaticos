(() =>  {
document.documentElement.classList.add("auth-cargando");
  // No aplicar aquí el tema del administrador: su fuente de verdad es
  // configuracion_privada de Supabase y debe llegar antes de mostrar la vista.
  // El invitado, en cambio, usa exclusivamente su preferencia local.
  if (typeof localStorage !== "undefined") {
    const esInvitado = (() => { try { return sessionStorage.getItem("esInvitado") === "true"; } catch (_) { return false; } })();
    if (esInvitado) {
      const oscuro = sessionStorage.getItem("guest_modo_oscuro") === "true";
      document.documentElement.classList.toggle("modo-oscuro", oscuro);
      document.documentElement.dataset.theme = oscuro ? "dark" : "light";
    } else {
      // ADMIN / sesión pendiente: no tocar el tema aquí.
      // tema_precarga.js ya aplicó la última preferencia conocida antes del primer paint.
      // La comprobación definitiva de Supabase actualizará el tema cuando termine.
    }
  }
  if (!window.SUPABASE_URL) window.SUPABASE_URL = "https://lztatgnlplpduiatmlrv.supabase.co";
  if (!window.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
  if (!window.supabaseClient && window.supabase?.createClient) {
    try {
      window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        db: { schema: "grados-informaticos" },
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch (_) {}
  }
  if (!window.GITHUB_CONFIG) window.GITHUB_CONFIG =  { repo: "", token: "" }
  ;
  const credencialesListas = true;
  const mostrar = (vista, datos =  {
  }
  ) => window.AppViews?.mostrar ? window.AppViews.mostrar(vista, datos,  { reemplazar: true }
  ) : Promise.resolve();
  const iniciar = async () => {
    try {
      const esInvitado = (() => { try { return sessionStorage.getItem("esInvitado") === "true"; } catch (_) { return false; } })();


      // INVITADO: no inicia autenticación de Supabase. Su sesión es solo local.
      if (esInvitado) {
        const oscuro = sessionStorage.getItem("guest_modo_oscuro") === "true";
        document.documentElement.classList.toggle("modo-oscuro", oscuro);
        document.documentElement.dataset.theme = oscuro ? "dark" : "light";
        document.documentElement.dataset.rol = "invitado";
        document.documentElement.classList.remove("admin-autorizado");
        if (document.body) document.body.dataset.rol = "invitado";
        window.sesionActual = null;
        try { window.Permisos?.activarInvitado?.(); } catch (_) {}

        const ultimaVista = window.Estado?.obtener?.("app_ultima_vista") || localStorage.getItem("app_ultima_vista") || "inicio";
        const ultimoContexto = window.Estado?.obtenerContexto?.() || {};
        const ramaPersistida = (window.RamaActual ? window.RamaActual.obtener() : "") ||
          (window.Estado ? window.Estado.obtener("rama") : "") ||
          localStorage.getItem("rama_actual") ||
          sessionStorage.getItem("rama_actual") ||
          "";
        const forzarSelector = sessionStorage.getItem("forzar_selector_rama") === "1";

        let rutaInicial = "inicio";
        let contextoInicial = {};
        if (forzarSelector || (!ramaPersistida && !ultimoContexto.rama)) {
          rutaInicial = "inicio";
          contextoInicial = {};
        } else {
          const ramaFinal = ramaPersistida || ultimoContexto.rama || "";
          contextoInicial = { ...ultimoContexto, rama: ramaFinal };
          if (["apuntes", "asignatura", "asignaturas", "clase"].includes(ultimaVista)) {
            rutaInicial = ultimaVista;
          } else {
            rutaInicial = "clase";
          }
        }

        await mostrar(rutaInicial, contextoInicial);
        if (forzarSelector) {
          try { sessionStorage.removeItem("forzar_selector_rama"); } catch (_) {}
        }
        if (window.ComponenteNavbar?.inicializar) window.ComponenteNavbar.inicializar();
        window.__AUTH_ROUTING_DONE = true;
        try { window.dispatchEvent(new CustomEvent("auth-ruta-lista", { detail: { ruta: rutaInicial, contexto: contextoInicial } })); } catch (_) {}
        return;

      }

      if (!credencialesListas) throw new Error("Configura las credenciales de Supabase.");
      // Reutilizar siempre la instancia singleton creada al inicio de este archivo
      // (o por PermisosSupabase) para evitar múltiples GoTrueClient con la misma storage key.
      const supabase = window.supabaseClient || (window.supabase?.createClient ? window.supabase.createClient(
        window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
          db: { schema: "grados-informaticos" },
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        }
      ) : null);
      if (!supabase) throw new Error("Cliente Supabase no disponible.");
      window.supabaseClient = supabase;
      let  {
        data:  { session }
      }
      = await supabase.auth.getSession();
      if (!session && window.location.hash.includes("access_token")) {
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 100));
          const res = await supabase.auth.getSession();
          if (res.data?.session) {
            session = res.data.session;
            break;
          }
        }
      }
      let esAdminAutorizado = false;
      if (session?.user) {
        // La sesión de Supabase NO implica permiso. El único criterio de
        // autorización es public.perfiles.rol = "admin".
        try {
          const { data: perfil, error: perfilError } = await supabase
            .schema("public")
            .from("perfiles")
            .select("rol")
            .eq("id", session.user.id)
            .maybeSingle();
          esAdminAutorizado = !perfilError && String(perfil?.rol || "").trim().toLowerCase() === "admin";
        } catch (_) {
          esAdminAutorizado = false;
        }

        if (!esAdminAutorizado) {
          await supabase.auth.signOut().catch(() => {});
          session = null;
          try {
            sessionStorage.removeItem("esAdmin");
            sessionStorage.removeItem("esInvitado");
          } catch (_) {}
          document.documentElement.dataset.rol = "";
          // Bloqueo explícito: una sesión OAuth/email no puede caer en modo invitado.
          window.__AUTH_ACCESS_DENIED = true;
        } else {
          try {
            sessionStorage.removeItem("esInvitado");
            sessionStorage.setItem("esAdmin", "true");
          } catch (_) {}
          document.documentElement.dataset.rol = "admin";
          if (document.body) document.body.dataset.rol = "admin";
          try { if (window.Permisos?.asegurarSesion) await window.Permisos.asegurarSesion(); } catch (_) {}
          try {
            const pCsv = window.PermisosVisibilidad?.asegurarCsvIniciales?.();
            if (pCsv && typeof pCsv.catch === "function") pCsv.catch(() => {});
          } catch (_) {}
        }
      }
      if (window.__AUTH_ACCESS_DENIED === true) {
        await mostrar("login");
        const errorBox = document.getElementById("mensaje-error");
        if (errorBox) {
          errorBox.textContent = "Acceso denegado: esta cuenta no es administradora.";
          errorBox.hidden = false;
        }
        window.__AUTH_ROUTING_DONE = true;
        try { window.dispatchEvent(new CustomEvent("auth-ruta-lista", { detail: { ruta: "login", contexto: {} } })); } catch (_) {}
        return;
      }
      const esInvitadoActual = sessionStorage.getItem("esInvitado") === "true";
      const tieneAcceso = Boolean((session?.user && esAdminAutorizado) || esInvitadoActual);
      const MSG_BLOQUEO = "Acceso restringido: Esta cuenta no pertenece a un administrador ni colaborador del repositorio. En este momento el material está en revisión o actualización y el acceso temporal a invitados está desactivado. Inténtalo de nuevo más tarde. Si necesitas acceso, contacta con la propietaria del repositorio.";
      try { await window.Permisos?.cargarAjustesServidor?.(); }
      catch (_) {
      }
      if (esInvitadoActual && window.Permisos && window.Permisos.invitadosActivos === false) {
        sessionStorage.removeItem("esInvitado");
        await mostrar("login");
        const errorBox = document.getElementById("mensaje-error");
        if (errorBox) {
          errorBox.textContent = MSG_BLOQUEO;
          errorBox.hidden = false;
        }
        return;
      }
      let rutaInicial = "login";
      let contextoInicial = {};
      if (!tieneAcceso) {
        document.documentElement.classList.remove("modo-oscuro");
        document.documentElement.dataset.theme = "light";
        if (document.body) {
          document.body.classList.remove("modo-oscuro");
          document.body.dataset.theme = "light";
        }
        await mostrar("login");
      }

      else {
        window.sesionActual = session;
        // Si ya había una rama seleccionada, no mostramos el selector: entramos
        // directamente en el grado. Solo se borra cuando el usuario vuelve
        // explícitamente al selector mediante Atrás y el selector queda vacío.
        let ramaPersistida = "";
        let forzarSelector = false;
        let ultimaVista = "";
        let ultimoContexto = {};
        try {
          const rutaActual = String(window.location.pathname || "").toLowerCase();
          const esSelector = rutaActual === String((window.APP_BASE || "/")).toLowerCase() || rutaActual.endsWith("/index.html") || rutaActual.includes("inicio");
          forzarSelector = sessionStorage.getItem("forzar_selector_rama") === "1" || (esSelector && (window.RamaActual?.estaForzadoSelector?.() === true || sessionStorage.getItem("forzar_selector_rama") === "1"));
        } catch (_) {}
        if (!forzarSelector) {
          try {
            ramaPersistida = String(window.RamaActual?.obtener?.() || window.Estado?.obtener?.("rama") || "").trim();
          } catch (_) {}
          try {
            ultimaVista = localStorage.getItem("app_ultima_vista") || "";
            const rawCtx = localStorage.getItem("app_ultimo_contexto");
            if (rawCtx) ultimoContexto = JSON.parse(rawCtx);
            const rawVisorCtx = localStorage.getItem("visor_contexto");
            if (rawVisorCtx) {
              const visorCtx = JSON.parse(rawVisorCtx);
              if (visorCtx && visorCtx.abierto === true && visorCtx.archivo) {
                if (!ultimaVista) ultimaVista = 'visores/administrador';
                ultimoContexto = { ...ultimoContexto, ...visorCtx };
              }
            }
          } catch (_) {}
        }
        if (!forzarSelector && (ultimaVista === 'visores/administrador' || localStorage.getItem('visor_admin_abierto') === '1')) {
          try {
            const u = new URL((window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html', window.location.origin);
            const r = (ultimoContexto.rama && ultimoContexto.rama !== '__TODAS__') ? ultimoContexto.rama : (localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '');
            if (r && r !== '__TODAS__') u.searchParams.set('rama', String(r));
            else u.searchParams.set('todas', '1');
            if (ultimoContexto.archivo && ultimoContexto.abierto) {
              u.searchParams.set('archivo', String(ultimoContexto.archivo));
              if (ultimoContexto.pos !== undefined && ultimoContexto.pos !== null) u.searchParams.set('pos', String(ultimoContexto.pos));
            }
            if (ultimoContexto.asignatura) u.searchParams.set('asignatura', String(ultimoContexto.asignatura));
            if (ultimoContexto.trimestre) u.searchParams.set('trimestre', String(ultimoContexto.trimestre));
            u.searchParams.set('return', (window.APP_BASE || '/'));
            u.searchParams.set('_embed', '1');
            if (typeof window.abrirVisorAdministradorEmbebido === 'function') {
              window.abrirVisorAdministradorEmbebido(u.href);
            }
            if (window.ComponenteNavbar?.inicializar) window.ComponenteNavbar.inicializar();
            document.documentElement.classList.remove("auth-cargando", "app-preboot");
            return;
          } catch (_) {}
        }
        if (forzarSelector || (!ramaPersistida && !ultimoContexto.rama)) {
          rutaInicial = "inicio";
          contextoInicial = {};
        } else {
          const ramaFinal = ramaPersistida || ultimoContexto.rama || "";
          contextoInicial = { ...ultimoContexto, rama: ramaFinal };
          if (["apuntes", "asignatura", "asignaturas", "clase"].includes(ultimaVista)) {
            rutaInicial = ultimaVista;
          } else {
            rutaInicial = "clase";
          }
        }
        await mostrar(rutaInicial, contextoInicial);
        if (forzarSelector) {
          try { sessionStorage.removeItem("forzar_selector_rama"); } catch (_) {}
        }
        if (window.ComponenteNavbar?.inicializar) window.ComponenteNavbar.inicializar();
      }

      window.__AUTH_ROUTING_DONE = true;
      try {
        window.dispatchEvent(new CustomEvent("auth-ruta-lista", {
          detail: { ruta: rutaInicial, contexto: contextoInicial }
        }));
      } catch (_) {}

    } catch (error) {
      await mostrar("login");
      window.__AUTH_ROUTING_DONE = true;
      try {
        window.dispatchEvent(new CustomEvent("auth-ruta-lista", {
          detail: { ruta: "login", contexto: {} }
        }));
      } catch (_) {}
    } finally {
      // Garantía de cierre: si app-preboot sigue en html (por cualquier return
      // prematuro o excepción no capturada), lo quitamos aquí para que la
      // página nunca quede atrapada en visibility:hidden.
      document.documentElement.classList.remove("auth-cargando", "app-preboot");
    }
  }
  ;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar,  { once: true }
  );
  else iniciar();
}
)();
// Mantener siempre la URL limpia: el hash de OAuth solo sirve durante el retorno del proveedor.
(() =>  {
  const limpiarHashOAuth = () =>  {
    if (!window.location.hash) return;
    const h = window.location.hash;
    if (/access_token=|refresh_token=|expires_in=|token_type=/i.test(h)) {
      try { window.history.replaceState( { }
        , document.title, window.location.pathname + window.location.search);
      } catch (_) {
      }
    }
  }
  ;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", limpiarHashOAuth,  {
    once:true
  }
  );
  else limpiarHashOAuth();
}
)();
