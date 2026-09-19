/* ALIASES GLOBALES PARA BOTONES DEL HTML */
function compileCurrentApunte() { return confirmGenerateApunteLatex(); }
function verApunteActual() {
  const it = ITEMS[POS];
  if (!it) return;
  const nombre = it.nombre_apunte || (it.latex_compilado ? (it.archivo || '').replace(/\.pdf$/i, '') : '');
  if (!nombre) return;
  (async()=> {
    const r=await fetch('/api/ver_apunte?grado='+encodeURIComponent(grad)+'&nombre_apunte='+encodeURIComponent(nombre));
    if(!r.ok)return;
    const b=await r.blob();
    const u=URL.createObjectURL(b);
    window.open(u,'_blank');
    setTimeout(()=>URL.revokeObjectURL(u),60000);
  }
  )();
}
let _compileAllAbortController = null;

async function compileAllApuntes() {
  _compileAllAbortController = new AbortController();
  showBlocker('Lanzando compilación de todos los apuntes del grado...', () => {
    if (_compileAllAbortController) {
      try { _compileAllAbortController.abort(); } catch (_) {}
      _compileAllAbortController = null;
    }
  });

  try {
    const res = await fetch('/api/compilar_todos_apuntes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grado: grad }),
      signal: _compileAllAbortController.signal
    });
    const data = await res.json();
    hideBlocker();
    if (data.ok) {
      const total = data.total ?? ((data.exitosos || []).length + (data.fallidos || []).length);
      const compilados = data.compilados ?? (data.exitosos || []).length;
      const exitosos = data.exitosos || [];
      const fallidos = data.fallidos || [];

      let msg = `<b>Resumen de compilación:</b>\n` +
                `• <b>Total analizados:</b> ${total}\n` +
                `• <b>Compilados con éxito:</b> ${compilados}\n` +
                `• <b>Fallidos:</b> ${fallidos.length}\n\n`;

      if (exitosos.length > 0) {
        msg += `<b>Compilados con éxito (${exitosos.length}):</b>\n`;
        exitosos.forEach(x => {
          const nom = typeof x === 'object' ? (x.nombre || x.archivo || 'Apunte') : x;
          const gr = (typeof x === 'object' && x.grado) ? ` <i>(${x.grado})</i>` : '';
          msg += `  • <b>${nom}</b>${gr}\n`;
        });
        msg += '\n';
      }

      if (fallidos.length > 0) {
        msg += `<b>Fallidos (${fallidos.length}):</b>\n`;
        fallidos.forEach(f => {
          const nom = typeof f === 'object' ? (f.nombre || f.archivo || 'Apunte') : f;
          const mot = (typeof f === 'object' && f.error) ? `: ${f.error}` : '';
          msg += `  • <b>${nom}</b>${mot}\n`;
        });
        msg += '\n';
      } else if (total > 0) {
        msg += `<i>Sin errores en la compilación.</i>\n\n`;
      }

      if (total === 0) {
        msg = `<b>No se encontraron apuntes activos para compilar.</b>\n\n` +
              `Para compilar apuntes:\n` +
              `1. Activa la casilla «Apunte» en uno o varios documentos del visor.\n` +
              `2. Vuelve a pulsar «Compilar todos los apuntes».`;
      } else if (data.en_proceso) {
        msg += `<i>Lanzado en GitHub Actions (Docker + LaTeX). Se compilan en remoto y se generarán en apuntes/*.pdf</i>`;
      } else {
        msg += `<i>Guardados y registrados en revision.json (apuntes/*.pdf).</i>`;
      }

      const icon = (fallidos.length > 0 && compilados === 0)
        ? '<i class="fa-solid fa-circle-xmark"></i>'
        : (fallidos.length > 0 ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-book-bookmark"></i>');
      const color = (fallidos.length > 0 && compilados === 0)
        ? '#ef4444'
        : (fallidos.length > 0 ? '#f59e0b' : '#10b981');

      if (typeof showCustomAlert === 'function') {
        await showCustomAlert('Resultado de Compilación de Apuntes', msg, icon, color);
      }
    } else {
      if (typeof showCustomAlert === 'function') {
        const fallidos = (Array.isArray(data.fallidos) && data.fallidos.length > 0)
          ? data.fallidos
          : [{ nombre: 'Todos los apuntes', grado: grad, error: data.msg || data.error || 'Error desconocido' }];
        const total = data.total ?? fallidos.length;
        const compilados = data.compilados ?? 0;

        let msg = `<b>Resumen de compilación:</b>\n` +
                  `• <b>Total analizados:</b> ${total}\n` +
                  `• <b>Compilados con éxito:</b> ${compilados}\n` +
                  `• <b>Fallidos:</b> ${fallidos.length}\n\n` +
                  `<b>Detalle de fallos (${fallidos.length}):</b>\n`;

        fallidos.forEach(f => {
          const nom = typeof f === 'object' ? (f.nombre || f.archivo || 'Apunte') : f;
          const mot = (typeof f === 'object' && f.error) ? f.error : (data.msg || data.error || 'Error al compilar');
          msg += `  • <b>${nom}:</b> ${mot}\n`;
        });

        const rawErr = String(data.msg || data.error || '');
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

        await showCustomAlert('Error en Apuntes', msg, '<i class="fa-solid fa-triangle-exclamation"></i>', '#ef4444');
      }
    }
  } catch (err) {
    hideBlocker();
    if (err && err.name === 'AbortError') {
      if (typeof showCustomAlert === 'function') {
        await showCustomAlert('Operación Cancelada', 'Se ha cancelado la compilación de apuntes.', '<i class="fa-solid fa-ban"></i>', '#f59e0b');
      }
    } else if (typeof showCustomAlert === 'function') {
      await showCustomAlert('Error de Red', 'No se pudo conectar con el servidor o GitHub.', '<i class="fa-solid fa-wifi"></i>', '#ef4444');
    }
  } finally {
    _compileAllAbortController = null;
  }
}
