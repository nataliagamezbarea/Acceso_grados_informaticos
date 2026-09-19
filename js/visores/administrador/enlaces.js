(() => {
  const evs = ["click", "change", "input", "blur", "focus", "keyup", "keydown", "submit"];

  const run = (c, el, e) => {
    if (!c) return;
    const code = String(c || "").replace(/\bthis\b/g, "element");
    try {
      return new Function("element", "event", code).call(el, el, e);
    } catch (err) {
      console.warn("[enlaces.js] Error al ejecutar evento:", c, err);
    }
  };

  const cerrarModalActivo = (modalEl) => {
    if (!modalEl) return;
    const id = modalEl.id;
    if (id === 'customModal') {
      if (typeof window.closeCustomModal === 'function') window.closeCustomModal();
      else modalEl.classList.remove('on');
    } else if (id === 'modalCrearEnunciado') {
      if (typeof window.closeCrearEnunciadoModal === 'function') window.closeCrearEnunciadoModal();
      else modalEl.classList.remove('on');
    } else if (id === 'modalEditarEnunciado') {
      if (typeof window.closeEditarEnunciadoModal === 'function') window.closeEditarEnunciadoModal();
      else modalEl.classList.remove('on');
    } else if (id === 'modalLimpiarDatos') {
      if (typeof window.closeLimpiarDatosModal === 'function') window.closeLimpiarDatosModal();
      else { modalEl.classList.remove('on'); modalEl.style.display = 'none'; }
    } else if (id === 'summaryModal') {
      if (typeof window.closeSummaryModal === 'function') window.closeSummaryModal();
      else modalEl.classList.remove('on');
    } else if (id === 'modalAnadirTipo') {
      if (typeof window.cerrarSelectorAnadir === 'function') window.cerrarSelectorAnadir();
      else modalEl.style.display = 'none';
    } else if (id === 'floatingPdfMenu') {
      if (typeof window.closeEnunciadoPopup === 'function') window.closeEnunciadoPopup();
      else modalEl.style.display = 'none';
    } else if (id === 'floatingNameMenu') {
      if (typeof window.closeNombrePopup === 'function') window.closeNombrePopup();
      else modalEl.style.display = 'none';
    } else if (id === 'floatingColMenu') {
      if (typeof window.closeColegioPopup === 'function') window.closeColegioPopup();
      else modalEl.style.display = 'none';
    } else if (id === 'floatingImgMenu') {
      if (typeof window.closeImgPopup === 'function') window.closeImgPopup();
      else modalEl.style.display = 'none';
    } else if (id === 'editorBox') {
      if (typeof window.toggleEditor === 'function') window.toggleEditor(false);
      else modalEl.classList.remove('on');
    } else {
      modalEl.classList.remove('on');
      if (modalEl.style) modalEl.style.display = 'none';
    }
  };

  const bind = () => {
    evs.forEach(t => {
      document.addEventListener(t, e => {
        const path = (e.composedPath && e.composedPath()) || [];
        const target = path[0] || e.target;
        const a = `data-event-${t}`;
        const el = target?.closest?.(`[${a}]`) || e.target?.closest?.(`[${a}]`);
        if (el) run(el.getAttribute(a), el, e);
      }, true);
    });

    // Delegación unificada para cualquier botón de cierre y clic en fondo (backdrop)
    document.addEventListener("click", e => {
      const path = (e.composedPath && e.composedPath()) || [];
      const target = path[0] || e.target;
      if (!target) return;

      // 1. Clic en botón de cierre
      const btnCerrar = target.closest?.(
        '.modal-close-btn, .custom-modal-close-x, .btn-cerrar-modal, [data-action="close"], [data-close-modal], #customModalCloseBtn, #modalLimpiarDatosCloseBtn, #modalCrearEnunciadoCloseBtn, #modalEditarEnunciadoCloseBtn, #summaryModalCloseBtn'
      );
      if (btnCerrar) {
        const modalPadre = target.closest?.(
          '#customModal, #modalCrearEnunciado, #modalEditarEnunciado, #modalLimpiarDatos, #summaryModal, #modalAnadirTipo, #floatingPdfMenu, #floatingNameMenu, #floatingColMenu, #floatingImgMenu, #editorBox, .blocker'
        );
        if (modalPadre) {
          e.preventDefault();
          e.stopPropagation();
          cerrarModalActivo(modalPadre);
          return;
        }
      }

      // 2. Clic en el fondo oscuro exterior (backdrop) del modal
      if (target.classList?.contains('blocker') || target.id === 'modalLimpiarDatos') {
        // Solo cerrar si el clic fue directamente en el blocker y no en una caja interior
        const fueEnCajaInterior = target.querySelector?.('.blocker-box')?.contains?.(e.target);
        if (!fueEnCajaInterior) {
          cerrarModalActivo(target);
        }
      }
    }, true);

    // Escape global para cerrar modales
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        const modales = [
          document.getElementById('customModal'),
          document.getElementById('modalCrearEnunciado'),
          document.getElementById('modalEditarEnunciado'),
          document.getElementById('modalLimpiarDatos'),
          document.getElementById('summaryModal'),
          document.getElementById('modalAnadirTipo'),
          document.getElementById('floatingPdfMenu'),
          document.getElementById('floatingNameMenu'),
          document.getElementById('floatingColMenu'),
          document.getElementById('floatingImgMenu'),
          document.getElementById('editorBox')
        ];
        for (const m of modales) {
          if (m && (m.classList.contains('on') || m.style.display === 'flex' || m.style.display === 'block')) {
            e.preventDefault();
            e.stopPropagation();
            cerrarModalActivo(m);
            return;
          }
        }
      }
    }, true);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
