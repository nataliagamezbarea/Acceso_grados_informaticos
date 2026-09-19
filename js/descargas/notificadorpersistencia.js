/* Mantiene los toasts de Acceso al cambiar componentes sin recargar la aplicación. */
(function(){
  let scheduled=false;
  function restore(){
    scheduled=false;
    if (typeof window.restaurarToastsActivos === "function") window.restaurarToastsActivos();
  }
  const obs=new MutationObserver(()=>{
    if(scheduled) return;
    scheduled=true;
    queueMicrotask(restore);
  });
  function start(){
    if(document.body) obs.observe(document.body,{childList:true});
    restore();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
