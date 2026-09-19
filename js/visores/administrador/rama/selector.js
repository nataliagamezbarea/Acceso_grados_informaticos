// GESTIÓN DE RAMA SELECCIONADA (< 60 lineas)
window.RamaActual = (() =>  {
  const CLAVE_LOCAL = "rama_actual";
  const obtener = () =>  {
    const url = new URLSearchParams(window.location.search).get("rama");
    if (url && url.trim()) {
      // La URL es la fuente de verdad: NO se persiste en localStorage.
      return url.trim();
    }
    return localStorage.getItem(CLAVE_LOCAL) || "";
  }
  ;
  const guardar = (rama) =>  {
    if (rama) localStorage.setItem(CLAVE_LOCAL, rama);
    else localStorage.removeItem(CLAVE_LOCAL);
  }
  ;
  const poblarSelector = async (select) =>  {
    if (!select) return;
    const urlRama = new URLSearchParams(window.location.search).get("rama");
    const savedRama = localStorage.getItem("last_grado") || localStorage.getItem("rama_actual") || "";
    const candidata = (urlRama && urlRama.trim()) || savedRama || "";
    // La rama conocida (URL o localStorage) se coloca YA, sin esperar a GitHub:
    // al recargar nunca se ve "-- Seleccionar rama --" mientras responde el server.
    select.innerHTML = '<option value="">-- Seleccionar rama --</option>';
    if (candidata) {
      const op = document.createElement("option");
      op.value = candidata;
      op.textContent = candidata;
      select.appendChild(op);
      select.value = candidata;
    } else {
      select.value = "";
    }
    const ramas = window.RamaAPI ? await window.RamaAPI.listarRamas() : [];
    ramas.forEach((rama) =>  {
      if (rama !== candidata) {
        const opcion = document.createElement("option");
        opcion.value = rama;
        opcion.textContent = rama;
        select.appendChild(opcion);
      }
    }
  );
    if (candidata && ramas.includes(candidata)) { select.value = candidata; }
    else {
      select.value = (urlRama && ramas.includes(urlRama))
      ? urlRama : (savedRama && ramas.includes(savedRama) ? savedRama : "");
    }
  }
  ;
  return  {
    obtener,
    guardar,
    listarRamas: () => (window.RamaAPI ? window.RamaAPI.listarRamas() : Promise.resolve([])),
    poblarSelector
  }
  ;
}
)();
