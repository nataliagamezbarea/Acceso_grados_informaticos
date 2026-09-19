function _pctARectImg(hs, viewport) {
  const l = Number(hs?.pct_left ?? hs?.left ?? 0);
  const t = Number(hs?.pct_top ?? hs?.top ?? 0);
  const w = Number(hs?.pct_width ?? hs?.width ?? 0);
  const h = Number(hs?.pct_height ?? hs?.height ?? 0);
  return {
    left: l / 100 * viewport.width,
    top: t / 100 * viewport.height,
    right: (l + w) / 100 * viewport.width,
    bottom: (t + h) / 100 * viewport.height
  };
}
function detectarImagenParaHotspot(imagenes, hotspot, viewport) {
  const h = typeof _pctARect === 'function' ? _pctARect(hotspot, viewport) : _pctARectImg(hotspot, viewport);
  let best = null, bestArea = 0;
  for (const im of (imagenes || [])) {
    const L = Math.max(h.left, im.left), T = Math.max(h.top, im.top);
    const R = Math.min(h.right, im.right), B = Math.min(h.bottom, im.bottom);
    const area = Math.max(0, R - L) * Math.max(0, B - T);
    if (area > bestArea) {
      bestArea = area;
      best = im;
    }
  }
  if (best && bestArea > 0) return best;
  return {
    left: h.left,
    top: h.top,
    right: h.right,
    bottom: h.bottom,
    width: Math.max(1, h.right - h.left),
    height: Math.max(1, h.bottom - h.top)
  };
}
function crearOperacionEliminacionImagen(imagen, viewport) {
  if (!imagen) return null;
  return {
    tipo: 'redactar_imagen',
    left: Number(imagen.left),
    top: Number(imagen.top),
    right: Number(imagen.right),
    bottom: Number(imagen.bottom),
    origenTop: Number(imagen.top),
    origenBottom: Number(imagen.bottom)
  };
}
window.detectarImagenParaHotspot = detectarImagenParaHotspot;
window.crearOperacionEliminacionImagen = crearOperacionEliminacionImagen;
