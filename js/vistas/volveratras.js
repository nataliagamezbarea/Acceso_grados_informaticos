document.addEventListener("click", (event) =>  {
  const enlace = event.target.closest?.("#volver-atras");
  if (!enlace) return;
  event.preventDefault();
  if (window.AppViews?.atras) window.AppViews.atras();
}
  );
