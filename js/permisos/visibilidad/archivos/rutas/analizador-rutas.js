/*
 * MÓDULO: Archivos - Analizador de Rutas
 * Detección y extracción de rutas locales a archivos referenciados en las filas de los CSV.
 */
(function (global) {
  const urlsDeFila = (f) => {
    const out = [];
    for (const [k, v] of Object.entries(f || {})) {
      if (!v || !/^(archivo|url|enlace|ruta|file|path)$/i.test(String(k))) continue;
      for (const part of String(v).split(/[;|\n]/g)) {
        const x = part.trim().replace(/^\.\//, "");
        if (!x || /^https?:\/\//i.test(x) || /^mailto:/i.test(x) || /^javascript:/i.test(x)) continue;
        out.push(x);
      }
    }
    return out;
  };

  const obtenerRutasReferenciadas = (rows) => {
    const set = new Set();
    (rows || []).forEach(f => urlsDeFila(f).forEach(u => set.add(u)));
    return set;
  };

  const AnalizadorRutas = {
    urlsDeFila,
    obtenerRutasReferenciadas
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = AnalizadorRutas;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.AnalizadorRutas = AnalizadorRutas;
})(typeof window !== "undefined" ? window : globalThis);
