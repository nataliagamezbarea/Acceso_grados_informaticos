window.Trimestres = (() => {
  const normalizar = (v) => {
    if (!v) return "";
    return String(v)
      .replace(/[ºª]/g, "")
      .replace(/\btrimestres?\b/gi, "")
      .trim()
      .toLowerCase();
  };

  const emojiPara = (texto) => {
    const m = (texto || "").match(/\d+/);
    if (m) {
      return m[0]
        .split("")
        .map((d) => `${d}\uFE0F\u20E3`)
        .join("");
    }
    return "📚";
  };

  const obtenerDisponibles = async (rama) => {
    const vistos = new Map(); // normalizado -> texto original (tal cual en el CSV)

    for (const archivo of ["APUNTES.csv", "EJERCICIOS_PRACTICAS_PROYECTOS.csv"]) {
      try {
        const texto = await Permisos.leerCsv(archivo, rama);
        if (!texto) continue;
        const filas = Papa.parse(texto, {
          header: true,
          skipEmptyLines: true,
          delimiter: ",",
          quotes: true,
        }).data;
        filas.forEach((f) => {
          const val = (f.TRIMESTRE || "").trim();
          if (!val) return;
          if (!/^\d/.test(val)) return;
          const norm = normalizar(val);
          if (!vistos.has(norm)) vistos.set(norm, val);
        });
      } catch (e) { /* sin ese CSV: se sigue con el que sí haya */ }
    }

    const resultado = Array.from(vistos.values()).sort((a, b) => {
      const na = parseInt((a.match(/\d+/) || [])[0], 10);
      const nb = parseInt((b.match(/\d+/) || [])[0], 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      if (!isNaN(na)) return -1;
      if (!isNaN(nb)) return 1;
      return a.localeCompare(b);
    });

    if (!resultado.length) {
      return ["1º Trimestre", "2º Trimestre", "3º Trimestre"];
    }

    return resultado;
  };

  return { normalizar, emojiPara, obtenerDisponibles };
})();
