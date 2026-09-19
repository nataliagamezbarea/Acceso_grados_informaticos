/* SELECTOR DE MODO DIBUJO (< 60 lineas) */
let isDrawingMode = false;
let modoAnadirTipo = 'enunciado';
function _hayImagenesBorradasOInternet(it) {
  if (!it) return false;
  if (it.inc_internet === true) return true;
  const cbNet = document.getElementById('cbBorrarImgInternet');
  if (cbNet && cbNet.checked) return true;
  if (it.acciones_imagenes && typeof it.acciones_imagenes === 'object') {
    return Object.values(it.acciones_imagenes).some(acc =>  {
      if (typeof acc === 'string') return acc === 'borrar';
      if (acc && typeof acc === 'object') return acc.accion === 'borrar';
      return false;
    }
  );
  }
  return false;
}
function abrirSelectorAnadir() {
  if (typeof closeEnunciadoPopup === 'function') closeEnunciadoPopup();
  if (typeof closeNombrePopup === 'function') closeNombrePopup();
  if (typeof closeColegioPopup === 'function') closeColegioPopup();
  const m = document.getElementById('modalAnadirTipo');
  const btnRef = document.getElementById('btnAnadirReflujo');
  if (btnRef) btnRef.style.display = 'inline-flex';
  if (m) m.style.display = 'flex';
}
function cerrarSelectorAnadir() {
  const m = document.getElementById('modalAnadirTipo');
  if (m) m.style.display = 'none';
}
function elegirTipoAnadir(tipo) {
  modoAnadirTipo = (tipo === 'nombre' || tipo === 'colegio' || tipo === 'reflujo') ? tipo : 'enunciado';
  cerrarSelectorAnadir();
  const mensajes =  {
    enunciado: 'Sustituir Enunciado: dibuja el recuadro sobre el texto a sustituir.',
    nombre: 'Borrar Nombre: dibuja el recuadro sobre el nombre a eliminar.',
    colegio: 'Borrar Colegio/Logo: dibuja el recuadro sobre el colegio o logo a eliminar.',
    reflujo: 'Subir si hay Imágenes: dibuja el recuadro en la página y posición exacta donde debe empezar a subir el contenido.'
  }
  ;
  const txt = document.getElementById('editorBoxTexto');
  if (txt) txt.textContent = mensajes[modoAnadirTipo] || 'Selecciona la zona dibujando un recuadro.';
  toggleEditor(true);
}
function limpiarRecuadrosDibujoSobrantes() {
  document.querySelectorAll('.draw-box').forEach(el => el.remove());
}
function toggleEditor(force) {
  const vOld = document.getElementById('viewerOld');
  const editorBox = document.getElementById('editorBox');
  if (force === false) {
    isDrawingMode = false;
    modoAnadirTipo = 'enunciado';
    if (vOld) {
      vOld.style.cursor = 'default';
      vOld.classList.remove('drawing-active');
    }
    if (editorBox) editorBox.classList.remove('on');
    limpiarRecuadrosDibujoSobrantes();
    return;
  }
  isDrawingMode = true;
  if (vOld) {
    vOld.style.cursor = 'crosshair';
    vOld.classList.add('drawing-active');
  }
  if (editorBox) editorBox.classList.add('on');
}

window.abrirSelectorAnadir = abrirSelectorAnadir;
window.cerrarSelectorAnadir = cerrarSelectorAnadir;
window.elegirTipoAnadir = elegirTipoAnadir;
window.toggleEditor = toggleEditor;
window.limpiarRecuadrosDibujoSobrantes = limpiarRecuadrosDibujoSobrantes;
