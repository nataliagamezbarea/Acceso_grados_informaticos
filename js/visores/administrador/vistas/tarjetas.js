/* RENDERIZADO DE TARJETAS Y ETIQUETAS (< 60 lineas) */
var LOADING_THUMB = 'data:image/svg+xml;utf8,' + encodeURIComponent(
"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='45' r='22' fill='none' stroke='#4b5563' stroke-width='5' opacity='0.3'/><circle cx='50' cy='45' r='22' fill='none' stroke='#818cf8' stroke-width='5' stroke-linecap='round' stroke-dasharray='34 104'><animateTransform attributeName='transform' type='rotate' from='0 50 45' to='360 50 45' dur='0.9s' repeatCount='indefinite'/></circle><text x='50' y='86' font-size='11' text-anchor='middle' fill='#9ca3af' font-family='sans-serif'>Cargando…</text></svg>"
  );
var FALLBACK_THUMB = 'data:image/svg+xml;utf8,' + encodeURIComponent(
"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#1f2937'/><text x='50' y='55' font-size='16' text-anchor='middle' fill='#6b7280' font-family='sans-serif'>Sin vista</text></svg>"
  );
function vbadge(v, decision, it) {
let badges = '';
  if (decision === 'applied') { badges += '<span class="badge v badge-procesado"><i class="fa-solid fa-check-double"></i> ✓ Procesado</span>'; }
  else if (decision === 'original') { badges += '<span class="badge v badge-original"><i class="fa-solid fa-rotate-left"></i> Original</span>'; }
  else { badges += '<span class="badge v badge-no-procesado"><i class="fa-solid fa-clock"></i> No procesado</span>'; }
  const esNuevo = it && (it.custom || it.subido_app || it.nuevo_app || (Array.isArray(it.enunciados) && it.enunciados.some(e => e && e.custom)) || (Array.isArray(it.hotspots) && it.hotspots.some(h => h && h.custom)));
  if (esNuevo) { badges += '<span class="badge badge-nuevo-app"><i class="fa-solid fa-file-pen"></i> Nuevo (App)</span>'; }
  return badges;
}
function groupBySubfolder(items) { const groups =  { }
  ;
  items.forEach(it =>  {
    let sub = 'archivos';
    if (it.archivo.includes('/')) { sub = it.archivo.split('/')[0]; }
    if (!groups[sub]) groups[sub] = [];
    groups[sub].push(it);
  }
  );
  return groups;
}
function cardHTML(it) {
  const tag = (it.type === 'e') ? '<span class="tag enc">Enunciado + Nombres</span>' : '<span class="tag nom">Solo Nombres</span>';
  const ren = (it.cambia_nombre && it.nombre_limpio) ? `<div class="tarjeta-renombre-limpio">➔ ${it.nombre_limpio}</div>` : '';
  const apuTag = it.inc_apunte ? '<span class="badge apu badge-apunte-tarjeta">Apunte</span>' : '';
  const orig = (it.type === 'e') ? `<div class="orig-txt">Original: ${it.start || it.old || '-'}</div>` : '<div class="orig-txt">Limpieza de nombres de profesores y escolares.</div>';
  const nuev = (it.type === 'e') ? `<div class="new-txt">Nuevo: ${it.new || '-'}</div>` : '';
  // Las miniaturas cargan desde GitHub (backend). Como solo acceden admins con
  // sesión, se piden por fetch() para que lleven el JWT y el backend pueda leer
  // configuracion_privada y servir el PDF. El <img> se rellena en renderProgressiveGrid.
  const thumbId = 'thumb-' + (it.idx !== undefined ? it.idx : (it.archivo || '').replace(/[^\w-]/g, '_'));
  return `
    <div class="card-content-layout">
      <div class="card-thumb-box">
        <img id="${thumbId}" src="${LOADING_THUMB}" class="card-thumb-img is-loading" alt="Vista Previa PDF" loading="lazy" />
      </div>
      <div class="card-info-box">
        <div class="titulo tarjeta-titulo">${it.archivo}</div>
        <div class="tarjeta-etiquetas">${tag}${apuTag}${vbadge(it.visto, it.decision, it)}</div>
        ${ren}
        ${orig}
        ${nuev}
      </div>
    </div>
  `;
}
