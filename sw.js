// Guarda o app no aparelho para abrir sem internet. Mude a versão a cada publicação.
const VERSAO = 'dieta-v2';
const ARQUIVOS = ['./', 'index.html', 'css/app.css', 'js/data.js', 'js/app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'img/alimentos/anatomical_heart.webp', 'img/alimentos/avocado.webp', 'img/alimentos/banana.webp', 'img/alimentos/beans.webp', 'img/alimentos/bell_pepper.webp', 'img/alimentos/blueberries.webp', 'img/alimentos/bone.webp', 'img/alimentos/bowl_with_spoon.webp', 'img/alimentos/broccoli.webp', 'img/alimentos/butter.webp', 'img/alimentos/carrot.webp', 'img/alimentos/cheese_wedge.webp', 'img/alimentos/chestnut.webp', 'img/alimentos/coconut.webp', 'img/alimentos/cooking.webp', 'img/alimentos/cow_face.webp', 'img/alimentos/cucumber.webp', 'img/alimentos/cut_of_meat.webp', 'img/alimentos/egg.webp', 'img/alimentos/eggplant.webp', 'img/alimentos/ewe.webp', 'img/alimentos/garlic.webp', 'img/alimentos/ginger_root.webp', 'img/alimentos/glass_of_milk.webp', 'img/alimentos/grapes.webp', 'img/alimentos/green_apple.webp', 'img/alimentos/herb.webp', 'img/alimentos/jar.webp', 'img/alimentos/kiwi_fruit.webp', 'img/alimentos/leafy_green.webp', 'img/alimentos/lemon.webp', 'img/alimentos/mango.webp', 'img/alimentos/meat_on_bone.webp', 'img/alimentos/melon.webp', 'img/alimentos/olive.webp', 'img/alimentos/onion.webp', 'img/alimentos/pea_pod.webp', 'img/alimentos/peanuts.webp', 'img/alimentos/pear.webp', 'img/alimentos/pineapple.webp', 'img/alimentos/potato.webp', 'img/alimentos/red_apple.webp', 'img/alimentos/roasted_sweet_potato.webp', 'img/alimentos/seedling.webp', 'img/alimentos/strawberry.webp', 'img/alimentos/tangerine.webp', 'img/alimentos/tomato.webp', 'img/alimentos/tongue.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rede primeiro (para pegar atualizações), cache se estiver offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
