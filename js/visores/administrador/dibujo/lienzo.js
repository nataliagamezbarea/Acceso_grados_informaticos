/* EVENTOS DE DIBUJO SOBRE CANVAS (< 60 lineas) */
const _CLASES_NO_DIBUJAR_AQUI = (typeof _CLASES_HOTSPOT !== 'undefined' ? _CLASES_HOTSPOT : [
'orange-hotspot', 'red-hotspot', 'gray-hotspot', 'green-hotspot',
'blue-name-hotspot', 'gray-name-hotspot', 'school-hotspot', 'gray-school-hotspot', 'image-hotspot'
]).concat(['box-handle', 'draw-box']);
function attachDrawingToPage(pageDiv, p, it) {
  pageDiv.onmousedown = (e) =>  {
    if (!isDrawingMode) return;
    e.preventDefault();
    e.stopPropagation();
    limpiarRecuadrosDibujoSobrantes();
    let isDrawing = true;
    const rect = pageDiv.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const drawBox = document.createElement('div');
    drawBox.className = 'draw-box ' + modoAnadirTipo;
    drawBox.style.left = startX + 'px';
    drawBox.style.top = startY + 'px';
    drawBox.style.width = '0px';
    drawBox.style.height = '0px';
    pageDiv.appendChild(drawBox);
    const onMouseMove = (ev) =>  {
      if (!isDrawing || !drawBox) return;
      const r = pageDiv.getBoundingClientRect();
      const currX = ev.clientX - r.left;
      const currY = ev.clientY - r.top;
      drawBox.style.left = Math.min(startX, currX) + 'px';
      drawBox.style.top = Math.min(startY, currY) + 'px';
      drawBox.style.width = Math.abs(currX - startX) + 'px';
      drawBox.style.height = Math.abs(currY - startY) + 'px';
    }
    ;
    const onMouseUp = async () =>  {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (!isDrawing) return;
      isDrawing = false;
      isDrawingMode = false;
      const vOld = document.getElementById('viewerOld');
      if (vOld) vOld.style.cursor = 'default';
      const editorBox = document.getElementById('editorBox');
      if (editorBox) editorBox.classList.remove('on');
      const tipoElegido = modoAnadirTipo;
      modoAnadirTipo = 'enunciado';
      await procesarFinDibujo(drawBox, pageDiv, p, it, tipoElegido);
    }
    ;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
  ;
}
