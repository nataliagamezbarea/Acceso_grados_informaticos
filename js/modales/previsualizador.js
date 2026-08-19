const configRepo = () => (window.GITHUB_CONFIG || {}).repo || "";

const ramaActualArchivo = () =>
  new URLSearchParams(window.location.search).get("rama") ||
  (window.Estado ? window.Estado.obtener("rama") : "") ||
  (window.RamaActual ? window.RamaActual.obtener() : "") ||
  "";

function urlApiContenido(ruta) {
  const limpia = String(ruta).replace(/^\.?\//, "");
  const partes = limpia.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${configRepo()}/contents/${partes}?ref=${encodeURIComponent(ramaActualArchivo())}`;
}

async function fetchArchivoDesdeGitHub(ruta) {
  try {
    if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
      await window.Permisos.asegurarSesion();
    }
  } catch (e) {}
  const config = window.GITHUB_CONFIG || {};
  const token = typeof config.obtenerTokenSeguro === "function" ? config.obtenerTokenSeguro() : (config.token || "");
  const headers = { Accept: "application/vnd.github.raw", "User-Agent": "grados-informaticos" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(urlApiContenido(ruta), { headers });
  if (!res.ok) throw new Error("No se pudo leer el archivo (" + res.status + ")");
  return res;
}

const fetchFuente = async (u) =>
  /^https?:\/\//i.test(u) ? fetch(u) : fetchArchivoDesdeGitHub(u);

async function abrirArchivo(url, nombre) {
  if (/^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener");
    return;
  }
  let nombreFinal = nombre || url.split("/").pop();
  if (window.sanearNombreInvitado) {
    nombreFinal = window.sanearNombreInvitado(nombreFinal);
  }
  const rama = (window.Estado ? window.Estado.obtener("rama") : "") || (window.RamaActual ? window.RamaActual.obtener() : "compartido");
  const enModulos = window.location.pathname.includes("/modulos");

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    try {
      if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
        await window.Permisos.asegurarSesion();
      }
      const config = window.GITHUB_CONFIG || {};
      const token = typeof config.obtenerTokenSeguro === "function" ? config.obtenerTokenSeguro() : "";
      if (token && window.Permisos && typeof window.Permisos.enviarTokenAlServiceWorker === "function") {
        window.Permisos.enviarTokenAlServiceWorker(token);
      }
    } catch (e) {}
    try {
      const rutaNombrada = enModulos
        ? `archivos/${encodeURIComponent(nombreFinal)}?ruta=${encodeURIComponent(url)}&nombre=${encodeURIComponent(nombreFinal)}&rama=${encodeURIComponent(rama)}`
        : `modulos/archivos/${encodeURIComponent(nombreFinal)}?ruta=${encodeURIComponent(url)}&nombre=${encodeURIComponent(nombreFinal)}&rama=${encodeURIComponent(rama)}`;

      window.open(rutaNombrada, "_blank");
      return;
    } catch (e) {}
  }

  const rutaVisor = enModulos ? "visor.html" : "modulos/visor.html";
  const urlVisor = `${rutaVisor}?archivo=${encodeURIComponent(url)}&nombre=${encodeURIComponent(nombreFinal)}&rama=${encodeURIComponent(rama)}`;
  window.open(urlVisor, "_blank");
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

  const mostrar = (html) => {
    contenido.innerHTML = contenidoHTML + html;
    popover.showPopover();
  };

  if (ext === "ipynb") {
    fetchFuente(url)
      .then((res) => res.text())
      .then((texto) => {
        let contenidoFormateado = "";
        try {
          const notebook = JSON.parse(texto);
          notebook.cells.forEach((cell) => {
            if (cell.cell_type === "markdown") {
              contenidoFormateado += `<div class="markdown-cell">${marked.parse(cell.source.join(""))}</div>\n`;
            } else if (cell.cell_type === "code") {
              contenidoFormateado += `<pre class="code-cell">${cell.source.join("")}</pre>\n`;
            }
          });
        } catch (err) {
          contenidoFormateado = "Error al formatear el notebook: " + err;
        }
        mostrar(contenidoFormateado);
      })
      .catch((err) => alert("No se pudo cargar el archivo: " + err));

  } else if (ext === "html") {
    fetchFuente(url)
      .then((res) => res.text())
      .then((html) => {
        mostrar(`<iframe srcdoc="${html.replace(/"/g, "&quot;")}" style="width:100%;height:600px;border:none;"></iframe>`);
      })
      .catch((err) => alert("No se pudo cargar el archivo HTML: " + err));

  } else {
    fetchFuente(url)
      .then((res) => res.text())
      .then((texto) => mostrar(`<pre class="code-cell">${texto}</pre>`))
      .catch((err) => alert("No se pudo cargar el archivo: " + err));
  }
}

window.urlApiContenido = urlApiContenido;
window.fetchArchivoDesdeGitHub = fetchArchivoDesdeGitHub;
window.abrirArchivo = abrirArchivo;
window.resolverArchivo = resolverArchivo;
window.mostrarArchivo = mostrarArchivo;
