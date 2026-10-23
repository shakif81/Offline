const VERSION = 'traxx-v1';
const CACHE_APP = VERSION + '-app';
const CACHE_CDN = VERSION + '-cdn';
const ESPERA_RED_MS = 4000;

function esCdn(url) {
    return url.hostname === 'cdnjs.cloudflare.com'
        || url.hostname === 'unpkg.com'
        || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));
}

async function precachearLocales(base) {
    const cache = await caches.open(CACHE_APP);
    const resp = await fetch(new Request(base + 'index.html', { cache: 'reload' }));
    if (!resp.ok) throw new Error('index.html no disponible');
    const html = await resp.clone().text();
    await cache.put(new Request(base + 'index.html'), resp.clone());
    await cache.put(new Request(base), resp.clone());

    const externos = [];
    const locales = new Set([base + 'manifest.json']);
    for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const ref = m[1].trim();
        if (!ref || ref.startsWith('#') || /^(data|mailto|javascript):/i.test(ref)) continue;
        const abs = new URL(ref, base);
        if (abs.origin === self.location.origin) locales.add(abs.href);
        else externos.push(abs.href);
    }
    await Promise.all([...locales].map(async url => {
        try {
            const r = await fetch(new Request(url, { cache: 'reload' }));
            if (r.ok) await cache.put(new Request(url), r);
        } catch (e) {}
    }));
    return externos;
}

async function precachearExternos(urls) {
    const cache = await caches.open(CACHE_CDN);
    for (const href of urls) {
        const url = new URL(href);
        if (!esCdn(url)) continue;
        try {
            if (url.pathname.endsWith('.css')) {
                const r = await fetch(href, { mode: 'cors' });
                if (!r.ok) continue;
                const css = await r.clone().text();
                await cache.put(href, r);
                for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
                    const ref = m[1].replace(/["']/g, '').trim();
                    if (!/\.woff2?(\?|#|$)/.test(ref)) continue;
                    const fuente = new URL(ref, href).href.split('#')[0];
                    try {
                        const fr = await fetch(fuente, { mode: 'cors' });
                        if (fr.ok) await cache.put(fuente, fr);
                    } catch (e) {}
                }
            } else {
                const r = await fetch(href, { mode: 'no-cors' });
                await cache.put(href, r);
            }
        } catch (e) {}
    }
}

self.addEventListener('install', event => {
    const base = self.registration.scope;
    event.waitUntil((async () => {
        const externos = await precachearLocales(base);
        precachearExternos(externos);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const nombres = await caches.keys();
        await Promise.all(nombres
            .filter(n => n.startsWith('traxx-') && n !== CACHE_APP && n !== CACHE_CDN)
            .map(n => caches.delete(n)));
        await self.clients.claim();
    })());
});

async function redPrimero(req) {
    const cache = await caches.open(CACHE_APP);
    try {
        const resp = await Promise.race([
            fetch(req),
            new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), ESPERA_RED_MS))
        ]);
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
    } catch (e) {
        const guardado = await cache.match(req) || await cache.match(req, { ignoreSearch: true });
        if (guardado) return guardado;
        if (req.mode === 'navigate') {
            const base = self.registration.scope;
            const inicio = await cache.match(base + 'index.html') || await cache.match(base);
            if (inicio) return inicio;
        }
        return Response.error();
    }
}

async function cachePrimero(req) {
    const cache = await caches.open(CACHE_CDN);
    const guardado = await cache.match(req);
    if (guardado) return guardado;
    try {
        const resp = await fetch(req);
        if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
        return resp;
    } catch (e) {
        return Response.error();
    }
}

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
        event.respondWith(redPrimero(req));
    } else if (esCdn(url)) {
        event.respondWith(cachePrimero(req));
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
        for (const cliente of lista) {
            if ('focus' in cliente) return cliente.focus();
        }
        return self.clients.openWindow(self.registration.scope);
    }));
});
