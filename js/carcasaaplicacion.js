(() =>  {
  if (!window.AppDOM) {
    const originalGetElementById = Document.prototype.getElementById;
    const findInShadowRoots = (root, id, seen = new Set()) =>  {
      if (!root || seen.has(root)) return null;
      seen.add(root);
      const direct = root.querySelectorAll ? Array.from(root.querySelectorAll("[id]")).find((el) => el.id === id) : null;
      if (direct) return direct;
      const nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
      for (const node of nodes) {
        if (node.shadowRoot) {
          const found = findInShadowRoots(node.shadowRoot, id, seen);
          if (found) return found;
        }
      }
      return null;
    }
    ;
    window.AppDOM =  {
      getById(id) { return originalGetElementById.call(document, id) || findInShadowRoots(document, id); }
    }
    ;
    Document.prototype.getElementById = function(id) { return window.AppDOM.getById(id); }
    ;
  }
  const V = new Set(["login","inicio","clase","asignaturas","asignatura","apuntes"]);
  const COMPONENTS =  {
    login: "componentes/accesofp/vistas/iniciosesion.html",
    inicio: "componentes/accesofp/vistas/inicio.html",
    clase: "componentes/accesofp/vistas/clase.html",
    asignaturas: "componentes/accesofp/vistas/asignaturas.html",
    asignatura: "componentes/accesofp/vistas/asignatura.html",
    apuntes: "componentes/accesofp/vistas/apuntes.html"
  }
  ;
  const CSS =  {
    "core":["css/modales/popupreutilizable.css","css/global/base.css","css/global/iconos.css","css/global/tabla.css","css/global/tablavarios.css","css/global/panelconfiguracion.css","css/global/panelconfiguracionvarios.css","css/global/autenticacion.css","css/botones/animaciones.css","css/botones/claro.css","css/botones/oscuro.css","css/componentes/indice.css","css/componentes/componentes.css","css/componentes/carcasasombra.css"],"login":["css/login.css","css/login-popups.css"],"inicio":["css/botones/oscuro.css","css/notificador/emergente.css","css/notificador/notificacion.css","css/notificador/progreso.css","css/notificador.css","css/notificador/insignias.css","css/archivos/archivos.css","css/archivos/archivosvarios.css","css/inicio/base.css","css/inicio/base2.css","css/inicio/selector.css","css/inicio/flexion.css","css/inicio/oscuro.css","css/inicio/oscurovarios.css","css/inicio/claro.css","css/inicio/clarovarios.css","css/ajustes/boton.css","css/ajustes/panel.css","css/ajustes/panelvarios.css","css/ajustes/paneloscuro.css","css/ajustes/paneloscurovarios.css","css/ajustes/oscuro.css"],"clase":["css/botones/oscuro.css","css/notificador/emergente.css","css/notificador/notificacion.css","css/notificador/progreso.css","css/notificador.css","css/notificador/insignias.css","css/archivos/archivos.css","css/archivos/archivosvarios.css","css/inicio/base.css","css/inicio/base2.css","css/inicio/selector.css","css/inicio/flexion.css","css/inicio/oscuro.css","css/inicio/oscurovarios.css","css/inicio/claro.css","css/inicio/clarovarios.css","css/ajustes/boton.css","css/ajustes/panel.css","css/ajustes/panelvarios.css","css/ajustes/paneloscuro.css","css/ajustes/paneloscurovarios.css","css/ajustes/oscuro.css"],"asignaturas":["css/botones/oscuro.css","css/notificador/emergente.css","css/notificador/notificacion.css","css/notificador/progreso.css","css/notificador.css","css/notificador/insignias.css","css/archivos/archivos.css","css/archivos/archivosvarios.css","css/inicio/base.css","css/inicio/base2.css","css/inicio/selector.css","css/inicio/flexion.css","css/inicio/oscuro.css","css/inicio/oscurovarios.css","css/inicio/claro.css","css/inicio/clarovarios.css","css/portada/portadaemoji.css","css/trimestre/trimestre.css","css/ajustes/boton.css","css/ajustes/panel.css","css/ajustes/panelvarios.css","css/ajustes/paneloscuro.css","css/ajustes/paneloscurovarios.css","css/ajustes/oscuro.css"],"asignatura":["css/botones/oscuro.css","css/notificador/emergente.css","css/notificador/notificacion.css","css/notificador/progreso.css","css/notificador.css","css/notificador/insignias.css","css/archivos/archivos.css","css/archivos/archivosvarios.css","css/inicio/base.css","css/inicio/base2.css","css/inicio/flexion.css","css/inicio/oscuro.css","css/inicio/oscurovarios.css","css/inicio/claro.css","css/inicio/clarovarios.css","css/portada/portadaemoji.css","css/asignatura/base.css","css/asignatura/tarjetas.css","css/asignatura/tabla.css","css/asignatura/interruptor.css","css/asignatura/archivo.css","css/asignatura/archivoenlaces.css","css/asignatura/conmutador.css","css/asignatura/oscuro.css","css/asignatura/oscurovarios.css","css/asignatura/oscurovarios2.css","css/asignatura/claro.css","css/ventanaemergente/ventanaemergente.css","css/ajustes/boton.css","css/ajustes/panel.css","css/ajustes/panelvarios.css","css/ajustes/paneloscuro.css","css/ajustes/paneloscurovarios.css","css/ajustes/oscuro.css"],"apuntes":["css/botones/oscuro.css","css/notificador/emergente.css","css/notificador/notificacion.css","css/notificador/progreso.css","css/notificador.css","css/notificador/insignias.css","css/archivos/archivos.css","css/archivos/archivosvarios.css","css/inicio/base.css","css/inicio/base2.css","css/inicio/flexion.css","css/inicio/oscuro.css","css/inicio/oscurovarios.css","css/inicio/claro.css","css/inicio/clarovarios.css","css/asignatura/base.css","css/asignatura/tarjetas.css","css/asignatura/tabla.css","css/asignatura/interruptor.css","css/asignatura/archivo.css","css/asignatura/archivoenlaces.css","css/asignatura/conmutador.css","css/asignatura/oscuro.css","css/asignatura/oscurovarios.css","css/asignatura/oscurovarios2.css","css/apuntes/base.css","css/apuntes/valores.css","css/apuntes/archivos.css","css/apuntes/permisos.css","css/apuntes/oscuro.css","css/apuntes/aislamiento.css","css/ventanaemergente/ventanaemergente.css","css/ajustes/boton.css","css/ajustes/panel.css","css/ajustes/panelvarios.css","css/ajustes/paneloscuro.css","css/ajustes/paneloscurovarios.css","css/ajustes/oscuro.css"]
  }
  ;
  const FONT_AWESOME_CSS = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
  // PapaParse es una dependencia compartida de los renderizadores/servicios CSV.
  // Se carga una sola vez y antes de cualquier vista que la necesite.
  const PAPAPARSE_URL = "js/proveedorprocesadorcsv.js";
  const SCRIPTS =  {
    login: ["js/modales/popupreutilizable.js","js/vistas/iniciosesion.js"],
    inicio: ["js/modales/popupreutilizable.js","js/servicios/ramaapi.js","js/componentes/ajustes.js","js/componentes/barranavegacion/modoedicion.js","js/componentes/emojis.js","js/servicios/rama.js","js/vistas/utilidadesselectorrama.js","js/vistas/indicerama.js","js/servicios/informacion.js","js/descargas/notificador.js","js/descargas/notificadorpersistencia.js","js/descargas/recolectordirecciones.js","js/descargas/descarga-github-adapter.js","js/descargas/compresorzip.js","js/descargas/exportadorproyecto.js","js/modales/previsualizador.js","js/visores/administrador/acceso.js","js/modales/gestorarchivosemergente.js","js/renderizadores/archivos.js","js/renderizadores/datos.js"],
    clase: ["js/modales/popupreutilizable.js","js/componentes/ajustes.js","js/componentes/barranavegacion/modoedicion.js","js/servicios/informacion.js","js/servicios/trimestres.js","js/descargas/notificador.js","js/descargas/notificadorpersistencia.js","js/descargas/recolectordirecciones.js","js/descargas/descarga-github-adapter.js","js/descargas/compresorzip.js","js/visores/administrador/acceso.js","js/vistas/clase.js","js/vistas/volveratras.js"],
    asignaturas: ["js/modales/popupreutilizable.js","js/componentes/ajustes.js","js/componentes/barranavegacion/modoedicion.js","js/servicios/informacion.js","js/servicios/trimestres.js","js/descargas/notificador.js","js/descargas/notificadorpersistencia.js","js/descargas/recolectordirecciones.js","js/descargas/descarga-github-adapter.js","js/descargas/compresorzip.js","js/visores/administrador/acceso.js","js/vistas/trimestre.js","js/vistas/volveratras.js"],
    asignatura: ["js/modales/popupreutilizable.js","js/componentes/ajustes.js","js/componentes/barranavegacion/modoedicion.js","js/servicios/informacion.js","js/renderizadores/archivos.js","js/renderizadores/datos.js","js/descargas/notificador.js","js/descargas/notificadorpersistencia.js","js/descargas/recolectordirecciones.js","js/descargas/descarga-github-adapter.js","js/descargas/compresorzip.js","js/visores/administrador/acceso.js","js/modales/previsualizador.js","js/modales/gestorarchivosemergente.js","js/vistas/volveratras.js"],
    apuntes: ["js/modales/popupreutilizable.js","js/componentes/ajustes.js","js/componentes/barranavegacion/modoedicion.js","js/servicios/informacion.js","js/renderizadores/archivos.js","js/renderizadores/apuntespracticasejerciciostareas.js","js/descargas/notificador.js","js/descargas/notificadorpersistencia.js","js/descargas/recolectordirecciones.js","js/descargas/descarga-github-adapter.js","js/descargas/compresorzip.js","js/visores/administrador/acceso.js","js/modales/previsualizador.js","js/modales/gestorarchivosemergente.js","js/vistas/volveratras.js"]
  }
  ;
  let actual = null, contexto =  {
  }
  , cargadosJS = new Set(), cargadosCSS = new Set(), promesasJS = new Map(), promesasCSS = new Map();
  // Las transiciones se serializan para que al pulsar Atrás no queden cargas CSS
  // antiguas terminando después de la nueva vista y sobrescribiendo su diseño.
  let colaTransiciones = Promise.resolve();
  const root = () => document.getElementById("app-root");
  function cargarCSS(path) {
    if (cargadosCSS.has(path)) return Promise.resolve();
    if (promesasCSS.has(path)) return promesasCSS.get(path);
    const promesa = new Promise((resolve, reject) =>  {
      const existente = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).find(link => link.getAttribute("href") === path);
      if (existente) {
        const finalizar = () => {
          cargadosCSS.add(path);
          promesasCSS.delete(path);
          resolve();
        };
        if (existente.sheet) {
          finalizar();
        } else {
          existente.addEventListener("load", finalizar, { once: true });
          existente.addEventListener("error", finalizar, { once: true });
        }
        return;
      }
      const l = document.createElement("link");
      l.rel="stylesheet";
      l.href=path;
      l.dataset.appDynamicCss="1";
      l.onload=()=> {
        cargadosCSS.add(path);
        promesasCSS.delete(path);
        resolve();
      }
      ;
      l.onerror=()=> {
        promesasCSS.delete(path);
        reject(new Error("CSS no encontrado: "+path));
      }
      ;
      document.head.appendChild(l);
    }
  );
    promesasCSS.set(path,promesa);
    return promesa;
  }
  function descargarCSSDe(pathSet) {
    const keep = new Set(pathSet);
    // La navbar es infraestructura global de la SPA: su CSS no se descarga
    // al cambiar de vista.
    const NAVBAR_PREFIX = "css/barranavegacion/";
    document.head.querySelectorAll('link[data-app-dynamic-css="1"]').forEach(l => {
      const href = l.getAttribute("href") || "";
      if (href.startsWith(NAVBAR_PREFIX)) return;
      if (!keep.has(href)) {
        l.remove();
        cargadosCSS.delete(href);
      }
    });
  }
  function cargarJS(path) {
    if (cargadosJS.has(path)) return Promise.resolve();
    if (promesasJS.has(path)) return promesasJS.get(path);
    const existente = document.body.querySelector(`script[data-app-dynamic-script="1"][src="${path}"]`);
    if (existente) {
      const promesaExistente = new Promise((resolve,reject)=> {
        if (existente.dataset.loaded === "1") {
          cargadosJS.add(path);
          resolve();
          return;
        }
        existente.addEventListener("load",()=> {
          cargadosJS.add(path);
          resolve();
        }
        , { once:true }
  );
        existente.addEventListener("error",()=>reject(new Error("JS no encontrado: "+path)), { once:true }
  );
      }
  );
      promesasJS.set(path,promesaExistente);
      return promesaExistente;
    }
    const promesa = new Promise((resolve,reject)=> {
      const s=document.createElement("script");
      s.src=path;
      s.dataset.appDynamicScript="1";
      s.onload=()=> {
        s.dataset.loaded="1";
        cargadosJS.add(path);
        promesasJS.delete(path);
        resolve();
      }
      ;
      s.onerror=()=> {
        promesasJS.delete(path);
        reject(new Error("JS no encontrado: "+path));
      }
      ;
      document.body.appendChild(s);
    }
  );
    promesasJS.set(path,promesa);
    return promesa;
  }
  const cacheHTML = new Map();
  async function obtenerHTML(path) {
    if (cacheHTML.has(path)) return cacheHTML.get(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
    const texto = await res.text();
    cacheHTML.set(path, texto);
    return texto;
  }
  function extraerBody(html) {
    const m = String(html).match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : String(html);
  }
  function insertarHTML(host, html) {
    // setHTMLUnsafe preserva y activa Declarative Shadow DOM al insertar HTML dinámico.
    if (typeof host.setHTMLUnsafe === "function") {
      host.setHTMLUnsafe(html);
      return;
    }
    host.innerHTML = html;
  }
  async function asegurarPapaParse() {
    if (window.Papa && typeof window.Papa.parse === "function") return;
    const existente = document.querySelector('script[data-papaparse="1"]');
    if (existente) {
      await new Promise((resolve, reject) =>  {
        if (window.Papa && typeof window.Papa.parse === "function") return resolve();
        existente.addEventListener("load", resolve,  { once: true }
  );
        existente.addEventListener("error", () => reject(new Error("No se pudo cargar PapaParse")),  { once: true }
  );
      }
  );
      return;
    }
    await new Promise((resolve, reject) =>  {
      const script = document.createElement("script");
      script.src = PAPAPARSE_URL;
      script.dataset.papaparse = "1";
      script.onload = () =>  {
        if (window.Papa && typeof window.Papa.parse === "function") resolve();
        else reject(new Error("PapaParse se cargó pero no expuso window.Papa"));
      }
      ;
      script.onerror = () => reject(new Error("No se pudo cargar PapaParse"));
      document.head.appendChild(script);
    }
  );
  }
  async function esperarEstilosEstables(vista) {
    if (!vista) return;
    vista.classList.add("vista-estabilizando");

    const esperarFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

    const recogerHojasEstilo = (root, resultado = []) => {
      if (!root) return resultado;
      if (root.querySelectorAll) {
        root.querySelectorAll('link[rel="stylesheet"]').forEach(link => resultado.push(link));
        root.querySelectorAll("*").forEach(node => {
          if (node.shadowRoot) recogerHojasEstilo(node.shadowRoot, resultado);
        });
      }
      return resultado;
    };

    const esperarHoja = (link) => {
      if (!link || link.sheet) return Promise.resolve();
      return new Promise(resolve => {
        let terminado = false;
        const finalizar = () => {
          if (terminado) return;
          terminado = true;
          resolve();
        };
        link.addEventListener("load", finalizar, { once: true });
        link.addEventListener("error", finalizar, { once: true });
        // Una hoja ya insertada puede no disparar load si la red terminó entre medias.
        requestAnimationFrame(() => { if (link.sheet) finalizar(); });
      });
    };

    try { if (document.fonts?.ready) await document.fonts.ready; } catch (_) { }

    // Espera también las hojas DSD/internas de los componentes. Estas hojas pueden
    // terminar después de insertar el HTML y son capaces de modificar las métricas.
    const hojas = recogerHojasEstilo(vista, []);
    await Promise.all(hojas.map(esperarHoja));

    const imagenes = Array.from(vista.querySelectorAll("img"));
    await Promise.all(imagenes.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    })));

    await esperarFrame();

    vista.classList.remove("vista-estabilizando");
    vista.classList.add("vista-estabilizada");
  }

  function escaparSelectorCSS(valor) {
    const texto = String(valor ?? "");
    try {
      if (globalThis.CSS && typeof globalThis.CSS.escape === "function") return globalThis.CSS.escape(texto);
    } catch (_) {}
    return texto.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
  }

  function crearCargadorVista(host, nombre) {
    if (!host || nombre === "login") return null;

    // El cargador de transición vive FUERA de #app-root. Antes se insertaba
    // dentro del root y el posterior insertarHTML() lo eliminaba antes de que
    // el usuario pudiera verlo. Al ser hermano del root permanece visible
    // durante toda la secuencia: rama -> trimestre -> asignatura -> apuntes.
    const selector = `app-cargando[data-app-loading="${escaparSelectorCSS(nombre)}"]`;
    let cargador = document.body?.querySelector(selector) || null;
    if (!cargador) cargador = window.ComponenteCargando?.crear(nombre, host) || null;
    if (!cargador) return null;

    cargador.classList.add("app-vista-cargando-transicion");
    const textos = {
      inicio: "Cargando...",
      clase: "Cargando rama...",
      asignaturas: "Cargando trimestre...",
      asignatura: "Cargando asignatura...",
      apuntes: "Cargando información del tema..."
    };
    const texto = cargador.querySelector?.(".app-vista-cargando-text");
    if (texto) textContentSafe(texto, textos[nombre] || "Cargando...");

    if (!cargador.parentElement) document.body.appendChild(cargador);
    cargador.hidden = false;
    cargador.removeAttribute("hidden");
    return cargador;
  }

  function textContentSafe(el, text) {
    if (el) el.textContent = String(text || "Cargando...");
  }

  const ESPERA_MINIMA_CARGANDO = 320;
  const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function montar(nombre) {
    const path=COMPONENTS[nombre];
    if(!path) throw new Error("Componente no definido: "+nombre);

    const r = root();
    const navHostInicial = document.getElementById("app-navbar-cargando");
    const inicioCarga = performance.now();

    let cargadorVista = null;
    if (r && nombre !== "login") {
      cargadorVista = crearCargadorVista(r, nombre);
      // Mientras se prepara la vista, el contenido final queda oculto.
      // El cargador está en <body>, así que insertarHTML no lo destruye.
      r.hidden = true;
      r.setAttribute("hidden", "");
      if (navHostInicial) navHostInicial.hidden = false;
      // Quitar app-preboot AQUÍ: el cargador ya está en el DOM con su fondo opaco,
      // así el preloader desaparece y el cargador toma su lugar en el mismo frame.
      document.documentElement.classList.remove("auth-cargando", "app-preboot");
    } else if (actual === null) {
      if (r) r.hidden = true;
      if (navHostInicial) navHostInicial.hidden = true;
      document.documentElement.classList.remove("auth-cargando", "app-preboot");
    } else {
      document.documentElement.classList.remove("auth-cargando", "app-preboot");
    }


    try {
      const cssSet=[...CSS.core];
      if(nombre!=="login") cssSet.push(...(CSS.navbar||[]));
      cssSet.push(FONT_AWESOME_CSS);
      cssSet.push(...(CSS[nombre]||[]));
      // Esta hoja es la última capa de geometría de la navbar. Se carga después
      // de los CSS heredados de cada vista para que ninguna regla antigua pueda
      // volver a convertir la barra en varias filas.
      const unique=[...new Set(cssSet)];
      await Promise.all(unique.map(cargarCSS));
      descargarCSSDe(unique);
      const html=extraerBody(await obtenerHTML(path));
      if(!r) return;

      document.body.classList.remove("inicio-primer-paint");

      insertarHTML(r, html);
      window.scrollTo({ top: 0, behavior: "instant" });
      document.documentElement.dataset.vista = nombre;
      document.body.dataset.vista = nombre;

      // No mostramos la vista todavía: el cargador de transición debe seguir
      // visible hasta que terminen HTML + dependencias + inicializador + datos.
      if (navHostInicial) {
        navHostInicial.hidden = (nombre === "login");
        if (nombre !== "login") navHostInicial.removeAttribute("hidden");
      }

      if (nombre === "inicio") {
        const selectInicial = r.querySelector("#selector-rama");
        if (selectInicial) {
          selectInicial.innerHTML = '<option selected value="">SELECCIONAR RAMA</option>';
          selectInicial.removeAttribute("aria-busy");
        }
      }

      const vistaMontada = r.querySelector(`[data-app-view="${nombre}"]`);
      if (vistaMontada) {
        // Mantener la vista oculta hasta el final evita que aparezca vacía o
        // parcialmente renderizada entre el cambio de contexto y los datos.
        vistaMontada.hidden = true;
        vistaMontada.setAttribute("hidden", "");
      }

      // Las vistas que leen CSV necesitan PapaParse antes de ejecutar sus scripts.
      if (nombre !== "login") {
        try { await asegurarPapaParse(); }
        catch (e) { void 0; }
      }
      // Carga de scripts en orden secuencial estricto para respetar dependencias
      for (const s of SCRIPTS[nombre] || []) {
        try { await cargarJS(s); }
        catch (e) { void 0; }
      }

      // Reinicializadores existentes.
      if(nombre==="login" && typeof window.inicializarVistaLogin==="function") await window.inicializarVistaLogin();
      if(nombre==="inicio" && typeof window.inicializarVistaInicio==="function") await window.inicializarVistaInicio();
      if(nombre==="clase" && typeof window.inicializarVistaClase==="function") await window.inicializarVistaClase();
      if(nombre==="asignaturas" && typeof window.inicializarVistaTrimestre==="function") await window.inicializarVistaTrimestre();
      if(nombre==="apuntes") {
        try {
          if (typeof window.inicializarVistaApuntes === "function") {
            await window.inicializarVistaApuntes();
          } else if (window.__detalleCargaPromise) {
            await window.__detalleCargaPromise;
          } else if (typeof window.__pintarDetalle==="function") {
            await window.__pintarDetalle();
          }
        } catch(e) { void 0; }
      }
      if(nombre==="asignatura") {
        if (typeof window.inicializarMostrarDatos === "function") {
          try { window.inicializarMostrarDatos(); }
          catch(e) { void 0; }
        }
        if (typeof window.__pintarTodo === "function") {
          try { await window.__pintarTodo(); }
          catch(e) { void 0; }
        }
      }
      if (nombre !== "login") {
        if (typeof window.ComponenteNavbar?.inicializar === "function") {
          try { window.ComponenteNavbar.inicializar(); }
          catch (_) { } }
        if (typeof window.Ajustes?.asegurarBotonAjustes === "function") {
          try { window.Ajustes.asegurarBotonAjustes(); }
          catch (_) { } }
        if (typeof window.__actualizarIconosTema === "function") {
          try { window.__actualizarIconosTema(); }
          catch (_) { } }
      }
      if (vistaMontada) {
        if (nombre !== "inicio" && nombre !== "login") {
          await Promise.race([
            esperarEstilosEstables(vistaMontada),
            esperar(1000)
          ]);
        }
        vistaMontada.hidden = false;
        vistaMontada.removeAttribute("hidden");
        vistaMontada.classList.remove("vista-estabilizando");
        vistaMontada.classList.add("vista-estabilizada");
      }
    } finally {
      const transcurrido = performance.now() - inicioCarga;
      if (transcurrido < ESPERA_MINIMA_CARGANDO) {
        await esperar(ESPERA_MINIMA_CARGANDO - transcurrido);
      }
      if (cargadorVista) {
        window.ComponenteCargando?.ocultar(cargadorVista);
        cargadorVista.removeAttribute("data-app-loading");
        cargadorVista.remove();
      }
      if (r) {
        r.hidden = false;
        r.removeAttribute("hidden");
      }
      const navHost = document.getElementById("app-navbar-cargando");
      if (navHost) {
        navHost.hidden = nombre === "login";
        if (nombre !== "login") navHost.removeAttribute("hidden");
      }
    }
  }
  async function mostrarInterno(nombre, datos= {
  }
  , opciones= {
  }
  ) {
    nombre=String(nombre||"").toLowerCase();
    if(!V.has(nombre)) nombre="inicio";
    const datosNuevos = datos ||  {
    }
    ;
    const contextoSiguiente =  { ...contexto }
    ;
    Object.entries(datosNuevos).forEach(([k, v]) =>  {
      if (v === undefined || v === null || String(v) === "") delete contextoSiguiente[k];
      else contextoSiguiente[k] = v;
    }
  );
    if(actual===nombre && !opciones.forzar) {
      const clavesRecargables = ["rama", "trimestre", "asignatura", "seccion", "nombre"];
      const contextoCambio = clavesRecargables.some((k) => String(contexto[k] ?? "") !== String(contextoSiguiente[k] ?? ""));
      if (!contextoCambio) {
        contexto = contextoSiguiente;
        return;
      }
      // La vista es la misma pero ha cambiado su contexto (p. ej. otra rama,
      // otro trimestre o otra asignatura). Hay que desmontarla y volver a
      // montarla para que el cargando represente la transición real.
      opciones = { ...opciones, forzar: true };
    }
    contexto = contextoSiguiente;
    if(window.Estado) try {
      window.Estado.establecerContexto?.(contextoSiguiente);
      Object.entries(datosNuevos).forEach(([k,v])=>window.Estado.guardar?.(k,v));
    } catch(_) {
    }
    await montar(nombre);
    actual=nombre;
    document.body.dataset.vista=nombre;
    document.documentElement.dataset.vista=nombre;
    window.__APP_VISTA = nombre;
    try {
      if (nombre !== "login") {
        localStorage.setItem("app_ultima_vista", nombre);
        localStorage.setItem("app_ultimo_contexto", JSON.stringify(contexto));
      }
    } catch (_) {
    }
    window.dispatchEvent(new CustomEvent("app-vista-cambiada", {
      detail: {
        vista:nombre,contexto: { ...contexto }
      }
    }
    ));
  }
  function mostrar(nombre, datos= {
  }
  , opciones= {
  }
  ) {
    const ejecutar = () => {
      // Para cambios de vista que ya están dentro de la SPA, mostrar el cargador
      // antes de comenzar HTML/JS/CSS/datos. Evita pantallas congeladas.
      try {
        const r = root();
        const vista = String(nombre || '').toLowerCase();
        if (r && vista !== 'login' && vista !== 'inicio') {
          crearCargadorVista(r, vista);
        }
      } catch (_) {}
      return mostrarInterno(nombre, datos, opciones);
    };
    // Cada cambio de vista espera a que termine el anterior. Así nunca quedan
    // dos juegos de CSS/HTML desmontándose y montándose a la vez.
    const siguiente = colaTransiciones.then(ejecutar, ejecutar);
    colaTransiciones = siguiente.catch(() =>  {
    }
  );
    return siguiente;
  }
  function navegar(ruta,datos= {
  }
  ) {
    const r=String(ruta||"");
    const ctx = datos ||  {
    }
    ;
    let n = "inicio";
    // La aplicación usa siempre la URL /: el destino se determina por el
    // contexto de navegación, no por una ruta HTML visible en el navegador.
    if (/apuntes\.html|\/apuntes\b/i.test(r)) n="apuntes";
    else if (/asignatura\.html/i.test(r)) n="asignatura";
    else if (/asignaturas\.html/i.test(r)) n="asignaturas";
    else if (/clase\.html/i.test(r)) n="clase";
    else if (/iniciar-sesion\.html|login/i.test(r)) n="login";
    else if (ctx.asignatura) n="asignatura";
    else if (ctx.trimestre) n="asignaturas";
    else if (ctx.rama) n="clase";
    else n="inicio";
    return mostrar(n,ctx);
  }
  const volverAtras = () =>  {
    // El flujo es jerárquico, no depende del historial del navegador.
    // Así Atrás siempre retrocede exactamente un paso y nunca salta a Inicio.
    const ctx =  { ...contexto }
    ;
    if (actual === "apuntes") {
      delete ctx.seccion;
      delete ctx.nombre;
      return mostrar("asignatura", ctx,  { reemplazar:true, forzar:true });
    }
    if (actual === "asignatura") {
      delete ctx.asignatura;
      return mostrar("asignaturas", ctx,  { reemplazar:true, forzar:true }
  );
    }
    if (actual === "asignaturas") {
      delete ctx.trimestre;
      delete ctx.asignatura;
      return mostrar("clase", ctx,  { reemplazar:true, forzar:true }
  );
    }
    if (actual === "clase" || !ctx.rama) {
      delete ctx.rama;
      delete ctx.trimestre;
      delete ctx.asignatura;
      try {
        window.RamaActual?.limpiar?.();
        window.Estado?.guardar?.("rama", "");
        localStorage.removeItem("rama_actual");
        localStorage.removeItem("last_grado");
        localStorage.removeItem("rama");
        localStorage.removeItem("app_rama");
        sessionStorage.removeItem("app_rama");
        sessionStorage.setItem("forzar_selector_rama", "1");
        localStorage.setItem("app_ultima_vista", "inicio");
        localStorage.setItem("app_ultimo_contexto", "{}");
      } catch (_) {
      }
      return mostrar("inicio", ctx,  { reemplazar:true, forzar:true }
  );
    }
    try {
      window.RamaActual?.limpiar?.();
      window.Estado?.guardar?.("rama", "");
      localStorage.removeItem("rama_actual");
      localStorage.removeItem("last_grado");
      localStorage.removeItem("rama");
      localStorage.removeItem("app_rama");
      sessionStorage.removeItem("app_rama");
      sessionStorage.setItem("forzar_selector_rama", "1");
      localStorage.setItem("app_ultima_vista", "inicio");
      localStorage.setItem("app_ultimo_contexto", "{}");
    } catch (_) {
    }
    return mostrar("inicio",  {
    }
    ,  { reemplazar:true, forzar:true }
  );
  }
  ;
  window.AppViews= {
    mostrar,
    navegar,
    irInicio:()=> {
      try {
        sessionStorage.setItem("forzar_selector_rama", "1");
        window.RamaActual?.limpiar?.();
        window.Estado?.guardar?.("rama", "");
        localStorage.removeItem("rama_actual");
        localStorage.removeItem("last_grado");
        localStorage.removeItem("rama");
        localStorage.removeItem("app_rama");
        sessionStorage.removeItem("app_rama");
        localStorage.setItem("app_ultima_vista", "inicio");
        localStorage.setItem("app_ultimo_contexto", "{}");
      } catch (_) {
      }
      return mostrar("inicio",  {
      }
      ,  { reemplazar:true, forzar:true }
  );
    }
    ,
    atras:volverAtras,
    obtener:()=>actual,
    contexto:()=>( { ...contexto }
    )
  }
  ;
  // La aplicación es siempre /; cualquier query usada para recuperar contexto
  // se guarda y se elimina de la barra sin convertirla en una ruta visible.
  if (window.location.pathname !== "/" && window.history?.replaceState) {
    try { window.history.replaceState( { }
      , document.title, "/");
    } catch (_) {
    }
  }
  window.__mostrarVista=mostrar;
  window.addEventListener("app-navegar",e=> { const d=e.detail|| { }
    ;
    navegar(d.ruta||d.vista,d.contexto|| {
    }
  );
  }
  );
  // La ruta inicial la decide autenticacion.js cuando Supabase ya ha resuelto la sesión.
  // No hacemos un segundo arranque aquí: hacerlo antes provocaba que una sesión
  // ya existente entrase primero en el selector y luego se corrigiera tarde.
  window.addEventListener("DOMContentLoaded", ()=> {
    if(window.Estado && typeof window.Estado.navegar==="function") { window.Estado.navegar=(r,d= { }
      )=>navegar(r,d);
    }
  }
  , { once:true }
  );

  // Precarga silenciosa en segundo plano para que la entrada sea instantánea ("al momento")
  function precargarVistasClave() {
    try {
      obtenerHTML(COMPONENTS.login).catch(() => {});
      obtenerHTML(COMPONENTS.inicio).catch(() => {});
      obtenerHTML(COMPONENTS.clase).catch(() => {});
      (SCRIPTS.inicio || []).forEach(s => fetch(s).catch(() => {}));
    } catch (_) {}
  }
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(precargarVistasClave);
  } else {
    setTimeout(precargarVistasClave, 150);
  }
})();
