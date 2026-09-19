var originalFetch = window.fetch.bind(window);
window.fetch = async (input, init =  {
}
) =>  {
  const url = typeof input === "string" ? input : input?.url || "";
  let parsed = null;
  try { parsed = new URL(url, location.href); }
  catch (_) {
  }
  const pathname = parsed ? parsed.pathname : url;
  const isGitHub = parsed && (
  parsed.hostname === "api.github.com" ||
  parsed.hostname === "raw.githubusercontent.com"
  );
  // ============================================================
  // CINTURÓN DE SEGURIDAD DEL VISOR ADMIN
  // TODA petición a GitHub pasa por aquí:
  //   1) obtiene gh_token de configuracion_privada mediante la sesión
  //      Supabase ya existente;
  //   2) añade Authorization: Bearer <gh_token>;
  //   3) los archivos GENERALES de almacen/datos se fuerzan a master.
  //
  // Esto también cubre módulos antiguos que hagan fetch() directamente
  // y evita que vuelvan a pedir revision/rewrites en cada rama.
  // ============================================================
  if (isGitHub) {
    try {
      const cfg = await getConfig();
      const headers = new Headers(
      init.headers ||
      (typeof input !== "string" ? input.headers : undefined) ||  {
      }
  );
      // El token del visor-admin SIEMPRE es el de Supabase.
      headers.set("Authorization", "Bearer " + cfg.token);
      if (!headers.has("Accept")) { headers.set("Accept", "application/vnd.github+json"); }
      // Reescribir únicamente los datos GENERALES del almacén.
      // Nunca deben buscarse en Primer_grado_medio, DAW, etc.
      const u = new URL(parsed.href);
      const m = u.pathname.match(
      /^\/repos\/[^/]+\/[^/]+\/contents\/(almacen\/datos\/(?:revision\.json|rewrites_[^/]+\.json|nombres_eliminar\.json|colegios\.json|palabras_protegidas\.json|imagenes_borrar_globales\.json|registro_archivos\.csv))$/i
  );
      if (m && u.searchParams.has("ref")) {
        u.searchParams.set("ref", "master");
        input = u.href;
      }
      init =  { ...init, headers }
      ;
    } catch (e) {
      // Nunca se envía una petición GitHub del Visor Admin sin gh_token.
      return json( {
        ok: false,
        error: "No se pudo obtener gh_token de Supabase: " + (e.message || e)
      }
      , 401);
    }
    return originalFetch(input, init);
  }
  if (pathname.startsWith("/api/")) {
    try {
      if ((init.method || "GET").toUpperCase() === "GET") return await get(pathname + (parsed?.search || ""));
      const body = init.body ? JSON.parse(init.body) :  {
      }
      ;
      return await post(pathname, body);
    } catch (e) {
      return json( { ok: false, error: e.message || String(e) }
      , 500);
    }
  }
  return originalFetch(input, init);
}
;
window.StaticAPI =  { getConfig, getContent, saveJson, originalFetch }
;
window.dispatchEvent(new Event("static-api-ready"));
