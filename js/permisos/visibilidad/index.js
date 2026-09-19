/*
 * PUNTO DE ENTRADA: Visibilidad
 * Conecta los módulos organizados en subcarpetas y expone la API pública
 * unificada a través de window.Visibilidad y window.PermisosVisibilidad.
 */
(function (global) {
  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};

  const cargarArchivos = async (asignatura, trimestre) =>
    getMod("ConsultaVisibilidad").cargarArchivos?.(asignatura, trimestre);

  const puedeVer = (seccion, nombre, esAdmin, modoEdicion) =>
    getMod("ConsultaVisibilidad").puedeVer?.(seccion, nombre, esAdmin, modoEdicion);

  const esVisibleParaInvitado = (seccion, nombre, asignatura, trimestre) =>
    getMod("ConsultaVisibilidad").esVisibleParaInvitado?.(seccion, nombre, asignatura, trimestre);

  const esArchivoVisibleParaInvitado = (seccion, nombreFila) =>
    getMod("ConsultaVisibilidad").esArchivoVisibleParaInvitado?.(seccion, nombreFila);

  const guardarVisibilidad = async (asignatura, trimestre, seccion, nombre, visible) =>
    getMod("GestorMovimiento").guardarVisibilidad?.(asignatura, trimestre, seccion, nombre, visible);

  const guardarVisibilidadArchivo = async (asignatura, trimestre, seccion, nombreFila, nombreArchivo, visible) =>
    getMod("GestorMovimiento").guardarVisibilidadArchivo?.(asignatura, trimestre, seccion, nombreFila, nombreArchivo, visible);

  const guardarVisibilidadSeccion = async (asignatura, trimestre, seccion, listaNombres, visible) =>
    getMod("GestorMovimiento").guardarVisibilidadSeccion?.(asignatura, trimestre, seccion, listaNombres, visible);

  const asegurarCsvIniciales = async () =>
    getMod("GestorMovimiento").asegurarCsvIniciales?.();

  const Visibilidad = {
    cargarArchivos,
    puedeVer,
    esVisibleParaInvitado,
    esArchivoVisibleParaInvitado,
    guardarVisibilidad,
    guardarVisibilidadArchivo,
    guardarVisibilidadSeccion,
    asegurarCsvIniciales,
    modulos: global.VisibilidadModulos
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Visibilidad;
  }
  global.Visibilidad = Visibilidad;
  global.PermisosVisibilidad = Visibilidad;
})(typeof window !== "undefined" ? window : globalThis);
