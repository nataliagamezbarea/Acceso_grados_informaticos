let _currentBlockerOnCancel = null;
let _blockerKeyHandler = null;

function showBlocker(msg, onCancel = null) {
  const b = document.getElementById('blocker');
  const t = document.getElementById('blockerText');
  const btnCancel = document.getElementById('blockerCancelBtn');
  const btnClose = document.getElementById('blockerCloseBtn');
  _currentBlockerOnCancel = typeof onCancel === 'function' ? onCancel : null;
  if (t) t.textContent = msg || 'Procesando...';

  const handleCancel = () => {
    const cb = _currentBlockerOnCancel;
    _currentBlockerOnCancel = null;
    hideBlocker();
    if (cb) {
      try { cb(); } catch (_) {}
    }
  };

  if (btnCancel) btnCancel.onclick = handleCancel;
  if (btnClose) btnClose.onclick = handleCancel;

  if (_blockerKeyHandler) {
    window.removeEventListener('keydown', _blockerKeyHandler, true);
  }
  _blockerKeyHandler = (e) => {
    if (e.key === 'Escape') {
      const isBlockerOn = b && b.classList.contains('on');
      if (isBlockerOn) {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    }
  };
  window.addEventListener('keydown', _blockerKeyHandler, true);

  if (b) b.classList.add('on');
}

function hideBlocker() {
  const b = document.getElementById('blocker');
  _currentBlockerOnCancel = null;
  if (_blockerKeyHandler) {
    window.removeEventListener('keydown', _blockerKeyHandler, true);
    _blockerKeyHandler = null;
  }
  if (b) b.classList.remove('on');
}

function _customModalBase(title, message, icon, color) {
  const modal = document.getElementById('customModal');
  if (!modal) return null;
  const iconEl = document.getElementById('customModalIcon');
  const titleEl = document.getElementById('customModalTitle');
  const msgEl = document.getElementById('customModalText');
  const box = document.getElementById('customModalBox');
  if (box) box.style.border = `2px solid ${color}`;
  if (iconEl) {
    iconEl.innerHTML = icon;
    iconEl.style.color = color;
  }
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = (message || '').replace(/\n/g, '<br/>');
  modal.classList.add('on');
  return modal;
}
function showCustomAlert(title, message, icon = '<i class="fa-solid fa-circle-info"></i>', color = '#38bdf8') {
  return new Promise((resolve) => {
    const modal = _customModalBase(title, message, icon, color);
    if (!modal) {
      alert(`${title}\n\n${message}`);
      resolve();
      return;
    }
    const btnOk = document.getElementById('customModalOkBtn');
    const btnCancel = document.getElementById('customModalCancelBtn');
    const btnClose = document.getElementById('customModalCloseBtn');
    if (btnCancel) btnCancel.style.display = 'none';

    const cerrar = () => {
      modal.classList.remove('on');
      if (btnOk) btnOk.onclick = null;
      if (btnCancel) btnCancel.onclick = null;
      if (btnClose) btnClose.onclick = null;
      window.removeEventListener('keydown', onKey);
      resolve();
    };

    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        cerrar();
      }
    };

    if (btnOk) btnOk.onclick = cerrar;
    if (btnClose) btnClose.onclick = cerrar;
    window.addEventListener('keydown', onKey);
  });
}
function showCustomConfirm(title, message, icon = '<i class="fa-solid fa-triangle-exclamation"></i>', color = '#ef4444') {
  return new Promise((resolve) => {
    const modal = _customModalBase(title, message, icon, color);
    if (!modal) {
      resolve(confirm(`${title}\n\n${message}`));
      return;
    }
    const btnOk = document.getElementById('customModalOkBtn');
    const btnCancel = document.getElementById('customModalCancelBtn');
    const btnClose = document.getElementById('customModalCloseBtn');
    if (btnCancel) btnCancel.style.display = '';

    const cleanup = () => {
      modal.classList.remove('on');
      if (btnOk) btnOk.onclick = null;
      if (btnCancel) btnCancel.onclick = null;
      if (btnClose) btnClose.onclick = null;
      window.removeEventListener('keydown', onKey);
    };

    const cerrarOk = () => {
      cleanup();
      resolve(true);
    };

    const cerrarCancel = () => {
      cleanup();
      resolve(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cerrarOk();
      }
    };

    if (btnOk) btnOk.onclick = cerrarOk;
    if (btnCancel) btnCancel.onclick = cerrarCancel;
    if (btnClose) btnClose.onclick = cerrarCancel;
    window.addEventListener('keydown', onKey);
  });
}

function closeCustomModal() {
  const modal = document.getElementById('customModal');
  if (modal) modal.classList.remove('on');
}

window.showBlocker = showBlocker;
window.hideBlocker = hideBlocker;
window.showCustomAlert = showCustomAlert;
window.showCustomConfirm = showCustomConfirm;
window.closeCustomModal = closeCustomModal;
