/* ====================================================================
   service-worker.js — Acontece Imobiliária (PWA)
   --------------------------------------------------------------------
   • Caminhos RELATIVOS  -> funciona no GitHub Pages em subpasta
                            (https://.../acontece-dashboard/)
   • Supabase (*.supabase.co) ... network-only (nunca cacheia dados/login)
   • HTML ....................... network-first  (sempre versão mais nova)
   • JS/CSS/imagens/ícones ...... cache-first    (rápido + offline)
   • CDNs ....................... cache-first
   • Precache RESILIENTE: cada arquivo é cacheado isolado; um 404 não
     derruba a instalação (era o bug da versão de caminhos absolutos).
   A cada deploy, suba o SW_VERSION para limpar o cache antigo nos celulares.
   ==================================================================== */
'use strict';

const SW_VERSION   = 'v2.0.0';
const CACHE_STATIC  = 'acontece-static-'  + SW_VERSION;
const CACHE_DYNAMIC = 'acontece-dynamic-' + SW_VERSION;
const DYNAMIC_LIMIT = 60;

// Relativos ao escopo do SW (./ = /acontece-dashboard/)
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './Dash5.html',
  './CadastroImovel.html',
  './RegistrarVenda.html',
  './RegistrarVisita.html',
  './Visitas.html',
  './Propostas.html',
  './Relatorios.html',
  './AnaliseVendas.html',
  './Configuracoes.html',
  './db-supabase.js',
  './controle-acesso.js',
  './config.js',
  './pwa-register.js',
  './manifest.json',
  './Logo01.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ===== INSTALL: precache resiliente (não falha por um 404) =====
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    await Promise.all(STATIC_ASSETS.map(async (url) => {
      try { await cache.add(url); }
      catch (e) { console.warn('[SW] pulou (não achou):', url); }
    }));
    await self.skipWaiting();
    console.log('[SW] instalado', SW_VERSION);
  })());
});

// ===== ACTIVATE: limpa caches de versões antigas =====
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_STATIC && k !== CACHE_DYNAMIC) return caches.delete(k);
    }));
    await self.clients.claim();
    console.log('[SW] ativado', SW_VERSION);
  })());
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Supabase: sempre rede (dados, auth, storage) — nunca cacheia
  if (url.hostname.includes('supabase')) {
    event.respondWith(fetch(request));
    return;
  }

  // Recursos de outra origem (CDNs): cache-first
  if (url.origin !== location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML (navegação): network-first, com fallback offline para o login
  const accept = request.headers.get('accept') || '';
  if (request.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estáticos locais: cache-first
  if (/\.(js|css|png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|json)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// ===== Estratégias =====
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const c = await caches.open(CACHE_DYNAMIC);
      c.put(request, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      return (await caches.match('./login.html')) || (await caches.match('./index.html'));
    }
    throw e;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.status === 200) {
    const c = await caches.open(CACHE_DYNAMIC);
    c.put(request, res.clone());
    limitCache(CACHE_DYNAMIC, DYNAMIC_LIMIT);
  }
  return res;
}

async function limitCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

// ===== Mensagens (atualização forçada / limpar cache) =====
self.addEventListener('message', (event) => {
  const action = event.data && event.data.action;
  if (action === 'skipWaiting') self.skipWaiting();
  if (action === 'clearCache') {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  }
});

console.log('[SW] carregado', SW_VERSION);
