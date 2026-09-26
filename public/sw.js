// FocusFlow Web Push & Notification Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'FocusFlow Reminder',
    body: 'You have a scheduled reminder.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/?tab=alerts' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: (data.data && data.data.alertId) ? `alert-${data.data.alertId}` : `alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 400],
    data: data.data || { url: '/?tab=alerts' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const options = {
      body: event.data.body || 'You have an active scheduled reminder.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `inapp-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 400],
      data: { url: '/?tab=alerts' }
    };

    event.waitUntil(
      self.registration.showNotification(event.data.title || 'FocusFlow Reminder', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
