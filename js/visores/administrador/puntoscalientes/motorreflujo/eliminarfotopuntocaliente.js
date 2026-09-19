/* Eliminación de foto por hotspot: responsabilidad exclusiva de la FOTO.
 * Este módulo prepara las operaciones específicas de imagen y de su recuadro.
 * El motor raster/reflujo principal sigue siendo compartido.
 */
function construirOperacionesEliminacionFoto(imagenes, rects, items, viewport, operaciones) {
  const imgItems=(items||[]).filter(x=>x?.tipo==='imagen');
  const out=[];
  for(const item of imgItems) {
    const imagen=detectarImagenParaHotspot(imagenes,item.hotspot,viewport);
    const op=crearOperacionEliminacionImagen(imagen,viewport);
    if(op) {
      out.push(op);
    }
  }
  return out;
}
window.construirOperacionesEliminacionFoto=construirOperacionesEliminacionFoto;
