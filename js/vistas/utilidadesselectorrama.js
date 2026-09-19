function obtenerRamaSeleccionada(selector) {
  const valor = String(selector.value || "").trim();
  return (valor === "TODAS LAS RAMAS" || valor === "TODAS_LAS_RAMAS_" || valor === "__TODAS__") ? "" : valor;
}
function actualizarBotonesSelector(selector, botonDescarga, botonVisor) {
  const cantidad = Array.from(selector.options)
  .filter(opcion => opcion.value && opcion.value !== "TODAS LAS RAMAS" && opcion.value !== "TODAS_LAS_RAMAS_" && opcion.value !== "__TODAS__").length;
  const rama = obtenerRamaSeleccionada(selector);
  const ajustes = window.Ajustes?.obtener?.() ||  {
  }
  ;
  // Durante el arranque Permisos puede no existir todavía. Nunca asumir admin
  // en ese estado porque provoca el flash de botones de Descarga/Visor para invitados.
  const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin === true);
  if (botonDescarga) {
    botonDescarga.style.display = esAdmin && ajustes.descargasEnSelectorRamas !== false
    ? "inline-flex" : "none";
    // Mientras hay una descarga en curso (spinner visible) no se debe tocar
    // ni el estado disabled ni el título: eso es lo que hacía que el aviso
    // de "cargando" se cortara/perdiera a mitad de la descarga.
    if (botonDescarga.dataset.descargando === "1") return;
    botonDescarga.disabled = cantidad === 0;
    botonDescarga.title = rama ? `Descargar ${rama}` : `Descargar todas las ramas (${cantidad})`;
  }
  if (botonVisor) {
    botonVisor.style.display = esAdmin && ajustes.visorActivo !== false && ajustes.visorEnSelectorRamas !== false
    ? "inline-flex" : "none";
    botonVisor.disabled = cantidad === 0;
    botonVisor.title = rama ? `Abrir Visor Admin: ${rama}` : `Abrir Visor Admin: todas las ramas (${cantidad})`;
  }
}
function abrirVisorDesdeSelector(selector) {
  const rama = obtenerRamaSeleccionada(selector);
  try { let previo =  { }
    ;
    try { previo = JSON.parse(localStorage.getItem("visor_contexto") || "{}"); }
    catch (_) {
    }
    const ultimoArchivo = String(localStorage.getItem("last_archivo") || previo.archivo || "").trim();
    const ultimaRamaDocumento = String(localStorage.getItem("last_archivo_rama") || previo.rama || "").trim();
    const mismoContexto = !!ultimoArchivo && (!rama || !ultimaRamaDocumento || rama === ultimaRamaDocumento);
    const abrirDocumento = localStorage.getItem("last_open") === "1" && mismoContexto;
    const ctx =  {
      ...previo,
      rama,
      todas: !rama,
      trimestre: "",
      archivo: abrirDocumento ? ultimoArchivo : "",
      pos: abrirDocumento ? Number(localStorage.getItem("last_pos") || previo.pos || 0) : undefined,
      directo: abrirDocumento,
      abrirLista: !abrirDocumento,
      abierto: abrirDocumento,
      vista: "visores/administrador"
    }
    ;
    if (!abrirDocumento) delete ctx.pos;
    localStorage.setItem("visor_contexto", JSON.stringify(ctx));
    localStorage.setItem("app_ultima_vista", "visores/administrador");
    localStorage.setItem("app_ultimo_contexto", JSON.stringify( {
      vista: "visores/administrador", rama, asignatura: ctx.asignatura || "", trimestre: ctx.trimestre || "",
      archivo: ctx.archivo || "", pos: ctx.pos, abierto: abrirDocumento
    }
    ));
    if (rama) {
      localStorage.setItem("last_grado", rama);
      localStorage.setItem("rama_actual", rama);
    }
    sessionStorage.setItem("visorAdminBranchMode", rama ? "branch" : "all");
    sessionStorage.setItem("visorAdminBranch", rama);
    const url = new URL("/paginas/visores/administrador/paneladministrador.html", document.baseURI);
    if (rama) url.searchParams.set("rama", rama);
    else url.searchParams.set("todas", "1");
    if (abrirDocumento && ultimoArchivo) {
      url.searchParams.set("archivo", ultimoArchivo);
      url.searchParams.set("pos", String(ctx.pos ?? 0));
    }
    if (ctx.asignatura) url.searchParams.set("asignatura", ctx.asignatura);
    // Entrada desde el selector de ramas: empezar siempre en TODOS LOS TRIMESTRES.
    url.searchParams.delete("trimestre");
    url.searchParams.set("return", "/");
    url.searchParams.set("_embed", "1");
    if (typeof window.abrirVisorAdministradorEmbebido === 'function') {
      window.abrirVisorAdministradorEmbebido(url.href);
    } else {
      window.location.href = url.href;
    }
  } catch (error) {
    console.warn("No se pudo abrir/restaurar el Visor Admin", error);
  }
}
function configurarBotonVisor(selector, boton) {
  if (!boton) return;
  boton.addEventListener("click", evento =>  {
    evento.preventDefault();
    evento.stopPropagation();
    abrirVisorDesdeSelector(selector);
  }
  );
}
async function cargarRamasSelector(selector) {
  if (!selector) return [];
  if (selector.options.length === 0) { selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>'; }
  try {
    const poblar = window.RamaAPI.poblarSelectorCachePrimero || window.RamaAPI.poblarSelector;
    const ramas = await Promise.race([
    poblar(selector,  { incluirMarcador: true, placeholder: 'SELECCIONAR RAMA' }
    ),
    new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("Tiempo agotado")), 8000))
    ]);
    const lista = Array.isArray(ramas) ? ramas : [];
    Array.from(selector.options).forEach(opcion =>  {
      if (opcion.value === 'TODAS LAS RAMAS' || opcion.value === 'TODAS_LAS_RAMAS_' || opcion.value === '__TODAS__') opcion.remove();
    }
  );
    if (selector.options[0]) { selector.options[0].textContent = 'SELECCIONAR RAMA'; }
    selector.value = '';
    if (selector.options[0]) selector.options[0].selected = true;
    return lista;
  } catch (error) {
    // SELECCIONAR RAMA solo es el estado inicial; nunca debe quedar como estado final.
    selector.innerHTML = '<option value="" selected>SELECCIONAR RAMA</option>';
    selector.value = '';
    if (selector.options[0]) selector.options[0].selected = true;
    return [];
  }
}
