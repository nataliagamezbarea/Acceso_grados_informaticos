/*
 * MÓDULO: Archivos - Procesador CSV
 * Lectura, parseo, generación (unparse) y obtención de filas CSV desde GitHub.
 */
(function (global) {
  const getMod = (nom) => global.VisibilidadModulos?.[nom] || {};

  const parseCsv = (texto) => {
    const Papa = global.Papa || (typeof require === "function" ? (() => { try { return require("papaparse"); } catch (_) { return null; } })() : null);
    if (!texto) return { data: [], fields: [] };
    if (Papa) {
      const r = Papa.parse(String(texto).replace(/^\uFEFF/, ""), {
        header: true, skipEmptyLines: true, delimiter: ",", quotes: true
      });
      return { data: Array.isArray(r.data) ? r.data : [], fields: r.meta?.fields || [] };
    }
    // Fallback nativo ligero sin dependencias externas
    const lineas = String(texto).replace(/^\uFEFF/, "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lineas.length) return { data: [], fields: [] };
    const limpiarCol = (c) => c.replace(/^["']|["']$/g, "").trim();
    const fields = lineas[0].split(",").map(limpiarCol);
    const data = [];
    for (let i = 1; i < lineas.length; i++) {
      const valores = lineas[i].split(",").map(limpiarCol);
      const row = {};
      fields.forEach((f, idx) => { row[f] = valores[idx] || ""; });
      data.push(row);
    }
    return { data, fields };
  };

  const unparseCsv = (rows, fields) => {
    const cleanFields = Array.isArray(fields) && fields.length ? fields : ["ASIGNATURA", "TRIMESTRE", "NOMBRE", "ARCHIVO"];
    const Papa = global.Papa || (typeof require === "function" ? (() => { try { return require("papaparse"); } catch (_) { return null; } })() : null);
    if (Papa && typeof Papa.unparse === "function") {
      return Papa.unparse(rows || [], { columns: cleanFields, quotes: true, newline: "\n" });
    }
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [cleanFields.map(esc).join(",")]
      .concat((rows || []).map(r => cleanFields.map(f => esc(r?.[f])).join(",")))
      .join("\n");
  };

  const obtenerFilasRepo = async (repo, csv, branch, token) => {
    const apiGithub = getMod("ApiGithub");
    const githubFile = apiGithub.githubFile || global.Visibilidad?.githubFile;
    if (!githubFile) throw new Error("Módulo ApiGithub no disponible");
    const file = await githubFile(repo, csv, branch, token);
    if (!file) return { file: null, rows: [], fields: [] };
    const parsed = parseCsv(file.content);
    return { file, rows: parsed.data, fields: parsed.fields };
  };

  const ProcesadorCsv = {
    parseCsv,
    unparseCsv,
    obtenerFilasRepo
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ProcesadorCsv;
  }
  global.VisibilidadModulos = global.VisibilidadModulos || {};
  global.VisibilidadModulos.ProcesadorCsv = ProcesadorCsv;
})(typeof window !== "undefined" ? window : globalThis);
