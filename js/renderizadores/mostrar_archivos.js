// Módulo principal de Renderizado de Archivos
// Reutiliza y coordina los submódulos de /descargas y /modales

const normalizarTexto = (s) =>
  String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function limpiarNombreVisible(nombreArchivo, ctx) {
  let visible = String(nombreArchivo || "");

  if (window.sanearNombreInvitado) {
    visible = window.sanearNombreInvitado(visible, ctx);
  } else {
    const profeTexto = ctx?.profesor || "";
    const nombresProfe = [];
    if (profeTexto) nombresProfe.push(profeTexto);
    if (window.__profesoresConocidos) nombresProfe.push(...window.__profesoresConocidos);

    for (const n of nombresProfe) {
      const normN = normalizarTexto(n);
      if (!normN) continue;
      const conGuion = normN.replace(/\s+/g, "_");
      for (const pat of [normN, conGuion]) {
        const re = new RegExp(`(^|_|\\.)${pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=_|\\.|$)`, "gi");
        visible = visible.replace(re, "$1");
      }
    }

    const codigo = ctx?.codigoAsignatura || "";
    if (codigo) {
      const normCod = normalizarTexto(codigo);
      const re = new RegExp(`^${normCod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_`, "i");
      visible = visible.replace(re, "");
    }

    visible = visible.replace(/_+/g, "_").replace(/^_+|_+$/g, "").trim();
  }

  return { visible: visible || nombreArchivo, origen: nombreArchivo };
}

function renderizarArchivosHTML(archivos, ctx) {
  if (!archivos) return "";
  let lista = [];
  if (Array.isArray(archivos)) {
    lista = archivos.flatMap((a) =>
      String(a)
        .split(/[,;]/)
        .map((u) => u.trim())
        .filter(Boolean)
    );
  } else {
    lista = String(archivos)
      .split(/[,;]/)
      .map((u) => u.trim())
      .filter(Boolean);
  }

  const seccion = ctx?.seccion || "";
  const nombreFila = (ctx?.nombreFila || "").trim();
  const modoEdicion = Boolean(ctx?.modoEdicion);
  const esAdmin = Boolean(ctx?.esAdmin !== undefined ? ctx.esAdmin : (window.Permisos && window.Permisos.esAdmin));
  const vistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado);
  const esAdminEfectivo = esAdmin && !vistaInvitado;

  const items = lista
    .map((url) => {
      const nombreArchivo = url.split("/").pop();
      const ext = (nombreArchivo.split(".").pop() || "").toLowerCase();
      const urlSafe = url.replace(/'/g, "\\'");

      const nombreVisible = window.limpiarNombreVisible
        ? window.limpiarNombreVisible(nombreArchivo, { profesor: ctx?.profesor }).visible
        : nombreArchivo;
      const nomVisibleSafe = nombreVisible.replace(/'/g, "\\'");

      const nomDescarga = window.sanearNombreInvitado
        ? window.sanearNombreInvitado(nombreArchivo, { profesor: ctx?.profesor })
        : nombreArchivo;
      const nomDescargaSafe = nomDescarga.replace(/'/g, "\\'");

      let visibleParaInvitado = true;
      if (window.Permisos && seccion && nombreFila) {
        visibleParaInvitado = window.Permisos.esArchivoVisibleParaInvitado(seccion, nombreFila, nombreArchivo);
      }

      if (!esAdminEfectivo && !visibleParaInvitado) {
        if (!esAdmin || !modoEdicion) return "";
      }

      let controlAdmin = "";
      if (esAdmin && modoEdicion && seccion && nombreFila) {
        const filaVisible = window.Permisos ? window.Permisos.esVisibleParaInvitado(seccion, nombreFila) : false;
        if (filaVisible) {
          const visStr = visibleParaInvitado ? "1" : "0";
          const icono = visibleParaInvitado ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
          const titulo = visibleParaInvitado ? "Visible para invitados (clic para ocultar este archivo)" : "Oculto para invitados (clic para mostrar este archivo)";
          const visClase = visibleParaInvitado ? "visible-invitado" : "oculto-invitado";
          controlAdmin = ` <button type="button" class="btn-toggle-archivo ${visClase}" data-seccion="${seccion}" data-fila="${nombreFila}" data-archivo="${nombreArchivo}" data-visible="${visStr}" title="${titulo}">${icono}</button>`;
        }
      }

      const claseOculto = (!visibleParaInvitado && esAdmin && modoEdicion) ? " archivo-oculto-admin" : "";
      const iconoDescarga = '<i class="fa-solid fa-download"></i>';

      if (/^https?:\/\//i.test(url)) {
        return `<span class="item-archivo${claseOculto}"><a href="${url}" target="_blank" rel="noopener noreferrer" class="enlace-archivo">${nomVisibleSafe}</a><a href="#" class="btn-descarga" onclick="descargarArchivo('${urlSafe}', '${nomDescargaSafe}'); return false;" title="Descargar">${iconoDescarga}</a>${controlAdmin}</span>`;
      }

      if (ext === "ipynb" || ext === "html") {
        return `<span class="item-archivo${claseOculto}"><a href="#" class="enlace-archivo nombre-material" onclick="mostrarArchivo('${urlSafe}', '${nomDescargaSafe}'); return false;">${nomVisibleSafe}</a>${controlAdmin}</span>`;
      }

      return `<span class="item-archivo${claseOculto}"><a href="#" class="enlace-archivo" onclick="abrirArchivo('${urlSafe}', '${nomDescargaSafe}'); return false;">${nomVisibleSafe}</a><a href="#" class="btn-descarga" onclick="descargarArchivo('${urlSafe}', '${nomDescargaSafe}'); return false;" title="Descargar">${iconoDescarga}</a>${controlAdmin}</span>`;
    })
    .filter(Boolean);

  if (items.length === 0) {
    return !esAdminEfectivo ? '<span class="sin-archivos-visibles">Sin archivos visibles</span>' : '';
  }

  const MAX_INICIAL = 4;
  if (items.length > MAX_INICIAL) {
    const visibles = items.slice(0, MAX_INICIAL).join("");
    const ocultos = items.slice(MAX_INICIAL).join("");
    const masCount = items.length - MAX_INICIAL;
    const idUnico = "archivos-ocultos-" + Math.random().toString(36).substring(2, 9);

    return `
      <div class="contenedor-archivos-lista">
        ${visibles}
        <span id="${idUnico}" class="bloque-archivos-desplegados oculto">${ocultos}</span>
        <button type="button" class="btn-ver-mas-archivos" onclick="
          var el = document.getElementById('${idUnico}');
          if (!el) return;
          var estaOculto = el.classList.contains('oculto');
          if (estaOculto) {
            el.classList.remove('oculto');
            this.textContent = '👁️ Ver menos';
          } else {
            el.classList.add('oculto');
            this.textContent = '👁️ Ver más (${masCount} más)';
          }
        ">👁️ Ver más (${masCount} más)</button>
      </div>`;
  }

  return `<div class="contenedor-archivos-lista">${items.join("")}</div>`;
}

window.limpiarNombreVisible = limpiarNombreVisible;
window.renderizarArchivosHTML = renderizarArchivosHTML;

(function () {
  const restaurarToast = () => {
    if (typeof window.restaurarToastsActivos === "function") {
      window.restaurarToastsActivos();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restaurarToast);
  } else {
    restaurarToast();
  }
})();
