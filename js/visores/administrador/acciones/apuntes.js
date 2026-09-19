function normalizarNombreApunte(valor, fallbackArchivo = '') {
  let nombre = String(valor || '').trim();
  if (!nombre) {
    nombre = String(fallbackArchivo || '').split('/').pop().split('\\').pop().replace(/\.pdf$/i, '');
  }
  nombre = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  nombre = nombre.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[_ .-]+|[_ .-]+$/g, '');
  if (!nombre) nombre = 'Apunte';
  return nombre.slice(0, 100);
}
function updateApunteBarVisibility(it) {
  if (!it) it = (typeof ITEMS !== 'undefined' && typeof POS !== 'undefined') ? ITEMS[POS] : null;
  if (!it) return;
  const hasApunte = !!it.inc_apunte;
  const apunteBar = document.getElementById('apunteBar');
  const inputName = document.getElementById('inputApunteName');
  if (apunteBar) {
    apunteBar.style.display = hasApunte ? 'flex' : 'none';
  }
  if (inputName && hasApunte) {
    inputName.value = it.nombre_apunte || normalizarNombreApunte('', it.archivo);
  }
}
function updateApunteButton(it) {
  const btn = document.getElementById('btnActionApunte');
  if (btn) btn.classList.toggle('active-apunte', !!it?.inc_apunte);
  updateApunteBarVisibility(it);
}
function updateApunteName(val) {
  const it = (typeof ITEMS !== 'undefined' && typeof POS !== 'undefined') ? ITEMS[POS] : null;
  if (!it) return;
  it.nombre_apunte = normalizarNombreApunte(val, it.archivo);
  guardarCheckEnServidor('nombre_apunte', it.nombre_apunte);
}
let _apunteAbortController = null;

