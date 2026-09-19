/* Cálculo de desplazamientos: responsabilidad única. */
function calcularDesplazamientoAntesDe(y, operaciones) {
  return (operaciones||[])
  .filter(o=>(o.tipo==='colapsar_flujo'||o.tipo==='colapsar_flujo_foto_hasta') && Number(o.origenBottom)<=y+0.01)
  .reduce((s,o)=>s+Math.max(0,Number(o.origenBottom)-Number(o.origenTop)),0);
}
function añadirFlujosEliminacion(operaciones) {
  return (operaciones||[]).filter(o=>o.tipo==='colapsar_flujo'||o.tipo==='colapsar_flujo_foto_hasta').sort((a,b)=>a.origenTop-b.origenTop);
}
window.calcularDesplazamientoAntesDe=calcularDesplazamientoAntesDe;
window.añadirFlujosEliminacion=añadirFlujosEliminacion;
