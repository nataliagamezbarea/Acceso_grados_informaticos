async function iniciarVistaInicio() {
  const selector = document.getElementById("selector-rama");
  const botonDescarga = document.getElementById("btn-descargar-rama-selector");
  const botonVisor = document.getElementById("btn-visor-rama-selector");
  if (!selector) return;
  // Asegurar que el selector tenga SELECCIONAR RAMA y no quede en blanco
  if (!selector.options || selector.options.length === 0 || !selector.innerHTML.trim()) {
    selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
  } else if (selector.options.length === 1 && !selector.options[0].value) {
    selector.options[0].textContent = 'SELECCIONAR RAMA';
    selector.options[0].disabled = false;
  }
  // Pre-poblar inmediatamente desde caché para que esté visible desde el frame 0
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
  // Al estar en el selector de ramas, aseguramos que ninguna rama quede guardada en localStorage o sessionStorage
  try {
    window.RamaActual?.limpiar?.();
    window.Estado?.guardar?.("rama", "");
    localStorage.removeItem("rama_actual");
    localStorage.removeItem("last_grado");
    localStorage.removeItem("rama");
    localStorage.removeItem("app_rama");
    sessionStorage.removeItem("app_rama");
    sessionStorage.setItem("forzar_selector_rama", "1");
  } catch (_) {
  }
  selector.value = "";
  document.title = "Grados Informáticos";
  // Si después de limpiar o inicializar no tiene opciones, asegurar SELECCIONAR RAMA
  if (selector.options.length === 0) { selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>'; }
  // Los eventos se registran una sola vez. La carga de ramas sí se
  // puede repetir después de obtener la configuración de GitHub.
  if (selector.dataset.inicializado !== "1") {
    selector.dataset.inicializado = "1";
    configurarBotonVisor(selector, botonVisor);
    configurarBotonDescarga(selector, botonDescarga);
    selector.addEventListener("change", () => { void cambiarRamaDesdeSelector(selector); });
  }
  actualizarBotonesSelector(selector, botonDescarga, botonVisor);
  // La interfaz no espera a la red ni a la sesión para quedar utilizable.
  // La caché ya se ha pintado arriba; la actualización remota se hace en segundo plano
  // y añade/actualiza las ramas sin vaciar visualmente el selector.
  Promise.resolve()
    .then(() => window.Permisos?.asegurarSesion?.())
    .then(() => cargarRamasSelector(selector))
    .catch(() => {})
    .finally(() => { actualizarBotonesSelector(selector, botonDescarga, botonVisor); });
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
// Aplica/retira visualmente el estado "cargando" del botón de descarga de rama.
// activo=true -> spinner girando + deshabilitado. activo=false -> vuelve al icono normal.
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
  if (!boton) return;
  // Una descarga NUNCA puede seguir en curso tras recargar la página (el JS
  // se detiene por completo al navegar/recargar). Si queda un estado
  // "activo" persistido de una sesión anterior es basura: se limpia para
  // que el botón no se quede pegado girando para siempre.
  const persistido = leerEstadoDescargaBotonRama();
  if (persistido) { borrarEstadoDescargaBotonRama(); }
  boton.addEventListener("click", async evento =>  {
    evento.preventDefault();
    if (boton.disabled) return;
    const rama = obtenerRamaSeleccionada(selector);
    const ramas = rama ? [rama] : Array.from(selector.options)
    .map(opcion => opcion.value)
    .filter(valor => valor && valor !== "TODAS_LAS_RAMAS_" && valor !== "__TODAS__" && valor !== "TODAS LAS RAMAS");
    if (!window.recogerUrlsMaterial || !window.descargarTodosArchivos || !ramas.length) return;
    const tituloReposo = rama ? `Descargar ${rama}` : `Descargar todas las ramas (${ramas.length})`;
    const jobId = `rama_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let ultimoEstadoTexto = "";
    guardarEstadoDescargaBotonRama( { activo: true, rama, pct: 0, jobId } );
    aplicarEstadoCargandoBotonRama(boton, true, rama ? `Descargando ${rama}...` : "Descargando todas las ramas...", 0);
    try {
      const archivos = [];
      for (const ramaActual of ramas) {
        const urls = await window.recogerUrlsMaterial( { rama: ramaActual }
  );
        urls.forEach(archivo => archivos.push({ ...archivo, carpeta: ramaActual, rama: ramaActual }));
      }
      await window.descargarTodosArchivos(archivos, (estado, pct) =>  {
        ultimoEstadoTexto = estado || "";
        guardarEstadoDescargaBotonRama( { activo: true, rama, pct: Number(pct) || 0, jobId } );
        aplicarEstadoCargandoBotonRama(boton, true, estado, pct);
      }
      ,  { jobId, nombreZip: rama ? `${rama.replace(/[^a-z0-9_-]+/gi, "_")}.zip` : "todas_las_ramas.zip" }
  );
      // La descarga puede haberse resuelto sin lanzar error aunque el
      // usuario la haya cancelado desde el notificador: se detecta por el
      // último mensaje de estado recibido, en vez de asumir siempre éxito.
      if (/cancelad/i.test(ultimoEstadoTexto)) {
        boton.innerHTML = '<i class="fa-solid fa-ban"></i>';
      } else {
        boton.innerHTML = '<i class="fa-solid fa-check icono-exito"></i>';
      }
    } catch (error) {
      boton.innerHTML = '<i class="fa-solid fa-circle-xmark icono-error"></i>';
    } finally {
      // Pase lo que pase (éxito, cancelación o error), la transición de
      // "cargando" SIEMPRE se detiene y el estado persistido se borra.
      borrarEstadoDescargaBotonRama();
      setTimeout(() =>  {
        aplicarEstadoCargandoBotonRama(boton, false, tituloReposo, null);
        actualizarBotonesSelector(selector, boton, document.getElementById("btn-visor-rama-selector"));
      }
      , 1400);
    }
  }
  );
}
async function cambiarRamaDesdeSelector(selector) {
  const rama = obtenerRamaSeleccionada(selector);
  if (!rama) {
    // El usuario ha decidido volver a elegir rama. No debe recuperarse
    // automáticamente al recargar esta pantalla.
    try { sessionStorage.setItem("forzar_selector_rama", "1"); }
    catch (_) {
    }
    try { RamaActual?.guardar?.(""); }
    catch (_) {
    }
    try { window.Estado?.guardar?.("rama", ""); }
    catch (_) {
    }
    actualizarBotonesSelector(selector,
    document.getElementById("btn-descargar-rama-selector"),
    document.getElementById("btn-visor-rama-selector"));
    return;
  }
  try { sessionStorage.removeItem("forzar_selector_rama"); }
  catch (_) {
  }
  // Usar siempre la referencia global explícita. La versión anterior llamaba
  // a RamaActual sin window y, según cómo se cargara el script, eso podía
  // lanzar ReferenceError y detener el cambio de rama antes de llegar al
  // router.
  try { window.RamaActual?.guardar?.(rama); } catch (_) {}
  try { window.Estado?.guardar?.("rama", rama); } catch (_) {}
  if (typeof window.AppViews?.mostrar === "function") {
    try {
      // Forzar el montaje para que cada cambio de rama pase por el flujo real
      // de transición y muestre Cargando rama... hasta terminar.
      await window.AppViews.mostrar("clase", { rama }, { forzar: true });
    } catch (error) {
      console.error("[RAMA] No se pudo abrir la rama seleccionada:", error);
    }
    return;
  }
}
window.inicializarVistaInicio = iniciarVistaInicio;
