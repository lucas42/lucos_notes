import { modifyState } from './modify-state.js';
let socket;

export function initStream(state) {
	const streamStatus = new BroadcastChannel("stream_status");
	const dataUpdates = new BroadcastChannel("data_updates");
	streamStatus.addEventListener("message", streamStatusMessageReceived);
	let latestSocketState = "unknown";

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
		streamStatus.postMessage("opened");
	}

	function socketClosed(event) {
		console.warn('WebSocket Closed (SW)', event.code, event.reason);
		latestSocketState = "closed";
		streamStatus.postMessage("closed");
		if ("Forbidden" == event.reason) {
			latestSocketState = "forbidden";
			streamStatus.postMessage("forbidden");
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
			dataUpdates.postMessage(data);
		} catch (error) {
			console.warn("Error handling stream event (SW)", error);
		}
	}

	// When a new client starts listening, resend the latest socket state.
	function streamStatusMessageReceived(event) {
		if ("client-loaded" == event.data) {
			streamStatus.postMessage(latestSocketState);
		}
	}

	connect();
}