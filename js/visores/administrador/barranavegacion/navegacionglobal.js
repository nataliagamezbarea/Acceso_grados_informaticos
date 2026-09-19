(() =>  {
  function volverAlInicio(evento) {
    if (evento) {
      evento.preventDefault();
      evento.stopPropagation();
    }
    // HOME del visor SIEMPRE vuelve al selector de ramas.
    // La URL pública sigue siendo /; el destino se decide por el estado de la app.
    try {
      if (window.RamaActual?.limpiar) window.RamaActual.limpiar();
      if (window.Estado?.guardar) window.Estado.guardar('rama', '');
      localStorage.removeItem('rama_actual');
      localStorage.removeItem('last_grado');
      localStorage.removeItem('rama');
      localStorage.removeItem('app_rama');
      localStorage.removeItem('last_open');
      localStorage.removeItem('visor_recovery_snapshot');
      localStorage.removeItem('last_archivo');
      localStorage.removeItem('last_archivo_rama');
      localStorage.removeItem('visor_pos');
      localStorage.removeItem('visor_rama');
      localStorage.removeItem('visor_todas');
      localStorage.setItem('visor_contexto', JSON.stringify( {
        rama: '',
        todas: false,
        asignatura: '',
        trimestre: '',
        archivo: '',
        directo: false,
        abrirLista: true,
        abierto: false
      }
      ));
      localStorage.setItem('app_ultima_vista', 'inicio');
      localStorage.setItem('app_ultimo_contexto', JSON.stringify( {
        vista: 'inicio',
        rama: '',
        asignatura: '',
        trimestre: '',
        archivo: '',
        abierto: false
      }
      ));
      sessionStorage.setItem('forzar_selector_rama', '1');
    } catch (_) {
    }
    // HOME indica explícitamente que queremos el selector. Una entrada
    // directa a /, en cambio, restaura el último Visor Admin.
    if (window.top && window.top !== window) {
      try { window.top.location.assign((window.APP_BASE || '/')); return; } catch (_) {}
    }
    window.location.assign((window.APP_BASE || '/'));
  }
  function volverDesdeVisor(evento) {
    if (evento) {
      evento.preventDefault();
      evento.stopPropagation();
    }
    const documento = document.getElementById("ov");
    if (documento?.classList.contains("on") && typeof window.closeOv === "function") {
      window.closeOv();
      return;
    }
    const destino = evento?.currentTarget?.dataset?.returnPath || "";
    if (destino && destino.startsWith("/") && !destino.includes("visores/administrador")) {
      if (window.top && window.top !== window) {
        try { window.top.location.assign(destino); return; } catch (_) {}
      }
      window.location.assign(destino);
      return;
    }
    volverAlInicio(evento);
  }
  function registrarNavegacion() {
    const inicio = document.getElementById("btn-inicio");
    const atras = document.getElementById("volver-atras");
    if (inicio) { inicio.onclick = volverAlInicio; }
    if (atras) { atras.onclick = volverDesdeVisor; }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registrarNavegacion,  { once: true }
  );
  } else {
    registrarNavegacion();
  }
  document.addEventListener("click", (e) =>  {
    const btnAtras = e.target?.closest?.("#volver-atras, .btn-volver, .back-btn");
    if (btnAtras && (btnAtras.id === "volver-atras" || btnAtras.classList.contains("btn-volver"))) {
      volverDesdeVisor(e);
      return;
    }
    const btnIni = e.target?.closest?.("#btn-inicio, .btn-inicio");
    if (btnIni) {
      volverAlInicio(e);
      return;
    }
  }
  , true);
  // Escuchar el botón Atrás del navegador para cerrar el documento y volver a la lista
  window.addEventListener("popstate", (e) =>  {
    const documento = document.getElementById("ov");
    if (documento?.classList.contains("on") && typeof window.closeOv === "function") {
      window.closeOv(true);
    }
  }
  );
  window.volverAlInicio = volverAlInicio;
  window.volverDesdeVisor = volverDesdeVisor;
}
)();
