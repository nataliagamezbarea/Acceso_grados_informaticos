// Sincroniza los selectores visibles de la navbar con los selectores reales del visor.
  // En standalone no hay iframe padre que haga esta copia, por eso se mantiene aquí.
  (function(){
    function copiar(origen, destino){
      if (!origen || !destino) return;
      const valor = origen.value;
      destino.innerHTML = origen.innerHTML;
      if (Array.from(destino.options).some(o => o.value === valor)) destino.value = valor;
    }
    function iniciar(){
      const rama = document.getElementById('selectRamaGithub');
      const tri = document.getElementById('selectTrimestreVisor');
      const ramaPopup = document.getElementById('navbar-rama-popup');
      const triPopup = document.getElementById('navbar-trimestre-popup');
      if (!rama || !tri || !ramaPopup || !triPopup) return;

      const sincronizar = () => {
        copiar(rama, ramaPopup);
        copiar(tri, triPopup);
      };
      sincronizar();

      rama.addEventListener('change', () => {
        copiar(rama, ramaPopup);
        if (typeof window.cambiarRamaGithub === 'function') window.cambiarRamaGithub(rama.value);
      });
      tri.addEventListener('change', () => {
        copiar(tri, triPopup);
        if (typeof window.cambiarTrimestreVisor === 'function') window.cambiarTrimestreVisor(tri.value);
      });
      ramaPopup.addEventListener('change', () => {
        rama.value = ramaPopup.value;
        if (typeof window.cambiarRamaGithub === 'function') window.cambiarRamaGithub(ramaPopup.value);
      });
      triPopup.addEventListener('change', () => {
        tri.value = triPopup.value;
        if (typeof window.cambiarTrimestreVisor === 'function') window.cambiarTrimestreVisor(triPopup.value);
      });

      const obs = new MutationObserver(sincronizar);
      obs.observe(rama, {childList:true, subtree:true});
      obs.observe(tri, {childList:true, subtree:true});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  })();
