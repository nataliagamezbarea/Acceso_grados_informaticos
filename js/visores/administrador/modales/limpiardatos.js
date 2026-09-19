/* MODAL TERMINADO / LIMPIAR DATOS DE REVISION (< 80 lineas) */
function openLimpiarDatosModal() {
  const modal = document.getElementById('modalLimpiarDatos');
  if (modal) {
    modal.classList.add('on');
    modal.style.display = 'flex';
  }
  const lbl = document.getElementById('lblRamaLimpiar');
  if (lbl) lbl.textContent = (typeof grad !== 'undefined' && grad && grad !== '__TODAS__') ? grad : 'Todas las ramas';
}
function closeLimpiarDatosModal() {
  const modal = document.getElementById('modalLimpiarDatos');
  if (modal) {
    modal.classList.remove('on');
    modal.style.display = 'none';
  }
}
function toggleCheckTodo(master) {
  const checked = typeof master === 'boolean' ? master : Boolean(master?.checked ?? master);
  ['chkLimpiarEnunciados', 'chkLimpiarNombres', 'chkLimpiarColegios', 'chkLimpiarImagenes',
   'chkEnunciados', 'chkNombres', 'chkColegios', 'chkImagenes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  });
}
let _limpiarAbortController = null;

async function ejecutarLimpiarDatos() {
  const chkEnunciados = (document.getElementById('chkLimpiarEnunciados') || document.getElementById('chkEnunciados'))?.checked || false;
  const chkNombres = (document.getElementById('chkLimpiarNombres') || document.getElementById('chkNombres'))?.checked || false;
  const chkColegios = (document.getElementById('chkLimpiarColegios') || document.getElementById('chkColegios'))?.checked || false;
  const chkImagenes = (document.getElementById('chkLimpiarImagenes') || document.getElementById('chkImagenes'))?.checked || false;
  const chkSyncGithub = (document.getElementById('chkSubirGithubLimpieza') || document.getElementById('chkSyncGithub'))?.checked || false;
  if (!chkEnunciados && !chkNombres && !chkColegios && !chkImagenes) {
    alert('Por favor, selecciona al menos un tipo de dato a eliminar.');
    return;
  }
  const ok = await showCustomConfirm(
    '¿Eliminar datos seleccionados?',
    'Esta acción limpiará los datos guardados en los JSON de revisión y mantendrá todo ágil.',
    '<i class="fa-solid fa-trash-can"></i>',
    '#ef4444'
  );
  if (!ok) return;
  closeLimpiarDatosModal();

  _limpiarAbortController = new AbortController();
  showBlocker('Limpiando datos de revisión y actualizando GitHub...', () => {
    if (_limpiarAbortController) {
      try { _limpiarAbortController.abort(); } catch (_) {}
      _limpiarAbortController = null;
    }
  });

  try {
    const gradoParam = (typeof grad !== 'undefined' && grad) ? grad : '';
    const resp = await fetch('/api/limpiar_datos_revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grado: gradoParam,
        eliminar_enunciados: chkEnunciados,
        eliminar_nombres: chkNombres,
        eliminar_colegios: chkColegios,
        eliminar_imagenes: chkImagenes,
        sync_github: chkSyncGithub
      }),
      signal: _limpiarAbortController.signal
    });
    const res = await resp.json();
    hideBlocker();
    if (res.ok) {
      await showCustomAlert('Datos Limpiados con Éxito', res.mensaje || 'Se han eliminado los datos seleccionados.', '<i class="fa-solid fa-circle-check"></i>', '#10b981');
      if (typeof load === 'function') await load();
    } else {
      await showCustomAlert('Error al Limpiar', res.error || 'Ocurrió un error inesperado.', '<i class="fa-solid fa-circle-xmark"></i>', '#ef4444');
    }
  } catch (err) {
    hideBlocker();
    if (err && err.name === 'AbortError') {
      await showCustomAlert('Operación Cancelada', 'Se ha cancelado la limpieza de datos.', '<i class="fa-solid fa-ban"></i>', '#f59e0b');
    } else {
      await showCustomAlert('Error de Red', 'No se pudo conectar con el servidor para limpiar datos.', '<i class="fa-solid fa-wifi"></i>', '#ef4444');
    }
  } finally {
    _limpiarAbortController = null;
  }
}
window.openLimpiarDatosModal = openLimpiarDatosModal;
window.closeLimpiarDatosModal = closeLimpiarDatosModal;
window.toggleCheckTodo = toggleCheckTodo;
window.ejecutarLimpiarDatos = ejecutarLimpiarDatos;
