try {
	if (!('serviceWorker' in navigator)) throw "no service worker support";
	const registration = await navigator.serviceWorker.register('/serviceworker.js');
	console.log('ServiceWorker registration successful with scope: ' + registration.scope);
	if (registration.waiting) {
		document.getElementsByTagName('lucos-navbar')[0].setAttribute('service-worker', 'waiting');
	}
	registration.addEventListener("updatefound", () => {
		if (registration.installing) registration.installing.addEventListener("statechange", () => {
			// If there's no existing sw, then this is the first install, so nothing to do.
			if (!navigator.serviceWorker.controller) return;
			if (registration.waiting) {
				document.getElementsByTagName('lucos-navbar')[0].setAttribute('service-worker', 'waiting');
			}
		});
	});
	registration.update();
	navigator.serviceWorker.addEventListener("controllerchange", () => {
		window.location.reload();
	});
} catch (error) {
	console.error('ServiceWorker registration failed: ' + error);
}