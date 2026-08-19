window.Estado = (() => {
  const prefijo = "app_";

  const obtener = (clave, valorPorDefecto = "") => {
    const params = new URLSearchParams(window.location.search);
    const enUrl = params.get(clave);
    if (enUrl !== null && enUrl !== "") {
      sessionStorage.setItem(prefijo + clave, enUrl);
      return enUrl;
    }
    const guardado = sessionStorage.getItem(prefijo + clave);
    return guardado !== null && guardado !== "" ? guardado : valorPorDefecto;
  };

  const guardar = (clave, valor) => {
    if (valor !== undefined && valor !== null) {
      sessionStorage.setItem(prefijo + clave, valor);
    }
  };

  const limpiarUrlVisible = () => {
    const params = new URLSearchParams(window.location.search);
    let hayParams = false;
    for (const [k, v] of params.entries()) {
      sessionStorage.setItem(prefijo + k, v);
      hayParams = true;
    }
    if (hayParams && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  limpiarUrlVisible();

  return {
    obtener,
    guardar,
    limpiarUrlVisible,
  };
})();
