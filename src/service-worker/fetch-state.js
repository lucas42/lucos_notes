import { modifyStateWithOutstandingRequests } from './modify-state.js';

const DATA_CACHE = 'data-v1';

/**
 * Attempts to fetch data to populate the state object
 * First from the local cache, then from the network
 * Network responses are also stored in local cache for future use
 */
export default async function fetchData(state) {
	const cache = await caches.open(DATA_CACHE);
	const request = new Request('/todo.json');
	const cachedResponse = await cache.match(request);
	if (cachedResponse) {
		state.setRawData(await cachedResponse.json());
		await modifyStateWithOutstandingRequests(state);
	}
	const networkResponse = await fetch(request);
	if (networkResponse.ok) {
		cache.put(request, networkResponse.clone());
		state.setRawData(await networkResponse.json());
		await modifyStateWithOutstandingRequests(state);
	}
}