(function() {
  try {
    var sel = document.getElementById('selectRamaGithub');
    if (!sel) return;
    var q = new URLSearchParams(window.location.search);
    var rama = q.get('rama');
    var todas = q.has('todas');
    if (!rama && !todas) {
      try {
        var c = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
        if (c.todas || c.rama === '__TODAS__' || c.rama === 'TODAS_LAS_RAMAS_' || c.rama === 'TODAS LAS RAMAS') todas = true;
        else if (c.rama) rama = c.rama;
      } catch (_) {
      }
    }
    if (!rama && !todas) {
      try {
        var a = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}');
        if (a.rama === '__TODAS__' || a.rama === 'TODAS_LAS_RAMAS_' || a.rama === 'TODAS LAS RAMAS') todas = true;
        else if (a.rama) rama = a.rama;
      } catch (_) {
      }
    }
    if (!rama && !todas) {
      var g = localStorage.getItem('last_archivo_rama') || localStorage.getItem('last_grado') || localStorage.getItem('rama_actual') || '';
      if (g === '__TODAS__' || g === 'TODAS_LAS_RAMAS_' || g === 'TODAS LAS RAMAS') todas = true;
      else if (g) rama = g;
    }
    if (todas || !rama || rama === 'TODAS_LAS_RAMAS_' || rama === '__TODAS__') rama = 'TODAS LAS RAMAS';
    rama = String(rama || '').trim();
    var cached = [];
    try {
      cached = JSON.parse(localStorage.getItem('cache_ramas_lista') || sessionStorage.getItem('cache_ramas_lista') || '[]');
      if (!Array.isArray(cached)) cached = [];
    } catch (_) {
    }
    sel.innerHTML = '<option value="TODAS LAS RAMAS">TODAS LAS RAMAS</option>';
    cached.forEach(function(r) {
      if (r === 'TODAS_LAS_RAMAS_' || r === '__TODAS__' || r === 'TODAS LAS RAMAS') return;
      var opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      sel.appendChild(opt);
    }
  );
    if (rama && rama !== 'TODAS LAS RAMAS' && rama !== 'TODAS_LAS_RAMAS_' && rama !== '__TODAS__' && !Array.from(sel.options).some(function(o) {
      return o.value === rama;
    }
    )) {
      var optR = document.createElement('option');
      optR.value = rama;
      optR.textContent = rama;
      sel.appendChild(optR);
    }
    sel.value = (rama === '__TODAS__' || rama === 'TODAS_LAS_RAMAS_' || !rama) ? 'TODAS LAS RAMAS' : rama;
  } catch (_) {
  }
}
)();
