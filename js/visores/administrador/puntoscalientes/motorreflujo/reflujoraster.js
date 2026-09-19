/* Motor raster del test estático: aplicación de plan de reflujo. */
function _colorFondo(ctx) {
  // Un único píxel en la esquina (2,2) es muy frágil: si ese punto cae sobre
  // un logo, una línea o cualquier elemento no blanco, TODO lo que se borra
  // en la página (recuadros de nombre/colegio/enunciados) se repinta con ese
  // color equivocado en vez del blanco real de la página. Para evitarlo,
  // muestreamos varios puntos de las esquinas/bordes (zonas casi siempre
  // vacías en un documento) y nos quedamos con el color que más se repite.
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const puntos = [
    [2,2], [w-3,2], [2,h-3], [w-3,h-3],
    [Math.floor(w/2),2], [2,Math.floor(h/2)], [w-3,Math.floor(h/2)], [Math.floor(w/2),h-3]
  ];
  const conteo = new Map();
  for (const [x,y] of puntos) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    let d;
    try { d = ctx.getImageData(x, y, 1, 1).data; }
    catch (_) { continue; }
    const k = `${d[0]},${d[1]},${d[2]}`;
    conteo.set(k, (conteo.get(k) || 0) + 1);
  }
  let mejor = null, mejorN = 0;
  for (const [k,n] of conteo) { if (n > mejorN) { mejorN = n; mejor = k; } }
  // Si no hay un color claramente dominante (todas las esquinas distintas),
  // es más seguro asumir blanco puro que arriesgarse a pintar con un color
  // sacado de un único punto no representativo.
  if (!mejor || mejorN < 2) return 'rgb(255,255,255)';
  return `rgb(${mejor})`;
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
function _sampleBg(ctx, left, top, right, bottom, fallback = 'rgb(255,255,255)') {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const l = Math.max(0, Math.floor(left));
  const r = Math.min(w - 1, Math.ceil(right));
  const t = Math.max(0, Math.floor(top));
  const b = Math.min(h - 1, Math.ceil(bottom));
  const pts = [
    [Math.max(2, l - 8), Math.min(h - 2, Math.max(2, Math.floor((t + b) / 2)))],
    [Math.min(w - 3, r + 8), Math.min(h - 2, Math.max(2, Math.floor((t + b) / 2)))],
    [Math.min(w - 2, Math.max(2, Math.floor((l + r) / 2))), Math.max(2, t - 6)],
    [Math.min(w - 2, Math.max(2, Math.floor((l + r) / 2))), Math.min(h - 3, b + 6)],
    [Math.max(4, l + 4), Math.max(4, t + 4)],
    [Math.min(w - 5, r - 4), Math.max(4, t + 4)],
    [Math.max(4, l + 4), Math.min(h - 5, b - 4)],
    [Math.min(w - 5, r - 4), Math.min(h - 5, b - 4)],
    [5, Math.min(h - 2, Math.max(2, t))],
    [w - 6, Math.min(h - 2, Math.max(2, t))]
  ];
  const conteo = new Map();
  for (const [px, py] of pts) {
    if (px >= 0 && py >= 0 && px < w && py < h) {
      try {
        const d = ctx.getImageData(px, py, 1, 1).data;
        if (d[3] >= 180) {
          const bri = 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2];
          if (bri > 200) {
            const k = `rgb(${d[0]},${d[1]},${d[2]})`;
            conteo.set(k, (conteo.get(k) || 0) + 1);
          }
        }
      } catch (_) {}
    }
  }
  let best = null, bestN = 0;
  for (const [k, n] of conteo) {
    if (n > bestN) { bestN = n; best = k; }
  }
  return best || fallback || _colorFondo(ctx);
}
function _sampleTextColor(ctx, x, y, w, h, fallback = null) {
  try {
    const lx = Math.max(0, Math.floor(x));
    const ly = Math.max(0, Math.floor(y));
    const lw = Math.min(ctx.canvas.width - lx, Math.max(1, Math.floor(w)));
    const lh = Math.min(ctx.canvas.height - ly, Math.max(1, Math.floor(h)));
    if (lw <= 0 || lh <= 0) return fallback;
    const img = ctx.getImageData(lx, ly, lw, lh).data;
    const chromaCounts = {};
    const darkCounts = {};
    for (let i = 0; i < img.length; i += 4) {
      if (img[i + 3] < 128) continue;
      const r = img[i], g = img[i + 1], b = img[i + 2];
      const bri = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (bri < 235) {
        const k = `rgb(${r},${g},${b})`;
        if (chroma > 20) {
          chromaCounts[k] = (chromaCounts[k] || 0) + 1;
        } else if (bri < 180) {
          darkCounts[k] = (darkCounts[k] || 0) + 1;
        }
      }
    }
    const topChroma = Object.entries(chromaCounts).sort((a, b) => b[1] - a[1]);
    if (topChroma.length > 0 && topChroma[0][1] >= 2) {
      return topChroma[0][0];
    }
    const topDark = Object.entries(darkCounts).sort((a, b) => b[1] - a[1]);
    if (topDark.length > 0 && topDark[0][1] >= 2) {
      return topDark[0][0];
    }
  } catch (_) {}
  return fallback;
}
function _rgbPdf(n) {
  if(typeof n === 'string' && n.trim()) return n;
  if(Array.isArray(n) && n.length >= 3) return `rgb(${n[0]},${n[1]},${n[2]})`;
  if(n && typeof n === 'object' && n.r != null) return `rgb(${n.r},${n.g},${n.b})`;
  if(Number.isFinite(n)) return `rgb(${(n>>16)&255},${(n>>8)&255},${n&255})`;
  return '#1d71b8';
}
function _fontReady() {
  return (typeof document !== 'undefined' && document.fonts?.ready) ? document.fonts.ready : Promise.resolve();
}
function _clear(ctx,left,top,right,bottom,fondo) {
  ctx.fillStyle=fondo;
  ctx.fillRect(Math.max(0,left),Math.max(0,top),Math.max(0,right-left),Math.max(0,bottom-top));
}
async function aplicarPlanEnCanvas(canvas,plan,opts= {
}
) {
  // IMPORTANTE: resolver las fuentes ANTES de cualquier measureText/fillText.
  // dddFuenteCSS() es síncrona; si la descarga se lanza después, el primer render
  // ya habría medido con Arial y el reflujo quedaría desplazado.
  if (typeof prepararFuentesDelPlan === 'function') {
    try { await prepararFuentesDelPlan(plan); }
    catch (e) { console.warn('[FUENTE] No se pudieron preparar todas las fuentes del plan:', e); }
  }
  const ctx=canvas.getContext('2d', { willReadFrequently:true }
  ), fondo=_colorFondo(ctx);
  const ops=plan.operaciones||[];
  for(const r of ops.filter(x=>x.tipo==='redactar_imagen')) _clear(ctx,r.left,r.top,r.right,r.bottom,fondo);
  const flujos=ops.filter(x=>x.tipo==='colapsar_flujo').sort((a,b)=>a.origenTop-b.origenTop);
  let shift=0;
  for(const f of flujos) {
    const top=Math.max(0,f.origenTop-shift), bottom=Math.max(top,f.origenBottom-shift);
    const hh=Math.max(0,canvas.height-bottom);
    if(hh) {
      const data=ctx.getImageData(0,bottom,canvas.width,hh);
      _clear(ctx,0,top,canvas.width,canvas.height,fondo);
      ctx.putImageData(data,0,top);
    }
    shift+=Math.max(0,f.origenBottom-f.origenTop);
  }
  const fotos=ops.filter(x=>x.tipo==='colapsar_flujo_foto_hasta').sort((a,b)=>a.origenTop-b.origenTop);
  for(const f of fotos) {
    const top=Math.max(0,f.origenTop-shift);
    const bottom=Math.max(top,f.origenBottom-shift);
    const stop=Math.max(bottom,Number(f.stopTop)-shift);
    const bandH=Math.max(0,stop-bottom);
    const destTop=Math.max(0,top);
    const localBg = _sampleBg(ctx, 0, destTop, canvas.width, stop, fondo);
    if(bandH>0) {
      const data=ctx.getImageData(0,bottom,canvas.width,bandH);
      _clear(ctx,0,destTop+bandH,canvas.width,stop,localBg);
      ctx.putImageData(data,0,destTop);
    }
  }
  for(const r of ops.filter(x=>x.tipo==='redactar_en_sitio')) {
    const sh=typeof calcularDesplazamientoAntesDe==='function' ? calcularDesplazamientoAntesDe(Number(r.origenTop),ops) : 0;
    const top=Number(r.top)-sh, bottom=Number(r.bottom)-sh;
    if(r.moverSufijo && Number.isFinite(r.lineaRight)) {
      const srcL=Math.max(0,Math.floor(Number(r.right)-1)), srcR=Math.min(canvas.width,Math.ceil(Number(r.lineaRight)+1));
      const srcT=Math.max(0,Math.floor(top-1)), srcB=Math.min(canvas.height,Math.ceil(bottom+1));
      const sw=Math.max(0,srcR-srcL), shh=Math.max(0,srcB-srcT);
      let suffix=null;
      if(sw>0&&shh>0) {
        suffix=document.createElement('canvas');
        suffix.width=sw;
        suffix.height=shh;
        suffix.getContext('2d', { willReadFrequently:true }
        ).drawImage(ctx.canvas,srcL,srcT,sw,shh,0,0,sw,shh);
      }
      _clear(ctx,Math.max(0,Number(r.left)-2),srcT,Math.min(canvas.width,Number(r.lineaRight)+2),srcB,fondo);
      if(suffix) {
        const dx=Math.max(0,Number(r.left));
        const dw=Math.min(sw,canvas.width-dx);
        if(dw>0) ctx.drawImage(suffix,0,0,dw,shh,dx,srcT,dw,shh);
      }
    } else _clear(ctx,Number(r.left),top,Number(r.right),bottom,fondo);
  }
  for(const r of ops.filter(x=>x.tipo==='recolocar_recuadro' || x.tipo==='recolocar_recuadro_foto')) {
    const left=r.left, right=r.right, top=r.finalTop, bottom=r.finalBottom;
    if(bottom<=top) continue;
    if(r.tipo==='recolocar_recuadro_foto') {
      const shiftedTop=Number(r.originalTop)-Number(r.shift||0);
      const shiftedBottom=Number(r.originalBottom)-Number(r.shift||0);
      const inset=3;
      const srcL=Math.max(0,Math.ceil(left+inset));
      const srcT=Math.max(0,Math.ceil(shiftedTop+inset));
      const srcR=Math.min(canvas.width,Math.floor(right-inset));
      const srcB=Math.min(canvas.height,Math.floor(shiftedBottom-inset));
      const iw=Math.max(0,srcR-srcL), ih=Math.max(0,srcB-srcT);
      let interior=null;
      if(iw>0 && ih>0) {
        interior=document.createElement('canvas');
        interior.width=iw;
        interior.height=ih;
        interior.getContext('2d', { willReadFrequently:true }
        ).drawImage(canvas,srcL,srcT,iw,ih,0,0,iw,ih);
      }
      _clear(ctx,left-2,shiftedTop-2,right+2,shiftedBottom+2,fondo);
      _clear(ctx,left-2,top-2,right+2,bottom+2,fondo);
      if(interior) {
        const dstL=Math.max(0,Math.ceil(left+inset));
        const dstT=Math.max(0,Math.ceil(top+inset));
        const maxW=Math.min(interior.width,canvas.width-dstL);
        const maxH=Math.min(interior.height,canvas.height-dstT);
        if(maxW>0 && maxH>0) ctx.drawImage(interior,0,0,maxW,maxH,dstL,dstT,maxW,maxH);
      }
    }
    ctx.save();
    ctx.strokeStyle = r.borderColor || '#000000';
    ctx.lineWidth = r.borderWidth || 1;
    ctx.strokeRect(Math.floor(left) + 0.5, Math.floor(top) + 0.5, Math.floor(right - left), Math.floor(bottom - top));
    ctx.restore();
  }
  for(const c of ops.filter(x=>x.tipo==='reconstruir_caja')) {
    const left=c.left,right=c.right,top=c.cajaTop,bottom=c.cajaBottom;
    if(bottom<=top) continue;
    const oldTop=Number(c.cajaTopAntes ?? top);
    const oldBottom=Number(c.cajaBottomAntes ?? bottom);
    const origTop=Number(c.cajaOrigTop ?? top);
    const origBottom=Number(c.cajaOrigBottom ?? bottom);

    // Muestrear color de fondo exacto dentro/junto a la caja antes de borrar
    const boxFondo = _sampleBg(ctx, left, Math.min(top, oldTop, origTop), right, Math.max(bottom, oldBottom, origBottom), fondo);

    // Limpiar estrictamente el área de la caja anterior, la original y la nueva
    const clearTop = Math.max(0, Math.floor(Math.min(top, oldTop, origTop) - 2));
    const clearBottom = Math.min(canvas.height, Math.ceil(Math.max(bottom, oldBottom, origBottom) + 2));
    const clearLeft = Math.max(0, Math.floor(left - 2));
    const clearRight = Math.min(canvas.width, Math.ceil(right + 2));

    // Muestrear colores específicos de la caja antes de borrar
    let boxLabelColor = null;
    let boxValueColor = null;
    const beforeShift = Number(c.cajaOrigTop != null && c.cajaTopAntes != null ? c.cajaOrigTop - c.cajaTopAntes : 0);

    for (const line of (c.lineas || [])) {
      const lx = Number(line.origLeft ?? line.left);
      const ly = Number(line.origTop ?? line.top);
      const lw = Math.max(10, Number((line.origRight ?? line.right) - lx));
      const lh = Math.max(10, Number(line.height || 16));
      const txt = String(line.texto || '');
      const match = txt.match(/^([A-ZÁÉÍÓÚÑ\s]{3,}:)(\s*.*)$/);
      if (match) {
        if (!boxLabelColor) {
          boxLabelColor = _sampleTextColor(ctx, lx, ly - beforeShift, 250, lh);
        }
        if (!boxValueColor && match[2].trim()) {
          boxValueColor = _sampleTextColor(ctx, lx + 260, ly - beforeShift, Math.max(10, lw - 260), lh);
        }
      } else {
        if (!boxValueColor) {
          boxValueColor = _sampleTextColor(ctx, lx, ly - beforeShift, lw, lh);
        }
      }
    }

    if (!boxLabelColor) boxLabelColor = '#3011f3';
    if (!boxValueColor) boxValueColor = '#006fc0';

    _clear(ctx, clearLeft, clearTop, clearRight, clearBottom, boxFondo);

    if(Array.isArray(c.lineas) && c.lineas.length) {
      ctx.save();
      ctx.textAlign='left';
      ctx.textBaseline='top';
      for(const line of c.lineas) {
        let baseFontSz = line.fontSize || (line.height * 0.75) || 12;
        const lineLeft = Number(line.left ?? (left + 12));
        const lineY = top + (line.relY ?? (line.top - top));
        const maxLineWidth = Math.max(10, right - lineLeft - 8);

        const fullText = String(line.texto || '');
        const labelMatch = fullText.match(/^([A-ZÁÉÍÓÚÑ\s]{3,}:)(\s*.*)$/);

        if (labelMatch) {
          const labelText = labelMatch[1];
          let valueText = labelMatch[2];
          if (valueText && !valueText.startsWith(' ')) valueText = ' ' + valueText;

          let fontSz = baseFontSz;
          ctx.font = dddFuenteCSS(line, fontSz);

          let totalW = ctx.measureText(labelText + valueText).width;
          let guard = 0;
          while (totalW > maxLineWidth && fontSz > 6 && guard < 25) {
            fontSz -= 0.5;
            ctx.font = dddFuenteCSS(line, fontSz);
            totalW = ctx.measureText(labelText + valueText).width;
            guard++;
          }

          const labelW = ctx.measureText(labelText).width;

          ctx.fillStyle = boxLabelColor;
          ctx.fillText(labelText, lineLeft, lineY);

          // Subrayado azul solo en la etiqueta
          ctx.save();
          ctx.strokeStyle = boxLabelColor;
          ctx.lineWidth = Math.max(1, Math.round(fontSz * 0.08));
          ctx.beginPath();
          const underlineY = Math.round(lineY + fontSz + 1);
          ctx.moveTo(lineLeft, underlineY);
          ctx.lineTo(lineLeft + labelW, underlineY);
          ctx.stroke();
          ctx.restore();

          if (valueText) {
            ctx.fillStyle = boxValueColor;
            ctx.fillText(valueText, lineLeft + labelW, lineY);
          }
        } else {
          let fontSz = baseFontSz;
          ctx.font = dddFuenteCSS(line, fontSz);
          ctx.fillStyle = boxValueColor;
          let w = ctx.measureText(fullText).width;
          let guard = 0;
          while (w > maxLineWidth && fontSz > 6 && guard < 25) {
            fontSz -= 0.5;
            ctx.font = dddFuenteCSS(line, fontSz);
            w = ctx.measureText(fullText).width;
            guard++;
          }
          ctx.fillText(fullText, lineLeft, lineY);

          if (line.underline) {
            ctx.save();
            ctx.strokeStyle = boxValueColor;
            ctx.lineWidth = Math.max(1, Math.round(fontSz * 0.08));
            ctx.beginPath();
            const underlineY = Math.round(lineY + fontSz + 1);
            ctx.moveTo(lineLeft, underlineY);
            ctx.lineTo(lineLeft + w, underlineY);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }
    // Trazar línea de borde exactamente igual al estilo de recuadro original del PDF
    ctx.save();
    ctx.strokeStyle = c.borderColor || '#000000';
    ctx.lineWidth = c.borderWidth || 1;
    ctx.strokeRect(Math.floor(left) + 0.5, Math.floor(top) + 0.5, Math.floor(right - left), Math.floor(bottom - top));
    ctx.restore();
  }
  const continuations=[];
  for(const op of ops.filter(x=>x.tipo==='reemplazar_texto').sort((a,b)=>a.top-b.top)) {
    const res=await _replaceWithAnchor(ctx,op,fondo,opts,ops);
    if(Array.isArray(res)) continuations.push(...res);
    else if(res) continuations.push(res);
  }
  for(const opRec of ops.filter(x=>x.tipo==='desplazar_recuadro_enunciado')) {
    if (opRec._restaurado) continue;
    const box = opRec.box;
    if (!box) continue;
    if (ops.some(o => o.tipo === 'reconstruir_caja' && Math.abs(Number(o.left) - Number(box.left)) < 10)) continue;
    const bLeft = Math.max(0, Math.floor(box.left));
    const bRight = Math.min(canvas.width, Math.ceil(box.right));
    const bW = bRight - bLeft;
    const bH = (opRec.bBottom || box.bottom) - (opRec.bTop || box.top);
    const delta = (ops.find(o => o.tipo === 'reemplazar_texto')?._delta) || 0;
    const srcTop = Math.max(0, Math.floor(opRec.shiftedBoxTop ?? (opRec.bTop + delta)));
    const dstTop = Math.max(0, Math.floor(opRec.targetTop ?? opRec.bTop));
    if (srcTop !== dstTop && bW > 0 && bH > 0) {
      const pad = 3;
      const copyL = Math.max(0, bLeft - pad);
      const copyT = Math.max(0, srcTop - pad);
      const copyW = Math.min(canvas.width - copyL, bW + pad * 2);
      const copyH = Math.min(canvas.height - copyT, bH + pad * 2);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = copyW;
      tempCanvas.height = copyH;
      tempCanvas.getContext('2d',  { willReadFrequently: true }
      ).drawImage(
      ctx.canvas, copyL, copyT, copyW, copyH, 0, 0, copyW, copyH
  );
      _clear(ctx, copyL, copyT, copyL + copyW, copyT + copyH, fondo);
      const dstL = Math.max(0, bLeft - pad);
      const dstT = Math.max(0, dstTop - pad);
      _clear(ctx, dstL, dstT, dstL + copyW, dstT + copyH, fondo);
      ctx.drawImage(tempCanvas, 0, 0, copyW, copyH, dstL, dstT, copyW, copyH);
    }
  }
  return  { canvas,continuations }
  ;
}
if(typeof module!=='undefined'&&module.exports) {
  module.exports= { aplicarPlanEnCanvas }
  ;
} else {
  window.aplicarPlanEnCanvas=aplicarPlanEnCanvas;
}
