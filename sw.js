self.addEventListener('push', function(event) {
  let payload = {};
  try{ payload = event.data.json(); }catch(e){ payload = { title: 'Racha', body: 'Toca para mantener tu racha' }; }
  const title = payload.title || 'Racha';
  const options = { body: payload.body || '', icon: '/favicon.png', badge: '/favicon.png', data: payload.data || {} };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (var i = 0; i < windowClients.length; i++) {
      var client = windowClients[i];
      if (client.url === '/' && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});
