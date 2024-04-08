function connect() {
	const streamStatus = new BroadcastChannel("stream_status");
	streamStatus.addEventListener("message", streamStatusMessage);
	const dataUpdates = new BroadcastChannel("data_updates");
	dataUpdates.addEventListener("message", messageReceived);
	streamStatus.postMessage("client-loaded"); // This tells the service worker a new client is listened, so to re-send the latest state
}

function streamStatusMessage(event) {
	switch (event.data) {
		case "opened":
			document.body.dataset['streaming'] = true;
			break;
		case "closed":
			document.body.dataset['streaming'] = false;
			break;
		case "forbidden":
			console.log("Access Forbidden, reauthenticating");
			const loginpage = "/login?redirect_path="+encodeURIComponent(window.location.pathname);
			window.location.assign(loginpage);
			break;
	}
}

async function messageReceived(event) {
	try {
		const data = event.data;

		// If the currently visible list has been deleted, return to the homepage
		if (data.method == "DELETE" && data.path == "/api/list/"+encodeURIComponent(document.body.dataset.slug)) {
			location.href = "/";

		// Otherwise, just refresh the current page to get the lastest from the service worker
		} else {
			location.reload();
		}
	} catch (error) {
		console.warn("Error handling stream event", error);
	}
}

connect();