/* ENFOQUE Y SALTO ENTRE CAMBIOS (< 85 lineas) */
function enfocarCambioActual() {
  const cambios = obtenerCambiosDelPDFActual();
  if (!cambios.length) {
    actualizarNavegacionCambios();
    return;
  }
  if (NAV_CAMBIO_POS < 0 || NAV_CAMBIO_POS >= cambios.length) NAV_CAMBIO_POS = 0;
  const cambio = cambios[NAV_CAMBIO_POS];
  limpiarMarcaCambioActual();
  if (typeof _syncScrollSuspend !== 'undefined') _syncScrollSuspend++;
  const hs = cambio.hotspot ||  {
  }
  ;
  const leftPage = _scrollPaneAPagina('viewerOld', cambio.page, hs.top);
  const rightPage = _scrollPaneAPagina('viewerNew', cambio.page, hs.top);
  const clases = cambio.tipo === 'sustitucion'
  ? ['right-green-change-hotspot', 'red-hotspot', 'green-hotspot', 'orange-hotspot']
  : ['right-gray-change-hotspot', 'gray-hotspot', 'blue-name-hotspot', 'gray-name-hotspot', 'school-hotspot', 'gray-school-hotspot'];
  [rightPage, leftPage].forEach(page =>  {
    if (!page) return;
    const candidatos = Array.from(page.children).filter(el => clases.some(c => el.classList?.contains(c)));
    if (!candidatos.length) return;
    const target = candidatos.find(el =>  {
      const elTop = parseFloat(el.style.top) || 0;
      const elLeft = parseFloat(el.style.left) || 0;
      return Math.abs(elTop - (Number(hs.top) || 0)) < 15 && Math.abs(elLeft - (Number(hs.left) || 0)) < 15;
    }
    ) || candidatos[0];
    target.classList.add('change-nav-active');
  }
  );
  setTimeout(() =>  {
    if (typeof _syncScrollSuspend !== 'undefined' && _syncScrollSuspend > 0) _syncScrollSuspend--;
  }
  , 400);
  actualizarNavegacionCambios();
}
function irAlPrimerCambio() {
  NAV_CAMBIO_POS = 0;
  enfocarCambioActual();
}
function navCambio(dir) {
  const cambios = obtenerCambiosDelPDFActual();
  if (!cambios.length) return;
  if (NAV_CAMBIO_POS < 0) NAV_CAMBIO_POS = dir > 0 ? 0 : cambios.length - 1;
  else {
    NAV_CAMBIO_POS += dir;
    if (NAV_CAMBIO_POS >= cambios.length) NAV_CAMBIO_POS = 0;
    if (NAV_CAMBIO_POS < 0) NAV_CAMBIO_POS = cambios.length - 1;
  }
  enfocarCambioActual();
}
