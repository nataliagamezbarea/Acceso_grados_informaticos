window.PermisosCrypto = (() => {
  const claveRam = "g1n_" + Math.random().toString(36).substring(2, 10);

  const cifrar = (txt) => {
    if (!txt) return "";
    let res = "";
    for (let i = 0; i < txt.length; i++) {
      res += String.fromCharCode(txt.charCodeAt(i) ^ claveRam.charCodeAt(i % claveRam.length));
    }
    return btoa(res);
  };

  const descifrar = (txt, key) => {
    if (!txt || !key) return "";
    try {
      const raw = atob(txt);
      let desc = "";
      for (let i = 0; i < raw.length; i++) {
        desc += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return desc;
    } catch (e) {
      return "";
    }
  };

  const decodificarBase64 = (str) => {
    if (!str) return "";
    try {
      const limpia = str.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
      const binario = atob(limpia);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
    } catch (e) {
      return "";
    }
  };

  const enviarTokenAlServiceWorker = (token) => {
    if (!token || typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const enviar = (sw) => {
      if (sw) {
        try { sw.postMessage({ type: "SET_TOKEN", token }); } catch (e) {}
      }
    };
    enviar(navigator.serviceWorker.controller);
    try {
      navigator.serviceWorker.ready.then((reg) => enviar(reg.active)).catch(() => {});
    } catch (e) {}
  };

  const asegurarConfigSegura = (tokenEncontrado, repoEncontrado) => {
    if (!window.GITHUB_CONFIG) return;

    const tokenPrevio = window.GITHUB_CONFIG._t && window.GITHUB_CONFIG._k
      ? descifrar(window.GITHUB_CONFIG._t, window.GITHUB_CONFIG._k)
      : (window.GITHUB_CONFIG._rawToken || window.GITHUB_CONFIG.token || "");
    const tokenDefinitivo = tokenEncontrado || tokenPrevio;

    window.GITHUB_CONFIG._t = cifrar(tokenDefinitivo);
    window.GITHUB_CONFIG._k = claveRam;
    delete window.GITHUB_CONFIG._rawToken;

    try {
      Object.defineProperty(window.GITHUB_CONFIG, "token", {
        value: "",
        writable: false,
        enumerable: true,
        configurable: true,
      });
    } catch (e) {
      window.GITHUB_CONFIG.token = "";
    }

    window.GITHUB_CONFIG.obtenerTokenSeguro = function () {
      return descifrar(this._t, this._k);
    };

    if (tokenDefinitivo) enviarTokenAlServiceWorker(tokenDefinitivo);
    window.GITHUB_CONFIG.repo = repoEncontrado || window.GITHUB_CONFIG.repo || "";
  };

  return {
    cifrar,
    descifrar,
    decodificarBase64,
    enviarTokenAlServiceWorker,
    asegurarConfigSegura,
  };
})();
