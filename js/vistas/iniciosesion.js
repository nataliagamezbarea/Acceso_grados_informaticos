function inicializarVistaLogin() {
  const form = document.getElementById("form-login");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorBox = document.getElementById("mensaje-error");
  const btnEmail = document.getElementById("btn-email");
  const btnGoogle = document.getElementById("btn-google");
  const btnGithub = document.getElementById("btn-github");
  const btnInvitado = document.getElementById("btn-invitado");
  if (!form) return;
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
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
    if (!supabase || !user) return false;
    try {
      const { data, error } = await supabase
        .schema("public")
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle();
      return !error && String(data?.rol || "").trim().toLowerCase() === "admin";
    } catch (_) {
      return false;
    }
  };
  const validarSesionOAuth = async () => {
    const supabase = await conseguirSupabase();
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
  const loginConOAuth = async proveedor =>  {
    if (oauthEnCurso) return;
    oauthEnCurso = true;
    if (errorBox) errorBox.hidden = true;
    const supabase = await conseguirSupabase();
    if (!supabase) return mostrarError("Error al conectar con Supabase.");
    const  { error }
    = await supabase.auth.signInWithOAuth( {
      provider: proveedor, options:  { redirectTo: window.location.origin + (window.APP_BASE || "/") }
    }
  );
    if (error) {
      oauthEnCurso = false;
      mostrarError(error.message);
    }
  }
  ;
  // Tras volver de Google/GitHub, Supabase ya tiene la sesión: comprobar el rol antes de entrar.
  validarSesionOAuth();
  btnGoogle?.addEventListener("click", () => loginConOAuth("google"));
  btnGithub?.addEventListener("click", () => loginConOAuth("github"));
  btnInvitado?.addEventListener("click", async () =>  {
    if (window.Permisos?.invitadosActivos === false) return mostrarError("Acceso restringido: el acceso temporal a invitados está desactivado.");
    try {
      sessionStorage.removeItem("esAdmin");
      sessionStorage.setItem("esInvitado", "true");
      sessionStorage.setItem("esAdmin", "false");
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
