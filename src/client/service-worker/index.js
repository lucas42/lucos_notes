import State from '../../state.js';
import fetchData from './fetch-state.js';
import fetchResources from './static-resources.js';

const state = new State();

self.addEventListener('install', event => {
	event.waitUntil(Promise.all([
		fetchData(state),
		fetchResources(),
	]));
});

async function handleRequest(request) {
	const url = new URL(request.url);
	const urlparts = url.pathname.split('/');
	urlparts.shift(); //pathname always starts with a slash, so ignore first part.
	const component = urlparts.shift();
	if (component === "todo") {
		const slug = urlparts.shift();
		if (request.method === "GET") {
			if (!slug) {
				console.log("//TODO: Render list of lists");
			} else {
				console.log(`//TODO: Render list ${slug}`);
			}
		}
	}
	const cachedResponse = await caches.match(request);
	if (cachedResponse) return cachedResponse;
	console.error("Request not in cache", url.pathname, url.method, url.origin, url.search);
	return await fetch(request);
}

self.addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request));
});
