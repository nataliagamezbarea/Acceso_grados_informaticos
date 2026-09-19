async function handleImageAction(act, extra, targetIh) {
  const ih = targetIh || selectedImageIh;
  if (!ih) return;
  const imagenesActivas = document.getElementById('cbImg') ? document.getElementById('cbImg').checked : true;
  if (!imagenesActivas && act !== 'restaurar') {
    if (typeof showCustomAlert === 'function') await showCustomAlert('Imágenes desactivadas', 'Esta acción no se aplicará porque la opción «Imágenes» está desactivada.', '<i class="fa-solid fa-image"></i>', '#6b7280');
    return;
  }
  const it = ITEMS[POS];
  if (!it) return;
  closeImgPopup();
  showBlocker(act === 'borrar' && extra && extra.global ? 'Guardando borrado de imagen (también en otros PDFs)...' : (act === 'restaurar' ? 'Restaurando imagen original...' : 'Guardando acción sobre imagen...'));
  try {
    const endpoint = act === 'restaurar' ? '/api/clear_image_actions' : '/api/image_action';
    const payload =  {
      grado: (it?._rama || grad), archivo: it.archivo, img_id: ih.id,
      accion: act, ruta: (extra && extra.ruta) ? extra.ruta : '',
      cita: (extra && extra.cita) ? extra.cita : '',
      global: !!(extra && extra.global), page_num: ih.page_num, img_idx: ih.img_idx,
      signature: ih.signature || ih.cita || ih.id || '', manual: true
    }
    ;
    const res = await fetch(endpoint,  {
      method:'POST', headers: { 'Content-Type':'application/json' }
      , body:JSON.stringify(payload)
    }
  );
    const data = await res.json().catch(()=>( { ok:false }
    ));
    if (!res.ok || data.ok === false) throw new Error(data.msg || data.error || 'No se pudo guardar la acción.');
    hideBlocker();
    if (act === 'restaurar') {
      try {
        it.imagenes = it.imagenes || {};
        delete it.imagenes[ih.id];
        it.image_actions = it.image_actions || {};
        delete it.image_actions[ih.id];
        it.acciones_imagenes = it.acciones_imagenes || {};
        delete it.acciones_imagenes[ih.id];
      } catch (_) {}
    } else {
      const imgActObj = { accion: act, ...(extra || {}), id: ih.id, page_num: ih.page_num, img_idx: ih.img_idx };
      it.imagenes = it.imagenes || {};
      it.imagenes[ih.id] = imgActObj;
      it.image_actions = it.image_actions || {};
      it.image_actions[ih.id] = imgActObj;
      it.acciones_imagenes = it.acciones_imagenes || {};
      it.acciones_imagenes[ih.id] = imgActObj;
    }
    if (act === 'borrar' && extra && extra.global) await showCustomAlert('Imagen Registrada Globalmente','✓ Se borrará POR DEFECTO en todos los PDFs donde aparezca igual.','<i class="fa-solid fa-trash-arrow-up"></i>','#dc2626');
    else if (act === 'conservar' && extra && extra.global) await showCustomAlert('Imagen Protegida Globalmente','✓ Se CONSERVARÁ en todos los PDFs donde aparezca igual.','<i class="fa-solid fa-shield-halved"></i>','#059669');
    if (typeof _docInfoCache !== 'undefined' && _docInfoCache?.clear) _docInfoCache.clear();
    if (typeof window !== 'undefined' && window._docInfoCache?.clear) window._docInfoCache.clear();
    if (typeof syncInternetCheckboxes === 'function') syncInternetCheckboxes();
    // Re-renderizar el mismo documento sin cambiar de archivo ni de página.
    if (typeof openPos === 'function') await openPos(POS,  { force:true, preserveScroll:true });
  } catch (e) {
    hideBlocker();
    console.warn('[IMAGEN] acción no guardada:', e);
    if (typeof showCustomAlert === 'function') await showCustomAlert('No se pudo actualizar la imagen', e.message || 'Error desconocido', '<i class="fa-solid fa-triangle-exclamation"></i>', '#dc2626');
  }
}
function triggerUploadImage() {
  const inp = document.getElementById('inputImageFile');
  if (inp) {
    inp.value='';
    inp.click();
  }
}
async function uploadImageFile(input) {
  if (!input.files || input.files.length===0) return;
  const file=input.files[0], ih=selectedImageIh;
  if (!ih) return;
  const imagenesActivas = document.getElementById('cbImg') ? document.getElementById('cbImg').checked : true;
  if (!imagenesActivas) {
    if (typeof showCustomAlert === 'function') await showCustomAlert('Imágenes desactivadas', 'No se puede reemplazar una imagen mientras «Imágenes» esté desactivado.', '<i class="fa-solid fa-image"></i>', '#6b7280');
    input.value='';
    return;
  }
  const it=ITEMS[POS];
  showBlocker('Subiendo imagen de reemplazo...');
  const reader=new FileReader();
  reader.onload=async e=> {
    try {
      const res=await fetch('/api/upload_image', {
        method:'POST',headers: { 'Content-Type':'application/json' }
        ,body:JSON.stringify( {
          grado:(it?._rama||grad),archivo:it.archivo,img_id:ih.id,nombre_imagen:file.name,datos_base64:e.target.result
        }
        )
      }
  );
      const data=await res.json();
      hideBlocker();
      if (data.ok) await handleImageAction('reemplazar', { ruta:data.ruta }
      ,ih);
      else throw new Error(data.msg || 'No se pudo subir la imagen.');
    } catch(err) {
      hideBlocker();
      if (typeof showCustomAlert==='function') await showCustomAlert('No se pudo reemplazar la imagen',err.message||'Error desconocido','<i class="fa-solid fa-triangle-exclamation"></i>','#dc2626');
    }
  }
  ;
  reader.readAsDataURL(file);
}
