/* Selector de rama del Visor: usa la misma persistencia que la aplicación principal. */
function nombreRamaVisible(rama) {
  const valor = String(rama || '').trim();
  if (!valor || valor === 'TODAS LAS RAMAS' || valor === '__TODAS__' || valor === 'TODAS_LAS_RAMAS_') return valor;
  const mapa =  {
    'Primer_grado_medio': 'Primer grado medio',
    'Segundo_grado_medio': 'Segundo grado medio',
    'Primer_grado_superior_DAW': 'Primer grado superior DAW'
  }
  ;
  if (mapa[valor]) return mapa[valor];
  return valor.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
window.RamaActual = window.RamaActual || (() =>  {
  const KEY = 'rama_actual';
  const FORCE = 'forzar_selector_rama';
  const obtener = () =>  {
    try {
      // FORCE solo obliga al selector a quedar vacío en la entrada inicial.
      // Si ya existe un documento/contexto abierto, la rama conocida debe
      // recuperarse desde localStorage y mostrarse inmediatamente.
      if (sessionStorage.getItem(FORCE) === '1') { let ctx =  { }
        ;
        try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
        catch (_) {
        }
        const hayDocumento = localStorage.getItem('last_open') === '1' || ctx.abierto === true || ctx.directo === true;
        if (!hayDocumento) return '';
        sessionStorage.removeItem(FORCE);
      }
    } catch (_) {
    }
    try { let ctx =  { }
      ;
      try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
      catch (_) {
      }
      let app =  {
      }
      ;
      try { app = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}'); }
      catch (_) {
      }
      return String(ctx.rama || app.rama || localStorage.getItem(KEY) || localStorage.getItem('last_grado') || '').trim();
    } catch (_) {
      return '';
    }
  }
  ;
  const guardar = (rama) =>  {
    const r = String(rama || '').trim();
    try {
      if (r) {
        localStorage.setItem(KEY, r);
        sessionStorage.removeItem(FORCE);
      } else localStorage.removeItem(KEY);
    } catch (_) {
    }
    try { window.Estado?.guardar?.('rama', r); }
    catch (_) { } }
  ;
  const limpiar = () =>  {
    try {
      localStorage.removeItem(KEY);
      sessionStorage.setItem(FORCE, '1');
    } catch (_) {
    }
    try { window.Estado?.guardar?.('rama', ''); }
    catch (_) { } }
  ;
  const pintarSeleccionActual = (select) =>  {
    if (!select) return '';
    Array.from(select.options).forEach(o =>  {
      if (o.value === '' || (o.textContent || '').trim().toUpperCase() === 'SELECCIONAR RAMA') o.remove();
      if (o.value === 'TODAS LAS RAMAS' || o.value === 'TODAS_LAS_RAMAS_' || o.value === '__TODAS__' || o.textContent === 'TODAS_LAS_RAMAS_' || o.textContent === '__TODAS__') {
        o.value = 'TODAS LAS RAMAS';
        o.textContent = 'TODAS LAS RAMAS';
      }
    }
  );
    if (!Array.from(select.options).some(o => o.value === 'TODAS LAS RAMAS')) {
      const all = document.createElement('option');
      all.value = 'TODAS LAS RAMAS';
      all.textContent = 'TODAS LAS RAMAS';
      select.insertBefore(all, select.firstChild);
    }
    const r = obtener();
    if (r && r !== 'TODAS LAS RAMAS' && r !== 'TODAS_LAS_RAMAS_' && r !== '__TODAS__' && !Array.from(select.options).some(o => o.value === r)) {
      const o = document.createElement('option');
      o.value = r;
      o.textContent = nombreRamaVisible(r);
      select.appendChild(o);
    }
    select.value = (!r || r === '__TODAS__' || r === 'TODAS_LAS_RAMAS_' || r === 'TODAS LAS RAMAS') ? 'TODAS LAS RAMAS' : r;
    return select.value;
  }
  ;
  const poblarSelector = async (select) =>  {
    if (!select) return [];
    let guardada = obtener() || 'TODAS LAS RAMAS';
    if (guardada === '__TODAS__' || guardada === 'TODAS_LAS_RAMAS_') guardada = 'TODAS LAS RAMAS';
    const ramas = await (window.RamaAPI?.poblarSelector ? window.RamaAPI.poblarSelector(select,  {
      incluirMarcador: false, selectedValue: guardada
    }
    ) : Promise.resolve([]));
    // Asegurar que no quede SELECCIONAR RAMA en el visor y que TODAS LAS RAMAS sea la 1ª opción
    Array.from(select.options).forEach(o =>  {
      if (o.value === '' || (o.textContent || '').trim().toUpperCase() === 'SELECCIONAR RAMA') o.remove();
      if (o.value === 'TODAS LAS RAMAS' || o.value === 'TODAS_LAS_RAMAS_' || o.value === '__TODAS__' || o.textContent === 'TODAS_LAS_RAMAS_' || o.textContent === '__TODAS__') {
        o.value = 'TODAS LAS RAMAS';
        o.textContent = 'TODAS LAS RAMAS';
      }
    }
  );
    if (!Array.from(select.options).some(o => o.value === 'TODAS LAS RAMAS')) {
      const all = document.createElement('option');
      all.value = 'TODAS LAS RAMAS';
      all.textContent = 'TODAS LAS RAMAS';
      select.insertBefore(all, select.firstChild);
    }
    select.value = (!guardada || guardada === '__TODAS__' || guardada === 'TODAS_LAS_RAMAS_' || guardada === 'TODAS LAS RAMAS') ? 'TODAS LAS RAMAS' : guardada;
    return ramas;
  }
  ;
  return  {
    obtener, guardar, limpiar, pintarSeleccionActual, poblarSelector, listarRamas: () => window.RamaAPI?.listarRamas?.() || Promise.resolve([]), obtenerRamaActual: obtener, guardarRamaActual: guardar, limpiarRamaActual: limpiar, pintarRamaSeleccionada: pintarSeleccionActual, cargarSelectorRamas: poblarSelector
  }
  ;
}
)();
