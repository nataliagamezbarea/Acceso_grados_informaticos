function toggleVisorMobileTools(force) {
    const check = document.getElementById('visorMobileToolsCheck');
    if (!check) return;
    if (typeof force === 'boolean') check.checked = force;
    const panel = document.getElementById('visorMobileTools');
    const btn = document.getElementById('visorMobileToolsToggle');
    if (panel) panel.classList.toggle('is-open', check.checked);
    if (btn) btn.setAttribute('aria-expanded', String(check.checked));
    try { localStorage.setItem('visor_mobile_tools_open', check.checked ? '1' : '0'); } catch (_) {}
   }
   window.toggleVisorMobileTools = toggleVisorMobileTools;
   document.addEventListener('DOMContentLoaded', function () {
    const check = document.getElementById('visorMobileToolsCheck');
    if (!check || check.dataset.persistenceReady === '1') return;
    check.dataset.persistenceReady = '1';
    try { check.checked = localStorage.getItem('visor_mobile_tools_open') === '1'; } catch (_) {}
    check.addEventListener('change', function () { toggleVisorMobileTools(); });
    toggleVisorMobileTools(check.checked);
   });
