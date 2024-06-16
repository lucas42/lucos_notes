const statusChannel = new BroadcastChannel("lucos_status");
statusChannel.addEventListener("message", function statusMessage(event) {
	switch (event.data) {
		case "service-worker-skip-waiting":
			self.skipWaiting();
	}
});
