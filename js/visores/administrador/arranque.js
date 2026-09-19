window.__APP_VISTA="visor";
/* Oculta la ruta del visor antes del primer pintado, conservando su contexto. */
(() =>  {
  let rawSearch = location.search || "";
  let f5Recovery = {};
  try { f5Recovery = JSON.parse(localStorage.getItem('visor_f5_recovery') || '{}') || {}; } catch (_) {}
  try {
    if (!rawSearch) rawSearch = sessionStorage.getItem("visor_boot_search") || "";
    sessionStorage.removeItem("visor_boot_search");
  } catch (_) {}
  const p = new URLSearchParams(rawSearch);
  if (!p.toString() && location.pathname === "/" && f5Recovery.activo === true && f5Recovery.archivo) {
    try {
      const previo = JSON.parse(localStorage.getItem('visor_contexto') || '{}') || {};
      const contextoF5 = { ...previo, ...f5Recovery, abierto: true, directo: true, abrirLista: false };
      localStorage.setItem('visor_contexto', JSON.stringify(contextoF5));
      localStorage.setItem('last_open', '1');
      localStorage.setItem('last_archivo', String(f5Recovery.archivo));
      if (f5Recovery.pos !== undefined && f5Recovery.pos !== null) {
        localStorage.setItem('last_pos', String(f5Recovery.pos));
        localStorage.setItem('visor_pos', String(f5Recovery.pos));
      }
    } catch (_) {}
  }
  if (!p.toString() && location.pathname === "/") return;
  try {
    const previo = JSON.parse(localStorage.getItem("visor_contexto") || "{}");
    const archivo = p.get("archivo") || "";
    const contexto =  {
      ...previo,
      ...(p.get("rama") ?  { rama: p.get("rama") }
      :  {
      }
      ),
      ...(p.get("asignatura") ?  { asignatura: p.get("asignatura") }
      :  {
      }
      ),
      ...(p.get("trimestre") ?  { trimestre: p.get("trimestre") }
      :  {
      }
      ),
      ...(archivo ?  { archivo, directo: true, abrirLista: false }
      :  {
      }
      ),
      ...(p.get("todas") ?  { todas: true, abrirLista: !archivo }
      :  {
      }
      ),
      ...(p.get("return") ?  { returnPath: p.get("return") }
      :  {
      }
      )
    }
    ;
    if (p.has("pos")) localStorage.setItem("visor_pos", p.get("pos"));
    // En una recarga del visor la URL visible puede ser / y no contener query.
    // Nunca convertir un contexto de documento abierto válido en una lista vacía.
    const archivoPersistido = String(contexto.archivo || localStorage.getItem("last_archivo") || "").trim();
    if (archivoPersistido && contexto.abierto !== false) {
      contexto.archivo = archivoPersistido;
      contexto.directo = true;
      contexto.abrirLista = false;
      contexto.abierto = true;
      if (contexto.pos === undefined || contexto.pos === null || String(contexto.pos) === "") {
        const lp = localStorage.getItem("last_pos") ?? localStorage.getItem("visor_pos");
        if (lp !== null && lp !== "") contexto.pos = lp;
      }
      localStorage.setItem("last_open", "1");
      localStorage.setItem("last_archivo", archivoPersistido);
    }
    localStorage.setItem("visor_contexto", JSON.stringify(contexto));
    // El Visor Admin usa la raíz '/' como ruta visible, igual que el resto de la plataforma.
    // La rama/documento/posición se conservan en localStorage y se reconstruyen al recargar.
    try {
      if (window.top === window && window.parent === window && !document.documentElement.classList.contains('visor-embebido')) {
        window.history.replaceState({ visor: true, visorRutaReal: window.location.pathname }, document.title, '/');
      }
    } catch (_) {
    }
  } catch (_) {
  }
}
)();
window.__APP_VISTA = "visor";
window.__configurarMuPDF = async function configurarMuPDF() {
  if (!window.MuPDFCore) return false;
  try {
    await window.MuPDFCore.cargarMuPDF();
    return true;
  } catch (_) {
    return false;
  }
}
;
window.__configurarMuPDF();
