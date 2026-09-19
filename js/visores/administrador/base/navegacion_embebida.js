/* El Visor puede vivir dentro de la SPA raíz. Home/Volver deben afectar a la ventana padre. */
    (function(){
      try {
        if (window.top !== window.self) {
          document.addEventListener('click', function(ev){
            const a = ev.target && ev.target.closest ? ev.target.closest('a[href="/"]') : null;
            if (!a) return;
            ev.preventDefault();
            ev.stopPropagation();
            try { window.top.location.href = '/'; } catch (_) { window.location.href = '/'; }
          }, true);
        }
      } catch (_) {}
    })();
