/* Eliminación de texto por hotspot. Los hotspots llegan en % de página. */
function _ehNorm(v) {
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
}
function _ehCompact(v) { return _ehNorm(v).replace(/\s+/g,''); }
function _ehRect(h,viewport) {
  const l = Number(h?.pct_left ?? h?.left ?? 0);
  const t = Number(h?.pct_top ?? h?.top ?? 0);
  const w = Number(h?.pct_width ?? h?.width ?? 0);
  const hg = Number(h?.pct_height ?? h?.height ?? 0);
  return  {
    left: l / 100 * viewport.width,
    top: t / 100 * viewport.height,
    right: (l + w) / 100 * viewport.width,
    bottom: (t + hg) / 100 * viewport.height
  };
}
function _ehOverlap(a,b) { return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top; }
function _ehCover(a,b) { return a.left<=b.left+3&&a.right>=b.right-3&&a.top<=b.top+3&&a.bottom>=b.bottom-3; }
function _ehSubstringRect(line,text,viewport) {
  const raw=String(line?.texto||'');
  const target=_ehCompact(text), compact=_ehCompact(raw);
  const idx=compact.indexOf(target);
  if(idx<0 || !target) return null;
  // La línea puede venir de varios items de PDF.js sin espacios entre ellos.
  // Medimos el fragmento por el ancho real de cada item, pero buscando sobre
  // una versión compactada (sin espacios) para no depender de cómo PDF.js
  // haya fragmentado el texto.
  const items=Array.isArray(line.items)?line.items:[];
  if(items.length) {
    let pos=0, xStart=null, xEnd=null;
    for(const it of items) {
      const txt=String(it.str||'');
      const c=_ehCompact(txt), a=pos, b=pos+c.length;
      const hitL=Math.max(idx,a), hitR=Math.min(idx+target.length,b);
      if(hitL<hitR) {
        const den=Math.max(1,c.length);
        const x1=(it._left??line.left)+(it._right!=null?it._right-(it._left??line.left):0)*((hitL-a)/den);
        const x2=(it._left??line.left)+(it._right!=null?it._right-(it._left??line.left):0)*((hitR-a)/den);
        xStart=xStart==null?x1:Math.min(xStart,x1);
        xEnd=xEnd==null?x2:Math.max(xEnd,x2);
      }
      pos=b;
    }
    if(xStart!=null && xEnd!=null)
    return  { left:xStart,top:line.top,right:xEnd,bottom:line.bottom }
    ;
  }
  // Fallback para PDFs donde no hay geometría de items accesible.
  const ratio=Math.max(1,compact.length);
  const x1=line.left+(line.right-line.left)*(idx/ratio);
  const x2=line.left+(line.right-line.left)*((idx+target.length)/ratio);
  return  { left:x1,top:line.top,right:x2,bottom:line.bottom }
  ;
}
function construirOperacionesEliminacionTexto(lineas, items, viewport, rects = []) {
  const operaciones=[], fullRemoved=new Set(), partial=[];
  for(const item of (items||[])) {
    if(!item || !item.hotspot || item.tipo==='imagen') continue;
    let h=_ehRect(item.hotspot,viewport);
    const objetivo=item.textoObjetivo||item.text||item.start||item.old||'';
    if(objetivo) {
      h.textoObjetivo=objetivo;
      const wanted=_ehCompact(objetivo);
      // Priorizar la línea que físicamente solapa con el hotspot
      const directHit = (lineas||[]).find(l=>_ehOverlap(h,l) && (!wanted || _ehCompact(l.texto).includes(wanted)));
      const candidateHit = (lineas||[]).filter(l=>Math.abs(l.top - h.top) < Math.max(30, (l.height||15) * 2))
                                       .find(l=>wanted && _ehCompact(l.texto).includes(wanted));
      const textHit = (lineas||[]).find(l=>wanted && _ehCompact(l.texto).includes(wanted));
      const fallbackHit = (lineas||[]).find(l=>_ehOverlap(h,l));
      const linea = directHit || candidateHit || textHit || fallbackHit;
      if(linea) {
        if(item.eliminarLineaCompleta) {
          fullRemoved.add(linea);
          continue;
        }
        const exact=_ehSubstringRect(linea,objetivo,viewport);
        if(exact) {
          exact.textoObjetivo=objetivo;
          h=exact;
        } else {
          h.textoObjetivo=objetivo;
        }
      }
    }
    for(const l of (lineas||[])) {
      if(!_ehOverlap(h,l)) continue;
      if(_ehCover(h,l)) fullRemoved.add(l);
      else partial.push( { h,line:l }
  );
    }
  }
  for(const p of partial) {
    operaciones.push( {
      tipo:'redactar_en_sitio',left:p.h.left,top:p.h.top,right:p.h.right,bottom:p.h.bottom,
      origenTop:p.line.top,origenBottom:p.line.bottom,lineaLeft:p.line.left,lineaRight:p.line.right,moverSufijo:true,
      textoObjetivo:p.h.textoObjetivo
    }
  );
  }
  for(const l of [...fullRemoved].sort((a,b)=>a.top-b.top)) {
    const insideBox = Array.isArray(rects) && rects.some(box => l.left >= box.left - 15 && l.right <= box.right + 15 && l.top >= box.top - 10 && l.bottom <= box.bottom + 10);
    if (!insideBox) {
      operaciones.push( { tipo:'colapsar_flujo',origenTop:l.top,origenBottom:l.bottom,origenTipo:'texto' } );
    }
  }
  return { operaciones,fullRemoved };
}
window.construirOperacionesEliminacionTexto=construirOperacionesEliminacionTexto;
