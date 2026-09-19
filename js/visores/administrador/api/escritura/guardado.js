var _saveQueues = new Map();
function _invalidateContentCache(path, branch, repo) {
  const key = repo + "::" + branch + "::" + String(path || "").replace(/^\/+/, "");
  _contentCache.delete(key);
  try { window.__VISOR_ADMIN_CLEAR_API_CACHE?.(); } catch (_) {}
  // doc_info depende de revision/rewrites/nombres/colegios. Tras guardar
  // cualquiera de esos datos no se debe reutilizar un resultado antiguo.
  try { window.__VISOR_ADMIN_CLEAR_PERSISTENT_CACHE?.(); } catch (_) {}
}
async function saveJson(path, obj, branch = "master", repoOverride = "") {
  const c = await getConfig();
  const repo = repoOverride || c.repo;
  if (!repo || !c.token) throw new Error("Se necesita gh_repo_general y gh_token para guardar");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const queueKey = repo + "::" + branch + "::" + cleanPath;
  const anterior = _saveQueues.get(queueKey) || Promise.resolve();
  const trabajo = anterior.catch(() =>  {
  }
  ).then(async () =>  {
    const raw = JSON.stringify(obj, null, 2) + "\n";
    const encoded = btoa(unescape(encodeURIComponent(raw)));
    // IMPORTANTE: el SHA se obtiene SIEMPRE justo antes del PUT.
    // No reutilizamos el SHA cacheado porque otro visor/proceso puede haber
    // actualizado el archivo mientras esta pestaña seguía abierta.
    _invalidateContentCache(cleanPath, branch, repo);
    let old = await getContent(cleanPath, branch, repo);
    for (let intento = 0; intento < 3; intento++) {
      const payload =  {
        message: "Actualizar " + cleanPath + " desde Visor estático",
        content: encoded,
        branch
      }
      ;
      if (old?.sha) payload.sha = old.sha;
      const r = await ghRequest(repo, "contents/" + cleanPath,  {
        method: "PUT",
        headers:  { "Content-Type": "application/json" }
        ,
        body: JSON.stringify(payload)
      }
  );
      if (r.ok) {
        const result = await r.json();
        // El siguiente guardado debe volver a leer GitHub, nunca este SHA
        // potencialmente obsoleto.
        _invalidateContentCache(cleanPath, branch, repo);
        return result;
      }
      // GitHub devuelve 409 cuando el SHA ya no es el de la rama.
      // Refrescamos el SHA y reintentamos sin perder la operación.
      if (r.status === 409) {
        // Conflicto de versión: leer el SHA DIRECTAMENTE de Contents API,
        // sin depender del árbol/cache de la pestaña.
        _invalidateContentCache(cleanPath, branch, repo);
        try {
          const metaUrl = GH_API + '/repos/' + repo + '/contents/' +
          cleanPath.split('/').map(encodeURIComponent).join('/') +
          '?ref=' + encodeURIComponent(branch) + '&_=' + Date.now();
          const mr = await originalFetch(metaUrl,  { headers: ghHeaders(c.token), cache: 'no-store' }
  );
          if (mr.ok) {
            const md = await mr.json();
            old =  { sha: String(md?.sha || '') }
            ;
          } else {
            old = null;
          }
        } catch (_) {
          old = null;
        }
        await new Promise(resolve => setTimeout(resolve, 120 * (intento + 1)));
        continue;
      }
      const detalle = await r.text();
      throw new Error("GitHub HTTP " + r.status + ": " + detalle);
    }
    throw new Error("GitHub: el archivo cambió mientras se guardaba (409 Conflict). Inténtalo de nuevo.");
  }
  );
  _saveQueues.set(queueKey, trabajo);
  try { return await trabajo; }
  finally { if (_saveQueues.get(queueKey) === trabajo) _saveQueues.delete(queueKey); }
}
async function updateRevision(body) {
  const rev = await getRevision();
  const k = key(body.grado, body.archivo);
  rev[k] = rev[k] ||  {
  }
  ;
  if (body.campo === "inc") rev[k].include = !!body.valor;
  else if (body.campo === "int") rev[k].inc_interior = !!body.valor;
  else if (body.campo === "col") rev[k].inc_colegio = !!body.valor;
  else if (body.campo === "ren") rev[k].inc_renombre = !!body.valor;
  else if (body.campo === "internet") rev[k].inc_internet = !!body.valor;
  else if (body.campo === "imagenes") rev[k].inc_imagenes = !!body.valor;
  else if (body.campo === "apunte") rev[k].inc_apunte = !!body.valor;
  else if (body.campo === "nombre_apunte") rev[k].nombre_apunte = String(body.valor || "").trim();
  cache.revision = rev;
  try { _invalidateContentCache('almacen/datos/revision.json', 'master', (await getConfig()).repo); }
  catch (_) {
  }
  await saveJson("almacen/datos/revision.json", rev);
}
async function setDecision(body) {
  const rev = await getRevision();
  const k = key(body.grado, body.archivo);
  rev[k] = rev[k] ||  {
  }
  ;
  if (body.decision) rev[k].decision = body.decision;
  else delete rev[k].decision;
  cache.revision = rev;
  await saveJson("almacen/datos/revision.json", rev);
  return  { ok: true }
  ;
}
async function saveEnunciado(body, deleting = false) {
  const g = body.grado, a = String(body.archivo || '').split('/').pop();
  const tipo = String(body.tipo || '').toLowerCase();
  const esNombre = tipo === 'nombre';
  const esColegio = tipo === 'colegio';
  // NOMBRE y COLEGIO manuales NO son enunciados. Se guardan en recuadros
  // independientes para que tengan exactamente el mismo ciclo de vida que
  // un colegio detectado: crear -> redibujar -> eliminar recuadro.
  if (esNombre || esColegio) {
    const rw = await getRewrites(g);
    let item = rw.find(x => String(x.archivo || '').split('/').pop() === a);
    if (!item) {
      item =  { archivo: a, enunciados: [] }
      ;
      rw.push(item);
    }
    item.recuadros = item.recuadros ||  {
    }
    ;
    const clave = esNombre ? 'nombres' : 'colegios';
    const arr = Array.isArray(item.recuadros[clave]) ? item.recuadros[clave] : [];
    const id = body.hotspot_id != null ? String(body.hotspot_id) : '';
    let idx = id ? arr.findIndex(x => String(x.id) === id) : -1;
    if (idx < 0 && body.page_num != null) {
      const pg = Number(body.page_num);
      const txt = String(body.text || body.start || body.old || '').trim();
      idx = arr.findIndex(x => Number(x.page) === pg && txt && String(x.text || x.start || x.old || '').trim() === txt);
    }
    if (deleting || body.eliminar === true) {
      // Para ELIMINAR RECUADRO: se quita el recuadro manual, no se marca
      // como disabled. Esto es lo que debe ocurrir al crear uno nuevo.
      if (idx >= 0) arr.splice(idx, 1);
    } else {
      const rec = idx >= 0 ? arr[idx] :  { id: id || `${esNombre ? 'name' : 'school'}_manual_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, manual: true }
      ;
      rec.manual = true;
      rec.page = Number(body.page_num ?? body.page ?? rec.page ?? 0);
      rec.page_num = rec.page;
      rec.left = Number(body.left ?? body.pct_left ?? rec.left ?? 5);
      rec.top = Number(body.top ?? body.pct_top ?? rec.top ?? 5);
      rec.width = Number(body.width ?? body.pct_width ?? rec.width ?? (esNombre ? 30 : 40));
      rec.height = Number(body.height ?? body.pct_height ?? rec.height ?? (esNombre ? 4 : 6));
      rec.text = String(body.text || body.start || body.old || rec.text || '').trim();
      if (idx >= 0) arr[idx] = rec;
      else arr.push(rec);
    }
    item.recuadros[clave] = arr;
    cache.rewrites[g] = rw;
    try { _invalidateContentCache('almacen/datos/rewrites_' + g + '.json', 'master', (await getConfig()).repo); }
    catch (_) {
    }
    await saveJson('almacen/datos/rewrites_' + g + '.json', rw);
    return  { ok: true, archivo: a, grado: g }
    ;
  }
  const rw = await getRewrites(g);
  let item = rw.find(x => String(x.archivo || '').split('/').pop() === a);
  if (!item) {
    item =  { archivo: a, enunciados: [] }
    ;
    rw.push(item);
  }
  item.enunciados = item.enunciados || [];
  if (deleting) {
    const i = body.hotspot_id;
    if (Number.isInteger(i) && item.enunciados[i]) item.enunciados[i].include = false;
    else {
      const start = String(body.start || '').trim();
      const x = item.enunciados.find(e => String(e.start || e.old || '').trim() === start);
      if (x) x.include = false;
    }
  } else {
    const oldStart = String(body.old_start || '').trim();
    const newStart = String(body.start || '').trim();
    let x = null;
    if (Number.isInteger(body.hotspot_id) && item.enunciados[body.hotspot_id]) x = item.enunciados[body.hotspot_id];
    if (!x && oldStart) x = item.enunciados.find(e => String(e.start || e.old || '').trim() === oldStart);
    if (!x && newStart) x = item.enunciados.find(e => String(e.start || e.old || '').trim() === newStart);
    if (!x) {
      x =  { start: newStart, new: String(body.new_text || ''), include: true }
      ;
      item.enunciados.push(x);
    }
    x.start = newStart || x.start || oldStart;
    x.old = newStart || x.old || oldStart;
    x.new = String(body.new_text || '');
    x.include = true;
    if (body.page !== undefined && body.page !== null) x.page = Number(body.page);
    if (body.pct_top !== undefined && body.pct_top !== null) x.pct_top = Number(body.pct_top);
    if (body.pct_left !== undefined && body.pct_left !== null) x.pct_left = Number(body.pct_left);
    if (body.pct_width !== undefined && body.pct_width !== null) x.pct_width = Number(body.pct_width);
    if (body.pct_height !== undefined && body.pct_height !== null) x.pct_height = Number(body.pct_height);
    if (body.custom !== undefined) x.custom = !!body.custom;
  }
  cache.rewrites[g] = rw;
  try { _invalidateContentCache('almacen/datos/rewrites_' + g + '.json', 'master', (await getConfig()).repo); }
  catch (_) {
  }
  await saveJson('almacen/datos/rewrites_' + g + '.json', rw);
  return  { ok: true, archivo: a, grado: g }
  ;
}
async function extractBoxText(body) {
  try {
    const g = body.grado;
    const archivo = body.archivo;
    const pageNum = parseInt(body.page_num || 0, 10);
    const l = parseFloat(body.left || 0);
    const t = parseFloat(body.top || 0);
    const w = parseFloat(body.width || 100);
    const h = parseFloat(body.height || 100);
    const rPdf = await pdfResponse("/api/preview/" + encodeURIComponent(g) + "?archivo=" + encodeURIComponent(archivo) + "&mode=old");
    if (rPdf && rPdf.ok && window.MuPDFCore) {
      const buf = await rPdf.arrayBuffer();
      const opened = await window.MuPDFCore.abrirMuPDF(buf);
      const doc = opened.doc;
      if (pageNum < doc.countPages()) {
        const page = doc.loadPage(pageNum);
        const viewport = window.MuPDFCore.viewportMuPDF(page, 1.0);
        const textContent = await window.MuPDFCore.textoMuPDF(page, 1.0);
        const pW = viewport.width, pH = viewport.height;
        // Geometría real de las líneas del PDF. Los hotspots de ENUNCIADOS
        // de la izquierda deben quedar sobre el texto real, igual que los de
        // Nombre y Colegio; nunca usamos por defecto un rectángulo 5%-90% si
        // podemos localizar el enunciado en esta página.
        let lineasEnunciado = [];
        try {
          if (typeof extraerLineasTexto === "function") {
            lineasEnunciado = await extraerLineasTexto(page, viewport) || [];
          }
        } catch (_) {
          lineasEnunciado = [];
        }
        const normHotspot = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase();
        const localizarLineaEnunciado = objetivo =>  {
          const q = normHotspot(objetivo);
          if (!q || /^\[/.test(q)) return null;
          return lineasEnunciado.find(l =>  {
            const t = normHotspot(l?.texto || "");
            return t && (t.includes(q) || q.includes(t));
          }
          ) || null;
        }
        ;
        const hotspotDesdeLinea = (linea, fallback =  {
        }
        ) =>  {
          if (!linea) return  { ...fallback }
          ;
          const pad = 2;
          return  {
            ...fallback,
            left: Math.max(0, ((Number(linea.left) - pad) / pW) * 100),
            top: Math.max(0, ((Number(linea.top) - pad) / pH) * 100),
            width: Math.min(100, ((Number(linea.right) - Number(linea.left) + pad * 2) / pW) * 100),
            height: Math.min(100, ((Number(linea.bottom) - Number(linea.top) + pad * 2) / pH) * 100)
          }
          ;
        }
        ;
        // Los hotspots y MuPDF StructuredText comparten origen arriba-izquierda.
        // No invertir Y aquí: hacerlo era la causa de hotspots desplazados.
        const xMin = (l / 100) * pW - 6;
        const xMax = ((l + w) / 100) * pW + 6;
        const yMinTop = (t / 100) * pH - 6;
        const yMaxTop = ((t + h) / 100) * pH + 6;
        const matched = [];
        for (const item of textContent.items) { const bb = item.bbox ||  { }
          ;
          const tx = Number(bb.left ?? item.left ?? item.transform?.[4] ?? 0);
          const ty = Number(bb.top ?? item.top ?? 0);
          const itemBottom = Number(bb.bottom ?? item.bottom ?? (ty + Number(item.height || 12)));
          if (tx >= xMin && tx <= xMax && itemBottom >= yMinTop && ty <= yMaxTop) {
            if (item.str && item.str.trim()) matched.push(item.str);
          }
        }
        if (matched.length > 0) return  { ok: true, text: matched.join(" ").trim() }
        ;
      }
    }
  } catch (_) {
  }
  return  { ok: true, text: "" }
  ;
}
async function _guardarRevisionImagen(body, accion, ruta = '', cita = '') {
  // Siempre partimos de revision.json fresco para no perder acciones de otra
  // pestaña y asegurar que la acción explícita llegue a GitHub.
  let rev =  {
  }
  ;
  try {
    const fresco = await cargarJsonDeRepositorio('almacen/datos/revision.json', 'master');
    rev = (fresco && typeof fresco === 'object') ? fresco :  {
    }
    ;
  } catch (_) {
    rev = await getRevision();
  }
  const g = String(body.grado || '').trim();
  const a = String(body.archivo || '').split('/').pop();
  const k = key(g, a);
  rev[k] = rev[k] ||  {
  }
  ;
  rev[k].imagenes = rev[k].imagenes ||  {
  }
  ;
  const id = String(body.img_id || `p${Number(body.page_num)||0}_img${Number(body.img_idx)||0}`);
  if (!accion) delete rev[k].imagenes[id];
  else rev[k].imagenes[id] =  { ...(rev[k].imagenes[id] ||  { }
    ),
    accion, ruta: ruta || null, cita: cita || null,
    page_num: Number(body.page_num || 0), img_idx: Number(body.img_idx || 0),
    auto_internet: !!body.auto_internet,
    manual: !!body.manual
  }
  ;
  cache.revision = rev;
  try { _invalidateContentCache('almacen/datos/revision.json', 'master', (await getConfig()).repo); }
  catch (_) {
  }
  await saveJson('almacen/datos/revision.json', rev);
  return  { ok:true }
  ;
}
async function hotspotAction(body) {
  const tipo = String(body.tipo || '').toLowerCase();
  const accion = String(body.accion || '').toLowerCase();
  if (!['nombre','colegio'].includes(tipo) || !['eliminar','conservar'].includes(accion)) return  {
    ok:false,msg:'Acción no válida.'
  }
  ;
  const rev = await getRevision();
  const g = String(body.grado || '').trim();
  const a = String(body.archivo || '').split('/').pop();
  const k = key(g,a);
  rev[k] = rev[k] ||  {
  }
  ;
  const campo = tipo === 'nombre' ? 'acciones_nombre' : 'acciones_colegio';
  rev[k][campo] = rev[k][campo] ||  {
  }
  ;
  const id = String(body.hotspot_id || body.id || 'default');
  if (accion === 'eliminar') rev[k][campo][id] =  { accion:'eliminar', page_num:Number(body.page_num||0) }
  ;
  else delete rev[k][campo][id];
  cache.revision = rev;
  try { _invalidateContentCache('almacen/datos/revision.json','master',(await getConfig()).repo); }
  catch (_) {
  }
  await saveJson('almacen/datos/revision.json', rev);
  return  { ok:true }
  ;
}
async function imageAction(body) {
  const act = String(body.accion || '').toLowerCase();
  if (!['borrar','conservar','reemplazar','restaurar'].includes(act)) return  {
    ok:false,msg:'Acción de imagen no válida.'
  }
  ;
  if (act === 'restaurar') return _guardarRevisionImagen(body, null);
  if (body.global) {
    const listas = await cargarJsonDeRepositorio('almacen/datos/imagenes_borrar_globales.json','master') || [];
    const arr = Array.isArray(listas) ? listas : [];
    const signature = String(body.signature || body.cita || body.img_id || '');
    const filtrada = arr.filter(x => String(x?.signature || x?.id || '') !== signature);
    if (act === 'borrar' || act === 'conservar') filtrada.push( {
      signature, accion:act, ruta:body.ruta || null, cita:body.cita || null
    }
  );
    await saveJson('almacen/datos/imagenes_borrar_globales.json', filtrada);
  }
  return _guardarRevisionImagen(body, act, body.ruta || '', body.cita || '');
}
async function clearImageActions(body) { return _guardarRevisionImagen(body, null); }
async function uploadImage(body) {
  const c = await getConfig();
  const g = String(body.grado || '').trim();
  const a = String(body.archivo || '').split('/').pop();
  if (!g || !a || !body.datos_base64) return  { ok:false,msg:'Faltan datos para subir la imagen.' }
  ;
  const raw = String(body.datos_base64);
  const m = raw.match(/^data:([^;]+);base64,(.*)$/s);
  const mime = m ? m[1] : 'application/octet-stream';
  const b64 = m ? m[2] : raw;
  const ext = (String(body.nombre_imagen || 'imagen.bin').split('.').pop() || 'bin').replace(/[^a-z0-9]/gi,'').toLowerCase() || 'bin';
  const safe = (String(body.nombre_imagen || 'imagen').replace(/[^a-z0-9._-]+/gi,'_').replace(/_+/g,'_').slice(0,90) || 'imagen');
  const ruta = `almacen/imagenes/${Date.now()}_${safe}`;
  const payload =  { message:'Subir reemplazo de imagen desde Visor estático',content:b64,branch:'master' }
  ;
  const r = await ghRequest(c.repo, 'contents/' + ruta,  {
    method:'PUT', headers: { 'Content-Type':'application/json' }
    , body:JSON.stringify(payload)
  }
  );
  if (!r.ok) return  { ok:false,msg:'GitHub HTTP '+r.status }
  ;
  return  { ok:true,ruta,mime }
  ;
}
async function imageAsset(path) {
  const q = parseQuery(path);
  const g = String(q.get('grado') || '').trim();
  const ruta = String(q.get('ruta') || '').replace(/^\/+/, '');
  if (!g || !ruta) return new Response('Imagen no encontrada',  { status:404 }
  );
  const c = await getConfig();
  const x = await getContent(ruta, 'master', c.repo);
  if (!x) return new Response('Imagen no encontrada',  { status:404 }
  );
  let mime = 'application/octet-stream';
  if (/\.png$/i.test(ruta)) mime='image/png';
  else if (/\.jpe?g$/i.test(ruta)) mime='image/jpeg';
  else if (/\.webp$/i.test(ruta)) mime='image/webp';
  else if (/\.gif$/i.test(ruta)) mime='image/gif';
  return bytes(x.bytes, mime);
}
async function checkImageInternet(body) {
  const url = String(body.url || body.cita || body.ruta || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return  { ok:true, existe_en_internet:false, detalles:'No hay una URL pública asociada a la imagen para realizar una comprobación automática.' }
    ;
  }
  try {
    const r = await originalFetch(url,  { method:'HEAD', mode:'cors' }
  );
    return  { ok:true, existe_en_internet:r.ok, detalles:r.ok?'La URL responde correctamente.':'La URL no responde correctamente.', fuentes:[url] }
    ;
  } catch (_) {
    return  { ok:true, existe_en_internet:false, detalles:'No se pudo comprobar la URL desde el navegador.', fuentes:[url] }
    ;
  }
}
async function limpiarDatosRevision(body) {
  const gParam = String(body?.grado || '').trim();
  const isSingleBranch = gParam && gParam !== '__TODAS__' && gParam !== 'TODAS_LAS_RAMAS_' && gParam !== 'TODAS LAS RAMAS';
  const targetGrados = isSingleBranch ? [gParam] : Object.keys(GRADOS);

  const eliminarEnunciados = !!body?.eliminar_enunciados;
  const eliminarNombres = !!body?.eliminar_nombres;
  const eliminarColegios = !!body?.eliminar_colegios;
  const eliminarImagenes = !!body?.eliminar_imagenes;
  const eliminarTodo = eliminarEnunciados && eliminarNombres && eliminarColegios && eliminarImagenes;

  // 1. Limpiar revision.json
  let rev = (cache.revision && typeof cache.revision === 'object') ? cache.revision : {};
  if (body?.sync_github) {
    try {
      const fresco = await cargarJsonDeRepositorio('almacen/datos/revision.json', 'master');
      if (fresco && typeof fresco === 'object') rev = fresco;
    } catch (_) {
      try {
        const r = await getRevision();
        if (r && typeof r === 'object') rev = r;
      } catch (_) {}
    }
  } else if (!cache.revision) {
    try {
      const r = await getRevision();
      if (r && typeof r === 'object') rev = r;
    } catch (_) {}
  }

  for (const k of Object.keys(rev)) {
    let kGrado = '';
    if (k.includes('::')) {
      kGrado = k.split('::')[0];
    }
    const matches = !isSingleBranch || kGrado === gParam || (kGrado === '' && isSingleBranch);
    if (!matches) continue;

    const entry = rev[k];
    if (!entry || typeof entry !== 'object') {
      if (eliminarTodo) delete rev[k];
      continue;
    }

    if (eliminarTodo) {
      delete rev[k];
      continue;
    }

    if (eliminarEnunciados) {
      delete entry.include;
      delete entry.enunciados;
      delete entry.enunciado_custom;
      delete entry.enunciado;
      if (entry.recuadros) delete entry.recuadros.enunciados;
    }

    if (eliminarNombres) {
      delete entry.inc_interior;
      delete entry.inc_renombre;
      delete entry.acciones_nombre;
      if (entry.recuadros) {
        delete entry.recuadros.nombres;
        delete entry.recuadros.nombre;
      }
    }

    if (eliminarColegios) {
      delete entry.inc_colegio;
      delete entry.acciones_colegio;
      if (entry.recuadros) {
        delete entry.recuadros.colegios;
        delete entry.recuadros.colegio;
      }
    }

    if (eliminarImagenes) {
      delete entry.imagenes;
      delete entry.inc_imagenes;
      delete entry.inc_internet;
      if (entry.recuadros) {
        delete entry.recuadros.imagenes;
        delete entry.recuadros.imagen;
      }
    }

    if (entry.recuadros && Object.keys(entry.recuadros).length === 0) {
      delete entry.recuadros;
    }

    if (Object.keys(entry).length === 0) {
      delete rev[k];
    }
  }

  cache.revision = rev;

  // 2. Limpiar rewrites_<grado>.json para cada grado afectado
  for (const g of targetGrados) {
    let rw = Array.isArray(cache.rewrites[g]) ? cache.rewrites[g] : [];
    if (body?.sync_github || !cache.rewrites[g]) {
      try {
        const r = await getRewrites(g);
        if (Array.isArray(r)) rw = r;
      } catch (_) {}
    }
    if (!Array.isArray(rw)) rw = [];

    if (eliminarTodo) {
      rw = [];
    } else {
      for (const item of rw) {
        if (!item || typeof item !== 'object') continue;

        if (eliminarEnunciados) {
          item.enunciados = [];
          item.old = "";
          item.new = "";
          item.start = "";
          item.end = "";
          delete item.include;
          delete item.custom;
          if (item.recuadros) delete item.recuadros.enunciados;
        }

        if (eliminarNombres && item.recuadros) {
          delete item.recuadros.nombres;
          delete item.recuadros.nombre;
        }

        if (eliminarColegios && item.recuadros) {
          delete item.recuadros.colegios;
          delete item.recuadros.colegio;
        }

        if (eliminarImagenes && item.recuadros) {
          delete item.recuadros.imagenes;
          delete item.recuadros.imagen;
        }

        if (item.recuadros && Object.keys(item.recuadros).length === 0) {
          delete item.recuadros;
        }
      }

      rw = rw.filter(item => {
        const hasEnunciados = Array.isArray(item.enunciados) && item.enunciados.length > 0;
        const hasRecuadros = item.recuadros && Object.keys(item.recuadros).length > 0;
        const hasText = Boolean(item.start || item.new || item.old);
        return hasEnunciados || hasRecuadros || hasText;
      });
    }

    cache.rewrites[g] = rw;

    if (body?.sync_github) {
      try {
        const repo = (await getConfig())?.repo;
        if (repo) {
          _invalidateContentCache('almacen/datos/rewrites_' + g + '.json', 'master', repo);
          await saveJson('almacen/datos/rewrites_' + g + '.json', rw);
        }
      } catch (errRw) {
        console.warn(`[limpiarDatosRevision] No se pudo guardar rewrites_${g}.json:`, errRw);
        throw errRw;
      }
    }
  }

  // 3. Guardar revision.json si sync_github está activo
  if (body?.sync_github) {
    try {
      const repo = (await getConfig())?.repo;
      if (repo) {
        _invalidateContentCache('almacen/datos/revision.json', 'master', repo);
        await saveJson('almacen/datos/revision.json', rev);
      }
    } catch (errRev) {
      console.warn('[limpiarDatosRevision] No se pudo guardar revision.json:', errRev);
      throw errRev;
    }
  }

  try { window.__VISOR_ADMIN_CLEAR_API_CACHE?.(); } catch (_) {}
  try { window.__VISOR_ADMIN_CLEAR_PERSISTENT_CACHE?.(); } catch (_) {}

  return { ok: true, mensaje: "Datos de revisión limpiados correctamente." };
}

async function eliminarApunte(body) {
  const c = await getConfig();
  if (!c.repo || !c.token) throw new Error("Se necesita gh_repo_general y gh_token para eliminar.");
  const grado = String(body.grado || "").trim();
  const archivo = String(body.archivo || "").trim();
  const a = archivo.split("/").pop();
  const nombre = String(body.nombre_apunte || "").trim();
  const normNombre = (typeof normalizarNombreApunte === "function")
    ? normalizarNombreApunte(nombre, a)
    : (nombre || a.replace(/\.pdf$/i, ""));

  // 1. Borrar PDFs compilados y residuales en la rama del grado
  if (body.borrar_pdfs !== false && grado) {
    const candidatos = [
      `apuntes/${normNombre}.pdf`,
      `apuntes/${nombre}.pdf`,
      `apuntes/${normNombre}.tex`,
      `apuntes/${normNombre}.txt`
    ];
    const unicos = [...new Set(candidatos)];
    for (const ruta of unicos) {
      try {
        const metaUrl = GH_API + "/repos/" + c.repo + "/contents/" +
          ruta.split("/").map(encodeURIComponent).join("/") +
          "?ref=" + encodeURIComponent(grado) + "&_=" + Date.now();
        const mr = await originalFetch(metaUrl, { headers: ghHeaders(c.token), cache: "no-store" });
        if (mr.ok) {
          const md = await mr.json();
          if (md && md.sha) {
            await ghRequest(c.repo, "contents/" + ruta, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: `Eliminar apunte ${normNombre} desde Visor`,
                sha: md.sha,
                branch: grado
              })
            });
            _invalidateContentCache(ruta, grado, c.repo);
          }
        }
      } catch (errDel) {
        console.warn(`[eliminarApunte] Error al borrar ${ruta}:`, errDel);
      }
    }
  }

  // 2. Actualizar revision.json en master
  try {
    let rev = {};
    try {
      const fresco = await cargarJsonDeRepositorio("almacen/datos/revision.json", "master");
      if (fresco && typeof fresco === "object") rev = fresco;
      else rev = await getRevision();
    } catch (_) {
      rev = await getRevision();
    }

    const k = key(grado, a);
    if (rev[k]) {
      rev[k].inc_apunte = false;
      delete rev[k].latex_compilado;
    }
    for (const clave of Object.keys(rev || {})) {
      if (clave.startsWith(grado + "::")) {
        const entry = rev[clave];
        if (entry && (entry.nombre_apunte === normNombre || entry.nombre_apunte === nombre)) {
          entry.inc_apunte = false;
          delete entry.latex_compilado;
        }
      }
    }
    cache.revision = rev;
    _invalidateContentCache("almacen/datos/revision.json", "master", c.repo);
    await saveJson("almacen/datos/revision.json", rev);
  } catch (errRev) {
    console.warn("[eliminarApunte] Error actualizando revision.json:", errRev);
  }

  // 3. Sincronizar estado local en memoria
  try {
    if (typeof ITEMS !== "undefined" && Array.isArray(ITEMS)) {
      for (const it of ITEMS) {
        if (it && (it.archivo === a || it.archivo === archivo)) {
          it.inc_apunte = false;
          it.latex_compilado = false;
        }
      }
    }
    if (typeof DATA !== "undefined" && DATA[grado]) {
      const origE = (DATA[grado].entries || []).find(x => x.archivo === a || x.archivo === archivo);
      if (origE) { origE.inc_apunte = false; origE.latex_compilado = false; }
      const origN = (DATA[grado].no_cambian || []).find(x => x.archivo === a || x.archivo === archivo);
      if (origN) { origN.inc_apunte = false; origN.latex_compilado = false; }
    }
  } catch (_) {}

  return { ok: true, mensaje: "Apunte eliminado correctamente de GitHub." };
}

async function quitarManual(body) {
  const g = String(body.grado || "").trim();
  const a = String(body.archivo || "").split("/").pop();
  if (!g || !a) return { ok: false, msg: "Faltan datos de grado o archivo" };
  const rw = await getRewrites(g) || [];
  const item = rw.find(x => String(x.archivo || "").split("/").pop() === a);
  if (item && item.recuadros) {
    if (Array.isArray(item.recuadros.nombres)) {
      item.recuadros.nombres = item.recuadros.nombres.filter(x => !x.manual);
    }
    if (Array.isArray(item.recuadros.colegios)) {
      item.recuadros.colegios = item.recuadros.colegios.filter(x => !x.manual);
    }
    if (Array.isArray(item.recuadros.imagenes)) {
      item.recuadros.imagenes = item.recuadros.imagenes.filter(x => !x.manual);
    }
    if (Array.isArray(item.recuadros.enunciados)) {
      item.recuadros.enunciados = item.recuadros.enunciados.filter(x => !x.manual);
    }
    cache.rewrites[g] = rw;
    const c = await getConfig();
    if (c.repo) {
      _invalidateContentCache(`almacen/datos/rewrites_${g}.json`, "master", c.repo);
      await saveJson(`almacen/datos/rewrites_${g}.json`, rw);
    }
  }
  return { ok: true, mensaje: "Elementos manuales eliminados correctamente." };
}

async function post(path, body) {
  if (path === "/api/update_flags") return updateRevision(body).then(() => json( { ok: true }
  ));
  if (path === "/api/set_decision" || path === "/api/visto") {
    if (path === "/api/visto") body.decision = body.decision || "";
    if (path === "/api/visto") body.campo = "visto";
    if (path === "/api/visto") {
      const rev = await getRevision();
      const k = key(body.grado, body.archivo);
      rev[k] = rev[k] ||  {
      }
      ;
      rev[k].visto = !!body.visto;
      if (body.decision) rev[k].decision = body.decision;
      cache.revision = rev;
      await saveJson("almacen/datos/revision.json", rev);
      return json( { ok: true }
  );
    }
    return setDecision(body).then(x => json(x));
  }
  if (path === "/api/extract_box_text") return extractBoxText(body).then(x => json(x));
  if (path === "/api/save_enunciado") return saveEnunciado(body, false).then(x => json(x));
  if (path === "/api/delete_enunciado") return saveEnunciado(body, true).then(x => json(x));
  if (path === "/api/recuadro") return saveEnunciado( { ...body, start: body.text || body.start || "" }
  , !!body.eliminar).then(x => json(x));
  if (path === "/api/reset_item") {
    const rw = await getRewrites(body.grado);
    const a = String(body.archivo || "").split("/").pop();
    const i = rw.findIndex(x => String(x.archivo || "").split("/").pop() === a);
    if (i >= 0) rw.splice(i, 1);
    cache.rewrites[body.grado] = rw;
    await saveJson("almacen/datos/rewrites_" + body.grado + ".json", rw);
    return json( { ok: true }
  );
  }
  if (path === "/api/github_pull") return json( { ok: true, mensaje: "Sincronización directa con gh_repo_general activa." }
  );
  if (path === "/api/github_push") return json( { ok: true, mensaje: "Cambios guardados directamente en gh_repo_general." }
  );
  if (path === "/api/apply_single_file" || path === "/api/apply_single_real") return json( {
    ok: false, static: true, msg: "Esta operación de servidor ya no forma parte de la versión estática."
  }
  , 501);
  if (path === "/api/aplicar" || path === "/api/apply") return json( {
    ok: false, static: true, msg: "Esta operación de servidor ya no forma parte de la versión estática."
  }
  , 501);
  if (path === "/api/quitar_manual" || path === "/api/remove_manual") return quitarManual(body).then(x => json(x)).catch(err => json({ ok: false, error: err?.message || "Error al quitar manual" }, 500));
  if (path === "/api/eliminar_apunte") return eliminarApunte(body).then(x => json(x)).catch(err => json({ ok: false, error: err?.message || "Error al eliminar apunte" }, 500));
  if (path === "/api/limpiar_datos_revision" || path === "/api/clean_revision_data") return limpiarDatosRevision(body).then(x => json(x)).catch(err => json({ ok: false, error: err?.message || "Error al limpiar datos" }, 500));
  if (path === "/api/hotspot_action") return hotspotAction(body).then(x => json(x));
  if (path === "/api/image_action") return imageAction(body).then(x => json(x));
  if (path === "/api/upload_image") return uploadImage(body).then(x => json(x));
  if (path === "/api/check_image_internet") return checkImageInternet(body).then(x => json(x));
  if (path === "/api/clear_image_actions") return clearImageActions(body).then(x => json(x));
  if (path === "/api/compilar_apunte" || path === "/api/compilar_todos_apuntes") {
    let c = { repo: "", token: "" };
    try { c = await getConfig(); } catch (_) {}
    const isSingle = path.endsWith("compilar_apunte");
    const nombre = isSingle ? (body.nombre_apunte || "") : "";
    const grado = body.grado || "";
    const exitosos = [];
    const fallidos = [];

    // 1. Guardar y persistir datos en revision.json
    try {
      let rev = {};
      try {
        rev = await getRevision();
      } catch (_) {
        rev = (typeof cache !== "undefined" && cache?.revision) ? cache.revision : {};
      }
      if (isSingle) {
        if (!body.archivo) {
          fallidos.push({ nombre: nombre || "Apunte", grado: grado, archivo: "", error: "Falta especificar el archivo original del apunte" });
        } else {
          const normNombre = (typeof normalizarNombreApunte === "function")
            ? normalizarNombreApunte(nombre, body.archivo)
            : (nombre || String(body.archivo).split("/").pop().replace(/\.pdf$/i, ""));
          const k = key(grado, body.archivo);
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
          const [kGrado, ...kArchRest] = k.split("::");
          const kArch = kArchRest.join("::");
          if (grado && grado !== "__TODAS__" && kGrado !== grado) continue;
          const normNombre = (typeof normalizarNombreApunte === "function")
            ? normalizarNombreApunte(entry.nombre_apunte, kArch)
            : (entry.nombre_apunte || String(kArch).split("/").pop().replace(/\.pdf$/i, ""));
          entry.inc_apunte = true;
          entry.nombre_apunte = normNombre;
          entry.latex_compilado = true;
          exitosos.push({ nombre: normNombre, grado: kGrado, archivo: kArch, ruta: `apuntes/${normNombre}.pdf` });
        }
        // Si no había ninguno en rev pero hay en ITEMS actual
        if (exitosos.length === 0 && typeof ITEMS !== "undefined" && Array.isArray(ITEMS)) {
          for (const it of ITEMS) {
            if (it && it.inc_apunte && it.archivo) {
              const itRama = it._rama || grado;
              if (grado && grado !== "__TODAS__" && itRama !== grado) continue;
              const normNombre = (typeof normalizarNombreApunte === "function")
                ? normalizarNombreApunte(it.nombre_apunte, it.archivo)
                : (it.nombre_apunte || String(it.archivo).split("/").pop().replace(/\.pdf$/i, ""));
              const k = key(itRama, it.archivo);
              rev[k] = rev[k] || {};
              rev[k].inc_apunte = true;
              rev[k].nombre_apunte = normNombre;
              rev[k].latex_compilado = true;
              exitosos.push({ nombre: normNombre, grado: itRama, archivo: it.archivo, ruta: `apuntes/${normNombre}.pdf` });
            }
          }
        }
      }

      if (typeof cache !== "undefined") cache.revision = rev;
      if (c && c.repo && c.token) {
        try {
          _invalidateContentCache('almacen/datos/revision.json', 'master', c.repo);
          await saveJson("almacen/datos/revision.json", rev);
        } catch (_) {}
      }
    } catch (errRev) {
      if (isSingle) {
        fallidos.push({ nombre: nombre || "Apunte", grado: grado, archivo: body.archivo || "", error: errRev?.message || "Error al procesar apunte" });
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
        mensaje: compilados > 0 ? "Apuntes guardados localmente." : "Error al procesar apuntes."
      });
    }

    // Repositorios desde Supabase: repo_general (privado con datos) y repo_apuntes (worker Actions)
    const dispatchRepos = [c.repoApuntes, c.repo].filter(Boolean);
    const buildPayload = (rama) => ({
      ref: rama,
      inputs: {
        grado: grado,
        archivo: body.archivo || "",
        nombre_apunte: nombre || "",
        repo_general: c.repo || "",
        gh_token: c.token || "",
        accion: isSingle ? "compile_apunte" : "compile_all_apuntes",
        payload: JSON.stringify({ ...(body || {}), gh_token: c.token, token: c.token })
      }
    });

    const dispatchHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${c.token}`,
      "Accept": "application/vnd.github.v3+json"
    };

    // 2. Intentar lanzar workflow en GitHub Actions
    let r = null;
    const workflowNames = ["compilarapunte.yml", "compilar-apunte.yml"];
    const branches = ["main", "master"];

    for (const dRepo of dispatchRepos) {
      for (const wf of workflowNames) {
        for (const br of branches) {
          try {
            r = await originalFetch(`https://api.github.com/repos/${dRepo}/actions/workflows/${wf}/dispatches`, {
              method: "POST",
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
      mensaje: enProceso ? "Compilación lanzada en GitHub Actions." : "Apuntes registrados en revision.json."
    });
  }
  return json( { ok: true, static: true, mensaje: "Guardado local/estático realizado." }
  );
}