async function setApunte(val) {
  const it = ITEMS[POS];
  if (!it) return;
  const nuevoVal = (val !== undefined) ? val : !it.inc_apunte;
  const cb = document.getElementById('cbApunte');
  if (!nuevoVal && it.inc_apunte) {
    const nombre = (typeof it.nombre_apunte === 'string' && it.nombre_apunte.trim())
    ? it.nombre_apunte.trim()
    : normalizarNombreApunte('', it.archivo);
    const confirmado = await solicitarEliminacionApunte(nombre);
    if (!confirmado) {
      if (cb) cb.checked = true;
      updateApunteButton(it);
      return;
    }
    _apunteAbortController = new AbortController();
    showBlocker('Eliminando apunte...', () => {
      if (_apunteAbortController) {
        try { _apunteAbortController.abort(); } catch (_) {}
        _apunteAbortController = null;
      }
    });
    try {
      const res = await fetch('/api/eliminar_apunte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grado: (it?._rama || grad),
          archivo: it.archivo,
          nombre_apunte: nombre,
          borrar_pdfs: true
        }),
        signal: _apunteAbortController.signal
      });
      const data = await res.json();
      hideBlocker();
      if (!data.ok && typeof showCustomAlert === 'function') {
        await showCustomAlert('Aviso Apunte', 'No se pudo eliminar en el servidor: ' + (data.error || data.msg || 'Fallo de conexión.'), '<i class="fa-solid fa-triangle-exclamation"></i>', '#f59e0b');
      }
    } catch (err) {
      hideBlocker();
      if (err && err.name === 'AbortError') {
        if (typeof showCustomAlert === 'function') {
          await showCustomAlert('Operación Cancelada', 'Se ha cancelado la acción.', '<i class="fa-solid fa-ban"></i>', '#f59e0b');
        }
        if (cb) cb.checked = true;
        return;
      }
      // Sin servidor: permitir desactivar localmente
      console.warn('Servidor no disponible, desactivando apunte en modo local:', err);
    } finally {
      _apunteAbortController = null;
    }
  }
  it.inc_apunte = nuevoVal;
  const ramaItem = it?._rama || grad;
  if (DATA[ramaItem]) {
    const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo);
    if (origE) origE.inc_apunte = nuevoVal;
    const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo);
    if (origN) origN.inc_apunte = nuevoVal;
  }
  if (cb) cb.checked = nuevoVal;
  updateApunteButton(it);
  guardarCheckEnServidor('apunte', nuevoVal);
  if (typeof renderStats === 'function') renderStats();
}
function solicitarEliminacionApunte(nombre) {
  return showCustomConfirm( '¿Desactivar el Apunte?', `El apunte <b class="apunte-nombre-resaltado">${nombre}</b> se quitará del visor. Se borrará su PDF de la rama del grado y se quitará del historial de GitHub (además de limpiar el residual .tex/.txt). ¿Continuar?`, '<i class="fa-solid fa-trash-can"></i>', '#ef4444' );
}
function saveApunteName() {
  const it = ITEMS[POS];
  const inp = document.getElementById('inputApunteName');
  if (!it || !inp) return;
  it.nombre_apunte = normalizarNombreApunte(inp.value, it.archivo);
  guardarCheckEnServidor('nombre_apunte', it.nombre_apunte);
}
async function confirmGenerateApunteLatex() {
  const it = ITEMS[POS];
  if (!it) return;
  saveApunteName();
  const nombre = it.nombre_apunte || document.getElementById('inputApunteName')?.value || '';
  _apunteAbortController = new AbortController();
  showBlocker('Generando código LaTeX y lanzando compilación...', () => {
    if (_apunteAbortController) {
      try { _apunteAbortController.abort(); } catch (_) {}
      _apunteAbortController = null;
    }
  });

  try {
    const res = await fetch('/api/compilar_apunte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grado: (it?._rama || grad), archivo: it.archivo, nombre_apunte: nombre }),
      signal: _apunteAbortController.signal
    });
    const data = await res.json();
    hideBlocker();
    if (!data.ok) {
      if (typeof showCustomAlert === 'function') {
        const fallidos = (Array.isArray(data.fallidos) && data.fallidos.length > 0)
          ? data.fallidos
          : [{ nombre: nombre || 'Apunte', grado: (it?._rama || grad), archivo: it.archivo, error: data.msg || data.error || 'Fallo en LaTeX' }];
        const f0 = fallidos[0] || {};
        const mot = f0.error || (typeof data.msg === 'string' ? data.msg : (data.error || 'Error al generar apunte'));

        let msg = `<b>Error al compilar el apunte:</b>\n` +
                  `• <b>Nombre:</b> ${nombre || f0.nombre || 'Apunte'}\n` +
                  `• <b>Grado / Rama:</b> ${it?._rama || grad}\n` +
                  `• <b>Motivo del fallo:</b> ${mot}\n`;

        const rawErr = String(data.msg || data.error || mot);
        if (rawErr.includes('Resource not accessible by personal access token') || rawErr.includes('workflow-dispatch-event') || rawErr.includes('status": "403"') || rawErr.includes('403')) {
          msg += '\n\n' +
            '<b>Solución en GitHub:</b>\n' +
            '1. Ve a GitHub > Settings > Developer settings > Personal access tokens.\n' +
            '2. En tu token, activa el permiso «workflow» (o en Fine-grained tokens: «Actions: Read and write»).\n' +
            '3. En tu repositorio: Settings > Actions > General > Workflow permissions > marca «Read and write permissions».\n' +
            '4. Guarda el nuevo token en la configuración privada de Supabase.';
        } else if (rawErr.includes('Not Found') || rawErr.includes('404')) {
          msg += '\n\n' +
            '<b>Causas comunes y solución:</b>\n' +
            '1. El archivo .github/workflows/compilarapunte.yml no existe en la rama principal (master/main).\n' +
            '2. El repositorio general (gh_repo_general) es incorrecto o privado y el token no tiene acceso.\n' +
            '3. GitHub Actions no está habilitado en el repositorio (Settings > Actions > General).';
        }
        await showCustomAlert('Error al Generar Apunte', msg, '<i class="fa-solid fa-triangle-exclamation"></i>', '#ef4444');
      }
      return;
    }
    it.latex_compilado = true;

    if (data.en_proceso) {
      let msg = `<b>Apunte en proceso de compilación:</b>\n` +
                `• <b>Nombre:</b> ${nombre}\n` +
                `• <b>Grado / Rama:</b> ${it?._rama || grad}\n\n` +
                `<i>Compilando en remoto en GitHub Actions...</i>`;
      if (typeof showCustomAlert === 'function') {
        showCustomAlert('Apunte en Proceso', msg, '<i class="fa-solid fa-spinner fa-spin"></i>', '#3b82f6');
      }
      esperarPdfCompilado(grad, nombre, it, 0, data.inicio || Date.now());
      return;
    }

    let msg = `<b>Apunte compilado con éxito:</b>\n` +
              `• <b>Nombre:</b> ${nombre}\n` +
              `• <b>Grado / Rama:</b> ${it?._rama || grad}\n` +
              `• <b>Ubicación:</b> apuntes/${nombre}.pdf\n\n` +
              `<i>Sin errores. Registrado correctamente en revision.json.</i>`;

    if (typeof showCustomAlert === 'function') {
      await showCustomAlert('Apunte Creado', msg, '<i class="fa-solid fa-book"></i>', '#10b981');
    }
    if (typeof openPos === 'function') openPos(POS);
  } catch (err) {
    hideBlocker();
    if (err && err.name === 'AbortError') {
      if (typeof showCustomAlert === 'function') {
        await showCustomAlert('Operación Cancelada', 'Se ha cancelado la compilación del apunte.', '<i class="fa-solid fa-ban"></i>', '#f59e0b');
      }
    } else if (typeof showCustomAlert === 'function') {
      await showCustomAlert('Error de Conexión', 'Falló la conexión con el servidor o GitHub.', '<i class="fa-solid fa-wifi"></i>', '#ef4444');
    }
  } finally {
    _apunteAbortController = null;
  }
}
function esperarPdfCompilado(grado, nombre, it, reintentos = 0, desde = 0) {
  const maxIntentos = typeof reintentos === 'number' ? reintentos : 0;
  const tiempoInicio = desde || Date.now();
  const archivo = it?.archivo || '';
  const url = `/api/estado_compilacion?grado=${encodeURIComponent(grado)}&nombre_apunte=${encodeURIComponent(nombre)}&archivo=${encodeURIComponent(archivo)}&desde=${tiempoInicio}`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (data.ok && data.listo) {
        it.latex_compilado = true;
        it.inc_apunte = true;
        const ramaItem = it?._rama || grado;
        if (typeof DATA !== 'undefined' && DATA[ramaItem]) {
          const origE = (DATA[ramaItem].entries || []).find(x => x.archivo === it.archivo || x.nombre_apunte === nombre);
          if (origE) { origE.latex_compilado = true; origE.inc_apunte = true; }
          const origN = (DATA[ramaItem].no_cambian || []).find(x => x.archivo === it.archivo || x.nombre_apunte === nombre);
          if (origN) { origN.latex_compilado = true; origN.inc_apunte = true; }
        }

        let msg = `<b>Apunte compilado con éxito:</b>\n` +
                  `• <b>Nombre:</b> ${nombre}\n` +
                  `• <b>Grado / Rama:</b> ${grado}\n` +
                  `• <b>Ubicación:</b> apuntes/${nombre}.pdf\n\n` +
                  `<i>Sin errores. Generado en GitHub Actions.</i>`;

        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('customModalTitle');
        if (modal && modal.classList.contains('on') && titleEl && (titleEl.textContent === 'Apunte en Proceso' || titleEl.textContent === 'Compilando Apunte')) {
          const iconEl = document.getElementById('customModalIcon');
          const msgEl = document.getElementById('customModalText');
          const box = document.getElementById('customModalBox');
          if (box) box.style.border = '2px solid #10b981';
          if (iconEl) {
            iconEl.innerHTML = '<i class="fa-solid fa-book"></i>';
            iconEl.style.color = '#10b981';
          }
          if (titleEl) titleEl.textContent = 'Apunte Creado';
          if (msgEl) msgEl.innerHTML = msg.replace(/\n/g, '<br/>');
        } else {
          if (typeof showCustomAlert === 'function') {
            showCustomAlert('Apunte Creado', msg, '<i class="fa-solid fa-book"></i>', '#10b981');
          }
        }

        if (typeof updateApunteButton === 'function') updateApunteButton(it);
        if (typeof renderStats === 'function') renderStats();
        if (typeof openPos === 'function') openPos(POS);
      } else if (data.ok === false && data.listo) {
        const errMsg = data.error || 'Fallo desconocido en GitHub Actions';
        let msg = `<b>Fallo en la compilación del apunte:</b>\n` +
                  `• <b>Nombre:</b> ${nombre}\n` +
                  `• <b>Grado / Rama:</b> ${grado}\n` +
                  `• <b>Error:</b> ${errMsg}\n`;

        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('customModalTitle');
        if (modal && modal.classList.contains('on') && titleEl && (titleEl.textContent === 'Apunte en Proceso' || titleEl.textContent === 'Compilando Apunte')) {
          const iconEl = document.getElementById('customModalIcon');
          const msgEl = document.getElementById('customModalText');
          const box = document.getElementById('customModalBox');
          if (box) box.style.border = '2px solid #ef4444';
          if (iconEl) {
            iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            iconEl.style.color = '#ef4444';
          }
          if (titleEl) titleEl.textContent = 'Error al Compilar Apunte';
          if (msgEl) msgEl.innerHTML = msg.replace(/\n/g, '<br/>');
        } else {
          if (typeof showCustomAlert === 'function') {
            showCustomAlert('Error al Compilar Apunte', msg, '<i class="fa-solid fa-triangle-exclamation"></i>', '#ef4444');
          }
        }
      } else if (maxIntentos >= 48) {
        if (typeof showCustomAlert === 'function') {
          showCustomAlert('Compilación en curso', 'Todavía se está compilando en GitHub Actions. La vista se actualizará cuando termine.', '<i class="fa-solid fa-hourglass-half"></i>', '#f59e0b');
        }
      } else {
        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('customModalTitle');
        if (modal && modal.classList.contains('on') && titleEl && titleEl.textContent === 'Apunte en Proceso') {
          const msgEl = document.getElementById('customModalText');
          const segundos = Math.round((Date.now() - tiempoInicio) / 1000);
          if (msgEl) {
            msgEl.innerHTML = (
              `<b>Apunte en proceso de compilación:</b><br/>` +
              `• <b>Nombre:</b> ${nombre}<br/>` +
              `• <b>Grado / Rama:</b> ${it?._rama || grado}<br/><br/>` +
              `<i>Compilando en remoto en GitHub Actions... (${segundos}s transcurridos)</i>`
            );
          }
        }
        setTimeout(() => esperarPdfCompilado(grado, nombre, it, maxIntentos + 1, tiempoInicio), 4000);
      }
    })
    .catch(() => {
      if (maxIntentos < 48) {
        setTimeout(() => esperarPdfCompilado(grado, nombre, it, maxIntentos + 1, tiempoInicio), 4000);
      }
    });
}
