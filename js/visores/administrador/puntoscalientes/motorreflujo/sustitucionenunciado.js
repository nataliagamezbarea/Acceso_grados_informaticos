/* Sustitución de enunciado y reflujo de recuadros: responsabilidad única y auto-contenida. */
function _seNorm(v) {
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
}
function _colorFondo(ctx) {
  const d=ctx.getImageData(Math.min(2,ctx.canvas.width-1),Math.min(2,ctx.canvas.height-1),1,1).data;
  return `rgb(${d[0]},${d[1]},${d[2]})`;
}
function _wrap(ctx,text,max) {
  const out=[];
  const limit=Math.max(1,Number(max)||1);
  const meter=(s)=>ctx.measureText(s).width;
  const splitWord=(word)=> {
    const pieces=[];
    let part='';
    for(const ch of String(word)) {
      const test=part+ch;
      if(part && meter(test)>limit) {
        pieces.push(part);
        part=ch;
      } else if(!part && meter(ch)>limit) {
        pieces.push(ch);
        part='';
      } else part=test;
    }
    if(part) pieces.push(part);
    return pieces.length?pieces:[''];
  }
  ;
  for(const para of String(text).split(/\n/)) {
    const words=para.trim().split(/\s+/).filter(Boolean);
    if(!words.length) {
      out.push('');
      continue;
    }
    let line='';
    for(const w of words) {
      if(meter(w)>limit) {
        if(line) {
          out.push(line);
          line='';
        }
        const pieces=splitWord(w);
        for(let i=0;i<pieces.length-1;i++) out.push(pieces[i]);
        line=pieces[pieces.length-1];
        continue;
      }
      const c=line?line+' '+w:w;
      if(line && meter(c)>limit) {
        out.push(line);
        line=w;
      } else line=c;
    }
    if(line) out.push(line);
  }
  return out.length?out:[''];
}
function _rgbPdf(n) {
  if(Number.isFinite(n)) return `rgb(${(n>>16)&255},${(n>>8)&255},${n&255})`;
  return '#000000';
}
function _detectarColorTextoCanvas(ctx,op,fondo) {
  try {
    const left=Math.max(0,Math.floor(op.left||0));
    const top=Math.max(0,Math.floor(op.top||0));
    const right=Math.min(ctx.canvas.width,Math.ceil(op.right||left+1));
    const bottom=Math.min(ctx.canvas.height,Math.ceil(op.bottom||top+1));
    if(right<=left||bottom<=top)return null;
    const w=right-left,h=bottom-top;
    const data=ctx.getImageData(left,top,w,h).data;
    const bg=(()=> {
      const m=String(fondo||'').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
      return m?[+m[1],+m[2],+m[3]]:[255,255,255];
    }
    )();
    let mejor=null,mejorDist=-1;
    for(let i=0;i<data.length;i+=4) {
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(a<180)continue;
      const dist=Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2]);
      if(dist<45)continue;
      if(r>248&&g>248&&b>248)continue;
      if(dist>mejorDist) {
        mejorDist=dist;
        mejor=(r<<16)|(g<<8)|b;
      }
    }
    return mejor;
  } catch(_) {
    return null;
  }
}
function _fontReady() {
  return (typeof document !== 'undefined' && document.fonts?.ready) ? document.fonts.ready : Promise.resolve();
}
function _clear(ctx,left,top,right,bottom,fondo) {
  ctx.fillStyle=fondo;
  ctx.fillRect(Math.max(0,left),Math.max(0,top),Math.max(0,right-left),Math.max(0,bottom-top));
}
function construirOperacionSustitucion(lineas, rects, textoOriginal, nuevoTexto, viewport, cambio=null) {
  if(!String(nuevoTexto||'').trim()) return null;
  const objetivo=_seNorm(textoOriginal);
  const compacta=v=>_seNorm(v).replace(/\s+/g,'');
  const targetC = compacta(textoOriginal);
  let base = null;
  if (cambio && Number.isFinite(Number(cambio.targetTop))) {
    const yT = Number(cambio.targetTop);
    base = (lineas || []).find(l => Math.abs(l.top - yT) < 3 && (compacta(l.texto).includes(targetC) || (targetC.length >= 6 && targetC.includes(compacta(l.texto)) && compacta(l.texto).length >= 4)));
    if (!base && (!targetC || /^\[.*\]$/.test(textoOriginal))) {
      base = (lineas || []).find(l => Math.abs(l.top - yT) < 3);
    }
  }
  if (!base && targetC && !/^\[.*\]$/.test(textoOriginal)) {
    base = (lineas || []).find(l => compacta(l.texto).includes(targetC));
    if (!base && targetC.length >= 6) {
      base = (lineas || []).find(l => targetC.includes(compacta(l.texto)) && compacta(l.texto).length >= 4);
    }
  }
  if (!base && cambio?.selectedRect && (!targetC || /^\[.*\]$/.test(textoOriginal))) {
    const hs = cambio.selectedRect;
    const hsTop = Number(hs.top) / 100 * viewport.height;
    base = (lineas || []).find(l => Math.abs(l.top - hsTop) < Math.max(25, (l.height || 15) * 2));
  }
  if(!base) return null;
  const hs=cambio?.hotspot || cambio?.selectedRect || null;
  const hsLeft=hs && Number.isFinite(Number(hs.left)) ? Number(hs.left)/100*viewport.width : base.left;
  const hsTop=hs && Number.isFinite(Number(hs.top)) ? Number(hs.top)/100*viewport.height : base.top;
  const hsRight=hs && Number.isFinite(Number(hs.width)) ? hsLeft + Number(hs.width)/100*viewport.width : base.right;
  const hsBottom=hs && Number.isFinite(Number(hs.height)) ? hsTop + Number(hs.height)/100*viewport.height : base.bottom;
  const span=base.items?.[0]|| {
  }
  ;
  const anchorBox=(rects||[]).filter(r=>r.top>base.bottom+2&&(r.bottom-r.top)>40&&(r.right-r.left)>150).sort((a,b)=>a.top-b.top)[0]||null;
  const fontSz = span.height || base.height;
  const fontFam = span.fontFamily || base.fontFamily || '';
  const fontNm = span.fontName || '';
  const lh = base.height * 1.08;
  const oldH = base.bottom - base.top;
  const pageMargin = 35;
  const vw = viewport?.width || 595.5;
  const marginLeft = (hs && Number.isFinite(Number(hs.left)) && Number(hs.left) > 10) ? Number(hs.left)/100*vw : pageMargin;
  const marginRight = (hs && Number.isFinite(Number(hs.width)) && Number(hs.width) < 90) ? marginLeft + Number(hs.width)/100*vw : (vw - pageMargin);
  const maxW = Math.max(10, marginRight - marginLeft);
  let wrappedLines = [String(nuevoTexto)];
  try {
    if (typeof document !== 'undefined') {
      const dummyCanvas = document.createElement('canvas');
      const dCtx = dummyCanvas.getContext('2d');
      dCtx.font = dddFuenteCSS( { fontFamily: fontFam, fontName: fontNm }
      , fontSz);
      wrappedLines = _wrap(dCtx, String(nuevoTexto), maxW);
    }
  } catch(_) {
  }
  const newH = Math.max(lh, wrappedLines.length * lh);
  const drawTop = base.top;
  const drawBottom = drawTop + newH;
  const delta = Math.max(0, drawBottom - base.bottom);
  return  {
    tipo:'reemplazar_texto',
    start: textoOriginal,
    old: textoOriginal,
    original: textoOriginal,
    left:base.left,top:base.top,right:base.right,bottom:base.bottom,
    nuevoTexto:String(nuevoTexto),
    fontSize:fontSz,
    fontName:fontNm,fontFamily:fontFam,fontColor:base.color,
    lineHeight:lh,originalHeight:oldH,
    anchorBox,
    originalLeft:marginLeft,originalRight:marginRight,
    originalTop:base.top,originalBottom:base.bottom,
    hotspotLeft:hsLeft,hotspotRight:hsRight,hotspotTop:hsTop,hotspotBottom:hsBottom,
    source: cambio?.hotspot || cambio || null,
    _delta: delta,
    _lineas: wrappedLines,
    _finalTop: drawTop,
    _finalBottom: drawBottom
  };
}
function _moveBandPaginated(ctx,from,delta,fondo,opts= {
}
) {
  if(!delta) return  { continuation:null,overflow:0,source:null,overflowStart:0,sourceY0:0 }
  ;
  const w=ctx.canvas.width, h=ctx.canvas.height;
  const marginTop=Math.max(0,opts.marginTop ?? 42);
  const marginBottom=Math.max(0,opts.marginBottom ?? 42);
  const usableBottom=Math.max(marginTop,h-marginBottom);
  const y0=Math.max(0,Math.floor(from));
  if(y0>=h) return  { continuation:null,overflow:0,source:null,overflowStart:0,sourceY0:0 }
  ;
  const sourceH=h-y0;
  const source=document.createElement('canvas');
  source.width=w;
  source.height=sourceH;
  source.getContext('2d', { willReadFrequently:true }
  ).drawImage(ctx.canvas,0,y0,w,sourceH,0,0,w,sourceH);
  _clear(ctx,0,y0,w,h,fondo);
  const destStart=y0+delta;
  const fitBottom=Math.min(usableBottom,h);
  const fitH=Math.max(0,Math.min(sourceH,fitBottom-destStart));
  if(fitH>0) { ctx.drawImage(source,0,0,w,fitH,0,destStart,w,fitH); }
  const overflowStart=Math.max(0,fitBottom-destStart);
  const overflowH=Math.max(0,sourceH-overflowStart);
  if(!overflowH) return  { continuation:null,overflow:0,source,overflowStart }
  ;
  if (!opts.allowContinuation) {
    return  { continuation:null,overflow:0,source,overflowStart }
    ;
  }
  // Verificar si la zona desbordada contiene contenido real (texto/gráficos) o solo fondo blanco.
  // Evita crear páginas de continuación completamente en blanco cuando no sea necesario.
  const tieneContenidoReal = (() =>  {
    try {
      const sCtx = source.getContext('2d',  { willReadFrequently: true }
  );
      const data = sCtx.getImageData(0, overflowStart, w, Math.min(overflowH, sourceH - overflowStart)).data;
      const m = String(fondo || '').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
      const bgR = m ? +m[1] : 255, bgG = m ? +m[2] : 255, bgB = m ? +m[3] : 255;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i+3] < 50) continue;
        if (Math.abs(data[i] - bgR) > 30 || Math.abs(data[i+1] - bgG) > 30 || Math.abs(data[i+2] - bgB) > 30) {
          return true;
        }
      }
    } catch (_) {
    }
    return false;
  }
  )();
  if (!tieneContenidoReal) {
    return  { continuation:null,overflow:0,source,overflowStart }
    ;
  }
  const continuation=document.createElement('canvas');
  continuation.width=w;
  continuation.height=h;
  const cc=continuation.getContext('2d', { willReadFrequently:true }
  );
  cc.fillStyle=fondo;
  cc.fillRect(0,0,w,h);
  const maxH=Math.min(overflowH,h-marginTop-marginBottom);
  if(maxH>0 && !opts.skipSourceDraw) { cc.drawImage(source,0,overflowStart,w,maxH,0,marginTop,w,maxH); }
  return  {
    continuation,overflow:overflowH,marginTop,marginBottom,usableBottom,source,overflowStart,sourceY0:y0
  }
  ;
}
function _clearTextOnly(ctx,op,fondo) {
  // Limpiar estrictamente la caja del texto original (base.left/right/top/bottom)
  // con margen protector para no borrar líneas horizontales decorativas arriba o abajo.
  const textLeft = Number.isFinite(op.left) ? op.left : 0;
  const textRight = Number.isFinite(op.right) ? op.right : ctx.canvas.width;
  const textTop = Number.isFinite(op.top) ? op.top : 0;
  const textBottom = Number.isFinite(op.bottom) ? op.bottom : ctx.canvas.height;
  const left = Math.max(0, Math.floor(textLeft - 2));
  const top = Math.max(0, Math.floor(textTop + 3));
  const right = Math.min(ctx.canvas.width, Math.ceil(textRight + 2));
  const bottom = Math.min(ctx.canvas.height, Math.floor(textBottom - 1));
  if (right > left && bottom > top) { _clear(ctx, left, top, right, bottom, fondo); }
}
function _reubicarRecuadroEnContinuacion(continuation, source, overflowStart, sourceY0, box, marginTop, fondo, recOp=null, oldBottom=null, overflowTitleLines=[], op=null) {
  if(!continuation) return [];
  const pages = [continuation];
  let curCont = continuation;
  const cw = curCont.width, ch = curCont.height;
  const marginT = Math.max(0, Number(marginTop) || 42);
  const usableBottom = ch - 42;
  let cc = curCont.getContext('2d', { willReadFrequently:true }
  );
  _clear(cc, 0, 0, cw, ch, fondo);
  let dstTop = marginT + 20;
  // Render overflow title lines at top of continuation page
  if (Array.isArray(overflowTitleLines) && overflowTitleLines.length > 0 && op) {
    cc.save();
    cc.font = dddFuenteCSS(op, op.fontSize);
    cc.fillStyle = _rgbPdf(op.fontColor);
    cc.textBaseline = 'top';
    cc.textAlign = 'center';
    const drawX = cw / 2;
    const lh = op.lineHeight || op.fontSize * 1.08;
    let tY = marginT + 10;
    for (let i = 0; i < overflowTitleLines.length; i++) {
      const tLine = overflowTitleLines[i];
      if (tY + lh > usableBottom - 60) {
        cc.save();
        cc.strokeStyle = '#1d71b8';
        cc.lineWidth = 2;
        const lineY = Math.floor(tY + 10) + 0.5;
        cc.beginPath();
        cc.moveTo(35, lineY);
        cc.lineTo(cw - 35, lineY);
        cc.stroke();
        cc.restore();
        const nextPage = document.createElement('canvas');
        nextPage.width = cw;
        nextPage.height = ch;
        const nCc = nextPage.getContext('2d',  { willReadFrequently: true }
  );
        _clear(nCc, 0, 0, cw, ch, fondo);
        pages.push(nextPage);
        curCont = nextPage;
        cc = nCc;
        cc.font = dddFuenteCSS(op, op.fontSize);
        cc.fillStyle = _rgbPdf(op.fontColor);
        cc.textBaseline = 'top';
        cc.textAlign = 'center';
        tY = marginT + 10;
      }
      cc.fillText(tLine, drawX, tY);
      tY += lh;
    }
    cc.restore();
    // Draw blue line underneath overflowed title lines
    cc.save();
    cc.strokeStyle = '#1d71b8';
    cc.lineWidth = 2;
    const lineY = Math.floor(tY + 10) + 0.5;
    cc.beginPath();
    cc.moveTo(35, lineY);
    cc.lineTo(cw - 35, lineY);
    cc.stroke();
    cc.restore();
    dstTop = lineY + 30;
  }
  // Draw intermediate content overflow (NATALIA GÁMEZ BAREA & ornament)
  if (source && overflowStart != null && sourceY0 != null && box) {
    const boxTop = Number(recOp?.cajaTop ?? box.cajaTop ?? box.top);
    const boxSrcTop = Math.max(0, (boxTop - sourceY0) - 15);
    if (overflowStart < boxSrcTop) {
      const intermediateH = Math.max(0, boxSrcTop - overflowStart);
      if (intermediateH > 0) {
        const drawH = Math.min(intermediateH, usableBottom - dstTop - 50);
        if (drawH > 0) {
          cc.drawImage(source, 0, overflowStart, cw, drawH, 0, dstTop, cw, drawH);
          dstTop = dstTop + drawH + 20;
        }
      }
    }
  }
  if (box) {
    const left = Math.max(0, Math.floor(box.left));
    const right = Math.min(cw, Math.ceil(box.right));
    const boxTop = Number(recOp?.cajaTop ?? box.cajaTop ?? box.top);
    const boxBottom = Number(recOp?.cajaBottom ?? box.cajaBottom ?? box.bottom);
    const bh = Math.max(10, boxBottom - boxTop);
    // If box does not fit on current continuation page, create a new continuation page!
    if (dstTop + bh > usableBottom) {
      const nextCont = document.createElement('canvas');
      nextCont.width = cw;
      nextCont.height = ch;
      const nCc = nextCont.getContext('2d',  { willReadFrequently: true }
  );
      _clear(nCc, 0, 0, cw, ch, fondo);
      pages.push(nextCont);
      curCont = nextCont;
      cc = nCc;
      dstTop = marginT + 20;
    }
    if(recOp && Array.isArray(recOp.lineas) && recOp.lineas.length) {
      cc.save();
      cc.textAlign='left';
      cc.textBaseline='top';
      for(const line of recOp.lineas) {
        const fontSz = line.fontSize || 18.42;
        cc.font = dddFuenteCSS(line, fontSz);
        cc.fillStyle = line.fontColor ? _rgbPdf(line.fontColor) : '#1d71b8';
        const lineY = dstTop + (line.relY ?? (line.top - boxTop));
        cc.fillText(line.texto, line.left, lineY);
      }
      cc.restore();
    } else if(source) {
      const innerW=Math.max(0,right-left-6), innerH=Math.max(0,bh-6);
      const srcT=Math.max(0,Math.floor(boxTop-sourceY0+3));
      const srcL=Math.max(0,Math.floor(left+3));
      if(innerW>0 && innerH>0) cc.drawImage(source,srcL,srcT,innerW,innerH,left+3,dstTop+3,innerW,innerH);
    }
    cc.save();
    cc.strokeStyle='#000000';
    cc.lineWidth=1;
    cc.strokeRect(Math.floor(left) + 0.5, Math.floor(dstTop) + 0.5, Math.floor(right - left), Math.floor(bh));
    cc.restore();
  }
  return pages;
}
async function _replaceWithAnchor(ctx,op,fondo,opts= {
}
,allOps=[]) {
  const w=ctx.canvas.width;
  const shiftBefore=typeof calcularDesplazamientoAntesDe==='function'?calcularDesplazamientoAntesDe(op.top,allOps):0;
  const oldTop=op.top-shiftBefore, oldBottom=op.bottom-shiftBefore;
  const oldH=Math.max(0,op.originalHeight || op.bottom-op.top);
  const marginLeft=Math.max(0, (Number.isFinite(op.originalLeft) && op.originalLeft > 10) ? op.originalLeft : 35);
  const marginRight=Math.min(w, (Number.isFinite(op.originalRight) && op.originalRight < w - 10) ? op.originalRight : w - 35);
  const maxW=Math.max(10,marginRight-marginLeft);
  const box=op.anchorBox||null;
  await _fontReady();
  ctx.save();
  ctx.font=dddFuenteCSS(op,op.fontSize);
  const wrapped=_wrap(ctx,op.nuevoTexto,maxW);
  const lh=op.lineHeight||op.fontSize*1.08;
  const newH=Math.max(lh,wrapped.length*lh);
  const extraH=Math.max(0,newH-oldH);
  ctx.restore();
  const marginTop=Math.max(0,opts.marginTop ?? 42);
  // El texto sustituido empieza EXACTAMENTE donde empezaba el original (oldTop)
  // Sin desplazar los gráficos ni adornos superiores hacia arriba.
  const shiftUp = 0;
  const drawTop = oldTop;
  const drawBottom = drawTop + newH;
  const delta = Math.max(0, drawBottom - oldBottom);
  const opShifted= { ...op,top:drawTop,bottom:oldBottom }
  ;
  if(!Number.isFinite(op.fontColor)) op.fontColor=_detectarColorTextoCanvas(ctx,opShifted,fondo);
  _clearTextOnly(ctx,opShifted,fondo);
  function _findNextContentY(ctx, fromY, fondo) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const m = String(fondo || '').match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    const bgR = m ? +m[1] : 255, bgG = m ? +m[2] : 255, bgB = m ? +m[3] : 255;
    try {
      const startY = Math.max(0, Math.floor(fromY));
      const data = ctx.getImageData(0, startY, w, h - startY).data;
      for (let y = 0; y < h - startY; y += 3) {
        const rowOffset = y * w * 4;
        for (let x = 0; x < w; x += 10) {
          const i = rowOffset + x * 4;
          if (data[i+3] < 50) continue;
          if (Math.abs(data[i] - bgR) > 35 || Math.abs(data[i+1] - bgG) > 35 || Math.abs(data[i+2] - bgB) > 35) {
            return startY + y;
          }
        }
      }
    } catch (_) {
    }
    return h;
  }
  let continuation=null;
  let continuationPages = [];
  const savedBoxes = [];
  if(delta>0) {
    const recOpsDesplazar = (allOps || []).filter(o => o.tipo === 'desplazar_recuadro_enunciado' && !o.desbordaPagina);
    for (const recOp of recOpsDesplazar) {
      const box = recOp.box;
      if (!box) continue;
      const bLeft = Math.max(0, Math.floor(box.left));
      const bRight = Math.min(ctx.canvas.width, Math.ceil(box.right));
      const bTop = Math.max(0, Math.floor(recOp.bTop ?? box.top));
      const bBottom = Math.min(ctx.canvas.height, Math.ceil(recOp.bBottom ?? box.bottom));
      const bW = bRight - bLeft;
      const bH = bBottom - bTop;
      if (bW > 0 && bH > 0) {
        const pad = 3;
        const copyL = Math.max(0, bLeft - pad);
        const copyT = Math.max(0, bTop - pad);
        const copyW = Math.min(ctx.canvas.width - copyL, bW + pad * 2);
        const copyH = Math.min(ctx.canvas.height - copyT, bH + pad * 2);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = copyW;
        tempCanvas.height = copyH;
        tempCanvas.getContext('2d',  { willReadFrequently: true }
        ).drawImage(
        ctx.canvas, copyL, copyT, copyW, copyH, 0, 0, copyW, copyH
  );
        _clear(ctx, 0, Math.max(0, bTop - 4), ctx.canvas.width, ctx.canvas.height, fondo);
        savedBoxes.push( {
          recOp,
          tempCanvas,
          copyL,
          copyW,
          copyH,
          pad,
          targetTop: Math.max(0, Math.floor(recOp.targetTop ?? bTop))
        }
  );
      }
    }
    const marginTop=Math.max(0,opts.marginTop ?? 42);
    // Limpiar desde oldTop hasta pasar la línea azul inferior original (oldBottom + 25)
    const clearTop = Math.max(0, Math.floor(oldTop - 2));
    const clearBottom = Math.min(ctx.canvas.height, Math.ceil(oldBottom + 25));
    _clear(ctx, 0, clearTop, ctx.canvas.width, clearBottom, fondo);
    // Mover todo el contenido que estaba por debajo de la línea azul inferior original (oldBottom + 25)
    // desplazándolo hacia abajo por delta para dejar espacio exacto al nuevo enunciado multi-línea
    const fromY = Math.max(0, Math.floor(oldBottom + 25));
    const pageLimit = ctx.canvas.height - 180;
    const overflowTitleLines = [];
    let testY = drawTop;
    for (const line of wrapped) {
      if (testY + lh > pageLimit) { overflowTitleLines.push(line); }
      testY += lh;
    }
    const hasOverflowOp = (allOps || []).some(o => o.desbordaPagina || o.tipo === 'reubicar_recuadro_continuacion') || overflowTitleLines.length > 0;
    const moved = _moveBandPaginated(ctx, fromY, delta, fondo,  {
      marginTop,
      marginBottom: opts.marginBottom ?? 42,
      allowContinuation: hasOverflowOp,
      skipSourceDraw: hasOverflowOp
    }
  );
    continuation = moved.continuation;
    if (continuation) {
      const recOps = (allOps || []).filter(o => o.tipo === 'reubicar_recuadro_continuacion');
      const firstRecOp = recOps[0] || (allOps || []).find(o => o.box) || null;
      continuationPages = _reubicarRecuadroEnContinuacion(
      continuation,
      moved.source,
      moved.overflowStart,
      moved.sourceY0,
      firstRecOp?.box || firstRecOp,
      marginTop,
      fondo,
      firstRecOp,
      oldBottom,
      overflowTitleLines,
      op
  );
    }
  } else if(delta<0) {
    _moveBandPaginated(ctx,oldBottom,delta,fondo, { marginTop,marginBottom:opts.marginBottom??42 }
  );
  }
  // Dibujar el nuevo enunciado (únicamente las líneas que caben en Página 1)
  ctx.save();
  ctx.font=dddFuenteCSS(op,op.fontSize);
  ctx.fillStyle=_rgbPdf(op.fontColor);
  ctx.textBaseline='top';
  ctx.textAlign='center';
  const drawX=(marginLeft+marginRight)/2;
  let drawY=drawTop;
  const renderLimit = ctx.canvas.height - 180;
  for(const line of wrapped) {
    if (drawY + lh <= renderLimit) {
      ctx.fillText(line,drawX,drawY);
      drawY+=lh;
    }
  }
  ctx.restore();
  // Trazar la línea azul inferior envolviendo la última línea dibujada en Pág 1
  if(drawY > drawTop) {
    ctx.save();
    ctx.strokeStyle = '#1d71b8';
    ctx.lineWidth = 2;
    const lineY = Math.floor(drawY + 16) + 0.5;
    ctx.beginPath();
    ctx.moveTo(35, lineY);
    ctx.lineTo(w - 35, lineY);
    ctx.stroke();
    ctx.restore();
  }
  for (const item of savedBoxes) {
    const dstL = item.copyL;
    const dstT = Math.max(0, item.targetTop - item.pad);
    _clear(ctx, dstL, dstT, dstL + item.copyW, dstT + item.copyH, fondo);
    ctx.drawImage(item.tempCanvas, 0, 0, item.copyW, item.copyH, dstL, dstT, item.copyW, item.copyH);
    item.recOp._restaurado = true;
  }
  op._delta = delta;
  op._lineas = wrapped;
  op._finalTop = drawTop;
  op._finalBottom = drawBottom;
  return continuationPages.length ? continuationPages : (continuation ? [continuation] : null);
}
window.construirOperacionSustitucion=construirOperacionSustitucion;
window._replaceWithAnchor=_replaceWithAnchor;
window._moveBandPaginated=_moveBandPaginated;
window._reubicarRecuadroEnContinuacion=_reubicarRecuadroEnContinuacion;
