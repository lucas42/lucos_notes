try {
	if (!('serviceWorker' in navigator)) throw "no service worker support";
	const registration = await navigator.serviceWorker.register('/serviceworker.js');
	console.log('ServiceWorker registration successful with scope: ' + registration.scope);
	registration.update();
} catch (error) {
	console.error('ServiceWorker registration failed: ' + error);
}