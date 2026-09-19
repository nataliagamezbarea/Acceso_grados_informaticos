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
async function triggerFastCommitPush() {
  showBlocker('Enviando cambios a GitHub...');
  try {
    const res = await fetch('/api/github_push',  {
      method: 'POST',
      headers:  { 'Content-Type': 'application/json' }
      ,
      body: JSON.stringify( { grado: grad }
      )
    }
  );
    const data = await res.json();
    hideBlocker();
    if (data.ok) { await showCustomAlert('Sincronizado con GitHub', '✓ Los datos de revisión se han guardado en GitHub.', '<i class="fa-brands fa-github"></i>', '#10b981'); }
    else { await showCustomAlert('Error en GitHub', data.error || 'No se pudo subir.', '<i class="fa-solid fa-triangle-exclamation"></i>', '#ef4444'); }
  } catch (err) {
    hideBlocker();
    console.error('Error al sincronizar con GitHub:', err);
  }
}
