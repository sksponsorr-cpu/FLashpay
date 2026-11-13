// Service worker : reçoit les notifications push et ouvre la bonne page au clic.
self.addEventListener("push", (event) => {
  let data = { title: "FlashPay", body: "Nouvelle notification", url: "/dashboard" };
  try { data = { ...data, ...event.data.json() }; } catch { /* message texte simple */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
