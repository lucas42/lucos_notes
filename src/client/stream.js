let socket;

function connect() {
	// If there's already an active websocket, then no need to do more
	if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) return;

	const protocol = location.protocol === "https:" ? "wss" : "ws";
	socket = new WebSocket(`${protocol}://${location.host}/stream`);
	socket.addEventListener('open', socketOpened);
	socket.addEventListener('close', socketClosed);
	socket.addEventListener('error', socketClosed);
	socket.addEventListener('message', messageReceived);
}

function socketOpened(event) {
	document.body.dataset['streaming'] = true;
	console.log('WebSocket Connected');
}

function socketClosed(event) {
	document.body.dataset['streaming'] = false;

	// Handle "Forbidden" as a special case, and reauthenticate
	// (This requires an internet connection, but the fact the websocket has just returned a forbidden error suggests
	// there's been connectivity very recently)
	if ("Forbidden" == event.reason) {
		console.log("Websocket Forbidden, reauthenticating");
		const loginpage = "/login?redirect_path="+encodeURIComponent(window.location.pathname);
		window.location.assign(loginpage);
	} else {
		console.warn('WebSocket Closed', event.code, event.reason);

		/*
		 * Wait a few seconds and then try to reconnect
		 */
		window.setTimeout(connect, 5000);
	}
}

async function messageReceived(event) {
	try {
		const data = JSON.parse(event.data);
		console.log("stream event", data);
		if (data.method == "DELETE" && data.path.startsWith("/api/list/")) {
			location.href = "/";
		} else {
			location.reload();
		}
	} catch (error) {
		console.warn("Error handling stream event", error);
	}
}

connect();