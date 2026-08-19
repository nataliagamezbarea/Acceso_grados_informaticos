// Parseador Twemoji
(() => {
  const CDN_TWEMOJI_JS = "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js";
  let enProceso = false;
  let observer = null;

  const cargarScriptTwemoji = () => {
    return new Promise((resolve) => {
      if (window.twemoji) return resolve(window.twemoji);
      let script = document.getElementById("twemoji-cdn");
      if (!script) {
        script = document.createElement("script");
        script.id = "twemoji-cdn";
        script.src = CDN_TWEMOJI_JS;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve(window.twemoji);
        script.onerror = () => {
          const scriptAlt = document.createElement("script");
          scriptAlt.src = "https://cdn.jsdelivr.net/npm/@twemoji/api@14.0.2/dist/twemoji.min.js";
          scriptAlt.onload = () => resolve(window.twemoji);
          scriptAlt.onerror = () => resolve(null);
          document.head.appendChild(scriptAlt);
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", () => resolve(window.twemoji));
      }
    });
  };

  const parsear = async (elemento) => {
    if (enProceso) return;
    enProceso = true;
    try {
      const tw = await cargarScriptTwemoji();
      if (!tw || typeof tw.parse !== "function") return;
      const el = elemento || document.body;
      if (el) {
        if (observer) observer.disconnect();
        tw.parse(el, {
          folder: "svg",
          ext: ".svg",
          base: "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/",
        });
        if (observer && document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }
      }
    } catch (e) {
    } finally {
      enProceso = false;
    }
  };

  window.ParsearEmojis = parsear;

  const iniciarObservador = () => {
    if (typeof MutationObserver !== "undefined" && document.body) {
      let timeout = null;
      observer = new MutationObserver((mutations) => {
        if (enProceso) return;
        let hayNuevosNodos = false;
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length > 0) {
            for (const n of m.addedNodes) {
              if (n.nodeType === 1 && (n.tagName === "IMG" || n.classList.contains("emoji"))) continue;
              hayNuevosNodos = true;
              break;
            }
          }
          if (hayNuevosNodos) break;
        }
        if (hayNuevosNodos) {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            parsear();
          }, 150);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    parsear();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarObservador);
  } else {
    iniciarObservador();
  }
})();
