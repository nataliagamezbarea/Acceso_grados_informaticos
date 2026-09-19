(() => {
  function escaparSelectorCSS(valor) {
    const texto = String(valor ?? "");
    try {
      if (globalThis.CSS && typeof globalThis.CSS.escape === "function") return globalThis.CSS.escape(texto);
    } catch (_) {}
    return texto.replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
  }
  const TEMPLATE_IDS = ["template-cargando-vista", "template-cargando-general"];

  function crear(nombre, host) {
    if (!host || !nombre) return null;
    const existente = host.querySelector(`app-cargando[data-app-loading="${escaparSelectorCSS(nombre)}"]`);
    if (existente) return existente;

    const inicial = host.querySelector("app-cargando[data-app-loading=\"inicial\"]");
    if (inicial) {
      inicial.dataset.appLoading = nombre;
      inicial.classList.remove("app-cargando-inicial");
      return inicial;
    }

    let template = null;
    for (const id of TEMPLATE_IDS) {
      template = document.getElementById(id);
      if (template) break;
    }
    if (!template) {
      template = document.createElement("template");
      template.innerHTML = '<app-cargando class="app-vista-cargando" aria-live="polite" role="status"><span class="app-vista-cargando-text">Cargando...</span></app-cargando>';
    }

    const contenido = template.content.cloneNode(true);
    const cargador = contenido.firstElementChild;
    if (!cargador) return null;

    cargador.dataset.appLoading = nombre;
    return cargador;
  }

  function mostrar(host, nombre) {
    const cargador = crear(nombre, host);
    if (!cargador) return null;
    if (!cargador.parentElement) host.appendChild(cargador);
    cargador.hidden = false;
    return cargador;
  }

  function ocultar(cargador) {
    if (!cargador) return;
    cargador.hidden = true;
  }

  window.ComponenteCargando = { crear, mostrar, ocultar };
})();
