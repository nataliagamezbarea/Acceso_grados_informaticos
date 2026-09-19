/* ACCIONES GITHUB Y FAÇADE PRINCIPAL (< 60 lineas) */
async function pushToGitHubModal() {
  const ok = await showCustomConfirm(
  '¿Enviar cambios a GitHub?',
  'Se sincronizarán las modificaciones de revision.json con el repositorio remoto de GitHub.',
  '<i class="fa-brands fa-github"></i>',
  '#38bdf8'
  );
  if (!ok) return;
  triggerFastCommitPush();
}
let _pushAbortController = null;

async function triggerFastCommitPush() {
  _pushAbortController = new AbortController();
  showBlocker('Enviando cambios a GitHub...', () => {
    if (_pushAbortController) {
      try { _pushAbortController.abort(); } catch (_) {}
      _pushAbortController = null;
    }
  });

  try {
    const res = await fetch('/api/github_push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grado: grad }),
      signal: _pushAbortController.signal
    });
    const data = await res.json();
    hideBlocker();
    if (data.ok) {
      await showCustomAlert('Sincronizado con GitHub', '✓ Los datos de revisión se han guardado en GitHub.', '<i class="fa-brands fa-github"></i>', '#10b981');
    } else {
      await showCustomAlert('Error en GitHub', data.error || 'No se pudo subir.', '<i class="fa-solid fa-triangle-exclamation"></i>', '#ef4444');
    }
  } catch (err) {
    hideBlocker();
    if (err && err.name === 'AbortError') {
      await showCustomAlert('Operación Cancelada', 'Se ha cancelado el envío a GitHub.', '<i class="fa-solid fa-ban"></i>', '#f59e0b');
    } else {
      await showCustomAlert('Error de Red', 'No se pudo conectar con GitHub.', '<i class="fa-solid fa-wifi"></i>', '#ef4444');
    }
  } finally {
    _pushAbortController = null;
  }
}
