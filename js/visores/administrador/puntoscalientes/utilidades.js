/* UTILIDADES DE HOTSPOTS Y HANDLES */
const _CLASES_HOTSPOT = ['orange-hotspot', 'red-hotspot', 'gray-hotspot', 'green-hotspot', 'blue-name-hotspot', 'gray-name-hotspot', 'school-hotspot', 'gray-school-hotspot', 'image-hotspot'];
// Un arrastre del recuadro/handle nunca debe convertirse en un CLICK
// sobre el documento o sobre otro hotspot al soltar el ratón.
let _hotspotArrastrando = false;
let _bloquearClickHotspotHasta = 0;
function _marcarArrastreHotspot() {
  _hotspotArrastrando = true;
  _bloquearClickHotspotHasta = performance.now() + 450;
}
if (!window.__dddHotspotClickGuard) {
  window.__dddHotspotClickGuard = true;
  document.addEventListener('click', (e) =>  {
    if (!_hotspotArrastrando && performance.now() >= _bloquearClickHotspotHasta) return;
    if (e.target?.closest?.('.box-handle, .orange-hotspot, .red-hotspot, .gray-hotspot, .green-hotspot, .blue-name-hotspot, .gray-name-hotspot, .school-hotspot, .gray-school-hotspot, .image-hotspot, .reflow-hotspot')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    }
    _hotspotArrastrando = false;
  }
  , true);
}
function marcarHotspotSeleccionado(el) {
  _CLASES_HOTSPOT.forEach(c => document.querySelectorAll('.' + c).forEach(h => h.classList.remove('selected')));
  if (el && el.classList) el.classList.add('selected');
}
function anadirHandlesRedimensionamiento(box, hotspot, pageNum, tipo) {
  ['tl', 'tr', 'bl', 'br'].forEach(pos =>  {
    const h = document.createElement('div');
    h.className = `box-handle ${pos}`;
    box.appendChild(h);
    h.onmousedown = (e) =>  {
      e.preventDefault();
      e.stopPropagation();
      const parent = box.parentElement, rectParent = parent.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY, startL = box.offsetLeft, startT = box.offsetTop, startW = box.offsetWidth, startH = box.offsetHeight;
      let huboMovimiento = false;
      const onMouseMove = (ev) =>  {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          huboMovimiento = true;
          _marcarArrastreHotspot();
        }
        let newL = startL, newT = startT, newW = startW, newH = startH;
        if (pos.includes('r')) newW = Math.max(10, startW + dx);
        if (pos.includes('l')) {
          const w = Math.max(10, startW - dx);
          newL = startL + (startW - w);
          newW = w;
        }
        if (pos.includes('b')) newH = Math.max(10, startH + dy);
        if (pos.includes('t')) {
          const h = Math.max(10, startH - dy);
          newT = startT + (startH - h);
          newH = h;
        }
        box.style.left = ((newL / rectParent.width) * 100) + '%';
        box.style.top = ((newT / rectParent.height) * 100) + '%';
        box.style.width = ((newW / rectParent.width) * 100) + '%';
        box.style.height = ((newH / rectParent.height) * 100) + '%';
      }
      ;
      const onMouseUp = async (ev) =>  {
        window.removeEventListener('mousemove', onMouseMove);
        if (huboMovimiento) {
          _marcarArrastreHotspot();
          ev?.preventDefault?.();
          ev?.stopPropagation?.();
        }
        window.removeEventListener('mouseup', onMouseUp);
        const pL = parseFloat(box.style.left).toFixed(2), pT = parseFloat(box.style.top).toFixed(2);
        const pW = parseFloat(box.style.width).toFixed(2), pH = parseFloat(box.style.height).toFixed(2);
        let txt = '';
        try {
          const rt = await fetch('/api/extract_box_text',  {
            method: 'POST', headers:  { 'Content-Type': 'application/json' }
            ,
            body: JSON.stringify( {
              grado: (ITEMS[POS]?._rama || grad), archivo: ITEMS[POS].archivo, page_num: pageNum, left: pL, top: pT, width: pW, height: pH
            }
            )
          }
  );
          txt = ((await rt.json()).text || '').trim();
        } catch (_e) {
        }
        if (hotspot) {
          hotspot.left = parseFloat(pL);
          hotspot.top = parseFloat(pT);
          hotspot.width = parseFloat(pW);
          hotspot.height = parseFloat(pH);
          if (txt) hotspot.start = txt;
          if (txt) hotspot.old = txt;
        }
        await fetch('/api/recuadro',  {
          method: 'POST', headers:  { 'Content-Type': 'application/json' }
          ,
          body: JSON.stringify( {
            grado: (ITEMS[POS]?._rama || grad), archivo: ITEMS[POS].archivo, tipo: tipo, page_num: pageNum, left: pL, top: pT, width: pW, height: pH, text: txt, hotspot_id: hotspot ? hotspot.id : undefined, start: hotspot ? hotspot.start : undefined
          }
          )
        }
  );
        if (typeof refrescarPaginaPreview === 'function') refrescarPaginaPreview(pageNum);
      }
      ;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    ;
  }
  );
}
/* Selector de ramas: siempre conserva SELECCIONAR y permite TODAS las ramas */
