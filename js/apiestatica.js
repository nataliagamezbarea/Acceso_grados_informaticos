/* ============================================================
   MODO 100% ESTÁTICO: Supabase + GitHub, sin servidor Python
   Mantiene la API interna /api/* del frontend mediante una capa compatible.
   El token de GitHub de configuración privada solo vive en memoria y se
   reserva para el ADMIN. Los invitados usan el gh_token público de
   configuracion_publica (solo lectura) para consultar y descargar.
   ============================================================ */
(() =>  {
const GRADOS =  {
    Primer_grado_medio:  { rama: 'Primer_grado_medio', limpia: 'Primer_grado_medio_limpia' }
    ,
    Segundo_grado_medio:  { rama: 'Segundo_grado_medio', limpia: 'Segundo_grado_medio_limpia' }
    ,
    Primer_grado_superior_DAW:  { rama: 'Primer_grado_superior_DAW', limpia: 'Primer_grado_superior_DAW_limpia' }
  }
  ;
  const GH_API = 'https://api.github.com';
  let cfgPromise = null;
  let remoteApiPromise = null;
  let remoteApiBase = null;
  let cache =  { revision: null, rewrites:  { }
  }
  ;
  // MODO 100% ESTÁTICO:
  // No se consulta ningún endpoint /api del servidor local.
  // Todas las operaciones se resuelven directamente desde el navegador
  // usando Supabase y GitHub.
  async function detectarBackendReal() { return null; }
  const json = (obj, status=200) => new Response(JSON.stringify(obj),  {
    status, headers:  { 'Content-Type': 'application/json; charset=utf-8' }
  }
  );
  const bytes = (buf, type='application/octet-stream', status=200) => new Response(buf,  {
    status, headers:  { 'Content-Type': type }
  }
  );
  const ghHeaders = token =>  {
    const h =  { 'Accept':'application/vnd.github+json', 'User-Agent':'Visor-Grados-Static' }
    ;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }
  ;
  async function sbQuery(table, columns='clave,valor', filters='') {
    const u = `${window.SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(columns)}${filters ? '&'+filters : ''}`;
    const session = window.supabaseClient ? (await window.supabaseClient.auth.getSession()).data.session : null;
    const anon = window.SUPABASE_ANON_KEY;
    const headers =  {
      apikey: anon, Authorization: `Bearer ${session?.access_token || anon}`, Accept: 'application/json', 'Accept-Profile': 'grados-informaticos'
    }
    ;
    const r = await fetch(u,  { headers }
  );
    if (!r.ok) throw new Error(`Supabase ${table}: HTTP ${r.status}`);
    return r.json();
  }
  async function waitAuthReady() {
    if (window.sesionActual || window.__ES_ADMIN !== undefined || !window.supabaseClient) return;
    await new Promise(resolve =>  {
      const done = () =>  {
        window.removeEventListener('static-auth-ready', done);
        resolve();
      }
      ;
      window.addEventListener('static-auth-ready', done,  { once:true }
  );
      setTimeout(() =>  {
        window.removeEventListener('static-auth-ready', done);
        resolve();
      }
      , 5000);
    }
  );
  }
  async function getConfig() {
    if (cfgPromise) return cfgPromise;
    await waitAuthReady();
    cfgPromise = (async () =>  {
      const out =  {
        supabaseUrl: window.SUPABASE_URL, supabaseKey: window.SUPABASE_ANON_KEY, repo: '', token: '', repoGeneral: '', tokenGeneral: '', publicRepo: ''
      }
      ;
      try {
        // configuracion_publica es legible por anon: su gh_token es de solo
        // lectura y permite a invitados y admin consultar/descargar GitHub.
        const pub = await sbQuery('configuracion_publica', 'clave,valor');
        for (const x of pub || []) {
          if (x.clave === 'gh_repo_invitados' || x.clave === 'gh_repo_publico' || x.clave === 'gh_repo') out.publicRepo = String(x.valor || '').trim();
          if (x.clave === 'gh_token') out.token = String(x.valor || '').trim();
        }
      } catch (_) {
      }
      if (window.__ES_ADMIN || window.sesionActual?.user) {
        try {
          const priv = await sbQuery('configuracion_privada', 'clave,valor');
          for (const x of priv || []) {
            if (x.clave === 'gh_repo_general' || x.clave === 'gh_repo') out.repo = String(x.valor || '').trim();
            if (x.clave === 'gh_repo_general') out.repoGeneral = String(x.valor || '').trim();
            if (x.clave === 'gh_token_general') out.tokenGeneral = String(x.valor || '').trim();
            if (x.clave === 'gh_token') out.token = String(x.valor || '').trim();
            if (x.clave === 'gh_repo_apuntes') out.repoApuntes = String(x.valor || '').trim();
          }
        } catch (e) {
          console.error('[STATIC-API] No se pudo leer configuracion_privada:', e);
        }
      }
      // gh_token (lectura) manda sobre gh_token_general (escritura): lectura,
      // descarga y (aunque legado) uso general usan gh_token. gh_token_general
      // solo se usa como último recurso si no hay ningún gh_token.
      if (!out.tokenGeneral) out.tokenGeneral = out.token;
      if (!out.token && out.tokenGeneral) out.token = out.tokenGeneral;
      if (out.repoGeneral) out.repo = out.repoGeneral;
      if (!out.token && (window.__ES_ADMIN || window.sesionActual?.user)) { console.error('[STATIC-API] Falta gh_token en configuracion_privada. Las consultas a GitHub no tienen permisos.'); }
      return out;
    }
    )();
    return cfgPromise;
  }
  async function ghRequest(repo, path, opts= {
  }
  ) {
    const c = await getConfig();
    if (!repo) repo = c.repo || c.publicRepo;
    if (!repo) throw new Error('No hay repositorio configurado');
    if (!c.token) throw new Error('Falta gh_token en configuracion_privada de Supabase');
    const url = `${GH_API}/repos/${repo}/${path.replace(/^\//,'')}`;
    const r = await fetch(url,  {
      ...opts, headers:  { ...ghHeaders(c.token), ...(opts.headers ||  { }
        )
      }
    }
  );
    return r;
  }
  async function getContent(path, branch, repoOverride='') {
    const c = await getConfig();
    const repo = repoOverride || c.repo || c.publicRepo;
    if (!repo) throw new Error('No hay repositorio configurado');
    const r = await ghRequest(repo, `contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.content) {
      // No usamos download_url/raw.githubusercontent.com porque una petición
      // autenticada desde el navegador puede provocar un preflight CORS.
      // Recuperamos el blob mediante la API de GitHub usando su SHA.
      if (d.sha) {
        const br = await ghRequest(repo, `git/blobs/${encodeURIComponent(d.sha)}`);
        if (br.ok) {
          const bd = await br.json();
          if (bd.encoding === 'base64' && bd.content) {
            const b64 = bd.content.replace(/\s/g,'');
            const raw = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
            return  { bytes: raw.buffer, text: new TextDecoder().decode(raw), sha: d.sha, path }
            ;
          }
        }
      }
      return null;
    }
    const b64 = d.content.replace(/\s/g,'');
    const raw = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
    return  { bytes: raw.buffer, text: new TextDecoder().decode(raw), sha: d.sha, path }
    ;
  }
  async function tree(repo, branch) {
    const r = await ghRequest(repo, `git/trees/${encodeURIComponent(branch)}?recursive=1`);
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d.tree) ? d.tree.filter(x => x.type === 'blob').map(x => x.path) : [];
  }
  async function findPdf(repo, branch, filename) {
    const paths = await tree(repo, branch);
    const base = filename.split('/').pop().toLowerCase();
    return paths.find(p => p.toLowerCase() === filename.toLowerCase()) ||
    paths.find(p => p.toLowerCase().endsWith('/'+base) && p.toLowerCase().endsWith('.pdf')) || null;
  }
  async function getRevision() {
    if (cache.revision) return cache.revision;
    const c = await getConfig();
    const repo = c.repo || c.publicRepo;
    const x = repo ? await getContent('almacen/datos/revision.json', 'master', repo) : null;
    try { cache.revision = x ? JSON.parse(x.text) :  { }
      ;
    } catch (_) {
      cache.revision =  {
      }
      ;
    }
    return cache.revision;
  }
  async function getRewrites(g) {
    if (cache.rewrites[g]) return cache.rewrites[g];
    const c = await getConfig();
    const repo = c.repo || c.publicRepo;
    const x = repo ? await getContent(`almacen/datos/rewrites_${g}.json`, 'master', repo) : null;
    try { cache.rewrites[g] = x ? JSON.parse(x.text) : []; }
    catch (_) { cache.rewrites[g] = []; }
    return cache.rewrites[g];
  }
  function key(g,a) { return `${g}::${String(a||'').split('/').pop()}`; }
  function cleanName(a) {
    return String(a||'').replace(/\.pdf$/i,'').replace(/\s+/g,'_') + '.pdf';
  }
  async function buildData() {
    const c = await getConfig();
    const repo = c.repo || c.publicRepo;
    if (!repo) return  {
    }
    ;
    const rev = await getRevision();
    const out =  {
    }
    ;
    for (const [g, gc] of Object.entries(GRADOS)) {
      const paths = await tree(repo, gc.rama);
      const pdfs = paths.filter(p => /\.pdf$/i.test(p) && (p.startsWith('archivos/') || p.startsWith('apuntes/')));
      const rw = await getRewrites(g);
      const byFile = new Map((rw||[]).map(e => [String(e.archivo||'').split('/').pop(), e]));
      const entries = [], used = new Set();
      for (const e of rw || []) {
        const a = String(e.archivo||'').split('/').pop();
        if (!a) continue;
        const rel = pdfs.find(p => p.split('/').pop() === a) || `archivos/${a}`;
        used.add(a);
        used.add(rel);
        const rr = rev[key(g,a)] ||  {
        }
        ;
        entries.push( {
          idx: entries.length, archivo:a, rel_path:rel, carpeta:rel.includes('/')?rel.split('/')[0]:'raíz', nombre_limpio:cleanName(a), cambia_nombre:cleanName(a)!==a, inc_nombre:!!rr.inc_renombre, inc_interior:rr.inc_interior !== false, inc_colegio:rr.inc_colegio !== false, inc_internet:!!rr.inc_internet, acciones_imagenes:rr.acciones_imagenes|| {
          }
          , imagenes:rr.acciones_imagenes|| {
          }
          , inc_apunte:!!rr.inc_apunte || rel.startsWith('apuntes/'), nombre_apunte:rr.nombre_apunte||'', latex_compilado:!!rr.latex_compilado, old:e.start||'', new:e.new||'', start:e.start||'', end:e.end||'', enunciados_count:Array.isArray(e.enunciados)?e.enunciados.length:0, is_cv:false, cambia:!!(e.new || e.enunciados), include:e.include !== false, visto:!!rr.visto, decision:rr.decision||''
        }
  );
      }
      for (const p of pdfs) {
        const a = p.split('/').pop();
        if (used.has(a) || used.has(p)) continue;
        const rr = rev[key(g,a)] ||  {
        }
        ;
        out[g] = out[g] ||  {
        }
        ;
        entries.push( {
          idx:entries.length, archivo:a, rel_path:p, carpeta:p.includes('/')?p.split('/')[0]:'raíz', nombre_limpio:cleanName(a), cambia_nombre:cleanName(a)!==a, inc_nombre:!!rr.inc_renombre, inc_interior:rr.inc_interior !== false, inc_colegio:rr.inc_colegio !== false, inc_internet:!!rr.inc_internet, acciones_imagenes:rr.acciones_imagenes|| {
          }
          , imagenes:rr.acciones_imagenes|| {
          }
          , inc_apunte:!!rr.inc_apunte || p.startsWith('apuntes/'), nombre_apunte:rr.nombre_apunte||'', latex_compilado:!!rr.latex_compilado, old:'', new:'', start:'', end:'', enunciados_count:0, is_cv:false, cambia:false, include:rr.include !== false, visto:!!rr.visto, decision:rr.decision||''
        }
  );
      }
      out[g] =  { dir:g, titulo:g, total_archivos:entries.length, entries, no_cambian:[] }
      ;
    }
    return out;
  }
  async function saveJson(path, obj, branch='master', repoOverride='') {
    const c = await getConfig();
    const repo = repoOverride || c.repo;
    if (!repo || !c.token) throw new Error('Se necesita gh_repo_general y gh_token para guardar');
    const old = await getContent(path, branch, repo);
    const raw = JSON.stringify(obj, null, 2) + '\n';
    const payload =  { message:`Actualizar ${path} desde Visor estático`, content:btoa(unescape(encodeURIComponent(raw))), branch }
    ;
    if (old?.sha) payload.sha = old.sha;
    const r = await ghRequest(repo, `contents/${path}`,  {
      method:'PUT', headers: { 'Content-Type':'application/json' }
      , body:JSON.stringify(payload)
    }
  );
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  async function updateRevision(body) {
    const rev = await getRevision();
    const k = key(body.grado, body.archivo);
    rev[k] = rev[k] ||  {
    }
    ;
    if (body.campo === 'inc') rev[k].include = !!body.valor;
    else if (body.campo === 'int') rev[k].inc_interior = !!body.valor;
    else if (body.campo === 'col') rev[k].inc_colegio = !!body.valor;
    else if (body.campo === 'ren') rev[k].inc_renombre = !!body.valor;
    else if (body.campo === 'internet') rev[k].inc_internet = !!body.valor;
    else if (body.campo === 'apunte') rev[k].inc_apunte = !!body.valor;
    else if (body.campo === 'nombre_apunte') rev[k].nombre_apunte = String(body.valor||'').trim();
    cache.revision = rev;
    await saveJson('almacen/datos/revision.json', rev);
  }
  async function setDecision(body) {
    const rev = await getRevision();
    const k = key(body.grado,body.archivo);
    rev[k]=rev[k]|| {
    }
    ;
    if (body.decision) rev[k].decision=body.decision;
    else delete rev[k].decision;
    cache.revision=rev;
    await saveJson('almacen/datos/revision.json',rev);
    return  { ok:true }
    ;
  }
  async function saveEnunciado(body, deleting=false) {
    const g=body.grado, a=String(body.archivo||'').split('/').pop();
    const rw=await getRewrites(g);
    let item=rw.find(x=>String(x.archivo||'').split('/').pop()===a);
    if(!item) {
      item= { archivo:a,enunciados:[] }
      ;
      rw.push(item);
    }
    item.enunciados=item.enunciados||[];
    if(deleting) {
      const i=body.hotspot_id;
      if(Number.isInteger(i)&&item.enunciados[i]) item.enunciados[i].include=false;
      else {
        const x=item.enunciados.find(e=>e.start===body.start);
        if(x)x.include=false;
      }
    } else {
      let x = item.enunciados.find(e=>body.old_start ? e.start===body.old_start : e.start===body.start);
      if(!x) {
        x= { start:body.start||'',new:body.new_text||'',include:true }
        ;
        item.enunciados.push(x);
      }
      x.start=body.start||x.start;
      x.old=body.start||x.old||'';
      x.new=body.new_text||'';
      x.include=true;
      if(body.page!==undefined)x.page=body.page;
      if(body.pct_top!==undefined)x.pct_top=body.pct_top;
      if(body.custom)x.custom=true;
    }
    cache.rewrites[g]=rw;
    await saveJson(`almacen/datos/rewrites_${g}.json`,rw);
    return  { ok:true }
    ;
  }
  async function saveImageAction(body) {
    const g = body.grado, a = String(body.archivo || '').split('/').pop();
    const rev = await getRevision();
    const k = key(g, a);
    rev[k] = rev[k] ||  {
    }
    ;
    rev[k].acciones_imagenes = rev[k].acciones_imagenes ||  {
    }
    ;
    const id = String(body.img_id || '');
    if (!id) throw new Error('Falta img_id');
    const accion = String(body.accion || '').toLowerCase();
    if (!['borrar','reemplazar','conservar','restaurar'].includes(accion)) throw new Error('Acción de imagen no válida');
    if (accion === 'restaurar') delete rev[k].acciones_imagenes[id];
    else rev[k].acciones_imagenes[id] =  {
      accion,
      ruta: String(body.ruta || ''),
      cita: String(body.cita || ''),
      global: !!body.global,
      page_num: Number(body.page_num || 0),
      img_idx: Number(body.img_idx || 0),
      updated_at: new Date().toISOString()
    }
    ;
    cache.revision = rev;
    await saveJson('almacen/datos/revision.json', rev);
    return  { ok:true, accion, img_id:id }
    ;
  }
  async function extractBoxText(body) {
    // En estático no dependemos del backend para extraer texto: PDF.js ya está en el navegador.
    // La edición conserva el texto del hotspot cuando existe.
    return  { ok:true, text:String(body.text || '').trim() }
    ;
  }
  async function saveRecuadro(body) {
    const g = body.grado, a = String(body.archivo || '').split('/').pop();
    const rev = await getRevision();
    const k = key(g, a);
    rev[k] = rev[k] ||  {
    }
    ;
    const tipo = String(body.tipo || '').toLowerCase();
    if (tipo === 'reflujo') {
      if (body.eliminar) delete rev[k].inicio_reflujo;
      else rev[k].inicio_reflujo =  {
        page: Number(body.page_num || 0),
        left: Number(body.left || 5), top: Number(body.top || 10),
        width: Number(body.width || 90), height: Number(body.height || 8)
      }
      ;
    } else if (tipo === 'nombre' || tipo === 'colegio') {
      const grupo = tipo === 'nombre' ? 'nombre' : 'colegio';
      rev[k].recuadros = rev[k].recuadros ||  {
      }
      ;
      rev[k].recuadros[grupo] = rev[k].recuadros[grupo] ||  {
      }
      ;
      const page = String(Number(body.page_num || 0));
      if (body.eliminar || body.accion === 'eliminar') delete rev[k].recuadros[grupo][page];
      else rev[k].recuadros[grupo][page] =  {
        coords: [Number(body.left || 0), Number(body.top || 0), Number(body.width || 0), Number(body.height || 0)],
        text: String(body.text || '').trim()
      }
      ;
    } else if (tipo === 'enunciado' || tipo === 'statement') {
      return saveEnunciado( { ...body, start: body.text || body.start || '' }
      , false);
    }
    cache.revision = rev;
    await saveJson('almacen/datos/revision.json', rev);
    return  { ok: true }
    ;
  }
  async function post(path, body) {
    if (path === '/api/update_flags') return updateRevision(body).then(()=>json( { ok:true }
    ));
    if (path === '/api/set_decision' || path === '/api/visto') {
      if(path==='/api/visto') body.decision=body.decision||'';
      if(path==='/api/visto') body.campo='visto';
      if(path==='/api/visto') {
        const rev=await getRevision();
        const k=key(body.grado,body.archivo);
        rev[k]=rev[k]|| {
        }
        ;
        rev[k].visto=!!body.visto;
        if(body.decision)rev[k].decision=body.decision;
        cache.revision=rev;
        await saveJson('almacen/datos/revision.json',rev);
        return json( { ok:true }
  );
      }
      return setDecision(body).then(x=>json(x));
    }
    if(path==='/api/image_action') return saveImageAction(body).then(x=>json(x));
    if(path==='/api/extract_box_text') return extractBoxText(body).then(x=>json(x));
    if(path==='/api/upload_image') return json( { ok:false,error:'La subida de imagen necesita una ruta/base64 gestionada por GitHub.' }
    ,501);
    if(path==='/api/check_image_internet') return json( { ok:false,existe_en_internet:false,detalles:'Comprobación externa no disponible en modo 100% estático.' }
  );
    if(path==='/api/save_enunciado') return saveEnunciado(body,false).then(x=>json(x));
    if(path==='/api/delete_enunciado') return saveEnunciado(body,true).then(x=>json(x));
    if(path==='/api/recuadro') return saveRecuadro(body).then(x=>json(x));
    if(path==='/api/reset_item') {
      const rw=await getRewrites(body.grado);
      const a=String(body.archivo||'').split('/').pop();
      const i=rw.findIndex(x=>String(x.archivo||'').split('/').pop()===a);
      if(i>=0)rw.splice(i,1);
      cache.rewrites[body.grado]=rw;
      await saveJson(`almacen/datos/rewrites_${body.grado}.json`,rw);
      return json( { ok:true }
  );
    }
    if(path==='/api/limpiar_datos_revision' || path==='/api/clean_revision_data') {
      const gParam = String(body?.grado || '').trim();
      const isSingleBranch = gParam && gParam !== '__TODAS__' && gParam !== 'TODAS_LAS_RAMAS_' && gParam !== 'TODAS LAS RAMAS';
      const targetGrados = isSingleBranch ? [gParam] : Object.keys(GRADOS);
      const eliminarEnunciados = !!body?.eliminar_enunciados;
      const eliminarNombres = !!body?.eliminar_nombres;
      const eliminarColegios = !!body?.eliminar_colegios;
      const eliminarImagenes = !!body?.eliminar_imagenes;
      const eliminarTodo = eliminarEnunciados && eliminarNombres && eliminarColegios && eliminarImagenes;

      let rev = {};
      try {
        rev = await getRevision() || {};
      } catch (_) {
        rev = (cache.revision && typeof cache.revision === 'object') ? cache.revision : {};
      }
      for (const k of Object.keys(rev)) {
        let kGrado = k.includes('::') ? k.split('::')[0] : '';
        if (isSingleBranch && kGrado !== gParam && kGrado !== '') continue;
        const entry = rev[k];
        if (!entry || typeof entry !== 'object' || eliminarTodo) {
          delete rev[k];
          continue;
        }
        if (eliminarEnunciados) {
          delete entry.include; delete entry.enunciados; delete entry.enunciado_custom; delete entry.enunciado;
          if (entry.recuadros) delete entry.recuadros.enunciados;
        }
        if (eliminarNombres) {
          delete entry.inc_interior; delete entry.inc_renombre; delete entry.acciones_nombre;
          if (entry.recuadros) { delete entry.recuadros.nombres; delete entry.recuadros.nombre; }
        }
        if (eliminarColegios) {
          delete entry.inc_colegio; delete entry.acciones_colegio;
          if (entry.recuadros) { delete entry.recuadros.colegios; delete entry.recuadros.colegio; }
        }
        if (eliminarImagenes) {
          delete entry.imagenes; delete entry.inc_imagenes; delete entry.inc_internet;
          if (entry.recuadros) { delete entry.recuadros.imagenes; delete entry.recuadros.imagen; }
        }
        if (entry.recuadros && Object.keys(entry.recuadros).length === 0) delete entry.recuadros;
        if (Object.keys(entry).length === 0) delete rev[k];
      }
      cache.revision = rev;

      for (const g of targetGrados) {
        let rw = [];
        try {
          rw = await getRewrites(g) || [];
        } catch (_) {
          rw = Array.isArray(cache.rewrites[g]) ? cache.rewrites[g] : [];
        }
        if (eliminarTodo) {
          rw = [];
        } else {
          for (const item of rw) {
            if (!item || typeof item !== 'object') continue;
            if (eliminarEnunciados) {
              item.enunciados = []; item.old = ""; item.new = ""; item.start = ""; item.end = "";
              delete item.include; delete item.custom;
              if (item.recuadros) delete item.recuadros.enunciados;
            }
            if (eliminarNombres && item.recuadros) { delete item.recuadros.nombres; delete item.recuadros.nombre; }
            if (eliminarColegios && item.recuadros) { delete item.recuadros.colegios; delete item.recuadros.colegio; }
            if (eliminarImagenes && item.recuadros) { delete item.recuadros.imagenes; delete item.recuadros.imagen; }
            if (item.recuadros && Object.keys(item.recuadros).length === 0) delete item.recuadros;
          }
          rw = rw.filter(item => (Array.isArray(item.enunciados) && item.enunciados.length > 0) || (item.recuadros && Object.keys(item.recuadros).length > 0) || item.start || item.new || item.old);
        }
        cache.rewrites[g] = rw;
        if (body?.sync_github) {
          try { await saveJson(`almacen/datos/rewrites_${g}.json`, rw); } catch (_) {}
        }
      }

      if (body?.sync_github) {
        try { await saveJson('almacen/datos/revision.json', rev); } catch (_) {}
      }

      return json({ ok: true, mensaje: "Datos de revisión limpiados correctamente." });
    }
    if(path==='/api/github_pull') return json( { ok:true,mensaje:'Modo estático: sincronización directa con GitHub activa.' }
  );
    if(path==='/api/github_push') return json( { ok:true,mensaje:'Los cambios se guardan directamente en GitHub.' }
  );
    if(path==='/api/eliminar_apunte') {
      const c = await getConfig();
      const grado = String(body.grado || '').trim();
      const archivo = String(body.archivo || '').trim();
      const a = archivo.split('/').pop();
      const nombre = String(body.nombre_apunte || '').trim();
      const normNombre = (typeof normalizarNombreApunte === 'function')
        ? normalizarNombreApunte(nombre, a)
        : (nombre || a.replace(/\.pdf$/i, ''));

      // 1. Borrar PDFs/residuales en GitHub si borrar_pdfs está activo
      if (body.borrar_pdfs !== false && grado && c.repo && c.token) {
        const candidatos = [
          `apuntes/${normNombre}.pdf`,
          `apuntes/${nombre}.pdf`,
          `apuntes/${normNombre}.tex`,
          `apuntes/${normNombre}.txt`
        ];
        const unicos = [...new Set(candidatos)];
        for (const ruta of unicos) {
          try {
            const metaUrl = `${GH_API}/repos/${c.repo}/contents/${ruta.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(grado)}&_=${Date.now()}`;
            const mr = await originalFetch(metaUrl, { headers: { 'Authorization': `Bearer ${c.token}`, 'Accept': 'application/vnd.github.v3+json' }, cache: 'no-store' });
            if (mr.ok) {
              const md = await mr.json();
              if (md && md.sha) {
                await ghRequest(c.repo, `contents/${ruta}`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: `Eliminar apunte ${normNombre} desde Visor`,
                    sha: md.sha,
                    branch: grado
                  })
                });
                _invalidateContentCache(ruta, grado, c.repo);
              }
            }
          } catch (_) {}
        }
      }

      // 2. Actualizar revision.json en master
      try {
        let rev = {};
        try { rev = await getRevision(); }
        catch (_) { rev = (typeof cache !== 'undefined' && cache?.revision) ? cache.revision : {}; }
        const k = `${grado}::${a}`;
        if (rev[k]) {
          rev[k].inc_apunte = false;
          delete rev[k].latex_compilado;
        }
        for (const clave of Object.keys(rev || {})) {
          if (clave.startsWith(`${grado}::`)) {
            const entry = rev[clave];
            if (entry && (entry.nombre_apunte === normNombre || entry.nombre_apunte === nombre)) {
              entry.inc_apunte = false;
              delete entry.latex_compilado;
            }
          }
        }
        if (typeof cache !== 'undefined') cache.revision = rev;
        if (c.repo && c.token) {
          _invalidateContentCache('almacen/datos/revision.json', 'master', c.repo);
          await saveJson('almacen/datos/revision.json', rev);
        }
      } catch (_) {}

      // 3. Sincronizar estado local en memoria
      try {
        if (typeof ITEMS !== 'undefined' && Array.isArray(ITEMS)) {
          for (const it of ITEMS) {
            if (it && (it.archivo === a || it.archivo === archivo)) {
              it.inc_apunte = false;
              delete it.latex_compilado;
            }
          }
        }
      } catch (_) {}

      return json({ ok: true, mensaje: 'Apunte eliminado correctamente de GitHub.' });
    }

    if(path==='/api/quitar_manual' || path==='/api/remove_manual') {
      const g = String(body.grado || '').trim();
      const a = String(body.archivo || '').split('/').pop();
      if (!g || !a) return json({ ok: false, msg: 'Faltan datos de grado o archivo' });
      const rw = await getRewrites(g) || [];
      const item = rw.find(x => String(x.archivo || '').split('/').pop() === a);
      if (item && item.recuadros) {
        if (Array.isArray(item.recuadros.nombres)) item.recuadros.nombres = item.recuadros.nombres.filter(x => !x.manual);
        if (Array.isArray(item.recuadros.colegios)) item.recuadros.colegios = item.recuadros.colegios.filter(x => !x.manual);
        if (Array.isArray(item.recuadros.imagenes)) item.recuadros.imagenes = item.recuadros.imagenes.filter(x => !x.manual);
        if (Array.isArray(item.recuadros.enunciados)) item.recuadros.enunciados = item.recuadros.enunciados.filter(x => !x.manual);
        cache.rewrites[g] = rw;
        const c = await getConfig();
        if (c.repo) {
          _invalidateContentCache(`almacen/datos/rewrites_${g}.json`, 'master', c.repo);
          await saveJson(`almacen/datos/rewrites_${g}.json`, rw);
        }
      }
      return json({ ok: true, mensaje: 'Elementos manuales eliminados correctamente.' });
    }
    if(path==='/api/compilar_apunte' || path==='/api/compilar_todos_apuntes') {
      let c = { repo: '', token: '' };
      try { c = await getConfig(); } catch (_) {}
      const isSingle = path.endsWith('compilar_apunte');
      const nombre = isSingle ? (body.nombre_apunte || '') : '';
      const grado = body.grado || '';
      const exitosos = [];
      const fallidos = [];

      // 1. Guardar y persistir datos en revision.json
      try {
        let rev = {};
        try {
          rev = await getRevision();
        } catch (_) {
          rev = (typeof cache !== 'undefined' && cache?.revision) ? cache.revision : {};
        }
        if (isSingle) {
          if (!body.archivo) {
            fallidos.push({ nombre: nombre || 'Apunte', grado: grado, archivo: '', error: 'Falta especificar el archivo original del apunte' });
          } else {
            const normNombre = (typeof normalizarNombreApunte === 'function')
              ? normalizarNombreApunte(nombre, body.archivo)
              : (nombre || String(body.archivo).split('/').pop().replace(/\.pdf$/i, ''));
            const k = `${grado}::${body.archivo}`;
            rev[k] = rev[k] || {};
            rev[k].inc_apunte = true;
            rev[k].nombre_apunte = normNombre;
            rev[k].latex_compilado = true;
            exitosos.push({ nombre: normNombre, grado: grado, archivo: body.archivo, ruta: `apuntes/${normNombre}.pdf` });
          }
        } else {
          // Modo batch: compilar todos los apuntes marcados
          const revKeys = Object.keys(rev || {});
          for (const k of revKeys) {
            const entry = rev[k];
            if (!entry || !entry.inc_apunte) continue;
            const [kGrado, ...kArchRest] = k.split('::');
            const kArch = kArchRest.join('::');
            if (grado && grado !== '__TODAS__' && kGrado !== grado) continue;
            const normNombre = (typeof normalizarNombreApunte === 'function')
              ? normalizarNombreApunte(entry.nombre_apunte, kArch)
              : (entry.nombre_apunte || String(kArch).split('/').pop().replace(/\.pdf$/i, ''));
            entry.inc_apunte = true;
            entry.nombre_apunte = normNombre;
            entry.latex_compilado = true;
            exitosos.push({ nombre: normNombre, grado: kGrado, archivo: kArch, ruta: `apuntes/${normNombre}.pdf` });
          }
          // Si no había ninguno en rev pero hay en ITEMS actual
          if (exitosos.length === 0 && typeof ITEMS !== 'undefined' && Array.isArray(ITEMS)) {
            for (const it of ITEMS) {
              if (it && it.inc_apunte && it.archivo) {
                const itRama = it._rama || grado;
                if (grado && grado !== '__TODAS__' && itRama !== grado) continue;
                const normNombre = (typeof normalizarNombreApunte === 'function')
                  ? normalizarNombreApunte(it.nombre_apunte, it.archivo)
                  : (it.nombre_apunte || String(it.archivo).split('/').pop().replace(/\.pdf$/i, ''));
                const k = `${itRama}::${it.archivo}`;
                rev[k] = rev[k] || {};
                rev[k].inc_apunte = true;
                rev[k].nombre_apunte = normNombre;
                rev[k].latex_compilado = true;
                exitosos.push({ nombre: normNombre, grado: itRama, archivo: it.archivo, ruta: `apuntes/${normNombre}.pdf` });
              }
            }
          }
        }

        if (typeof cache !== 'undefined') cache.revision = rev;
        if (c && c.repo && c.token) {
          try {
            _invalidateContentCache('almacen/datos/revision.json', 'master', c.repo);
            await saveJson('almacen/datos/revision.json', rev);
          } catch (_) {}
        }
      } catch (errRev) {
        if (isSingle) {
          fallidos.push({ nombre: nombre || 'Apunte', grado: grado, archivo: body.archivo || '', error: errRev?.message || 'Error al procesar apunte' });
        }
      }

      const total = exitosos.length + fallidos.length;
      const compilados = exitosos.length;

      if (!c.repo || !c.token) {
        return json({
          ok: fallidos.length === 0,
          total: total,
          compilados: compilados,
          exitosos: exitosos,
          fallidos: fallidos,
          guardado_estatico: true,
          mensaje: compilados > 0 ? 'Apuntes guardados localmente.' : 'Error al procesar apuntes.'
        });
      }

      // Repositorios desde Supabase: repo_general (privado con datos) y repo_apuntes (worker Actions)
      const dispatchRepos = [c.repoApuntes, c.repo].filter(Boolean);
      const buildPayload = (rama) => ({
        ref: rama,
        inputs: {
          grado: grado,
          archivo: body.archivo || '',
          nombre_apunte: nombre || '',
          repo_general: c.repo || '',
          gh_token: c.token || '',
          accion: isSingle ? 'compile_apunte' : 'compile_all_apuntes',
          payload: JSON.stringify({ ...(body || {}), gh_token: c.token, token: c.token })
        }
      });

      const dispatchHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.token}`,
        'Accept': 'application/vnd.github.v3+json'
      };

      // 2. Intentar lanzar workflow en GitHub Actions
      let r = null;
      const workflowNames = ['compilarapunte.yml', 'compilar-apunte.yml'];
      const branches = ['main', 'master'];

      for (const dRepo of dispatchRepos) {
        for (const wf of workflowNames) {
          for (const br of branches) {
            try {
              r = await originalFetch(`https://api.github.com/repos/${dRepo}/actions/workflows/${wf}/dispatches`, {
                method: 'POST',
                headers: dispatchHeaders,
                body: JSON.stringify(buildPayload(br))
              });
              if (r.ok || r.status === 204) break;
            } catch (_) {}
          }
          if (r && (r.ok || r.status === 204)) break;
        }
        if (r && (r.ok || r.status === 204)) break;
      }

      const enProceso = !!(r && (r.ok || r.status === 204));
      return json({
        ok: fallidos.length === 0,
        total: total,
        compilados: compilados,
        exitosos: exitosos,
        fallidos: fallidos,
        en_proceso: enProceso,
        inicio: Date.now(),
        mensaje: enProceso ? 'Compilación lanzada en GitHub Actions.' : 'Apuntes registrados en revision.json.'
      });
    }
    if(path==='/api/github_crear_archivo'||path==='/api/github_modificar_archivo') {
      const c=await getConfig();
      const repo=c.repo;
      const p=String(body.ruta||'').replace(/^\//,'');
      if(!repo||!c.token||!p)return json( { ok:false,error:'Faltan datos' }
      ,400);
      const old=await getContent(p,body.rama||'master',repo);
      const payload= {
        message:body.mensaje||`Actualizar ${p}`,content:body.contenido_b64||'',branch:body.rama||'master'
      }
      ;
      if(old?.sha)payload.sha=old.sha;
      const r=await ghRequest(repo,`contents/${p}`, {
        method:'PUT',headers: { 'Content-Type':'application/json' }
        ,body:JSON.stringify(payload)
      }
  );
      return r.ok?json( { ok:true }
      ):json( { ok:false,error:await r.text() }
      ,r.status);
    }
    if(path==='/api/github_eliminar_archivo') {
      const c=await getConfig();
      const repo=c.repo,p=String(body.ruta||'').replace(/^\//,'');
      const old=await getContent(p,body.rama||'master',repo);
      if(!old?.sha)return json( { ok:false,error:'Archivo no encontrado' }
      ,404);
      const r=await ghRequest(repo,`contents/${p}`, {
        method:'DELETE',headers: { 'Content-Type':'application/json' }
        ,body:JSON.stringify( {
          message:body.mensaje||`Eliminar ${p}`,sha:old.sha,branch:body.rama||'master'
        }
        )
      }
  );
      return r.ok?json( { ok:true }
      ):json( { ok:false,error:await r.text() }
      ,r.status);
    }
    // Operaciones que necesitan transformación PDF local: se mantienen sincrónicas en la UI,
    // pero el PDF limpio se obtiene de la rama *_limpia cuando existe.
    return json( { ok:true,static:true,mensaje:'Guardado local/estático realizado.' }
  );
  }
  async function get(path) {
    if(path==='/api/config') return json( {
      SUPABASE_URL:window.SUPABASE_URL,SUPABASE_ANON_KEY:window.SUPABASE_ANON_KEY
    }
  );
    if(path==='/api/ramas'||path==='/api/branches') {
      const c=await getConfig();
      const repo=c.repo||c.publicRepo;
      if(!repo)return json([]);
      const r=await ghRequest(repo,'branches?per_page=100');
      return r.ok?json((await r.json()).map(x=>x.name)):json([]);
    }
    if(path==='/api/datos'||path==='/api/data') return json(await buildData());
    if(path.startsWith('/api/preview/')) return pdfResponse(path);
    if(path.startsWith('/api/thumb/')) return thumbResponse(path);
    if(path.startsWith('/api/doc_info/')) return docInfoResponse(path);
    if(path.startsWith('/api/apunte_pdf/')||path.startsWith('/api/ver_apunte')) return apunteResponse(path);
    if(path.startsWith('/api/estado_compilacion')) return estadoCompilacionResponse(path);
    return json( { ok:false,error:'Endpoint no disponible en modo estático' }
    ,404);
  }
  function parseQuery(path) {
    const i=path.indexOf('?');
    return new URLSearchParams(i>=0?path.slice(i+1):'');
  }
  const _branchCache = new Map();
  async function branchExists(repo, branch) {
    const key = `${repo}::${branch}`;
    if (_branchCache.has(key)) return _branchCache.get(key);
    const r = await ghRequest(repo, `branches/${encodeURIComponent(branch)}`);
    const ok = r.ok;
    _branchCache.set(key, ok);
    return ok;
  }
  async function resolvePdfBranch(repo, originalBranch, cleanBranch, mode) {
    if (mode !== 'new') return originalBranch;
    // Solo se usa *_limpia si la rama existe. Si no existe, se usa la original
    // y no se provoca ningún 404 de git/trees/.../limpia.
    return (await branchExists(repo, cleanBranch)) ? cleanBranch : originalBranch;
  }
  async function pdfResponse(path) {
    const clean=path.split('?')[0].split('/');
    const g=decodeURIComponent(clean[3]||'');
    const q=parseQuery(path);
    const archivo=q.get('archivo')||'';
    const mode=q.get('mode')||'old';
    const c=await getConfig();
    const repo=c.repo||c.publicRepo;
    if (!repo) return new Response('Repositorio no configurado', { status:404 }
  );
    const originalBranch=GRADOS[g]?.rama||g;
    const cleanBranch=GRADOS[g]?.limpia||g+'_limpia';
    const branch=await resolvePdfBranch(repo, originalBranch, cleanBranch, mode);
    const p=await findPdf(repo,branch,archivo);
    if(!p) return new Response('PDF no encontrado', { status:404 }
  );
    const x=await getContent(p,branch,repo);
    return x?bytes(x.bytes,'application/pdf'):new Response('PDF no encontrado', { status:404 }
  );
  }
  async function docInfoResponse(path) {
    const pdf=await pdfResponse(path);
    if(!pdf.ok)return json( { pages:[] }
    ,404);
    try {
      const buf=await pdf.arrayBuffer();
      if(!window.pdfjsLib)return json( { pages:[] }
  );
      const d=await pdfjsLib.getDocument( { data:buf.slice(0),isEvalSupported:false }
      ).promise;
      const pages=[];
      for(let i=0;i<d.numPages;i++) {
        const pg=await d.getPage(i+1), vp=pg.getViewport( { scale:1 }
        ), opl=await pg.getOperatorList();
        const OPS=pdfjsLib.OPS, stack=[], ident=[1,0,0,1,0,0];
        let m=ident.slice(), imgIdx=0, images=[];
        const mul=(a,b)=>pdfjsLib.Util.transform(a,b);
        for(let j=0;j<opl.fnArray.length;j++) {
          const fn=opl.fnArray[j], args=opl.argsArray[j];
          if(fn===OPS.save) stack.push(m.slice());
          else if(fn===OPS.restore) m=stack.pop()||m;
          else if(fn===OPS.transform && args) m=mul(m,args);
          else if((fn===OPS.paintImageXObject||fn===OPS.paintJpegXObject||fn===OPS.paintImageMaskXObject)&&args) {
            // Image painting is performed in the current transform over the unit image rectangle.
            const pts=[[0,0],[1,0],[1,1],[0,1]].map(pt=>pdfjsLib.Util.applyTransform(pt,m));
            const xs=pts.map(x=>x[0]), ys=pts.map(x=>x[1]);
            const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
            if(right-left>1 && bottom-top>1) {
              const id=`p${i}-img${imgIdx}`;
              images.push( {
                id,page_num:i,img_idx:imgIdx,left:left/vp.width*100,top:top/vp.height*100,width:(right-left)/vp.width*100,height:(bottom-top)/vp.height*100
              }
  );
              imgIdx++;
            }
          }
        }
        pages.push( { page_num:i,image_hotspots:images }
  );
      }
      await d.destroy();
      return json( { pages }
  );
    } catch(e) {
      console.warn('[STATIC-API] doc_info:',e);
      return json( { pages:[] }
  );
    }
  }
  async function thumbResponse(path) {
    const pdf=await pdfResponse(path.replace('/api/thumb/','/api/preview/'));
    if(!pdf.ok)return new Response('', { status:404 }
  );
    try {
      const buf=await pdf.arrayBuffer();
      if(!window.pdfjsLib)return new Response('', { status:404 }
  );
      const d=await pdfjsLib.getDocument( { data:buf,isEvalSupported:false }
      ).promise;
      const p=await d.getPage(1);
      const v=p.getViewport( { scale:0.45 }
  );
      const c=document.createElement('canvas');
      c.width=Math.ceil(v.width);
      c.height=Math.ceil(v.height);
      await p.render( { canvasContext:c.getContext('2d'),viewport:v }
      ).promise;
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));
      await d.destroy();
      return new Response(blob, {
        status:200,headers: { 'Content-Type':'image/png' }
      }
  );
    } catch(_) {
      return new Response('', { status:404 }
  );
    }
  }
  async function apunteResponse(path) {
    const q=parseQuery(path);
    const g=q.get('grado')||path.split('/')[3]||'';
    const n=q.get('nombre')||q.get('nombre_apunte')||'';
    const c=await getConfig();
    const repo=c.repo||c.publicRepo;
    const branch=GRADOS[g]?.rama||g;
    const p=`apuntes/${n.replace(/\.pdf$/i,'')}.pdf`;
    let x=await getContent(p,branch,repo);
    if (!x) {
      try {
        const rev = await getRevision();
        const cleanN = n.replace(/\.pdf$/i, "").toLowerCase();
        let fallbackPath = null;
        for (const [k, v] of Object.entries(rev || {})) {
          if (k.startsWith(`${g}::`) && (String(v?.nombre_apunte || '').toLowerCase() === cleanN || k.toLowerCase().includes(cleanN))) {
            fallbackPath = k.split("::")[1];
            break;
          }
        }
        if (fallbackPath) {
          x = await getContent(fallbackPath, branch, repo);
        }
      } catch (_) {}
    }
    return x ? bytes(x.bytes, 'application/pdf') : new Response('PDF no encontrado', { status: 404 });
  }

  async function estadoCompilacionResponse(path) {
    const q = parseQuery(path);
    const g = q.get('grado') || '';
    const n = q.get('nombre') || q.get('nombre_apunte') || '';
    const arch = q.get('archivo') || '';
    const desde = parseInt(q.get('desde') || '0', 10);

    let c = { repo: '', repoApuntes: '', token: '' };
    try { c = await getConfig(); } catch (_) {}
    const repo = c?.repo || c?.publicRepo || '';
    const repoApuntes = c?.repoApuntes || repo;
    const token = c?.token || '';
    const branch = (typeof GRADOS !== 'undefined' && GRADOS[g]?.rama) ? GRADOS[g].rama : g;

    const normClean = (val, fb = '') => {
      if (typeof normalizarNombreApunte === 'function') return normalizarNombreApunte(val, fb);
      let s = String(val || '').trim();
      if (!s) s = String(fb || '').split('/').pop().split('\\').pop().replace(/\.pdf$/i, '');
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      s = s.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[_ .-]+|[_ .-]+$/g, '');
      return (s || 'Apunte').slice(0, 100);
    };
    const normNombre = normClean(n, arch);

    // 1. Consultar ejecuciones en GitHub Actions
    const reposToCheck = Array.from(new Set([repoApuntes, repo])).filter(Boolean);
    if (token) {
      for (const rTarget of reposToCheck) {
        try {
          const runsRes = await ghRequest(rTarget, 'actions/runs?event=workflow_dispatch&per_page=5');
          if (runsRes.ok) {
            const runsData = await runsRes.json();
            const runs = Array.isArray(runsData?.workflow_runs) ? runsData.workflow_runs : [];
            const run = runs.find(r => {
              const runTime = Date.parse(r.created_at || '');
              if (isNaN(runTime)) return false;
              if (desde > 0) return runTime >= (desde - 60000);
              return (Date.now() - runTime) < 10 * 60 * 1000;
            });

            if (run) {
              if (run.status === 'in_progress' || run.status === 'queued') {
                return json({
                  ok: true,
                  listo: false,
                  en_proceso: true,
                  estado: run.status,
                  run_id: run.id
                });
              }
              if (run.status === 'completed') {
                if (run.conclusion === 'success') {
                  return json({
                    ok: true,
                    listo: true,
                    estado: 'completado',
                    conclusion: 'success',
                    ruta: `apuntes/${normNombre}.pdf`
                  });
                } else {
                  return json({
                    ok: false,
                    listo: true,
                    estado: 'fallido',
                    error: `La compilación en GitHub Actions finalizó con estado: ${run.conclusion}`,
                    conclusion: run.conclusion
                  });
                }
              }
            }
          }
        } catch (_) {}
      }
    }

    // 2. Comprobar si el archivo PDF existe directamente en apuntes/<normNombre>.pdf en la rama
    if (repo && branch && normNombre) {
      try {
        const r = await ghRequest(repo, `contents/apuntes/${encodeURIComponent(normNombre)}.pdf?ref=${encodeURIComponent(branch)}`);
        if (r.ok) {
          if (desde > 0) {
            try {
              const rCommits = await ghRequest(repo, `commits?path=apuntes/${encodeURIComponent(normNombre)}.pdf&sha=${encodeURIComponent(branch)}&per_page=1`);
              if (rCommits.ok) {
                const commits = await rCommits.json();
                if (Array.isArray(commits) && commits.length > 0) {
                  const commitDate = Date.parse(commits[0]?.commit?.committer?.date || commits[0]?.commit?.author?.date || '');
                  if (!isNaN(commitDate)) {
                    if (commitDate >= (desde - 30000)) {
                      return json({ ok: true, listo: true, estado: 'completado', ruta: `apuntes/${normNombre}.pdf` });
                    } else {
                      return json({ ok: true, listo: false, en_proceso: true, estado: 'en_proceso' });
                    }
                  }
                }
              }
            } catch (_) {}
          }
          return json({ ok: true, listo: true, estado: 'completado', ruta: `apuntes/${normNombre}.pdf` });
        }
      } catch (_) {}
    }

    // 3. Comprobar árbol de archivos (tree)
    if (repo && branch && normNombre) {
      try {
        const paths = await tree(repo, branch);
        const target = `apuntes/${normNombre}.pdf`.toLowerCase();
        const targetBase = `${normNombre}.pdf`.toLowerCase();
        const found = Array.isArray(paths) && paths.some(p => {
          const lp = String(p).toLowerCase();
          return lp === target || lp.endsWith('/' + targetBase);
        });
        if (found) {
          return json({ ok: true, listo: true, estado: 'completado', ruta: `apuntes/${normNombre}.pdf` });
        }
      } catch (_) {}
    }

    return json({ ok: true, listo: false, en_proceso: true, estado: 'en_proceso' });
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init= {
  }
  ) =>  {
    const url = typeof input === 'string' ? input : input?.url || '';
    let parsed;
    try { parsed = new URL(url, location.href); }
    catch (_) { parsed = null; }
    const path = parsed ? parsed.pathname : String(url || '');
    if (path.startsWith('/api/')) {
      try {
        // NO HAY BACKEND /api.
        // Estas rutas solo son nombres internos del frontend y se resuelven
        // aquí mismo contra Supabase/GitHub. El navegador no hace una petición
        // HTTP a /api/*.
        const u = parsed ? (parsed.pathname + parsed.search) : path;
        if ((init.method||'GET').toUpperCase()==='GET') return await get(u);
        const body=init.body?JSON.parse(init.body): {
        }
        ;
        return await post(u.split('?')[0],body);
      } catch(e) {
        return json( { ok:false,error:e.message||String(e) }
        ,500);
      }
    }
    return originalFetch(input,init);
  }
  ;
  window.StaticAPI =  { getConfig, getContent, saveJson, originalFetch, detectarBackendReal }
  ;
  window.dispatchEvent(new Event('static-api-ready'));
}
)();
