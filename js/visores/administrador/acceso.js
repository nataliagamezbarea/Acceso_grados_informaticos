/* * Acceso único al Visor y Gestor de Documentos.
* Ya no crea un iframe/modal dentro de la plataforma: navega a la página
* completa del visor. Así el visor tiene todo el ancho/alto disponible, * es responsive y reutiliza la autenticación global.
*/ (() =>  {
  function obtenerRama(fallback = '') { let ctx =  { }
    ;
    let app =  {
    }
    ;
    try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
    catch (_) {
    }
    try { app = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}'); }
    catch (_) {
    }
    return String(
    fallback ||
    new URLSearchParams(window.location.search).get('rama') ||
    ctx.rama || app.rama ||
    (window.Estado && typeof window.Estado.obtener === 'function' ? window.Estado.obtener('rama') : '') ||
    localStorage.getItem('rama_actual') || localStorage.getItem('last_grado') ||
    localStorage.getItem('rama') || localStorage.getItem('grado') || ''
    ).trim();
  }
  function obtenerContextoActual() { let ctx =  { }
    ;
    let app =  {
    }
    ;
    try { ctx = JSON.parse(localStorage.getItem('visor_contexto') || '{}'); }
    catch (_) {
    }
    try { app = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}'); }
    catch (_) {
    }
    const params = new URLSearchParams(window.location.search);
    return  {
      rama: obtenerRama(),
      asignatura: params.get('asignatura') || ctx.asignatura || app.asignatura || localStorage.getItem('asignatura') || '',
      trimestre: params.get('trimestre') || ctx.trimestre || app.trimestre || localStorage.getItem('trimestre') || ''
    }
    ;
  }
  function guardarContextoVisor( { archivo, rama, asignatura, trimestre, nombre, todas = false }
  =  {
  }
  ) { let previo =  { }
    ;
    try { previo = JSON.parse(localStorage.getItem("visor_contexto") || "{}"); }
    catch (_) {
    }
    const ctx =  {
      rama: rama !== undefined ? String(rama || "").trim() : String(previo.rama || obtenerRama()).trim(),
      asignatura: asignatura !== undefined ? String(asignatura || "").trim() : String(previo.asignatura || "").trim(),
      trimestre: trimestre !== undefined ? String(trimestre || "").trim() : String(previo.trimestre || "").trim(),
      tarea: nombre !== undefined ? String(nombre || "") : String(previo.tarea || ""),
      archivo: archivo !== undefined ? String(archivo || "") : String(previo.archivo || ""),
      directo: archivo !== undefined ? !!String(archivo || "").trim() : !!previo.directo,
      abrirLista: archivo !== undefined ? !String(archivo || "").trim() : !!previo.abrirLista,
      todas: todas !== undefined ? !!todas : !!previo.todas,
      returnPath: window.location.pathname, returnSearch: ""
    }
    ;
    try { localStorage.setItem("visor_contexto", JSON.stringify(ctx)); }
    catch (_) {
    }
    if (window.Estado && typeof window.Estado.guardarContexto === "function") {
      window.Estado.guardarContexto( { rama: ctx.rama, asignatura: ctx.asignatura, trimestre: ctx.trimestre }
  );
    }
    return ctx;
  }
  function construirURL(opciones =  {
  }
  ) {
    const script = Array.from(document.scripts).find(s => /(?:^|\/)js\/visores\/administrador\/acceso\.js(?:$|[?])/.test(s.src) );
    const base = script
    ? new URL((window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html', script.src)
    : new URL((window.APP_BASE || '/') + 'paginas/visores/administrador/paneladministrador.html', window.location.href);
    const tieneArchivo = !!String(opciones.archivo || "").trim();
    guardarContextoVisor( { ...opciones, abrirLista: !tieneArchivo }
  );
    if (!tieneArchivo) {
      try {
        const previo = JSON.parse(localStorage.getItem("visor_contexto") || "{}");
        const ramaDestino = String(opciones.rama || previo.rama || localStorage.getItem("last_grado") || localStorage.getItem("rama_actual") || "").trim();
        const ramaGuardada = String(localStorage.getItem("last_archivo_rama") || previo.rama || "").trim();
        const mismoContexto = !ramaDestino || !ramaGuardada || ramaDestino === ramaGuardada;
        const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[ºª]/g, '').replace(/\btrimestres?\b/g, '').trim();
        const triDestino = norm(opciones.trimestre);
        const triGuardado = norm(localStorage.getItem("last_archivo_trimestre"));
        const asigDestino = norm(opciones.asignatura);
        const asigGuardado = norm(localStorage.getItem("last_archivo_asignatura"));
        const coincideTri = !triDestino || (triGuardado && triGuardado === triDestino);
        const coincideAsig = !asigDestino || (asigGuardado && (asigGuardado === asigDestino || asigGuardado.includes(asigDestino) || asigDestino.includes(asigGuardado)));
        const coincideUbicacion = mismoContexto && coincideTri && coincideAsig;
        if (coincideUbicacion && localStorage.getItem("last_open") === "1" && localStorage.getItem("last_archivo")) {
          const pos = localStorage.getItem("last_pos");
          localStorage.setItem("visor_contexto", JSON.stringify( {
            ...previo,
            rama: ramaDestino,
            trimestre: opciones.trimestre || previo.trimestre || '',
            asignatura: opciones.asignatura || previo.asignatura || '',
            todas: !!opciones.todas,
            archivo: localStorage.getItem("last_archivo") || "",
            directo: true,
            abrirLista: false,
            pos: pos !== null && pos !== "" ? Number(pos) : undefined,
            returnPath: window.location.pathname
          }
          ));
        } else {
          localStorage.setItem("last_open", "0");
          localStorage.setItem("visor_contexto", JSON.stringify( {
            ...previo,
            rama: ramaDestino,
            trimestre: opciones.trimestre || '',
            asignatura: opciones.asignatura || '',
            todas: !!opciones.todas,
            archivo: "",
            directo: false,
            abrirLista: true,
            pos: undefined,
            returnPath: window.location.pathname
          }
          ));
        }
      } catch (_) {
      }
    }
    const u = new URL(base.href);
    const add = (k, v) =>  {
      if (v !== undefined && v !== null && String(v).trim() !== '') u.searchParams.set(k, String(v));
    }
    ;
    if (opciones.rama) add('rama', opciones.rama);
    if (opciones.asignatura) add('asignatura', opciones.asignatura);
    if (opciones.trimestre) add('trimestre', opciones.trimestre);
    if (opciones.archivo) add('archivo', opciones.archivo);
    if (opciones.nombre) add('nombre', opciones.nombre);
    if (opciones.todas === true) u.searchParams.set('todas', '1');
    u.searchParams.set('return', (window.APP_BASE || '/'));
    return u;
  }
  function esAdminActual() {
    /* El modo de edición NO elimina los permisos de administrador.
   * vistaInvitado es una vista del contenido, no una pérdida del rol.
   * El visor de administración debe comprobar exclusivamente el rol real.
   */
    return Boolean(window.Permisos && window.Permisos.esAdmin === true);
  }
  function abrir(opciones =  {
  }
  ) {
    if (!esAdminActual()) {
      void 0;
      return false;
    }
    const actual = obtenerContextoActual();
    const tieneRamaExplicita = Object.prototype.hasOwnProperty.call(opciones, 'rama') && opciones.rama !== undefined;
    const rama = String(tieneRamaExplicita ? (opciones.rama || '') : (actual.rama || '')).trim();
    const tieneAsigExplicita = Object.prototype.hasOwnProperty.call(opciones, 'asignatura') && opciones.asignatura !== undefined;
    const tieneTriExplicita = Object.prototype.hasOwnProperty.call(opciones, 'trimestre') && opciones.trimestre !== undefined;
    const triFinal = tieneTriExplicita ? String(opciones.trimestre || '').trim() : String(actual.trimestre || '').trim();
    const asigFinal = tieneAsigExplicita ? String(opciones.asignatura || '').trim() : String(actual.asignatura || '').trim();
    const opcionesFinales =  {
      ...opciones,
      rama,
      asignatura: asigFinal,
      trimestre: triFinal
    }
    ;
    // Si la rama ya es conocida localmente, NO convertir la apertura en "todas".
    const todas = opciones.todas === true || (tieneRamaExplicita && !rama);
    const url = construirURL( { ...opcionesFinales, rama: todas ? '' : rama, todas }
  );
    if (typeof window.abrirVisorAdministradorEmbebido === 'function') {
      window.abrirVisorAdministradorEmbebido(url.href);
    } else {
      window.location.assign(url.href);
    }
    return true;
  }
  function crearBotonVisorContextual(parametros =  {
  }
  ) {
    const  { rama, asignatura, trimestre, nombre, archivo, etiqueta = 'Abrir visor' }
    = parametros;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-descarga btn-visor-contextual';
    b.title = etiqueta;
    b.setAttribute('aria-label', etiqueta);
    b.innerHTML = '<i class="fa-solid fa-file-pen" aria-hidden="true"></i>';
    b.addEventListener('click', e =>  {
      e.preventDefault();
      e.stopPropagation();
      const opts =  { etiqueta }
      ;
      if (rama !== undefined) opts.rama = rama;
      if (asignatura !== undefined) opts.asignatura = asignatura;
      if (trimestre !== undefined) opts.trimestre = trimestre;
      if (nombre !== undefined) opts.nombre = nombre;
      if (archivo !== undefined) opts.archivo = archivo;
      abrir(opts);
    }
  );
    return b;
  }
  window.abrirVisorAdministrador = abrir;
  window.crearBotonVisorContextual = crearBotonVisorContextual;
  window.construirUrlVisorAdministrador = construirURL;
}
)();
