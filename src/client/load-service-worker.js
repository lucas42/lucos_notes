const statusChannel = new BroadcastChannel("lucos_status");
try {
	if (!('serviceWorker' in navigator)) throw "no service worker support";
	const registration = await navigator.serviceWorker.register('/serviceworker.js');
	console.log('ServiceWorker registration successful with scope: ' + registration.scope);
	if (registration.waiting) {
		statusChannel.postMessage('service-worker-waiting');
	}
	registration.addEventListener("updatefound", () => {
		if (registration.installing) registration.installing.addEventListener("statechange", () => {
			// If there's no existing sw, then this is the first install, so nothing to do.
			if (!navigator.serviceWorker.controller) return;
			if (registration.waiting) {
				statusChannel.postMessage('service-worker-waiting');
			}
		});
	});
	registration.update();
	navigator.serviceWorker.addEventListener("controllerchange", () => {
		window.location.reload();
	});

	// The websocket opening _could_ be because the server has restarted,
	// so check whether a new service worker is available
	// (Mostly useful for dev environments)
	statusChannel.addEventListener("message", function statusMessage(event) {
		if (event.data == "streaming-opened") registration.update();
	});
} catch (error) {
	console.error('ServiceWorker registration failed: ' + error);
}