(() => {
  const form = document.getElementById("form-login");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorBox = document.getElementById("mensaje-error");
  const btnEmail = document.getElementById("btn-email");
  const btnGoogle = document.getElementById("btn-google");
  const btnGithub = document.getElementById("btn-github");
  const btnInvitado = document.getElementById("btn-invitado");

  const mostrarError = (msg) => {
    if (errorBox) { errorBox.textContent = msg; errorBox.hidden = false; }
  };

  const irAlInicio = () => {
    const redir = new URLSearchParams(window.location.search).get("redir") || "../index.html";
    window.location.href = redir;
  };

  const conseguirSupabase = async () => {
    for (let i = 0; i < 50; i++) {
      if (window.supabaseClient) return window.supabaseClient;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  };

  // 1. Email y contraseña
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errorBox) errorBox.hidden = true;

      const supabase = await conseguirSupabase();
      if (!supabase) { mostrarError("Error al conectar con Supabase."); return; }

      if (btnEmail) { btnEmail.disabled = true; btnEmail.textContent = "Entrando..."; }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      if (error) {
        mostrarError(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos." : error.message);
        if (btnEmail) { btnEmail.disabled = false; btnEmail.textContent = "Iniciar sesión"; }
        return;
      }

      sessionStorage.removeItem("esInvitado");
      if (window.Permisos) await window.Permisos.cargoSesion();
      irAlInicio();
    });
  }

  const loginConOAuth = async (proveedor) => {
    if (errorBox) errorBox.hidden = true;
    const supabase = await conseguirSupabase();
    if (!supabase) { mostrarError("Error al conectar con Supabase."); return; }

    const redir = new URLSearchParams(window.location.search).get("redir");
    const destinoOAuth = new URL("login.html", window.location.href);
    if (redir) destinoOAuth.searchParams.set("redir", redir);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: proveedor,
      options: { redirectTo: destinoOAuth.href },
    });

    if (error) mostrarError(error.message);
  };

  if (btnGoogle) btnGoogle.addEventListener("click", () => loginConOAuth("google"));
  if (btnGithub) btnGithub.addEventListener("click", () => loginConOAuth("github"));

  // 3. Invitado
  if (btnInvitado) {
    btnInvitado.addEventListener("click", async () => {
      if (window.Permisos && typeof window.Permisos.cargarAjustesServidor === "function") {
        await window.Permisos.cargarAjustesServidor();
      }
      if (window.Permisos && window.Permisos.invitadosActivos === false) {
        mostrarError(
          "Acceso restringido: Esta cuenta no pertenece a un administrador ni colaborador del repositorio. " +
          "En este momento el material está en revisión o actualización y el acceso temporal a invitados está desactivado. " +
          "Inténtalo de nuevo más tarde. Si necesitas acceso, contacta con la propietaria del repositorio."
        );
        return;
      }
      sessionStorage.setItem("esInvitado", "true");
      irAlInicio();
    });
  }

  // Aviso informativo
  const tarjeta = document.querySelector(".login-tarjeta");
  if (tarjeta) {
    const aviso = document.createElement("div");
    aviso.style.cssText = "margin-top:20px;padding:12px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:12px;line-height:1.5;color:#0369a1;text-align:center;";
    aviso.innerHTML = "<strong>Nota:</strong> El acceso con Email, Google o GitHub está reservado al administrador. Para acceder como alumno pulsa <strong>Entrar como Invitado</strong>.";
    tarjeta.appendChild(aviso);
  }
})();
