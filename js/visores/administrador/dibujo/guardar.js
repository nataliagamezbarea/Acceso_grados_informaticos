/* GUARDAR RECUADRO DIRECTO (< 60 lineas) */
async function guardarRecuadroNuevoDirecto(tipo, it, pageNum, left, top, width, height) {
  const esColegio = (tipo === 'colegio');
  const esReflujo = (tipo === 'reflujo');
  showBlocker(esReflujo ? 'Guardando inicio de flujo...' : (esColegio ? 'Guardando colegio...' : 'Guardando nombre...'));
  try {
    let textoSeleccionado = '';
    if (!esReflujo) {
      try {
        const rt = await fetch('/api/extract_box_text',  {
          method: 'POST',
          headers:  { 'Content-Type': 'application/json' }
          ,
          body: JSON.stringify( {
            grado: (it?._rama || grad), archivo: it.archivo, page_num: pageNum,
            left: left, top: top, width: width, height: height
          }
          )
        }
  );
        const dt = await rt.json();
        textoSeleccionado = (dt.text || '').trim();
      } catch (_e) {
        textoSeleccionado = '';
      }
    }
    await fetch('/api/recuadro',  {
      method: 'POST',
      headers:  { 'Content-Type': 'application/json' }
      ,
      body: JSON.stringify( {
        grado: (it?._rama || grad),
        archivo: it.archivo,
        tipo: tipo,
        page_num: pageNum,
        left: left, top: top, width: width, height: height,
        text: textoSeleccionado
      }
      )
    }
  );
    if (esColegio) {
      // El recuadro recién creado debe quedar visible inmediatamente en la
      // misma apertura; setCol() actualiza además ITEMS[POS].inc_colegio.
      await setCol(true);
    } else if (!esReflujo) {
      await setInt(true);
    }
    limpiarRecuadrosDibujoSobrantes();
    hideBlocker();
    if (typeof openPos === 'function' && typeof POS !== 'undefined') await openPos(POS,  { force: true }
  );
    if (typeof refreshRightIframe === 'function') refreshRightIframe();
  } catch (err) {
    hideBlocker();
  }
}
/* Selector de ramas: siempre conserva SELECCIONAR y permite TODAS las ramas */
