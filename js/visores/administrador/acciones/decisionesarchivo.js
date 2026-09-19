/* ACCIONES DE DECISIONES Y GUARDADO EN SERVIDOR (< 85 lineas) */
function guardarCheckEnServidor(campo, valor) {
  const it = (typeof ITEMS !== 'undefined' && typeof POS !== 'undefined') ? ITEMS[POS] : null;
  if (!it) return;
  try {
    const key = `flags_${it._rama || grad || ''}_${it.archivo || ''}`;
    const flags = JSON.parse(localStorage.getItem(key) || '{}');
    flags[campo] = valor;
    localStorage.setItem(key, JSON.stringify(flags));
  } catch (_) {}
  fetch('/api/update_flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grado: (it?._rama || grad),
      archivo: it.archivo,
      campo: campo,
      valor: valor
    })
  }).catch(e => void 0);
}
function updateDecisionButtons(it) {
  const btnApp = document.getElementById('btnDecideApplied');
  const btnOrig = document.getElementById('btnDecideOriginal');
  if (!btnApp || !btnOrig) return;
  btnApp.classList.toggle('active-applied', it.decision === 'applied');
  btnOrig.classList.toggle('active-original', it.decision === 'original');
}
async function setDecision(nuevaDecision) {
  const it = ITEMS[POS];
  if (!it) return;
  if (it.decision === nuevaDecision) it.decision = null;
  else it.decision = nuevaDecision;
  const origE = DATA[grad].entries.find(x => x.archivo === it.archivo);
  if (origE) origE.decision = it.decision;
  const origN = DATA[grad].no_cambian.find(x => x.archivo === it.archivo);
  if (origN) origN.decision = it.decision;
  updateDecisionButtons(it);
  fetch('/api/set_decision',  {
    method: 'POST',
    headers:  { 'Content-Type': 'application/json' }
    ,
    body: JSON.stringify( { grado: (it?._rama || grad), archivo: it.archivo, decision: it.decision }
    )
  }
  ).catch(e => void 0);
  if (typeof renderStats === 'function') renderStats();
}
async function applyCurrentSingleFile() {
  const it = ITEMS[POS];
  if (!it) return;
  showBlocker('Aplicando cambios del archivo actual...');
  try {
    const res = await fetch('/api/apply_single_real',  {
      method: 'POST',
      headers:  { 'Content-Type': 'application/json' }
      ,
      body: JSON.stringify( { grado: (it?._rama || grad), archivo: it.archivo }
      )
    }
  );
    const data = await res.json();
    hideBlocker();
    if (data.ok) {
      it.decision = 'applied';
      updateDecisionButtons(it);
      if (typeof showCustomAlert === 'function') {
        await showCustomAlert('Cambio Aplicado', `✓ El archivo ${it.archivo} se ha actualizado.`, '<i class="fa-solid fa-check"></i>', '#10b981');
      }
    }
  } catch (err) {
    hideBlocker();
  }
}
/* Selector de ramas: siempre conserva SELECCIONAR y permite TODAS las ramas */
