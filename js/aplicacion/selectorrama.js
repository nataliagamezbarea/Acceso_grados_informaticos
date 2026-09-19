window.__routerVistasActivo = false;
async function iniciarSelectorRama() {
  const selector = document.getElementById("selector-rama");
  if (!selector) {
    // Si no existe todavía, programar una comprobación después de un corto retraso
    setTimeout(iniciarSelectorRama, 100);
    return;
  }
  // Siempre reinicializamos: esto asegura que "SELECCIONAR CLASE" aparezca primero
  // incluso si la vista "inicio" se carga de nuevo (después del login, HOME, etc.)
  // Quitamos la comprobación de data-inicializado para permitir reinicialización
  const botonDescarga = document.getElementById(
  "btn-descargar-rama-selector"
  );
  const botonVisor = document.getElementById(
  "btn-visor-rama-selector"
  );
  configurarBotonVisor(selector, botonVisor);
  configurarBotonDescarga(selector, botonDescarga);
  selector.addEventListener("change", () =>  { cambiarRamaDesdeSelector(selector); }
  );
  actualizarBotonesSelector(
  selector,
  botonDescarga,
  botonVisor
  );
  // Asegurar que el selector tenga SELECCIONAR RAMA y no quede en blanco
  selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
  try {
    const cached = JSON.parse(localStorage.getItem('cache_ramas_lista') || sessionStorage.getItem('cache_ramas_lista') || '[]');
    if (Array.isArray(cached) && cached.length) {
      selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
      cached.forEach(r =>  {
        if (r === 'TODAS_LAS_RAMAS_' || r === '__TODAS__' || r === 'TODAS LAS RAMAS') return;
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r;
        selector.appendChild(o);
      }
  );
    }
  } catch (_) {
  }
  (async () =>  {
    try {
      if (window.Permisos?.asegurarSesion) { await window.Permisos.asegurarSesion(); }
      await cargarRamasSelector(selector);
      const opcionesRestantes = Array.from(selector.options).filter(op => op.value && op.value !== 'TODAS_LAS_RAMAS_' && op.value !== '__TODAS__' && op.value !== 'TODAS LAS RAMAS');
      selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
      opcionesRestantes.forEach(op =>  {
        const nueva = document.createElement('option');
        nueva.value = op.value;
        nueva.textContent = op.textContent;
        selector.appendChild(nueva);
      }
  );
      let ramaGuardada = '';
      try {
        ramaGuardada = String(window.Estado?.obtener?.('rama') || localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '').trim();
      } catch (_) {
      }
      const forzar = (() =>  {
        try { return sessionStorage.getItem('forzar_selector_rama') === '1'; }
        catch (_) { return false; }
      }
      )();
      if (forzar) { selector.value = ''; }
      else if (ramaGuardada && Array.from(selector.options).some(op => op.value === ramaGuardada)) {
        selector.value = ramaGuardada;
      } else {
        selector.value = '';
      }
    } catch (error) {
      // El estado CARGANDO... es únicamente transitorio. Si la carga falla
      // o agota el tiempo, nunca debemos dejarlo visible como estado final.
      selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
      selector.removeAttribute("aria-busy");
    }
    // En todos los caminos (éxito o error) el estado final del selector
    // debe ser SELECCIONAR RAMA, nunca CARGANDO...
    if (!Array.from(selector.options).some(op => op.value)) {
      selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
    }
    actualizarBotonesSelector(selector, botonDescarga, botonVisor);
  }
  )();
  actualizarBotonesSelector(
  selector,
  botonDescarga,
  botonVisor
  );
}
const CLAVE_DESCARGA_BOTON_RAMA = "descarga_boton_rama_selector_v1";
function leerEstadoDescargaBotonRama() {
  try {
    const raw = localStorage.getItem(CLAVE_DESCARGA_BOTON_RAMA);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function guardarEstadoDescargaBotonRama(datos) {
  try { localStorage.setItem(CLAVE_DESCARGA_BOTON_RAMA, JSON.stringify( { ...datos, actualizado: Date.now() } )); }
  catch (_) {}
}
function borrarEstadoDescargaBotonRama() {
  try { localStorage.removeItem(CLAVE_DESCARGA_BOTON_RAMA); }
  catch (_) {}
}
function aplicarEstadoCargandoBotonRama(boton, activo, titulo, pct) {
  if (!boton) return;
  boton.disabled = Boolean(activo);
  boton.dataset.descargando = activo ? "1" : "0";
  if (activo) {
    boton.classList.add("deshabilitado");
    boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    boton.title = `${titulo || "Descargando..."}${pct != null ? ` (${pct}%)` : ""}`;
  } else {
    boton.classList.remove("deshabilitado");
    boton.innerHTML = '<i class="fa-solid fa-download"></i>';
    if (titulo) boton.title = titulo;
  }
}
function configurarBotonDescarga(selector, boton) {
  if (!boton) { return; }
  // Un estado "activo" persistido de antes de recargar es basura: el JS se
  // detiene por completo al recargar, así que nunca hay una descarga real
  // continuando. Se limpia para que el botón no se quede girando para siempre.
  if (leerEstadoDescargaBotonRama()) { borrarEstadoDescargaBotonRama(); }
  boton.addEventListener("click", async (evento) =>  {
    evento.preventDefault();
    if (boton.disabled) return;
    const rama = obtenerRamaSeleccionada(selector);
    const ramas = rama
    ? [rama]
    : Array.from(selector.options)
    .map((opcion) => opcion.value)
    .filter(
    (valor) =>
    valor &&
    valor !== "TODAS_LAS_RAMAS_" &&
    valor !== "__TODAS__" &&
    valor !== "TODAS LAS RAMAS"
  );
    if (
    !window.recogerUrlsMaterial ||
    !window.descargarTodosArchivos ||
    !ramas.length
    ) { return; }
    const tituloReposo = rama ? `Descargar ${rama}` : `Descargar todas las ramas (${ramas.length})`;
    const jobId = `rama_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let ultimoEstadoTexto = "";
    guardarEstadoDescargaBotonRama( { activo: true, rama, pct: 0, jobId } );
    aplicarEstadoCargandoBotonRama(boton, true, rama ? `Descargando ${rama}...` : "Descargando todas las ramas...", 0);
    try {
      const archivos = [];
      for (const ramaActual of ramas) {
        const urls =
        await window.recogerUrlsMaterial( { rama: ramaActual }
  );
        urls.forEach((archivo) =>  {
          archivos.push( {
            ...archivo,
            carpeta: ramaActual
          }
  );
        }
  );
      }
      await window.descargarTodosArchivos(
      archivos,
      (estado, pct) =>  {
        ultimoEstadoTexto = estado || "";
        guardarEstadoDescargaBotonRama( { activo: true, rama, pct: Number(pct) || 0, jobId } );
        aplicarEstadoCargandoBotonRama(boton, true, estado, pct);
      },
      {
        jobId,
        nombreZip: rama
        ? `${rama.replace(
                /[^a-z0-9_-]+/gi,
                "_"
              )}.zip`
        : "todas_las_ramas.zip"
      }
  );
      if (/cancelad/i.test(ultimoEstadoTexto)) {
        boton.innerHTML = '<i class="fa-solid fa-ban"></i>';
      } else {
        boton.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
      }
    } catch (error) {
      boton.innerHTML = '<i class="fa-solid fa-circle-xmark icono-error"></i>';
    } finally {
      borrarEstadoDescargaBotonRama();
      setTimeout(() =>  {
        aplicarEstadoCargandoBotonRama(boton, false, tituloReposo, null);
        actualizarBotonesSelector(selector, boton, document.getElementById("btn-visor-rama-selector"));
      }, 1400);
    }
  }
  );
}
function cambiarRamaDesdeSelector(selector) {
  const rama = obtenerRamaSeleccionada(selector);
  if (!rama) {
    try { sessionStorage.setItem("forzar_selector_rama", "1"); }
    catch (_) {
    }
    try { window.RamaActual?.limpiar?.(); }
    catch (_) {
      try { window.RamaActual?.guardar?.(""); }
      catch (_) { } }
    try { window.Estado?.guardar?.("rama", ""); }
    catch (_) {
    }
    actualizarBotonesSelector(
    selector,
    document.getElementById(
    "btn-descargar-rama-selector"
    ),
    document.getElementById(
    "btn-visor-rama-selector"
    )
  );
    return;
  }
  try { sessionStorage.removeItem("forzar_selector_rama"); }
  catch (_) {
  }
  window.RamaActual?.guardar(rama);
  window.Estado?.guardar?.("rama", rama);
  try {
    const ctx = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}');
    localStorage.setItem('app_ultimo_contexto', JSON.stringify( {
      ...ctx, vista: 'clase', rama, archivo: '', abierto: false
    }
    ));
    localStorage.setItem('app_ultima_vista', 'clase');
  } catch (_) {
  }
  if (window.AppViews?.mostrar) {
    window.AppViews.mostrar("clase", { rama });
    return;
  }
}
/*
 * IMPORTANTE:
 * El archivo se carga desde vista-inicio.html.
 * Se inicializa aquí después de que el DOM exista.
 */
function arrancarSelectorRamaCuandoEsteListo() {
  if (document.readyState === "loading") {
    document.addEventListener(
    "DOMContentLoaded",
    iniciarSelectorRama,
    { once: true }
  );
    return;
  }
  iniciarSelectorRama();
}
arrancarSelectorRamaCuandoEsteListo();
