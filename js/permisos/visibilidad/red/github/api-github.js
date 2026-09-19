/*
 * MÓDULO: Red - GitHub API
 * Operaciones de lectura y escritura de contenidos y blobs mediante la API REST de GitHub.
 */
(function (global) {
  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};
  const cleanGithubPath = (path) => String(path || "").replace(/^\/+/, "");

  const headers = (token) => {
    const h = getMod("Repositorios").headers
      ? getMod("Repositorios").headers(token)
      : (() => {
          const hh = { Accept: "application/vnd.github+json", "User-Agent": "grados-informaticos" };
          if (token) hh.Authorization = `Bearer ${token}`;
          return hh;
        })();
    console.debug(`[API-GITHUB] headers: ${h.Authorization ? "con Authorization (token Supabase del llamador)" : "sin token (lo resuelve PETICIONES desde Supabase)"}`);
    return h;
  };

  const decode64 = (s) => {
    if (getMod("Http").decode64) return getMod("Http").decode64(s);
    try {
      const bin = (typeof atob === "function" ? atob : (b) => Buffer.from(b, "base64").toString("binary"))(String(s).replace(/\s+/g, ""));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
    } catch (_) { return ""; }
  };

  const encode64 = (s) => {
    if (getMod("Http").encode64) return getMod("Http").encode64(s);
    const bytes = new TextEncoder().encode(String(s ?? ""));
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return (typeof btoa === "function" ? btoa : (b) => Buffer.from(b, "binary").toString("base64"))(bin);
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

  /* ---------- GitHub lectura ---------- */
  const githubFile = async (repo, path, branch, token) => {
    path = cleanGithubPath(path);
    if (!repo || !path || !branch) return null;
    const rawPath = path.split("/").map(encodeURIComponent).join("/");

    if (!token) {
      try {
        const ramaUrl = encodeURIComponent(branch).replace(/%2F/g, "/");
        const rawUrl = `https://raw.githubusercontent.com/${repo}/${ramaUrl}/${rawPath}`;
        const raw = await fetchConReintentos(rawUrl, { cache: "no-store" });
        if (raw.ok) return { sha: "", content: (await raw.text()).replace(/^\uFEFF/, ""), path, download_url: rawUrl };
        if (raw.status === 404) return null;
      } catch (_) { return null; }
    }

    const ramaApi = encodeURIComponent(branch);
    const url = `https://api.github.com/repos/${repo}/contents/${rawPath}?ref=${ramaApi}`;
    try {
      // Usar fetch directo para 404 esperados (archivos aún no publicados o ya retirados)
      const res = await fetch(url, { headers: headers(token) });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      return { sha: data.sha || "", content: decode64(data.content || ""), path: data.path || path, download_url: data.download_url || "" };
    } catch (_) {
      return null;
    }
  };

  const githubBlobBase64 = async (repo, path, branch, token) => {
    if (!repo || !path || !branch || !token) {
      return null;
    }

    const arrayBufferToBase64 = (buffer) => {
      if (typeof Buffer !== "undefined") {
        if (Buffer.isBuffer(buffer)) return buffer.toString("base64");
        if (buffer instanceof ArrayBuffer) return Buffer.from(buffer).toString("base64");
        if (ArrayBuffer.isView(buffer)) return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength).toString("base64");
      }
      const bytes = ArrayBuffer.isView(buffer)
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer);
      let binary = "";
      const len = bytes.byteLength;
      for (let i = 0; i < len; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return (typeof btoa === "function" ? btoa : (b) => Buffer.from(b, "binary").toString("base64"))(binary);
    };

    const getBlob = async (sha, downloadUrl, filePath) => {
      if (!sha && !downloadUrl && !filePath) return null;

      // 1) Si tenemos la ruta del archivo, la forma 100% libre de CORS en navegadores
      // para descargar binarios de repos privados es la API REST oficial de GitHub Contents
      // con cabecera Accept: application/vnd.github.raw+json (api.github.com siempre tiene CORS abierto para Authorization Bearer).
      if (filePath) {
        try {
          const rawEndpoint = `https://api.github.com/repos/${repo}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`;
          const rawApiRes = await fetchConReintentos(rawEndpoint, {
            headers: {
              ...headers(token),
              Accept: "application/vnd.github.raw+json"
            }
          }, 2);
          if (rawApiRes.ok) {
            const buf = await rawApiRes.arrayBuffer();
            return arrayBufferToBase64(buf);
          }
        } catch (_) {}
      }

      // 2) Si hay downloadUrl directo (GitHub genera una URL temporal firmada o CDN).
      //    En el navegador las URLs de *.githubusercontent.com con token firmado NO permiten CORS
      //    (raw/media/objects...), así que se omiten para evitar errores de red; solo se usan
      //    fuera de un navegador (Node/Electron) donde no hay política CORS.
      const enNavegador = typeof window !== "undefined";
      const esGithubusercontent = /^https:\/\/[^/]*\.githubusercontent\.com\//.test(String(downloadUrl || ""));
      if (downloadUrl && (!enNavegador || !esGithubusercontent)) {
        try {
          const rawRes = await fetchConReintentos(downloadUrl, {}, 2);
          if (rawRes.ok) {
            const buf = await rawRes.arrayBuffer();
            return arrayBufferToBase64(buf);
          }
        } catch (_) {}
      }

      // 3) Si falla o es archivo pequeño, consultar el endpoint de blobs con timeout
      if (sha) {
        try {
          const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
          const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs/${encodeURIComponent(sha)}`, {
            headers: headers(token),
            signal: controller?.signal
          });
          if (timeoutId) clearTimeout(timeoutId);
          if (blobRes.ok) {
            const blob = await blobRes.json();
            if (blob?.encoding === "base64") return String(blob.content || "").replace(/\s+/g, "");
          }
        } catch (_) {}
      }
      return null;
    };

    path = cleanGithubPath(path);
    const rawPath = path.split("/").map(encodeURIComponent).join("/");
    const ramaApi = encodeURIComponent(branch);
    const url = `https://api.github.com/repos/${repo}/contents/${rawPath}?ref=${ramaApi}`;
    const metaRes = await fetchConReintentos(url, { headers: headers(token) });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta && meta.content && String(meta.encoding || "").toLowerCase() === "base64") return String(meta.content).replace(/\s+/g, "");
      if (meta?.sha || meta?.download_url) return await getBlob(meta.sha, meta.download_url, path);
      return null;
    }

    // GitHub puede devolver 404 aunque el archivo exista con otra ruta/nombre
    // (por ejemplo, diferencias de acentos o nombres saneados en el CSV).
    // Buscamos el árbol real de la rama usando el gh_token privado que recibe
    // esta función y resolvemos primero por ruta normalizada y después por
    // nombre de archivo. Esto evita que un 404 de la ruta del CSV bloquee
    // la publicación.
    if (metaRes.status === 404) {
      const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: headers(token) });
      if (treeRes.ok) {
        const tree = await treeRes.json();
        const objetivo = String(path).replace(/^\/+/, "");
        const normalizarRutaGit = (v) => String(v || "")
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        const objetivoNorm = normalizarRutaGit(objetivo);
        const objetivoBaseNorm = normalizarRutaGit(objetivo.split("/").pop());
        const archivos = (tree.tree || []).filter(x => x?.type === "blob" && x?.path);
        const exactoNorm = archivos.find(x => normalizarRutaGit(x.path) === objetivoNorm);
        const mismoNombre = archivos.find(x => normalizarRutaGit(String(x.path).split("/").pop()) === objetivoBaseNorm);
        const encontrado = exactoNorm || mismoNombre;
        if (encontrado?.sha) return await getBlob(encontrado.sha, null, encontrado.path);
      }
      return null;
    }

    throw new Error(`GitHub GET ${path}: ${metaRes.status}`);
  };

  const ramaPublicaExiste = async (repo, branch, token = "") => {
    if (!repo || !branch) return false;
    try {
      const url = `https://api.github.com/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`;
      const res = await fetch(url, {
        headers: headers(token),
        cache: "no-store"
      });
      return res.ok;
    } catch (_) {
      return false;
    }
  };

  const obtenerArbolRepo = async (repo, branch, token = "") => {
    if (!repo || !branch) return null;
    try {
      const res = await fetchConReintentos(
        `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1&_t=${Date.now()}`,
        {
          headers: { ...headers(token), "If-None-Match": "" },
          cache: "no-store"
        },
        2
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data?.tree || [])
        .filter(x => x?.type === "blob" && x?.path)
        .map(x => ({ path: x.path, sha: x.sha, size: x.size || 0 }));
    } catch (_) {
      return null;
    }
  };

  /* ---------- GitHub escritura ---------- */
  const obtenerShaFresco = async (repo, path, branch, token) => {
    path = cleanGithubPath(path);
    if (!repo || !path || !branch) return null;
    const cleanPath = path.split("/").map(encodeURIComponent).join("/");
    const cleanBranch = encodeURIComponent(branch);
    try {
      const url = `https://api.github.com/repos/${repo}/contents/${cleanPath}?ref=${cleanBranch}&_t=${Date.now()}`;
      const res = await fetch(url, {
        headers: { ...headers(token), "If-None-Match": "" },
        cache: "no-store"
      });
      if (res.ok) {
        const d = await res.json();
        return d.sha || null;
      }
      if (res.status === 404) return null;
    } catch (_) {}

    try {
      const treeRes = await fetchConReintentos(`https://api.github.com/repos/${repo}/git/trees/${cleanBranch}?recursive=1&_t=${Date.now()}`, {
        headers: { ...headers(token), "If-None-Match": "" },
        cache: "no-store"
      });
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        const baseNorm = norm(path.split("/").pop());
        const match = (treeData.tree || []).find(x => norm(x.path).endsWith(baseNorm));
        if (match?.sha) return match.sha;
      }
    } catch (_) {}

    return null;
  };

  const putFile = async (repo, path, branch, content, token, message, sha) => {
    path = cleanGithubPath(path);
    path = cleanGithubPath(path);
    path = cleanGithubPath(path);
    const url = `https://api.github.com/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    const maxIntentos = 4;
    let currentSha = sha || null;
    // Si no conocemos el sha, resolver el existente antes del PUT para evitar
    // el 422 "sha required" del primer intento en archivos ya creados.
    if (!currentSha) {
      currentSha = (await obtenerShaFresco(repo, path, branch, token)) || null;
    }
    for (let intento = 1; intento <= maxIntentos; intento++) {
      const body = { message: message || "Actualizar material", content: encode64(content), branch };
      if (currentSha) body.sha = currentSha;
      console.debug(`[API-GITHUB] PUT ${path} (intento ${intento}/${maxIntentos}) -> sha: ${currentSha ? "SI" : "NO"}`);
      const res = await fetchConReintentos(url, {
        method: "PUT",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) return res.json();
      const txt = await res.text().catch(() => "");
      if ((res.status === 409 || res.status === 422) && intento < maxIntentos) {
        const isRuleTimeout = txt.includes("rule violations") || txt.includes("Timed out validating rule");
        const delay = isRuleTimeout ? 3000 * intento : 1500 * intento;
        await new Promise(resolve => setTimeout(resolve, delay));
        // GitHub suele responder: "path does not match <expected_sha>"
        const matchExpected = txt.match(/does not match\s+([0-9a-f]{40})/i);
        if (matchExpected && matchExpected[1]) {
          currentSha = matchExpected[1];
        } else {
          currentSha = await obtenerShaFresco(repo, path, branch, token);
        }
        continue;
      }
      throw new Error(`GitHub PUT ${path}: ${res.status} ${txt}`);
    }
  };

  const putFileBase64 = async (repo, path, branch, contentBase64, token, message, sha) => {
    const url = `https://api.github.com/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    const cleanB64 = String(contentBase64 || "").replace(/\s+/g, "");
    const maxIntentos = 4;
    let currentSha = sha || null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      const body = {
        message: message || "Actualizar material público",
        content: cleanB64,
        branch
      };
      if (currentSha) body.sha = currentSha;

      const res = await fetchConReintentos(url, {
        method: "PUT",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const txt = await res.text().catch(() => "");
      if (res.ok) {
        try { return JSON.parse(txt); } catch (_) { return {}; }
      }

      console.warn(`[API-GITHUB] Error ${res.status} al subir ${path}:`, txt);

      if ((res.status === 409 || res.status === 422) && intento < maxIntentos) {
        const isRuleTimeout = txt.includes("rule violations") || txt.includes("Timed out validating rule");
        const delay = isRuleTimeout ? 3000 * intento : 1500 * intento;
        await new Promise(resolve => setTimeout(resolve, delay));
        const matchExpected = txt.match(/does not match\s+([0-9a-f]{40})/i);
        if (matchExpected && matchExpected[1]) {
          currentSha = matchExpected[1];
        } else {
          currentSha = await obtenerShaFresco(repo, path, branch, token);
        }
        continue;
      }

      throw new Error(`GitHub PUT público ${path}: ${res.status} ${txt}`);
    }
  };

  const deleteFile = async (repo, path, branch, token, sha, message) => {
    if (!sha) return;
    const url = `https://api.github.com/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    const maxIntentos = 3;
    let currentSha = sha;
    for (let intento = 1; intento <= maxIntentos; intento++) {
      const res = await fetchConReintentos(url, {
        method: "DELETE",
        headers: { ...headers(token), "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || "Mover material", sha: currentSha, branch })
      });
      if (res.status === 404) return;
      if (res.ok) return;
      const txt = await res.text().catch(() => "");
      if (res.status === 409 && intento < maxIntentos) {
        await new Promise(resolve => setTimeout(resolve, 1500 * intento));
        const f = await githubFile(repo, path, branch, token);
        if (!f?.sha) return;
        currentSha = f.sha;
        continue;
      }
      throw new Error(`GitHub DELETE ${path}: ${res.status} ${txt}`);
    }
  };

  const ApiGithub = {
    githubFile,
    githubBlobBase64,
    ramaPublicaExiste,
    obtenerArbolRepo,
    putFile,
    putFileBase64,
    deleteFile
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ApiGithub;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.ApiGithub = ApiGithub;
})(typeof window !== "undefined" ? window : globalThis);
