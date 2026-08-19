window.PermisosGithub = (() => {
  const verificarAdmin = async (user, clientParam, tokenParam) => {
    if (!user) return false;
    const cliente = clientParam || (window.PermisosSupabase ? await window.PermisosSupabase.esperarCliente() : null);
    const tokenActual = tokenParam || (window.GITHUB_CONFIG && typeof window.GITHUB_CONFIG.obtenerTokenSeguro === "function" ? window.GITHUB_CONFIG.obtenerTokenSeguro() : "");

    const emailLimpio = String(user.email || "").toLowerCase().trim();
    let usernameGh = String(user.user_metadata?.user_name || user.user_metadata?.preferred_username || "").toLowerCase().trim();

    if (emailLimpio && (emailLimpio.includes("nataliagbarea") || emailLimpio.includes("nataliagamezbarea") || emailLimpio.includes("natalia"))) {
      try { sessionStorage.setItem("esAdmin", "true"); } catch (e) {}
      return true;
    }

    if (sessionStorage.getItem("esAdmin") === "true") {
      return true;
    }

    const ownerGhPages = (window.location.hostname.includes("github.io") ? window.location.hostname.split(".")[0] : "").toLowerCase().trim();
    if (ownerGhPages && usernameGh && usernameGh === ownerGhPages) {
      try { sessionStorage.setItem("esAdmin", "true"); } catch (e) {}
      return true;
    }

    try {
      if (cliente && window.PermisosSupabase) {
        const resPerfil = await window.PermisosSupabase.consultarTablaConFallback(
          cliente,
          "perfiles",
          (t) => t.select("rol").eq("id", user.id).maybeSingle()
        );
        if (!resPerfil.error && resPerfil.data && resPerfil.data.rol === "admin") {
          try { sessionStorage.setItem("esAdmin", "true"); } catch (e) {}
          return true;
        }
      }
    } catch (e) {}

    const repoActual = (window.GITHUB_CONFIG && window.GITHUB_CONFIG.repo) ? window.GITHUB_CONFIG.repo : "";

    if (tokenActual && usernameGh && repoActual) {
      try {
        const resCollab = await fetch(`https://api.github.com/repos/${repoActual}/collaborators/${usernameGh}`, {
          headers: {
            Authorization: `Bearer ${tokenActual}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "grados-informaticos",
          },
        });
        if (resCollab.status === 204 || resCollab.status === 200) {
          return true;
        }
      } catch (e) {}
    }

    try {
      if (cliente && repoActual) {
        const { data: { session } } = await cliente.auth.getSession();
        if (session?.provider_token) {
          const resCommits = await fetch(`https://api.github.com/repos/${repoActual}/commits?per_page=1`, {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "grados-informaticos",
            },
          });
          if (resCommits.ok) {
            return true;
          }
        }
      }
    } catch (e) {}

    return false;
  };

  return {
    verificarAdmin,
  };
})();
