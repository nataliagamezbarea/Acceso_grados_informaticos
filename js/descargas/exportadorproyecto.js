window.ExportadorProyecto = (() =>  {
const ARCHIVOS_ESTATICOS = [ "classroom_icon.png", "img/captura_representativa.jpg", "img/portada.jpg", "js/carcasaaplicacion.js", "js/servicios/ramaapi.js", "js/proveedorprocesadorcsv.js", "js/componentes/ajustes.js", "js/componentes/emojis.js", "js/componentes/barranavegacion/modoedicion.js",  "js/descargas/exportadorproyecto.js", "js/descargas/notificador.js", "js/descargas/recolectordirecciones.js", "js/descargas/compresorzip.js", "js/modales/gestorarchivosemergente.js", "js/modales/previsualizador.js", "js/modales/popupreutilizable.js", "js/base/anonimizador.js", "js/base/autenticacion.js", "js/base/permisos.js", "js/permisos/cifrado.js", "js/permisos/github.js", "js/permisos/supabase.js", "js/permisos/visibilidad.js", "js/permisos/visibilidad/index.js", "js/permisos/visibilidad/configuracion/constantes.js", "js/permisos/visibilidad/configuracion/normalizacion.js", "js/permisos/visibilidad/configuracion/repositorios.js", "js/permisos/visibilidad/red/http/peticiones.js", "js/permisos/visibilidad/red/github/api-github.js", "js/permisos/visibilidad/red/github/historial.js", "js/permisos/visibilidad/archivos/csv/procesador-csv.js", "js/permisos/visibilidad/archivos/rutas/analizador-rutas.js", "js/permisos/visibilidad/operaciones/consulta/consulta-visibilidad.js", "js/permisos/visibilidad/operaciones/publicacion/constructor-publico.js", "js/permisos/visibilidad/operaciones/publicacion/gestor-movimiento.js", "js/renderizadores/apuntespracticasejerciciostareas.js", "js/renderizadores/archivos.js", "js/renderizadores/datos.js", "js/servicios/estado.js", "js/servicios/informacion.js", "js/servicios/rama.js", "js/servicios/trimestres.js", "js/vistas/clase.js", "js/vistas/indicerama.js", "js/vistas/iniciosesion.js", "js/vistas/trimestre.js", "js/vistas/volveratras.js", ];
  const HTML_A_INYECTAR = [ "index.html" ];
  const CSS_DSD = ["css/ajustes/boton.css", "css/ajustes/oscuro.css", "css/ajustes/paneloscurovarios.css", "css/ajustes/paneloscuro.css", "css/ajustes/panelvarios.css", "css/ajustes/panel.css", "css/apuntes/archivos.css", "css/apuntes/base.css", "css/apuntes/oscuro.css", "css/apuntes/aislamiento.css", "css/apuntes/permisos.css", "css/apuntes/responsivo.css", "css/apuntes/valores.css", "css/archivos/archivosvarios.css", "css/archivos/archivos.css", "css/asignatura/archivoenlaces.css", "css/asignatura/archivo.css", "css/asignatura/base.css", "css/asignatura/conmutador.css", "css/asignatura/interruptor.css", "css/asignatura/oscurovarios2.css", "css/asignatura/oscurovarios.css", "css/asignatura/oscuro.css", "css/asignatura/tabla.css", "css/asignatura/tarjetas.css", "css/botones/animaciones.css", "css/botones/claro.css", "css/botones/oscuro.css", "css/componentes/carcasasombra.css", "css/componentes/componentes.css", "css/componentes/indice.css", "css/global/autenticacion.css", "css/global/barranavegacionbase.css", "css/global/barranavegacionbotonesoscuro.css", "css/global/barranavegacionbotonesvarios.css", "css/global/barranavegacionbotones.css", "css/global/barranavegacionoscuro.css", "css/global/base.css", "css/global/iconos.css", "css/global/panelconfiguracionvarios.css", "css/global/panelconfiguracion.css", "css/global/tablavarios.css", "css/global/tabla.css", "css/inicio/base2.css", "css/inicio/base.css", "css/inicio/clarovarios.css", "css/inicio/claro.css", "css/inicio/flexion.css", "css/inicio/oscurovarios.css", "css/inicio/oscuro.css", "css/inicio/selector.css", "css/login.css", "css/barranavegacion/navbar.css", "css/barranavegacion/oscuro.css", "css/notificador/insignias.css", "css/notificador/emergente.css", "css/notificador/notificacion.css", "css/notificador/progreso.css", "css/ventanaemergente/ventanaemergente.css", "css/modales/popupreutilizable.css", "css/portada/portadaemoji.css", "css/trimestre/trimestre.css", "css/visor/acciones.css", "css/visor/base.css", "css/visores/administrador/acciones/botones.css", "css/visores/administrador/acciones/botonesactuacion.css", "css/visores/administrador/acciones/botonesprincipales.css", "css/visores/administrador/acciones/navegacioncambios.css", "css/visores/administrador/base/cabeceraresponsivo.css", "css/visores/administrador/base/cabecera.css", "css/visores/administrador/base/elementosdinamicos.css", "css/visores/administrador/base/desarrollo.css", "css/visores/administrador/base/disposicioncabecera.css", "css/visores/administrador/base/variablestema.css", "css/visores/administrador/base/variables.css", "css/visores/administrador/busqueda/barra.css", "css/visores/administrador/busqueda/archivos.css", "css/visores/administrador/estadisticas/carga.css", "css/visores/administrador/estadisticas/estadosacceso.css", "css/visores/administrador/estadisticas/listado.css", "css/visores/administrador/estadisticas/panel.css", "css/visores/administrador/iniciosesion/administrador.css", "css/visores/administrador/base/paneladministrador.css", "css/visores/administrador/modales/bloqueoemergente.css", "css/visores/administrador/modales/menusflotantes.css", "css/visores/administrador/modales/formularios.css", "css/visores/administrador/modales/modales.css", "css/visores/administrador/modales/panelescomparacion.css", "css/visores/administrador/modales/superposicioncomparacionvarios.css", "css/visores/administrador/modales/superposicioncomparacion.css", "css/visores/administrador/responsivo/base.css", "css/visores/administrador/responsivo/listado.css", "css/visores/administrador/responsivo/superposicioncabecera.css", "css/visores/administrador/responsivo/superposicionbotones.css", "css/visores/administrador/responsivo/superposicionacciones.css", "css/visores/administrador/responsivo/superposicioncolumnas.css", "css/visores/administrador/responsivo/superposicionvisordocumento.css", "css/visores/administrador/responsivo/adaptativo.css", "css/visores/administrador/responsivo/responsivo.css", "css/visores/administrador/tarjetas/responsivo.css", "css/visores/administrador/tarjetas/varios.css", "css/visores/administrador/tarjetas/tarjetas.css", "css/visores/administrador/tema/claro_visor.css", "css/visores/administrador/tema/modoclaroprincipal.css", "css/visores/administrador/tema/temaclarocompleto.css", "css/visores/administrador/tema/temaclaromenus.css", "css/visores/administrador/visor/puntoscalientesnombrecolegio.css", "css/visores/administrador/visor/selecciontexto.css", "css/visores/administrador/visor/textoseleccion.css", "css/visores/administrador/visor/pdf.css", "css/visores/administrador/visor/puntoscalientesenunciados.css", "css/visores/administrador/base/espera_estilos.css", "css/visores/administrador/base/ocultar_barra_embebida.css", "css/visores/administrador/base/desplegable_sin_parpadeo.css", "css/visores/administrador/modales/contraste/contraste.css", "css/visores/administrador/modales/contraste/fondo.css", "css/visores/administrador/modales/contraste/texto.css", "css/visores/administrador/modales/contraste/botones.css", "css/visores/administrador/modales/contraste/oscuro_fondo.css", "css/visores/administrador/modales/contraste/oscuro_texto.css", "css/visores/administrador/modales/contraste/oscuro_botones.css", "css/visores/administrador/tema/fondo_inicial.css", "css/visores/administrador/visor/estilos_precarga_documento.css"];
  const COMPONENTES_DSD = ["componentes/accesofp/comunes/barranavegacion/botones/barranavegacionbotonajustes.html", "componentes/accesofp/comunes/barranavegacion/botones/barranavegacionbotoncerrarsesion.html", "componentes/accesofp/comunes/barranavegacion/botones/barranavegacionbotoninicio.html", "componentes/accesofp/comunes/barranavegacion/botones/barranavegacionbotonmodooscuro.html", "componentes/accesofp/comunes/barranavegacion/botones/barranavegacionbotonvolver.html", "componentes/accesofp/comunes/barranavegacion/barranavegaciongeneral.html", "componentes/accesofp/apuntes/vistaapuntes.html", "componentes/accesofp/asignatura/vistaasignatura.html", "componentes/accesofp/clase/cabeceragrado.html", "componentes/accesofp/clase/listaasignaturas.html", "componentes/accesofp/inicio/selectorclase.html", "componentes/accesofp/iniciosesion/formulario.html", "componentes/accesofp/barranavegacion/botones/descargarrama.html", "componentes/accesofp/barranavegacion/botones/invitado.html", "componentes/accesofp/barranavegacion/botones/visorrama.html", "componentes/accesofp/trimestre/vistatrimestre.html", "componentes/accesofp/vistas/apuntes.html", "componentes/accesofp/vistas/asignatura.html", "componentes/accesofp/vistas/asignaturas.html", "componentes/accesofp/vistas/clase.html", "componentes/accesofp/vistas/inicio.html", "componentes/accesofp/vistas/iniciosesion.html", "componentes/visores/administrador/componentes/busqueda.html", "componentes/visores/administrador/componentes/cargando.html", "componentes/visores/administrador/componentes/estadisticas.html", "componentes/visores/administrador/componentes/listado.html", "componentes/visores/administrador/iniciosesion/paginainiciosesion.html", "componentes/visores/administrador/modales/bloqueo.html", "componentes/visores/administrador/modales/confirmacion.html", "componentes/visores/administrador/modales/crearenunciado.html", "componentes/visores/administrador/modales/editarenunciado.html", "componentes/visores/administrador/modales/limpiardatos.html", "componentes/visores/administrador/modales/emergentecaja.html", "componentes/visores/administrador/modales/resumen.html", "componentes/visores/administrador/modales/bloqueovisor.html", "componentes/visores/administrador/modales/emergenteconfirmacion.html", "componentes/visores/administrador/modales/emergentecrearenunciado.html", "componentes/visores/administrador/modales/emergenteeditarenunciado.html", "componentes/visores/administrador/modales/emergentelimpiardatos.html", "componentes/visores/administrador/modales/emergenteresumen.html", "componentes/visores/administrador/visor/columna.html", "componentes/visores/administrador/visor/documentolimpio.html", "componentes/visores/administrador/visor/documentooriginal.html", "componentes/visores/administrador/visor/menus/menuanadir.html", "componentes/visores/administrador/visor/menus/menucolegio.html", "componentes/visores/administrador/visor/menus/menuenunciado.html", "componentes/visores/administrador/visor/menus/menuimagen.html", "componentes/visores/administrador/visor/menus/menunombre.html", "componentes/visores/administrador/visor/capasuperpuesta/capasuperpuestaacciones.html", "componentes/visores/administrador/visor/capasuperpuesta/capasuperpuestabarrasuperior.html", "componentes/visores/administrador/visor/capasuperpuesta/capasuperpuesta.html", "componentes/visores/administrador/visor/capasuperpuesta.html", "componentes/visores/administrador/visor/apuntebarra.html", "componentes/visores/administrador/visor/columnavisor.html", "componentes/visores/administrador/visor/documentolimpiovisor.html", "componentes/visores/administrador/visor/documentooriginalvisor.html", "componentes/visores/administrador/visor/editor.html", "componentes/visores/administrador/visor/visorescomparacion.html", "componentes/visores/administrador/visor/visores.html"];
  const CSV_Y_JSON = ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv", "informacion.json"];
  const LEEME = `EXPORTACIÓN LOCAL — GRADOS_INFORMATICOS
========================================= Esta carpeta es una copia completa e independiente del proyecto: el código
de la web + todos los datos y archivos de los dos repositorios de GitHub
(privado y público), con todas las ramas. No necesita internet, GitHub ni
Supabase para funcionar.
CÓMO ABRIRLA (IMPORTANTE): No hagas doble clic en index.html directamente. Los navegadores bloquean
la lectura de archivos locales cuando se abren así (política de CORS de
file://) y la web no podrá cargar los CSV. Tienes que servirla con un
pequeño servidor local: 1. Si tienes Python instalado: - Windows: doble clic en "iniciar-servidor-local.bat"
- Mac/Linux: abre una terminal aquí y ejecuta ./iniciar-servidor-local.sh
2. Abre en el navegador: http://localhost:8000
Se abre en modo lectura total (como el admin), sin login: es tu copia
personal para verla y navegarla offline.
ESTRUCTURA: datos-export/privado/<rama>/...   -> datos del repo privado
datos-export/publico/<rama>/...   -> datos del repo público (invitados)
datos-export/mapa_ramas.json      -> qué rama viene de qué repo
datos-export/ramas_todas.json     -> listado de ramas para el selector
Las ramas de ambos repos NO se combinan entre sí: cada una vive en su
carpeta. Si el mismo nombre de rama existiera en los dos repos, en local
se usa la del privado.
`;
  const SCRIPT_SH = `#!/bin/sh
cd "$(dirname "$0")"
echo "Sirviendo el proyecto en http://localhost:8000 (Ctrl+C para parar)"
python3 -m http.server 8000 || python -m http.server 8000
`;
  const SCRIPT_BAT = `@echo off
cd /d "%~dp0"
echo Sirviendo el proyecto en http://localhost:8000 (Ctrl+C para parar)
py -m http.server 8000 || python -m http.server 8000
pause
`;
  const inyectarModoLocal = (html, esModulo) =>  {
    const prefijo = esModulo ? "../" : "";
    const tag = `\n<script>window.MODO_LOCAL = true;</script>\n<script src="${prefijo}js/base/modolocal.js"></script>\n</body>`;
    return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag) : html + tag;
  }
  ;
  const incluirArchivoEstatico = async (zip, ruta) =>  {
    try {
      const res = await fetch(ruta);
      if (!res.ok) return;
      zip.file(ruta, await res.blob());
    } catch (e) {
      void 0;
    }
  }
  ;
  const incluirCodigoFuente = async (zip) =>  {
    for (const ruta of ARCHIVOS_ESTATICOS) { await incluirArchivoEstatico(zip, ruta); }
    for (const ruta of COMPONENTES_DSD) { await incluirArchivoEstatico(zip, ruta); }
    for (const ruta of CSS_DSD) { await incluirArchivoEstatico(zip, ruta); }
    await incluirArchivoEstatico(zip, "js/base/modolocal.js");
    const scriptToken = document.querySelector('script[src*="SUPABASETOKEN_"]');
    if (scriptToken) {
      let src = scriptToken.getAttribute("src") || "";
      src = src.replace(/^\.?\//, "").replace(/^\.\.\//, "");
      if (src) await incluirArchivoEstatico(zip, src);
    }
    for (const ruta of HTML_A_INYECTAR) {
      try {
        const res = await fetch(ruta);
        if (!res.ok) continue;
        const texto = await res.text();
        zip.file(ruta, inyectarModoLocal(texto, false));
      } catch (e) {
        void 0;
      }
    }
  }
  ;
  const cabecerasGitHub = (token) =>  {
    const h =  { Accept: "application/vnd.github.raw", "User-Agent": "grados-informaticos" }
    ;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }
  ;
  const listarRamasRepoRemoto = async (repo, token) =>  {
    if (!repo) return [];
    try {
      const headers =  { Accept: "application/vnd.github+json" }
      ;
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`https://api.github.com/repos/${repo}/branches?per_page=100`,  { headers }
  );
      if (!res.ok) return [];
      const datos = await res.json();
      return (Array.isArray(datos) ? datos : []) .map((b) => b.name) .filter((n) => n && n.toLowerCase() !== "master");
    } catch (e) {
      return [];
    }
  }
  ;
  const leerTextoRepo = async (repo, token, rama, ruta) =>  {
    try {
      const partes = String(ruta).replace(/^\.?\//, "").split("/").map(encodeURIComponent).join("/");
      const res = await fetch( `https://api.github.com/repos/${repo}/contents/${partes}?ref=${encodeURIComponent(rama)}`,  { headers: cabecerasGitHub(token) }
  );
      if (!res.ok) return null;
      return await res.text();
    } catch (e) {
      return null;
    }
  }
  ;
  const leerBlobRepo = async (repo, token, rama, ruta) =>  {
    try {
      const partes = String(ruta).replace(/^\.?\//, "").split("/").map(encodeURIComponent).join("/");
      const res = await fetch( `https://api.github.com/repos/${repo}/contents/${partes}?ref=${encodeURIComponent(rama)}`,  { headers: cabecerasGitHub(token) }
  );
      if (!res.ok) return null;
      return await res.blob();
    } catch (e) {
      return null;
    }
  }
  ;
  const recogerUrlsRama = async (repo, token, rama) =>  {
    const vistas = new Set();
    for (const archivo of ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"]) {
      const texto = await leerTextoRepo(repo, token, rama, archivo);
      if (!texto) continue;
      try {
        const filas = Papa.parse(texto,  {
          header: true, skipEmptyLines: true, delimiter: ",", quotes: true
        }
        ).data;
        filas.forEach((f) =>  {
          String(f.ARCHIVO || "") .split(/[,;]/) .map((u) => u.trim()) .filter(Boolean) .forEach((u) => vistas.add(u));
        }
  );
      } catch (e) {
      }
    }
    return Array.from(vistas);
  }
  ;
  const exportarRepo = async (zip, origen, repo, token, mapaRamas, onEstado) =>  {
    if (!repo) return [];
    const ramas = await listarRamasRepoRemoto(repo, token);
    for (let i = 0; i < ramas.length; i++) {
      const rama = ramas[i];
      if (!(rama in mapaRamas)) mapaRamas[rama] = origen;
      const base = `datos-export/${origen}/${rama}`;
      onEstado && onEstado(`[${origen}] ${rama}: leyendo CSV/JSON...`, i, ramas.length);
      for (const archivo of CSV_Y_JSON) {
        const texto = await leerTextoRepo(repo, token, rama, archivo);
        if (texto !== null) zip.file(`${base}/${archivo}`, texto);
      }
      const urls = await recogerUrlsRama(repo, token, rama);
      for (let j = 0; j < urls.length; j++) {
        onEstado && onEstado(`[${origen}] ${rama}: archivo ${j + 1}/${urls.length}...`, i, ramas.length);
        const blob = await leerBlobRepo(repo, token, rama, urls[j]);
        if (blob) {
          const limpia = String(urls[j]).replace(/^\.?\//, "");
          zip.file(`${base}/archivos/${limpia}`, blob);
        }
      }
    }
    return ramas;
  }
  ;
  const exportarProyectoCompleto = async (onEstado) =>  {
    if (!(window.Permisos && window.Permisos.esAdmin)) { throw new Error("Solo el admin puede exportar el proyecto."); }
    const JSZip = window.JSZip || (window.cargarJSZip ? await window.cargarJSZip() : null);
    if (!JSZip) throw new Error("No se pudo cargar JSZip.");
    const zip = new JSZip();
    onEstado && onEstado("Empaquetando código fuente de la web...", 0, 1);
    await incluirCodigoFuente(zip);
    const config = window.GITHUB_CONFIG ||  {
    }
    ;
    const token = typeof config.obtenerTokenSeguro === "function" ? config.obtenerTokenSeguro() : (config.token || "");
    const repoPrivado = (config.repo || "").trim();
    const repoPublico = (config.repoPublico || "").trim();
    const mapaRamas =  {
    }
    ;
    onEstado && onEstado("Descargando datos del repositorio privado...", 0, 1);
    const ramasPrivado = await exportarRepo(zip, "privado", repoPrivado, token, mapaRamas, onEstado);
    let ramasPublico = [];
    if (repoPublico && repoPublico !== repoPrivado) {
      onEstado && onEstado("Descargando datos del repositorio público...", 0, 1);
      ramasPublico = await exportarRepo(zip, "publico", repoPublico, token, mapaRamas, onEstado);
    }
    const todasRamas = Array.from(new Set([...ramasPrivado, ...ramasPublico])).sort();
    zip.file("datos-export/mapa_ramas.json", JSON.stringify(mapaRamas, null, 2));
    zip.file("datos-export/ramas_todas.json", JSON.stringify(todasRamas, null, 2));
    zip.file("LEEME-LOCAL.txt", LEEME);
    zip.file("iniciar-servidor-local.sh", SCRIPT_SH);
    zip.file("iniciar-servidor-local.bat", SCRIPT_BAT);
    onEstado && onEstado("Generando el ZIP final...", 0, 1);
    const blob = await zip.generateAsync( { type: "blob" }
  );
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = `grados-informaticos-export-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
    onEstado && onEstado("¡Exportación completada!", 1, 1);
  }
  ;
  const montarBoton = () =>  {
    const cuerpo = document.querySelector("#panel-ajustes .cuerpo-ajustes");
    if (!cuerpo || cuerpo.querySelector("#btn-exportar-proyecto")) return;
    if (!(window.Permisos && window.Permisos.esAdmin)) return;
    const seccion = document.createElement("div");
    seccion.className = "seccion-ajustes-titulo";
    seccion.innerHTML = '<i class="fa-solid fa-box-archive seccion-ajustes-icono"></i>Exportar';
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btn-exportar-proyecto";
    btn.className = "btn-descarga-masiva";
    btn.innerHTML = '<i class="fa-solid fa-download"></i> Exportar proyecto completo (offline)';
    btn.title = "Descarga la web + todos los datos de ambos repos, en un ZIP para ver en local";
    btn.addEventListener("click", async () =>  {
      btn.disabled = true;
      const original = btn.innerHTML;
      try {
        await exportarProyectoCompleto((estado) =>  { btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${estado}`; }
  );
        btn.innerHTML = '<i class="fa-solid fa-check icono-exito"></i> ¡Listo! Descarga iniciada';
      } catch (e) {
        void 0;
        btn.innerHTML = '<i class="fa-solid fa-circle-xmark icono-error"></i> Error al exportar';
      } finally {
        setTimeout(() =>  {
          btn.disabled = false;
          btn.innerHTML = original;
        }
        , 3000);
      }
    }
  );
    cuerpo.appendChild(seccion);
    cuerpo.appendChild(btn);
  }
  ;
  const asegurarBoton = async () =>  {
    try {
      if (window.Permisos && typeof window.Permisos.asegurarSesion === "function") {
        await window.Permisos.asegurarSesion();
      }
    } catch (e) {
    }
    if (!(window.Permisos && window.Permisos.esAdmin)) return;
    montarBoton();
    document.addEventListener("click", (e) =>  {
      if (e.target.closest && e.target.closest("#boton-ajustes")) { setTimeout(montarBoton, 0); }
    }
  );
  }
  ;
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", asegurarBoton); }
  else { asegurarBoton(); }
  return  { exportarProyectoCompleto }
  ;
}
)();
