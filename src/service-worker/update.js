self.addEventListener('message', event => {
	if (event.data === 'skip-waiting') self.skipWaiting();
});

// Claim already-open tabs immediately, so controllerchange fires and the
// reload-on-update flow in load-service-worker.js actually completes.
self.addEventListener('activate', event => {
	event.waitUntil(self.clients.claim());
});
