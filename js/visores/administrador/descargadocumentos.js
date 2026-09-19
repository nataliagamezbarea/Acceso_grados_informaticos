/* DESCARGA DE PDF ACTUAL (< 85 lineas)
 *
 * 1) Primero intenta /api/preview en modo "new": si la rama *_limpia ya
 *    tiene ese PDF (interceptado por static-api.js, sin servidor), se
 *    descarga tal cual: ya viene limpio y reflujado de fabrica.
 * 2) Si NO existe (404 / sin rama limpia), se calcula el reflujo EN VIVO
 *    en el navegador a partir del PDF original: esta es la parte
 *    dinamica, valida para cualquier PDF, que no depende de que exista
 *    una version pre-hecha.
 *
 * OJO: se usa fetch() (no <a href> con navegacion real), porque el
 * interceptor de static-api.js solo engancha las llamadas fetch().
 */
async function _intentarDescargaLimpia(qs) {
  try {
    const r = await fetch(`/api/preview/${grad}?${qs}&mode=new&download=1`);
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    if (!buf || buf.byteLength === 0) return null;
    return buf;
  } catch (_e) {
    return null;
  }
}
async function _hotspotsAEliminarDePagina(p, it) {
  const lista = [];
  if (it.inc_interior === false && Array.isArray(p.name_hotspots)) {
    p.name_hotspots.forEach(h => lista.push( { tipo: 'nombre', hotspot: h }
    ));
  }
  if (it.inc_colegio === false && Array.isArray(p.school_hotspots)) {
    p.school_hotspots.forEach(h => lista.push( { tipo: 'colegio', hotspot: h }
    ));
  }
  return lista;
}
async function _calcularPDFReflujoEnVivo(bytesOriginales, it) {
  const doc = await pdfjsLib.getDocument( { data: new Uint8Array(bytesOriginales.slice(0)) }
  ).promise;
  const idx0 = 0;
  // nombre/colegio viven en la portada
  const pagina = await doc.getPage(idx0 + 1);
  const viewport = pagina.getViewport( { scale: 2 }
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d',  { alpha: false }
  );
  await pagina.render( { canvasContext: ctx, viewport }
  ).promise;
  const hotspots = await _hotspotsAEliminarDePagina( {
    name_hotspots: it.name_hotspots || [], school_hotspots: it.school_hotspots || []
  }
  , it);
  if (hotspots.length > 0 && typeof calcularPlanReflujo === 'function') {
    const plan = await calcularPlanReflujo(pagina, viewport, hotspots);
    plan.avisos.forEach(a => console.warn('[reflujo]', a));
    if (typeof aplicarPlanEnCanvas === 'function') aplicarPlanEnCanvas(canvas, plan);
  }
  const pdfLibDoc = await PDFLib.PDFDocument.load(bytesOriginales);
  await _aplicarAccionesImagenesPDF(pdfLibDoc, it);
  const img = await pdfLibDoc.embedPng(canvas.toDataURL('image/png'));
  const paginaLib = pdfLibDoc.getPage(idx0);
  const  { width, height }
  = paginaLib.getSize();
  paginaLib.drawImage(img,  { x: 0, y: 0, width, height }
  );
  return pdfLibDoc.save();
}
async function _aplicarAccionesImagenesPDF(pdfDoc, it) {
  const acciones = (it && (it.acciones_imagenes || it.imagenes)) ||  {
  }
  ;
  const borradas = Object.entries(acciones).filter(([,a]) => (typeof a === 'string' ? a : a?.accion) === 'borrar');
  if (!borradas.length || typeof pdfjsLib === 'undefined') return;
  const paginas = pdfDoc.getPages();
  const docJs = await pdfjsLib.getDocument( { data: await pdfDoc.save(), isEvalSupported:false }
  ).promise;
  const mul=(a,b)=>pdfjsLib.Util.transform(a,b);
  try {
    for (const [id, raw] of borradas) {
      const acc = typeof raw === 'string' ?  { accion:raw }
      : raw;
      const pageNum = Number(acc.page_num || 0), wantedIdx = Number(acc.img_idx || 0);
      if (!paginas[pageNum]) continue;
      const pageJs = await docJs.getPage(pageNum + 1);
      const vp = pageJs.getViewport( { scale:1 }
      ), opl=await pageJs.getOperatorList(), OPS=pdfjsLib.OPS;
      const stack=[], ident=[1,0,0,1,0,0];
      let m=ident.slice(), idx=0, target=null;
      for(let j=0;j<opl.fnArray.length;j++) {
        const fn=opl.fnArray[j], args=opl.argsArray[j];
        if(fn===OPS.save) stack.push(m.slice());
        else if(fn===OPS.restore) m=stack.pop()||m;
        else if(fn===OPS.transform && args) m=mul(m,args);
        else if((fn===OPS.paintImageXObject||fn===OPS.paintJpegXObject||fn===OPS.paintImageMaskXObject)&&args) {
          if(idx===wantedIdx) {
            const pts=[[0,0],[1,0],[1,1],[0,1]].map(pt=>pdfjsLib.Util.applyTransform(pt,m));
            const xs=pts.map(x=>x[0]),ys=pts.map(x=>x[1]);
            target= { left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys) }
            ;
            break;
          }
          idx++;
        }
      }
      if(target) {
        paginas[pageNum].drawRectangle( {
          x:target.left,y:vp.height-target.bottom,width:target.right-target.left,height:target.bottom-target.top,color:PDFLib.rgb(1,1,1),opacity:1,borderWidth:0
        }
  );
      } else console.warn('[descarga] No se encontró la imagen marcada:',id,wantedIdx);
    }
  } finally {
    await docJs.destroy();
  }
}
async function descargarPDFActual() {
  if (typeof ITEMS === 'undefined' || !ITEMS[POS] || !grad) return;
  const it = ITEMS[POS];
  const enc = (document.getElementById('cbInc') && document.getElementById('cbInc').checked) ? '1' : '0';
  const int = (document.getElementById('cbInt') && document.getElementById('cbInt').checked) ? '1' : '0';
  const col = (document.getElementById('cbCol') && document.getElementById('cbCol').checked) ? '1' : '0';
  const net = (typeof isAutoDelInternetActive === 'function' && isAutoDelInternetActive()) ? '1' : '0';
  const qs = `archivo=${encodeURIComponent(it.archivo)}&enc=${enc}&int=${int}&col=${col}&net=${net}`;
  let bytesFinales = null;
  if (window.ESTATICO_SIN_BACKEND !== true) bytesFinales = await _intentarDescargaLimpia(qs);
  if (!bytesFinales) {
    try {
      const rOrig = await fetch(it.preview_url || it.url || it.src || '');
      if (!rOrig.ok) throw new Error('No se pudo cargar el PDF original en modo estático');
      const bytesOriginales = await rOrig.arrayBuffer();
      if (typeof pdfjsLib === 'undefined' || typeof PDFLib === 'undefined') {
        console.error('[descarga] Faltan pdfjsLib o PDFLib para calcular el reflujo en vivo.');
        bytesFinales = bytesOriginales;
        // mejor entregar el original que nada
      } else {
        bytesFinales = await _calcularPDFReflujoEnVivo(bytesOriginales, it);
      }
    } catch (e) {
      console.error('[descarga] No se pudo generar el PDF:', e);
      return;
    }
  }
  const blob = new Blob([bytesFinales],  { type: 'application/pdf' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = it.archivo.split('/').pop() || 'documento.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
window.descargarPDFActual = descargarPDFActual;
