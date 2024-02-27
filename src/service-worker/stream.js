import { modifyState } from './modify-state.js';
let socket;

export function initStream(state) {
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

	function socketOpened(domEvent) {
		console.log('WebSocket Connected (SW)');
	}

	function socketClosed(domEvent) {
		console.warn('WebSocket Closed (SW)', event.code, event.reason);

		/*
		 * Wait a few seconds and then try to reconnect
		 */
		window.setTimeout(connect, 5000);
	}

	async function messageReceived(domEvent) {
		try {
			const data = JSON.parse(domEvent.data);
			console.log("stream event (SW)", data);
			modifyState(state, data.method, data.path, data.body, true);
		} catch (error) {
			console.warn("Error handling stream event (SW)", error);
		}
	}

	connect();
}