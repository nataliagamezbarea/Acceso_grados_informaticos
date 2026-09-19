/* RENDERIZADO DE ESTADÍSTICAS Y CONTADORES */
function mostrarStatsCargando(texto = 'CARGANDO...') {
  const st = document.getElementById('stats');
  if (!st) return;
  st.classList.add('stats-loading');
  st.innerHTML = `<div class="stats-loading-inner"><i class="fa-solid fa-circle-notch fa-spin"></i><span>${texto}</span></div>`;
}
function renderTabs() {
  const tabs = document.getElementById('tabs');
  if (tabs) tabs.remove();
}
window.FILTRO_ESTADO_PROCESO = window.FILTRO_ESTADO_PROCESO || 'todos';
function esItemNuevoApp(it) {
  if (!it) return false;
  if (it.custom || it.subido_app || it.nuevo_app) return true;
  if (Array.isArray(it.enunciados) && it.enunciados.some(e => e && e.custom)) return true;
  if (Array.isArray(it.hotspots) && it.hotspots.some(h => h && h.custom)) return true;
  return false;
}
function setFiltroProceso(modo) {
  window.FILTRO_ESTADO_PROCESO = modo;
  if (typeof render === 'function') render();
}
function renderStats() {
  const st = document.getElementById('stats');
  if (!st) return;
  // Mientras ITEMS todavía no existe, nunca dejamos el bloque vacío.
  if (!Array.isArray(ITEMS)) {
    mostrarStatsCargando();
    return;
  }
  st.classList.remove('stats-loading');
  const items = ITEMS;
  const tot = items.length;
  const enc = items.filter(e => e.type === 'e' && e.include).length;
  const ren = items.filter(e => e.cambia_nombre && e.inc_renombre !== false).length;
  const lim = items.filter(e => e.inc_interior).length;
  const apu = items.filter(e => e.inc_apunte).length;
  const nApplied = items.filter(e => e.decision === 'applied').length;
  const nNoProcesados = items.filter(e => e.decision !== 'applied').length;
  const nNuevos = items.filter(e => esItemNuevoApp(e)).length;
  const filtroActual = window.FILTRO_ESTADO_PROCESO || 'todos';
  const filtro = window.VISOR_FILTRO ||  {
  }
  ;
  const ramaTxt = (typeof grad !== 'undefined' && grad && grad !== '__TODAS__') ? grad : 'TODAS LAS RAMAS';
  const triTxt = filtro.trimestre ? filtro.trimestre : 'Todos los trimestres';
  const asigTxt = filtro.asignatura ? filtro.asignatura : '';
  const avisoNuevosHtml = nNuevos > 0
  ? `<div class="seccion-subidos-app positivo" title="Hay elementos o documentos nuevos creados o subidos con la aplicación"><i class="fa-solid fa-circle-check"></i> <span>Subidos con la aplicación: <b>${nNuevos} nuevo(s)</b></span></div>`
  : `<div class="seccion-subidos-app neutro" title="No se han detectado nuevos subidos con la aplicación en este filtro"><i class="fa-solid fa-circle-info"></i> <span>Subidos con la aplicación: <b>Sin nuevos (0)</b></span></div>`;
  st.innerHTML = `
    <div class="stats-panel-contenedor">
      <div class="stats-fila-superior">
        <div class="stats-contexto-info">
          <span class="chip-contexto rama"><i class="fa-solid fa-code-branch"></i> ${ramaTxt}</span>
          ${filtro.trimestre ? `<span class="chip-contexto trimestre"><i class="fa-solid fa-calendar-week"></i> ${triTxt}</span>` : ''}
          ${asigTxt ? `<span class="chip-contexto asignatura"><i class="fa-solid fa-book"></i> ${asigTxt}</span>` : ''}
        </div>
        ${avisoNuevosHtml}
      </div>
      <div class="stats-fila-filtros">
        <div class="stats-filtros-estado">
          <button type="button" class="btn-filtro-proceso${filtroActual === 'todos' ? ' activo' : ''}" onclick="setFiltroProceso('todos')" title="Ver todos los documentos de esta sección">
            <i class="fa-solid fa-layer-group"></i> <span>TODOS</span> <b class="badge-num">${tot}</b>
          </button>
          <button type="button" class="btn-filtro-proceso btn-proceso-procesados${filtroActual === 'procesados' ? ' activo' : ''}" onclick="setFiltroProceso('procesados')" title="Ver solo documentos procesados">
            <i class="fa-solid fa-check-double icono-filtro-procesados"></i> <span>PROCESADOS</span> <b class="badge-num">${nApplied}</b>
          </button>
          <button type="button" class="btn-filtro-proceso btn-proceso-noprocesados${filtroActual === 'no_procesados' ? ' activo' : ''}" onclick="setFiltroProceso('no_procesados')" title="Ver documentos pendientes o no procesados">
            <i class="fa-solid fa-clock icono-filtro-no-procesados"></i> <span>NO PROCESADOS</span> <b class="badge-num">${nNoProcesados}</b>
          </button>
          <button type="button" class="btn-filtro-proceso btn-proceso-nuevos${filtroActual === 'nuevos' ? ' activo' : ''}" onclick="setFiltroProceso('nuevos')" title="Ver solo los documentos o enunciados subidos con la aplicación">
            <i class="fa-solid fa-file-pen icono-filtro-nuevos"></i> <span>NUEVOS (APP)</span> <b class="badge-num">${nNuevos}</b>
          </button>
        </div>
        <div class="stats-contadores-rapidos">
          <div class="stat"><b class="estadistica-total">${tot}</b>archivos</div>
          <div class="stat"><b class="estadistica-enunciados">${enc}</b>enunciados</div>
          <div class="stat"><b class="estadistica-renombres">${ren}</b>renombres</div>
          <div class="stat"><b class="estadistica-limpiezas">${lim}</b>limpiezas</div>
          <div class="stat"><b class="estadistica-apuntes">${apu}</b>apuntes</div>
        </div>
      </div>
      <div class="legend">
        <span><span class="dot punto-enunciado"></span> Rojo: Enunciado</span>
        <span><span class="dot punto-creado-app"></span> Naranja: Creado App</span>
        <span><span class="dot punto-nombres"></span> Azul: Nombres</span>
        <span><span class="dot punto-colegios"></span> Ámbar: Colegios</span>
      </div>
    </div>
  `;
}
