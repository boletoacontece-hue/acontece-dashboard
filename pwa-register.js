/* pwa-register.js — registra o Service Worker (escopo relativo, GitHub Pages subpasta) */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker não suportado neste navegador.');
    return;
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('service-worker.js', { scope: './' })
      .then(function (reg) {
        console.log('✅ PWA ativo (scope: ' + reg.scope + ')');
      })
      .catch(function (err) {
        console.error('[PWA] Falha ao registrar o Service Worker:', err);
      });
  });

  // Log opcional do evento de instalação disponível (ajuda no diagnóstico)
  window.addEventListener('beforeinstallprompt', function () {
    console.log('[PWA] App instalável: prompt de instalação disponível.');
  });
})();
