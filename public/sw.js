self.addEventListener("push", (e) => {
  const { title, body } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => c.url && "focus" in c);
      if (client) return client.focus();
      return clients.openWindow("/main/map");
    })
  );
});
