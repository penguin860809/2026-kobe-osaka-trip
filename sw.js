const CACHE='kobe-osaka-onepage-v2';
const ASSETS=['./','index.html','styles.css','app.js','trip-data.json','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.url.includes('api.open-meteo.com'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
