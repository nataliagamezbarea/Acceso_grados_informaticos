/* SECCIONES PRINCIPALES DE VISTA (< 60 lineas) */
function render() {
  renderStats();
  const c = document.getElementById('content');
  if (!c) return;
  c.innerHTML = '';
  let itemsVista = typeof obtenerItemsBusqueda === 'function' ? obtenerItemsBusqueda() : (Array.isArray(ITEMS) ? ITEMS : []);
  const filtroEstado = window.FILTRO_ESTADO_PROCESO || 'todos';
  if (filtroEstado === 'procesados') { itemsVista = itemsVista.filter(it => it.decision === 'applied'); }
  else if (filtroEstado === 'no_procesados') { itemsVista = itemsVista.filter(it => it.decision !== 'applied'); }
  else if (filtroEstado === 'nuevos') {
    itemsVista = itemsVista.filter(it => typeof esItemNuevoApp === 'function' && esItemNuevoApp(it));
  }
  const entriesVista = itemsVista.filter(it => it.type === 'e');
  const noCambianVista = itemsVista.filter(it => it.type === 'n');
  if (itemsVista.length === 0) {
    const sEmpty = document.createElement('div');
    sEmpty.className = 'sec sec-vacia visor-seccion-vacia';
    const descFiltro = filtroEstado === 'procesados' ? 'procesados' : (filtroEstado === 'no_procesados' ? 'no procesados' : (filtroEstado === 'nuevos' ? 'nuevos subidos con la aplicación' : ''));
    sEmpty.innerHTML = `
      <div class="visor-seccion-vacia-icono"><i class="fa-solid fa-folder-open"></i></div>
      <h3 class="visor-seccion-vacia-titulo">No hay documentos ${descFiltro}</h3>
      <p class="visor-seccion-vacia-descripcion">No se encontraron archivos bajo este filtro en la vista actual.</p>
      <button type="button" class="btn-filtro-proceso activo" onclick="setFiltroProceso('todos')"><i class="fa-solid fa-layer-group"></i> Ver todos los documentos</button>
    `;
    c.appendChild(sEmpty);
    return;
  }
  const todosLatex = [
  ...entriesVista,
  ...noCambianVista
  ].filter(it => it.latex_compilado);
  if (todosLatex.length > 0) {
    const s0 = document.createElement('div');
    s0.className = 'sec';
    s0.innerHTML = '<h3><i class="fa-solid fa-file-circle-check icono-seccion-latex"></i> Apuntes LaTeX Ya Compilados (' + todosLatex.length + ')</h3>';
    const grid0 = document.createElement('div');
    grid0.className = 'grid';
    renderProgressiveGrid(grid0, todosLatex);
    s0.appendChild(grid0);
    c.appendChild(s0);
  }
  if (entriesVista.length > 0) {
    const s1 = document.createElement('div');
    s1.className = 'sec';
    s1.innerHTML = '<h3><i class="fa-solid fa-pen-fancy icono-seccion-enunciado"></i> Archivos con Reescritura de Enunciado (' + entriesVista.length + ')</h3>';
    const gEntriesBySub = groupBySubfolder(entriesVista);
    Object.keys(gEntriesBySub).sort().forEach(sub =>  {
      const groupWrap = document.createElement('div');
      groupWrap.className = 'subfolder-group';
      groupWrap.innerHTML = `<div class="subfolder-header"><i class="fa-solid fa-folder-open"></i> Subapartado: <b>${sub}</b> (${gEntriesBySub[sub].length} archivos)</div>`;
      const grid = document.createElement('div');
      grid.className = 'grid';
      renderProgressiveGrid(grid, gEntriesBySub[sub]);
      groupWrap.appendChild(grid);
      s1.appendChild(groupWrap);
    }
  );
    c.appendChild(s1);
  }
  if (noCambianVista.length > 0) {
    const s2 = document.createElement('div');
    s2.className = 'sec';
    s2.innerHTML = '<h3><i class="fa-solid fa-user-slash icono-seccion-limpieza"></i> Archivos de Apuntes y Limpieza de Nombres (' + noCambianVista.length + ')</h3>';
    const gNoCambBySub = groupBySubfolder(noCambianVista);
    Object.keys(gNoCambBySub).sort().forEach(sub =>  {
      const groupWrap = document.createElement('div');
      groupWrap.className = 'subfolder-group';
      groupWrap.innerHTML = `<div class="subfolder-header"><i class="fa-solid fa-folder-open"></i> Subapartado: <b>${sub}</b> (${gNoCambBySub[sub].length} archivos)</div>`;
      const grid = document.createElement('div');
      grid.className = 'grid';
      renderProgressiveGrid(grid, gNoCambBySub[sub]);
      groupWrap.appendChild(grid);
      s2.appendChild(groupWrap);
    }
  );
    c.appendChild(s2);
  }
}
