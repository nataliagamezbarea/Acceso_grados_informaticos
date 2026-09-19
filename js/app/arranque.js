try {
  const esInvitado = sessionStorage.getItem('esInvitado') === 'true';
  const esAdminCache = !esInvitado && sessionStorage.getItem('esAdmin') === 'true';
  if (esInvitado) {
    const oscuro = sessionStorage.getItem('guest_modo_oscuro') === 'true';
    document.documentElement.classList.toggle('modo-oscuro', oscuro);
    document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
    document.documentElement.dataset.rol = 'invitado';
  } else if (esAdminCache) {
    const oscuro = localStorage.getItem('modo_oscuro') === 'true';
    document.documentElement.classList.toggle('modo-oscuro', oscuro);
    document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
    document.documentElement.dataset.rol = 'admin';
  } else {
    document.documentElement.classList.remove('modo-oscuro');
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.rol = 'invitado';
  }
  document.documentElement.classList.add('app-preboot');
} catch (_) {
}


// __APP_PREBOOT_LOCK__: la liberación de app-preboot la realiza autenticacion.js al finalizar el routing.
