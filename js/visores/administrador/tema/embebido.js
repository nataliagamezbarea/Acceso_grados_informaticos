/* Tema crítico del iframe: llega desde la SPA padre para eliminar el flash blanco. */
    (function(){
      try {
        var tema = new URLSearchParams(window.location.search).get('_tema');
        if (tema === 'dark' || tema === 'light') {
          var h = document.documentElement;
          h.classList.toggle('modo-oscuro', tema === 'dark');
          h.dataset.theme = tema;
        }
      } catch (_) {}
    }());
