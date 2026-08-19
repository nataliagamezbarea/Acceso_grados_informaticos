
let tokenEnMemoria = "";
let promesaToken = null;
const tokenDesdeSupabase = () => {
  if (tokenEnMemoria) return Promise.resolve(tokenEnMemoria);
  if (!promesaToken) {
    promesaToken = (async () => {
      try {
        const url = "https://lztatgnlplpduiatmlrv.supabase.co";
        const anon = "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
        const res = await fetch(`${url}/rest/v1/configuracion?clave=eq.gh_token&select=valor`, {
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
          },
        });
        if (!res.ok) return "";
        const datos = await res.json();
        const valor = Array.isArray(datos) && datos[0] ? String(datos[0].valor || "").trim() : "";
        if (valor) tokenEnMemoria = valor;
        return valor;
      } catch (e) {
        return "";
      }
    })();
  }
  return promesaToken;
};

let repoEnMemoria = "";
let promesaRepo = null;
const repoDesdeSupabase = () => {
  if (repoEnMemoria) return Promise.resolve(repoEnMemoria);
  if (!promesaRepo) {
    promesaRepo = (async () => {
      try {
        const url = "https://lztatgnlplpduiatmlrv.supabase.co";
        const anon = "sb_publishable_z_T7Y3yKqPdXLnvL3ltnQA_ZAPrXImZ";
        const res = await fetch(`${url}/rest/v1/configuracion?clave=eq.gh_repo&select=valor`, {
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
          },
        });
        if (!res.ok) return "";
        const datos = await res.json();
        const valor = Array.isArray(datos) && datos[0] ? String(datos[0].valor || "").trim() : "";
        if (valor) repoEnMemoria = valor;
        return valor;
      } catch (e) {
        return "";
      }
    })();
  }
  return promesaRepo;
};


let _jszipPromiseSW = null;
function cargarJSZipSW() {
  if (self.JSZip) return Promise.resolve(self.JSZip);
  if (_jszipPromiseSW) return _jszipPromiseSW;
  _jszipPromiseSW = new Promise((resolve, reject) => {
    try {
      importScripts("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
      resolve(self.JSZip);
    } catch (e) {
      _jszipPromiseSW = null;
      reject(e);
    }
  });
  return _jszipPromiseSW;
}

const descargasSW = new Map();

async function notificarClientes(payload) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    clients.forEach((c) => c.postMessage(payload));
  } catch (e) {}
}

