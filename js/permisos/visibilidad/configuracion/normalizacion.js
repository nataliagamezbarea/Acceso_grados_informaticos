/*
 * MÓDULO: Configuración - Normalización
 * Funciones para normalizar cadenas, trimestres y generar claves únicas de fila.
 */
(function (global) {
  const normalizar = (v) => String(v ?? "").trim().toLowerCase();

  // MISMA NORMALIZACIÓN QUE USA EL RESTO DEL PROYECTO PARA FILTRAR TRIMESTRES.
  // Ej.: "1", "1º" y "1º Trimestre" -> "1".
  const normalizarTrimestre = (v) => {
    const valor = String(v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u00A0/g, " ")
      .trim();

    // Normaliza 1, 1º, 1ª, 1º Trimestre, etc. a "1"
    const numero = valor.match(/\d+/);
    if (numero) return numero[0];

    return valor
      .replace(/[ºª]/g, "")
      .replace(/\btrimestres?\b/gi, "")
      .trim()
      .toLowerCase();
  };

  const claveFila = (seccion, f) =>
    `${normalizar(seccion)}|${normalizar(f?.ASIGNATURA)}|${normalizarTrimestre(f?.TRIMESTRE)}|${normalizar(f?.NOMBRE)}|${normalizar(f?.ARCHIVO || "")}`;

  const Normalizacion = {
    normalizar,
    normalizarTrimestre,
    claveFila
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Normalizacion;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.Normalizacion = Normalizacion;
})(typeof window !== "undefined" ? window : globalThis);
