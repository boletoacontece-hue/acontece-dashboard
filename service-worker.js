/* ====================================================================
   Service Worker — Acontece Imobiliária (PWA)
   Caminhos RELATIVOS (funciona no GitHub Pages em subpasta).
   • Supabase (*.supabase.co) ......... sempre rede (nunca cacheia dados/login)
   • Páginas/JS/ícones do site ........ stale-while-revalidate
   • Bibliotecas de CDN ............... cache-first
   A cada deploy, suba o CACHE_VERSION para limpar o cache antigo nos celulares.
   ==================================================================== */
const CACHE_VERSION = 'acontece-pwa-v2';

const APP_SHELL = [
  './', './index.html', './login.html', './Dash5.html', './Relatorios.html',
  './AnaliseVendas.html', './Propostas.html', './Configuracoes.html',
  './CadastroImovel.html', './RegistrarVenda.html', './Visitas.html',
  './RegistrarVisita.html', './db-supabase.js', './controle-acesso.js',
  './pwa-register.js', './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then((c) => c.addAll(APP_SHELL).catch(() => {/* ignora itens ausentes */}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;                       // logins/inserts: rede
  if (url.hostname.endsWith('.supabase.co')) return;      // dados/Auth: sempre rede

  if (url.origin === self.location.origin) {
    // App shell: stale-while-revalidate
    e.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // CDNs externas (supabase-js, chart.js): cache-first
  e.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (err) { return cached || Response.error(); }
    })
  );
});
