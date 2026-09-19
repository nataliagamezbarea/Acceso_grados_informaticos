/*
 * MÓDULO: Red - Historial GitHub
 * Aplanamiento del historial Git mediante commits raíz sin padres (parents: [])
 * para asegurar que material retirado de público no permanezca en el historial de la rama.
 */
(function (global) {
  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};

  const headers = (token) => {
    if (getMod("Repositorios").headers) return getMod("Repositorios").headers(token);
    const h = { Accept: "application/vnd.github+json", "User-Agent": "grados-informaticos" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchConReintentos = async (url, opciones = {}, maxIntentos = 3) => {
    if (getMod("Http").fetchConReintentos) return getMod("Http").fetchConReintentos(url, opciones, maxIntentos);
    let ultimoError = null;
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try { return await fetch(url, opciones); }
      catch (e) {
        ultimoError = e;
        if (intento < maxIntentos) await new Promise(r => setTimeout(r, 600 * intento));
      }
    }
    throw ultimoError || new Error(`Fallo de conexión persistente con GitHub en ${url}`);
  };

  const aplanarHistorial = async (repo, branch, token, message) => {
    if (!repo || !branch || !token) return;
    try {
      const cleanBranch = String(branch).replace(/^refs\/heads\//, "");
      const branchRef = `refs/heads/${cleanBranch}`;
      const refUrl = `https://api.github.com/repos/${repo}/git/refs/heads/${encodeURIComponent(cleanBranch)}`;
      const patchUrl = `https://api.github.com/repos/${repo}/git/${branchRef}`;
      const refRes = await fetchConReintentos(refUrl, { headers: headers(token) });
      if (!refRes.ok) return;
      const refData = await refRes.json();
      const currentCommitSha = Array.isArray(refData) ? refData[0]?.object?.sha : refData?.object?.sha;
      if (!currentCommitSha) return;

      const commitRes = await fetchConReintentos(`https://api.github.com/repos/${repo}/git/commits/${encodeURIComponent(currentCommitSha)}`, { headers: headers(token) });
      if (!commitRes.ok) return;
      const commitData = await commitRes.json();
      const treeSha = commitData?.tree?.sha;
      if (!treeSha) return;

      const rootRes = await fetchConReintentos(`https://api.github.com/repos/${repo}/git/commits`, {
        method: "POST",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message || "Actualizar material (historial limpio)",
          tree: treeSha,
          parents: []
        })
      });
      if (!rootRes.ok) return;
      const rootData = await rootRes.json();
      if (!rootData?.sha) return;

      const patchRes = await fetchConReintentos(patchUrl, {
        method: "PATCH",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          sha: rootData.sha,
          force: true
        })
      });
      if (!patchRes.ok && patchRes.status === 404) {
        // Fallback para variantes de la API de GitHub
        await fetchConReintentos(refUrl, {
          method: "PATCH",
          headers: { ...headers(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            sha: rootData.sha,
            force: true
          })
        });
      }
    } catch (_) {}
  };

  const HistorialGithub = {
    aplanarHistorial
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = HistorialGithub;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.HistorialGithub = HistorialGithub;
})(typeof window !== "undefined" ? window : globalThis);
