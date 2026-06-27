/* pwa-register.js — registra o Service Worker e mostra o botão "Instalar app" */
(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js')
        .then(function (reg) { console.log('✅ PWA ativo (scope:', reg.scope + ')'); })
        .catch(function (err) { console.warn('⚠️ Falha no Service Worker:', err); });
    });
  }
  var deferred = null;
  function botao() {
    if (document.getElementById('pwa-install-btn')) return;
    var b = document.createElement('button');
    b.id = 'pwa-install-btn'; b.type = 'button'; b.textContent = '⬇️ Instalar app';
    b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#2B5C2B;color:#fff;border:none;border-radius:24px;padding:12px 18px;font:600 14px Trebuchet MS,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer';
    b.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; b.remove(); });
    });
    document.body.appendChild(b);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; botao(); });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('pwa-install-btn'); if (b) b.remove();
  });
})();
