/* VERIFICACION EN INTERNET DE IMAGENES (< 85 lineas) */
async function checkSelectedImageInternet() {
  const imagenesActivas = document.getElementById('cbImg') ? document.getElementById('cbImg').checked : true;
  if (!imagenesActivas) return;
  if (!selectedImageIh) return;
  const ih = selectedImageIh;
  closeImgPopup();
  const autoBorrar = isAutoDelInternetActive();
  showBlocker('Comprobando presencia de imagen en Internet...');
  try {
    const it = ITEMS[POS];
    const res = await fetch('/api/check_image_internet',  {
      method: 'POST',
      headers:  { 'Content-Type': 'application/json' }
      ,
      body: JSON.stringify( {
        grado: (it?._rama || grad),
        archivo: it.archivo,
        page_num: ih.page_num || 0,
        img_idx: ih.img_idx || 0,
        auto_borrar: autoBorrar
      }
      )
    }
  );
    const data = await res.json();
    hideBlocker();
    const existe = data.existe_en_internet || data.exists_in_internet;
    if (existe) {
      let fuentesHtml = '';
      if (data.fuentes && data.fuentes.length > 0) {
        fuentesHtml = '\n\n<b>🔗 URLs encontradas:</b>\n' +
        data.fuentes.map(u => `<a href="${u}" target="_blank" class="enlace-fuente-internet">${u}</a>`).join('\n');
      } else if (data.url_busqueda) {
        fuentesHtml = `\n\n<b>🔗 Enlace de búsqueda:</b>\n<a href="${data.url_busqueda}" target="_blank" class="enlace-fuente-internet">Ver en Google Lens / Imágenes</a>`;
      }
      await showCustomAlert(
      'Imagen Encontrada en Internet',
      `✓ La imagen (${ih.id}) SÍ existe en Internet.\n\n- ${data.detalles || 'Conservada e identificada en la web.'}${fuentesHtml}`,
      '<i class="fa-solid fa-globe"></i>',
      '#38bdf8'
  );
    } else {
      if (autoBorrar) {
        await handleImageAction('borrar', null, ih);
        await showCustomAlert(
        'Imagen Borrada Automáticamente',
        `✕ La imagen (${ih.id}) NO fue encontrada en Internet.\n\n- Eliminada del resultado porque la opción Internet está ACTIVA.`,
        '<i class="fa-solid fa-trash-can"></i>',
        '#ef4444'
  );
      } else {
        await showCustomAlert(
        'Imagen NO Encontrada en Internet',
        `ℹ La imagen (${ih.id}) NO fue encontrada en Internet.\n\n- NO se borra porque la opción Internet está DESACTIVADA.`,
        '<i class="fa-solid fa-circle-info"></i>',
        '#f59e0b'
  );
        if (typeof refreshRightIframe === 'function') refreshRightIframe();
      }
    }
  } catch (err) {
    hideBlocker();
  }
}
/* Selector de ramas: siempre conserva SELECCIONAR y permite TODAS las ramas */
