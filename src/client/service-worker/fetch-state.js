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
	}
	const networkResponse = await fetch(request);
	if (networkResponse.ok) {
		state.setRawData(await networkResponse.clone().json());
		cache.put(request, networkResponse);
	}
}