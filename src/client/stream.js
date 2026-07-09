// Backstop only: if this many WebSocket "Forbidden" closes happen within
// the window below with no intervening session-active/session-expired
// signal from the lucos_navbar keepalive, treat the session as dead anyway.
// Guards the case where the keepalive signal never arrives for some reason
// (e.g. the navbar custom element isn't present on a given page) — the
// authoritative signal is session-expired (see createStatusMessageHandler).
export const FORBIDDEN_BACKSTOP_COUNT = 3;
export const FORBIDDEN_BACKSTOP_WINDOW_MS = 60000;

/**
 * Builds a handler for messages on the lucos_status BroadcastChannel.
 *
 * A WebSocket "Forbidden" close (streaming-forbidden) is a point-in-time
 * verification failure, not an authoritative "your session is gone" signal
 * — it's frequently transient (e.g. wake-from-sleep) and recoverable once
 * the lucos_navbar keepalive remints the token. Forcing an immediate
 * `/login` redirect on every occurrence pre-empts that recovery and, for a
 * genuinely-dead session, produces a hot redirect spin (the service worker
 * retries the WebSocket every 5s).
 *
 * Instead:
 *   - streaming-forbidden: recorded but does not redirect by itself. Lets
 *     the keepalive remint and the WebSocket retry recover silently.
 *   - session-active: a keepalive remint succeeded — clears any recorded
 *     Forbidden history, since it was transient.
 *   - session-expired: the keepalive could not remint. Authoritative —
 *     redirect immediately (no fail-open).
 *   - Backstop: FORBIDDEN_BACKSTOP_COUNT streaming-forbidden events within
 *     FORBIDDEN_BACKSTOP_WINDOW_MS with no intervening session-active also
 *     redirects, in case the keepalive signal never arrives at all.
 *
 * Exported as a factory (rather than wiring the BroadcastChannel directly)
 * so tests can exercise the state machine without a real navigation, and so
 * each caller gets its own independent Forbidden-tracking state.
 */
export function createStatusMessageHandler({ redirectToLogin, now = () => Date.now() } = {}) {
	let forbiddenTimestamps = [];
	let hasRedirected = false;

	const doRedirect = redirectToLogin ?? function defaultRedirectToLogin() {
		const loginpage = "/login?redirect_path=" + encodeURIComponent(window.location.pathname);
		window.location.assign(loginpage);
	};

	return function handleStatusMessage(event) {
		if (hasRedirected) return;

		switch (event.data) {
			case "streaming-forbidden": {
				console.log("Stream Forbidden — awaiting keepalive/retry before reauthenticating");
				const timestamp = now();
				forbiddenTimestamps.push(timestamp);
				forbiddenTimestamps = forbiddenTimestamps.filter(t => timestamp - t < FORBIDDEN_BACKSTOP_WINDOW_MS);
				if (forbiddenTimestamps.length >= FORBIDDEN_BACKSTOP_COUNT) {
					console.warn(`Stream Forbidden ${forbiddenTimestamps.length} times in the last ${FORBIDDEN_BACKSTOP_WINDOW_MS / 1000}s with no session-active/session-expired signal — treating session as dead`);
					hasRedirected = true;
					doRedirect();
				}
				break;
			}
			case "session-active":
				forbiddenTimestamps = [];
				break;
			case "session-expired":
				console.log("Session expired, reauthenticating");
				hasRedirected = true;
				doRedirect();
				break;
		}
	};
}

export function initStreamClient() {
	const statusChannel = new BroadcastChannel("lucos_status");
	statusChannel.addEventListener("message", createStatusMessageHandler());

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
}
