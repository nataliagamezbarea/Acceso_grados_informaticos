window.PermisosSupabase = (() => {
  const SCHEMA_NAME = "grados-informaticos";

  const esperarCliente = async () => {
    for (let i = 0; i < 30; i++) {
      if (window.supabaseClient) return window.supabaseClient;
      await new Promise((r) => setTimeout(r, 50));
    }
    return null;
  };

  const getTabla = (cliente, nombreTabla) => {
    try {
      if (cliente && typeof cliente.from === "function") {
        return cliente.from(nombreTabla);
      }
    } catch (e) {}
    return cliente ? cliente.from(nombreTabla) : null;
  };

  const consultarTablaConFallback = async (cliente, nombreTabla, callback) => {
    if (!cliente) return { data: null, error: new Error("Sin cliente Supabase") };
    let errPublic = null;
    let errSchema = null;

    try {
      const resPublic = await callback(cliente.from(nombreTabla));
      if (!resPublic.error) return resPublic;
      errPublic = resPublic.error;
    } catch (e1) {
      errPublic = e1;
    }

    try {
      if (typeof cliente.schema === "function") {
        const resSchema = await callback(cliente.schema(SCHEMA_NAME).from(nombreTabla));
        if (!resSchema.error) return resSchema;
        errSchema = resSchema.error;
      }
    } catch (e2) {
      errSchema = e2;
    }

    return {
      data: null,
      error: new Error(`Tabla '${nombreTabla}' no disponible`),
    };
  };

  return {
    esperarCliente,
    getTabla,
    consultarTablaConFallback,
    SCHEMA_NAME,
  };
})();
