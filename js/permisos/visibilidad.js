/*
 * VISIBILIDAD CSV + GITHUB
 *
 * Módulo principal y punto de entrada.
 * La funcionalidad ha sido dividida en carpetas y subcarpetas en español:
 *   - visibilidad/configuracion/  (constantes, normalización, repositorios y credenciales)
 *   - visibilidad/red/            (peticiones http, cliente api github, limpieza de historial)
 *   - visibilidad/archivos/       (procesador de CSV, analizador de rutas referenciadas)
 *   - visibilidad/operaciones/    (consulta de visibilidad, constructor público, gestor de movimiento)
 *   - visibilidad/index.js        (fachada unificada)
 */
(function (global) {
  // Carga dinámica de los módulos si no han sido incluidos previamente
  if (typeof document !== "undefined" && document.currentScript && (!global.VisibilidadModulos || !global.VisibilidadModulos.GestorMovimiento)) {
    const src = document.currentScript.src;
    const base = src.substring(0, src.lastIndexOf("/") + 1) + "visibilidad/";
    const modulos = [
      "configuracion/constantes.js",
      "configuracion/normalizacion.js",
      "configuracion/repositorios.js",
      "red/http/peticiones.js",
      "red/github/api-github.js",
      "red/github/historial.js",
      "archivos/csv/procesador-csv.js",
      "archivos/rutas/analizador-rutas.js",
      "operaciones/consulta/consulta-visibilidad.js",
      "operaciones/publicacion/constructor-publico.js",
      "operaciones/publicacion/gestor-movimiento.js",
      "index.js"
    ];
    for (const mod of modulos) {
      document.write('<script src="' + base + mod + '"><\/script>');
    }
  }

  // Delegados dinámicos para garantizar compatibilidad inmediata e ininterrumpida
  const delegarConsulta = (metodo, fallback) => (...args) => {
    const fn = global.VisibilidadModulos?.ConsultaVisibilidad?.[metodo];
    return typeof fn === "function" ? fn(...args) : fallback;
  };

  const delegarMovimiento = (metodo, fallback) => (...args) => {
    const fn = global.VisibilidadModulos?.GestorMovimiento?.[metodo];
    return typeof fn === "function" ? fn(...args) : fallback;
  };

  const Visibilidad = {
    cargarArchivos: delegarConsulta("cargarArchivos", Promise.resolve()),
    puedeVer: delegarConsulta("puedeVer", false),
    esVisibleParaInvitado: delegarConsulta("esVisibleParaInvitado", false),
    esArchivoVisibleParaInvitado: delegarConsulta("esArchivoVisibleParaInvitado", true),
    guardarVisibilidad: delegarMovimiento("guardarVisibilidad", Promise.resolve({ error: "Módulo no cargado" })),
    guardarVisibilidadArchivo: delegarMovimiento("guardarVisibilidadArchivo", Promise.resolve({ error: "Módulo no cargado" })),
    guardarVisibilidadSeccion: delegarMovimiento("guardarVisibilidadSeccion", Promise.resolve({ error: "Módulo no cargado" })),
    asegurarCsvIniciales: delegarMovimiento("asegurarCsvIniciales", Promise.resolve({ inicializados: false })),
    get modulos() { return global.VisibilidadModulos || {}; }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Visibilidad;
  }
  global.Visibilidad = Visibilidad;
  global.PermisosVisibilidad = Visibilidad;
})(typeof window !== "undefined" ? window : globalThis);
