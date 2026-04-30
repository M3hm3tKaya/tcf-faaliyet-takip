const CACHE_NAME = "tcf-takip-v1";
const ASSETS = ["/", "/style.css", "/app.js", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/api/")) return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return resp;
      });
      return cached || fetched;
    })
  );
});

self.addEventListener("push", (e) => {
  let data = { title: "TCF Bildirim", body: "Yeni faaliyet eklendi!" };
  try {
    data = e.data.json();
  } catch (_) {}

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "tcf-notification",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(clients.openWindow(url));
});
