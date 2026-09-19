/* Mantener el notificador EXACTO de Acceso al cambiar de componente */
(function(){
  function asegurarNotificador(){
    if (typeof window.obtenerContenedorToasts !== "function") return;
    try { window.obtenerContenedorToasts(); } catch(e) {}
    try { if (typeof window.restaurarToastsActivos === "function") window.restaurarToastsActivos(); } catch(e) {}
  }
  document.addEventListener("DOMContentLoaded", asegurarNotificador);
  window.addEventListener("load", asegurarNotificador);
  window.addEventListener("popstate", asegurarNotificador);
  window.addEventListener("hashchange", asegurarNotificador);
  // If the SPA replaces the body/container, re-create the notifier.
  const obs=new MutationObserver(()=> {
    if (window._descargasRestaurando) return;
    if (!document.getElementById("contenedor-toasts-descarga") &&
        document.querySelector("body")) asegurarNotificador();
  });
  if (document.body) obs.observe(document.body,{childList:true,subtree:true});
})();
