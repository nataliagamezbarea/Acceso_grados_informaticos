/*
 * MÓDULO: Configuración - Constantes
 * Define las constantes de nombres de archivos CSV y funciones auxiliares de sección.
 */
(function (global) {
  const CSV_APUNTES = "APUNTES.csv";
  const CSV_PRACTICAS = "EJERCICIOS_PRACTICAS_PROYECTOS.csv";
  const CSVS = [CSV_APUNTES, CSV_PRACTICAS];

  const archivoDeSeccion = (seccion) =>
    String(seccion ?? "").trim().toLowerCase() === "practicas" ? CSV_PRACTICAS : CSV_APUNTES;

  const Constantes = {
    CSV_APUNTES,
    CSV_PRACTICAS,
    CSVS,
    archivoDeSeccion
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Constantes;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.Constantes = Constantes;
})(typeof window !== "undefined" ? window : globalThis);
