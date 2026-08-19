async function cargarJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    s.onload = () => res(window.JSZip);
    s.onerror = () => rej(new Error("Error al cargar JSZip"));
    document.head.appendChild(s);
  });
}

function conMimeCorrecto(blob, nombre) {
  if (!blob) return blob;
  const n = (nombre || "").toLowerCase();
  let t = blob.type;
  if (n.endsWith(".pdf")) t = "application/pdf";
  else if (n.endsWith(".png")) t = "image/png";
  else if (n.endsWith(".jpg") || n.endsWith(".jpeg")) t = "image/jpeg";
  else if (n.endsWith(".webp")) t = "image/webp";
  else if (n.endsWith(".txt")) t = "text/plain";
  else if (n.endsWith(".md")) t = "text/markdown";
  else if (n.endsWith(".html") || n.endsWith(".htm")) t = "text/html";
  else if (n.endsWith(".css")) t = "text/css";
  else if (n.endsWith(".js")) t = "application/javascript";
  else if (n.endsWith(".json")) t = "application/json";
  else if (n.endsWith(".zip")) t = "application/zip";
  if (t !== blob.type) return new Blob([blob], { type: t });
  return blob;
}

function carpetaPadre(url) {
  if (!url) return "";
  const limpia = url.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const idx = limpia.lastIndexOf("/");
  return idx > 0 ? limpia.slice(0, idx) : "";
}

async function descargarTodosArchivos(lista, onEstado, opciones) {
  const opts = opciones || {};
  const jobId = opts.jobId || `dl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  if (window._descargasCanceladas) window._descargasCanceladas.delete(jobId);

  const nombreZip = opts.nombreZip || `material_${new Date().toISOString().slice(0, 10)}.zip`;
  if (!lista || !lista.length) {
    const msg = "Sin archivos para descargar.";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msg, 100, jobId);
    if (typeof onEstado === "function") onEstado(msg, 100, 0, 0);
    return;
  }
  try {
    const msgPrep = `Preparando ${lista.length} archivos...`;
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgPrep, 5, jobId);
    if (typeof onEstado === "function") onEstado(msgPrep, 5, 0, lista.length);

    const JSZip = await cargarJSZip();
    const zip = new JSZip();

    for (let i = 0; i < lista.length; i++) {
      const item = lista[i];
      const url = String(item.url || "");
      const nombre = item.nombre || url.split("/").pop() || "archivo";
      const actualNum = i + 1;
      const pct = Math.round((actualNum / lista.length) * 85);
      const pctDisplay = Math.round((actualNum / lista.length) * 100);
      const msgProgreso = `Descargando ${actualNum}/${lista.length} archivos`;

      if ((window._descargasCanceladas && window._descargasCanceladas.has(jobId)) || window.__cancelarDescarga) {
        const msgCan = "Descarga cancelada.";
        if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, pctDisplay || pct, jobId);
        if (typeof onEstado === "function") onEstado(msgCan, pctDisplay || pct, i, lista.length);
        return;
      }

      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgProgreso, pct, jobId);
      if (typeof onEstado === "function") onEstado(msgProgreso, pctDisplay, actualNum, lista.length);

      try {
        let blob;
        const esEnlaceExterno = /^https?:\/\//i.test(url) && !/raw\.githubusercontent\.com|api\.github\.com/i.test(url);
        if (esEnlaceExterno) {
          continue;
        } else if (/^https?:\/\//i.test(url)) {
          blob = await (await fetch(url)).blob();
        } else {
          blob = await (await window.fetchArchivoDesdeGitHub(url)).blob();
        }
        blob = conMimeCorrecto(blob, nombre);
        const sub = carpetaPadre(url);
        const ruta = [item.carpeta || "", sub, nombre].filter(Boolean).join("/");
        zip.file(ruta, blob);
      } catch (e) {
        console.error("No se pudo añadir al ZIP:", url, e);
      }
    }

    if ((window._descargasCanceladas && window._descargasCanceladas.has(jobId)) || window.__cancelarDescarga) {
      const msgCan = "Descarga cancelada.";
      if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgCan, 85, jobId);
      if (typeof onEstado === "function") onEstado(msgCan, 85, lista.length, lista.length);
      return;
    }

    const msgZip = "Generando paquete ZIP...";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgZip, 92, jobId);
    if (typeof onEstado === "function") onEstado(msgZip, 92, lista.length, lista.length);

    const blob = await zip.generateAsync({ type: "blob" });
    const objUrl = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = objUrl;
    enlace.download = nombreZip;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);

    const msgDone = "¡Descarga completada!";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgDone, 100, jobId);
    if (typeof onEstado === "function") onEstado(msgDone, 100, lista.length, lista.length);
  } catch (e) {
    console.error(e);
    const msgErr = "Error al generar ZIP";
    if (typeof window.mostrarNotificacionDescarga === "function") window.mostrarNotificacionDescarga(msgErr, 100, jobId);
    if (typeof onEstado === "function") onEstado(msgErr, 100, 0, 0);
  }
}

window.cargarJSZip = cargarJSZip;
window.conMimeCorrecto = conMimeCorrecto;
window.carpetaPadre = carpetaPadre;
window.descargarTodosArchivos = descargarTodosArchivos;
