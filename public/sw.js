const DEFAULT_URL = "/main/map";

// 새 서비스 워커가 바로 적용되고 열려 있는 탭도 제어하도록 함 (client.navigate 사용에 필요)
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("push", (e) => {
  const { title, body, url } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: url || DEFAULT_URL },
    })
  );
});

async function openTarget(url) {
  const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const client = list.find((c) => c.url && "focus" in c);

  if (client) {
    await client.focus();
    if (new URL(client.url).pathname === url) return;
    try {
      await client.navigate(url);
      return;
    } catch {
      // 제어되지 않는 창은 navigate 할 수 없음 — 새 창으로 연다
    }
  }
  await clients.openWindow(url);
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || DEFAULT_URL;
  e.waitUntil(openTarget(url));
});
