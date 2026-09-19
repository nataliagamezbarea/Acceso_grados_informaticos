// Descarga unificada del Visor-Admin: el iframe usa el notificador compartido
    // y su CSS global. Si por una navegación el contenedor aún no existe, se crea
    // inmediatamente antes de que se muestre la primera notificación.
    (function(){
      try {
        if (typeof window.obtenerContenedorToasts === 'function') window.obtenerContenedorToasts();
      } catch (_) {}
    })();
