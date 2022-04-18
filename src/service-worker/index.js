import State from '../classes/state.js';
import fetchData from './fetch-state.js';
import fetchResources from './static-resources.js';
import { fetchTemplates, populateTemplate } from './templates.js';
import { queueAndAttemptRequest } from './restful-queue.js';
import { modifyStateWithRequest } from './modify-state.js';

const state = new State();

// Call fetchData every time the service worker is started to populate the state object from cache
fetchData(state);

self.addEventListener('install', event => {
	event.waitUntil(Promise.all([
		fetchResources(),
		fetchTemplates(),
	]));
});


async function handleRequest(request) {
	try {
		const url = new URL(request.url);
		const urlparts = url.pathname.split('/');
		urlparts.shift(); //pathname always starts with a slash, so ignore first part.
		const component = urlparts.shift();
		if (!component) {
			return Response.redirect("/todo/");
		}

		// Any non-GET api calls, we should queue up and send when there's network
		if (component === 'api' && request.method !== 'GET') {
			await modifyStateWithRequest(state, request.clone());
			return queueAndAttemptRequest(request);
		}
		if (component === "todo") {
			const slug = decodeURI(urlparts.shift());
			if (request.method === "GET") {
				if (!slug) {
					return populateTemplate('index', await state.getLists());
				} else {
					return populateTemplate('list', await state.getList(slug));
				}
			}
		}
		const cachedResponse = await caches.match(request);
		if (cachedResponse) return cachedResponse;
		console.error("Request not in cache", url.pathname, url.method, url.origin, url.search);
		return await fetch(request);
	} catch(error) {
		console.error("Error handling request", error, request);
		return populateTemplate('error', error);
	}
}

self.addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request));
});
