/* ATAJOS DE TECLADO Y UTILIDADES (< 80 lineas) */
function initKeyboardNavigation() {
  document.addEventListener('keydown', (e) =>  {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const ov = document.getElementById('ov');
    if (!ov || !ov.classList.contains('on')) return;
    if (e.key === 'ArrowRight' && !e.altKey) {
      e.preventDefault();
      nav(1);
    } else if (e.key === 'ArrowLeft' && !e.altKey) {
      e.preventDefault();
      nav(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeOv();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      navCambio(-1);
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      navCambio(1);
    } else if (e.key === '1') {
      e.preventDefault();
      setDecision('applied');
    } else if (e.key === '2') {
      e.preventDefault();
      setDecision('original');
    }
  }
  );
}
function osBaseName(path) {
  return String(path || '').split('/').pop().split('\\').pop();
}
function setGrad(g) {
  grad = g;
  const sel = document.getElementById('gradeSelect');
  if (sel) sel.value = g;
  localStorage.setItem('last_grado', g);
  buildAllItems();
  if (typeof render === 'function') render();
}
