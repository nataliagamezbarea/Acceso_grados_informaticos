/* DESCARGA: trabaja con el PDF COMPLETO ORIGINAL, nunca con miniaturas ni con
   los canvas/miniaturas visibles del visor. El visor no se modifica. */
window.__descargasPDFActivas = window.__descargasPDFActivas || new Map();
function _idDescargaPDF(rama, archivo) { return `pdf::${String(rama || '').trim()}::${String(archivo || '').trim()}`; }
function _estadoDescargaPDF(jobId, estado, porcentaje) {
  if (typeof window.mostrarNotificacionDescarga === 'function') {
    window.mostrarNotificacionDescarga(estado, porcentaje, jobId);
  }
}
async function _descargaObtenerPDFCompleto() {
  if (typeof ITEMS === 'undefined' || !ITEMS[POS]) throw new Error('No hay documento seleccionado.');
  const it = ITEMS[POS];
  const ramaItem = it._rama || grad;
  if (!ramaItem || ramaItem === '__TODAS__') throw new Error('No se pudo determinar la rama del documento.');
  const qs = `archivo=${encodeURIComponent(it.archivo)}&mode=old&enc=1&int=1&col=1&net=0&download=0`;
  const url = `/api/preview/${encodeURIComponent(ramaItem)}?${qs}`;
  let buffer;
  const cache = window._pdfBufferCache;
  const cacheKey = `${ramaItem}::${it.archivo}`;
  if (cache && typeof cache.get === 'function' && cache.has(cacheKey)) { buffer = cache.get(cacheKey); }
  else if (typeof _obtenerBufferPDFOriginal === 'function') {
    buffer = await _obtenerBufferPDFOriginal(ramaItem, it.archivo, true, false);
  } else if (typeof _obtenerBufferPDF === 'function') buffer = await _obtenerBufferPDF(url, true);
  else {
    const response = await fetch(url,  { cache: 'no-store' }
  );
    if (!response.ok) throw new Error(`HTTP ${response.status} obteniendo el PDF completo.`);
    buffer = await response.arrayBuffer();
  }
  if (!buffer || buffer.byteLength < 100) throw new Error('El documento PDF completo no está disponible.');
  return  { it, ramaItem, bytes: new Uint8Array(buffer.slice(0)), url }
  ;
}
async function _descargaGenerarVectorial(jobId) {
  if (typeof window.exportarPDFVectorialDDD !== 'function') throw new Error('Exportador PDF vectorial no disponible.');
  _estadoDescargaPDF(jobId, 'Preparando PDF...', 8);
  const  { it, ramaItem, bytes }
  = await _descargaObtenerPDFCompleto();
  _estadoDescargaPDF(jobId, 'Preparando PDF original...', 22);
  let infoOriginal = null;
  // IMPORTANTE: nunca confiar a ciegas en window.__DDD_VISOR_INFO para la
  // descarga. Es una foto tomada cuando se abrió el visor derecho y NO se
  // refresca cuando el usuario añade/edita hotspots (nombres, colegio,
  // enunciados...) en la misma sesión. Si se usa tal cual, el PDF descargado
  // puede no incluir los cambios más recientes que sí se ven en "CÓMO
  // QUEDARÍA". Por eso aquí SIEMPRE pedimos primero los datos frescos al
  // servidor (que ya están guardados, porque cada acción se persiste al
  // vuelo vía hotspotAction/saveEnunciado/etc.) y solo si esa petición
  // falla recurrimos a la copia en memoria como último recurso.
  try {
    if (typeof _obtenerDocInfoJSON === 'function') {
      const qs = `archivo=${encodeURIComponent(it.archivo)}&mode=old&enc=1&int=1&col=1&net=0&__fresh=${Date.now()}`;
      infoOriginal = await _obtenerDocInfoJSON(`/api/doc_info/${encodeURIComponent(ramaItem)}?${qs}`);
    }
  } catch (_) {
  }
  if (!infoOriginal) {
    const infoVisor = (window.__DDD_VISOR_INFO &&
    String(window.__DDD_VISOR_INFO_ARCHIVO || '') === String(it.archivo || '') &&
    String(window.__DDD_VISOR_INFO_RAMA || '') === String(ramaItem || ''))
    ? window.__DDD_VISOR_INFO : null;
    if (infoVisor) infoOriginal = infoVisor;
  }
  window.__DDD_PLANES_EXPORT = Object.create(null);
  _estadoDescargaPDF(jobId, 'Generando PDF procesado...', 38);
  const out = await window.exportarPDFVectorialDDD( { bytes, ramaItem, it, infoOriginal }
  );
  _estadoDescargaPDF(jobId, 'Preparando descarga...', 92);
  return  {
    blob: new Blob([out],  { type:'application/pdf' }
    ), it
  }
  ;
}
async function descargarPDFActual() {
  if (typeof ITEMS === 'undefined' || !ITEMS[POS]) return;
  const itActual = ITEMS[POS];
  const ramaActual = itActual._rama || grad || '';
  const jobId = _idDescargaPDF(ramaActual, itActual.archivo);
  if (window.__descargasPDFActivas.has(jobId)) {
    _estadoDescargaPDF(jobId, 'Preparando PDF...', 50);
    return window.__descargasPDFActivas.get(jobId);
  }
  const btn = document.querySelector('.btn-download-pdf');
  if (btn) {
    btn.dataset.descargando = '1';
    btn.dataset.textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando PDF...';
  }
  const trabajo = (async () =>  {
    try {
      _estadoDescargaPDF(jobId, 'Preparando PDF...', 3);
      const resultado = await _descargaGenerarVectorial(jobId);
      const  { blob, it }
      = resultado;
      window._PDF_FINAL_GENERADO = blob;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = it.archivo.split('/').pop() || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      _estadoDescargaPDF(jobId, '¡Descarga completada!', 100);
      return resultado;
    } catch (err) {
      _estadoDescargaPDF(jobId, 'Error al preparar PDF', 100);
      if (typeof showCustomAlert === 'function') {
        await showCustomAlert('No se pudo descargar el PDF', err?.message || 'Error al generar el PDF con MuPDF.js.', '<i class="fa-solid fa-triangle-exclamation"></i>', '#ef4444');
      } else if (typeof alert === 'function') alert(err?.message || 'Error al generar el PDF con MuPDF.js.');
      throw err;
    } finally {
      window.__descargasPDFActivas.delete(jobId);
      const botones = document.querySelectorAll('.btn-download-pdf');
      botones.forEach((boton) =>  {
        if (boton.dataset.descargando === '1') {
          boton.disabled = false;
          boton.dataset.descargando = '0';
          boton.innerHTML = boton.dataset.textoOriginal || '<i class="fa-solid fa-download"></i> Descargar';
        }
      }
  );
    }
  }
  )();
  window.__descargasPDFActivas.set(jobId, trabajo);
  return trabajo;
}
window.descargarPDFActual = descargarPDFActual;
