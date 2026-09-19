async function get(path) {
  if (path === "/api/config") return json( {
    SUPABASE_URL: window.SUPABASE_URL, SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY
  }
  );
  if (path === "/api/ramas" || path === "/api/branches") {
    const c = await getConfig();
    const repo = c.repo;
    if (!repo) return json([]);
    const r = await ghRequest(repo, "branches?per_page=100");
    return r.ok ? json((await r.json()).map(x => x.name)) : json([]);
  }
  if (path === "/api/datos" || path === "/api/data") return json(await buildData());
  if (path.startsWith("/api/datos_rama")) {
    const q = parseQuery(path);
    const rama = String(q.get("rama") || "").trim();
    return rama ? json(await buildData(rama)) : json( {
    }
  );
  }
  // Búsqueda directa: pide al servidor (GitHub) solo los archivos que
  // coinciden con "q", sin construir/precargar la rama entera.
  if (path.startsWith("/api/buscar_archivos")) {
    const q = parseQuery(path);
    const rama = String(q.get("rama") || "").trim();
    const texto = String(q.get("q") || "").trim();
    return (rama && texto) ? json(await buildData(rama, texto)) : json( {
    }
  );
  }
  if (path.startsWith("/api/preview/")) return pdfResponse(path);
  if (path.startsWith("/api/thumb/")) return thumbResponse(path);
  if (path.startsWith("/api/doc_info/")) return docInfoResponse(path);
  if (path.startsWith("/api/image_asset")) return imageAsset(path);
  if (path.startsWith("/api/apunte_pdf/") || path.startsWith("/api/ver_apunte")) return apunteResponse(path);
  if (path.startsWith("/api/estado_compilacion")) return estadoCompilacionResponse(path);
  return json( { ok: false, error: "Endpoint no disponible en modo estático" }
  , 404);
}
function parseQuery(path) {
  const i = path.indexOf("?");
  return new URLSearchParams(i >= 0 ? path.slice(i + 1) : "");
}
async function pdfResponse(path) {
  const clean = path.split("?")[0].split("/");
  const g = decodeURIComponent(clean[3] || "");
  const q = parseQuery(path);
  const archivo = q.get("archivo") || "";
  const mode = q.get("mode") || "old";
  const c = await getConfig();
  const repo = c.repo;
  if (!g || !archivo) return new Response("PDF no encontrado",  { status: 404 }
  );
  const ramaOriginal = GRADOS[g]?.rama || g;
  const ramaLimpia = GRADOS[g]?.limpia || (g + "_limpia");
  let branch = ramaOriginal;
  if (mode === "new" && await ramaExiste(repo, ramaLimpia)) branch = ramaLimpia;
  // 1. Encontrar la ruta real del PDF en el árbol de GitHub
  let realPath = await findPdf(repo, branch, archivo);
  if (!realPath && branch !== ramaOriginal) {
    branch = ramaOriginal;
    realPath = await findPdf(repo, branch, archivo);
  }
  // Si no se resolvió por árbol, comprobar en ITEMS
  if (!realPath && Array.isArray(ITEMS) && ITEMS.length > 0) {
    const base = archivo.split("/").pop().toLowerCase();
    const itMatch = ITEMS.find(x => String(x.archivo || "").split("/").pop().toLowerCase() === base);
    if (itMatch && itMatch.rel_path) realPath = itMatch.rel_path;
  }
  if (!realPath) realPath = archivo.includes("/") ? archivo : ("archivos/" + archivo);
  let x = await getContent(realPath, branch, repo);
  if (!x && branch !== ramaOriginal) { x = await getContent(realPath, ramaOriginal, repo); }
  return x ? bytes(x.bytes, "application/pdf") : new Response("PDF no encontrado",  { status: 404 }
  );
}
async function docInfoResponse(path) {
  const q = parseQuery(path);
  const archivo = q.get("archivo") || "";
  const a = String(archivo).split("/").pop();
  let pdfBuf = null;
  try {
    const pdf = await pdfResponse(path);
    if (pdf.ok) pdfBuf = await pdf.arrayBuffer();
  } catch (_) {
  }
  if (!pdfBuf && a) { pdfBuf = await leerArchivoLocal(a); }
  if (!pdfBuf) return json( { pages: [] }
  , 200);
  let paginasGeneradas = [];
  try {
    const clean = path.split("?")[0].split("/");
    const g = decodeURIComponent(clean[3] || "");
    const rw = await getRewrites(g);
    const rev = await getRevision();
    const revReg = rev[key(g, a)] ||  {
    }
    ;
    const listaNombres = await getNombresEliminar();
    const listaColegios = await getColegios();
    const itemRw = rw.find(x => String(x.archivo || "").split("/").pop() === a);
    const enunciados = Array.isArray(itemRw?.enunciados) ? itemRw.enunciados : [];
    const recuadros =  { ...(itemRw?.recuadros ||  { }
      ), ...(revReg?.recuadros ||  {
      }
      )
    }
    ;
    const manNom = Array.isArray(recuadros.nombres) ? recuadros.nombres : (Array.isArray(recuadros.nombre) ? recuadros.nombre : []);
    const manCol = Array.isArray(recuadros.colegios) ? recuadros.colegios : (Array.isArray(recuadros.colegio) ? recuadros.colegio : []);
    // DEPURACION ESTATICA: mostrar exactamente los JSON que el visor ha
    // obtenido y que usara para detectar/renderizar Nombres, Colegios y
    // Enunciados. No depende de ningun backend.
    const buf = pdfBuf;
    if (window.MuPDFCore) {
      const opened = await MuPDFCore.abrirMuPDF(buf);
      const d = opened.doc;
      const total = d.countPages();
      const pages = paginasGeneradas;
      for (let i = 0; i < total; i++) {
        const page = d.loadPage(i);
        const viewport = MuPDFCore.viewportMuPDF(page, 1.0);
        let textContent =  { items: [] }
        ;
        try { textContent = await MuPDFCore.textoMuPDF(page, 1.0); }
        catch (textErr) { console.warn('[DOC_INFO] No se pudo extraer texto de la página', i, textErr); }
        const pW = viewport.width, pH = viewport.height;
        // 1. Detección automática de Nombres
        const nameHotspots = [];
        const textItems = textContent.items || [];
        let nIdx = 0;
        const normClean = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
        const compact = v => normClean(v).replace(/\s+/g,'');
        // Construir líneas de texto combinadas a partir de los items de PDF.js
        const lineasTexto = [];
        textItems.forEach(item =>  {
          const str = String(item.str || "").trim();
          if (!str) return;
          const bb = item.bbox ||  {
          }
          ;
          const tx = Number(bb.left ?? item.left ?? item.transform?.[4] ?? 0);
          const ty = Number(bb.top ?? item.top ?? 0);
          const itemW = Number(bb.width ?? item.width ?? (str.length * 7));
          const itemH = Number(bb.height ?? item.height ?? 12);
          let l = lineasTexto.find(x => Math.abs(x.ty - ty) < 4);
          if (l) {
            l.str += " " + str;
            l.normStr += " " + normClean(str);
            l.compactStr += compact(str);
            l.x1 = Math.max(l.x1, tx + itemW);
          } else {
            lineasTexto.push( {
              str: str,
              normStr: normClean(str),
              compactStr: compact(str),
              tx: tx,
              ty: ty,
              x1: tx + itemW,
              itemH: itemH
            }
  );
          }
        }
  );
        for (const nomObj of listaNombres) {
          const nomCompact = compact(nomObj);
          if (!nomCompact || nomCompact.length < 3) continue;
          for (const lineItem of lineasTexto) {
            if (lineItem.compactStr.includes(nomCompact) || (nomCompact.length >= 4 && nomCompact.includes(lineItem.compactStr))) {
              const wPct = Math.min(100, ((lineItem.x1 - lineItem.tx) / pW) * 100 + 4);
              const hPct = Math.min(100, (lineItem.itemH / pH) * 100 + 1);
              const tPct = Math.max(0, (lineItem.ty / pH) * 100);
              const lPct = Math.max(0, (lineItem.tx / pW) * 100);
              if (!nameHotspots.some(nh => Math.abs(nh.top - tPct) < 2 && Math.abs(nh.left - lPct) < 5)) {
                nameHotspots.push( {
                  id: "name_" + i + "_" + (nIdx++),
                  left: lPct,
                  top: tPct,
                  width: Math.max(15, wPct),
                  height: Math.max(3, hPct),
                  page: i,
                  page_num: i,
                  text: lineItem.str
                }
  );
              }
            }
          }
        }
        // Nombres manuales: la posicion se resuelve por TEXTO
        const resolverHotspotPorTexto = (r) =>  {
          const objetivo = String(r?.text || r?.start || r?.old || '').trim();
          if (!objetivo) return  { ...r, page: i, page_num: i }
          ;
          const objCompact = compact(objetivo);
          let hit = textItems.find(t => compact(t.str).includes(objCompact));
          if (!hit) hit = textItems.find(t => objCompact.includes(compact(t.str)));
          if (!hit) return  { ...r, page: i, page_num: i }
          ;
          const bb = hit.bbox ||  {
          }
          ;
          const tx = Number(bb.left ?? hit.left ?? hit.transform?.[4] ?? 0);
          const ty = Number(bb.top ?? hit.top ?? 0);
          const itemW = Number(bb.width ?? hit.width ?? 0);
          const itemH = Number(bb.height ?? hit.height ?? 12);
          return  {
            ...r, text: objetivo, left: Math.max(0,(tx/pW)*100), top: Math.max(0,(ty/pH)*100), width: Math.min(100,(itemW/pW)*100+4), height: Math.min(100,(itemH/pH)*100+1), page: i, page_num: i
          }
          ;
        }
        ;
        const staticNames = [
        ...(Array.isArray(itemRw?.name_hotspots) ? itemRw.name_hotspots : []),
        ...(Array.isArray(itemRw?.nombres) ? itemRw.nombres : []),
        ...(Array.isArray(revReg?.name_hotspots) ? revReg.name_hotspots : []),
        ...(Array.isArray(revReg?.nombres) ? revReg.nombres : []),
        ...manNom
        ];
        staticNames.filter(r => (r.page !== undefined ? parseInt(r.page, 10) : (r.page_num !== undefined ? parseInt(r.page_num, 10) : 0)) === i).forEach(r =>  {
          const res = resolverHotspotPorTexto(r);
          if (!nameHotspots.some(x => String(x.id) === String(res.id) || (Math.abs(x.top - res.top) < 2 && Math.abs(x.left - res.left) < 5))) {
            nameHotspots.push(res);
          }
        }
  );
        // 2. Detección automática de Colegios
        const schoolHotspots = [];
        let cIdx = 0;
        for (const colObj of listaColegios) {
          const colCompact = compact(colObj);
          if (!colCompact || colCompact.length < 3) continue;
          for (const lineItem of lineasTexto) {
            if (lineItem.compactStr.includes(colCompact) || (colCompact.length >= 4 && colCompact.includes(lineItem.compactStr))) {
              const wPct = Math.min(100, ((lineItem.x1 - lineItem.tx) / pW) * 100 + 4);
              const hPct = Math.min(100, (lineItem.itemH / pH) * 100 + 1);
              const tPct = Math.max(0, (lineItem.ty / pH) * 100);
              const lPct = Math.max(0, (lineItem.tx / pW) * 100);
              if (!schoolHotspots.some(sh => Math.abs(sh.top - tPct) < 2 && Math.abs(sh.left - lPct) < 5)) {
                schoolHotspots.push( {
                  id: "school_" + i + "_" + (cIdx++),
                  left: lPct,
                  top: tPct,
                  width: Math.max(15, wPct),
                  height: Math.max(3, hPct),
                  page: i,
                  page_num: i,
                  text: lineItem.str
                }
  );
              }
            }
          }
        }
        // Colegios manuales: anclados por TEXTO. Las coordenadas antiguas
        // solo quedan como fallback si no hay texto localizable.
        manCol.filter(r => (r.page !== undefined ? parseInt(r.page, 10) : 0) === i).forEach(r => schoolHotspots.push(resolverHotspotPorTexto(r)));
        // 3. Enunciados desde rewrites_<grado>.json
        // Estas funciones deben estar en el mismo ámbito que docInfoResponse.
        // Antes quedaron definidas dentro de extractBoxText y provocaban:
        // ReferenceError: localizarLineaEnunciado is not defined
        const localizarLineaEnunciado = (objetivo) =>  {
          const q = compact(objetivo);
          if (!q || q.length < 2) return null;
          return lineasTexto.find(l =>  {
            const t = l.compactStr || compact(l.str);
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
          const left = Math.max(0, (((Number(linea.tx) || 0) - pad) / pW) * 100);
          const top = Math.max(0, (((Number(linea.ty) || 0) - pad) / pH) * 100);
          const width = Math.min(100, (((Number(linea.x1) || Number(linea.tx) || 0) - (Number(linea.tx) || 0) + pad * 2) / pW) * 100);
          const height = Math.min(100, (((Number(linea.itemH) || 12) + pad * 2) / pH) * 100);
          return  {
            ...fallback, left, top, width: Math.max(1, width), height: Math.max(1, height), text: linea.str || fallback.text
          }
          ;
        }
        ;
        const stHotspots = [];
        enunciados.forEach((e, idx) => {
          const rawP = (e.page !== undefined && e.page !== null && String(e.page).trim() !== '') ? e.page : ((e.page_num !== undefined && e.page_num !== null) ? e.page_num : null);
          const pageTarget = rawP !== null ? parseInt(String(rawP).replace(/[^0-9]/g, ''), 10) : 0;
          if (pageTarget !== i) return;
          const start = e.start || e.old || "";
          const old = e.old || e.start || "";
          const linea = localizarLineaEnunciado(start || old);
          const base = {
            id: idx,
            start,
            old,
            new: e.new || "",
            include: e.include !== false,
            custom: !!e.custom,
            page: i,
            page_num: i
          };
          // Primero manda el TEXTO REAL detectado en la página. Solo si es
          // una zona manual sin texto localizable usamos las coordenadas
          // guardadas al crear/redimensionar el hotspot.
          const geom = linea
          ? hotspotDesdeLinea(linea, base)
          : {
            ...base,
            left: e.pct_left !== undefined ? e.pct_left : (e.left !== undefined ? e.left : 5),
            top: e.pct_top !== undefined ? e.pct_top : (e.top !== undefined ? e.top : 5),
            width: e.pct_width !== undefined ? e.pct_width : (e.width !== undefined ? e.width : 90),
            height: e.pct_height !== undefined ? e.pct_height : (e.height !== undefined ? e.height : 7.5)
          };
          stHotspots.push(geom);
        });
        const reflowHotspots = (recuadros.reflujo || []).filter(r => (r.page !== undefined ? parseInt(r.page, 10) : 0) === i);
        // Igual que DDDDD: las imágenes se detectan sobre el PDF ORIGINAL por
        // OperatorList. Los ids p{pagina}_img{indice} son estables durante el
        // render y permiten relacionarlos con revision.imagenes.
        let imageHotspots = [];
        try {
          if (typeof extraerImagenes === 'function') {
            const ims = await extraerImagenes(page, viewport);
            imageHotspots = ims.map((im, idxImg) => ( {
              id: `p${i}_img${idxImg}`,
              page_num: i,
              img_idx: idxImg,
              left: (im.left / pW) * 100,
              top: (im.top / pH) * 100,
              width: (im.width / pW) * 100,
              height: (im.height / pH) * 100,
              signature: `p${i}_img${idxImg}`
            }
            ));
          }
        } catch (_) {
        }
        const manualImages = (recuadros.imagenes || []).filter(r => (r.page !== undefined ? parseInt(r.page, 10) : 0) === i);
        for (const mi of manualImages) {
          if (!imageHotspots.some(x => String(x.id) === String(mi.id))) imageHotspots.push(mi);
        }
        const imageActions =  {
        }
        ;
        for (const [imgId, action] of Object.entries(revReg?.imagenes ||  {
        }
        )) {
          const id = String(imgId);
          let samePage = id.startsWith(`p${i}_`);
          if (!samePage && Number.isFinite(Number(action?.page_num))) samePage = Number(action.page_num) === i;
          if (samePage) imageActions[id] = action;
        }
        pages.push( {
          page_num: i,
          statement_hotspots: stHotspots,
          name_hotspots: nameHotspots,
          school_hotspots: schoolHotspots,
          reflow_hotspots: reflowHotspots,
          image_hotspots: imageHotspots,
          image_actions: imageActions,
          acciones_imagenes: imageActions,
          imagenes: imageActions,
          acciones_nombre: revReg?.acciones_nombre ||  {
          }
          ,
          acciones_colegio: revReg?.acciones_colegio ||  { } }
  );
      }
      try { d.destroy?.(); }
      catch (_) {
      }
      return json( { pages }
  );
    }
    return json( { pages: paginasGeneradas }
  );
  } catch (err) {
    console.error('[DOC_INFO] Error generando hotspots estáticos:', err);
    return json( { pages: paginasGeneradas }
  );
  }
}
var _thumbCache = new Map();
async function thumbResponse(path) {
  if (_thumbCache.has(path)) {
    const blob = _thumbCache.get(path);
    return new Response(blob,  {
      status: 200, headers:  { "Content-Type": "image/png" }
    }
  );
  }
  const pdf = await pdfResponse(path.replace("/api/thumb/", "/api/preview/"));
  if (!pdf.ok) return new Response("",  { status: 404 }
  );
  try {
    const buf = await pdf.arrayBuffer();
    if (!window.MuPDFCore) return new Response("",  { status: 404 }
  );
    const opened = await MuPDFCore.abrirMuPDF(buf);
    const d = opened.doc;
    const p = d.loadPage(0);
    const v = MuPDFCore.viewportMuPDF(p, 0.4);
    const pix = p.toPixmap(opened.mupdf.Matrix.scale(0.4, 0.4), opened.mupdf.ColorSpace.DeviceRGB, false, true, "View", "CropBox");
    const png = pix.asPNG();
    const blob = new Blob([png],  { type: "image/png" }
  );
    try {
      p.destroy?.();
      d.destroy?.();
    } catch (_) {
    }
    if (_thumbCache.size > 80) {
      const first = _thumbCache.keys().next().value;
      _thumbCache.delete(first);
    }
    _thumbCache.set(path, blob);
    return new Response(blob,  {
      status: 200, headers:  { "Content-Type": "image/png" }
    }
  );
  } catch (_) {
    return new Response("",  { status: 404 }
  );
  }
}
async function apunteResponse(path) {
  const q = parseQuery(path);
  const g = q.get("grado") || path.split("/")[3] || "";
  const n = q.get("nombre") || q.get("nombre_apunte") || "";
  let c = { repo: "", token: "" };
  try { c = await getConfig(); } catch (_) {}
  const repo = c?.repo || "";
  const branch = GRADOS[g]?.rama || g;
  const requested = "apuntes/" + n.replace(/\.pdf$/i, "") + ".pdf";
  let resolved = requested;
  try {
    const paths = await tree(repo, branch);
    const exact = Array.isArray(paths) ? paths.find(p => String(p).toLowerCase() === requested.toLowerCase()) : null;
    if (exact) {
      resolved = exact;
    } else {
      const base = requested.split('/').pop().toLowerCase();
      const byBase = Array.isArray(paths) ? paths.find(p => String(p).split('/').pop().toLowerCase() === base) : null;
      if (byBase) {
        resolved = byBase;
      } else {
        const rev = await getRevision();
        const cleanN = n.replace(/\.pdf$/i, "").toLowerCase();
        let fallbackPath = null;
        for (const [k, v] of Object.entries(rev || {})) {
          if (k.startsWith(`${g}::`) && (String(v?.nombre_apunte || '').toLowerCase() === cleanN || k.toLowerCase().includes(cleanN))) {
            const origFile = k.split("::")[1];
            const found = Array.isArray(paths) ? paths.find(p => p.toLowerCase().endsWith(origFile.toLowerCase())) : null;
            fallbackPath = found || origFile;
            if (fallbackPath) break;
          }
        }
        if (!fallbackPath) return new Response("PDF no encontrado", { status: 404 });
        resolved = fallbackPath;
      }
    }
  } catch (_) {
    resolved = requested;
  }
  try {
    const x = await getContent(resolved, branch, repo);
    return x ? bytes(x.bytes, "application/pdf") : new Response("PDF no encontrado", { status: 404 });
  } catch (_) {
    return new Response("PDF no encontrado", { status: 404 });
  }
}

async function estadoCompilacionResponse(path) {
  const q = parseQuery(path);
  const g = q.get("grado") || "";
  const n = q.get("nombre") || q.get("nombre_apunte") || "";
  const arch = q.get("archivo") || "";
  const desde = parseInt(q.get("desde") || "0", 10);

  let c = { repo: "", repoApuntes: "", token: "" };
  try { c = await getConfig(); } catch (_) {}
  const repo = c?.repo || "";
  const repoApuntes = c?.repoApuntes || repo;
  const token = c?.token || "";
  const branch = (typeof GRADOS !== "undefined" && GRADOS[g]?.rama) ? GRADOS[g].rama : g;

  const normClean = (val, fb = "") => {
    if (typeof normalizarNombreApunte === "function") return normalizarNombreApunte(val, fb);
    let s = String(val || "").trim();
    if (!s) s = String(fb || "").split("/").pop().split("\\").pop().replace(/\.pdf$/i, "");
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^[_ .-]+|[_ .-]+$/g, "");
    return (s || "Apunte").slice(0, 100);
  };
  const normNombre = normClean(n, arch);

  // 1. Consultar ejecuciones en GitHub Actions
  const reposToCheck = Array.from(new Set([repoApuntes, repo])).filter(Boolean);
  if (token) {
    for (const rTarget of reposToCheck) {
      try {
        const runsRes = await ghRequest(rTarget, "actions/runs?event=workflow_dispatch&per_page=5");
        if (runsRes.ok) {
          const runsData = await runsRes.json();
          const runs = Array.isArray(runsData?.workflow_runs) ? runsData.workflow_runs : [];
          const run = runs.find(r => {
            const runTime = Date.parse(r.created_at || "");
            if (isNaN(runTime)) return false;
            if (desde > 0) return runTime >= (desde - 60000);
            return (Date.now() - runTime) < 10 * 60 * 1000;
          });

          if (run) {
            if (run.status === "in_progress" || run.status === "queued") {
              return json({
                ok: true,
                listo: false,
                en_proceso: true,
                estado: run.status,
                run_id: run.id
              });
            }
            if (run.status === "completed") {
              if (run.conclusion === "success") {
                return json({
                  ok: true,
                  listo: true,
                  estado: "completado",
                  conclusion: "success",
                  ruta: `apuntes/${normNombre}.pdf`
                });
              } else {
                return json({
                  ok: false,
                  listo: true,
                  estado: "fallido",
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
                const commitDate = Date.parse(commits[0]?.commit?.committer?.date || commits[0]?.commit?.author?.date || "");
                if (!isNaN(commitDate)) {
                  if (commitDate >= (desde - 30000)) {
                    return json({ ok: true, listo: true, estado: "completado", ruta: `apuntes/${normNombre}.pdf` });
                  } else {
                    return json({ ok: true, listo: false, en_proceso: true, estado: "en_proceso" });
                  }
                }
              }
            }
          } catch (_) {}
        }
        return json({ ok: true, listo: true, estado: "completado", ruta: `apuntes/${normNombre}.pdf` });
      }
    } catch (_) {}
  }

  // 3. Comprobar árbol de archivos (tree)
  if (repo && branch && normNombre) {
    try {
      const cacheKey = repo + "::" + branch;
      if (typeof cache !== "undefined" && cache?.trees) {
        cache.trees.delete(cacheKey);
      }
      const paths = await tree(repo, branch);
      const target = `apuntes/${normNombre}.pdf`.toLowerCase();
      const targetBase = `${normNombre}.pdf`.toLowerCase();
      const found = Array.isArray(paths) && paths.some(p => {
        const lp = String(p).toLowerCase();
        return lp === target || lp.endsWith("/" + targetBase);
      });
      if (found) {
        return json({ ok: true, listo: true, estado: "completado", ruta: `apuntes/${normNombre}.pdf` });
      }
    } catch (_) {}
  }

  return json({ ok: true, listo: false, en_proceso: true, estado: "en_proceso" });
}

