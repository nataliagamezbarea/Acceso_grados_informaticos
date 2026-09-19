/* BUILD: 20260904-github-direct-testdebug-v5 */
/*
 * RESOLVEDOR DE FUENTES DEL VISOR ADMIN — 100% CLIENTE / SIN SERVIDOR PROPIO
 *
 * Flujo OBLIGATORIO:
 *   1) GitHub del repositorio configurado en Supabase (gh_repo_general)
 *      usando gh_token de Supabase.
 *   2) Google Fonts.
 *   3) GitHub público (google/fonts).
 *   4) DaFont (solo si el navegador permite CORS/fetch).
 *   5) fallback del navegador.
 *
 * IMPORTANTE:
 *   - NO se busca ninguna fuente local.
 *   - No se buscan fuentes locales.
 *   - Tras obtener una fuente por cualquier proveedor, se intenta subir a
 *     almacen/fuentes/ del repositorio GitHub configurado en Supabase.
 *   - Los bytes descargados quedan además SOLO EN MEMORIA de esta sesión.
 *   - Se registran con FontFace y quedan disponibles en document.fonts.
 */
(() =>  {
const WEIGHTS =  {
    thin: 100, hairline: 100, extralight: 200, ultralight: 200,
    light: 300, regular: 400, book: 400, normal: 400,
    medium: 500, semibold: 600, demibold: 600, extrabold: 800,
    ultrabold: 800, bold: 700, black: 900, heavy: 900
  }
  ;
  const STYLE_WORDS = Object.keys(WEIGHTS).concat(['italic','oblique']);
  // Caché exclusivamente en memoria.
  const loaded = new Map();
  const failed = new Set();
  const pending = new Map();
  const memoryFontBytes = new Map();
  const memoryFontSource = new Map();
  const memoryFontFamily = new Map();
  function fontMemoryKey(family, weight, italic) { return `${family}|${weight}|${italic ? 'italic' : 'normal'}`; }
  function makeFontAlias(family, weight, italic) {
    const base = String(family || 'Arial').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_');
    return `__DDD_FONT_${base}_${weight}_${italic ? 'italic' : 'normal'}`;
  }
  function fuenteFamiliaCSS(family, style='Regular') {
    const fam = String(family || 'Arial').trim() || 'Arial';
    const  { weight, italic }
    = styleInfo(style);
    const key = fontMemoryKey(fam, weight, italic);
    // Si esta fuente fue descargada/registrada por nosotros, SIEMPRE devolvemos
    // el nombre interno único que corresponde a ESOS bytes. Así el canvas no
    // puede resolver por accidente otra fuente del sistema con el mismo nombre.
    return memoryFontFamily.get(key) || fam;
  }
  const repoTreeCache = new Map();
  function clean(s) {
    return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  }
  function externalFamilyNames(family) {
    const raw = String(family || '').trim();
    const spaced = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
    const splitCaps = raw.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return [...new Set([raw, spaced, splitCaps].filter(Boolean))];
  }
  function parseFontFamilyAndStyle(rawName) {
    if (!rawName) return  { family: 'Arial', style: 'Regular' }
    ;
    let name = String(rawName)
    .replace(/^F_/i, '')
    .replace(/^[A-Z]{6}\+/, '')
    .split(',')[0]
    .trim();
    const tokens = name.split(/[-_\s]+/).filter(Boolean);
    const styles = [];
    const family = [];
    for (let token of tokens) {
      token = token.replace(/(?:MT|PS)$/i, '');
      const low = token.toLowerCase();
      if (STYLE_WORDS.includes(low)) { styles.push(low); }
      else if (/(italic|oblique)$/i.test(low) && low.length > 6) {
        const base = low.replace(/(italic|oblique)$/i, '');
        if (WEIGHTS[base]) styles.push(base, low.slice(base.length));
        else family.push(token);
      } else {
        family.push(token);
      }
    }
    const fam = family.length ? family.join('') : (tokens[0] || 'Arial');
    const sty = styles.length
    ? styles.map(x => x.charAt(0).toUpperCase() + x.slice(1)).join('')
    : 'Regular';
    return  { family: fam, style: sty }
    ;
  }
  function styleInfo(style) {
    const s = String(style || 'Regular').toLowerCase();
    let weight = 400;
    for (const k of Object.keys(WEIGHTS)) {
      if (s.includes(k)) {
        weight = WEIGHTS[k];
        break;
      }
    }
    return  { weight, italic: /italic|oblique/.test(s) }
    ;
  }
  // Constructor ÚNICO de la fuente CSS usada por TODO el motor de sustitución.
  // IMPORTANTE: siempre prioriza fontName y, si la fuente fue descargada, usa
  // el alias que apunta exactamente a esos bytes en memoria.
  function dddFuenteCSS(op, size) {
    // Si prepararFuentesDelPlan ya resolvió los bytes exactos de esta
    // operación, usamos esa familia resuelta directamente. Esto evita que
    // fontName/fontFamily del PDF vuelvan a seleccionar otra fuente.
    const resolved = String(op?._resolvedFontFamily || '').trim();
    let family = 'Arial';
    let style = 'Regular';
    if (resolved) {
      family = resolved;
      const rawStyle = String(op?._resolvedFontStyle || 'Regular');
      style = rawStyle || 'Regular';
    } else {
      const raw = String(op?.fontName || op?.fontFamily || '').trim();
      if (raw) {
        const parsed = parseFontFamilyAndStyle(raw);
        family = parsed.family || family;
        style = parsed.style || style;
      }
      family = fuenteFamiliaCSS(family, style) || family;
    }
    const info = styleInfo(style);
    const italic = info.italic ? 'italic ' : '';
    const weight = info.weight || 400;
    return `${italic}${weight} ${Math.max(1, Number(size) || 1)}px \"${family}\", \"Arial\", sans-serif`;
  }
  const FONT_STORAGE_DIR = 'almacen/fuentes';
  const persistedFontKeys = new Set();
  const persistPending = new Map();
  function safeFilePart(value) {
    return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'fuente';
  }
  function extensionForBuffer(buffer, sourceLabel = '') {
    const label = String(sourceLabel || '').toLowerCase();
    if (/\.otf(?:$|[?#])/.test(label)) return 'otf';
    try {
      const u8 = new Uint8Array(buffer || []);
      const head = String.fromCharCode(...u8.slice(0, 4));
      if (head === 'OTTO') return 'otf';
      if (head === 'ttcf') return 'ttf';
      if (head === '\x00\x01\x00\x00') return 'ttf';
    } catch (_) {
    }
    return 'ttf';
  }
  async function guardarFuenteEnGithubSupabase(family, style, buffer, sourceLabel) {
    const  { weight, italic }
    = styleInfo(style);
    const storageKey = `${clean(family)}|${weight}|${italic ? 'italic' : 'normal'}`;
    if (persistedFontKeys.has(storageKey)) return true;
    if (persistPending.has(storageKey)) return persistPending.get(storageKey);
    const p = (async () =>  {
      try {
        const cfg = await getSupabaseGithubConfig();
        const repo = String(cfg.repo || '').trim();
        const token = String(cfg.token || '').trim();
        if (!githubRepoIsValid(repo) || !token) return false;
        const branch = await getGithubDefaultBranch(repo, token);
        const ext = extensionForBuffer(buffer, sourceLabel);
        const stylePart = italic ? `${styleInfo(style).weight}-italic` : String(weight);
        const filename = `${safeFilePart(family)}-${stylePart}.${ext}`;
        const path = `${FONT_STORAGE_DIR}/${filename}`;
        const u = `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
        let sha = null;
        try {
          const existing = await githubJson(`${u}?ref=${encodeURIComponent(branch)}`, token);
          sha = existing?.sha || null;
        } catch (_) {
        }
        // GitHub Contents API requiere Base64 para crear/actualizar el blob.
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const content = btoa(binary);
        const body =  {
          message: `Añadir fuente ${family} ${style} a ${FONT_STORAGE_DIR}`,
          content,
          branch,
          ...(sha ?  { sha }
          :  {
          }
          )
        }
        ;
        const r = await fetch(u,  {
          method: 'PUT',
          mode: 'cors',
          cache: 'no-store',
          headers:  {
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            ...(token ?  { Authorization: 'Bearer ' + token }
            :  {
            }
            )
          }
          ,
          body: JSON.stringify(body)
        }
  );
        if (!r.ok) {
          const detail = await r.text().catch(() => '');
          console.warn(`[FUENTE] No se pudo guardar en ${path}: HTTP ${r.status}`, detail.slice(0, 400));
          return false;
        }
        persistedFontKeys.add(storageKey);
        return true;
      } catch (e) {
        console.warn('[FUENTE] Error guardando la fuente en GitHub:', e);
        return false;
      } finally {
        persistPending.delete(storageKey);
      }
    }
    )();
    persistPending.set(storageKey, p);
    return p;
  }
  function scoreFontPath(path, family, style) {
    const p = String(path || '');
    const n = clean(p.split('/').pop() || p);
    const fam = clean(family);
    const sty = clean(style);
    const  { weight, italic }
    = styleInfo(style);
    let score = 0;
    if (n.includes(fam)) score += 120;
    if (p.toLowerCase().includes('/fonts/')) score += 8;
    if (p.toLowerCase().includes('/fuentes/')) score += 8;
    if (n.includes(sty)) score += 70;
    if (italic ? /italic|oblique/i.test(p) : !/italic|oblique/i.test(p)) score += 30;
    if (n.includes(String(weight))) score += 25;
    if (weight === 400 && /regular|normal|book/i.test(p)) score += 45;
    if (weight === 700 && /bold|demibold|semibold|heavy/i.test(p)) score += 45;
    if (weight === 800 && /extrabold|ultrabold|heavy/i.test(p)) score += 45;
    if (weight === 900 && /black|heavy/i.test(p)) score += 45;
    if (weight === 300 && /light/i.test(p)) score += 45;
    if (weight === 500 && /medium/i.test(p)) score += 45;
    if (weight === 600 && /semibold|demibold/i.test(p)) score += 45;
    return score;
  }
  function githubRepoIsValid(repo) { return /^[^/\s]+\/[^/\s]+$/.test(String(repo || '').trim()); }
  async function getSupabaseGithubConfig() {
    if (typeof getConfig === 'function') {
      const cfg = await getConfig();
      if (cfg?.repo && cfg?.token) return cfg;
    }
    const repo = String(window?.GITHUB_CONFIG?.repo_general || window?.GITHUB_CONFIG?.repo || '').trim();
    const token = String(window?.GITHUB_CONFIG?.token || '').trim();
    if (githubRepoIsValid(repo) && token) return  { repo, token }
    ;
    throw new Error('No se pudo obtener gh_repo_general/gh_token desde Supabase.');
  }
  async function githubJson(url, token) {
    // Para GitHub público no usamos el wrapper de arranque.js: ese wrapper
    // fuerza la configuración privada y puede bloquear la búsqueda externa.
    const transport = (typeof window !== 'undefined' && window.StaticAPI?.originalFetch)
    ? window.StaticAPI.originalFetch
    : fetch;
    const r = await transport(url,  {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      headers:  {
        Accept: 'application/vnd.github+json',
        ...(token ?  { Authorization: 'Bearer ' + token }
        :  {
        }
        )
      }
    }
  );
    if (!r.ok) return null;
    return await r.json();
  }
  async function githubRawContents(repo, path, branch, token) {
    const u = `https://api.github.com/repos/${repo}/contents/${String(path).split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`;
    try {
      // La petición pasa por el cinturón de seguridad del Visor Admin y
      // recibe automáticamente gh_token, pero también dejamos Authorization.
      const transport = (typeof window !== 'undefined' && window.StaticAPI?.originalFetch)
      ? window.StaticAPI.originalFetch
      : fetch;
      const r = await transport(u,  {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        headers:  {
          Accept: 'application/vnd.github.raw+json',
          ...(token ?  { Authorization: 'Bearer ' + token }
          :  {
          }
          )
        }
      }
  );
      if (!r.ok) return null;
      const buf = await r.arrayBuffer();
      if (!buf || buf.byteLength < 100) return null;
      return buf;
    } catch (_) {
      return null;
    }
  }
  async function getGithubDefaultBranch(repo, token) {
    const meta = await githubJson(`https://api.github.com/repos/${repo}`, token);
    return String(meta?.default_branch || 'master').trim() || 'master';
  }
  async function getGithubTree(repo, branch, token) {
    const key = `${repo}::${branch}`;
    if (repoTreeCache.has(key)) return repoTreeCache.get(key);
    const p = (async () =>  {
      const data = await githubJson(
      `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      token
  );
      const paths = Array.isArray(data?.tree)
      ? data.tree
      .filter(x => x && x.type === 'blob' && /\.(ttf|otf)$/i.test(x.path || ''))
      .map(x => String(x.path))
      : [];
      return paths;
    }
    )();
    repoTreeCache.set(key, p);
    try {
      const result = await p;
      repoTreeCache.set(key, result);
      return result;
    } catch (_) {
      repoTreeCache.delete(key);
      return [];
    }
  }
  async function loadFontFace(family, source, weight = 400, italic = false) {
    if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) {
      return false;
    }
    const key = fontMemoryKey(family, weight, italic);
    if (loaded.has(key) && memoryFontFamily.has(key)) return true;
    if (pending.has(key)) return pending.get(key);
    const realFamily = String(family || 'Arial').trim() || 'Arial';
    const p = (async () =>  {
      try {
        // Registrar SIEMPRE con alias único para garantizar que el canvas usa
        // exactamente los bytes descargados y no una familia del sistema con
        // el mismo nombre. fuenteFamiliaCSS() devolverá este alias al pintar.
        const canvasFamily = makeFontAlias(realFamily, weight, italic);
        const face = new FontFace(canvasFamily, source,  {
          weight: String(weight),
          style: italic ? 'italic' : 'normal'
        }
  );
        await face.load();
        document.fonts.add(face);
        try { await face.loaded; }
        catch (_) {
        }
        try { await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 20px "${canvasFamily}"`); }
        catch (_) {
        }
        const usable = (() =>  {
          try { return document.fonts.check(`${italic ? 'italic ' : ''}${weight} 20px "${canvasFamily}"`); }
          catch (_) { return true; }
        }
        )();
        if (!usable) throw new Error(`FontFace no disponible tras registrar ${canvasFamily}`);
        memoryFontFamily.set(key, canvasFamily);
        loaded.set(key, true);
        return true;
      } catch (e) {
        console.warn(`[FUENTE] No se pudo registrar ${family} (${weight}/${italic ? 'italic' : 'normal'})`, e);
        return false;
      } finally {
        pending.delete(key);
      }
    }
    )();
    pending.set(key, p);
    return p;
  }
  async function loadFromBytes(family, buffer, weight, italic, sourceLabel, persist = false, styleOverride = '') {
    if (!buffer) return false;
    const key = fontMemoryKey(family, weight, italic);
    const byteCopy = buffer instanceof ArrayBuffer ? buffer.slice(0) : buffer;
    memoryFontBytes.set(key, byteCopy);
    // SOLO MEMORIA.
    memoryFontSource.set(key, sourceLabel || 'memoria');
    const loadedOk = await loadFontFace(family, byteCopy, weight, italic);
    if (loadedOk && persist) {
      const style = styleOverride || (italic ? `${weight} Italic` : String(weight));
      // La fuente ya está disponible para el visor. La persistencia en GitHub
      // se hace DESPUÉS y sin bloquear la interfaz ni la carga del documento.
      Promise.resolve().then(() => guardarFuenteEnGithubSupabase(family, style, byteCopy, sourceLabel))
      .catch(e => console.warn('[FUENTE] Persistencia en segundo plano falló:', e));
    }
    return loadedOk;
  }
  async function loadFromUrl(family, url, weight, italic, sourceLabel = url) {
    const key = `${family}|${weight}|${italic ? 'italic' : 'normal'}`;
    if (loaded.has(key)) return true;
    try {
      // Transporte idéntico al de test_debug.html para recursos públicos:
      // GET directo, sin proxy, sin Authorization y con CORS estándar.
      const transport = (typeof window !== 'undefined' && window.StaticAPI?.originalFetch)
      ? window.StaticAPI.originalFetch
      : fetch;
      const res = await transport(url,  {
        method: 'GET',
        mode: 'cors',
        cache: 'force-cache',
        redirect: 'follow'
      }
  );
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      if (!buf || buf.byteLength < 100) return false;
      return await loadFromBytes(family, buf, weight, italic, sourceLabel, true, italic ? `${weight} Italic` : String(weight));
    } catch (_) {
      // Último intento dejando el fetch del recurso a FontFace.
      return await loadFontFace(family, `url(${JSON.stringify(url)})`, weight, italic);
    }
  }
  async function getGithubFontStorage(repo, branch, token) {
    const key = `storage-tree::${repo}::${branch}`;
    if (repoTreeCache.has(key)) return repoTreeCache.get(key);
    const p = (async () =>  {
      const all = await getGithubTree(repo, branch, token);
      const prefix = `${FONT_STORAGE_DIR}/`.toLowerCase();
      return all.filter(path => String(path).toLowerCase().startsWith(prefix));
    }
    )();
    repoTreeCache.set(key, p);
    try {
      const result = await p;
      repoTreeCache.set(key, result);
      return result;
    } catch (_) {
      repoTreeCache.delete(key);
      return [];
    }
  }
  async function crearDirectorioFuentesGithub(repo, branch, token) {
    const all = await getGithubTree(repo, branch, token);
    const prefix = `${FONT_STORAGE_DIR}/`.toLowerCase();
    if (all.some(path => String(path).toLowerCase().startsWith(prefix))) { return true; }
    const path = `${FONT_STORAGE_DIR}/.gitkeep`;
    const u = `https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const body =  { message: `Crear directorio ${FONT_STORAGE_DIR}`, content: btoa(''), branch }
    ;
    try {
      const existing = await githubJson(`${u}?ref=${encodeURIComponent(branch)}`, token);
      if (existing?.sha) return true;
    } catch (_) {
    }
    try {
      const r = await fetch(u,  {
        method: 'PUT', mode: 'cors', cache: 'no-store',
        headers:  {
          Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', ...(token ?  {
            Authorization: 'Bearer ' + token
          }
          :  {
          }
          )
        }
        ,
        body: JSON.stringify(body)
      }
  );
      if (!r.ok) {
        const detail = await r.text().catch(() => '');
        console.warn(`[FUENTE] No se pudo crear ${FONT_STORAGE_DIR}: HTTP ${r.status}`, detail.slice(0, 300));
        return false;
      }
      repoTreeCache.delete(`${repo}::${branch}`);
      repoTreeCache.delete(`storage-tree::${repo}::${branch}`);
      return true;
    } catch (e) {
      console.warn('[FUENTE] Error creando el directorio de fuentes en GitHub:', e);
      return false;
    }
  }
  async function resolverGitHubSupabase(family, style) {
    const  { weight, italic }
    = styleInfo(style);
    let cfg;
    try { cfg = await getSupabaseGithubConfig(); }
    catch (_) { return null; }
    const repo = String(cfg.repo || '').trim();
    const token = String(cfg.token || '').trim();
    if (!githubRepoIsValid(repo) || !token) return null;
    let branch = 'master';
    try { branch = await getGithubDefaultBranch(repo, token); }
    catch (_) {
    }
    // IMPORTANTE: el repositorio del proyecto SOLO se consulta en almacen/fuentes/.
    // Nunca se recorre el resto del repositorio para encontrar fuentes.
    let storagePaths = [];
    try { storagePaths = await getGithubFontStorage(repo, branch, token); }
    catch (_) { storagePaths = []; }
    if (!storagePaths.length) {
      // No creamos nada durante la comprobación. El camino crítico es:
      // 1) comprobar almacen/fuentes; 2) si no existe, resolver directamente
      // el proveedor; 3) usar la fuente inmediatamente; 4) persistir después.
      return null;
    }
    const fam = clean(family);
    const candidatos = storagePaths
    .filter(path => /\.(ttf|otf)$/i.test(String(path)))
    .map(path => ( { path, score: scoreFontPath(path, family, style) }
    ))
    .filter(x =>  {
      const n = clean(x.path.split('/').pop() || x.path);
      return !!fam && n.includes(fam);
    }
    )
    .sort((a, b) => b.score - a.score);
    for (const candidate of candidatos) {
      const buf = await githubRawContents(repo, candidate.path, branch, token);
      if (!buf) continue;
      const ok = await loadFromBytes(
      family,
      buf,
      weight,
      italic,
      `github-supabase-storage:${repo}/${candidate.path}@${branch}`
  );
      if (ok) { return `github-supabase-storage:${repo}/${candidate.path}@${branch}`; }
    }
    return null;
  }
  async function resolverGoogle(family, style) {
    // PRIORIDAD DIRECTA, igual que test_debug.html:
    // Google Fonts se instala mediante <link rel="stylesheet">. Nunca se hace
    // fetch() directo al CSS de fonts.googleapis.com durante la carga.
    const  { weight, italic }
    = styleInfo(style);
    if (typeof document === 'undefined' || !document.head) return null;
    const key = fontMemoryKey(family, weight, italic);
    for (const googleFamily of externalFamilyNames(family)) {
      const encoded = String(googleFamily).trim().replace(/\s+/g, '+');
      const urls = [
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(encoded)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`,
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(encoded)}:wght@${weight}&display=swap`
      ];
      for (const cssUrl of urls) {
        try {
          const id = `google-font-${clean(family)}-${weight}-${italic ? 'italic' : 'normal'}`;
          document.getElementById(id)?.remove();
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = cssUrl;
          document.head.appendChild(link);
          // No leemos la respuesta CSS: el navegador la carga directamente.
          // Esto evita exactamente el CORS que aparecía en consola.
          await new Promise(resolve =>  {
            let done = false;
            const finish = () =>  {
              if (!done) {
                done = true;
                resolve();
              }
            }
            ;
            link.onload = finish;
            link.onerror = finish;
            setTimeout(finish, 8000);
          }
  );
          try { await document.fonts.ready; }
          catch (_) {
          }
          try { await document.fonts.load(`${italic ? 'italic ' : ''}${weight} 20px "${googleFamily}"`); }
          catch (_) {
          }
          if (document.fonts.check(`${italic ? 'italic ' : ''}${weight} 20px "${googleFamily}"`)) {
            memoryFontSource.set(key, `google-stylesheet:${cssUrl}`);
            memoryFontFamily.set(key, googleFamily);
            loaded.set(key, true);
            // La fuente ya funciona DIRECTAMENTE. Intentamos obtener sus bytes
            // y subirlos a GitHub en segundo plano, sin retrasar el visor.
            persistGoogleFontInBackground(family, style, googleFamily, cssUrl);
            return `google-stylesheet:${cssUrl}`;
          }
        } catch (e) {
          console.warn(`[FUENTE] Google Fonts directa falló para ${family}:`, e);
        }
      }
    }
    return null;
  }
  function persistGoogleFontInBackground(family, style, googleFamily, cssUrl) {
    // No forma parte del camino crítico. Si el navegador/proxy no permite
    // recuperar los bytes, la fuente sigue funcionando mediante <link>.
    Promise.resolve().then(async () =>  {
      try {
        const cssProxy = 'https://cors.io/?url=' + encodeURIComponent(cssUrl);
        const r = await fetch(cssProxy,  { cache: 'no-store' }
  );
        if (!r.ok) return;
        const data = await r.json();
        const css = String(data?.body || '');
        if (!css) return;
        const urls = [];
        const re = /url\((https?:\/\/[^)]+)\)/g;
        let m;
        while ((m = re.exec(css))) urls.push(m[1].replace(/["']/g, ''));
        if (!urls.length) return;
        // Preferimos woff2, como entrega Google Fonts.
        const fontUrl = urls.find(u => /\.woff2(?:\?|$)/i.test(u)) || urls[0];
        let buf = null;
        try {
          const rr = await fetch(fontUrl,  { mode: 'cors', cache: 'force-cache', redirect: 'follow' }
  );
          if (rr.ok) buf = await rr.arrayBuffer();
        } catch (_) {
        }
        if (!buf || buf.byteLength < 100) {
          try {
            const proxied = 'https://proxy.corsfix.com/?' + fontUrl;
            const rr = await fetch(proxied,  { mode: 'cors', cache: 'no-store' }
  );
            if (rr.ok) buf = await rr.arrayBuffer();
          } catch (_) {
          }
        }
        if (!buf || buf.byteLength < 100) return;
        const  { weight, italic }
        = styleInfo(style);
        await guardarFuenteEnGithubSupabase(
        family,
        italic ? `${weight} Italic` : String(weight),
        buf,
        fontUrl
  );
      } catch (e) {
        console.warn(`[FUENTE] Google: no se pudieron persistir los bytes en segundo plano → ${family}`, e);
      }
    }
  );
  }
  async function resolverGitHubPublic(family, style) {
    const  { weight, italic }
    = styleInfo(style);
    const names = externalFamilyNames(family);
    // Igual que test_debug.html: las búsquedas públicas de GitHub se hacen
    // con un GET directo y ANÓNIMO. No añadimos Authorization aquí porque
    // ese header provoca preflight en algunos navegadores/redes y puede
    // convertir una petición simple en un fallo CORS. Las descargas raw
    // también se hacen sin Authorization.
    const authToken = '';
    // 0) Candidatos directos conocidos para familias que no suelen estar en
    // google/fonts. Se prueban con raw.githubusercontent.com, sin pasar por
    // la API de búsqueda. Esto evita límites/CORS de api.github.com y sirve
    // además como seguro para fuentes clásicas como Algerian.
    const directGithubCandidates =  {
      algerian: [
      'https://raw.githubusercontent.com/tash1207/Gradugation/master/assets/fonts/Algerian.ttf'
      ]
    }
    ;
    for (const name of names) {
      const direct = directGithubCandidates[clean(name)] || [];
      for (const rawUrl of direct) {
        if (await loadFromUrl(family, rawUrl, weight, italic, `github-public:${rawUrl}`)) { return `github-public:${rawUrl}`; }
      }
    }
    // 1) Igual que test_debug.html: NO usamos /search/code porque GitHub
    // puede devolver 401 sin autenticación. La búsqueda pública se hace por
    // repositorios y después se descarga el archivo raw directamente.
    // 2) Descubrimiento mediante repositorios públicos, como test_debug.html.
    for (const name of names) {
      try {
        const q = encodeURIComponent(`"${name}" font ttf`);
        const data = await githubJson(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`, authToken);
        const repos = Array.isArray(data?.items) ? data.items : [];
        for (const repoItem of repos.slice(0, 12)) {
          const repo = String(repoItem?.full_name || '').trim();
          if (!githubRepoIsValid(repo)) continue;
          const branch = String(repoItem?.default_branch || 'main').trim() || 'main';
          let tree = [];
          try { tree = await getGithubTree(repo, branch, authToken); }
          catch (_) { tree = []; }
          const fam = clean(family);
          const candidates = tree
          .filter(path => /\.(ttf|otf)$/i.test(path))
          .filter(path => clean(path.split('/').pop() || path).includes(fam))
          .map(path => ( { path, score: scoreFontPath(path, family, style) }
          ))
          .sort((a,b) => b.score - a.score);
          for (const c of candidates.slice(0, 12)) {
            const rawUrl = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch).replace(/%2F/g,'/')}/${c.path.split('/').map(encodeURIComponent).join('/')}`;
            if (await loadFromUrl(family, rawUrl, weight, italic, `github-public:${repo}/${c.path}@${branch}`)) { return `github-public:${repo}/${c.path}@${branch}`; }
          }
        }
      } catch (e) {
        console.warn(`[FUENTE] GitHub público: búsqueda de repositorios para ${name} falló`, e);
      }
    }
    return null;
  }
  async function resolverDaFont(family, style) {
    // EXACTAMENTE el flujo de test_debug.html:
    //   1) búsqueda HTML mediante cors.io
    //   2) página .font mediante cors.io
    //   3) ZIP dl.dafont.com mediante proxy.corsfix.com
    //   4) extraer TTF/OTF con JSZip
    //   5) registrar y subir los bytes a almacen/fuentes/ de GitHub
    const  { weight, italic }
    = styleInfo(style);
    const names = externalFamilyNames(family);
    async function fetchCorsIOHTML(url) {
      const proxy = 'https://cors.io/?url=' + encodeURIComponent(url);
      const response = await fetch(proxy,  { cache: 'no-store' }
  );
      if (!response.ok) throw new Error(`cors.io HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data.body !== 'string') throw new Error('cors.io no devolvió el campo body.');
      return data.body;
    }
    async function fetchCorsfixZip(targetUrl) {
      const proxyUrl = 'https://proxy.corsfix.com/?' + targetUrl;
      const response = await fetch(proxyUrl,  {
        mode: 'cors', cache: 'no-store', redirect: 'follow'
      }
  );
      if (!response.ok) throw new Error(`Corsfix HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07))) {
        throw new Error('Corsfix no devolvió un ZIP válido.');
      }
      return buffer;
    }
    function absolute(href, base='https://www.dafont.com/') {
      try { return new URL(href, base).href; }
      catch (_) { return ''; }
    }
    function findFontPage(html, term) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const anchors = [...doc.querySelectorAll('a[href]')];
      const candidates = anchors.map(a => ( {
        href: absolute(a.getAttribute('href')),
        text: (a.textContent || '').trim()
      }
      )).filter(x => x.href && /dafont\.com\/(?:es\/)?[^/?#]+\.font(?:[?#].*)?$/i.test(x.href));
      const q = term.toLowerCase();
      if (!candidates.length) {
        const m = html.match(/href\s*=\s*["']([^"']+\.font(?:[?#][^"']*)?)["']/i);
        if (m) return absolute(m[1].replace(/&amp;/g, '&'));
        throw new Error('No se encontró ninguna página .font de DaFont.');
      }
      return (candidates.find(x => x.text.toLowerCase() === q) ||
      candidates.find(x => x.href.toLowerCase().includes(q)) ||
      candidates.find(x => x.text.toLowerCase().includes(q)) ||
      candidates[0]).href;
    }
    function findDownload(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const links = [...doc.querySelectorAll('a[href]')].map(a => absolute(a.getAttribute('href'))).filter(Boolean);
      const dl = links.find(h => /^https:\/\/dl\.dafont\.com\/dl\/\?f=/i.test(h));
      if (dl) return dl;
      const cleanHtml = html.replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
      const m = cleanHtml.match(/https?:\/\/dl\.dafont\.com\/dl\/\?f=[^"'< >\s&]+/i);
      if (m) return m[0];
      throw new Error('No se encontró la URL de descarga dl.dafont.com.');
    }
    for (const name of names) {
      try {
        const searchUrl = `https://www.dafont.com/es/search.php?q=${encodeURIComponent(name)}`;
        const searchHtml = await fetchCorsIOHTML(searchUrl);
        const page = findFontPage(searchHtml, name);
        const pageHtml = await fetchCorsIOHTML(page);
        const zipUrl = findDownload(pageHtml);
        const zipBuffer = await fetchCorsfixZip(zipUrl);
        if (typeof JSZip === 'undefined') throw new Error('Falta JSZip para extraer DaFont.');
        const zip = await JSZip.loadAsync(zipBuffer);
        const namesInZip = Object.keys(zip.files);
        const fontName = namesInZip.find(n => !zip.files[n].dir && !n.startsWith('__MACOSX/') && /\.(ttf|otf)$/i.test(n));
        if (!fontName) throw new Error('El ZIP de DaFont no contiene TTF/OTF.');
        const bytes = await zip.files[fontName].async('arraybuffer');
        const ok = await loadFromBytes(
        family, bytes, weight, italic,
        `dafont:test_debug:${zipUrl}`,
        true,
        italic ? `${weight} Italic` : String(weight)
  );
        if (ok) { return `dafont:${fontName}`; }
      } catch (e) {
        console.warn(`[FUENTE] DaFont (test_debug) falló para ${family}:`, e);
      }
    }
    return null;
  }
  async function resolverFuente(family, style = 'Regular') {
    const key = `${clean(family)}_${clean(style)}`;
    if (loaded.has(key)) return loaded.get(key);
    if (failed.has(key)) return null;
    if (pending.has(key)) return pending.get(key);
    const p = (async () =>  {
      // ORDEN OBLIGATORIO:
      // 1) Primero comprobar la copia persistida en el GitHub configurado
      //    desde Supabase, EXCLUSIVAMENTE en almacen/fuentes/.
      // 2) Si existe, cargarla y utilizarla inmediatamente en el visor.
      // 3) SOLO si NO existe una copia válida en almacen/fuentes/, resolver
      //    directamente Google Fonts / DaFont / GitHub público siguiendo los
      //    transportes de test_debug.html.
      // 4) En cuanto la fuente externa queda registrada, se usa inmediatamente
      //    en el visor. SOLO DESPUÉS se guarda una copia en almacen/fuentes/
      //    en segundo plano. La subida NUNCA forma parte del camino crítico.
      let source = await resolverGitHubSupabase(family, style);
      if (source) {
        // SALIDA DEFINITIVA: si estaba en Supabase/GitHub, se utiliza ESTA
        // copia y no se consulta ningún proveedor externo ni se vuelve a
        // guardar. Esto garantiza prioridad absoluta de almacen/fuentes/.
        loaded.set(key, source);
        return source;
      }
      // Solo llegamos aquí cuando la fuente NO estaba en almacen/fuentes/.
      source = await resolverGoogle(family, style);
      if (source) {
        loaded.set(key, source);
        return source;
      }
      source = await resolverDaFont(family, style);
      if (source) {
        loaded.set(key, source);
        return source;
      }
      // Último recurso público. Si funciona, loadFromUrl/loadFromBytes ya
      // programa la persistencia en segundo plano.
      source = await resolverGitHubPublic(family, style);
      if (source) {
        loaded.set(key, source);
        return source;
      }
      failed.add(key);
      console.warn(`[FUENTE] ✗ No encontrada: ${family} (${style})`);
      return null;
    }
    )().finally(() => pending.delete(key));
    pending.set(key, p);
    return p;
  }
  async function detectarYResolverFuentePDF(rawFontName) {
    const  { family, style }
    = parseFontFamilyAndStyle(rawFontName);
    const source = await resolverFuente(family, style);
    return  {
      family,
      style,
      source,
      downloaded: !!source,
      inMemory: !!memoryFontBytes.get(`${family}|${styleInfo(style).weight}|${styleInfo(style).italic ? 'italic' : 'normal'}`)
    }
    ;
  }
  async function prepararFuentesDelPlan(plan) {
    const ops = Array.isArray(plan?.operaciones) ? plan.operaciones : [];
    const seen = new Map();
    // Resolver primero TODAS las familias presentes en las operaciones.
    // OJO: algunas operaciones (p.ej. 'reconstruir_caja', usada al borrar
    // nombres/colegio) NO tienen fontName/fontFamily en el propio objeto de
    // operación: cada línea reconstruida lleva su fuente por separado en
    // op.lineas[].fontName. Si solo miramos op.fontName nos las saltamos y
    // el texto reconstruido cae en una fuente genérica más ancha que la
    // original, desbordando el recuadro. Por eso recorremos también las
    // líneas anidadas aquí.
    for (const op of ops) {
      const raw = op?.fontName || op?.fontFamily;
      if (raw) {
        const parsed = parseFontFamilyAndStyle(raw);
        const k = `${clean(parsed.family)}|${clean(parsed.style)}`;
        if (!seen.has(k)) seen.set(k, resolverFuente(parsed.family, parsed.style));
      }
      if (Array.isArray(op.lineas)) {
        for (const line of op.lineas) {
          const rawLinea = line?.fontName || line?.fontFamily;
          if (!rawLinea) continue;
          const parsedLinea = parseFontFamilyAndStyle(rawLinea);
          const kl = `${clean(parsedLinea.family)}|${clean(parsedLinea.style)}`;
          if (!seen.has(kl)) seen.set(kl, resolverFuente(parsedLinea.family, parsedLinea.style));
        }
      }
    }
    await Promise.allSettled([...seen.values()]);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try { await document.fonts.ready; }
      catch (_) { } }
    // Fijar en cada operación la familia EXACTA que ha quedado registrada.
    // El pintado ya no vuelve a interpretar el nombre original del PDF.
    for (const op of ops) {
      const raw = op?.fontName || op?.fontFamily;
      if (raw) {
        const parsed = parseFontFamilyAndStyle(raw);
        const resolved = memoryFontFamily.get(fontMemoryKey(
        parsed.family, styleInfo(parsed.style).weight, styleInfo(parsed.style).italic
        ));
        if (resolved) {
          op._resolvedFontFamily = resolved;
          op._resolvedFontStyle = parsed.style || 'Regular';
        }
      }
      if (Array.isArray(op.lineas)) {
        for (const line of op.lineas) {
          const r = String(line?.fontName || line?.fontFamily || raw || '');
          if (!r) continue;
          const p = parseFontFamilyAndStyle(r);
          const rf = memoryFontFamily.get(fontMemoryKey(
          p.family, styleInfo(p.style).weight, styleInfo(p.style).italic
          ));
          if (rf) {
            line._resolvedFontFamily = rf;
            line._resolvedFontStyle = p.style || 'Regular';
          }
        }
      }
    }
  }
  // Compatibilidad con el nombre anterior.
  async function resolverFuenteGitHub(family, style = 'Regular') {
    const result = await resolverFuente(family, style);
    return !!result;
  }
  function fuenteEnMemoria(family, style = 'Regular') {
    const  { weight, italic }
    = styleInfo(style);
    return memoryFontBytes.get(`${family}|${weight}|${italic ? 'italic' : 'normal'}`) || null;
  }
  if (typeof window !== 'undefined') {
    window.parseFontFamilyAndStyle = parseFontFamilyAndStyle;
    window.resolverFuente = resolverFuente;
    window.resolverFuenteGitHub = resolverFuenteGitHub;
    window.detectarYResolverFuentePDF = detectarYResolverFuentePDF;
    window.prepararFuentesDelPlan = prepararFuentesDelPlan;
    window.fuenteEnMemoria = fuenteEnMemoria;
    window.__DDD_FUENTES_MEMORIA = memoryFontBytes;
    window.__DDD_FUENTES_ORIGEN = memoryFontSource;
    window.__DDD_FUENTES_FAMILIA = memoryFontFamily;
    window.fuenteFamiliaCSS = fuenteFamiliaCSS;
    window.dddFuenteCSS = dddFuenteCSS;
    window.__DDD_FUENTES_GITHUB_STORAGE = FONT_STORAGE_DIR;
    window.guardarFuenteEnGithubSupabase = guardarFuenteEnGithubSupabase;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports =  {
      parseFontFamilyAndStyle,
      resolverFuente,
      detectarYResolverFuentePDF,
      prepararFuentesDelPlan,
      fuenteEnMemoria,
      dddFuenteCSS
    }
    ;
  }
}
)();
/* ============================================================
 * DaFont: descarga interna ZIP -> TTF/OTF -> FontFace
 * No abre DaFont en otra pestaña.
 * ============================================================ */
