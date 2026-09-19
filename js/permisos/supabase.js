window.PermisosSupabase = (() =>  {
  // Schema real de las tablas de la aplicación.
  // Supabase JS enviará Accept-Profile: grados-informaticos.
  const SCHEMA_NAME = "grados-informaticos";
  const asegurarCliente = () => {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase?.createClient) {
      try {
        const url = window.SUPABASE_URL || "https://lztatgnlplpduiatmlrv.supabase.co";
        const key = window.SUPABASE_ANON_KEY || "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
        window.supabaseClient = window.supabase.createClient(url, key, {
          db: { schema: SCHEMA_NAME },
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return window.supabaseClient;
      } catch (_) {}
    }
    return null;
  };
  const esperarCliente = async () =>  {
    const c = asegurarCliente();
    if (c) return c;
    for (let i = 0; i < 30; i++) {
      const cli = asegurarCliente();
      if (cli) return cli;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  }
  ;
  const getTabla = (cliente, nombreTabla) =>  {
    if (!cliente) return null;
    // perfiles está en public; todo lo demás de este módulo está en
    // "grados-informaticos". No hacemos primero una petición a public,
    // porque eso genera 404 y además oculta el problema real del schema.
    try {
      if (nombreTabla === "perfiles") { return cliente.schema("public").from(nombreTabla); }
      return cliente.schema(SCHEMA_NAME).from(nombreTabla);
    } catch (e) {
      return null;
    }
  }
  ;
  const consultarTablaConFallback = async (cliente, nombreTabla, callback) =>  {
    if (!cliente) return  { data: null, error: new Error("Sin cliente Supabase") }
    ;
    try {
      const tabla = getTabla(cliente, nombreTabla);
      if (!tabla) throw new Error(`No se pudo crear el cliente para '${nombreTabla}'`);
      return await callback(tabla);
    } catch (e) {
      return  { data: null, error: e }
      ;
    }
  }
  ;
  return  {
    esperarCliente,
    getTabla,
    consultarTablaConFallback,
    SCHEMA_NAME,
  }
  ;
}
)();
