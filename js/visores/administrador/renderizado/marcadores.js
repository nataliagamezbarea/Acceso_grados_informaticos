/* CREACION DE WRAPPERS Y PLACEHOLDERS (< 50 lineas) */
function crearPlaceholdersDocumento(total, anchoDisp, el) {
  const altoEst = Math.max(120, Math.round(Math.min(anchoDisp / 0.70710678, window.innerHeight * 0.8)));
  const wrappers = [];
  for (let i = 0; i < total; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'doc-page pdfjs-page';
    wrapper.style.position = 'relative';
    wrapper.style.minHeight = altoEst + 'px';
    wrapper.style.width = anchoDisp + 'px';
    wrapper.style.maxWidth = 'none';
    wrapper.style.flex = '0 0 auto';
    wrapper.style.margin = '0 auto 12px auto';
    wrapper.dataset.paginaIdx = String(i);
    wrapper.innerHTML = `<div class="pdf-page-skeleton" aria-label="Página ${i + 1}, cargando"><i class="fa-solid fa-circle-notch fa-spin"></i><span>Cargando página ${i + 1}...</span></div>`;
    el.appendChild(wrapper);
    wrappers.push(wrapper);
  }
  return wrappers;
}
