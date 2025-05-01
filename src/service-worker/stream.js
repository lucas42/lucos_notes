import { modifyState } from './modify-state.js';
let socket;

export function initStream(state) {
	const statusChannel = new BroadcastChannel("lucos_status");
	let latestSocketState = "unknown";

	// When a new client starts listening, resend the latest socket state.
	statusChannel.addEventListener("message", function statusMessageReceived(event) {
		if ("client-loaded" == event.data) {
			statusChannel.postMessage('streaming-'+latestSocketState);
		}
	});

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
		console.log('WebSocket Connected (SW)');
		latestSocketState = "opened";
		statusChannel.postMessage('streaming-opened');
	}

	function socketClosed(event) {
		console.warn('WebSocket Closed (SW)', event.code, event.reason);
		latestSocketState = "closed";
		statusChannel.postMessage('streaming-closed');
		if ("Forbidden" == event.reason) {
			latestSocketState = "unknown";
			statusChannel.postMessage('streaming-forbidden');
		}

		/*
		 * Wait a few seconds and then try to reconnect
		 */
		setTimeout(connect, 5000);
	}

	async function messageReceived(event) {
		try {
			const data = JSON.parse(event.data);
			console.log("stream event (SW)", data);
			modifyState(state, data.method, data.path, data.body, true);
		} catch (error) {
			console.warn("Error handling stream event (SW)", error);
		}
	}

	connect();
}