import State from '../classes/state.js';
import fetchData from './fetch-state.js';
import fetchResources from './static-resources.js';
import { fetchTemplates, populateTemplate } from './templates.js';
import { queueAndAttemptRequest, syncRequests } from 'restful-queue';
import { modifyStateWithRequest } from './modify-state.js';
import { initStream } from './stream.js';
import './update.js';

const state = new State();
const listTypeSlugs = state.getListTypes().map(listType => listType.slug);

// Call fetchData every time the service worker is started to populate the state object from cache
fetchData(state);

initStream(state);

self.addEventListener('install', event => {
	event.waitUntil(Promise.all([
		fetchResources(),
		fetchTemplates(),
	]));
});

async function handleRequest(request) {
	try {
		const url = new URL(request.url);

		if (url.hostname === "am.l42.eu") {
			return await fetch(request);
		}

		const urlparts = url.pathname.split('/');
		urlparts.shift(); //pathname always starts with a slash, so ignore first part.
		const component = urlparts.shift();
		if (!component) {
			return Response.redirect("/todo/");
		}
		if (component === 'sync' && request.method === 'POST') {
			try {
				await syncRequests();
				await fetchData(state);
				return new Response(null, {status: 204, statusText: "Successful Sync"});
			} catch (error) {
				return new Response(null, {status: 500, statusText: error.message});
			}
		}

		// Any non-GET api calls, we should queue up and send when there's network
		if (component === 'api' && request.method !== 'GET') {
			await modifyStateWithRequest(state, request.clone());
			return queueAndAttemptRequest(request);
		}
		if (listTypeSlugs.includes(component)) {
			const slug = urlparts.shift();
			if (request.method === "GET") {
				if (!slug) {
					return populateTemplate(await state.getListsByType(component));
				} else {
					return Response.redirect("/list/"+slug);
				}
			}
		}
		if (component === "list") {
			const slug = decodeURI(urlparts.shift());
			if (request.method === "GET") {
				if (!slug) {
					return Response.redirect("/todo/");
				} else {
					return populateTemplate(await state.getList(slug));
				}
			}
		}

		// All login logic happens server side
		if (component === "login") {
			return await fetch(request);
		}

		const cachedResponse = await caches.match(request);
		if (cachedResponse) return cachedResponse;
		console.error("Request not in cache", url.pathname, request.method, url.origin, url.search);
		return await fetch(request);
	} catch(error) {
		console.error("Error handling request", error, request);
		error.pagetype = "error";
		return populateTemplate(error);
	}
}

self.addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request));
});
