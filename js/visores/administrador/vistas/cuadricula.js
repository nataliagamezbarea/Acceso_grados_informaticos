/* SCROLL INFINITO Y GRID PROGRESIVO (< 60 lineas) */
const _thumbBlobCache = new Map();
let _thumbActivas = 0;
const _thumbCola = [];
function _procesarColaThumbs() {
  while (_thumbActivas < 3 && _thumbCola.length > 0) {
    const fn = _thumbCola.shift();
    _thumbActivas++;
    fn().finally(() =>  {
      _thumbActivas--;
      _procesarColaThumbs();
    }
  );
  }
}
function cargarMiniatura(el, it) {
  const ramaItem = it._rama || (typeof grad !== "undefined" ? grad : "");
  const url = it.archivo ? `/api/thumb/${encodeURIComponent(ramaItem)}?archivo=${encodeURIComponent(it.archivo)}&t=${Date.now()}` : "";
  if (!url) return;
  const img = el.querySelector("img");
  if (!img) return;
  if (_thumbBlobCache.has(url)) {
    img.src = _thumbBlobCache.get(url);
    img.classList.add("loaded");
    img.classList.remove("is-loading");
    return;
  }
  const ejecutarCarga = () =>  {
    return fetch(url)
    .then(r => (r.ok ? r.blob() : Promise.reject(new Error("HTTP " + r.status))))
    .then(blob =>  {
      const objUrl = URL.createObjectURL(blob);
      _thumbBlobCache.set(url, objUrl);
      img.classList.add("loaded");
      img.classList.remove("is-loading");
      img.src = objUrl;
    }
    )
    .catch(() =>  {
      img.classList.remove("is-loading");
      img.src = (typeof FALLBACK_THUMB !== "undefined" ? FALLBACK_THUMB : "");
    }
  );
  }
  ;
  _thumbCola.push(ejecutarCarga);
  _procesarColaThumbs();
}
function renderProgressiveGrid(gridEl, items, batchSize = 18) {
  let currentIndex = 0;
  function appendNextBatch() {
    const batch = items.slice(currentIndex, currentIndex + batchSize);
    batch.forEach(it =>  {
      const el = document.createElement("div");
      el.className = "card" + (it.visto ? " visited" : "");
      el.innerHTML = cardHTML(it);
      cargarMiniatura(el, it);
      el.onclick = () =>  {
        POS = ITEMS.findIndex(x => x.archivo === it.archivo && (x._rama || "") === (it._rama || ""));
        localStorage.setItem("last_grado", grad);
        localStorage.setItem("last_pos", POS);
        localStorage.setItem("last_open", "1");
        localStorage.setItem("last_archivo", it.archivo || "");
        localStorage.setItem("last_archivo_rama", it._rama || grad || "");
        try {
          const previo = JSON.parse(localStorage.getItem('visor_contexto') || '{}');
          localStorage.setItem('visor_contexto', JSON.stringify( {
            ...previo, rama: it._rama || grad || previo.rama || '', archivo: it.archivo || '', directo: true, abrirLista: false, pos: POS
          }
          ));
        } catch (_) {
        }
        openOv();
      }
      ;
      gridEl.appendChild(el);
    }
  );
    currentIndex += batch.length;
  }
  appendNextBatch();
  if (currentIndex < items.length) {
    const sentinel = document.createElement("div");
    sentinel.className = "infinite-sentinel";
    sentinel.style.width = "100%";
    sentinel.style.height = "20px";
    sentinel.style.gridColumn = "1 / -1";
    gridEl.appendChild(sentinel);
    const observer = new IntersectionObserver((entries) =>  {
      if (entries[0].isIntersecting) {
        sentinel.remove();
        appendNextBatch();
        if (currentIndex < items.length) { gridEl.appendChild(sentinel); }
        else { observer.disconnect(); }
      }
    }
    ,  { rootMargin: "300px" }
  );
    observer.observe(sentinel);
  }
}
