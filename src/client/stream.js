const streamStatus = new BroadcastChannel("stream_status");
streamStatus.addEventListener("message", function streamStatusMessage(event) {
	switch (event.data) {
		case "opened":
			document.getElementsByTagName('lucos-navbar')[0].setAttribute('streaming', 'active');
			break;
		case "closed":
			document.getElementsByTagName('lucos-navbar')[0].setAttribute('streaming', 'stopped');
			break;
		case "forbidden":
			console.log("Access Forbidden, reauthenticating");
			const loginpage = "/login?redirect_path="+encodeURIComponent(window.location.pathname);
			window.location.assign(loginpage);
			break;
	}
});

const dataUpdates = new BroadcastChannel("data_updates");
dataUpdates.addEventListener("message", function messageReceived(event) {

	// If the currently visible list has been deleted, return to the homepage
	if (event.data.method == "DELETE" && event.data.path == "/api/list/"+encodeURIComponent(document.body.dataset.slug)) {
		location.href = "/";

	// Otherwise, just refresh the current page to get the lastest from the service worker
	} else {
		location.reload();
	}
});

streamStatus.postMessage("client-loaded"); // This tells the service worker a new client is listened, so to re-send the latest state