(function () {
  function actualizarAlturaBarraVisor() {
    try {
      var barra = document.getElementById('barra-superior');
      var altura = barra ? Math.ceil(barra.getBoundingClientRect().bottom) : 64;
      if (!Number.isFinite(altura) || altura <= 0) altura = 64;
      document.documentElement.style.setProperty('--altura-barra-superior-visor', altura + 'px');
    } catch (_) {
    }
  }
  window.actualizarAlturaBarraVisor = actualizarAlturaBarraVisor;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', actualizarAlturaBarraVisor,  { once: true }
  );
  } else {
    actualizarAlturaBarraVisor();
  }
  window.addEventListener('resize', actualizarAlturaBarraVisor,  { passive: true }
  );
  if (window.ResizeObserver) {
    document.addEventListener('DOMContentLoaded', function () {
      var barra = document.getElementById('barra-superior');
      if (!barra) return;
      try { new ResizeObserver(actualizarAlturaBarraVisor).observe(barra); }
      catch (_) { } }
    ,  { once: true }
  );
  }
}
)();
