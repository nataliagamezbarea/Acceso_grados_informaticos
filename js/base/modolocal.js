(function () {
  if (!window.MODO_LOCAL) return;
  const enModulos = window.location.pathname.includes("/modulos/") || window.location.pathname.endsWith("/modulos");
  const PREFIJO = enModulos ? "../" : "";
  let mapaRamas =  {
  }
  ;
  let ramasTodas = [];
  let listo = null;
  const cargarManifiestos = async () =>  {
    if (listo) return listo;
    listo = (async () =>  {
      try {
        const resMapa = await fetch(`${PREFIJO}datos-export/mapa_ramas.json`);
        if (resMapa.ok) mapaRamas = await resMapa.json();
      } catch (e) {
      }
      try {
        const resRamas = await fetch(`${PREFIJO}datos-export/ramas_todas.json`);
        if (resRamas.ok) ramasTodas = await resRamas.json();
      } catch (e) {
      }
    }
    )();
    return listo;
  }
  ;
  const origenDeRama = (rama) => mapaRamas[rama] || "privado";
  const rutaLocalArchivo = (urlOriginal, ramaForzada) =>  {
    const rama = ramaForzada || (window.RamaActual ? window.RamaActual.obtener() : "") || "compartido";
    const limpia = String(urlOriginal).replace(/^\.?\//, "");
    const partes = limpia.split("/").map(encodeURIComponent).join("/");
    return `${PREFIJO}datos-export/${origenDeRama(rama)}/${encodeURIComponent(rama)}/archivos/${partes}`;
  }
  ;
  const aplicarOverrides = () =>  {
    if (window.Permisos) {
      const permisos = window.Permisos;
      try {
        Object.defineProperty(permisos, "esAdmin",  { get: () => true, configurable: true }
  );
        Object.defineProperty(permisos, "rol",  { get: () => "admin", configurable: true }
  );
        Object.defineProperty(permisos, "vistaInvitado",  { get: () => false, configurable: true }
  );
        Object.defineProperty(permisos, "sesionCargada",  { get: () => true, configurable: true }
  );
        Object.defineProperty(permisos, "invitadosActivos",  { get: () => true, configurable: true }
  );
      } catch (e) {
      }
      permisos.asegurarSesion = async () => cargarManifiestos();
      permisos.cargoSesion = permisos.asegurarSesion;
      permisos.cargarAjustesServidor = async () => ( {
        modo_oscuro: false, descargar_todas_clases: true, descargar_asignatura: true, descargar_curso: true, descargar_asignatura_todos: true,
      }
  );
      permisos.guardarConfig = async () =>  {
      }
      ;
      // export estático: no hay dónde guardar
      permisos.puedeVer = () => true;
      permisos.esVisibleParaInvitado = () => true;
      permisos.esArchivoVisibleParaInvitado = () => true;
      permisos.leerCsv = async (nombreCsv, ramaParam) =>  {
        await cargarManifiestos();
        const rama = (ramaParam || (window.RamaActual ? window.RamaActual.obtener() : "") || "").trim();
        if (!rama) return null;
        try {
          const res = await fetch(`${PREFIJO}datos-export/${origenDeRama(rama)}/${encodeURIComponent(rama)}/${encodeURIComponent(nombreCsv)}`);
          if (res.ok) return (await res.text()).replace(/^\uFEFF/, "");
        } catch (e) {
        }
        return null;
      }
      ;
    }
    if (window.RamaActual) {
      window.RamaActual.listarRamas = async () =>  {
        await cargarManifiestos();
        return ramasTodas.slice();
      }
      ;
    }
    window.fetchArchivoDesdeGitHub = async (ruta) =>  {
      await cargarManifiestos();
      const res = await fetch(rutaLocalArchivo(ruta));
      if (!res.ok) throw new Error("Archivo no incluido en la exportación (" + res.status + ")");
      return res;
    }
    ;
    window.urlApiContenido = (ruta) => rutaLocalArchivo(ruta);
    window.resolverArchivo = (url) => (/^https?:\/\//i.test(url) ? url : rutaLocalArchivo(url));
    window.abrirArchivo = async (url, nombre) =>  {
      if (/^https?:\/\//i.test(url)) {
        window.open(url, "_blank", "noopener");
        return;
      }
      await cargarManifiestos();
      window.open(rutaLocalArchivo(url), "_blank");
    }
    ;
  }
  ;
  aplicarOverrides();
  cargarManifiestos();
}
)();
