/* ====================================================== Motor de Anonimización Difusa para Modo Invitado
====================================================== */ (function () {
  const BASE_TARGET_TOKENS = [ "NICOLAU", "NICOLS", "NICOL", "NICOLA", "MIRO", "MIROS", "NATALIA", "GAMEZ", "GAMES", "BAREA", "BARE" ];
  function distanciaLevenshtein(str1, str2) {
    const s1 = String(str1 || "").toUpperCase();
    const s2 = String(str2 || "").toUpperCase();
    const m = s1.length;
    const n = s2.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from( { length: m + 1 }
    , () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min( dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost );
      }
    }
    return dp[m][n];
  }
  function esInvitadoEfectivo() {
    const esAdmin = Boolean(window.Permisos && window.Permisos.esAdmin);
    const vistaInvitado = Boolean(window.Permisos && window.Permisos.vistaInvitado);
    const modoLiveEdicion = localStorage.getItem("modo_edicion_live") === "true";
    if (!esAdmin) return true;
    if (vistaInvitado || modoLiveEdicion) return true;
    return false;
  }
  function normalizarToken(str) {
    return String(str || "") .toUpperCase() .normalize("NFD") .replace(/[\u0300-\u036f]/g, "") .trim();
  }
  function obtenerTokensProtegidos(ctx) {
    const tokens = new Set(BASE_TARGET_TOKENS);
    const profesor = ctx?.profesor || "";
    if (profesor && profesor !== "Sin profesor") {
      normalizarToken(profesor) .split(/[^A-Z0-9]+/) .filter((t) => t.length >= 3) .forEach((t) => tokens.add(t));
    }
    if (window.__profesoresConocidos && Array.isArray(window.__profesoresConocidos)) {
      window.__profesoresConocidos.forEach((p) =>  {
        if (p && p !== "Sin profesor") {
          normalizarToken(p) .split(/[^A-Z0-9]+/) .filter((t) => t.length >= 3) .forEach((t) => tokens.add(t));
        }
      }
  );
    }
    return Array.from(tokens);
  }
  function esTokenSensible(token, protectedTokens) {
    const norm = normalizarToken(token);
    if (!norm || norm.length < 3) return false;
    for (const prot of protectedTokens) {
      if (!prot || prot.length < 3) continue;
      if (norm === prot) return true;
      if (norm.length >= 4 && prot.length >= 4) {
        if (norm.includes(prot) || prot.includes(norm)) return true;
      }
      const minLen = Math.min(norm.length, prot.length);
      if (minLen >= 4 && Math.abs(norm.length - prot.length) <= 2) {
        const dist = distanciaLevenshtein(norm, prot);
        if (dist <= 2) return true;
      }
    }
    return false;
  }
  function sanearNombreInvitado(cadena, ctx) {
    if (!cadena) return "";
    if (!esInvitadoEfectivo()) return String(cadena);
    const protectedTokens = obtenerTokensProtegidos(ctx);
    let baseName = String(cadena).trim();
    let ext = "";
    const lastDot = baseName.lastIndexOf(".");
    if (lastDot > 0 && lastDot > baseName.length - 8) {
      ext = baseName.substring(lastDot);
      baseName = baseName.substring(0, lastDot);
    }
    const partes = baseName.split(/([_\-\s.]+)/);
    const partesLimpias = [];
    for (let i = 0; i < partes.length; i++) {
      const p = partes[i];
      if (/^[_\-\s.]+$/.test(p)) {
        partesLimpias.push(p);
        continue;
      }
      if (esTokenSensible(p, protectedTokens)) { continue; }
      else { partesLimpias.push(p); }
    }
    let resultado = partesLimpias.join("");
    resultado = resultado .replace(/[_\-\s.]+/g, "_") .replace(/^_+|_+$/g, "") .trim();
    if (!resultado) { resultado = "MATERIAL_DOCENTE"; }
    return resultado + ext;
  }
  function sanearTextoGenerico(texto, ctx) {
    if (!texto) return "";
    if (!esInvitadoEfectivo()) return String(texto);
    const protectedTokens = obtenerTokensProtegidos(ctx);
    const palabras = String(texto).split(/(\s+)/);
    const palabrasLimpias = palabras.map((p) =>  {
      if (/^\s+$/.test(p)) return p;
      if (esTokenSensible(p, protectedTokens)) return "";
      return p;
    }
  );
    let res = palabrasLimpias.join("").replace(/\s+/g, " ").trim();
    return res || "Material Protegido";
  }
  window.Anonymizer =  { esInvitadoEfectivo, sanearNombreInvitado, sanearTextoGenerico, distanciaLevenshtein }
  ;
  window.sanearNombreInvitado = sanearNombreInvitado;
  window.sanearTextoGenerico = sanearTextoGenerico;
}
)();
