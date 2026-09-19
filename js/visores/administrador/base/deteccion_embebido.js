/* Detección inmediata de modo embebido: si el visor está dentro de un iframe
       (o trae _embed=1 en la query o sessionStorage), la navbar pertenece al documento
       padre (index.html). Se marca visor-embebido inmediatamente antes de cualquier CSS. */
    (function(){
      try {
        var ROOT = window.APP_BASE || "/";
        var path = window.location.pathname || ROOT;
        var search = window.location.search || "";
        var bootSearch = "";
        try { bootSearch = sessionStorage.getItem("visor_boot_search") || ""; } catch (_) {}
        var isEmbed = (search.indexOf("_embed=1") !== -1) ||
                      (bootSearch.indexOf("_embed=1") !== -1) ||
                      (window.parent && window.parent !== window) ||
                      (window.top && window.top !== window);
        if (isEmbed) {
          document.documentElement.classList.add("visor-embebido");
        }
        if (path !== ROOT && window.history && window.history.replaceState) {
          try { sessionStorage.setItem("visor_boot_search", search); } catch (_) {}
          // Solo la ventana principal (no embebida) reescribe su ruta visible a /
          if (!isEmbed) {
            window.history.replaceState(
              Object.assign({}, window.history.state || {}, { visor: true, visorBoot: true }),
              document.title,
              ROOT
            );
          }
        } else if (path === ROOT && !isEmbed) {
          try { sessionStorage.removeItem("visor_boot_search"); } catch (_) {}
        }
      } catch (_) {}
    }());
