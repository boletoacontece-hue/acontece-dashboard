// ===================================================================
// SERVICE WORKER - ACONTECE VISITAS
// ===================================================================
// Versão: 1.0.0
// Descrição: Service Worker para funcionalidade offline do sistema de visitas
// ===================================================================

const CACHE_NAME = 'acontece-visitas-v1.0.0';
const CACHE_STATIC = 'acontece-static-v1.0.0';
const CACHE_DYNAMIC = 'acontece-dynamic-v1.0.0';

// Arquivos essenciais para funcionamento offline
const STATIC_ASSETS = [
    '/',
    '/RegistrarVisita.html',
    '/Visitas.html',
    '/db-supabase.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Arquivos que podem ser cached dinamicamente
const DYNAMIC_CACHE_LIMIT = 50;

// ===== INSTALAÇÃO =====
self.addEventListener('install', event => {
    console.log('[Service Worker] Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                console.log('[Service Worker] Pré-cacheando arquivos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Instalado com sucesso!');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[Service Worker] Erro na instalação:', err);
            })
    );
});

// ===== ATIVAÇÃO =====
self.addEventListener('activate', event => {
    console.log('[Service Worker] Ativando...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Remover caches antigas
                        if (cacheName !== CACHE_STATIC && 
                            cacheName !== CACHE_DYNAMIC && 
                            cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Removendo cache antiga:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Ativado com sucesso!');
                return self.clients.claim();
            })
    );
});

// ===== FETCH (Estratégia de Cache) =====
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requests externos (Supabase, CDN, etc.)
    if (url.origin !== location.origin) {
        // Para APIs externas, sempre tentar rede primeiro
        if (url.hostname.includes('supabase')) {
            event.respondWith(networkOnly(request));
            return;
        }
        
        // Para CDNs (Font Awesome, etc.), cache-first
        event.respondWith(cacheFirst(request));
        return;
    }

    // Para assets locais, cache-first com fallback para rede
    if (request.method === 'GET') {
        // HTML: Network-first (sempre buscar versão mais recente)
        if (request.headers.get('accept').includes('text/html')) {
            event.respondWith(networkFirst(request));
            return;
        }

        // JS, CSS, Images: Cache-first
        if (request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf)$/)) {
            event.respondWith(cacheFirst(request));
            return;
        }

        // Outros: Network-first
        event.respondWith(networkFirst(request));
    }
});

// ===== ESTRATÉGIAS DE CACHE =====

// Network-First: Tenta rede primeiro, fallback para cache
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[Service Worker] Rede falhou, buscando no cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback para página offline
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/RegistrarVisita.html');
        }
        
        throw error;
    }
}

// Cache-First: Tenta cache primeiro, fallback para rede
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_DYNAMIC);
            
            // Limitar tamanho do cache dinâmico
            limitCacheSize(CACHE_DYNAMIC, DYNAMIC_CACHE_LIMIT);
            
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[Service Worker] Erro ao buscar:', request.url, error);
        throw error;
    }
}

// Network-Only: Sempre busca da rede (para APIs)
async function networkOnly(request) {
    try {
        return await fetch(request);
    } catch (error) {
        console.error('[Service Worker] Rede indisponível:', request.url);
        throw error;
    }
}

// ===== UTILITÁRIOS =====

// Limitar tamanho do cache dinâmico
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxItems) {
        const itemsToDelete = keys.length - maxItems;
        for (let i = 0; i < itemsToDelete; i++) {
            await cache.delete(keys[i]);
        }
        console.log(`[Service Worker] Cache ${cacheName} limitado a ${maxItems} itens`);
    }
}

// ===== MENSAGENS =====
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('[Service Worker] Todos os caches foram limpos');
                event.ports[0].postMessage({ success: true });
            })
        );
    }
    
    if (event.data.action === 'getCacheSize') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(async cacheName => {
                        const cache = await caches.open(cacheName);
                        const keys = await cache.keys();
                        return { name: cacheName, size: keys.length };
                    })
                );
            }).then(cacheInfo => {
                event.ports[0].postMessage({ cacheInfo });
            })
        );
    }
});

// ===== SYNC (Background Sync) =====
// Registrar sync para enviar dados pendentes quando voltar online
self.addEventListener('sync', event => {
    console.log('[Service Worker] Sync event:', event.tag);
    
    if (event.tag === 'sync-visitas') {
        event.waitUntil(syncVisitas());
    }
});

async function syncVisitas() {
    // Implementar lógica de sincronização de visitas pendentes
    console.log('[Service Worker] Sincronizando visitas...');
    // TODO: Implementar quando necessário
}

// ===== PUSH NOTIFICATIONS (Futuro) =====
self.addEventListener('push', event => {
    console.log('[Service Worker] Push recebido:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nova notificação',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir',
                icon: '/icons/icon-72.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/icons/icon-72.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Acontece Visitas', options)
    );
});

self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notificação clicada:', event.action);
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/RegistrarVisita.html')
        );
    }
});

// ===== LOG =====
console.log('[Service Worker] Carregado');
