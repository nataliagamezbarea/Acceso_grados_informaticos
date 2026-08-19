window.RamaActual = (() => {
  const CLAVE_LOCAL = "rama_actual";

  const obtener = () => {
    const url = new URLSearchParams(window.location.search).get("rama");
    if (url && url.trim()) {
      guardar(url.trim());
      return url.trim();
    }
    const enEstado = window.Estado ? window.Estado.obtener("rama") : "";
    if (enEstado && enEstado.trim()) return enEstado.trim();
    return sessionStorage.getItem(CLAVE_LOCAL) || "";
  };

  const guardar = (rama) => {
    if (rama) {
      sessionStorage.setItem(CLAVE_LOCAL, rama);
      if (window.Estado) window.Estado.guardar("rama", rama);
    } else {
      sessionStorage.removeItem(CLAVE_LOCAL);
      if (window.Estado) window.Estado.guardar("rama", "");
    }
  };

  const obtenerPesoOrdinal = (nombre) => {
    const s = String(nombre || "").toLowerCase();
    let pesoBase = 500;

    const esMedio = s.includes("medio") || s.includes("smr");
    const esSuperior = s.includes("superior") || s.includes("daw") || s.includes("dam");

    const esPrimero = s.includes("primer") || s.includes("1º") || s.includes("1_") || s.startsWith("1");
    const esSegundo = s.includes("segundo") || s.includes("2º") || s.includes("2_") || s.startsWith("2");

    if (esMedio) {
      if (esPrimero) pesoBase = 10;
      else if (esSegundo) pesoBase = 20;
      else pesoBase = 15;
    } else if (esSuperior) {
      if (s.includes("daw")) {
        if (esPrimero) pesoBase = 100;
        else if (esSegundo) pesoBase = 110;
        else pesoBase = 105;
      } else if (s.includes("dam")) {
        if (esPrimero) pesoBase = 200;
        else if (esSegundo) pesoBase = 210;
        else pesoBase = 205;
      } else {
        if (esPrimero) pesoBase = 300;
        else if (esSegundo) pesoBase = 310;
        else pesoBase = 305;
      }
    }

    return pesoBase;
  };

  const ordenarRamas = (lista) => {
    return (lista || []).slice().sort((a, b) => {
      const pesoA = obtenerPesoOrdinal(a);
      const pesoB = obtenerPesoOrdinal(b);
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.localeCompare(b, "es", { sensitivity: "base" });
    });
  };

  const obtenerRepoConfigurado = () => {
    const config = window.GITHUB_CONFIG || {};
    let r = config.repo || "";
    if (!r) {
      try {
        r = localStorage.getItem("gh_repo") || sessionStorage.getItem("gh_repo") || "";
      } catch (e) {}
    }
    return r.trim();
  };

  const listarRamas = async () => {
    let ramas = [];
    const CLAVE_CACHE_RAMAS = "cache_ramas_lista";

    try {
      if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
        try { await window.Permisos.asegurarSesion(); } catch (e) {}
      }

      const config = window.GITHUB_CONFIG || {};
      let token = typeof config.obtenerTokenSeguro === "function" ? config.token || "" : (config.token || "");
      if (!token) {
        try {
          token = localStorage.getItem("cache_gh_token") || sessionStorage.getItem("cache_gh_token") || "";
        } catch (e) {}
      }

      const targetRepo = obtenerRepoConfigurado();
      if (!targetRepo) return ordenarRamas([]);

      const headers = { Accept: "application/vnd.github+json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`https://api.github.com/repos/${targetRepo}/branches?per_page=100`, {
          headers,
          redirect: "follow"
        });
        if (res.ok) {
          const datos = await res.json();
          if (Array.isArray(datos) && datos.length > 0) {
            const nombres = datos.map((b) => b.name).filter((n) => n && n.toLowerCase() !== "master");
            if (nombres.length > 0) {
              ramas = nombres;
            }
          }
        }
      } catch (eRepo) {}

    } catch (e) {}

    if (!ramas.length) {
      try {
        if (window.Permisos && typeof window.Permisos.listarRamasStorage === "function") {
          const datos = await window.Permisos.listarRamasStorage();
          if (datos && datos.length) ramas = datos;
        }
      } catch (e) {}
    }

    if (!ramas.length) {
      const deCache = obtenerRamasCache();
      if (deCache && deCache.length > 0) {
        ramas = deCache;
      }
    }

    const filtradas = (ramas || []).filter((r) => r && String(r).trim().toLowerCase() !== "master");

    if (filtradas.length > 0) {
      try {
        localStorage.setItem(CLAVE_CACHE_RAMAS, JSON.stringify(filtradas));
      } catch (e) {}
    }

    return ordenarRamas(filtradas);
  };

  const obtenerRamasCache = () => {
    try {
      const cache = localStorage.getItem("cache_ramas_lista") || sessionStorage.getItem("cache_ramas_lista");
      if (cache) {
        const parseado = JSON.parse(cache);
        if (Array.isArray(parseado) && parseado.length > 0) return ordenarRamas(parseado);
      }
    } catch (e) {}
    return [];
  };

  const renderizarOpciones = (select, listaRamas) => {
    if (!select) return;

    let placeholder = select.querySelector('option[value=""]');
    if (!placeholder) {
      placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "SELECCIONAR";
      placeholder.disabled = true;
      select.prepend(placeholder);
    }

    if (!listaRamas || !listaRamas.length) {
      let optCargando = select.querySelector('option[data-cargando="true"]');
      if (!optCargando && select.children.length <= 1) {
        optCargando = document.createElement("option");
        optCargando.value = "__cargando__";
        optCargando.dataset.cargando = "true";
        optCargando.textContent = "⏳ Cargando clases...";
        optCargando.disabled = true;
        select.appendChild(optCargando);
      }
      return;
    }

    const optCargando = select.querySelector('option[data-cargando="true"]');
    if (optCargando) optCargando.remove();

    const valoresExistentes = new Set(
      Array.from(select.options).map((opt) => opt.value)
    );

    listaRamas.forEach((rama) => {
      if (!rama || String(rama).trim().toLowerCase() === "master") return;
      if (!valoresExistentes.has(rama)) {
        const opcion = document.createElement("option");
        opcion.value = rama;
        opcion.textContent = rama;
        select.appendChild(opcion);
      }
    });

    if (!select.value) {
      select.value = "";
    }
  };

  const poblarSelector = async (select) => {
    if (!select) return;

    const ramasIniciales = obtenerRamasCache();
    renderizarOpciones(select, ramasIniciales);

    (async () => {
      try {
        const ramasRed = await listarRamas();
        if (ramasRed && ramasRed.length > 0) {
          renderizarOpciones(select, ramasRed);

          if (window.InformacionGrado && Array.isArray(ramasRed)) {
            ramasRed.forEach((r) => {
              if (r && String(r).trim().toLowerCase() !== "master") {
                try { window.InformacionGrado.cargar(r).catch(() => {}); } catch (e) {}
              }
            });
          }
        }
      } catch (e) {
        renderizarOpciones(select, [], true);
      }
    })();
  };

  return { obtener, guardar, listarRamas, poblarSelector };
})();