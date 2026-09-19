const _TREE_CACHE_TTL = 5 * 60 * 1000;
const _BRANCH_CACHE_TTL = 5 * 60 * 1000;
function _githubCacheDisabled() {
  try { return window.visorAdminCacheDisabled?.() === true || window.__VISOR_ADMIN_CACHE_DISABLED === true; }
  catch (_) { return false; }
}

async function tree(repo, branch) {
  const cacheKey = repo + "::" + branch;
  if (!_githubCacheDisabled() && cache.trees.has(cacheKey)) {
    const item = cache.trees.get(cacheKey);
    if (item && Array.isArray(item.paths)) {
      if (Date.now() - Number(item.savedAt || 0) < _TREE_CACHE_TTL) return item.paths;
    } else if (Array.isArray(item)) {
      // Compatibilidad con una caché creada por una versión anterior.
      cache.trees.delete(cacheKey);
    }
    cache.trees.delete(cacheKey);
  }
  // No pedir /git/trees para una rama que no existe: así evitamos 404.
  const ramas = await ramasRepositorio(repo);
  if (!ramas.includes(String(branch))) {
    if (!_githubCacheDisabled()) cache.trees.set(cacheKey, { paths: [], savedAt: Date.now() });
    return [];
  }
  const r = await ghRequest(repo, "git/trees/" + encodeURIComponent(branch) + "?recursive=1");
  if (!r.ok) {
    if (!_githubCacheDisabled()) cache.trees.set(cacheKey, { paths: [], savedAt: Date.now() });
    return [];
  }
  const d = await r.json();
  const paths = Array.isArray(d.tree) ? d.tree.filter(x => x.type === "blob").map(x => x.path) : [];
  if (!_githubCacheDisabled()) cache.trees.set(cacheKey, { paths, savedAt: Date.now() });
  return paths;
}
async function ramasRepositorio(repo) {
  if (!_githubCacheDisabled() && cache.branches && cache.branches._savedAt) {
    if (Date.now() - cache.branches._savedAt < _BRANCH_CACHE_TTL) return cache.branches.items;
  }
  try {
    const r = await ghRequest(repo, "branches?per_page=100");
    if (r.ok) {
      const ramas = await r.json();
      const items = Array.isArray(ramas) ? ramas.map(x => String(x?.name || "").trim()).filter(Boolean) : [];
      cache.branches = _githubCacheDisabled() ? null : { items, _savedAt: Date.now() };
      return items;
    }
  } catch (_) {
  }
  cache.branches = _githubCacheDisabled() ? null : { items: [], _savedAt: Date.now() };
  return [];
}
async function ramaExiste(repo, branch) {
  if (!branch) return false;
  const ramas = await ramasRepositorio(repo);
  return ramas.includes(branch);
}
async function findPdf(repo, branch, filename) {
  const cleanName = String(filename || "").split("/").pop().toLowerCase();
  try {
    const paths = await tree(repo, branch);
    if (paths && paths.length) {
      const exact = paths.find(p => p.toLowerCase() === String(filename || "").toLowerCase());
      if (exact) return exact;
      const byBase = paths.find(p => p.split("/").pop().toLowerCase() === cleanName);
      if (byBase) return byBase;
    }
  } catch (_) {
  }
  return null;
}
async function cargarJsonDeRepositorio(rutaRelativa, ramaPreferida = "master") {
  const c = await getConfig();
  const repo = c.repo;
  if (!repo) return null;
  const cleanRuta = String(rutaRelativa || "").replace(/^\//, "");
  // Los datos del almacén son GENERALES: viven en master.
  // Antes se probaban main y después todas las ramas, provocando una
  // cascada de GET 404 innecesarios en el Visor Admin.
  // Primero consultamos el árbol de master y SOLO hacemos GET si el archivo
  // realmente existe. Así un archivo ausente se trata como inexistente,
  // sin generar peticiones 404 a GitHub.
  const ramaDatos = "master";
  try {
    const paths = await tree(repo, ramaDatos);
    const existe = paths.some(p => String(p).toLowerCase() === cleanRuta.toLowerCase());
    if (!existe) return null;
  } catch (_) {
    return null;
  }
  const x = await getContent(cleanRuta, ramaDatos, repo);
  try { return x && x.text ? JSON.parse(x.text) : null; }
  catch (_) { return null; }
}
