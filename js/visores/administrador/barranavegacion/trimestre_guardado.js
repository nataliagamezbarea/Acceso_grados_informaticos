(function() {
  try {
    var sel = document.getElementById('selectTrimestreVisor');
    if (!sel) return;
    var q = new URLSearchParams(window.location.search);
    var tri = q.get('trimestre');
    if (!tri) {
      try {
        var c = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
        if (c.trimestre) tri = c.trimestre;
      } catch (_) {
      }
    }
    if (!tri) {
      try {
        var a = JSON.parse(localStorage.getItem('app_ultimo_contexto') || '{}');
        if (a.trimestre) tri = a.trimestre;
      } catch (_) {
      }
    }
    if (!tri) { tri = localStorage.getItem('trimestre') || sessionStorage.getItem('trimestre') || ''; }
    tri = String(tri || '').trim();
    if (!tri || tri.toLowerCase() === 'todos los trimestres' || tri.toLowerCase() === 'todos') {
      sel.value = '';
      return;
    }
    function normalizarNum(v) {
      if (!v) return '';
      var s = String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (/primer|1er|1\b|1º|1ª/.test(s)) return '1';
      if (/segund|2do|2\b|2º|2ª/.test(s)) return '2';
      if (/tercer|3er|3\b|3º|3ª/.test(s)) return '3';
      var m = s.match(/\d+/);
      return m ? m[0] : s;
    }
    var coincidio = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === tri || sel.options[i].textContent.trim() === tri) {
        sel.value = sel.options[i].value;
        coincidio = true;
        break;
      }
    }
    if (!coincidio) {
      var n = normalizarNum(tri);
      if (n) {
        for (var j = 0; j < sel.options.length; j++) {
          if (!sel.options[j].value) continue;
          if (normalizarNum(sel.options[j].value) === n || normalizarNum(sel.options[j].textContent) === n) {
            sel.value = sel.options[j].value;
            coincidio = true;
            break;
          }
        }
      }
    }
    if (!coincidio && tri) {
      var opt = document.createElement('option');
      opt.value = tri;
      opt.textContent = tri;
      sel.appendChild(opt);
      sel.value = tri;
    }
  } catch (_) {
  }
}
)();
