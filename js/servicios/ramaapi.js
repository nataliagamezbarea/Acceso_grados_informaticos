/* Servicio único de ramas compartido por la aplicación principal y Visor Admin. */
window.RamaAPI = window.RamaAPI || (() =>  {
const CACHE = "cache_ramas_lista";
  const sort = (lista) => (Array.isArray(lista) ? [...lista] : [])
  .map(x => String(x || '').trim()).filter(Boolean)
  .filter(x => !['master','main','principal'].includes(x.toLowerCase()))
  .filter((x,i,a) => a.indexOf(x) === i)
  .sort((a,b) => a.localeCompare(b, 'es',  { sensitivity:'base' }
  ));
  const cacheGet = () =>  {
    try {
      const x=JSON.parse(localStorage.getItem(CACHE)||sessionStorage.getItem(CACHE)||'[]');
      return sort(x);
    } catch(_) {
      return [];
    }
  }
  ;
  const cacheSet = (ramas) =>  {
    try { localStorage.setItem(CACHE, JSON.stringify(sort(ramas))); }
    catch(_) { } }
  ;
  const token = () =>  { const c=window.GITHUB_CONFIG|| { }
    ;
    let t=typeof c.obtenerTokenSeguro==='function'?c.obtenerTokenSeguro():(c.token||'');
    if(!t) try { t=localStorage.getItem('cache_gh_token')||sessionStorage.getItem('cache_gh_token')||''; }
    catch(_) {
    }
    return t;
  }
  ;
  const repo = () =>  { const c=window.GITHUB_CONFIG|| { }
    ;
    let r=c.repo||'';
    if(!r) try { r=localStorage.getItem('gh_repo')||sessionStorage.getItem('gh_repo')||''; }
    catch(_) {
    }
    return String(r||'').trim();
  }
  ;
  async function listarRamas() {
    // La app principal se sirve como sitio estático: no existe /api/ramas
    // en Live Server/GitHub Pages. La fuente compartida es Supabase Storage
    // y, como respaldo, GitHub. Así no se genera ningún 404 local.
    try {
      if(window.Permisos?.listarRamasStorage) {
        const d=await window.Permisos.listarRamasStorage();
        const out=sort(d);
        if(out.length) {
          cacheSet(out);
          return out;
        }
      }
    } catch(_) {
    }
    const rpo=repo();
    if(rpo) {
      try {
        const h= { Accept:'application/vnd.github+json' }
        ;
        const t=token();
        if(t) h.Authorization=`Bearer ${t}`;
        const r=await fetch(`https://api.github.com/repos/${rpo}/branches?per_page=100`, { headers:h,cache:'no-store' }
  );
        if(r.ok) {
          const d=await r.json();
          const out=sort((Array.isArray(d)?d:[]).map(x=>x.name));
          if(out.length) {
            cacheSet(out);
            return out;
          }
        }
      } catch(_) {
      }
    }
    return cacheGet();
  }
  async function poblarSelector(select, opciones= {
  }
  ) {
    if(!select) return [];
    const incluirMarcador = opciones.incluirMarcador !== false;
    const marcador = opciones.placeholder || 'SELECCIONAR RAMA';
    const textoTodas = opciones.textoTodas || 'TODAS LAS RAMAS';
    let selectedValue = String(opciones.selectedValue || '').trim();
    if (selectedValue === '__TODAS__' || selectedValue === 'TODAS_LAS_RAMAS_') selectedValue = 'TODAS LAS RAMAS';
    select.innerHTML='';
    if (incluirMarcador) {
      const p=document.createElement('option');
      p.value='';
      p.textContent=marcador;
      select.appendChild(p);
    } else {
      const p=document.createElement('option');
      p.value='TODAS LAS RAMAS';
      p.textContent=textoTodas;
      select.appendChild(p);
    }
    // Cache-first: las ramas disponibles localmente se pintan de inmediato.
    // La consulta remota se ejecuta después y solo añade las que falten.
    const cached=cacheGet();
    cached.forEach(r=> {
      if (r === 'TODAS_LAS_RAMAS_' || r === '__TODAS__' || r === 'TODAS LAS RAMAS') return;
      const o=document.createElement('option');
      o.value=r;
      o.textContent=r;
      select.appendChild(o);
    }
  );
    // Si conocemos la rama por localStorage, se muestra INMEDIATAMENTE.
    if (selectedValue) {
      if (!Array.from(select.options).some(o => o.value === selectedValue)) {
        const o=document.createElement('option');
        o.value=selectedValue;
        o.textContent=(selectedValue === 'TODAS LAS RAMAS' || selectedValue === 'TODAS_LAS_RAMAS_' || selectedValue === '__TODAS__') ? textoTodas : selectedValue;
        o.dataset.persisted='1';
        if (selectedValue === 'TODAS LAS RAMAS' || selectedValue === 'TODAS_LAS_RAMAS_' || selectedValue === '__TODAS__') {
          select.insertBefore(o, select.firstChild);
        } else {
          select.appendChild(o);
        }
      }
    }
    const valFinal = selectedValue || (incluirMarcador ? '' : 'TODAS LAS RAMAS');
    select.value = valFinal;
    if(!valFinal && select.options[0]) select.options[0].selected=true;
    const ramas=await listarRamas();
    if(ramas.length) {
      const valores=new Set(Array.from(select.options).map(o=>o.value));
      ramas.forEach(r=> {
        if (r === 'TODAS_LAS_RAMAS_' || r === '__TODAS__' || r === 'TODAS LAS RAMAS') return;
        if(!valores.has(r)) {
          const o=document.createElement('option');
          o.value=r;
          o.textContent=r;
          select.appendChild(o);
        }
      }
  );
    }
    // Normalizar todas las opciones de TODAS LAS RAMAS para que nunca muestren texto crudo
    Array.from(select.options).forEach(o =>  {
      if (o.value === 'TODAS_LAS_RAMAS_' || o.value === '__TODAS__' || o.value === 'TODAS LAS RAMAS' || o.textContent === 'TODAS_LAS_RAMAS_' || o.textContent === '__TODAS__') {
        o.value = 'TODAS LAS RAMAS';
        o.textContent = textoTodas;
      }
    }
  );
    if (!incluirMarcador) {
      Array.from(select.options).forEach(o =>  {
        if (o.value === '' || (o.textContent || '').trim().toUpperCase() === 'SELECCIONAR RAMA') o.remove();
      }
  );
      if (!Array.from(select.options).some(o => o.value === 'TODAS LAS RAMAS')) {
        const p=document.createElement('option');
        p.value='TODAS LAS RAMAS';
        p.textContent=textoTodas;
        select.insertBefore(p, select.firstChild);
      }
    } else {
      // En modo índice/marcador, quitar cualquier TODAS LAS RAMAS
      Array.from(select.options).forEach(o =>  {
        if (o.value === 'TODAS LAS RAMAS' || o.value === 'TODAS_LAS_RAMAS_' || o.value === '__TODAS__') o.remove();
      }
  );
      if (select.options.length === 0) {
        const p = document.createElement('option');
        p.value = '';
        p.textContent = marcador;
        select.appendChild(p);
      }
    }
    if (selectedValue && Array.from(select.options).some(o => o.value === selectedValue)) {
      select.value = selectedValue;
    } else {
      select.value = incluirMarcador ? '' : 'TODAS LAS RAMAS';
      if(select.options[0]) select.options[0].selected=true;
    }
    return ramas;
  }
  async function poblarSelectorCachePrimero(select, opciones={}) {
    if (!select) return [];
    const incluirMarcador = opciones.incluirMarcador !== false;
    const marcador = opciones.placeholder || 'SELECCIONAR RAMA';
    const actual = Array.from(select.options).map(o => o.value);
    if (!actual.length) {
      const p = document.createElement('option');
      p.value = '';
      p.textContent = marcador;
      p.selected = true;
      select.appendChild(p);
    }
    const cached = cacheGet();
    if (cached.length) {
      const existentes = new Set(Array.from(select.options).map(o => o.value));
      cached.forEach(r => {
        if (!r || existentes.has(r)) return;
        const o=document.createElement('option');
        o.value=r;
        o.textContent=r;
        select.appendChild(o);
      });
    }
    return poblarSelector(select, opciones);
  }
  return  { listarRamas,poblarSelector,poblarSelectorCachePrimero,cacheGet,cacheSet,sort }
  ;
}
)();
window.RamaUI = window.RamaUI ||  {
  ensureAllBranchesOption(select, texto='TODAS LAS RAMAS') {
    if(!select) return;
    Array.from(select.options).forEach(o=> {
      if(o.dataset.allBranches==='1'||o.value==='TODAS LAS RAMAS'||o.value==='TODAS_LAS_RAMAS_'||o.value==='__TODAS__')o.remove();
    }
  );
    const all=document.createElement('option');
    all.value='TODAS LAS RAMAS';
    all.textContent=texto;
    all.dataset.allBranches='1';
    select.insertBefore(all, select.firstChild);
  }
}
;
window.ensureAllBranchesOption = window.RamaUI.ensureAllBranchesOption;
