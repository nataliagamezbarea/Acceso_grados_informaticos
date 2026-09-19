/* MODAL CREAR ENUNCIADO (< 70 lineas) */
function openCrearEnunciadoModal(initialStartText = "") {
  const m = document.getElementById("modalCrearEnunciado");
  if (!m) return;
  const cs = document.getElementById("crearStart");
  const cn = document.getElementById("crearNew");
  if (cs) {
    cs.value = initialStartText || "";
    cs.placeholder = "Texto detectado o escribe el texto a buscar...";
  }
  if (cn) {
    cn.value = "";
    cn.placeholder = "Escribe aquí el nuevo enunciado sustituto...";
    setTimeout(() => cn.focus(), 80);
  }
  m.classList.add("on");
}
function closeCrearEnunciadoModal() {
  const m = document.getElementById("modalCrearEnunciado");
  if (m) m.classList.remove("on");
  if (typeof limpiarRecuadrosDibujoSobrantes === "function") limpiarRecuadrosDibujoSobrantes();
}
async function guardarNuevoEnunciado() {
  const it = ITEMS[POS];
  const cs = document.getElementById("crearStart");
  const cn = document.getElementById("crearNew");
  const st = cs ? cs.value : "";
  const nw = cn ? cn.value : "";
  if (!nw.trim()) { return; }
  const _scrollAntes = (typeof capturarPosicionVisores === "function") ? capturarPosicionVisores() : null;
  if (typeof pedirRestauracionVisores === "function") pedirRestauracionVisores(_scrollAntes);
  showBlocker("Guardando nuevo enunciado y generando previsualización...");
  try { const selCtx = window._selContext ||  { }
    ;
    await fetch("/api/save_enunciado",  {
      method: "POST",
      headers:  { "Content-Type": "application/json" }
      ,
      body: JSON.stringify( {
        grado: (it?._rama || grad),
        archivo: it.archivo,
        start: st,
        end: "",
        new_text: nw,
        page: selCtx.page,
        pct_top: selCtx.pct_top,
        pct_left: selCtx.pct_left,
        pct_width: selCtx.pct_width,
        pct_height: selCtx.pct_height,
        custom: true
      }
      )
    }
  );
    if (it.type === "e") { await setInc(true); }
    closeCrearEnunciadoModal();
    if (typeof limpiarRecuadrosDibujoSobrantes === "function") limpiarRecuadrosDibujoSobrantes();
    await load();
    hideBlocker();
    refreshRightIframe();
    openPos(POS);
  } catch (e) {
    hideBlocker();
  }
}

window.openCrearEnunciadoModal = openCrearEnunciadoModal;
window.closeCrearEnunciadoModal = closeCrearEnunciadoModal;
window.guardarNuevoEnunciado = guardarNuevoEnunciado;
