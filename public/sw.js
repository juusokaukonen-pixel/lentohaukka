// Lentohaukka: kevyt service worker. Sivu haetaan aina verkosta (uusin versio),
// ja viimeisin kopio näytetään vain jos verkkoa ei ole. Hintoja ei välimuistiteta.
const CACHE = "lentohaukka-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put("/", copy));
      return res;
    }).catch(() => caches.match("/"))
  );
});