async function iniciarDescargaEnSW(data) {
  const { jobId, lista, nombreZip } = data;
  if (!jobId || !lista || !lista.length) return;

  const job = {
    jobId,
    lista,
    nombreZip,
    actual: 0,
    total: lista.length,
    pct: 5,
    estado: `Preparando ${lista.length} archivos...`,
    cancelado: false,
    completado: false,
  };

  descargasSW.set(jobId, job);

  await notificarClientes({
    type: "DESCARGA_PROGRESO",
    jobId,
    estado: job.estado,
    pct: job.pct,
    actual: 0,
    total: job.total,
  });

  try {
    const JSZip = await cargarJSZipSW();
    const zip = new JSZip();
    const token = tokenEnMemoria || (await tokenDesdeSupabase());
    const repo = await repoDesdeSupabase();

    for (let i = 0; i < lista.length; i++) {
      if (job.cancelado) {
        job.estado = "Descarga cancelada.";
        await notificarClientes({
          type: "DESCARGA_CANCELADA",
          jobId,
          estado: job.estado,
          pct: Math.round((i / lista.length) * 85),
        });
        descargasSW.delete(jobId);
        return;
      }

      const item = lista[i];
      const url = String(item.url || "");
      const nombre = item.nombre || url.split("/").pop() || "archivo";
      job.actual = i + 1;
      const pctDisplay = Math.round((job.actual / job.total) * 100);
      job.pct = Math.round((job.actual / job.total) * 85);
      job.estado = `Descargando ${job.actual}/${job.total} archivos (${pctDisplay}%)`;

      await notificarClientes({
        type: "DESCARGA_PROGRESO",
        jobId,
        estado: job.estado,
        pct: job.pct,
        actual: job.actual,
        total: job.total,
      });

      try {
        let blob;
        if (/^https?:\/\//i.test(url)) {
          const res = await fetch(url);
          if (res.ok) blob = await res.blob();
        } else {
          const limpia = String(url).replace(/^\.?\//, "");
          const partes = limpia.split("/").map(encodeURIComponent).join("/");
          const apiUrl = `https://api.github.com/repos/${repo}/contents/${partes}`;
          const headers = { Accept: "application/vnd.github.raw", "User-Agent": "grados-informaticos" };
          if (token) headers.Authorization = `Bearer ${token}`;
          const res = await fetch(apiUrl, { headers });
          if (res.ok) blob = await res.blob();
        }

        if (blob) {
          const sub = String(url).replace(/^\.?\//, "");
          const idx = sub.lastIndexOf("/");
          const carpetaSub = idx > 0 ? sub.slice(0, idx) : "";
          const rutaZip = [item.carpeta || "", carpetaSub, nombre].filter(Boolean).join("/");
          zip.file(rutaZip, blob);
        }
      } catch (e) {
        console.error("Error obteniendo archivo en SW:", url, e);
      }
    }

    if (job.cancelado) {
      job.estado = "Descarga cancelada.";
      await notificarClientes({ type: "DESCARGA_CANCELADA", jobId, estado: job.estado, pct: job.pct });
      descargasSW.delete(jobId);
      return;
    }

    job.estado = "Generando paquete ZIP...";
    job.pct = 92;
    await notificarClientes({ type: "DESCARGA_PROGRESO", jobId, estado: job.estado, pct: 92 });

    const zipBlob = await zip.generateAsync({ type: "blob" });

    job.estado = "¡Descarga completada!";
    job.pct = 100;
    job.completado = true;

    const reader = new FileReader();
    reader.readAsDataURL(zipBlob);
    reader.onloadend = async () => {
      await notificarClientes({
        type: "DESCARGA_COMPLETADA",
        jobId,
        estado: "¡Descarga completada!",
        pct: 100,
        nombreZip,
        dataUrl: reader.result,
      });
      descargasSW.delete(jobId);
    };
  } catch (err) {
    console.error("Error procesando descarga en SW:", err);
    await notificarClientes({
      type: "DESCARGA_ERROR",
      jobId,
      estado: "Error al generar descarga",
      pct: 100,
    });
    descargasSW.delete(jobId);
  }
}

self.addEventListener("message", (event) => {
  if (!event.data) return;
  const data = event.data;

  if (data.type === "SET_TOKEN") {
    tokenEnMemoria = data.token || "";
  } else if (data.type === "INICIAR_DESCARGA") {
    iniciarDescargaEnSW(data);
  } else if (data.type === "CANCELAR_DESCARGA") {
    if (data.jobId === "ALL") {
      descargasSW.forEach((j) => (j.cancelado = true));
    } else if (descargasSW.has(data.jobId)) {
      descargasSW.get(data.jobId).cancelado = true;
    }
  } else if (data.type === "SOLICITAR_ESTADO_ACTIVO") {
    descargasSW.forEach((job) => {
      notificarClientes({
        type: "DESCARGA_PROGRESO",
        jobId: job.jobId,
        estado: job.estado,
        pct: job.pct,
        actual: job.actual,
        total: job.total,
      });
    });
  }
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/archivos/")) {
    event.respondWith(
      (async () => {
        try {
          const params = url.searchParams;
          const rama = params.get("rama") || "compartido";
          const ruta = params.get("ruta") || "";
          const token = params.get("token") || tokenEnMemoria || (await tokenDesdeSupabase());
          const repo = params.get("repo") || (await repoDesdeSupabase());
          const nombre = decodeURIComponent(url.pathname.split("/").pop() || "documento.pdf");

          const ext = (nombre.split(".").pop() || "").toLowerCase();
          const MIME_MAP = {
            pdf: "application/pdf",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
            mp4: "video/mp4",
            webm: "video/webm",
            mp3: "audio/mpeg",
            txt: "text/plain",
          };
          const mime = MIME_MAP[ext] || "application/octet-stream";

          const rutaLimpia = String(ruta).replace(/^\.?\//, "");
          const partes = rutaLimpia.split("/").map(encodeURIComponent).join("/");
          const apiUrl = `https://api.github.com/repos/${repo}/contents/${partes}?ref=${encodeURIComponent(rama)}`;

          const headers = {
            Accept: "application/vnd.github.raw",
            "User-Agent": "grados-informaticos",
          };
          if (token) headers.Authorization = `Bearer ${token}`;

          const res = await fetch(apiUrl, { headers });
          if (!res.ok) {
            return new Response(`Error al obtener archivo de GitHub (${res.status})`, {
              status: res.status,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }

          const blob = await res.blob();
          return new Response(blob, {
            status: 200,
            headers: {
              "Content-Type": mime,
              "Content-Disposition": `inline; filename="${encodeURIComponent(nombre)}"`,
            },
          });
        } catch (err) {
          return new Response(`Error en Service Worker: ${err.message}`, {
            status: 500,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })()
    );
  }
});
