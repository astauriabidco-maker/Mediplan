self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png', // Icône par défaut de la PWA
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/marketplace'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Mediplan', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
