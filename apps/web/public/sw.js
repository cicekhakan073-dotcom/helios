/* Helios service worker — Web Push handler + minimal offline shell.
 *
 * Push payload sözleşmesi (server-side wrapper'dan):
 *   { title: string, body: string, url?: string, icon?: string, tag?: string }
 *
 * Click → SADECE aynı origin'de açar; harici URL'i göz ardı eder.
 */

const CACHE = "helios-shell-v1";
const SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (_e) {
    payload = { title: "Helios", body: event.data.text() };
  }
  const title = typeof payload.title === "string" ? payload.title : "Helios";
  const body = typeof payload.body === "string" ? payload.body : "";
  const url = typeof payload.url === "string" ? payload.url : "/dashboard";
  const tag = typeof payload.tag === "string" ? payload.tag : "helios";
  const icon = typeof payload.icon === "string" ? payload.icon : "/icons/icon-192.png";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icons/icon-192.png",
      tag,
      data: { url },
      vibrate: [80, 40, 80],
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = typeof data.url === "string" ? data.url : "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        const u = new URL(w.url);
        if (u.origin === self.location.origin) {
          w.focus();
          return w.navigate(target).catch(() => undefined);
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
