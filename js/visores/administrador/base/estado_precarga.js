document.documentElement.classList.add("visor-preboot");
try {
  const q=new URLSearchParams(location.search),c=JSON.parse(localStorage.getItem("visor_contexto")||"{}");
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[ºª]/g,'').replace(/\btrimestres?\b/g,'').trim();
  const triFiltro=norm(q.get("trimestre")||c.trimestre);
  const asigFiltro=norm(q.get("asignatura")||c.asignatura);
  const lastTri=norm(localStorage.getItem("last_archivo_trimestre"));
  const lastAsig=norm(localStorage.getItem("last_archivo_asignatura"));
  const coincideTri=!triFiltro||(lastTri&&lastTri===triFiltro);
  const coincideAsig=!asigFiltro||(lastAsig&&(lastAsig===asigFiltro||lastAsig.includes(asigFiltro)||asigFiltro.includes(lastAsig)));
  const coincide=coincideTri&&coincideAsig;
  const archivoPersistido = String(c.archivo || localStorage.getItem("last_archivo") || "").trim();
  const abierto=c.abrirLista===true?false:(q.has("archivo") || !!(archivoPersistido && (c.abierto===true || c.directo===true || localStorage.getItem("last_open")==="1")) || (coincide&&(c.directo||c.abierto===true||localStorage.getItem("last_open")==="1")));
  if(abierto)document.documentElement.classList.add("visor-document-open","visor-preloading");
} catch(_) {
}
