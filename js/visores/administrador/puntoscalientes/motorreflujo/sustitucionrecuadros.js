/* Recuadros por Sustitución de Enunciados: responsabilidad única y 100% aislada. */
function construirOperacionesRecuadrosSustitucion(rects, lineas, opSustitucion, viewport) {
  const out = [];
  if (!opSustitucion || opSustitucion.tipo !== 'reemplazar_texto') return out;
  const delta = Number(opSustitucion._delta || 0);
  const drawBottom = Number(opSustitucion._finalBottom || (opSustitucion.top + delta));
  const oldBottom = Number(opSustitucion.originalBottom || opSustitucion.bottom);
  const pageLimit = (viewport?.height || 2525) - 42;
  const minGap = 30;
  // Intermediate content height (NATALIA GÁMEZ BAREA + ornament): ~300px
  const shiftedIntermediateBottom = drawBottom + 320;
  for (const box of (rects || [])) {
    const bTop = Number(box.top);
    const bBottom = Number(box.bottom);
    const boxHeight = bBottom - bTop;
    if (delta > 0) {
      const requiredTop = Math.max(bTop, shiftedIntermediateBottom + minGap);
      if (requiredTop + boxHeight <= pageLimit) {
        out.push( {
          tipo: 'desplazar_recuadro_enunciado',
          origen: 'sustitucion_enunciado',
          box,
          bTop,
          bBottom,
          shiftedBoxTop: bTop + delta,
          shiftedBoxBottom: bBottom + delta,
          targetTop: requiredTop,
          targetBottom: requiredTop + boxHeight,
          desbordaPagina: false
        }
  );
      } else {
        out.push( {
          tipo: 'reubicar_recuadro_continuacion',
          origen: 'sustitucion_enunciado',
          box,
          bTop,
          bBottom,
          desbordaPagina: true
        }
  );
      }
    }
  }
  return out;
}
window.construirOperacionesRecuadrosSustitucion = construirOperacionesRecuadrosSustitucion;
