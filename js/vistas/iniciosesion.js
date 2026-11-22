function inicializarVistaLogin() {
  const form = document.getElementById("form-login");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorBox = document.getElementById("mensaje-error");
  const btnEmail = document.getElementById("btn-email");
  const btnGoogle = document.getElementById("btn-google");
  const btnGithub = document.getElementById("btn-github");
  const btnInvitado = document.getElementById("btn-invitado");
  if (!form) {
    const supabase = window.supabaseClient || null;
    const mostrarErrorDirecto = msg => { if (errorBox) { errorBox.textContent = msg; errorBox.hidden = false; } };
    const loginOAuthDirecto = async proveedor => {
      try {
        const c = supabase || (window.PermisosSupabase?.esperarCliente ? await window.PermisosSupabase.esperarCliente() : null);
        if (!c) return mostrarErrorDirecto("Error al conectar con Supabase.");
        const { error } = await c.auth.signInWithOAuth({
          provider: proveedor,
          options: { redirectTo: new URL("index.html", window.location.href).href }
        });
        if (error) mostrarErrorDirecto(error.message);
      } catch (_) { mostrarErrorDirecto("No se pudo iniciar sesión."); }
    };
    btnGoogle?.addEventListener("click", () => loginOAuthDirecto("google"));
    btnGithub?.addEventListener("click", () => loginOAuthDirecto("github"));
    return;
  }
  if (form.dataset.inicializado === "1") return;
  form.dataset.inicializado = "1";
  const mostrarError = msg =>  {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }
  }
  ;
  const irAlInicio = async () =>  {
    let rama = "";
    let forzarSelector = false;
    try { forzarSelector = sessionStorage.getItem("forzar_selector_rama") === "1"; }
    catch (_) {
    }
    if (!forzarSelector) {
      sessionStorage.setItem("forzar_selector_rama", "1");
      forzarSelector = true;
    }
    // Si el selector está forzado, siempre mostramos el inicio (selector de clases),
    // sin importar si hay una rama guardada previamente
    if (forzarSelector) { return window.AppViews?.mostrar("inicio",  { }
  );
    }
    // Si no estaba forzado antes, revisamos si hay rama guardada
    if (rama) {
      return window.AppViews?.mostrar("clase",  { rama }
  );
    }
    return window.AppViews?.mostrar("inicio",  {
    }
  );
  }
  ;
  const conseguirSupabase = async () =>  {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.PermisosSupabase?.esperarCliente) {
      const c = await window.PermisosSupabase.esperarCliente();
      if (c) return c;
    }
    const url = window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co";
    const key = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
    if (window.supabase?.createClient) {
      try {
        window.supabaseClient = window.supabase.createClient(url, key, {
          db: { schema: "grados-informaticos" },
          auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return window.supabaseClient;
      } catch (_) {}
    }
    for (let i=0;i<30;i++) {
      if (window.supabaseClient) return window.supabaseClient;
      if (window.supabase?.createClient) {
        try {
          window.supabaseClient = window.supabase.createClient(url, key, {
            db: { schema: "grados-informaticos" },
            auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
          });
          return window.supabaseClient;
        } catch (_) {}
      }
      await new Promise(r=>setTimeout(r,100));
    }
    return null;
  }
  ;
  const comprobarAdmin = async (supabase, user) => {
    if (!user) return false;
    try {
      try {
        const u = window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co";
        const k = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
        const idFiltro = user.id ? `id=eq.${encodeURIComponent(user.id)}` : (user.email ? `email=eq.${encodeURIComponent(user.email)}` : null);
        if (idFiltro) {
          const resp = await fetch(`${u}/rest/v1/perfiles?select=rol&${idFiltro}`, {
            credentials: "omit",
            headers: { "apikey": k, "Authorization": `Bearer ${k}` }
          });
          if (resp.ok) {
            const arr = await resp.json();
            if (Array.isArray(arr) && arr.length > 0 && String(arr[0].rol || "").trim().toLowerCase() === "admin") {
              return true;
            }
          }
        }
      } catch (_) {}

      if (!supabase) return false;
      let data = null;
      if (user.id) {
        const resId = await supabase
          .schema("public")
          .from("perfiles")
          .select("rol")
          .eq("id", user.id)
          .maybeSingle();
        if (!resId.error && resId.data) data = resId.data;
      }
      if (!data && user.email) {
        const resEmail = await supabase
          .schema("public")
          .from("perfiles")
          .select("rol")
          .eq("email", user.email)
          .maybeSingle();
        if (!resEmail.error && resEmail.data) data = resEmail.data;
      }
      return data && String(data.rol || "").trim().toLowerCase() === "admin";
    } catch (_) {
      return false;
    }
  };
  const validarSesionOAuth = async () => {
    const supabase = await conseguirSupabase();
    if (!supabase) return;
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session && window.location.search.includes("code=")) {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code && typeof supabase.auth.exchangeCodeForSession === "function") {
          try {
            const resCode = await supabase.auth.exchangeCodeForSession(code);
            if (resCode.data?.session) session = resCode.data.session;
          } catch (_) {}
        }
      }
      if (!session && (window.location.hash.includes("access_token") || window.location.search.includes("code="))) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 100));
          const res = await supabase.auth.getSession();
          if (res.data?.session) {
            session = res.data.session;
            break;
          }
        }
      }
      if (!session?.user) return;
      const esAdmin = await comprobarAdmin(supabase, session.user);
      if (!esAdmin) {
        await supabase.auth.signOut();
        sessionStorage.removeItem("esAdmin");
        sessionStorage.removeItem("esInvitado");
        mostrarError("Acceso denegado: solo los administradores pueden iniciar sesión con Google o GitHub.");
        return;
      }
      sessionStorage.removeItem("esInvitado");
      sessionStorage.setItem("esAdmin", "true");
      window.sesionActual = session;
      await irAlInicio();
    } catch (_) {
      await supabase.auth.signOut().catch(() => {});
      mostrarError("No se pudo verificar el permiso de administrador.");
    }
  };
  form.addEventListener("submit", async e =>  {
    e.preventDefault();
    if (errorBox) errorBox.hidden = true;
    const supabase = await conseguirSupabase();
    if (!supabase) {
      oauthEnCurso = false;
      return mostrarError("Error al conectar con Supabase.");
    }
    if (btnEmail) {
      btnEmail.disabled = true;
      btnEmail.textContent = "Entrando...";
    }
    const  { data, error }
    = await supabase.auth.signInWithPassword( {
      email: emailInput.value.trim(), password: passwordInput.value
    }
  );
    if (error) {
      mostrarError(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos." : error.message);
      if (btnEmail) {
        btnEmail.disabled=false;
        btnEmail.textContent="Iniciar sesión";
      }
      return;
    }
    const esAdmin = await comprobarAdmin(supabase, data?.user);
    if (!esAdmin) {
      await supabase.auth.signOut();
      sessionStorage.removeItem("esAdmin");
      mostrarError("Acceso denegado: solo los administradores pueden iniciar sesión.");
      if (btnEmail) {
        btnEmail.disabled = false;
        btnEmail.textContent = "Iniciar sesión";
      }
      return;
    }
    sessionStorage.removeItem("esInvitado");
    sessionStorage.setItem("esAdmin", "true");
    window.sesionActual = data?.session || null;
    await irAlInicio();
    try { await window.Permisos?.cargoSesion?.(); } catch (_) {}
  }
  );
  let oauthEnCurso = false;
  const loginConOAuth = async (proveedor, e) =>  {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (oauthEnCurso) return;
    oauthEnCurso = true;
    try {
      sessionStorage.removeItem("esInvitado");
      localStorage.removeItem("esInvitado");
    } catch (_) {}
    if (errorBox) errorBox.hidden = true;
    const supabase = await conseguirSupabase();
    if (!supabase) return mostrarError("Error al conectar con Supabase.");
    const logHist = (msg, d = null) => {
      try {
        const l = JSON.parse(localStorage.getItem("auth_history") || "[]");
        l.push({ time: new Date().toLocaleTimeString(), msg, data: d ? JSON.parse(JSON.stringify(d)) : null });
        localStorage.setItem("auth_history", JSON.stringify(l.slice(-40)));
      } catch (_) {}
      console.log(msg, d || "");
    };
    logHist("[OAUTH-CLICK] Iniciando con: " + proveedor);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: proveedor,
      options: { redirectTo: window.location.origin + (window.APP_BASE || "/") }
    });
    logHist("[OAUTH-CLICK] Resultado signInWithOAuth:", { data, error });
    if (error) {
      oauthEnCurso = false;
      return mostrarError(error.message);
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  };
  // Tras volver de Google/GitHub, Supabase ya tiene la sesión: comprobar el rol antes de entrar.
  validarSesionOAuth();
  btnGoogle?.addEventListener("click", (e) => loginConOAuth("google", e));
  btnGithub?.addEventListener("click", (e) => loginConOAuth("github", e));
  btnInvitado?.addEventListener("click", async () =>  {
    if (window.Permisos?.invitadosActivos === false) return mostrarError("Acceso restringido: el acceso temporal a invitados está desactivado.");
    try {
      sessionStorage.removeItem("esAdmin");
      sessionStorage.setItem("esInvitado", "true");
      sessionStorage.setItem("esAdmin", "false");
      // El rol se fija antes de renderizar la siguiente vista para que EDITAR
      // y Lectura/Edición nunca aparezcan durante el primer frame del invitado.
      document.documentElement.dataset.rol = "invitado";
      document.documentElement.classList.remove("admin-autorizado");
      if (document.body) document.body.dataset.rol = "invitado";
      if (window.Permisos?.activarInvitado) window.Permisos.activarInvitado();
      // Invitado: predeterminado SIEMPRE Light.
      sessionStorage.setItem("guest_modo_oscuro", "false");
      try { localStorage.removeItem("guest_modo_oscuro"); } catch (_) {}
      document.documentElement.classList.remove("modo-oscuro");
      document.documentElement.dataset.theme = "light";
      if (document.body) {
        document.body.classList.remove("modo-oscuro");
        document.body.dataset.theme = "light";
      }
    } catch (_) {}
    await irAlInicio();
  }
  );
  const tarjeta = document.querySelector(".login-tarjeta");
  if (tarjeta && !tarjeta.querySelector("[data-login-aviso]")) {
    const aviso = document.createElement("div");
    aviso.dataset.loginAviso = "1";
    aviso.className = "login-aviso";
    aviso.innerHTML = '<span class="login-aviso-tag">Nota</span><span>El acceso con Email, Google o GitHub está reservado al administrador. Para ver el contenido pulsa Entrar como Invitado.</span>';
    tarjeta.appendChild(aviso);
  }
}
