import { WebSocketServer } from 'ws';
const DEBUG = false;

export function sendToAllClients(server, event) {
	const authenticatedClients = Array.from(server.clients).filter(client => client.authenticated);
	if (DEBUG) console.log(`Sending event to ${authenticatedClients.length} clients`);
	authenticatedClients.forEach(client => {
		sendEvent(client, event);
	});
}

function sendEvent(client, event) {
	try {
		client.send(JSON.stringify(event), {}, error => {
			if (error) console.error("Failed to Send", error);
		});
	} catch (error) {
		console.error("Didn't Send", error);
	}

}

// verifySessionToken is injected (rather than imported directly from
// auth.js) since it now closes over a per-process aithne client constructed
// once by index.js's composition root, not a module-level singleton
// (lucas42/lucos#268).
export function startup(httpServer, app, verifySessionToken) {
	const server = new WebSocketServer({
		clientTracking: true,
		server: httpServer,
		path: '/stream',
	});
	server.on('listening', () => {
		console.log(`WebSocketServer listening`);
	});
	server.on('connection', async (client, request) => {
		// Verify the aithne_session cookie using the same shared logic as the HTTP middleware.
		// WS handshakes cannot issue HTTP redirects or render 403 pages, so both the
		// no-token and missing-scope cases resolve to close(1008, "Forbidden").
		const { authenticated, authorized } = await verifySessionToken(request.headers.cookie);
		client.authenticated = authenticated && authorized;
		if (DEBUG) {
			console.log(`New Web Socket Connected, authenticated=${client.authenticated}`);
		}
		if (!client.authenticated) return client.close(1008, 'Forbidden');

		// TODO: send data on startup?
	});
	app.websocket = {
		send: event => {
			sendToAllClients(server, event);
		},
	};
}
