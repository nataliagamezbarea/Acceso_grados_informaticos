/*
 * MÓDULO: Red - HTTP / Peticiones
 * Codificación Base64 y mecanismo de peticiones de red con reintentos para fallos transitorios.
 */
(function (global) {
  const decode64 = (s) => {
    if (!s) return "";
    try {
      if (global.PermisosCrypto?.decodificarBase64) return global.PermisosCrypto.decodificarBase64(s);
      const bin = (typeof atob === "function" ? atob : (b) => Buffer.from(b, "base64").toString("binary"))(String(s).replace(/\s+/g, ""));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
    } catch (_) { return ""; }
  };

  const encode64 = (s) => {
    const bytes = new TextEncoder().encode(String(s ?? ""));
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return (typeof btoa === "function" ? btoa : (b) => Buffer.from(b, "binary").toString("base64"))(bin);
  };

  const origenTokenSupabase = async () => {
    try {
      const Rep = global.VisibilidadModulos?.Repositorios || {};
      if (typeof Rep.tokenAdmin === "function") {
        const tPrivado = await Rep.tokenAdmin().catch(() => "");
        if (tPrivado) return { token: String(tPrivado).trim(), origen: "configuracion_privada (Supabase)" };
      }
      if (typeof Rep.tokenPublico === "function") {
        const tPublico = await Rep.tokenPublico().catch(() => "");
        if (tPublico) return { token: String(tPublico).trim(), origen: "configuracion_publica (Supabase)" };
      }
    } catch (_) {}
    return { token: "", origen: "ninguno" };
  };

  const fetchConReintentos = async (url, opciones = {}, maxIntentos = 3) => {
    const peticion = { ...(opciones || {}) };
    // Solo api.github.com admite Authorization en navegador sin romper CORS.
    if (/^https:\/\/api\.github\.com\//.test(String(url || ""))) {
      const encabezados = { ...(peticion.headers || {}) };
      if (!encabezados.Authorization) {
        const { token } = await origenTokenSupabase();
        if (token) encabezados.Authorization = `Bearer ${token}`;
      }
      peticion.headers = encabezados;
    }
    let ultimoError = null;
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        return await fetch(url, peticion);
      } catch (e) {
        ultimoError = e;
        if (intento < maxIntentos) {
          await new Promise(r => setTimeout(r, 600 * intento));
        }
      }
    }
    throw ultimoError || new Error(`Fallo de conexión persistente con GitHub en ${url}`);
  };

  const Http = {
    decode64,
    encode64,
    fetchConReintentos
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Http;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.Http = Http;
})(typeof window !== "undefined" ? window : globalThis);
