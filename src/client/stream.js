const statusChannel = new BroadcastChannel("lucos_status");

statusChannel.addEventListener("message", function statusMessage(event) {
	switch (event.data) {
		case "streaming-forbidden":
			console.log("Access Forbidden, reauthenticating");
			const loginpage = "/login?redirect_path="+encodeURIComponent(window.location.pathname);
			window.location.assign(loginpage);
			break;
	}
});

const dataUpdates = new BroadcastChannel("data_updates");
dataUpdates.addEventListener("message", async function messageReceived(event) {

	// If the currently visible list has been deleted, return to the homepage
	if (event.data.method == "DELETE" && event.data.path == "/api/list/"+encodeURIComponent(document.body.dataset.slug)) {
		location.href = "/";

	// Otherwise, refresh the main content in the page to get the latest from the service worker
	} else {
		const parser = new DOMParser();
		const latestResponse = await fetch(location.href);
		const latestPage = parser.parseFromString(await latestResponse.text(), latestResponse.headers.get("Content-Type").split(";")[0]);
		document.querySelector("main").replaceWith(latestPage.querySelector("main"));
	}
});

statusChannel.postMessage("client-loaded"); // This tells the service worker a new client is listened, so to re-send the latest state