async function cargarFuenteDaFontDesdeDescarga(urlDescarga, familia) {
  if (!urlDescarga) { throw new Error("DaFont: no se ha encontrado el enlace de descarga."); }
  let url = urlDescarga;
  if (url.startsWith("//")) url = "https:" + url;
  const respuesta = await fetch(url,  {
    method: "GET",
    credentials: "omit"
  }
  );
  if (!respuesta.ok) { throw new Error(`DaFont: descarga HTTP ${respuesta.status}`); }
  const blob = await respuesta.blob();
  // DaFont entrega normalmente un ZIP.
  if (typeof JSZip === "undefined") {
    throw new Error(
    "DaFont: falta JSZip para extraer el TTF/OTF del ZIP descargado."
  );
  }
  const zip = await JSZip.loadAsync(blob);
  const nombres = Object.keys(zip.files);
  const nombreFuente = nombres.find(nombre =>  {
    if (zip.files[nombre].dir) return false;
    return /\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/i.test(nombre);
  }
  );
  if (!nombreFuente) { throw new Error("DaFont: el ZIP no contiene ningún TTF, OTF, WOFF o WOFF2."); }
  const bytes = await zip.files[nombreFuente].async("arraybuffer");
  const face = new FontFace(familia, bytes);
  await face.load();
  document.fonts.add(face);
  return  {
    family: familia,
    file: nombreFuente,
    bytes: bytes.byteLength,
    fontFace: face
  }
  ;
}
/**
 * Convierte un enlace de DaFont del formato:
 *   //dl.dafont.com/dl/?f=algerian_concrete
 * en una URL absoluta.
 */
function normalizarUrlDescargaDaFont(href) {
  if (!href) return null;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return "https://www.dafont.com" + href;
  return href;
}
