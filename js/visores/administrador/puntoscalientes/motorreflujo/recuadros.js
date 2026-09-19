/* Wraps and delegates recuadro operations between isolated modules: recuadros_eliminacion.js and recuadros_sustitucion.js */
function construirOperacionesRecuadros(rects, lineas, fullRemoved, operaciones, viewport) {
  const opsElim = typeof construirOperacionesRecuadrosEliminacion === 'function'
  ? construirOperacionesRecuadrosEliminacion(rects, lineas, fullRemoved, operaciones)
  : [];
  const rawSust = typeof construirOperacionesRecuadrosSustitucion === 'function'
  ? construirOperacionesRecuadrosSustitucion(rects, lineas, operaciones?.find?.(o => o.tipo === 'reemplazar_texto'), viewport)
  : [];
  const opsSust = rawSust.filter(s => !opsElim.some(e => Math.abs(Number(e.left) - Number(s.box?.left || s.bLeft || 0)) < 10));
  return [...opsElim, ...opsSust];
}
window.construirOperacionesRecuadros = construirOperacionesRecuadros;
