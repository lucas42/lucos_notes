const statusChannel = new BroadcastChannel("lucos_status");
statusChannel.addEventListener("message", function statusMessage(event) {
	switch (event.data) {
		case "service-worker-skip-waiting":
			self.skipWaiting();
	}
});

// Claim already-open tabs as soon as this worker activates.
//
// Without this, self.skipWaiting() (above) only makes the new worker the
// *active* one — it does NOT transfer control of tabs that were already open
// when the update landed. Per spec, an existing client keeps its old
// controller until it next navigates/reloads; only clients.claim() reassigns
// already-open tabs immediately. load-service-worker.js's reload-on-update
// relies entirely on the "controllerchange" event to know when it's safe to
// reload — without clients.claim(), that event never fires for the tab that
// clicked "update", so the lucos-status-indicator's spin animation (started
// on click, see lucos_navbar's status-indicator.js) never gets cleared and
// spins forever. Reported against lucos_notes#460 (the deploy that happened
// to retrigger the update banner via its package-lock.json hash change, per
// webpack.config.js's Dependency Hash banner) but this gap predates that PR —
// any prior update would have hit the same stall once clicked.
self.addEventListener('activate', event => {
	event.waitUntil(self.clients.claim());
});
