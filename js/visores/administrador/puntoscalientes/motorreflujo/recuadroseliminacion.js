/* Reconstrucción y estrechamiento de recuadros por borrado de Nombres y Colegio: responsabilidad única y 100% aislada. */
function _stripTargetFromText(t, removedInside) {
  if (!t) return t;
  let cleaned = t;
  for (const rem of (removedInside || [])) {
    const txt = String(rem.texto || rem.text || '').trim();
    if (txt) {
      const esc = txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(esc, 'gi'), ' ');
    }
  }
  // Tras quitar el fragmento, colapsar los huecos que deja (dobles espacios,
  // espacio antes de una coma/dos puntos, coma o guion sueltos al principio
  // o al final) para que no queden artefactos tipo "3 DE  DE".
  return cleaned
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.:;])/g, '$1')
  .replace(/^[\s,.:;-]+/, '')
  .replace(/[\s,.:;-]+$/, '')
  .trim();
}
function construirOperacionesRecuadrosEliminacion(rects, lineas, fullRemoved, operaciones) {
  const out = [];
  for (const box of (rects || [])) {
    const inside = (lineas || []).filter(l => l.left >= box.left - 15 && l.right <= box.right + 15 && l.top >= box.top - 10 && l.bottom <= box.bottom + 10);
    const removedInside = inside.filter(l => fullRemoved.has(l));
    const operacionesFlujo = (operaciones || []).filter(o => o.tipo === 'colapsar_flujo' || o.tipo === 'colapsar_flujo_foto_hasta');
    const calcShift = typeof calcularDesplazamientoAntesDe === 'function'
    ? calcularDesplazamientoAntesDe
    : (y, ops) => (ops || []).filter(o => o.tipo === 'colapsar_flujo' && Number(o.origenBottom) <= Number(y)).reduce((s, o) => s + Math.max(0, Number(o.origenBottom) - Number(o.origenTop)), 0);
    const before = calcShift(box.top, operacionesFlujo);
    // CASO 1: Eliminación DENTRO del recuadro -> Reconstruir y estrechar caja ANCLADA AL FONDO ORIGINAL (box.bottom)
    if (removedInside.length > 0) {
      const remainingInside = inside.filter(l => !fullRemoved.has(l));
      if (!remainingInside.length) continue;
      const firstOrig = inside[0];
      const lastOrig = inside[inside.length - 1];
      const topPadding = firstOrig ? Math.max(12, firstOrig.top - box.top) : 12;
      const bottomPadding = lastOrig ? Math.max(12, box.bottom - lastOrig.bottom) : 12;
      const processedLines = remainingInside.map(l => {
        const t = String(l.texto || '').trim();
        return {
          texto: t,
          origLeft: l.left,
          origRight: l.right,
          origTop: l.top,
          origBottom: l.bottom,
          left: l.left,
          right: l.right,
          newTop: l.top,
          newBottom: l.bottom,
          height: l.height,
          fontSize: l.fontSize || l.items?.[0]?.fontSize || l.items?.[0]?._height || l.items?.[0]?.height || (l.height * 0.75),
          fontFamily: l.fontFamily || l.items?.[0]?.fontFamily || '',
          fontName: l.fontName || l.items?.[0]?.fontName || '',
          fontColor: l.color,
          underline: Boolean(l.underline),
          spans: Array.isArray(l.spans) && l.spans.length ? l.spans : (l.items || [])
        };
      }).filter(l => l.texto.length > 0);
      if (processedLines.length) {
        const maxLineRight = Math.max(...processedLines.map(l => Number(l.right || 0)), ...processedLines.map(l => Number(l.left || 0) + 120));
        const finalLeft = Math.min(Number(box.left), Math.min(...processedLines.map(l => Number(l.left || box.left))));
        const finalRight = Math.max(Number(box.right), maxLineRight + 15);
        const lineGap = 6;
        let totalLinesHeight = 0;
        for (let i = 0; i < processedLines.length; i++) {
          totalLinesHeight += processedLines[i].height + (i > 0 ? lineGap : 0);
        }
        const totalBoxHeight = topPadding + totalLinesHeight + bottomPadding;
        const finalBottom = Number(box.bottom) - before;
        const finalTop = Math.max(0, finalBottom - totalBoxHeight);

        const positionedLines = [];
        let curY = finalTop + topPadding;
        for (const l of processedLines) {
          const lineY = curY;
          curY += l.height + lineGap;
          positionedLines.push({
            ...l,
            left: l.left,
            relY: lineY - finalTop,
            top: lineY,
            bottom: lineY + l.height
          });
        }
        out.push({
          tipo: 'reconstruir_caja',
          cajaTop: finalTop,
          cajaBottom: finalBottom,
          cajaBottomAntes: box.bottom - before,
          cajaTopAntes: box.top - before,
          cajaOrigTop: box.top,
          cajaOrigBottom: box.bottom,
          left: finalLeft,
          right: finalRight,
          lineas: positionedLines
        });
      }
    }
    // CASO 2: Sin eliminación interna, pero con desplazamiento por colapso superior -> Desplazar recuadro entero
    else if (before > 0) {
      const finalTop = Math.max(0, box.top - before);
      const finalBottom = Math.max(finalTop + 25, box.bottom - before);
      out.push( {
        tipo: 'recolocar_recuadro',
        left: box.left, right: box.right,
        originalTop: box.top, originalBottom: box.bottom,
        finalTop: finalTop, finalBottom: finalBottom,
        shift: before
      }
  );
    }
  }
  return out;
}
window.construirOperacionesRecuadrosEliminacion = construirOperacionesRecuadrosEliminacion;
