/* NAVBAR TEMPLATE — solo montaje del template.
   Toda la lógica responsive y de colapso vive en CSS. */
(() => {
  const mount = document.getElementById('app-navbar-cargando');
  const template = document.getElementById('navbar-template');
  if (!mount || !template || mount.children.length) return;
  mount.appendChild(template.content.cloneNode(true));
})();
