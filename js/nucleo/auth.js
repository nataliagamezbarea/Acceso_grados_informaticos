(() => {
  if (typeof localStorage !== "undefined" && localStorage.getItem("modo_oscuro") === "true") {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.classList.add("modo-oscuro");
    }
  }

  if (!window.SUPABASE_URL) window.SUPABASE_URL = "https://lztatgnlplpduiatmlrv.supabase.co";
  if (!window.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";

  if (!window.GITHUB_CONFIG) {
    window.GITHUB_CONFIG = {
      repo: "nataliagamezbarea/Acceso_grados_informaticos",
      token: "",
    };
  } else if (!window.GITHUB_CONFIG.repo) {
    window.GITHUB_CONFIG.repo = "nataliagamezbarea/Acceso_grados_informaticos";
  }

  if (typeof document !== "undefined" && !document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="fontawesome"]')) {
    const link = document.createElement("link");
    link.id = "fa-cdn";
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    document.head.appendChild(link);
  }

  if (typeof document !== "undefined" && !document.getElementById("emojis-script")) {
    const enModulos = window.location.pathname.includes("/modulos");
    const scriptEmoji = document.createElement("script");
    scriptEmoji.id = "emojis-script";
    scriptEmoji.src = enModulos ? "../js/componentes/emojis.js" : "js/componentes/emojis.js";
    document.head.appendChild(scriptEmoji);
  }

  const credencialesListas = true;
  const esPaginaLogin = /login\.html/.test(window.location.pathname);
  const esPaginaVisor = /visor\.html/.test(window.location.pathname);
  const redirigir = (destino) => window.location.replace(destino);

  const iniciar = async () => {
    try {
      if (!credencialesListas) {
        throw new Error("Configura SUPABASE_URL y SUPABASE_ANON_KEY en js/supabase-config.js");
      }

      const supabase = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
      window.supabaseClient = supabase;

      let { data: { session } } = await supabase.auth.getSession();
      if (!session && window.location.hash.includes("access_token")) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 100));
          const res = await supabase.auth.getSession();
          if (res.data?.session) {
            session = res.data.session;
            break;
          }
        }
      }

      if (session?.user) {
        let esAdminValido = false;
        try {
          if (window.Permisos) {
            esAdminValido = await window.Permisos.verificarAdmin(session.user);
          }
        } catch (e) {}

        if (!esAdminValido) {
          sessionStorage.removeItem("esInvitado");
          await supabase.auth.signOut();
          session = null;

          if (esPaginaLogin) {
            const errorBox = document.getElementById("mensaje-error");
            if (errorBox) {
              errorBox.textContent = "Acceso restringido: Esta cuenta no pertenece a un administrador ni colaborador del repositorio. Debes pulsar 'Entrar como Invitado'.";
              errorBox.hidden = false;
            }
          }
        } else {
          sessionStorage.removeItem("esInvitado");
          if (window.Permisos) {
            try {
              await window.Permisos.cargoSesion();
            } catch (e) {}
          }
        }
      }

      const esInvitado = sessionStorage.getItem("esInvitado") === "true";
      const tieneAcceso = Boolean(session || esInvitado);

      // Redirección inmediata si no tiene acceso y no está en la página de login
      if (!esPaginaLogin && !tieneAcceso) {
        const enModulos = window.location.pathname.includes("/modulos");
        redirigir(enModulos ? "login.html" : "modulos/login.html");
        return;
      }

      const MSG_BLOQUEO =
        "Acceso restringido: Esta cuenta no pertenece a un administrador ni colaborador del repositorio. " +
        "En este momento el material está en revisión o actualización y el acceso temporal a invitados está desactivado. " +
        "Inténtalo de nuevo más tarde. Si necesitas acceso, contacta con la propietaria del repositorio.";

      if (window.Permisos && typeof window.Permisos.cargarAjustesServidor === "function") {
        await window.Permisos.cargarAjustesServidor();
      }

      if (esInvitado && window.Permisos && window.Permisos.invitadosActivos === false) {
        sessionStorage.removeItem("esInvitado");
        if (esPaginaLogin) {
          document.documentElement.style.visibility = "";
          const errorBox = document.getElementById("mensaje-error");
          if (errorBox) {
            errorBox.textContent = MSG_BLOQUEO;
            errorBox.hidden = false;
          }
          return;
        }
        const enModulos = window.location.pathname.includes("/modulos");
        redirigir(enModulos ? "login.html" : "modulos/login.html");
        return;
      }

      if (esPaginaLogin && tieneAcceso) {
        const enModulos = window.location.pathname.includes("/modulos");
        redirigir(enModulos ? "../index.html" : "index.html");
        return;
      }

      document.documentElement.style.visibility = "";
      window.sesionActual = session;

      if (!esPaginaLogin && !esPaginaVisor) {
        if (window.ComponenteNavbar && typeof window.ComponenteNavbar.inicializar === "function") {
          window.ComponenteNavbar.inicializar();
        }
      }
    } catch (error) {
      if (!esPaginaLogin) {
        const enModulos = window.location.pathname.includes("/modulos");
        redirigir(enModulos ? "login.html" : "modulos/login.html");
        return;
      }
      document.documentElement.style.visibility = "";
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
