const statusChannel = new BroadcastChannel("lucos_status");
statusChannel.addEventListener("message", function statusMessage(event) {
	switch (event.data) {
		case "service-worker-skip-waiting":
			self.skipWaiting();
	}
});

// Claim already-open tabs immediately, so controllerchange fires and the
// reload-on-update flow in load-service-worker.js actually completes.
self.addEventListener('activate', event => {
	event.waitUntil(self.clients.claim());
});
