(function(){
    var h=document.documentElement;
    /* Solo esperamos las hojas del propio visor. Un CDN externo (p.ej. Font Awesome)
       no puede bloquear el primer pintado indefinidamente. */
    var links=Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]'))
      .filter(function(l){
        if(!l.href || l.hasAttribute('data-css-optional')) return false;
        try { return new URL(l.href, location.href).origin === location.origin; }
        catch(e) { return false; }
      });
    var finished=false;
    var done=new WeakSet();
    function reveal(){
      if(finished) return;
      finished=true;
      h.classList.remove('visor-css-pending');
    }
    if(!links.length){ reveal(); return; }
    var left=links.length;
    function one(l){
      if(done.has(l)) return;
      done.add(l);
      left--;
      if(left<=0) reveal();
    }
    links.forEach(function(l){
      l.addEventListener('load',function(){ one(l); },{once:true});
      l.addEventListener('error',function(){ one(l); },{once:true});
      /* Si el navegador ya la terminó antes de registrar los listeners,
         marcamos esa hoja una sola vez. */
      try {
        if(l.sheet) one(l);
      } catch(e) {}
    });
  })();
