window.PermisosGithub = (() => {
  const verificarAdmin = async (user, clientParam) => {
    if (!user) return false;
    try {
      const cliente = clientParam || (window.PermisosSupabase ? await window.PermisosSupabase.esperarCliente() : null);
      if (!cliente) return false;
      const { data, error } = await cliente
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
  return { verificarAdmin };
})();
