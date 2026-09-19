const configRepo = () => (window.GITHUB_CONFIG ||  {
}
).repo || "";
const ramaActualArchivo = () => {
  try {
    const deEstado = window.Estado?.obtener?.('rama');
    if (deEstado) return String(deEstado).trim();
  } catch (_) {}
  try {
    const deRama = window.RamaActual?.obtener?.();
    if (deRama) return String(deRama).trim();
  } catch (_) {}
  try {
    const c = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
    if (c.rama) return String(c.rama).trim();
  } catch (_) {}
  return localStorage.getItem('rama_actual') || localStorage.getItem('last_grado') || "";
};
function apiBaseContenido(ruta, rama) {
  const limpia = String(ruta).replace(/^\.?\//, '');
  const partes = limpia.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${configRepo()}/contents/${partes}?ref=${encodeURIComponent(rama)}`;
}
function urlApiContenido(ruta) { return apiBaseContenido(ruta, ramaActualArchivo()); }
async function resolverRutaRemota(ruta, rama) {
  const repo = configRepo();
  const clean = String(ruta).replace(/^\.?\//, '');
  if (!repo || !rama) return  { path: clean, branch: rama || '' }
  ;
  const token = typeof (window.GITHUB_CONFIG ||  {
  }
  ).obtenerTokenSeguro === 'function' ? window.GITHUB_CONFIG.obtenerTokenSeguro() : ((window.GITHUB_CONFIG ||  {
  }
  ).token || '');
  const h =  { Accept: 'application/vnd.github+json' }
  ;
  if (token) h.Authorization = `Bearer ${token}`;
  const candidatos = [String(rama).trim()];
  if (!/_limpia$/i.test(rama)) candidatos.push(String(rama).trim() + '_limpia');
  const base = clean.split('/').pop().toLowerCase();
  // Primero buscamos en la rama conocida; solo si no existe ahí probamos el
  // nombre base en las variantes de la rama. Nunca devolvemos una ruta que no
  // haya sido encontrada, evitando un GET /contents que sabemos que será 404.
  for (const branch of candidatos) {
    try {
      const tr = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,  { headers:h, cache:'no-store' }
  );
      if (!tr.ok) continue;
      const d = await tr.json();
      const paths = Array.isArray(d.tree) ? d.tree.filter(x=>x.type==='blob').map(x=>x.path) : [];
      const exact = paths.find(p=>String(p).toLowerCase()===clean.toLowerCase());
      if (exact) return  { path: exact, branch }
      ;
      const byBase = paths.find(p=>String(p).split('/').pop().toLowerCase()===base);
      if (byBase) return  { path: byBase, branch }
      ;
    } catch (_) {
    }
  }
  return null;
}
async function fetchArchivoParaPrevisualizar(ruta) {
  try {
    if (window.Permisos && typeof window.Permisos.asegurarSesion === 'function') await window.Permisos.asegurarSesion();
  } catch (_) {
  }
  const config = window.GITHUB_CONFIG ||  {
  }
  ;
  const token = typeof config.obtenerTokenSeguro === 'function' ? config.obtenerTokenSeguro() : (config.token || '');
  const rama = ramaActual();
  const resuelto = await resolverRutaRemota(ruta, rama);
  if (!resuelto) throw new Error('No se encontró el archivo en la rama seleccionada.');
  const headers =  { Accept:'application/vnd.github.raw', 'User-Agent':'grados-informaticos' }
  ;
  if (token) headers.Authorization=`Bearer ${token}`;
  const res = await fetch(apiBaseContenido(resuelto.path, resuelto.branch),  { headers }
  );
  if (!res.ok) throw new Error('No se pudo leer el archivo (' + res.status + ')');
  return res;
}
const fetchFuente = async (u) => /^https?:\/\//i.test(u) ? fetch(u) : fetchArchivoParaPrevisualizar(u);
async function abrirArchivo(url, nombre) {
  if (/^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener");
    return;
  }
  let nombreFinal = nombre || url.split("/").pop();
  if (window.sanearNombreInvitado) { nombreFinal = window.sanearNombreInvitado(nombreFinal); }
  const ventana = window.open("about:blank", "_blank");
  if (!ventana) {
    alert("El navegador ha bloqueado la nueva pestaña. Permite ventanas emergentes para esta página.");
    return;
  }
  try {
    const res = await fetchArchivoParaPrevisualizar(url);
    const blob = await res.blob();
    const ext = (nombreFinal.split(".").pop() || "").toLowerCase();
    const mimeMap =  {
      pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", txt: "text/plain", csv: "text/csv", html: "text/html", json: "application/json", js: "text/javascript", css: "text/css"
    }
    ;
    const mime = mimeMap[ext] || blob.type || "application/octet-stream";
    const archivoConNombre = new File([blob], nombreFinal,  { type: mime }
  );
    const objUrl = URL.createObjectURL(archivoConNombre);
    ventana.location.href = objUrl;
    ventana.document.title = nombreFinal;
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
  } catch (err) {
    try { ventana.close(); }
    catch (e) {
    }
    alert("No se pudo cargar el archivo: " + (err.message || err));
  }
}
function resolverArchivo(url) {
  if (/^https?:\/\//i.test(url)) {
    const blob = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/i);
    if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
    return url;
  }
  return urlApiContenido(url);
}
function mostrarArchivo(url, nombre) {
  const popover = document.getElementById("popover");
  const contenido = document.getElementById("contenido-popover");
  if (!popover || !contenido) return;
  const ext = (nombre.split(".").pop() || "").toLowerCase();
  let contenidoHTML = `<strong>Archivo: ${nombre}</strong><br><br>`;
  const mostrar = (html) =>  {
    contenido.innerHTML = contenidoHTML + html;
    popover.showPopover();
  }
  ;
  if (ext === "ipynb") {
    fetchFuente(url) .then((res) => res.text()) .then((texto) =>  {
      let contenidoFormateado = "";
      try {
        const notebook = JSON.parse(texto);
        notebook.cells.forEach((cell) =>  {
          if (cell.cell_type === "markdown") { contenidoFormateado += `<div class="markdown-cell">${marked.parse(cell.source.join(""))}</div>\n`; }
          else if (cell.cell_type === "code") { contenidoFormateado += `<pre class="code-cell">${cell.source.join("")}</pre>\n`; }
        }
  );
      } catch (err) {
        contenidoFormateado = "Error al formatear el notebook: " + err;
      }
      mostrar(contenidoFormateado);
    }
    ) .catch((err) => alert("No se pudo cargar el archivo: " + err));
  } else if (ext === "html") {
    fetchFuente(url) .then((res) => res.text()) .then((html) =>  { mostrar(`<iframe srcdoc="${html.replace(/"/g, "&quot;")}" style="width:100%;height:600px;border:none;"></iframe>`); }
    ) .catch((err) => alert("No se pudo cargar el archivo HTML: " + err));
  } else {
    fetchFuente(url) .then((res) => res.text()) .then((texto) => mostrar(`<pre class="code-cell">${texto}</pre>`)) .catch((err) => alert("No se pudo cargar el archivo: " + err));
  }
}
window.urlApiContenido = urlApiContenido;
window.fetchArchivoParaPrevisualizar = fetchArchivoParaPrevisualizar;
window.abrirArchivo = abrirArchivo;
window.resolverArchivo = resolverArchivo;
window.mostrarArchivo = mostrarArchivo;
