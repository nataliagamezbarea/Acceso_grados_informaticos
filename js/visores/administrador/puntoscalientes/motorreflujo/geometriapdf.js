/* GEOMETRÍA DDDDD — MuPDF.js. La lógica de reflujo permanece intacta. */
function _mupdfTransformPoint(m, x, y) { return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]]; }
async function extraerLineasTexto(pagina, viewport) {
  const scale = Number(viewport?.scale || 1);
  const contenido = await MuPDFCore.textoMuPDF(pagina, scale);
  const items = contenido.items
  .filter(it => it.str && it.str.trim())
  .map(it => {
    const bb = it.bbox || null;
    const x = Number(bb?.left ?? it.left ?? it.transform?.[4] ?? 0);
    const y = Number(bb?.top ?? it.top ?? 0);
    const w = Math.max(0, Number(bb?.width ?? it.width ?? 0));
    const h = Math.max(1, Number(bb?.height ?? it.height ?? 10));
    return {
      texto: it.str, left: x, top: y, right: x + w, bottom: y + h, height: h,
      fontSize: it.fontSize,
      fontName: it.fontName || '', fontFamily: it.fontFamily || '', color: it.color || null,
      underline: Boolean(it.underline),
      spans: it.spans || [],
      items: [{ ...it, _left: x, _right: x + w, _top: y, _bottom: y + h, _height: h }]
    };
  });
  items.sort((a, b) => a.top - b.top);
  const lineas = [];
  for (const it of items) {
    const linea = lineas.find(l => Math.abs(l.top - it.top) < Math.max(2, it.height * .6));
    if (linea) {
      linea.left = Math.min(linea.left, it.left);
      linea.right = Math.max(linea.right, it.right);
      linea.bottom = Math.max(linea.bottom, it.bottom);
      linea.height = linea.bottom - linea.top;
      linea.texto += (linea.texto.endsWith(' ') || it.texto.startsWith(' ') ? '' : ' ') + it.texto;
      linea.items.push(...it.items);
      if (Array.isArray(it.spans)) linea.spans = [...(linea.spans || []), ...it.spans];
      if (it.underline) linea.underline = true;
      if (!linea.fontFamily && it.fontFamily) linea.fontFamily = it.fontFamily;
      if (!linea.fontName && it.fontName) linea.fontName = it.fontName;
      if (!linea.color && it.color) linea.color = it.color;
    } else {
      lineas.push({
        top: it.top, bottom: it.bottom, left: it.left, right: it.right, height: it.height,
        texto: it.texto, fontSize: it.fontSize, items: [...it.items],
        spans: it.spans ? [...it.spans] : [],
        underline: Boolean(it.underline),
        fontName: it.fontName, fontFamily: it.fontFamily, color: it.color || null
      });
    }
  }
  return lineas.sort((a, b) => a.top - b.top);
}
async function extraerRectangulos(pagina, viewport) {
  const mupdf = await MuPDFCore.cargarMuPDF();
  const scale = Number(viewport?.scale || 1);
  const rects=[];
  const device=new mupdf.Device( {
    strokePath(path, stroke, ctm) {
      const ops=[];
      path.walk( {
        moveTo(x,y) { ops.push(['M',x,y]); }
        , lineTo(x,y) { ops.push(['L',x,y]); }
        ,
        closePath() { ops.push(['Z']); }
        , curveTo() { ops.push(['C']); }
      }
  );
      if(ops.some(o=>o[0]==='C')) return;
      const pts=ops.filter(o=>o[0]==='M'||o[0]==='L').map(o=>_mupdfTransformPoint(ctm,o[1],o[2]));
      if(pts.length<4 || ops[ops.length-1]?.[0]!=='Z') return;
      const xs=pts.map(p=>p[0]*scale), ys=pts.map(p=>p[1]*scale);
      const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
      const w=right-left,h=bottom-top;
      if(w>10*scale&&h>10*scale&&w<10000*scale&&h<10000*scale) {
        const isRect = pts.every(p =>  {
          const x = p[0] * scale, y = p[1] * scale;
          const nearX = Math.abs(x - left) < 5 * scale || Math.abs(x - right) < 5 * scale;
          const nearY = Math.abs(y - top) < 5 * scale || Math.abs(y - bottom) < 5 * scale;
          return nearX && nearY;
        }
  );
        if(isRect) rects.push( { left,right,top,bottom }
  );
      }
    }
  }
  );
  try { (pagina.runPageContents || pagina.run).call(pagina, device, mupdf.Matrix.identity); }
  finally {
    try { device.close(); }
    catch(_) { } }
  return rects;
}
async function extraerImagenes(pagina, viewport) {
  const mupdf = await MuPDFCore.cargarMuPDF();
  const scale = Number(viewport?.scale || 1);
  const imagenes=[];
  const device=new mupdf.Device( {
    fillImage(image,ctm) {
      const p=[[0,0],[1,0],[1,1],[0,1]].map(q=>_mupdfTransformPoint(ctm,q[0],q[1]));
      const xs=p.map(q=>q[0]*scale), ys=p.map(q=>q[1]*scale);
      const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      const width = right - left, height = bottom - top;
      // Excluir líneas finas decorativas (ancho o alto <= 8px) para que no se borren como imágenes
      if(width > 8*scale && height > 8*scale) imagenes.push( { left,right,top,bottom,width,height }
  );
    }
    ,
    fillImageMask(image,ctm) {
      const p=[[0,0],[1,0],[1,1],[0,1]].map(q=>_mupdfTransformPoint(ctm,q[0],q[1]));
      const xs=p.map(q=>q[0]*scale),ys=p.map(q=>q[1]*scale);
      const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
      const width = right - left, height = bottom - top;
      if(width > 8*scale && height > 8*scale) imagenes.push( { left,right,top,bottom,width,height }
  );
    }
  }
  );
  try { (pagina.runPageContents || pagina.run).call(pagina, device, mupdf.Matrix.identity); }
  finally {
    try { device.close(); }
    catch(_) { } }
  return imagenes;
}
if(typeof module!=='undefined'&&module.exports)module.exports= {
  extraerLineasTexto,extraerRectangulos,extraerImagenes
}
;
else {
  window.extraerLineasTexto=extraerLineasTexto;
  window.extraerRectangulos=extraerRectangulos;
  window.extraerImagenes=extraerImagenes;
}
